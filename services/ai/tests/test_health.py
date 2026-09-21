from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import make_settings


class FailIfCalledProvider:
    async def analyze(self, request: Any) -> dict[str, Any]:
        raise AssertionError("The health endpoint must not call the provider")


def test_health_does_not_call_provider() -> None:
    with TestClient(
        create_app(settings=make_settings(), provider=FailIfCalledProvider())
    ) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "schemaVersion": "1.0"}
