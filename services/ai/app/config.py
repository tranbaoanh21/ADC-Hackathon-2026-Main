"""Environment-backed runtime configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _positive_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be greater than zero")
    return value


def _positive_float(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        value = float(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a number") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be greater than zero")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    """Environment-backed configuration for mock and Gemini providers."""

    internal_service_token: str = ""
    max_frame_bytes: int = 5 * 1024 * 1024
    max_request_bytes: int = 16 * 1024 * 1024
    provider_timeout_seconds: float = 15.0
    ai_provider: str = "mock"
    gemini_api_key: str = ""
    gemini_model: str = ""

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            internal_service_token=os.getenv("INTERNAL_SERVICE_TOKEN", ""),
            max_frame_bytes=_positive_int("MAX_FRAME_BYTES", 5 * 1024 * 1024),
            max_request_bytes=_positive_int("MAX_REQUEST_BYTES", 16 * 1024 * 1024),
            provider_timeout_seconds=_positive_float("PROVIDER_TIMEOUT_SECONDS", 15.0),
            ai_provider=os.getenv("AI_PROVIDER", "mock").strip().lower() or "mock",
            gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
            gemini_model=os.getenv("GEMINI_MODEL", "").strip(),
        )
