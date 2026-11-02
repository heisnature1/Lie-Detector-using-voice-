"""Pydantic schemas for request and response models."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class TopSignal(BaseModel):
    """Acoustic feature driving the stress score with natural language explanation."""

    name: str = Field(..., description="Human-friendly name of the vocal signal")
    value: float = Field(..., description="Extracted numerical value or delta shift")
    explanation: str = Field(..., description="Plain-English explanation of why this signal matters")


class SessionAnalysisResponse(BaseModel):
    """Response returned by POST /analyze/session endpoint."""

    verdict: Literal["Truthful-leaning", "Deception indicators"] = Field(
        ..., description="Binary classification verdict"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Model prediction confidence score (0.0 to 1.0)"
    )
    top_signals: List[TopSignal] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="Top contributing delta acoustic signals driving the classification",
    )
    baseline_duration_seconds: Optional[float] = Field(
        None, description="Analyzed calibration baseline duration in seconds"
    )
    test_duration_seconds: Optional[float] = Field(
        None, description="Analyzed test response duration in seconds"
    )
    delta_metrics: Optional[Dict[str, float]] = Field(
        None, description="Detailed dictionary of acoustic deltas"
    )
    disclaimer: str = Field(
        ..., description="Mandatory ethics and non-lie-detector disclaimer notice"
    )


class AnalysisResponse(BaseModel):
    """Response returned by POST /analyze endpoint."""

    verdict: Literal["Truthful-leaning", "Deception indicators"] = Field(
        ..., description="Binary classification verdict"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Model prediction confidence score (0.0 to 1.0)"
    )
    top_signals: List[TopSignal] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="Top contributing vocal signals",
    )
    duration_seconds: Optional[float] = Field(
        None, description="Analyzed audio duration in seconds"
    )
    disclaimer: str = Field(
        ..., description="Ethics and non-lie-detector disclaimer notice"
    )


class CollectSessionMetadata(BaseModel):
    """Metadata for user-collected training session."""

    speaker_id: str = "anonymous"
    prompt_question: str = "Test question"
    label: Literal["Truthful-leaning", "Deception indicators", "Truthful", "Deceptive"] = "Truthful"
    consent_given: bool = True


class DatasetStatsResponse(BaseModel):
    """Summary statistics of user-collected training dataset."""

    total_sessions: int
    truthful_count: int
    deceptive_count: int
    disclaimer: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "1.0.0"
    model_loaded: bool = True
    disclaimer: str


class ModelInfoResponse(BaseModel):
    """Model information and metadata response."""

    model_type: str
    classes: List[str]
    accuracy: float
    macro_f1: float
    feature_count: int
    features: List[str]
    trained_at: Optional[str] = None
    disclaimer: str


class ErrorDetail(BaseModel):
    """Structured error response."""

    error: str = Field(..., description="Error type identifier")
    detail: str = Field(..., description="Human-readable explanation of error")
    code: str = Field(..., description="Machine-readable error code")
