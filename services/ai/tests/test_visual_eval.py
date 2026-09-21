from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.trigger_keyframes import (
    FrameCandidate,
    cosine_similarity,
    load_triggers,
    select_keyframes,
)
from scripts.visual_eval import evaluate_success, expected_for_observation


def test_visual_eval_rejects_product_decisions_and_transient_identity() -> None:
    body = {
        "landmarkCandidates": [
            {
                "proposedName": "Person holding a mug",
                "stableFeatures": ["A chair beside the person"],
            }
        ],
        "shouldAdvance": True,
    }
    failures = evaluate_success(
        body,
        {
            "maxLandmarkCandidates": 3,
            "forbiddenTopLevelKeys": ["shouldAdvance"],
            "forbiddenCandidateTerms": ["person", "mug", "chair"],
        },
    )

    assert "forbidden top-level keys: shouldAdvance" in failures
    assert "candidate identity uses forbidden term: person" in failures
    assert "candidate identity uses forbidden term: mug" in failures
    assert "candidate identity uses forbidden term: chair" in failures


def test_visual_eval_accepts_supported_landmark_evidence() -> None:
    body = {
        "landmarkCandidates": [
            {
                "proposedName": "Elevator Level 2",
                "stableFeatures": [
                    "Permanent LEVEL 2 sign beside the elevator and command panel"
                ],
            }
        ]
    }

    failures = evaluate_success(
        body,
        {
            "maxLandmarkCandidates": 3,
            "forbiddenTopLevelKeys": ["shouldAdvance"],
            "forbiddenCandidateTerms": ["person", "mug", "chair"],
        },
    )

    assert failures == []


def test_visual_eval_applies_observation_specific_expectations() -> None:
    case = {
        "expected": {"maxLandmarkCandidates": 3},
        "observationExpectations": [
            {
                "minLandmarkCandidates": 1,
                "allowedSceneTypes": ["RECEPTION"],
                "requiredDetectedTextAny": ["eispaces"],
                "requiredCandidateTypesAny": ["RECEPTION"],
            },
            {"expectNoCandidates": True},
        ],
    }

    first = expected_for_observation(case, 1)
    second = expected_for_observation(case, 2)

    assert first["maxLandmarkCandidates"] == 3
    assert first["allowedSceneTypes"] == ["RECEPTION"]
    assert second == {"maxLandmarkCandidates": 3, "expectNoCandidates": True}


def test_visual_eval_rejects_generic_candidate_when_none_is_expected() -> None:
    failures = evaluate_success(
        {
            "sceneType": "CORRIDOR",
            "detectedText": [],
            "landmarkCandidates": [
                {
                    "proposedName": "Generic office corridor",
                    "type": "CORRIDOR_MARKER",
                    "stableFeatures": ["Grey floor and white walls"],
                }
            ],
        },
        {"expectNoCandidates": True},
    )

    assert "landmarkCandidates must be empty for this observation" in failures


def _candidate(
    *,
    name: str,
    timestamp_ms: int,
    descriptor: tuple[float, ...],
    brightness: float = 128.0,
    sharpness: float = 100.0,
    quality_score: float = 100.0,
) -> FrameCandidate:
    return FrameCandidate(
        path=Path(name),
        timestamp_ms=timestamp_ms,
        brightness=brightness,
        sharpness=sharpness,
        quality_score=quality_score,
        descriptor=descriptor,
    )


def test_cosine_similarity_handles_identical_and_distinct_frames() -> None:
    assert cosine_similarity((1.0, 0.0), (1.0, 0.0)) == pytest.approx(1.0)
    assert cosine_similarity((1.0, 0.0), (0.0, 1.0)) == pytest.approx(0.0)


def test_trigger_selection_keeps_sharper_duplicate_and_novel_frame() -> None:
    selection = select_keyframes(
        [
            _candidate(
                name="early.jpg",
                timestamp_ms=4000,
                descriptor=(1.0, 0.0),
                quality_score=80.0,
            ),
            _candidate(
                name="sharp.jpg",
                timestamp_ms=4500,
                descriptor=(0.999, 0.01),
                quality_score=120.0,
            ),
            _candidate(
                name="novel.jpg",
                timestamp_ms=5000,
                descriptor=(0.0, 1.0),
                quality_score=90.0,
            ),
        ],
        cosine_threshold=0.98,
    )

    assert [frame.path.name for frame in selection.selected] == [
        "sharp.jpg",
        "novel.jpg",
    ]
    assert selection.duplicate_rejected == 1
    assert selection.quality_rejected == 0
    assert selection.used_quality_fallback is False


def test_trigger_selection_uses_best_fallback_when_all_frames_fail_quality() -> None:
    selection = select_keyframes(
        [
            _candidate(
                name="dark.jpg",
                timestamp_ms=1000,
                descriptor=(1.0, 0.0),
                brightness=5.0,
                quality_score=10.0,
            ),
            _candidate(
                name="blurred.jpg",
                timestamp_ms=1200,
                descriptor=(0.0, 1.0),
                sharpness=1.0,
                quality_score=20.0,
            ),
        ]
    )

    assert [frame.path.name for frame in selection.selected] == ["blurred.jpg"]
    assert selection.quality_rejected == 2
    assert selection.used_quality_fallback is True


def test_trigger_selection_always_includes_frame_nearest_trigger() -> None:
    selection = select_keyframes(
        [
            _candidate(
                name="high-quality-before.jpg",
                timestamp_ms=4000,
                descriptor=(1.0, 0.0, 0.0),
                quality_score=200.0,
            ),
            _candidate(
                name="trigger.jpg",
                timestamp_ms=5000,
                descriptor=(0.0, 1.0, 0.0),
                quality_score=30.0,
            ),
            _candidate(
                name="high-quality-after.jpg",
                timestamp_ms=6000,
                descriptor=(0.0, 0.0, 1.0),
                quality_score=190.0,
            ),
        ],
        target_timestamp_ms=5000,
        max_frames=2,
    )

    assert [frame.path.name for frame in selection.selected] == [
        "high-quality-before.jpg",
        "trigger.jpg",
    ]


def test_trigger_manifest_is_sorted_and_rejects_duplicate_ids(tmp_path: Path) -> None:
    valid_path = tmp_path / "valid.json"
    valid_path.write_text(
        json.dumps(
            {
                "schemaVersion": "1.0",
                "sessionId": "learn-001",
                "triggers": [
                    {"triggerId": "later", "timestampMs": 2000},
                    {"triggerId": "earlier", "timestampMs": 1000},
                ],
            }
        ),
        encoding="utf-8",
    )

    session_id, triggers = load_triggers(valid_path)

    assert session_id == "learn-001"
    assert [trigger.trigger_id for trigger in triggers] == ["earlier", "later"]

    duplicate_path = tmp_path / "duplicate.json"
    duplicate_path.write_text(
        json.dumps(
            {
                "schemaVersion": "1.0",
                "sessionId": "learn-001",
                "triggers": [
                    {"triggerId": "same", "timestampMs": 1000},
                    {"triggerId": "same", "timestampMs": 2000},
                ],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="Duplicate triggerId"):
        load_triggers(duplicate_path)
