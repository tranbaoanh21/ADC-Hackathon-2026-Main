from __future__ import annotations

import io
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app

TEST_TOKEN = "test-only-internal-token"


def make_png() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (2, 2), color=(20, 40, 60)).save(output, format="PNG")
    return output.getvalue()


def make_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "internal_service_token": TEST_TOKEN,
        "max_frame_bytes": 5 * 1024 * 1024,
        "max_request_bytes": 16 * 1024 * 1024,
        "provider_timeout_seconds": 1.0,
        "ai_provider": "mock",
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


@pytest.fixture
def png_bytes() -> bytes:
    return make_png()


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {TEST_TOKEN}"}


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app(settings=make_settings())) as test_client:
        yield test_client


def perception_data(**overrides: str) -> dict[str, str]:
    data = {
        "requestId": "mobile-obs-test-001",
        "locale": "vi-VN",
        "analysisMode": "LANDMARK_DISCOVERY",
    }
    data.update(overrides)
    return data


def frame_file(
    data: bytes, content_type: str = "image/png", filename: str = "frame.png"
) -> tuple[str, bytes, str]:
    return (filename, data, content_type)
