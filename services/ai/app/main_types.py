"""HTTP-layer exception types shared by routes and handlers."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.schemas.errors import ErrorCode, ErrorDetail


@dataclass(slots=True)
class ApiError(Exception):
    status_code: int
    code: ErrorCode
    message: str
    retryable: bool
    request_id: str | None = None
    details: list[ErrorDetail] = field(default_factory=list)
