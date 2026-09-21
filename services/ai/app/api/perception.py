"""Internal perception endpoint and request-boundary validation."""

from __future__ import annotations

import hmac
import io
import warnings
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.config import Settings
from app.main_types import ApiError
from app.providers.base import (
    PerceptionInput,
    ProviderInvalidResponseError,
    ProviderUnavailableError,
    ValidatedFrame,
)
from app.schemas.errors import ErrorCode, ErrorDetail
from app.schemas.perception import PerceptionRequestMetadata, PerceptionResponse
from app.services.perception import (
    PerceptionService,
    ProviderTimeoutError,
)

router = APIRouter(prefix="/internal/v1")
bearer = HTTPBearer(auto_error=False)
ALLOWED_FIELDS = {"requestId", "locale", "analysisMode", "frames"}
ALLOWED_CONTENT_TYPES = {"image/jpeg": "JPEG", "image/png": "PNG"}


async def require_internal_token(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    settings: Settings = request.app.state.settings
    supplied = credentials.credentials if credentials else ""
    valid = bool(settings.internal_service_token) and bool(credentials)
    if credentials and credentials.scheme.lower() != "bearer":
        valid = False
    if valid:
        valid = hmac.compare_digest(supplied, settings.internal_service_token)
    if not valid:
        raise ApiError(
            status_code=401,
            code=ErrorCode.UNAUTHORIZED,
            message="Missing or invalid internal service credential.",
            retryable=False,
        )


def _validation_details(exc: ValidationError) -> list[ErrorDetail]:
    details: list[ErrorDetail] = []
    for error in exc.errors(include_url=False, include_input=False):
        location = ".".join(str(part) for part in error["loc"])
        details.append(ErrorDetail(field=location, issue=error["msg"]))
    return details


def _enforce_content_length(request: Request, settings: Settings) -> None:
    raw_length = request.headers.get("content-length")
    if not raw_length:
        return
    try:
        content_length = int(raw_length)
    except ValueError as exc:
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            details=[
                ErrorDetail(
                    field="content-length",
                    issue="Header must be an integer.",
                )
            ],
        ) from exc
    if content_length > settings.max_request_bytes:
        raise ApiError(
            status_code=413,
            code=ErrorCode.PAYLOAD_TOO_LARGE,
            message="Perception request exceeds configured limits.",
            retryable=False,
            details=[
                ErrorDetail(
                    field="body",
                    issue="Configured request byte limit was exceeded.",
                )
            ],
        )


async def _parse_form(
    request: Request,
) -> tuple[PerceptionRequestMetadata, list[UploadFile]]:
    content_type = request.headers.get("content-type", "")
    if not content_type.lower().startswith("multipart/form-data"):
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            details=[
                ErrorDetail(
                    field="content-type", issue="multipart/form-data is required."
                )
            ],
        )

    try:
        form = await request.form()
    except Exception as exc:
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            details=[ErrorDetail(field="body", issue="Malformed multipart body.")],
        ) from exc

    grouped: dict[str, list[Any]] = {}
    for key, value in form.multi_items():
        grouped.setdefault(key, []).append(value)

    unknown = sorted(set(grouped) - ALLOWED_FIELDS)
    if unknown:
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            details=[
                ErrorDetail(field=field, issue="Unexpected multipart field.")
                for field in unknown
            ],
        )

    request_id = grouped.get("requestId", [None])[0]
    request_id_for_error = (
        request_id
        if isinstance(request_id, str) and 0 < len(request_id) <= 100
        else None
    )

    metadata_values: dict[str, Any] = {}
    for field in ("requestId", "locale", "analysisMode"):
        values = grouped.get(field, [])
        if len(values) != 1 or not isinstance(values[0], str):
            issue = (
                "This field is required."
                if not values
                else "Exactly one text value is required."
            )
            raise ApiError(
                status_code=422,
                code=ErrorCode.VALIDATION_ERROR,
                message="Perception request is invalid.",
                retryable=False,
                request_id=request_id_for_error,
                details=[ErrorDetail(field=field, issue=issue)],
            )
        metadata_values[field] = values[0]

    try:
        metadata = PerceptionRequestMetadata.model_validate(metadata_values)
    except ValidationError as exc:
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            request_id=request_id_for_error,
            details=_validation_details(exc),
        ) from exc

    frame_values = grouped.get("frames", [])
    if not frame_values:
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            request_id=metadata.request_id,
            details=[
                ErrorDetail(
                    field="frames",
                    issue="Between one and three JPEG or PNG frames are required.",
                )
            ],
        )
    if len(frame_values) > 3:
        raise ApiError(
            status_code=413,
            code=ErrorCode.PAYLOAD_TOO_LARGE,
            message="Perception request exceeds configured limits.",
            retryable=False,
            request_id=metadata.request_id,
            details=[
                ErrorDetail(field="frames", issue="At most three frames are allowed.")
            ],
        )
    if not all(isinstance(value, StarletteUploadFile) for value in frame_values):
        raise ApiError(
            status_code=422,
            code=ErrorCode.VALIDATION_ERROR,
            message="Perception request is invalid.",
            retryable=False,
            request_id=metadata.request_id,
            details=[ErrorDetail(field="frames", issue="Every frame must be a file.")],
        )
    return metadata, frame_values


