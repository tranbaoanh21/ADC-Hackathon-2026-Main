"""Deterministic provider used before live Gemini integration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.providers.base import PerceptionInput


class MockPerceptionProvider:
    async def analyze(self, request: PerceptionInput) -> Mapping[str, Any]:
        return {
            "schemaVersion": "1.0",
            "requestId": request.request_id,
            "frameQuality": "USABLE",
            "detectedText": ["LEVEL 2"],
            "sceneType": "ELEVATOR_AREA",
            "landmarkCandidates": [
                {
                    "proposedName": "Elevator Level 2",
                    "type": "ELEVATOR_AREA",
                    "visibleText": ["LEVEL 2"],
                    "stableFeatures": ["Level 2 sign beside the elevator"],
                    "draftDescription": "Khu vực thang máy có biển LEVEL 2.",
                    "transientFeatures": [],
                }
            ],
            "uncertaintyReasons": [],
            "model": {
                "provider": "mock",
                "modelId": "mock-landmark-perception-v1",
                "promptVersion": "landmark-perception-v1",
            },
            "processingTimeMs": 0,
        }
