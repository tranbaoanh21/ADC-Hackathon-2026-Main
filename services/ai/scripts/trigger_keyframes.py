"""Extract quality-filtered, cosine-deduplicated observations around triggers."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageFilter, ImageOps, ImageStat
from pydantic import ValidationError

from app.schemas.errors import AiErrorResponse
from app.schemas.perception import PerceptionResponse

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "evals" / "runs"
ALLOWED_VIDEO_SUFFIXES = {".avi", ".m4v", ".mov", ".mp4", ".webm"}
DESCRIPTOR_SIZE = (32, 32)


@dataclass(frozen=True, slots=True)
class Trigger:
    trigger_id: str
    timestamp_ms: int
    created_by: str | None = None


@dataclass(frozen=True, slots=True)
class FrameCandidate:
    path: Path
    timestamp_ms: int
    brightness: float
    sharpness: float
    quality_score: float
    descriptor: tuple[float, ...]


@dataclass(frozen=True, slots=True)
class FrameSelection:
    selected: tuple[FrameCandidate, ...]
    total_candidates: int
    quality_rejected: int
    duplicate_rejected: int
    used_quality_fallback: bool


def load_triggers(path: Path) -> tuple[str, list[Trigger]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != "1.0":
        raise ValueError("Trigger manifest schemaVersion must be 1.0")
    session_id = payload.get("sessionId")
    if not isinstance(session_id, str) or not session_id.strip():
        raise ValueError("Trigger manifest requires a non-blank sessionId")
    raw_triggers = payload.get("triggers")
    if not isinstance(raw_triggers, list) or not raw_triggers:
        raise ValueError("Trigger manifest requires at least one trigger")

    triggers: list[Trigger] = []
    seen_ids: set[str] = set()
    for raw_trigger in raw_triggers:
        if not isinstance(raw_trigger, dict):
            raise ValueError("Each trigger must be an object")
        trigger_id = raw_trigger.get("triggerId")
        timestamp_ms = raw_trigger.get("timestampMs")
        created_by = raw_trigger.get("createdBy")
        if not isinstance(trigger_id, str) or not trigger_id.strip():
            raise ValueError("Each trigger requires a non-blank triggerId")
        if trigger_id in seen_ids:
            raise ValueError(f"Duplicate triggerId: {trigger_id}")
        if (
            isinstance(timestamp_ms, bool)
            or not isinstance(timestamp_ms, int)
            or timestamp_ms < 0
        ):
            raise ValueError("Each timestampMs must be a non-negative integer")
        if created_by is not None and (
            not isinstance(created_by, str) or not created_by.strip()
        ):
            raise ValueError("createdBy must be a non-blank string when present")
        seen_ids.add(trigger_id)
        triggers.append(
            Trigger(
                trigger_id=trigger_id,
                timestamp_ms=timestamp_ms,
                created_by=created_by,
            )
        )

    triggers.sort(key=lambda trigger: (trigger.timestamp_ms, trigger.trigger_id))
    return session_id.strip(), triggers


def cosine_similarity(left: tuple[float, ...], right: tuple[float, ...]) -> float:
    if not left or len(left) != len(right):
        raise ValueError("Cosine vectors must be non-empty and have equal length")
    dot_product = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 1.0 if left == right else 0.0
    return max(-1.0, min(1.0, dot_product / (left_norm * right_norm)))


def _image_descriptor(image: Image.Image) -> tuple[float, ...]:
    thumbnail = image.resize(DESCRIPTOR_SIZE, Image.Resampling.BILINEAR)
    pixels = [float(value) for value in thumbnail.tobytes()]
    mean = sum(pixels) / len(pixels)
    centered = tuple(value - mean for value in pixels)
    if any(centered):
        return centered
    return tuple(value / 255.0 for value in pixels)


def analyze_frame(path: Path, *, timestamp_ms: int) -> FrameCandidate:
    with Image.open(path) as source:
        grayscale = ImageOps.exif_transpose(source).convert("L")
        grayscale.thumbnail((640, 640), Image.Resampling.LANCZOS)
        brightness = float(ImageStat.Stat(grayscale).mean[0])
        edges = grayscale.filter(ImageFilter.FIND_EDGES)
        if edges.width > 2 and edges.height > 2:
            edges = edges.crop((1, 1, edges.width - 1, edges.height - 1))
        sharpness = float(ImageStat.Stat(edges).var[0])
        descriptor = _image_descriptor(grayscale)

    brightness_score = max(0.0, 1.0 - abs(brightness - 127.5) / 127.5)
    quality_score = sharpness * (0.5 + 0.5 * brightness_score)
    return FrameCandidate(
        path=path,
        timestamp_ms=timestamp_ms,
        brightness=round(brightness, 3),
        sharpness=round(sharpness, 3),
        quality_score=round(quality_score, 3),
        descriptor=descriptor,
    )


def select_keyframes(
    candidates: list[FrameCandidate],
    *,
    target_timestamp_ms: int | None = None,
    max_frames: int = 3,
    cosine_threshold: float = 0.985,
    min_brightness: float = 25.0,
    max_brightness: float = 235.0,
    min_sharpness: float = 20.0,
) -> FrameSelection:
    if not candidates:
        raise ValueError("At least one frame candidate is required")
    if not 1 <= max_frames <= 3:
        raise ValueError("max_frames must be between one and three")
    if not 0.0 <= cosine_threshold <= 1.0:
        raise ValueError("cosine_threshold must be between zero and one")
    if not 0.0 <= min_brightness < max_brightness <= 255.0:
        raise ValueError("brightness thresholds must satisfy 0 <= min < max <= 255")
    if min_sharpness < 0:
        raise ValueError("min_sharpness must be non-negative")

    usable = [
        candidate
        for candidate in candidates
        if min_brightness <= candidate.brightness <= max_brightness
        and candidate.sharpness >= min_sharpness
    ]
    quality_rejected = len(candidates) - len(usable)
    used_quality_fallback = not usable
    pool = usable or [max(candidates, key=lambda candidate: candidate.quality_score)]

    representatives: list[FrameCandidate] = []
    duplicate_rejected = 0
    for candidate in sorted(pool, key=lambda item: item.timestamp_ms):
        similarities = [
            cosine_similarity(candidate.descriptor, selected.descriptor)
            for selected in representatives
        ]
        duplicate_indexes = [
            index
            for index, similarity in enumerate(similarities)
            if similarity >= cosine_threshold
        ]
        if not duplicate_indexes:
            representatives.append(candidate)
            continue

        duplicate_rejected += 1
        closest_index = max(duplicate_indexes, key=lambda index: similarities[index])
        if candidate.quality_score > representatives[closest_index].quality_score:
            representatives[closest_index] = candidate

    quality_ranked = sorted(
        representatives,
        key=lambda candidate: (-candidate.quality_score, candidate.timestamp_ms),
    )
    if target_timestamp_ms is None:
        selected = quality_ranked[:max_frames]
    else:
        anchor = min(
            representatives,
            key=lambda candidate: (
                abs(candidate.timestamp_ms - target_timestamp_ms),
                -candidate.quality_score,
            ),
        )
        selected = [anchor]
        selected.extend(
            candidate for candidate in quality_ranked if candidate is not anchor
        )
        selected = selected[:max_frames]
    selected.sort(key=lambda candidate: candidate.timestamp_ms)
    return FrameSelection(
        selected=tuple(selected),
        total_candidates=len(candidates),
        quality_rejected=quality_rejected,
        duplicate_rejected=duplicate_rejected,
        used_quality_fallback=used_quality_fallback,
    )


def _extract_trigger_candidates(
    video: Path,
    *,
    trigger: Trigger,
    trigger_index: int,
    output_dir: Path,
    window_before_ms: int,
    window_after_ms: int,
    candidate_fps: float,
) -> list[FrameCandidate]:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required for trigger keyframe extraction")
    start_ms = max(0, trigger.timestamp_ms - window_before_ms)
    end_ms = trigger.timestamp_ms + window_after_ms
    duration_seconds = max(0.001, (end_ms - start_ms) / 1000.0)
    trigger_dir = output_dir / f"trigger-{trigger_index:04d}"
    trigger_dir.mkdir(parents=True, exist_ok=True)
    pattern = trigger_dir / "candidate-%04d.jpg"
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(video),
        "-ss",
        f"{start_ms / 1000.0:.3f}",
        "-t",
        f"{duration_seconds:.3f}",
        "-vf",
        f"fps={candidate_fps}",
        "-q:v",
        "2",
        str(pattern),
    ]
    subprocess.run(command, check=True)
    paths = sorted(trigger_dir.glob("candidate-*.jpg"))
    if not paths:
        raise RuntimeError(f"No frames extracted around trigger {trigger.trigger_id!r}")
    interval_ms = 1000.0 / candidate_fps
    return [
        analyze_frame(
            path,
            timestamp_ms=round(start_ms + index * interval_ms),
        )
        for index, path in enumerate(paths)
    ]


def _safe_request_id(session_id: str, trigger_id: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", f"{session_id}-{trigger_id}")
    return value.strip("-")[:100] or "trigger-observation"


def _selection_record(trigger: Trigger, selection: FrameSelection) -> dict[str, Any]:
    return {
        "triggerId": trigger.trigger_id,
        "timestampMs": trigger.timestamp_ms,
        "createdBy": trigger.created_by,
        "selection": {
            "mode": "QUALITY_COSINE",
            "candidateCount": selection.total_candidates,
            "selectedFrameCount": len(selection.selected),
            "qualityRejectedCount": selection.quality_rejected,
            "duplicateRejectedCount": selection.duplicate_rejected,
            "usedQualityFallback": selection.used_quality_fallback,
            "selectedFrames": [
                {
                    "timestampMs": frame.timestamp_ms,
                    "brightness": frame.brightness,
                    "sharpness": frame.sharpness,
                    "qualityScore": frame.quality_score,
                }
                for frame in selection.selected
            ],
        },
    }


def _send_observation(
    *,
    base_url: str,
    token: str,
    request_id: str,
    locale: str,
    analysis_mode: str,
    selection: FrameSelection,
    timeout_seconds: float,
) -> tuple[int, dict[str, Any], bool]:
    files = [
        ("frames", (frame.path.name, frame.path.read_bytes(), "image/jpeg"))
        for frame in selection.selected
    ]
    with httpx.Client(timeout=timeout_seconds) as client:
        response = client.post(
            f"{base_url.rstrip('/')}/internal/v1/perception",
            headers={"Authorization": f"Bearer {token}"},
            data={
                "requestId": request_id,
                "locale": locale,
                "analysisMode": analysis_mode,
            },
            files=files,
        )
    body = response.json()
    try:
        if response.status_code == 200:
            PerceptionResponse.model_validate(body)
        else:
            AiErrorResponse.model_validate(body)
        schema_valid = True
    except (ValidationError, TypeError):
        schema_valid = False
    return response.status_code, body, schema_valid


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract trigger-centered keyframes and optionally call FastAPI."
    )
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--triggers", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--send", action="store_true")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--locale", default="vi-VN")
    parser.add_argument("--analysis-mode", default="LANDMARK_DISCOVERY")
    parser.add_argument("--window-before-ms", type=int, default=1000)
    parser.add_argument("--window-after-ms", type=int, default=1000)
    parser.add_argument("--candidate-fps", type=float, default=4.0)
    parser.add_argument("--max-frames", type=int, default=3)
    parser.add_argument("--cosine-threshold", type=float, default=0.985)
    parser.add_argument("--min-brightness", type=float, default=25.0)
    parser.add_argument("--max-brightness", type=float, default=235.0)
    parser.add_argument("--min-sharpness", type=float, default=20.0)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    video = args.video.resolve()
    trigger_path = args.triggers.resolve()
    if not video.is_file():
        raise FileNotFoundError(f"Video is missing: {video}")
    if video.suffix.lower() not in ALLOWED_VIDEO_SUFFIXES:
        raise ValueError(f"Unsupported video extension: {video.suffix}")
    if not trigger_path.is_file():
        raise FileNotFoundError(f"Trigger manifest is missing: {trigger_path}")
    if args.window_before_ms < 0 or args.window_after_ms < 0:
        raise ValueError("Trigger windows must be non-negative")
    if args.window_before_ms + args.window_after_ms <= 0:
        raise ValueError("Trigger window must contain positive duration")
    if args.candidate_fps <= 0 or args.timeout_seconds <= 0:
        raise ValueError("candidate-fps and timeout-seconds must be positive")

    session_id, triggers = load_triggers(trigger_path)
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if args.send and not token:
        raise RuntimeError("INTERNAL_SERVICE_TOKEN is required with --send")

    output = args.output
    if output is None:
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        output = DEFAULT_OUTPUT_DIR / f"trigger-keyframes-{stamp}.jsonl"
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix="pathmemory-trigger-frames-") as temp_dir:
        temp_path = Path(temp_dir)
        for trigger_index, trigger in enumerate(triggers, start=1):
            candidates = _extract_trigger_candidates(
                video,
                trigger=trigger,
                trigger_index=trigger_index,
                output_dir=temp_path,
                window_before_ms=args.window_before_ms,
                window_after_ms=args.window_after_ms,
                candidate_fps=args.candidate_fps,
            )
            selection = select_keyframes(
                candidates,
                target_timestamp_ms=trigger.timestamp_ms,
                max_frames=args.max_frames,
                cosine_threshold=args.cosine_threshold,
                min_brightness=args.min_brightness,
                max_brightness=args.max_brightness,
                min_sharpness=args.min_sharpness,
            )
            record = {
                "type": "triggerObservation",
                "sessionId": session_id,
                "observationIndex": trigger_index,
                **_selection_record(trigger, selection),
            }
            if args.send:
                request_id = _safe_request_id(session_id, trigger.trigger_id)
                status_code, response_body, schema_valid = _send_observation(
                    base_url=args.base_url,
                    token=token,
                    request_id=request_id,
                    locale=args.locale,
                    analysis_mode=args.analysis_mode,
                    selection=selection,
                    timeout_seconds=args.timeout_seconds,
                )
                record.update(
                    {
                        "requestId": request_id,
                        "statusCode": status_code,
                        "schemaValid": schema_valid,
                        "response": response_body,
                    }
                )
            records.append(record)

    summary = {
        "type": "summary",
        "sessionId": session_id,
        "triggerCount": len(triggers),
        "observationCount": len(records),
        "sentToFastApi": bool(args.send),
        "selectionConfig": {
            "windowBeforeMs": args.window_before_ms,
            "windowAfterMs": args.window_after_ms,
            "candidateFps": args.candidate_fps,
            "maxFrames": args.max_frames,
            "cosineThreshold": args.cosine_threshold,
            "minBrightness": args.min_brightness,
            "maxBrightness": args.max_brightness,
            "minSharpness": args.min_sharpness,
        },
        "generatedAt": datetime.now(UTC).isoformat(),
    }
    with output.open("w", encoding="utf-8") as handle:
        for record in [*records, summary]:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(json.dumps({**summary, "output": str(output)}, ensure_ascii=False))
    if args.send and not all(record.get("schemaValid") for record in records):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
