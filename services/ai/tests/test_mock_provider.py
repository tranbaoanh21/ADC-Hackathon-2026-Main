from fastapi.testclient import TestClient

from app.schemas.perception import PerceptionResponse
from tests.conftest import frame_file, perception_data


def test_mock_response_is_deterministic_and_schema_valid(
    client: TestClient, auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    request_kwargs = {
        "headers": auth_headers,
        "data": perception_data(),
        "files": [("frames", frame_file(png_bytes))],
    }
    first = client.post("/internal/v1/perception", **request_kwargs)
    second = client.post("/internal/v1/perception", **request_kwargs)

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    response = PerceptionResponse.model_validate(first.json())
    assert response.model.provider == "mock"
    assert response.model.model_id == "mock-landmark-perception-v1"
    assert response.model.prompt_version == "landmark-perception-v1"
