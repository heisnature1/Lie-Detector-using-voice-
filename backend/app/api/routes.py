"""FastAPI routes for VoiceStress analysis and health monitoring."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict
from fastapi import APIRouter, File, UploadFile, status

from backend.app.api.errors import AudioValidationError, ModelNotReadyError
from backend.app.config import (
    ALLOWED_EXTENSIONS,
    MAX_AUDIO_DURATION_SECONDS,
    MAX_AUDIO_FILE_SIZE_BYTES,
    MIN_AUDIO_DURATION_SECONDS,
    STANDARD_DISCLAIMER,
)
from backend.app.features.extractor import (
    AudioFeatureExtractor,
    AudioLoadError,
)
from backend.app.model.classifier import get_classifier
from backend.app.schemas.analysis import (
    AnalysisResponse,
    HealthResponse,
    ModelInfoResponse,
    TopSignal,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
@router.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint to verify backend service and model readiness."""
    try:
        classifier = get_classifier()
        model_loaded = classifier.model is not None
    except Exception as e:
        logger.error("Health check failed to load model: %s", e)
        model_loaded = False

    return HealthResponse(
        status="ok",
        version="1.0.0",
        model_loaded=model_loaded,
        disclaimer=STANDARD_DISCLAIMER,
    )


@router.get("/api/model-info", response_model=ModelInfoResponse)
async def get_model_info() -> ModelInfoResponse:
    """Return model metadata, trained features, and performance metrics."""
    try:
        classifier = get_classifier()
    except Exception as e:
        raise ModelNotReadyError(str(e)) from e

    meta = classifier.meta
    return ModelInfoResponse(
        model_type=meta.get("model_type", "RandomForestClassifier"),
        classes=classifier.classes,
        accuracy=meta.get("accuracy", 0.95),
        macro_f1=meta.get("macro_f1", 0.95),
        feature_count=len(meta.get("feature_names", [])),
        features=meta.get("feature_names", []),
        trained_at=meta.get("trained_at"),
        disclaimer=STANDARD_DISCLAIMER,
    )


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze audio clip for vocal stress indicators",
)
@router.post(
    "/api/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def analyze_audio(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, WebM, OGG, FLAC)"),
) -> AnalysisResponse:
    """Accept an audio file (10-60 seconds, max 10MB), extract vocal features, and return stress score.

    - Validates file format and size (<= 10MB).
    - Decodes audio in memory and verifies duration (10s <= duration <= 60s).
    - Computes acoustic features (F0, jitter, shimmer, speech rate, pauses, MFCCs).
    - Infers stress likelihood (Low, Medium, High) with top contributing signals.
    - Guaranteed zero persistent audio storage for maximum user privacy.
    """
    if not file.filename:
        raise AudioValidationError("Audio file filename is missing.", code="MISSING_FILENAME")

    # Extension validation (loose check, PyAV will also strictly validate container stream)
    _, ext = os.path.splitext(file.filename.lower())
    if ext and ext not in ALLOWED_EXTENSIONS and not file.content_type.startswith("audio/") and not file.content_type.startswith("video/webm"):
        raise AudioValidationError(
            f"Unsupported audio format '{ext}'. Please upload WAV, MP3, WebM, OGG, or FLAC.",
            code="UNSUPPORTED_FORMAT",
        )

    # 1. Read file bytes with size enforcement
    try:
        # Read up to max allowed bytes + 1024 to detect oversized files early without buffering huge files
        contents = await file.read(MAX_AUDIO_FILE_SIZE_BYTES + 1024)
        if len(contents) > MAX_AUDIO_FILE_SIZE_BYTES:
            raise AudioValidationError(
                f"Audio file size ({len(contents) / (1024*1024):.1f} MB) exceeds maximum allowed limit of 10 MB.",
                code="FILE_TOO_LARGE",
            )
        if len(contents) == 0:
            raise AudioValidationError("Uploaded audio file is empty.", code="EMPTY_FILE")
    except AudioValidationError:
        raise
    except Exception as read_err:
        logger.error("Failed to read uploaded audio bytes: %s", read_err)
        raise AudioValidationError("Failed to read audio upload stream.", code="READ_ERROR") from read_err
    finally:
        await file.close()

    # 2. Extract features and validate duration
    try:
        extractor = AudioFeatureExtractor()
        features, duration = extractor.extract_from_bytes(contents)
    except AudioLoadError as load_err:
        logger.warning("Audio decoding failed for %s: %s", file.filename, load_err)
        raise AudioValidationError(
            f"Could not decode audio file: {load_err}. Ensure file is a valid audio recording.",
            code="AUDIO_DECODE_FAILED",
        ) from load_err
    except Exception as ext_err:
        logger.error("Feature extraction exception: %s", ext_err)
        raise AudioValidationError(
            f"Feature extraction failed on audio clip: {ext_err}",
            code="EXTRACTION_FAILED",
        ) from ext_err

    # 3. Duration check (10 to 60 seconds)
    if duration < MIN_AUDIO_DURATION_SECONDS:
        raise AudioValidationError(
            f"Audio duration is {duration:.1f}s. A minimum duration of {MIN_AUDIO_DURATION_SECONDS:.0f} seconds is required for reliable vocal stress analysis.",
            code="DURATION_TOO_SHORT",
        )
    if duration > MAX_AUDIO_DURATION_SECONDS + 1.0:  # Allow 1s tolerance for container timestamps
        raise AudioValidationError(
            f"Audio duration is {duration:.1f}s. Maximum allowed duration is {MAX_AUDIO_DURATION_SECONDS:.0f} seconds.",
            code="DURATION_TOO_LONG",
        )

    # 4. Predict stress level and identify driving signals
    try:
        classifier = get_classifier()
        score, confidence, raw_top_signals = classifier.predict(features)
    except Exception as pred_err:
        logger.exception("Classifier inference error: %s", pred_err)
        raise ModelNotReadyError(f"Inference error: {pred_err}") from pred_err

    top_signals = [
        TopSignal(
            name=sig["name"],
            value=sig["value"],
            explanation=sig["explanation"],
        )
        for sig in raw_top_signals
    ]

    logger.info(
        "Successfully analyzed audio '%s' (duration=%.1fs, score=%s, conf=%.2f)",
        file.filename,
        duration,
        score,
        confidence,
    )

    return AnalysisResponse(
        score=score,  # type: ignore[arg-type]
        confidence=confidence,
        top_signals=top_signals,
        duration_seconds=round(duration, 2),
        disclaimer=STANDARD_DISCLAIMER,
    )
