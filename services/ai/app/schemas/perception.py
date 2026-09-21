"""Strict schemas derived from contracts/ai-service.openapi.yaml v1.1.0."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator


def _require_non_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("String must not be empty or whitespace-only")
    return value


NonBlank20 = Annotated[
    str, Field(min_length=1, max_length=20), AfterValidator(_require_non_blank)
]
NonBlank50 = Annotated[
    str, Field(min_length=1, max_length=50), AfterValidator(_require_non_blank)
]
NonBlank100 = Annotated[
    str, Field(min_length=1, max_length=100), AfterValidator(_require_non_blank)
]
NonBlank150 = Annotated[
    str, Field(min_length=1, max_length=150), AfterValidator(_require_non_blank)
]
NonBlank200 = Annotated[
    str, Field(min_length=1, max_length=200), AfterValidator(_require_non_blank)
]
NonBlank300 = Annotated[
    str, Field(min_length=1, max_length=300), AfterValidator(_require_non_blank)
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class AnalysisMode(StrEnum):
    LANDMARK_DISCOVERY = "LANDMARK_DISCOVERY"
    LANDMARK_OBSERVATION = "LANDMARK_OBSERVATION"


class FrameQuality(StrEnum):
    USABLE = "USABLE"
    BLURRY = "BLURRY"
    TOO_DARK = "TOO_DARK"
    OBSTRUCTED = "OBSTRUCTED"
    UNREADABLE = "UNREADABLE"


class SceneType(StrEnum):
    RECEPTION = "RECEPTION"
    ELEVATOR_AREA = "ELEVATOR_AREA"
    CORRIDOR = "CORRIDOR"
    ROOM_ENTRANCE = "ROOM_ENTRANCE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class LandmarkType(StrEnum):
    SIGN = "SIGN"
    ROOM_ENTRANCE = "ROOM_ENTRANCE"
    RECEPTION = "RECEPTION"
    CHECK_IN_GATE = "CHECK_IN_GATE"
    ELEVATOR_AREA = "ELEVATOR_AREA"
    CORRIDOR_MARKER = "CORRIDOR_MARKER"
    RESTROOM = "RESTROOM"
    MEETING_ROOM = "MEETING_ROOM"
    CANTEEN = "CANTEEN"
    OTHER = "OTHER"


class PerceptionRequestMetadata(StrictModel):
    request_id: Annotated[NonBlank100, Field(alias="requestId")]
    locale: NonBlank20
    analysis_mode: Annotated[AnalysisMode, Field(alias="analysisMode")]


class LandmarkCandidate(StrictModel):
    proposed_name: Annotated[NonBlank100, Field(alias="proposedName")]
    type: LandmarkType
    visible_text: Annotated[
        list[NonBlank100],
        Field(alias="visibleText", max_length=10),
    ]
    stable_features: Annotated[
        list[NonBlank150],
        Field(alias="stableFeatures", max_length=10),
    ]
    draft_description: Annotated[NonBlank300, Field(alias="draftDescription")]
    transient_features: Annotated[
        list[NonBlank150] | None,
        Field(alias="transientFeatures", max_length=10),
    ] = None

    @model_validator(mode="after")
    def require_identity_evidence(self) -> LandmarkCandidate:
        if not self.visible_text and not self.stable_features:
            raise ValueError(
                "A landmark candidate requires visibleText or stableFeatures"
            )
        return self


class ModelMetadata(StrictModel):
    provider: NonBlank50
    model_id: Annotated[NonBlank100, Field(alias="modelId")]
    prompt_version: Annotated[NonBlank50, Field(alias="promptVersion")]


class PerceptionEvidence(StrictModel):
    """Provider-generated fields constrained by AI-service v1.1."""

    frame_quality: Annotated[FrameQuality, Field(alias="frameQuality")]
    detected_text: Annotated[
        list[NonBlank150],
        Field(alias="detectedText", max_length=20),
    ]
    scene_type: Annotated[SceneType, Field(alias="sceneType")]
    landmark_candidates: Annotated[
        list[LandmarkCandidate], Field(alias="landmarkCandidates", max_length=3)
    ]
    uncertainty_reasons: Annotated[
        list[NonBlank200],
        Field(alias="uncertaintyReasons", max_length=10),
    ]

    @model_validator(mode="after")
    def require_safe_low_quality_output(self) -> PerceptionEvidence:
        unusable_qualities = {
            FrameQuality.TOO_DARK,
            FrameQuality.OBSTRUCTED,
            FrameQuality.UNREADABLE,
        }
        if self.frame_quality in unusable_qualities:
            if self.landmark_candidates:
                raise ValueError(
                    "landmarkCandidates must be empty when frameQuality is "
                    f"{self.frame_quality.value}"
                )
            if not self.uncertainty_reasons:
                raise ValueError(
                    "uncertaintyReasons are required when frameQuality is "
                    f"{self.frame_quality.value}"
                )
        if self.frame_quality is FrameQuality.BLURRY and not self.uncertainty_reasons:
            raise ValueError(
                "uncertaintyReasons are required when frameQuality is BLURRY"
            )
        return self


class PerceptionResponse(PerceptionEvidence):
    schema_version: Annotated[Literal["1.0"], Field(alias="schemaVersion")]
    request_id: Annotated[str, Field(alias="requestId", min_length=1, max_length=100)]
    model: ModelMetadata
    processing_time_ms: Annotated[int, Field(alias="processingTimeMs", ge=0)]
