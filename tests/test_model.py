"""Unit tests for binary delta classifier and session predictions."""

import pytest

from backend.app.features.extractor import AudioFeatureExtractor, compute_delta_features
from backend.app.model.classifier import get_classifier
from backend.train.dataset import synthesize_session_pair


def test_classifier_initialization():
    """Verify classifier loads artifacts without errors."""
    classifier = get_classifier()
    assert classifier.model is not None
    assert classifier.scaler is not None
    assert "Truthful-leaning" in classifier.classes
    assert "Deception indicators" in classifier.classes


def test_predict_truthful_session():
    """Test model inference on synthetic truthful session pair."""
    base_audio, test_audio, _ = synthesize_session_pair(
        label="Truthful-leaning",
        speaker_f0_base=130.0,
        duration_baseline=10.0,
        duration_test=8.0,
        seed=101,
    )
    extractor = AudioFeatureExtractor()
    base_feats = extractor.extract_features(base_audio, duration=10.0)
    test_feats = extractor.extract_features(test_audio, duration=8.0)

    classifier = get_classifier()
    verdict, confidence, top_signals, deltas = classifier.predict_session(base_feats, test_feats)

    assert verdict in ["Truthful-leaning", "Deception indicators"]
    assert 0.0 <= confidence <= 1.0
    assert len(top_signals) == 3
    assert "delta_pitch_f0_mean" in deltas


def test_predict_deceptive_session():
    """Test model inference on synthetic deceptive session pair."""
    base_audio, test_audio, _ = synthesize_session_pair(
        label="Deception indicators",
        speaker_f0_base=130.0,
        duration_baseline=10.0,
        duration_test=8.0,
        seed=202,
    )
    extractor = AudioFeatureExtractor()
    base_feats = extractor.extract_features(base_audio, duration=10.0)
    test_feats = extractor.extract_features(test_audio, duration=8.0)

    classifier = get_classifier()
    verdict, confidence, top_signals, deltas = classifier.predict_session(base_feats, test_feats)

    assert verdict in ["Truthful-leaning", "Deception indicators"]
    assert 0.0 <= confidence <= 1.0
    assert len(top_signals) == 3
