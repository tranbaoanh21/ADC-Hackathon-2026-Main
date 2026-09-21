"""Pydantic schemas for the AI-service v1.1 boundary."""

from app.schemas.errors import AiErrorResponse, ErrorCode, ErrorDetail
from app.schemas.perception import (
    AnalysisMode,
    FrameQuality,
    LandmarkCandidate,
    LandmarkType,
    ModelMetadata,
    PerceptionEvidence,
    PerceptionRequestMetadata,
    PerceptionResponse,
    SceneType,
)

__all__ = [
    "AiErrorResponse",
    "AnalysisMode",
    "ErrorCode",
    "ErrorDetail",
    "FrameQuality",
    "LandmarkCandidate",
    "LandmarkType",
    "ModelMetadata",
    "PerceptionEvidence",
    "PerceptionRequestMetadata",
    "PerceptionResponse",
    "SceneType",
]
