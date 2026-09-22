from __future__ import annotations

import asyncio
import io
import json
from copy import deepcopy
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.providers.base import (
    PerceptionInput,
    ProviderInvalidResponseError,
    ProviderUnavailableError,
    ValidatedFrame,
)
from app.providers.gemini import MAX_IMAGE_EDGE, GeminiPerceptionProvider
from app.providers.prompt import (
    DEMO_OBJECT_SYSTEM_INSTRUCTION,
    DEMO_PROMPT_VERSION,
    PROMPT_VERSION,
    SYSTEM_INSTRUCTION,
    build_user_prompt,
)
from app.schemas.perception import AnalysisMode, PerceptionResponse
from tests.conftest import frame_file, make_png, make_settings, perception_data

VALID_EVIDENCE = {
    "frameQuality": "USABLE",
    "detectedText": ["LEVEL 2"],
    "sceneType": "ELEVATOR_AREA",
    "landmarkCandidates": [
        {
            "proposedName": "Elevator Level 2",
            "type": "ELEVATOR_AREA",
            "visibleText": ["LEVEL 2"],
            "stableFeatures": ["Level 2 sign beside the elevator"],
            "draftDescription": "Khu vực thang máy có biển LEVEL 2.",
            "transientFeatures": [],
        }
    ],
    "uncertaintyReasons": [],
}


class FakeResponse:
    def __init__(self, text: str | None) -> None:
        self.text = text


class FakeGeminiClient:
    def __init__(
        self,
        *,
        text: str | None = None,
        error: Exception | None = None,
        delay_seconds: float = 0,
    ) -> None:
        self._text = text
        self._error = error
        self._delay_seconds = delay_seconds
        self.calls: list[dict[str, Any]] = []

    async def generate_content(self, **kwargs: Any) -> FakeResponse:
        self.calls.append(kwargs)
        if self._delay_seconds:
            await asyncio.sleep(self._delay_seconds)
        if self._error is not None:
            raise self._error
        return FakeResponse(self._text)


def provider_request(frame_bytes: bytes | None = None) -> PerceptionInput:
    return PerceptionInput(
        request_id="gemini-offline-001",
        locale="vi-VN",
        analysis_mode=AnalysisMode.LANDMARK_DISCOVERY,
        frames=(
            ValidatedFrame(content_type="image/png", data=frame_bytes or make_png()),
        ),
    )


def test_gemini_success_uses_structured_config_and_validates_response() -> None:
    client = FakeGeminiClient(text=json.dumps(VALID_EVIDENCE))
    provider = GeminiPerceptionProvider(client=client, model_id="test-gemini-model")

    raw_response = asyncio.run(provider.analyze(provider_request()))
    response = PerceptionResponse.model_validate(raw_response)

    assert response.request_id == "gemini-offline-001"
    assert response.model.provider == "gemini"
    assert response.model.model_id == "test-gemini-model"
    assert response.model.prompt_version == PROMPT_VERSION
    assert response.processing_time_ms >= 0
    assert len(client.calls) == 1

    call = client.calls[0]
    assert call["model"] == "test-gemini-model"
    assert call["config"].response_mime_type == "application/json"
    assert call["config"].thinking_config.thinking_level.value == "MINIMAL"
    assert call["config"].max_output_tokens == 2048
    assert call["config"].response_json_schema["additionalProperties"] is False
    parts = call["contents"][0].parts
    assert parts[0].text is not None
    assert parts[1].inline_data.mime_type == "image/jpeg"
    assert parts[1].inline_data.data != make_png()


def test_preprocessing_limits_image_edge_and_stays_in_memory() -> None:
    source = io.BytesIO()
    Image.new("RGB", (2048, 1200), color=(10, 20, 30)).save(source, format="PNG")
    client = FakeGeminiClient(text=json.dumps(VALID_EVIDENCE))
    provider = GeminiPerceptionProvider(client=client, model_id="test-model")

    asyncio.run(provider.analyze(provider_request(source.getvalue())))

    image_bytes = client.calls[0]["contents"][0].parts[1].inline_data.data
    with Image.open(io.BytesIO(image_bytes)) as prepared:
        assert prepared.format == "JPEG"
        assert max(prepared.size) == MAX_IMAGE_EDGE