def _verify_image(data: bytes, content_type: str) -> bool:
    expected_format = ALLOWED_CONTENT_TYPES[content_type]
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format != expected_format:
                    return False
                image.verify()
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        return False
    return True


async def _read_frames(
    uploads: list[UploadFile],
    metadata: PerceptionRequestMetadata,
    settings: Settings,
) -> tuple[ValidatedFrame, ...]:
    total_bytes = sum(
        len(value.encode("utf-8"))
        for value in (
            metadata.request_id,
            metadata.locale,
            metadata.analysis_mode.value,
        )
    )
    validated: list[ValidatedFrame] = []

    for index, upload in enumerate(uploads):
        content_type = (upload.content_type or "").lower()
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ApiError(
                status_code=422,
                code=ErrorCode.VALIDATION_ERROR,
                message="Perception request is invalid.",
                retryable=False,
                request_id=metadata.request_id,
                details=[
                    ErrorDetail(
                        field=f"frames.{index}",
                        issue="Only image/jpeg and image/png are accepted.",
                    )
                ],
            )

        chunks: list[bytes] = []
        frame_bytes = 0
        while chunk := await upload.read(64 * 1024):
            frame_bytes += len(chunk)
            total_bytes += len(chunk)
            if (
                frame_bytes > settings.max_frame_bytes
                or total_bytes > settings.max_request_bytes
            ):
                raise ApiError(
                    status_code=413,
                    code=ErrorCode.PAYLOAD_TOO_LARGE,
                    message="Perception request exceeds configured limits.",
                    retryable=False,
                    request_id=metadata.request_id,
                    details=[
                        ErrorDetail(
                            field=f"frames.{index}",
                            issue="Configured byte limit was exceeded.",
                        )
                    ],
                )
            chunks.append(chunk)

        data = b"".join(chunks)
        if not data or not _verify_image(data, content_type):
            raise ApiError(
                status_code=422,
                code=ErrorCode.VALIDATION_ERROR,
                message="Perception request is invalid.",
                retryable=False,
                request_id=metadata.request_id,
                details=[
                    ErrorDetail(
                        field=f"frames.{index}",
                        issue=(
                            "File bytes are not a valid image matching the declared "
                            "type."
                        ),
                    )
                ],
            )
        validated.append(ValidatedFrame(content_type=content_type, data=data))
    return tuple(validated)


@router.post(
    "/perception",
    response_model=PerceptionResponse,
    response_model_by_alias=True,
    response_model_exclude_none=True,
    dependencies=[Depends(require_internal_token)],
)
async def create_perception(request: Request) -> PerceptionResponse:
    settings: Settings = request.app.state.settings
    _enforce_content_length(request, settings)
    metadata, uploads = await _parse_form(request)
    frames = await _read_frames(uploads, metadata, settings)
    provider_request = PerceptionInput(
        request_id=metadata.request_id,
        locale=metadata.locale,
        analysis_mode=metadata.analysis_mode,
        frames=frames,
    )
    service: PerceptionService = request.app.state.perception_service
    try:
        return await service.analyze(provider_request)
    except ProviderUnavailableError as exc:
        raise ApiError(
            status_code=503,
            code=ErrorCode.PROVIDER_UNAVAILABLE,
            message="The configured vision provider is temporarily unavailable.",
            retryable=True,
            request_id=metadata.request_id,
        ) from exc
    except ProviderTimeoutError as exc:
        raise ApiError(
            status_code=504,
            code=ErrorCode.PROVIDER_TIMEOUT,
            message="The configured vision provider timed out.",
            retryable=True,
            request_id=metadata.request_id,
        ) from exc
    except ProviderInvalidResponseError as exc:
        raise ApiError(
            status_code=503,
            code=ErrorCode.PROVIDER_INVALID_RESPONSE,
            message="The configured vision provider returned an invalid response.",
            retryable=True,
            request_id=metadata.request_id,
        ) from exc
