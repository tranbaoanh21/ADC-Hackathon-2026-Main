from __future__ import annotations

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
