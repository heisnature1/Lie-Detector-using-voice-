"""Unit and integration tests for FastAPI delta session endpoints."""

import io
import numpy as np
import pytest
from fastapi.testclient import TestClient
import soundfile as sf

from backend.app.main import app

client = TestClient(app)


def make_test_wav_bytes(duration: float = 8.0, sr: int = 16000, freq: float = 140.0) -> bytes:
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


def test_model_info_endpoint():
    """Test /api/model-info."""
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "classes" in data
    assert "Truthful-leaning" in data["classes"]
    assert "Deception indicators" in data["classes"]
    assert data["feature_count"] == 22


def test_analyze_session_valid():
    """Test POST /analyze/session with calibrated baseline and test clips."""
    baseline_bytes = make_test_wav_bytes(duration=10.0, freq=130.0)
    test_bytes = make_test_wav_bytes(duration=8.0, freq=135.0)

    files = {
        "baseline_file": ("calibration.wav", baseline_bytes, "audio/wav"),
        "test_file": ("test_response.wav", test_bytes, "audio/wav"),
    }

    response = client.post("/analyze/session", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["verdict"] in ["Truthful-leaning", "Deception indicators"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["top_signals"]) == 3
    for sig in data["top_signals"]:
        assert "name" in sig
        assert "value" in sig
        assert "explanation" in sig
    assert "disclaimer" in data
    assert pytest.approx(data["baseline_duration_seconds"], abs=0.5) == 10.0
    assert pytest.approx(data["test_duration_seconds"], abs=0.5) == 8.0


def test_analyze_session_duration_too_short():
    """Test POST /analyze/session with 3-second audio clip (< 5s minimum)."""
    short_bytes = make_test_wav_bytes(duration=3.0)
    valid_bytes = make_test_wav_bytes(duration=8.0)

    files = {
        "baseline_file": ("calibration.wav", short_bytes, "audio/wav"),
        "test_file": ("test_response.wav", valid_bytes, "audio/wav"),
    }

    response = client.post("/analyze/session", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "DURATION_TOO_SHORT"
    assert "minimum duration" in data["detail"].lower()


def test_analyze_single_clip():
    """Test POST /analyze with single valid 8-second clip."""
    wav_bytes = make_test_wav_bytes(duration=8.0)
    files = {"file": ("test_voice.wav", wav_bytes, "audio/wav")}

    response = client.post("/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["Truthful-leaning", "Deception indicators"]


def test_collect_dataset_endpoint():
    """Test POST /api/dataset/collect and GET /api/dataset/stats."""
    baseline_bytes = make_test_wav_bytes(duration=8.0, freq=130.0)
    test_bytes = make_test_wav_bytes(duration=8.0, freq=210.0)

    files = {
        "baseline_file": ("calib.wav", baseline_bytes, "audio/wav"),
        "test_file": ("test.wav", test_bytes, "audio/wav"),
    }
    data = {
        "label": "Deceptive",
        "speaker_id": "test_speaker_1",
        "prompt_question": "Did you break the vase?",
        "consent_given": "true",
    }

    response = client.post("/api/dataset/collect", files=files, data=data)
    assert response.status_code == 201
    res = response.json()
    assert res["success"] is True
    assert "session_id" in res
    assert res["total_collected_sessions"] >= 1

    stats_resp = client.get("/api/dataset/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_sessions"] >= 1
