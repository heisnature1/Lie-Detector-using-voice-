"""Classifier service for predicting Truthful vs Deceptive vocal stress verdict and delta signals."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np

from backend.app.config import (
    MODEL_META_PATH,
    MODEL_PATH,
    SCALER_PATH,
    STANDARD_DISCLAIMER,
)
from backend.app.features.explainer import TopSignalDict, explain_delta_signals
from backend.app.features.extractor import (
    DELTA_FEATURE_NAMES,
    compute_delta_features,
    delta_dict_to_vector,
)

logger = logging.getLogger(__name__)


class StressClassifier:
    """Loads trained artifacts and infers binary Truthful vs Deceptive verdict from delta features."""

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        scaler_path: Path = SCALER_PATH,
        meta_path: Path = MODEL_META_PATH,
    ) -> None:
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.meta_path = meta_path

        self.model: Optional[Any] = None
        self.scaler: Optional[Any] = None
        self.meta: Dict[str, Any] = {}
        self.classes: List[str] = ["Truthful-leaning", "Deception indicators"]

        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Load model, scaler, and metadata from disk."""
        if not self.model_path.exists() or not self.scaler_path.exists():
            raise FileNotFoundError(
                f"Model artifacts not found at {self.model_path} or {self.scaler_path}. "
                "Please run backend/train/train.py first."
            )

        logger.info("Loading model from %s", self.model_path)
        self.model = joblib.load(self.model_path)

        logger.info("Loading scaler from %s", self.scaler_path)
        self.scaler = joblib.load(self.scaler_path)

        if self.meta_path.exists():
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.meta = json.load(f)
            self.classes = self.meta.get("classes", ["Truthful-leaning", "Deception indicators"])

    def predict_session(
        self,
        baseline_features: Dict[str, float],
        test_features: Dict[str, float],
    ) -> Tuple[str, float, List[TopSignalDict], Dict[str, float]]:
        """Predict binary verdict (Truthful-leaning vs Deception indicators) from baseline/test deltas.

        Args:
            baseline_features: Acoustic features of the neutral calibration clip.
            test_features: Acoustic features of the target test inquiry clip.

        Returns:
            Tuple of (verdict, confidence, top_signals, delta_features).
        """
        if self.model is None or self.scaler is None:
            raise RuntimeError("Model or scaler is not loaded.")

        # Compute delta dictionary (test - baseline)
        deltas = compute_delta_features(baseline_features, test_features)

        # Vectorize and scale
        x_vec = delta_dict_to_vector(deltas).reshape(1, -1)
        x_scaled = self.scaler.transform(x_vec)

        # Probabilities
        probabilities = self.model.predict_proba(x_scaled)[0]
        class_indices = list(self.model.classes_)

        # Best class index
        best_idx = int(np.argmax(probabilities))
        verdict = str(class_indices[best_idx])
        confidence = float(probabilities[best_idx])

        # Feature importances
        feature_importances = self.meta.get("feature_importances", {})

        # Top driving delta signals
        top_signals = explain_delta_signals(
            delta_features=deltas,
            verdict=verdict,
            feature_importances=feature_importances,
            top_k=3,
        )

        return verdict, round(confidence, 3), top_signals, deltas

    def predict_single(
        self,
        features: Dict[str, float],
    ) -> Tuple[str, float, List[TopSignalDict]]:
        """Fallback prediction for a single clip against default baseline."""
        # Synthesize a default baseline matching nominal vocal statistics
        nominal_baseline = {
            "pitch_f0_mean": features.get("pitch_f0_mean", 130.0) * 0.95,
            "pitch_f0_std": 10.0,
            "pitch_f0_range": 30.0,
            "jitter_local": 0.005,
            "shimmer_local": 0.02,
            "speech_rate": 2.2,
            "pause_count": 2.0,
            "pause_total_duration": 2.5,
            "pause_mean_duration": 0.8,
            "pause_ratio": 0.25,
            "energy_variance": 0.01,
            "energy_std": 0.05,
            "energy_mean": 0.2,
        }
        for i in range(1, 14):
            nominal_baseline[f"mfcc_{i}"] = features.get(f"mfcc_{i}", 0.0)

        verdict, conf, signals, _ = self.predict_session(nominal_baseline, features)
        return verdict, conf, signals


# Global singleton instance
_classifier_instance: Optional[StressClassifier] = None


def get_classifier() -> StressClassifier:
    """Retrieve or initialize the singleton StressClassifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = StressClassifier()
    return _classifier_instance
