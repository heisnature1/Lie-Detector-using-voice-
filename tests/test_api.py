"""Unit and integration tests for FastAPI endpoints."""

import io
import numpy as np
import pytest
from fastapi.testclient import TestClient
import soundfile as sf

from backend.app.main import app

client = TestClient(app)


def make_test_wav_bytes(duration: float = 12.0, sr: int = 16000, freq: float = 180.0) -> bytes:
    """Helper to synthesize test WAV bytes of arbitrary duration."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    sig = 0.4 * np.sin(2 * np.pi * freq * t) + 0.1 * np.sin(2 * np.pi * 2 * freq * t)
    sig = sig.astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, sig, sr, format="WAV")
    return buf.getvalue()


def test_health_endpoint():
    """Test /health and /api/health."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert "disclaimer" in data
    assert "lie detector" in data["disclaimer"].lower()


def test_model_info_endpoint():
    """Test /api/model-info."""
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "classes" in data
    assert "Low" in data["classes"]
    assert data["feature_count"] == 26
    assert data["accuracy"] > 0.8


def test_analyze_valid_audio():
    """Test POST /analyze with valid 12-second audio clip."""
    wav_bytes = make_test_wav_bytes(duration=12.0)
    files = {"file": ("test_voice.wav", wav_bytes, "audio/wav")}

    response = client.post("/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["score"] in ["Low", "Medium", "High"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["top_signals"]) == 3
    for sig in data["top_signals"]:
        assert "name" in sig
        assert "value" in sig
        assert "explanation" in sig
    assert "disclaimer" in data
    assert pytest.approx(data["duration_seconds"], abs=0.5) == 12.0


def test_analyze_duration_too_short():
    """Test POST /analyze with 4-second audio clip (< 10s minimum)."""
    wav_bytes = make_test_wav_bytes(duration=4.0)
    files = {"file": ("short_voice.wav", wav_bytes, "audio/wav")}

    response = client.post("/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "DURATION_TOO_SHORT"
    assert "minimum duration" in data["detail"].lower()


def test_analyze_duration_too_long():
    """Test POST /analyze with 65-second audio clip (> 60s maximum)."""
    wav_bytes = make_test_wav_bytes(duration=65.0)
    files = {"file": ("long_voice.wav", wav_bytes, "audio/wav")}

    response = client.post("/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "DURATION_TOO_LONG"
    assert "maximum allowed duration" in data["detail"].lower()


def test_analyze_corrupt_file():
    """Test POST /analyze with garbage/corrupt bytes."""
    corrupt_bytes = b"CORRUPT_NOT_AUDIO_BYTES_12345"
    files = {"file": ("corrupt.wav", corrupt_bytes, "audio/wav")}

    response = client.post("/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["code"] in ["AUDIO_DECODE_FAILED", "UNSUPPORTED_FORMAT"]


def test_analyze_missing_file():
    """Test POST /analyze without providing a file."""
    response = client.post("/analyze")
    assert response.status_code == 422  # Pydantic validation error for missing field
