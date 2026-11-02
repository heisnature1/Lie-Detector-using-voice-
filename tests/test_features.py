"""Unit tests for audio feature extraction."""

import io
import numpy as np
import pytest
import soundfile as sf

from backend.app.features.extractor import (
    FEATURE_NAMES,
    AudioFeatureExtractor,
    AudioLoadError,
    decode_audio_bytes,
    extract_audio_features,
    feature_dict_to_vector,
)


def generate_synthetic_audio_bytes(
    duration: float = 12.0,
    sr: int = 16000,
    freq: float = 180.0,
    with_pauses: bool = True,
) -> bytes:
    """Generate in-memory WAV audio bytes for testing."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Speech-like harmonic signal with vibrato
    pitch_mod = 1.0 + 0.05 * np.sin(2 * np.pi * 3.0 * t)
    phase = 2 * np.pi * freq * np.cumsum(pitch_mod) / sr
    signal = 0.4 * np.sin(phase) + 0.2 * np.sin(2 * phase) + 0.1 * np.sin(3 * phase)

    if with_pauses:
        # Create silent gaps between 3-4s and 7-8s
        mask = np.ones_like(t)
        mask[(t >= 3.0) & (t < 4.0)] = 0.0
        mask[(t >= 7.0) & (t < 8.0)] = 0.0
        signal = signal * mask

    # Add subtle background noise
    noise = np.random.normal(0, 0.005, len(t))
    signal = (signal + noise).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, signal, sr, format="WAV")
    return buf.getvalue()


def test_feature_names_count():
    """Verify that we extract all 26 target features."""
    assert len(FEATURE_NAMES) == 26
    assert "pitch_f0_mean" in FEATURE_NAMES
    assert "pitch_f0_std" in FEATURE_NAMES
    assert "pitch_f0_range" in FEATURE_NAMES
    assert "jitter_local" in FEATURE_NAMES
    assert "shimmer_local" in FEATURE_NAMES
    assert "speech_rate" in FEATURE_NAMES
    assert "pause_count" in FEATURE_NAMES
    assert "pause_total_duration" in FEATURE_NAMES
    assert "pause_mean_duration" in FEATURE_NAMES
    assert "energy_variance" in FEATURE_NAMES
    for i in range(1, 14):
        assert f"mfcc_{i}" in FEATURE_NAMES


def test_decode_and_extract_synthetic_audio():
    """Test full audio decoding and feature extraction pipeline on synthetic WAV."""
    audio_bytes = generate_synthetic_audio_bytes(duration=12.0, sr=16000, freq=200.0)
    features, duration = extract_audio_features(audio_bytes)

    assert pytest.approx(duration, abs=0.2) == 12.0
    assert isinstance(features, dict)
    assert len(features) == 26

    # Verify pitch around 200 Hz
    assert 160.0 <= features["pitch_f0_mean"] <= 240.0
    assert features["pitch_f0_std"] >= 0.0
    assert features["pitch_f0_range"] >= 0.0

    # Verify jitter & shimmer are non-negative and finite
    assert 0.0 <= features["jitter_local"] <= 1.0
    assert 0.0 <= features["shimmer_local"] <= 2.0

    # Verify pauses detected
    assert features["pause_count"] >= 1.0
    assert features["pause_total_duration"] > 0.0

    # Verify all values are finite (no NaN or Inf)
    for name, val in features.items():
        assert np.isfinite(val), f"Feature {name} has non-finite value: {val}"


def test_feature_dict_to_vector():
    """Test vector conversion helper preserves feature order and shape."""
    audio_bytes = generate_synthetic_audio_bytes(duration=10.0, sr=16000)
    features, _ = extract_audio_features(audio_bytes)
    vector = feature_dict_to_vector(features)

    assert isinstance(vector, np.ndarray)
    assert vector.shape == (26,)
    assert not np.isnan(vector).any()
    assert not np.isinf(vector).any()


def test_silent_audio_handling():
    """Verify silence does not crash extractor or yield NaNs."""
    sr = 16000
    duration = 10.0
    silent_audio = np.zeros(int(sr * duration), dtype=np.float32)
    extractor = AudioFeatureExtractor(sample_rate=sr)
    features = extractor.extract_features(silent_audio, duration=duration)

    assert len(features) == 26
    for name, val in features.items():
        assert np.isfinite(val), f"Feature {name} is NaN on silence"


def test_invalid_audio_bytes():
    """Verify invalid or corrupt bytes raise AudioLoadError."""
    bad_bytes = b"NOT_A_VALID_AUDIO_FILE_DATA_RANDOM_GARBAGE_12345"
    with pytest.raises(AudioLoadError):
        decode_audio_bytes(bad_bytes)