def test_demo_object_mode_allows_one_movable_candidate() -> None:
    client = FakeGeminiClient(text=json.dumps(VALID_EVIDENCE))
    provider = GeminiPerceptionProvider(
        client=client,
        model_id="test-model",
        allow_demo_objects=True,
    )

    raw_response = asyncio.run(provider.analyze(provider_request()))

    assert raw_response["model"]["promptVersion"] == DEMO_PROMPT_VERSION
    call = client.calls[0]
    assert call["config"].system_instruction == DEMO_OBJECT_SYSTEM_INSTRUCTION
    prompt = call["contents"][0].parts[0].text
    assert "Portable props such as chairs" in prompt
    assert "single most visually dominant object" in prompt


@pytest.mark.parametrize(
    "invalid_output",
    [
        "not-json",
        json.dumps({"frameQuality": "USABLE"}),
        json.dumps({**VALID_EVIDENCE, "frameQuality": "PERFECT"}),
        json.dumps({**VALID_EVIDENCE, "unexpected": True}),
        "",
    ],
)
def test_invalid_gemini_output_is_rejected(invalid_output: str) -> None:
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(text=invalid_output), model_id="test-model"
    )

    with pytest.raises(ProviderInvalidResponseError):
        asyncio.run(provider.analyze(provider_request()))


@pytest.mark.parametrize(
    "invalid_evidence",
    [
        {
            **VALID_EVIDENCE,
            "frameQuality": "UNREADABLE",
            "uncertaintyReasons": ["The sign cannot be read."],
        },
        {
            **VALID_EVIDENCE,
            "frameQuality": "TOO_DARK",
            "landmarkCandidates": [],
            "uncertaintyReasons": [],
        },
        {
            **VALID_EVIDENCE,
            "frameQuality": "BLURRY",
            "uncertaintyReasons": [],
        },
        {
            **VALID_EVIDENCE,
            "landmarkCandidates": [
                {
                    "proposedName": "Unknown area",
                    "type": "OTHER",
                    "visibleText": [],
                    "stableFeatures": [],
                    "draftDescription": "An unsupported landmark candidate.",
                }
            ],
        },
        {**VALID_EVIDENCE, "detectedText": ["   "]},
        {**VALID_EVIDENCE, "uncertaintyReasons": [""]},
    ],
)
def test_semantically_invalid_gemini_output_is_rejected(
    invalid_evidence: dict[str, Any],
) -> None:
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(text=json.dumps(invalid_evidence)),
        model_id="test-model",
    )

    with pytest.raises(ProviderInvalidResponseError):
        asyncio.run(provider.analyze(provider_request()))


@pytest.mark.parametrize("frame_quality", ["TOO_DARK", "OBSTRUCTED", "UNREADABLE"])
def test_low_quality_output_with_uncertainty_is_accepted(frame_quality: str) -> None:
    evidence = {
        **VALID_EVIDENCE,
        "frameQuality": frame_quality,
        "detectedText": [],
        "sceneType": "UNKNOWN",
        "landmarkCandidates": [],
        "uncertaintyReasons": ["The scene cannot be interpreted reliably."],
    }
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(text=json.dumps(evidence)), model_id="test-model"
    )

    raw_response = asyncio.run(provider.analyze(provider_request()))

    assert raw_response["frameQuality"] == frame_quality
    assert raw_response["landmarkCandidates"] == []


def test_gemini_transport_error_is_sanitized() -> None:
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(error=RuntimeError("private-provider-payload")),
        model_id="test-model",
    )

    with pytest.raises(ProviderUnavailableError) as captured:
        asyncio.run(provider.analyze(provider_request()))

    assert str(captured.value) == ""


