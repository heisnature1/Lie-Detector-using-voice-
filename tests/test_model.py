"""Unit tests for model inference, classifier, and signal explainer."""

import numpy as np
import pytest

from backend.app.features.extractor import AudioFeatureExtractor, extract_audio_features
from backend.app.model.classifier import get_classifier
from backend.train.dataset import synthesize_emotional_speech_sample


def test_classifier_initialization():
    """Verify classifier loads artifacts without errors."""
    classifier = get_classifier()
    assert classifier.model is not None
    assert classifier.scaler is not None
    assert "Low" in classifier.classes
    assert "High" in classifier.classes


def test_predict_low_stress_sample():
    """Test model inference on synthetic calm speech sample."""
    audio, _ = synthesize_emotional_speech_sample(
        emotion="Low",
        speaker_f0_base=120.0,
        duration=12.0,
        seed=101,
    )
    extractor = AudioFeatureExtractor()
    features = extractor.extract_features(audio, duration=12.0)

    classifier = get_classifier()
    score, confidence, top_signals = classifier.predict(features)

    assert score in ["Low", "Medium", "High"]
    assert 0.0 <= confidence <= 1.0
    assert len(top_signals) == 3

    for sig in top_signals:
        assert "name" in sig and isinstance(sig["name"], str)
        assert "value" in sig and isinstance(sig["value"], (int, float))
        assert "explanation" in sig and isinstance(sig["explanation"], str)
        assert len(sig["explanation"]) > 5


def test_predict_high_stress_sample():
    """Test model inference on synthetic high-stress speech sample."""
    audio, _ = synthesize_emotional_speech_sample(
        emotion="High",
        speaker_f0_base=150.0,
        duration=12.0,
        seed=202,
    )
    extractor = AudioFeatureExtractor()
    features = extractor.extract_features(audio, duration=12.0)

    classifier = get_classifier()
    score, confidence, top_signals = classifier.predict(features)

    assert score in ["Low", "Medium", "High"]
    assert 0.0 <= confidence <= 1.0
    assert len(top_signals) == 3
