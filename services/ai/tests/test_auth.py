from fastapi.testclient import TestClient

from app.schemas.errors import AiErrorResponse
from tests.conftest import frame_file, perception_data


def test_missing_bearer_token_returns_contract_error(
    client: TestClient, png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        data=perception_data(),
        files=[("frames", frame_file(png_bytes))],
    )

    assert response.status_code == 401
    error = AiErrorResponse.model_validate(response.json())
    assert error.error.code.value == "UNAUTHORIZED"
    assert error.error.retryable is False
    assert error.error.details == []


def test_wrong_bearer_token_returns_contract_error(
    client: TestClient, png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers={"Authorization": "Bearer wrong-token"},
        data=perception_data(),
        files=[("frames", frame_file(png_bytes))],
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_missing_token_takes_precedence_over_payload_limit(
    client: TestClient, png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        data=perception_data(),
        files=[("frames", frame_file(png_bytes * 100))],
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
