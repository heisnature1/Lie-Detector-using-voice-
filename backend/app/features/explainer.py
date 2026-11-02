"""Acoustic feature explainer for vocal stress and delta indicators."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple, TypedDict


class TopSignalDict(TypedDict):
    name: str
    value: float
    explanation: str


# Plain English delta metadata and explanations
DELTA_METADATA: Dict[str, Dict[str, str]] = {
    "delta_pitch_f0_mean": {
        "title": "Pitch Shift (Δ F0 Mean)",
        "unit": "Hz",
        "deceptive_exp": "Fundamental pitch rose by {val:+.1f} Hz above calibration baseline, reflecting laryngeal tension.",
        "truthful_exp": "Base pitch remained stable ({val:+.1f} Hz relative to calibration baseline), reflecting relaxed vocal cords.",
    },
    "delta_pitch_f0_std": {
        "title": "Pitch Variability (Δ F0 Std)",
        "unit": "Hz",
        "deceptive_exp": "Pitch fluctuations increased by {val:+.1f} Hz over baseline, indicating dynamic autonomic arousal.",
        "truthful_exp": "Intonation variance remained steady ({val:+.1f} Hz delta vs baseline), showing consistent vocal control.",
    },
    "delta_pitch_f0_range": {
        "title": "Pitch Dynamic Range (Δ Range)",
        "unit": "Hz",
        "deceptive_exp": "Pitch range expanded by {val:+.1f} Hz relative to baseline questions, signaling heightened intonation swings.",
        "truthful_exp": "Pitch range was consistent ({val:+.1f} Hz shift vs baseline) without irregular tonal excursions.",
    },
    "delta_jitter_local": {
        "title": "Vocal Jitter Perturbation (Δ Jitter)",
        "unit": "%",
        "deceptive_exp": "Micro-frequency instability increased by {val_pct:+.2f}% compared to baseline, indicating micro-tremors in vocal folds.",
        "truthful_exp": "Micro-period frequency stability was preserved ({val_pct:+.2f}% delta vs baseline), showing steady neuromuscular control.",
    },
    "delta_shimmer_local": {
        "title": "Vocal Shimmer Perturbation (Δ Shimmer)",
        "unit": "%",
        "deceptive_exp": "Micro-amplitude instability rose by {val_pct:+.2f}% over calibration, indicating uneven subglottal breath pressure.",
        "truthful_exp": "Amplitude consistency was maintained ({val_pct:+.2f}% delta vs baseline), showing steady respiratory support.",
    },
    "delta_speech_rate": {
        "title": "Speech Pacing Shift (Δ Syllables/s)",
        "unit": "syllables/s",
        "deceptive_exp": "Speaking rate shifted by {val:+.2f} syllables/sec compared to neutral answers, reflecting autonomic arousal.",
        "truthful_exp": "Speech pacing closely matched neutral baseline ({val:+.2f} syllables/sec change), indicating natural articulation tempo.",
    },
    "delta_pause_ratio": {
        "title": "Pause & Silence Ratio (Δ Silence)",
        "unit": "%",
        "deceptive_exp": "Silence ratio shifted by {val_pct:+.1f}% vs baseline, indicating altered cognitive phrasing and breathing pauses.",
        "truthful_exp": "Pause ratio aligned with calibration baseline ({val_pct:+.1f}% shift), demonstrating relaxed breathing intervals.",
    },
    "delta_energy_variance": {
        "title": "RMS Loudness Modulation (Δ Energy Var)",
        "unit": "",
        "deceptive_exp": "Acoustic volume variance shifted ({val:+.4f}) vs neutral responses, reflecting uneven vocal projection.",
        "truthful_exp": "Loudness envelope remained steady ({val:+.4f} delta vs baseline) across phrases.",
    },
    "delta_energy_std": {
        "title": "Volume Standard Deviation (Δ Energy Std)",
        "unit": "",
        "deceptive_exp": "Vocal volume standard deviation changed ({val:+.3f}) relative to calm calibration.",
        "truthful_exp": "Volume consistency remained uniform ({val:+.3f} delta vs baseline).",
    },
    "delta_mfcc_1": {
        "title": "Spectral Resonance Shift (Δ MFCC 1)",
        "unit": "",
        "deceptive_exp": "Low-frequency spectral resonance shifted from baseline, consistent with altered vocal tract posture.",
        "truthful_exp": "Spectral resonance envelope matched neutral baseline calibration.",
    },
    "delta_mfcc_2": {
        "title": "Vocal Timbre Slope (Δ MFCC 2)",
        "unit": "",
        "deceptive_exp": "Timbral spectral coloration differed from neutral answers, suggesting altered formant dispersion.",
        "truthful_exp": "Acoustic timbre and formant slope were maintained from baseline.",
    },
    "delta_mfcc_3": {
        "title": "Harmonic Tilt Resonance (Δ MFCC 3)",
        "unit": "",
        "deceptive_exp": "Mid-frequency harmonic distribution diverged from calibration speech.",
        "truthful_exp": "Harmonic distribution showed minimal deviation from calibration speech.",
    },
}


def explain_delta_signals(
    delta_features: Dict[str, float],
    verdict: str,
    feature_importances: Dict[str, float],
    top_k: int = 3,
) -> List[TopSignalDict]:
    """Identify the top K driving delta signals and generate plain English explanations."""
    contributions: List[Tuple[float, str, float]] = []

    for name, value in delta_features.items():
        importance = feature_importances.get(name, 0.05)
        if verdict == "Deception indicators":
            score = importance * abs(value)
        else:
            score = importance / (1.0 + abs(value))

        contributions.append((score, name, value))

    contributions.sort(key=lambda x: x[0], reverse=True)

    top_signals: List[TopSignalDict] = []
    seen_categories = set()

    for _, feat_name, raw_val in contributions:
        category = feat_name.split("_")[1] if len(feat_name.split("_")) > 1 else feat_name
        if category.startswith("mfcc") and "mfcc" in seen_categories:
            continue

        meta = DELTA_METADATA.get(
            feat_name,
            {
                "title": feat_name.replace("delta_", "Δ ").replace("_", " ").title(),
                "unit": "",
                "deceptive_exp": f"Observed shift: {raw_val:+.3f}",
                "truthful_exp": f"Observed baseline delta: {raw_val:+.3f}",
            },
        )

        title = meta["title"]
        val_pct = raw_val * 100.0

        if verdict == "Deception indicators":
            template = meta.get("deceptive_exp", f"Observed shift: {raw_val:+.2f}")
        else:
            template = meta.get("truthful_exp", f"Observed shift: {raw_val:+.2f}")

        try:
            explanation = template.format(val=raw_val, val_pct=val_pct)
        except Exception:
            explanation = f"Observed delta: {raw_val:+.2f}"

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
