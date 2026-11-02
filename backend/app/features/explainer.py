"""Acoustic feature explainer for vocal stress indicators."""

from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class TopSignalDict(TypedDict):
    name: str
    value: float
    explanation: str


# Human-friendly descriptions and scientific rationales for acoustic features
SIGNAL_METADATA: Dict[str, Dict[str, str]] = {
    "pitch_f0_std": {
        "title": "Pitch Variability (F0 Std)",
        "unit": "Hz",
        "high_exp": "High pitch fluctuations ({val:.1f} Hz) reflect vocal cord tension and autonomic arousal.",
        "low_exp": "Steady pitch contour ({val:.1f} Hz) indicates relaxed and controlled vocal cords.",
    },
    "pitch_f0_range": {
        "title": "Pitch Range (F0 Range)",
        "unit": "Hz",
        "high_exp": "Wide pitch range ({val:.1f} Hz) suggests heightened emotional dynamics and intonation swings.",
        "low_exp": "Restrained pitch range ({val:.1f} Hz) matches typical relaxed conversational pacing.",
    },
    "pitch_f0_mean": {
        "title": "Mean Fundamental Frequency",
        "unit": "Hz",
        "high_exp": "Elevated base pitch ({val:.1f} Hz) is often associated with laryngeal muscle contraction.",
        "low_exp": "Normal resting fundamental frequency ({val:.1f} Hz) aligns with low physical stress.",
    },
    "jitter_local": {
        "title": "Vocal Jitter (Frequency Instability)",
        "unit": "%",
        "high_exp": "Elevated cycle-to-cycle frequency variation ({val_pct:.2f}%) indicates micro-tremors in vocal fold control.",
        "low_exp": "Minimal vocal frequency perturbation ({val_pct:.2f}%) shows stable neuromuscular laryngeal control.",
    },
    "shimmer_local": {
        "title": "Vocal Shimmer (Amplitude Instability)",
        "unit": "%",
        "high_exp": "Increased amplitude perturbation ({val_pct:.2f}%) reflects uneven subglottal breath pressure.",
        "low_exp": "Consistent voice amplitude ({val_pct:.2f}%) reflects steady respiratory control.",
    },
    "speech_rate": {
        "title": "Speech Pacing & Syllable Rate",
        "unit": "onsets/sec",
        "high_exp": "Accelerated speech pacing ({val:.2f} syllables/sec) correlates with autonomic sympathetic activation.",
        "low_exp": "Measured, calm speech pacing ({val:.2f} syllables/sec) matches relaxed breathing patterns.",
    },
    "pause_ratio": {
        "title": "Silence & Pause Ratio",
        "unit": "%",
        "high_exp": "Reduced pause ratio ({val_pct:.1f}%) suggests continuous, hurried vocalization.",
        "low_exp": "Healthy pause duration ({val_pct:.1f}%) reflects natural respiratory intervals.",
    },
    "pause_count": {
        "title": "Pause Frequency",
        "unit": "pauses",
        "high_exp": "Altered pause structure ({val:.0f} breath pauses) indicates modified speech rhythm.",
        "low_exp": "Regular pause count ({val:.0f} breath pauses) reflects balanced cognitive phrasing.",
    },
    "energy_variance": {
        "title": "RMS Energy Variance",
        "unit": "",
        "high_exp": "High loudness modulation indicates dynamic energy surges across spoken phrases.",
        "low_exp": "Even acoustic energy distribution demonstrates steady volume control.",
    },
    "energy_std": {
        "title": "Loudness Standard Deviation",
        "unit": "",
        "high_exp": "Pronounced volume fluctuations reflect uneven acoustic projection.",
        "low_exp": "Stable vocal volume indicates relaxed acoustic projection.",
    },
    "mfcc_1": {
        "title": "Spectral Energy Distribution (MFCC 1)",
        "unit": "",
        "high_exp": "Shift in low-frequency spectral envelope consistent with altered vocal tract resonance.",
        "low_exp": "Balanced acoustic spectral envelope typical of unstrained speech.",
    },
    "mfcc_2": {
        "title": "Spectral Formant Slope (MFCC 2)",
        "unit": "",
        "high_exp": "Timbral acoustic coloration indicating altered formant dispersion under tension.",
        "low_exp": "Standard vocal timbre and relaxed formant dispersion.",
    },
    "mfcc_3": {
        "title": "Vocal Timbre Resonance (MFCC 3)",
        "unit": "",
        "high_exp": "Higher frequency harmonic emphasis often accompanying vocal effort.",
        "low_exp": "Natural harmonic acoustic envelope without tense harmonic tilt.",
    },
}


def explain_top_signals(
    features: Dict[str, float],
    predicted_score: str,
    baseline_calm_means: Dict[str, float],
    baseline_calm_stds: Dict[str, float],
    feature_importances: Dict[str, float],
    top_k: int = 3,
) -> List[TopSignalDict]:
    """Identify the top K driving acoustic signals and generate plain English explanations.

    Args:
        features: Dictionary of extracted acoustic features.
        predicted_score: Model predicted score ('Low', 'Medium', 'High').
        baseline_calm_means: Mean feature values for baseline calm speech.
        baseline_calm_stds: Std of feature values for baseline calm speech.
        feature_importances: Random Forest feature importances.
        top_k: Number of top driving signals to return (default 3).

    Returns:
        List of dicts with name, value, and explanation.
    """
    contributions: List[Tuple[float, str, float]] = []

    for name, value in features.items():
        base_mean = baseline_calm_means.get(name, value)
        base_std = max(1e-4, baseline_calm_stds.get(name, 1.0))
        importance = feature_importances.get(name, 0.05)

        # Z-score deviation from calm baseline
        z_dev = (value - base_mean) / base_std

        # Scoring weight: importance weighted by deviation magnitude
        if predicted_score in ("High", "Medium"):
            # Look for signals that deviate most upwards or notably from calm
            impact_score = importance * abs(z_dev)
        else:
            # Low stress: highlight features closest to or lower than calm baselines
            impact_score = importance * (1.0 / (1.0 + abs(z_dev)))

        contributions.append((impact_score, name, z_dev))

    # Sort descending by impact score
    contributions.sort(key=lambda x: x[0], reverse=True)

    top_signals: List[TopSignalDict] = []
    seen_categories = set()

    for _, feat_name, z_dev in contributions:
        # Group similar MFCCs or duplicate pitch metrics so top 3 are diverse
        category = feat_name.split("_")[0]
        if category.startswith("mfcc") and "mfcc" in seen_categories:
            continue

        raw_val = float(features[feat_name])
        meta = SIGNAL_METADATA.get(
            feat_name,
            {
                "title": feat_name.replace("_", " ").title(),
                "unit": "",
                "high_exp": f"Measured value: {raw_val:.3f}",
                "low_exp": f"Measured value: {raw_val:.3f}",
            },
        )

        title = meta["title"]
        val_pct = raw_val * 100.0

        if predicted_score in ("High", "Medium"):
            exp_template = meta.get("high_exp", f"Observed elevated level: {raw_val:.2f}")
        else:
            exp_template = meta.get("low_exp", f"Observed calm baseline: {raw_val:.2f}")

        try:
            explanation = exp_template.format(val=raw_val, val_pct=val_pct)
        except Exception:
            explanation = f"Acoustic measurement: {raw_val:.2f}"

        top_signals.append(
            {
                "name": title,
                "value": round(raw_val, 4),
                "explanation": explanation,
            }
        )
        seen_categories.add(category)

        if len(top_signals) >= top_k:
            break

    return top_signals
