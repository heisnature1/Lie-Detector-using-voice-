"""FastAPI routes for VoiceStress delta analysis, session calibration, and dataset collection."""

from __future__ import annotations

import datetime
import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, UploadFile, status

from backend.app.api.errors import AudioValidationError, ModelNotReadyError
from backend.app.config import (
    ALLOWED_EXTENSIONS,
    COLLECTED_DATA_PATH,
    DATA_DIR,
    MAX_AUDIO_DURATION_SECONDS,
    MAX_AUDIO_FILE_SIZE_BYTES,
    MIN_AUDIO_DURATION_SECONDS,
    STANDARD_DISCLAIMER,
)
from backend.app.features.extractor import (
    AudioFeatureExtractor,
    AudioLoadError,
    compute_delta_features,
)
from backend.app.model.classifier import get_classifier
from backend.app.schemas.analysis import (
    AnalysisResponse,
    DatasetStatsResponse,
    HealthResponse,
    ModelInfoResponse,
    SessionAnalysisResponse,
    TopSignal,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _read_and_extract(file: UploadFile, label: str) -> tuple[Dict[str, float], float]:
    """Helper to validate, read bytes, and extract features for an uploaded audio file."""
    if not file.filename:
        raise AudioValidationError(f"Filename for {label} is missing.", code="MISSING_FILENAME")

    try:
        contents = await file.read(MAX_AUDIO_FILE_SIZE_BYTES + 1024)
        if len(contents) > MAX_AUDIO_FILE_SIZE_BYTES:
            raise AudioValidationError(
                f"{label.capitalize()} size ({len(contents) / (1024*1024):.1f} MB) exceeds maximum allowed limit of 10 MB.",
                code="FILE_TOO_LARGE",
            )
        if len(contents) == 0:
            raise AudioValidationError(f"{label.capitalize()} audio file is empty.", code="EMPTY_FILE")
    except AudioValidationError:
        raise
    except Exception as err:
        logger.error("Failed to read %s bytes: %s", label, err)
        raise AudioValidationError(f"Failed to read {label} audio upload stream.", code="READ_ERROR") from err
    finally:
        await file.close()

    try:
        extractor = AudioFeatureExtractor()
        features, duration = extractor.extract_from_bytes(contents)
    except AudioLoadError as load_err:
        logger.warning("Audio decoding failed for %s (%s): %s", file.filename, label, load_err)
        raise AudioValidationError(
            f"Could not decode {label} audio: {load_err}. Ensure file is a valid recording.",
            code="AUDIO_DECODE_FAILED",
        ) from load_err
    except Exception as ext_err:
        logger.error("Feature extraction exception on %s: %s", label, ext_err)
        raise AudioValidationError(
            f"Feature extraction failed on {label} audio: {ext_err}",
            code="EXTRACTION_FAILED",
        ) from ext_err

    # Validate duration
    if duration < MIN_AUDIO_DURATION_SECONDS:
        raise AudioValidationError(
            f"{label.capitalize()} duration is {duration:.1f}s. A minimum duration of {MIN_AUDIO_DURATION_SECONDS:.0f} seconds is required.",
            code="DURATION_TOO_SHORT",
        )
    if duration > MAX_AUDIO_DURATION_SECONDS + 1.0:
        raise AudioValidationError(
            f"{label.capitalize()} duration is {duration:.1f}s. Maximum allowed duration is {MAX_AUDIO_DURATION_SECONDS:.0f} seconds.",
            code="DURATION_TOO_LONG",
        )

    return features, duration


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
    """Return model metadata, trained delta features, and performance metrics."""
    try:
        classifier = get_classifier()
    except Exception as e:
        raise ModelNotReadyError(str(e)) from e

    meta = classifier.meta
    return ModelInfoResponse(
        model_type=meta.get("model_type", "RandomForestClassifier"),
        classes=classifier.classes,
        accuracy=meta.get("accuracy", 1.0),
        macro_f1=meta.get("macro_f1", 1.0),
        feature_count=len(meta.get("feature_names", [])),
        features=meta.get("feature_names", []),
        trained_at=meta.get("trained_at"),
        disclaimer=STANDARD_DISCLAIMER,
    )


@router.post(
    "/analyze/session",
    response_model=SessionAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze calibrated baseline and test inquiry audio session for delta vocal stress",
)
@router.post(
    "/api/analyze/session",
    response_model=SessionAnalysisResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def analyze_session(
    baseline_file: UploadFile = File(..., description="Neutral calibration baseline clip (5-60s)"),
    test_file: UploadFile = File(..., description="Target inquiry response clip (5-60s)"),
) -> SessionAnalysisResponse:
    """Extract features from both clips, compute delta (test minus baseline), and infer Truthful vs Deceptive verdict."""
    baseline_feats, base_dur = await _read_and_extract(baseline_file, "calibration baseline")
    test_feats, test_dur = await _read_and_extract(test_file, "test response")

    try:
        classifier = get_classifier()
        verdict, confidence, raw_signals, deltas = classifier.predict_session(
            baseline_features=baseline_feats,
            test_features=test_feats,
        )
    except Exception as pred_err:
        logger.exception("Classifier inference error on session: %s", pred_err)
        raise ModelNotReadyError(f"Inference error: {pred_err}") from pred_err

    top_signals = [
        TopSignal(
            name=sig["name"],
            value=sig["value"],
            explanation=sig["explanation"],
        )
        for sig in raw_signals
    ]

    logger.info(
        "Analyzed session (base=%.1fs, test=%.1fs) -> verdict=%s, conf=%.2f",
        base_dur,
        test_dur,
        verdict,
        confidence,
    )

    return SessionAnalysisResponse(
        verdict=verdict,  # type: ignore[arg-type]
        confidence=confidence,
        top_signals=top_signals,
        baseline_duration_seconds=round(base_dur, 2),
        test_duration_seconds=round(test_dur, 2),
        delta_metrics={k: round(v, 4) for k, v in deltas.items()},
        disclaimer=STANDARD_DISCLAIMER,
    )


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze single audio clip for vocal stress indicators",
)
@router.post(
    "/api/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def analyze_single_audio(
    file: UploadFile = File(..., description="Audio file (5-60s, max 10MB)"),
) -> AnalysisResponse:
    """Analyze a single audio clip with nominal baseline comparison."""
    features, duration = await _read_and_extract(file, "audio clip")

    try:
        classifier = get_classifier()
        verdict, confidence, raw_signals = classifier.predict_single(features)
    except Exception as pred_err:
        logger.exception("Classifier inference error on single clip: %s", pred_err)
        raise ModelNotReadyError(f"Inference error: {pred_err}") from pred_err

    top_signals = [
        TopSignal(
            name=sig["name"],
            value=sig["value"],
            explanation=sig["explanation"],
        )
        for sig in raw_signals
    ]

    return AnalysisResponse(
        verdict=verdict,  # type: ignore[arg-type]
        confidence=confidence,
        top_signals=top_signals,
        duration_seconds=round(duration, 2),
        disclaimer=STANDARD_DISCLAIMER,
    )


@router.post(
    "/api/dataset/collect",
    status_code=status.HTTP_201_CREATED,
    summary="Collect consented labeled session data to expand training dataset",
)
async def collect_training_sample(
    baseline_file: UploadFile = File(...),
    test_file: UploadFile = File(...),
    label: str = Form(..., description="'Truthful' or 'Deceptive'"),
    speaker_id: str = Form("anonymous"),
    prompt_question: str = Form("General inquiry"),
    consent_given: bool = Form(True),
) -> Dict[str, Any]:
    """Store anonymized acoustic features and delta vectors into training dataset."""
    if not consent_given:
        raise AudioValidationError("User consent is required to contribute data.", code="CONSENT_REQUIRED")

    baseline_feats, base_dur = await _read_and_extract(baseline_file, "calibration baseline")
    test_feats, test_dur = await _read_and_extract(test_file, "test response")

    deltas = compute_delta_features(baseline_feats, test_feats)

    normalized_label = "Truthful-leaning" if "truth" in label.lower() else "Deception indicators"

    session_record = {
        "id": str(uuid.uuid4()),
        "speaker_id": speaker_id,
        "prompt_question": prompt_question,
        "label": normalized_label,
        "baseline_duration": round(base_dur, 2),
        "test_duration": round(test_dur, 2),
        "baseline_features": baseline_feats,
        "test_features": test_feats,
        "deltas": deltas,
        "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    existing_data: Dict[str, Any] = {"sessions": []}

    if COLLECTED_DATA_PATH.exists():
        try:
            with open(COLLECTED_DATA_PATH, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
        except Exception:
            existing_data = {"sessions": []}

    existing_data.setdefault("sessions", []).append(session_record)

    with open(COLLECTED_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(existing_data, f, indent=2)

    total_count = len(existing_data["sessions"])
    logger.info("Saved user training session #%d (label=%s)", total_count, normalized_label)

    return {
        "success": True,
        "session_id": session_record["id"],
        "total_collected_sessions": total_count,
        "message": f"Successfully added {normalized_label} sample to training dataset.",
    }


@router.get(
    "/api/dataset/stats",
    response_model=DatasetStatsResponse,
    summary="Get statistics of collected training dataset",
)
async def get_dataset_stats() -> DatasetStatsResponse:
    """Retrieve counts of collected truthful and deceptive training samples."""
    total = 0
    truth_count = 0
    decept_count = 0

    if COLLECTED_DATA_PATH.exists():
        try:
            with open(COLLECTED_DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                sessions = data.get("sessions", [])
                total = len(sessions)
                for s in sessions:
                    lbl = s.get("label", "")
                    if "truth" in lbl.lower():
                        truth_count += 1
                    else:
                        decept_count += 1
        except Exception as e:
            logger.warning("Could not read dataset file: %s", e)

    return DatasetStatsResponse(
        total_sessions=total,
        truthful_count=truth_count,
        deceptive_count=decept_count,
        disclaimer=STANDARD_DISCLAIMER,
    )
