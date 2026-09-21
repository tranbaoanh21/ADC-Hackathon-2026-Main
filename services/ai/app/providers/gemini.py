"""Gemini adapter with in-memory preprocessing and strict output validation."""

from __future__ import annotations

import asyncio
import io
import json
from collections.abc import Awaitable, Callable, Mapping
from time import perf_counter
from typing import Any, Protocol

from google import genai
from google.genai import types
from PIL import Image, ImageOps
from pydantic import ValidationError

from app.providers.base import (
    PerceptionInput,
    ProviderInvalidResponseError,
    ProviderUnavailableError,
    ValidatedFrame,
)
from app.providers.prompt import PROMPT_VERSION, SYSTEM_INSTRUCTION, build_user_prompt
from app.schemas.perception import PerceptionEvidence

MAX_IMAGE_EDGE = 1024
JPEG_QUALITY = 85


class GeminiModelsClient(Protocol):
    async def generate_content(
        self, *, model: str, contents: Any, config: Any
    ) -> Any: ...


def _prepare_frame(frame: ValidatedFrame) -> bytes:
    with Image.open(io.BytesIO(frame.data)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return output.getvalue()


class GeminiPerceptionProvider:
    def __init__(
        self,
        *,
        client: GeminiModelsClient,
        model_id: str,
        close_callback: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        self._client = client
        self._model_id = model_id
        self._close_callback = close_callback

    async def analyze(self, request: PerceptionInput) -> Mapping[str, Any]:
        started = perf_counter()
        try:
            prepared_frames = await asyncio.gather(
                *(asyncio.to_thread(_prepare_frame, frame) for frame in request.frames)
            )
        except Exception as exc:
            raise ProviderInvalidResponseError from exc

        parts = [
            types.Part.from_text(
                text=build_user_prompt(
                    locale=request.locale,
                    analysis_mode=request.analysis_mode,
                    frame_count=len(prepared_frames),
                )
            ),
            *(
                types.Part.from_bytes(data=data, mime_type="image/jpeg")
                for data in prepared_frames
            ),
        ]
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0,
            response_mime_type="application/json",
            response_json_schema=PerceptionEvidence.model_json_schema(by_alias=True),
        )

        try:
            response = await self._client.generate_content(
                model=self._model_id,
                contents=[types.Content(role="user", parts=parts)],
                config=config,
            )
        except Exception as exc:
            raise ProviderUnavailableError from exc

        try:
            response_text = getattr(response, "text", None)
        except Exception as exc:
            raise ProviderInvalidResponseError from exc
        if not isinstance(response_text, str) or not response_text.strip():
            raise ProviderInvalidResponseError
        try:
            raw_evidence = json.loads(response_text)
            evidence = PerceptionEvidence.model_validate(raw_evidence)
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise ProviderInvalidResponseError from exc

        result = evidence.model_dump(by_alias=True, exclude_none=True, mode="json")
        result.update(
            {
                "schemaVersion": "1.0",
                "requestId": request.request_id,
                "model": {
                    "provider": "gemini",
                    "modelId": self._model_id,
                    "promptVersion": PROMPT_VERSION,
                },
                "processingTimeMs": max(0, round((perf_counter() - started) * 1000)),
            }
        )
        return result

    async def aclose(self) -> None:
        if self._close_callback is not None:
            await self._close_callback()


def create_gemini_provider(*, api_key: str, model_id: str) -> GeminiPerceptionProvider:
    async_client = genai.Client(api_key=api_key).aio
    return GeminiPerceptionProvider(
        client=async_client.models,
        model_id=model_id,
        close_callback=async_client.aclose,
    )
