"""Classifier service for predicting vocal stress score and extracting driving signals."""

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
from backend.app.features.explainer import TopSignalDict, explain_top_signals
from backend.app.features.extractor import FEATURE_NAMES, feature_dict_to_vector

logger = logging.getLogger(__name__)


class StressClassifier:
    """Loads trained artifacts and infers vocal stress likelihood."""

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
        self.classes: List[str] = ["Low", "Medium", "High"]

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
            self.classes = self.meta.get("classes", ["Low", "Medium", "High"])

    def predict(
        self,
        features: Dict[str, float],
    ) -> Tuple[str, float, List[TopSignalDict]]:
        """Predict stress level, confidence, and top contributing signals.

        Args:
            features: Dictionary of extracted acoustic features.

        Returns:
            Tuple of (score, confidence, top_signals).
        """
        if self.model is None or self.scaler is None:
            raise RuntimeError("Model or scaler is not loaded.")

        # Vectorize and scale
        x_vec = feature_dict_to_vector(features).reshape(1, -1)
        x_scaled = self.scaler.transform(x_vec)

        # Probabilities
        probabilities = self.model.predict_proba(x_scaled)[0]
        class_indices = list(self.model.classes_)

        # Best class index
        best_idx = int(np.argmax(probabilities))
        score = str(class_indices[best_idx])
        confidence = float(probabilities[best_idx])

        # Baseline statistics and importances
        baseline_means = self.meta.get("baseline_calm_means", {})
        baseline_stds = self.meta.get("baseline_calm_stds", {})
        feature_importances = self.meta.get("feature_importances", {})

        # Top driving signals
        top_signals = explain_top_signals(
            features=features,
            predicted_score=score,
            baseline_calm_means=baseline_means,
            baseline_calm_stds=baseline_stds,
            feature_importances=feature_importances,
            top_k=3,
        )

        return score, round(confidence, 3), top_signals


# Global singleton instance
_classifier_instance: Optional[StressClassifier] = None


def get_classifier() -> StressClassifier:
    """Retrieve or initialize the singleton StressClassifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = StressClassifier()
    return _classifier_instance
