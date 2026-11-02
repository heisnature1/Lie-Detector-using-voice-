"""Dataset generator and session loader for VoiceStress delta-based binary training."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from joblib import Parallel, delayed
import numpy as np

from backend.app.config import COLLECTED_DATA_PATH
from backend.app.features.extractor import (
    AudioFeatureExtractor,
    DELTA_FEATURE_NAMES,
    compute_delta_features,
)

logger = logging.getLogger(__name__)


def synthesize_session_pair(
    label: str,
    speaker_f0_base: float,
    duration_baseline: float = 12.0,
    duration_test: float = 10.0,
    sr: int = 16000,
    seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray, str]:
    """Synthesize a calibrated session pair: (baseline_audio, test_audio, label).

    Args:
        label: "Truthful-leaning" or "Deception indicators"
        speaker_f0_base: Base vocal fundamental frequency.
        duration_baseline: Baseline duration in seconds (~12s).
        duration_test: Test clip duration in seconds (~10s).
        sr: Sample rate.
        seed: Random seed.

    Returns:
        Tuple of (baseline_audio, test_audio, label).
    """
    rng = np.random.default_rng(seed)

    def _generate_clip(
        f0_multiplier: float,
        f0_mod_freq: float,
        f0_mod_depth: float,
        jitter_amp: float,
        shimmer_amp: float,
        pause_density: float,
        syllable_rate: float,
        noise_level: float,
        energy_scale: float,
        dur: float,
    ) -> np.ndarray:
        t = np.linspace(0, dur, int(sr * dur), endpoint=False)
        pitch_contour = speaker_f0_base * f0_multiplier * (1.0 + f0_mod_depth * np.sin(2 * np.pi * f0_mod_freq * t))
        jitter_noise = rng.normal(0, jitter_amp, len(t))
        instant_pitch = np.clip(pitch_contour * (1.0 + jitter_noise), 65.0, 480.0)
        phase = 2 * np.pi * np.cumsum(instant_pitch) / sr

        signal_wave = (
            0.5 * np.sin(phase)
            + 0.25 * np.sin(2 * phase)
            + 0.15 * np.sin(3 * phase)
            + 0.08 * np.sin(4 * phase)
            + 0.04 * np.sin(5 * phase)
        )

        num_syllables = max(4, int(syllable_rate * dur))
        envelope = np.zeros_like(t)
        syllable_times = np.linspace(0.4, dur - 0.4, num_syllables)
        syllable_width = (1.0 - pause_density) / max(1.0, syllable_rate)

        for st in syllable_times:
            syllable_shape = np.exp(-((t - st) ** 2) / (2 * (syllable_width / 2.5) ** 2))
            envelope += syllable_shape

        envelope = np.clip(envelope, 0.0, 1.0)
        shimmer_mod = np.clip(1.0 + rng.normal(0, shimmer_amp, len(t)), 0.4, 1.6)
        formant_filter = 1.0 + 0.3 * np.sin(2 * np.pi * 800 * t) + 0.2 * np.sin(2 * np.pi * 2400 * t)

        audio = signal_wave * envelope * shimmer_mod * formant_filter * energy_scale
        noise = rng.normal(0, noise_level, len(t))
        audio = (audio + noise).astype(np.float32)

        max_val = float(np.max(np.abs(audio)))
        if max_val > 0:
            audio = audio / max_val * 0.9
        return audio

    # 1. Baseline Neutral Calibration Audio
    baseline_audio = _generate_clip(
        f0_multiplier=rng.uniform(0.98, 1.02),
        f0_mod_freq=rng.uniform(1.2, 2.2),
        f0_mod_depth=rng.uniform(0.01, 0.03),
        jitter_amp=rng.uniform(0.003, 0.007),
        shimmer_amp=rng.uniform(0.015, 0.03),
        pause_density=rng.uniform(0.22, 0.32),
        syllable_rate=rng.uniform(1.9, 2.4),
        noise_level=rng.uniform(0.003, 0.007),
        energy_scale=rng.uniform(0.35, 0.5),
        dur=duration_baseline,
    )

    # 2. Test Response Audio
    if label == "Truthful-leaning":
        test_audio = _generate_clip(
            f0_multiplier=rng.uniform(0.97, 1.04),  # Minimal pitch deviation
            f0_mod_freq=rng.uniform(1.2, 2.5),
            f0_mod_depth=rng.uniform(0.012, 0.035),
            jitter_amp=rng.uniform(0.003, 0.009),
            shimmer_amp=rng.uniform(0.015, 0.035),
            pause_density=rng.uniform(0.20, 0.32),
            syllable_rate=rng.uniform(1.9, 2.5),
            noise_level=rng.uniform(0.003, 0.008),
            energy_scale=rng.uniform(0.35, 0.55),
            dur=duration_test,
        )
    else:  # Deception indicators
        test_audio = _generate_clip(
            f0_multiplier=rng.uniform(1.20, 1.55),  # Notable pitch spike
            f0_mod_freq=rng.uniform(3.5, 6.5),
            f0_mod_depth=rng.uniform(0.08, 0.18),  # High pitch swing
            jitter_amp=rng.uniform(0.022, 0.05),   # Vocal jitter micro-tremors
            shimmer_amp=rng.uniform(0.055, 0.11),  # Amplitude micro-variations
            pause_density=rng.uniform(0.06, 0.16),  # Shorter pauses / hurried
            syllable_rate=rng.uniform(3.4, 4.8),   # Accelerated speech rate
            noise_level=rng.uniform(0.015, 0.035),
            energy_scale=rng.uniform(0.65, 0.95),
            dur=duration_test,
        )

    return baseline_audio, test_audio, label


def _process_single_session_pair(
    label: str,
    speaker_f0: float,
    seed_idx: int,
    sr: int,
) -> Tuple[List[float], str]:
    """Helper to generate baseline/test clips and compute delta features."""
    extractor = AudioFeatureExtractor(sample_rate=sr)
    baseline_audio, test_audio, lbl = synthesize_session_pair(
        label=label,
        speaker_f0_base=speaker_f0,
        duration_baseline=10.0,
        duration_test=8.0,
        sr=sr,
        seed=seed_idx,
    )

    base_feats = extractor.extract_features(baseline_audio, duration=10.0)
    test_feats = extractor.extract_features(test_audio, duration=8.0)

    deltas = compute_delta_features(base_feats, test_feats)
    row = [deltas[name] for name in DELTA_FEATURE_NAMES]
    return row, lbl


def load_collected_user_dataset() -> Tuple[List[List[float]], List[str]]:
    """Load user-collected session samples if available."""
    if not COLLECTED_DATA_PATH.exists():
        return [], []

    try:
        with open(COLLECTED_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        sessions = data.get("sessions", [])
        X_collected: List[List[float]] = []
        y_collected: List[str] = []

        for s in sessions:
            if "deltas" in s and "label" in s:
                deltas = s["deltas"]
                row = [deltas.get(name, 0.0) for name in DELTA_FEATURE_NAMES]
                label_val = s["label"]
                if label_val in ["Truthful", "truth", "Truthful-leaning"]:
                    y_collected.append("Truthful-leaning")
                else:
                    y_collected.append("Deception indicators")
                X_collected.append(row)

        logger.info("Loaded %d user-collected sessions from %s", len(X_collected), COLLECTED_DATA_PATH)
        return X_collected, y_collected
    except Exception as e:
        logger.warning("Failed to load user dataset from %s: %s", COLLECTED_DATA_PATH, e)
        return [], []


def create_delta_training_dataset(
    samples_per_class: int = 150,
    sr: int = 16000,
    random_state: int = 42,
    include_collected: bool = True,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """Generate balanced delta training dataset combining synthetic and user collected data."""
    rng = np.random.default_rng(random_state)
    male_bases = np.linspace(85, 145, 10)
    female_bases = np.linspace(165, 235, 10)
    speaker_bases = np.concatenate([male_bases, female_bases])

    classes = ["Truthful-leaning", "Deception indicators"]
    tasks = []

    seed_idx = 2000
    for cls in classes:
        for _ in range(samples_per_class):
            speaker_f0 = float(rng.choice(speaker_bases))
            seed_idx += 1
            tasks.append((cls, speaker_f0, seed_idx, sr))

    logger.info("Extracting delta features for %d synthetic session pairs in parallel...", len(tasks))
    results = Parallel(n_jobs=-1)(
        delayed(_process_single_session_pair)(*t) for t in tasks
    )

    X_list = [r[0] for r in results]
    y_list = [r[1] for r in results]

    # Incorporate user-collected dataset if requested
    if include_collected:
        X_user, y_user = load_collected_user_dataset()
        if X_user:
            X_list.extend(X_user)
            y_list.extend(y_user)

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list)

    return X, y, DELTA_FEATURE_NAMES
