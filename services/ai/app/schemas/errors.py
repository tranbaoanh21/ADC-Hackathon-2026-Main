"""Stable error envelope for the internal AI API."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ErrorCode(StrEnum):
    UNAUTHORIZED = "UNAUTHORIZED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
    PROVIDER_INVALID_RESPONSE = "PROVIDER_INVALID_RESPONSE"


class ErrorDetail(StrictModel):
    field: str
    issue: str


class ErrorBody(StrictModel):
    code: ErrorCode
    message: Annotated[str, Field(min_length=1, max_length=300)]
    retryable: bool
    request_id: Annotated[str | None, Field(alias="requestId", max_length=100)] = None
    details: list[ErrorDetail] = Field(default_factory=list)


class AiErrorResponse(StrictModel):
    error: ErrorBody
