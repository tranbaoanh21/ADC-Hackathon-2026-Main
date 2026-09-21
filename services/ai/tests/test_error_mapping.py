from __future__ import annotations

import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from app.main import create_app
from app.providers.base import ProviderUnavailableError
from app.schemas.errors import AiErrorResponse
from tests.conftest import frame_file, make_settings, perception_data


class UnavailableProvider:
    async def analyze(self, request: Any) -> dict[str, Any]:
        raise ProviderUnavailableError


class SlowProvider:
    async def analyze(self, request: Any) -> dict[str, Any]:
        await asyncio.sleep(1)
        pytest.fail("Provider coroutine should have been cancelled")


class InvalidProvider:
    async def analyze(self, request: Any) -> dict[str, Any]:
        return {"schemaVersion": "1.0", "requestId": request.request_id}


class MismatchedRequestIdProvider:
    async def analyze(self, request: Any) -> dict[str, Any]:
        return {
            "schemaVersion": "1.0",
            "requestId": "different-request-id",
            "frameQuality": "USABLE",
            "detectedText": [],
            "sceneType": "UNKNOWN",
            "landmarkCandidates": [],
            "uncertaintyReasons": [],
            "model": {
                "provider": "fake",
                "modelId": "fake-model",
                "promptVersion": "landmark-perception-v1",
            },
            "processingTimeMs": 0,
        }


def call_provider(
    provider: object,
    auth_headers: dict[str, str],
    png_bytes: bytes,
    *,
    timeout: float = 1.0,
) -> Response:
    settings = make_settings(provider_timeout_seconds=timeout)
    with TestClient(create_app(settings=settings, provider=provider)) as client:
        return client.post(
            "/internal/v1/perception",
            headers=auth_headers,
            data=perception_data(),
            files=[("frames", frame_file(png_bytes))],
        )


@pytest.mark.parametrize(
    ("provider", "timeout", "status", "code"),
    [
        (UnavailableProvider(), 1.0, 503, "PROVIDER_UNAVAILABLE"),
        (SlowProvider(), 0.01, 504, "PROVIDER_TIMEOUT"),
        (InvalidProvider(), 1.0, 503, "PROVIDER_INVALID_RESPONSE"),
        (MismatchedRequestIdProvider(), 1.0, 503, "PROVIDER_INVALID_RESPONSE"),
    ],
)
def test_provider_errors_use_shared_envelope(
    provider: object,
    timeout: float,
    status: int,
    code: str,
    auth_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    response = call_provider(provider, auth_headers, png_bytes, timeout=timeout)

    assert response.status_code == status
    body = response.json()
    error = AiErrorResponse.model_validate(body).error
    assert error.code.value == code
    assert error.request_id == "mobile-obs-test-001"
    assert error.details == []
