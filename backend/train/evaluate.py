"""Evaluation metrics and reporting for VoiceStress model."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score


def evaluate_model(
    model: Any,
    scaler: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_labels: List[str],
) -> Dict[str, Any]:
    """Compute comprehensive evaluation metrics for the classifier.

    Args:
        model: Trained scikit-learn classifier.
        scaler: Fitted StandardScaler.
        X_test: Test features.
        y_test: True test labels.
        class_labels: List of class labels (e.g. ['Low', 'Medium', 'High']).

    Returns:
        Dictionary of evaluation metrics.
    """
    X_test_scaled = scaler.transform(X_test)
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)

    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))

    report_dict = classification_report(
        y_test,
        y_pred,
        target_names=class_labels,
        output_dict=True,
    )

    cm = confusion_matrix(y_test, y_pred, labels=class_labels).tolist()

    report: Dict[str, Any] = {
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "classes": class_labels,
        "confusion_matrix": cm,
        "classification_report": report_dict,
        "sample_count": len(y_test),
    }

    return report


def print_evaluation_summary(report: Dict[str, Any]) -> None:
    """Pretty print the evaluation report to console."""
    print("=" * 60)
    print("VOICESTRESS MODEL EVALUATION REPORT")
    print("=" * 60)
    print(f"Overall Accuracy: {report['accuracy'] * 100:.2f}%")
    print(f"Macro F1 Score:   {report['macro_f1']:.4f}")
    print(f"Test Samples:     {report['sample_count']}")
    print("-" * 60)
    print("Confusion Matrix (Rows: Actual, Cols: Predicted):")
    classes = report["classes"]
    col_header = "Actual / Pred  " + "".join(f"{c:>12}" for c in classes)
    print(col_header)
    for i, row_label in enumerate(classes):
        row_str = f"{row_label:<15}" + "".join(f"{val:>12}" for val in report["confusion_matrix"][i])
        print(row_str)
    print("-" * 60)
    print("Per-Class Metrics:")
    for c in classes:
        c_metrics = report["classification_report"][c]
        print(
            f"  Class {c:<8}: Precision: {c_metrics['precision']:.3f} | "
            f"Recall: {c_metrics['recall']:.3f} | F1: {c_metrics['f1-score']:.3f} "
            f"(Support: {c_metrics['support']})"
        )
    print("=" * 60)
