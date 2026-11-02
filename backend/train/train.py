"""Training script for VoiceStress binary delta classifier (Truthful vs Deceptive)."""

from __future__ import annotations

import argparse
import datetime
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from backend.app.config import (
    DATA_DIR,
    EVAL_REPORT_PATH,
    MODEL_ARTIFACTS_DIR,
    MODEL_META_PATH,
    MODEL_PATH,
    SCALER_PATH,
)
from backend.app.features.extractor import DELTA_FEATURE_NAMES
from backend.train.dataset import create_delta_training_dataset
from backend.train.evaluate import evaluate_model, print_evaluation_summary

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def train_model(
    samples_per_class: int = 150,
    test_size: float = 0.20,
    random_state: int = 42,
    output_dir: Path = MODEL_ARTIFACTS_DIR,
) -> Dict[str, Any]:
    """Train Random Forest binary classifier on acoustic delta features."""
    output_dir.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    EVAL_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Generating delta dataset with %d samples per class...", samples_per_class)
    X, y, feature_names = create_delta_training_dataset(
        samples_per_class=samples_per_class,
        random_state=random_state,
        include_collected=True,
    )

    classes = ["Truthful-leaning", "Deception indicators"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    logger.info("Training set size: %d, Test set size: %d", len(X_train), len(X_test))

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    logger.info("Training Random Forest Binary Classifier...")
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=3,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train)

    feature_importances = {
        name: float(imp)
        for name, imp in zip(feature_names, model.feature_importances_)
    }

    logger.info("Evaluating model on holdout test set...")
    report = evaluate_model(
        model=model,
        scaler=scaler,
        X_test=X_test,
        y_test=y_test,
        class_labels=classes,
    )

    print_evaluation_summary(report)

    meta = {
        "model_type": "RandomForestClassifier",
        "classes": classes,
        "feature_names": feature_names,
        "feature_importances": feature_importances,
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "accuracy": report["accuracy"],
        "macro_f1": report["macro_f1"],
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }

    logger.info("Saving model to %s", MODEL_PATH)
    joblib.dump(model, MODEL_PATH)

    logger.info("Saving scaler to %s", SCALER_PATH)
    joblib.dump(scaler, SCALER_PATH)

    logger.info("Saving metadata to %s", MODEL_META_PATH)
    with open(MODEL_META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    logger.info("Saving evaluation report to %s", EVAL_REPORT_PATH)
    with open(EVAL_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    logger.info("Model training and export complete!")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train VoiceStress binary delta classifier")
    parser.add_argument("--samples", type=int, default=150, help="Samples per class")
    args = parser.parse_args()
    train_model(samples_per_class=args.samples)
