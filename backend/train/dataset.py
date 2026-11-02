"""Dataset generator and loader for VoiceStress training."""

from __future__ import annotations

import logging
from typing import Dict, List, Tuple

from joblib import Parallel, delayed
import numpy as np

from backend.app.features.extractor import AudioFeatureExtractor, FEATURE_NAMES

logger = logging.getLogger(__name__)


def synthesize_emotional_speech_sample(
    emotion: str,
    speaker_f0_base: float,
    duration: float = 10.0,
    sr: int = 16000,
    seed: int = 42,
) -> Tuple[np.ndarray, str]:
    """Synthesize an acoustic speech sample with realistic stress correlates."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    if emotion == "Low":
        target_f0 = speaker_f0_base * rng.uniform(0.95, 1.05)
        f0_mod_freq = rng.uniform(1.0, 2.5)
        f0_mod_depth = rng.uniform(0.01, 0.03)  # Calm steady intonation
        jitter_amp = rng.uniform(0.002, 0.008)
        shimmer_amp = rng.uniform(0.01, 0.03)
        pause_density = rng.uniform(0.22, 0.35)
        syllable_rate = rng.uniform(1.8, 2.4)
        noise_level = rng.uniform(0.003, 0.008)
        energy_scale = rng.uniform(0.3, 0.5)

    elif emotion == "Medium":
        target_f0 = speaker_f0_base * rng.uniform(1.10, 1.25)
        f0_mod_freq = rng.uniform(2.5, 4.5)
        f0_mod_depth = rng.uniform(0.04, 0.08)
        jitter_amp = rng.uniform(0.012, 0.022)
        shimmer_amp = rng.uniform(0.035, 0.06)
        pause_density = rng.uniform(0.15, 0.25)
        syllable_rate = rng.uniform(2.6, 3.4)
        noise_level = rng.uniform(0.008, 0.018)
        energy_scale = rng.uniform(0.45, 0.7)

    else:  # High
        target_f0 = speaker_f0_base * rng.uniform(1.30, 1.70)
        f0_mod_freq = rng.uniform(4.0, 7.5)
        f0_mod_depth = rng.uniform(0.09, 0.20)  # High pitch swing / erratic
        jitter_amp = rng.uniform(0.025, 0.055)  # Micro-tremors
        shimmer_amp = rng.uniform(0.065, 0.12)  # Subglottal amplitude jitter
        pause_density = rng.uniform(0.05, 0.15)  # Tense rapid breathing / fewer pauses
        syllable_rate = rng.uniform(3.6, 5.2)  # Fast speech rate
        noise_level = rng.uniform(0.018, 0.04)  # Vocal fry / breathiness
        energy_scale = rng.uniform(0.65, 0.95)

    # 1. Pitch trajectory (F0 with micro-perturbations / jitter)
    pitch_contour = target_f0 * (1.0 + f0_mod_depth * np.sin(2 * np.pi * f0_mod_freq * t))
    jitter_noise = rng.normal(0, jitter_amp, len(t))
    instant_pitch = np.clip(pitch_contour * (1.0 + jitter_noise), 65.0, 480.0)
    phase = 2 * np.pi * np.cumsum(instant_pitch) / sr

    # 2. Harmonics (Vocal cord acoustic source)
    signal_wave = (
        0.5 * np.sin(phase)
        + 0.25 * np.sin(2 * phase)
        + 0.15 * np.sin(3 * phase)
        + 0.08 * np.sin(4 * phase)
        + 0.04 * np.sin(5 * phase)
    )

    # 3. Syllabic amplitude envelope & pauses
    num_syllables = max(4, int(syllable_rate * duration))
    envelope = np.zeros_like(t)
    syllable_times = np.linspace(0.4, duration - 0.4, num_syllables)
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

    return audio, emotion


def _process_single_sample(
    cls: str,
    speaker_f0: float,
    duration: float,
    seed_idx: int,
    sr: int,
) -> Tuple[List[float], str]:
    """Helper to generate and extract features for one sample."""
    extractor = AudioFeatureExtractor(sample_rate=sr)
    audio, label = synthesize_emotional_speech_sample(
        emotion=cls,
        speaker_f0_base=speaker_f0,
        duration=duration,
        sr=sr,
        seed=seed_idx,
    )
    feats = extractor.extract_features(audio, duration=duration)
    row = [feats[name] for name in FEATURE_NAMES]
    return row, label


def create_training_dataset(
    samples_per_class: int = 120,
    sr: int = 16000,
    random_state: int = 42,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """Generate balanced dataset of acoustic features and labels in parallel."""
    rng = np.random.default_rng(random_state)
    male_bases = np.linspace(85, 145, 10)
    female_bases = np.linspace(165, 235, 10)
    speaker_bases = np.concatenate([male_bases, female_bases])

    classes = ["Low", "Medium", "High"]
    tasks = []

    seed_idx = 1000
    for cls in classes:
        for _ in range(samples_per_class):
            speaker_f0 = float(rng.choice(speaker_bases))
            duration = float(rng.uniform(10.0, 14.0))
            seed_idx += 1
            tasks.append((cls, speaker_f0, duration, seed_idx, sr))

    logger.info("Extracting features for %d samples in parallel...", len(tasks))
    results = Parallel(n_jobs=-1)(
        delayed(_process_single_sample)(*t) for t in tasks
    )

    X_list = [r[0] for r in results]
    y_list = [r[1] for r in results]

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list)

    return X, y, FEATURE_NAMES
