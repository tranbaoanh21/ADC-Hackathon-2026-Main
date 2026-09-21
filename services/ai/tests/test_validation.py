from fastapi.testclient import TestClient
from httpx import Response

from app.main import create_app
from app.schemas.errors import AiErrorResponse
from tests.conftest import frame_file, make_settings, perception_data


def assert_error(response: Response, status_code: int, code: str) -> dict[str, object]:
    assert response.status_code == status_code
    body = response.json()
    AiErrorResponse.model_validate(body)
    assert body["error"]["code"] == code
    return body


def test_success_with_one_valid_png(
    client: TestClient, auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
        files=[("frames", frame_file(png_bytes))],
    )

    assert response.status_code == 200
    assert response.json()["requestId"] == "mobile-obs-test-001"


def test_success_with_three_frames(
    client: TestClient, auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
        files=[
            ("frames", frame_file(png_bytes, filename=f"frame-{i}.png"))
            for i in range(3)
        ],
    )

    assert response.status_code == 200


def test_missing_frame_is_422(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
    )

    assert_error(response, 422, "VALIDATION_ERROR")


def test_more_than_three_frames_is_413(
    client: TestClient, auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
        files=[
            ("frames", frame_file(png_bytes, filename=f"frame-{i}.png"))
            for i in range(4)
        ],
    )

    assert_error(response, 413, "PAYLOAD_TOO_LARGE")


def test_invalid_content_type_is_422(
    client: TestClient, auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
        files=[("frames", frame_file(png_bytes, "image/gif", "frame.gif"))],
    )

    assert_error(response, 422, "VALIDATION_ERROR")


def test_declared_image_with_invalid_bytes_is_422(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
        files=[("frames", frame_file(b"not-an-image"))],
    )

    assert_error(response, 422, "VALIDATION_ERROR")


def test_frame_over_byte_limit_is_413(
    auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    settings = make_settings(max_frame_bytes=len(png_bytes) - 1)
    with TestClient(create_app(settings=settings)) as client:
        response = client.post(
            "/internal/v1/perception",
            headers=auth_headers,
            data=perception_data(),
            files=[("frames", frame_file(png_bytes))],
        )

    assert_error(response, 413, "PAYLOAD_TOO_LARGE")


def test_request_over_byte_limit_is_413(
    auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    settings = make_settings(max_request_bytes=128)
    with TestClient(create_app(settings=settings)) as client:
        response = client.post(
            "/internal/v1/perception",
            headers=auth_headers,
            data=perception_data(),
            files=[("frames", frame_file(png_bytes))],
        )

    assert_error(response, 413, "PAYLOAD_TOO_LARGE")


def test_invalid_analysis_mode_is_422(
    client: TestClient, auth_headers: dict[str, str], png_bytes: bytes
) -> None:
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(analysisMode="NAVIGATION"),
        files=[("frames", frame_file(png_bytes))],
    )

    assert_error(response, 422, "VALIDATION_ERROR")


def test_declared_png_with_jpeg_bytes_is_422(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    import io

    from PIL import Image

    output = io.BytesIO()
    Image.new("RGB", (2, 2)).save(output, format="JPEG")
    response = client.post(
        "/internal/v1/perception",
        headers=auth_headers,
        data=perception_data(),
        files=[("frames", frame_file(output.getvalue(), "image/png", "frame.png"))],
    )

    assert_error(response, 422, "VALIDATION_ERROR")
