"""Run contract-aware visual smoke/eval cases against the perception endpoint."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
from collections.abc import Iterator, Mapping
from contextlib import AbstractContextManager
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from typing import Any, Protocol

import httpx
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.schemas.errors import AiErrorResponse
from app.schemas.perception import PerceptionResponse

REPO_ROOT = Path(__file__).resolve().parents[3]
LOCAL_TOKEN = "visual-eval-local-token"
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


class HttpClient(Protocol):
    def post(self, url: str, **kwargs: Any) -> Any: ...


def load_manifest(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != "1.0":
        raise ValueError("Visual eval manifest schemaVersion must be 1.0")
    cases = payload.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("Visual eval manifest requires at least one case")
    return payload


def _extract_video_frames(
    source: Path,
    *,
    sample_every_seconds: float,
    max_frames: int,
    output_dir: Path,
) -> list[Path]:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required for video visual-eval cases")
    pattern = output_dir / "frame-%04d.jpg"
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source),
        "-vf",
        f"fps=1/{sample_every_seconds}",
        "-frames:v",
        str(max_frames),
        str(pattern),
    ]
    subprocess.run(command, check=True)
    frames = sorted(output_dir.glob("frame-*.jpg"))
    if not frames:
        raise RuntimeError(f"No frames were extracted from {source.name}")
    return frames


def iter_observations(case: Mapping[str, Any]) -> Iterator[list[Path]]:
    source = case["source"]
    source_path = (REPO_ROOT / source["path"]).resolve()
    if not source_path.is_file():
        raise FileNotFoundError(f"Visual eval asset is missing: {source['path']}")

    source_type = source["type"]
    if source_type == "image":
        if source_path.suffix.lower() not in ALLOWED_IMAGE_SUFFIXES:
            raise ValueError(f"Unsupported image extension: {source_path.suffix}")
        yield [source_path]
        return

    if source_type != "video":
        raise ValueError(f"Unsupported visual source type: {source_type}")

    sample_every_seconds = float(source.get("sampleEverySeconds", 5))
    max_frames = int(source.get("maxFrames", 5))
    frames_per_observation = int(source.get("framesPerObservation", 1))
    if sample_every_seconds <= 0 or max_frames <= 0:
        raise ValueError("Video sampling values must be positive")
    if not 1 <= frames_per_observation <= 3:
        raise ValueError("framesPerObservation must be between one and three")

    with tempfile.TemporaryDirectory(prefix="pathmemory-visual-eval-") as temp_dir:
        frames = _extract_video_frames(
            source_path,
            sample_every_seconds=sample_every_seconds,
            max_frames=max_frames,
            output_dir=Path(temp_dir),
        )
        for index in range(0, len(frames), frames_per_observation):
            yield frames[index : index + frames_per_observation]


def evaluate_success(body: Mapping[str, Any], expected: Mapping[str, Any]) -> list[str]:
    failures: list[str] = []
    candidates = body.get("landmarkCandidates", [])
    max_candidates = int(expected.get("maxLandmarkCandidates", 3))
    if len(candidates) > max_candidates:
        failures.append(
            f"landmarkCandidates has {len(candidates)} items; max is {max_candidates}"
        )
    min_candidates = int(expected.get("minLandmarkCandidates", 0))
    if len(candidates) < min_candidates:
        failures.append(
            f"landmarkCandidates has {len(candidates)} items; min is {min_candidates}"
        )
    if expected.get("expectNoCandidates") and candidates:
        failures.append("landmarkCandidates must be empty for this observation")

    allowed_scene_types = set(expected.get("allowedSceneTypes", []))
    scene_type = body.get("sceneType")
    if allowed_scene_types and scene_type not in allowed_scene_types:
        failures.append(
            f"sceneType {scene_type!r} is not one of {sorted(allowed_scene_types)}"
        )

    detected_text = [str(value).casefold() for value in body.get("detectedText", [])]
    required_text_any = [
        str(value).casefold() for value in expected.get("requiredDetectedTextAny", [])
    ]
    if required_text_any and not any(
        required in detected
        for required in required_text_any
        for detected in detected_text
    ):
        failures.append(
            "detectedText contains none of: " + ", ".join(required_text_any)
        )

    required_candidate_types = set(expected.get("requiredCandidateTypesAny", []))
    candidate_types = {candidate.get("type") for candidate in candidates}
    if required_candidate_types and not required_candidate_types.intersection(
        candidate_types
    ):
        failures.append(
            "landmarkCandidates contain none of the required types: "
            + ", ".join(sorted(required_candidate_types))
        )

    forbidden_keys = set(expected.get("forbiddenTopLevelKeys", []))
    present_forbidden_keys = sorted(forbidden_keys.intersection(body))
    if present_forbidden_keys:
        failures.append(
            "forbidden top-level keys: " + ", ".join(present_forbidden_keys)
        )

    identity_parts: list[str] = []
    for candidate in candidates:
        identity_parts.append(str(candidate.get("proposedName", "")))
        identity_parts.extend(
            str(value) for value in candidate.get("stableFeatures", [])
        )
    identity_text = " ".join(identity_parts).casefold()
    for term in expected.get("forbiddenCandidateTerms", []):
        normalized_term = str(term).casefold()
        pattern = rf"(?<!\w){re.escape(normalized_term)}(?!\w)"
        if re.search(pattern, identity_text):
            failures.append(f"candidate identity uses forbidden term: {term}")

    return failures


def expected_for_observation(
    case: Mapping[str, Any], observation_index: int
) -> dict[str, Any]:
    expected = dict(case.get("expected", {}))
    observation_expectations = case.get("observationExpectations", [])
    list_index = observation_index - 1
    if list_index < len(observation_expectations):
        expected.update(observation_expectations[list_index])
    return expected


def _file_payload(path: Path) -> tuple[str, bytes, str]:
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return path.name, path.read_bytes(), mime_type


def run_case(
    client: HttpClient,
    *,
    base_url: str,
    token: str,
    case: Mapping[str, Any],
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for observation_index, frames in enumerate(iter_observations(case), start=1):
        request_id = f"{case['id']}-{observation_index:03d}"[:100]
        started = perf_counter()
        response = client.post(
            f"{base_url.rstrip('/')}/internal/v1/perception",
            headers={"Authorization": f"Bearer {token}"},
            data={
                "requestId": request_id,
                "locale": case.get("locale", "vi-VN"),
                "analysisMode": case.get("analysisMode", "LANDMARK_DISCOVERY"),
            },
            files=[("frames", _file_payload(frame)) for frame in frames],
        )
        elapsed_ms = round((perf_counter() - started) * 1000)
        try:
            body = response.json()
        except Exception:
            body = {"unparseableBody": True}

        schema_valid = False
        failures: list[str] = []
        try:
            if response.status_code == 200:
                PerceptionResponse.model_validate(body)
                failures = evaluate_success(
                    body, expected_for_observation(case, observation_index)
                )
            else:
                AiErrorResponse.model_validate(body)
            schema_valid = True
        except (ValidationError, TypeError) as exc:
            failures.append(f"response schema validation failed: {exc}")

        records.append(
            {
                "type": "observation",
                "caseId": case["id"],
                "observationIndex": observation_index,
                "frameCount": len(frames),
                "requestId": request_id,
                "statusCode": response.status_code,
                "clientElapsedMs": elapsed_ms,
                "schemaValid": schema_valid,
                "expectationPassed": schema_valid
                and response.status_code == 200
                and not failures,
                "failures": failures,
                "response": body,
            }
        )
    return records


def _client_context(
    mode: str, base_url: str | None, timeout_seconds: float
) -> tuple[AbstractContextManager[Any], str, str]:
    if mode == "mock":
        settings = Settings(
            internal_service_token=LOCAL_TOKEN,
            provider_timeout_seconds=timeout_seconds,
            ai_provider="mock",
        )
        return (
            TestClient(create_app(settings=settings)),
            "http://testserver",
            LOCAL_TOKEN,
        )

    if not base_url:
        raise ValueError("--base-url is required in live mode")
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not token:
        raise ValueError("INTERNAL_SERVICE_TOKEN must be set in live mode")
    return (
        httpx.Client(timeout=timeout_seconds),
        base_url,
        token,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--mode", choices=("mock", "live"), default="mock")
    parser.add_argument("--base-url")
    parser.add_argument("--timeout-seconds", type=float, default=30)
    parser.add_argument("--allow-external-assets", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    manifest = load_manifest(args.manifest.resolve())
    output = args.output or (
        REPO_ROOT
        / "evals"
        / "runs"
        / f"visual-eval-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}.jsonl"
    )
    output.parent.mkdir(parents=True, exist_ok=True)

    selected_cases = []
    for case in manifest["cases"]:
        external_allowed = case.get("permission", {}).get(
            "allowExternalProvider", False
        )
        if args.mode == "live" and not external_allowed:
            if not args.allow_external_assets:
                continue
        selected_cases.append(case)
    if not selected_cases:
        raise ValueError("No cases are authorized for the selected eval mode")

    context, base_url, token = _client_context(
        args.mode, args.base_url, args.timeout_seconds
    )
    records: list[dict[str, Any]] = []
    with context as client:
        for case in selected_cases:
            records.extend(
                run_case(
                    client,
                    base_url=base_url,
                    token=token,
                    case=case,
                )
            )

    summary = {
        "type": "summary",
        "mode": args.mode,
        "caseCount": len(selected_cases),
        "observationCount": len(records),
        "httpSuccessCount": sum(r["statusCode"] == 200 for r in records),
        "schemaValidCount": sum(r["schemaValid"] for r in records),
        "expectationPassCount": sum(r["expectationPassed"] for r in records),
        "generatedAt": datetime.now(UTC).isoformat(),
    }
    with output.open("w", encoding="utf-8") as handle:
        for record in [*records, summary]:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(json.dumps({**summary, "output": str(output)}, ensure_ascii=False))
    return 0 if summary["expectationPassCount"] == len(records) else 1


if __name__ == "__main__":
    raise SystemExit(main())
