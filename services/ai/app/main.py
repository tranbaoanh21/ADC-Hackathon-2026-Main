"""FastAPI application factory for the PathMemory AI service."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.perception import router as perception_router
from app.config import Settings
from app.main_types import ApiError
from app.providers.base import PerceptionProvider, ProviderUnavailableError
from app.providers.gemini import create_gemini_provider
from app.providers.mock import MockPerceptionProvider
from app.schemas.errors import AiErrorResponse, ErrorBody, ErrorCode, ErrorDetail
from app.services.perception import PerceptionService


class UnavailableProvider:
    async def analyze(self, request: Any) -> dict[str, Any]:
        raise ProviderUnavailableError


def _provider_from_settings(settings: Settings) -> PerceptionProvider:
    if settings.ai_provider == "mock":
        return MockPerceptionProvider()
    if (
        settings.ai_provider == "gemini"
        and settings.gemini_api_key
        and settings.gemini_model
    ):
        return create_gemini_provider(
            api_key=settings.gemini_api_key,
            model_id=settings.gemini_model,
            allow_demo_objects=settings.demo_allow_movable_landmarks,
        )
    return UnavailableProvider()


def _error_response(error: ApiError) -> JSONResponse:
    payload = AiErrorResponse(
        error=ErrorBody(
            code=error.code,
            message=error.message,
            retryable=error.retryable,
            requestId=error.request_id,
            details=error.details,
        )
    )
    return JSONResponse(
        status_code=error.status_code,
        content=payload.model_dump(by_alias=True, exclude_none=True, mode="json"),
    )


def create_app(
    settings: Settings | None = None,
    provider: PerceptionProvider | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    resolved_provider = provider or _provider_from_settings(resolved_settings)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        yield
        close = getattr(resolved_provider, "aclose", None)
        if close is not None:
            await close()

    application = FastAPI(
        title="PathMemory Internal AI Service",
        version="1.1.0",
        openapi_url=None,
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.state.perception_service = PerceptionService(
        provider=resolved_provider,
        timeout_seconds=resolved_settings.provider_timeout_seconds,
    )

    @application.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        return _error_response(exc)

    @application.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            ErrorDetail(
                field=".".join(str(part) for part in error["loc"] if part != "body"),
                issue=error["msg"],
            )
            for error in exc.errors(include_url=False, include_input=False)
        ]
        return _error_response(
            ApiError(
                status_code=422,
                code=ErrorCode.VALIDATION_ERROR,
                message="Perception request is invalid.",
                retryable=False,
                details=details,
            )
        )

    application.include_router(health_router)
    application.include_router(perception_router)
    return application


app = create_app()
