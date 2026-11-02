"""Error classes and HTTP exception handlers for VoiceStress API."""

from __future__ import annotations

import logging
from typing import Any, Dict
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AudioValidationError(Exception):
    """Raised when uploaded audio fails format, size, or duration validation."""

    def __init__(self, message: str, code: str = "AUDIO_VALIDATION_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class ModelNotReadyError(Exception):
    """Raised when the ML model artifacts cannot be loaded."""

    def __init__(self, message: str = "Stress classification model is not available.") -> None:
        super().__init__(message)
        self.message = message
        self.code = "MODEL_NOT_READY"


async def audio_validation_exception_handler(
    request: Request, exc: AudioValidationError
) -> JSONResponse:
    """Handle AudioValidationError with HTTP 400 Bad Request."""
    logger.warning("Audio validation failed on %s: %s (%s)", request.url.path, exc.message, exc.code)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "AudioValidationError",
            "detail": exc.message,
            "code": exc.code,
        },
    )


async def model_not_ready_exception_handler(
    request: Request, exc: ModelNotReadyError
) -> JSONResponse:
    """Handle ModelNotReadyError with HTTP 503 Service Unavailable."""
    logger.error("Model not ready on %s: %s", request.url.path, exc.message)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "ModelNotReadyError",
            "detail": exc.message,
            "code": exc.code,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exception handler with HTTP 500 Internal Server Error."""
    logger.exception("Unhandled server error processing request to %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "detail": "An unexpected error occurred while processing the audio analysis request.",
            "code": "INTERNAL_SERVER_ERROR",
        },
    )