def test_gemini_timeout_maps_to_contract_error(
    auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(text=json.dumps(VALID_EVIDENCE), delay_seconds=0.2),
        model_id="test-model",
    )
    settings = make_settings(provider_timeout_seconds=0.01)
    with TestClient(create_app(settings=settings, provider=provider)) as client:
        response = client.post(
            "/internal/v1/perception",
            headers=auth_headers,
            data=perception_data(),
            files=[("frames", frame_file(png_bytes))],
        )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "PROVIDER_TIMEOUT"


@pytest.mark.parametrize(
    ("api_key", "model_id"),
    [("", "test-model"), ("test-key", "")],
)
def test_missing_gemini_configuration_is_provider_unavailable(
    api_key: str,
    model_id: str,
    auth_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    settings = make_settings(
        ai_provider="gemini", gemini_api_key=api_key, gemini_model=model_id
    )
    with TestClient(create_app(settings=settings)) as client:
        response = client.post(
            "/internal/v1/perception",
            headers=auth_headers,
            data=perception_data(),
            files=[("frames", frame_file(png_bytes))],
        )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "PROVIDER_UNAVAILABLE"


def test_secret_and_raw_provider_payload_do_not_reach_response_or_logs(
    auth_headers: dict[str, str], png_bytes: bytes, caplog: pytest.LogCaptureFixture
) -> None:
    secret = "test-secret-must-not-leak"
    raw_payload = "private-provider-payload"
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(error=RuntimeError(f"{secret}:{raw_payload}")),
        model_id="test-model",
    )
    with TestClient(create_app(settings=make_settings(), provider=provider)) as client:
        response = client.post(
            "/internal/v1/perception",
            headers=auth_headers,
            data=perception_data(),
            files=[("frames", frame_file(png_bytes))],
        )

    observable = f"{response.text}\n{caplog.text}"
    assert response.status_code == 503
    assert secret not in observable
    assert raw_payload not in observable
    assert png_bytes.hex() not in observable


@pytest.mark.parametrize("mode", list(AnalysisMode))
def test_prompt_enforces_perception_only_boundary(mode: AnalysisMode) -> None:
    prompt = (
        SYSTEM_INSTRUCTION
        + build_user_prompt(locale="vi-VN", analysis_mode=mode, frame_count=2)
    ).lower()

    for required_boundary in (
        "route",
        "expected landmark",
        "shouldadvance",
        "movement cue",
        "stop_and_rescan",
        "safetoproceed",
        "cane",
        "guide dog",
        "orientation",
    ):
        assert required_boundary in prompt


def test_discovery_prompt_renders_runtime_values_without_markdown_escapes() -> None:
    prompt = build_user_prompt(
        locale="vi-VN",
        analysis_mode=AnalysisMode.LANDMARK_DISCOVERY,
        frame_count=3,
    )
    normalized_prompt = " ".join(prompt.lower().split())

    assert "Analyze 3 frame(s) as one guided workplace-learning observation." in prompt
    assert "Requested output locale: vi-VN" in prompt
    assert "Analysis mode: LANDMARK_DISCOVERY" in prompt
    assert "{frame_count}" not in prompt
    assert "{locale}" not in prompt
    assert "\\_" not in prompt
    assert "generic corridor" in SYSTEM_INSTRUCTION.lower()
    assert "movable furnishings" in SYSTEM_INSTRUCTION.lower()
    assert "framequality must be blurry" in SYSTEM_INSTRUCTION.lower()
    assert "draft for later human confirmation" in SYSTEM_INSTRUCTION.lower()
    assert "combination of visibly" in normalized_prompt
    assert "prefer proposing a grounded draft candidate" in normalized_prompt


def test_gemini_provider_does_not_accept_model_generated_metadata() -> None:
    poisoned = deepcopy(VALID_EVIDENCE)
    poisoned["requestId"] = "attacker-controlled"
    provider = GeminiPerceptionProvider(
        client=FakeGeminiClient(text=json.dumps(poisoned)), model_id="test-model"
    )

    with pytest.raises(ProviderInvalidResponseError):
        asyncio.run(provider.analyze(provider_request()))
