"""Provider execution, timeout enforcement and output validation."""

from __future__ import annotations

import asyncio

from pydantic import ValidationError

from app.providers.base import (
    PerceptionInput,
    PerceptionProvider,
    ProviderInvalidResponseError,
)
from app.schemas.perception import PerceptionResponse


class ProviderTimeoutError(RuntimeError):
    """The provider exceeded the configured timeout."""


class PerceptionService:
    def __init__(self, provider: PerceptionProvider, timeout_seconds: float) -> None:
        self._provider = provider
        self._timeout_seconds = timeout_seconds

    async def analyze(self, request: PerceptionInput) -> PerceptionResponse:
        try:
            raw_response = await asyncio.wait_for(
                self._provider.analyze(request), timeout=self._timeout_seconds
            )
        except TimeoutError as exc:
            raise ProviderTimeoutError from exc

        try:
            response = PerceptionResponse.model_validate(raw_response)
        except ValidationError as exc:
            raise ProviderInvalidResponseError from exc

        if response.request_id != request.request_id:
            raise ProviderInvalidResponseError
        return response
