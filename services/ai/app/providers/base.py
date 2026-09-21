"""Provider-neutral input and adapter protocol."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from app.schemas.perception import AnalysisMode


@dataclass(frozen=True, slots=True)
class ValidatedFrame:
    content_type: str
    data: bytes


@dataclass(frozen=True, slots=True)
class PerceptionInput:
    request_id: str
    locale: str
    analysis_mode: AnalysisMode
    frames: tuple[ValidatedFrame, ...]


class ProviderUnavailableError(RuntimeError):
    """Raised when the selected provider cannot serve the request."""


class ProviderInvalidResponseError(RuntimeError):
    """Raised when provider output cannot satisfy the shared schema."""


class PerceptionProvider(Protocol):
    async def analyze(self, request: PerceptionInput) -> Mapping[str, Any]:
        """Return an untrusted provider mapping for runtime validation."""
        ...
