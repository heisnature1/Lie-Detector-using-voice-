"""Audio feature extraction module for VoiceStress.

Extracts vocal stress correlates and baseline-to-test deltas:
- Pitch (F0 mean, std, range)
- Jitter (fundamental frequency micro-variations)
- Shimmer (amplitude micro-variations)
- Speech rate (syllable/onset pacing)
- Pause metrics (count, total duration, mean duration, silence ratio)
- Energy metrics (RMS variance, mean, std)
- 13 Mel-Frequency Cepstral Coefficients (MFCC means)
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import av
import librosa
import numpy as np
import scipy.signal as signal
import soundfile as sf

from backend.app.config import TARGET_SAMPLE_RATE

logger = logging.getLogger(__name__)

# Ordered feature list for individual audio clips
FEATURE_NAMES: List[str] = [
    "pitch_f0_mean",
    "pitch_f0_std",
    "pitch_f0_range",
    "jitter_local",
    "shimmer_local",
    "speech_rate",
    "pause_count",
    "pause_total_duration",
    "pause_mean_duration",
    "pause_ratio",
    "energy_variance",
    "energy_std",
    "energy_mean",
    "mfcc_1",
    "mfcc_2",
    "mfcc_3",
    "mfcc_4",
    "mfcc_5",
    "mfcc_6",
    "mfcc_7",
    "mfcc_8",
    "mfcc_9",
    "mfcc_10",
    "mfcc_11",
    "mfcc_12",
    "mfcc_13",
]

# Ordered delta feature list (test clip minus baseline clip)
DELTA_FEATURE_NAMES: List[str] = [
    "delta_pitch_f0_mean",
    "delta_pitch_f0_std",
    "delta_pitch_f0_range",
    "delta_jitter_local",
    "delta_shimmer_local",
    "delta_speech_rate",
    "delta_pause_ratio",
    "delta_energy_variance",
    "delta_energy_std",
    "delta_mfcc_1",
    "delta_mfcc_2",
    "delta_mfcc_3",
    "delta_mfcc_4",
    "delta_mfcc_5",
    "delta_mfcc_6",
    "delta_mfcc_7",
    "delta_mfcc_8",
    "delta_mfcc_9",
    "delta_mfcc_10",
    "delta_mfcc_11",
    "delta_mfcc_12",
    "delta_mfcc_13",
]


class AudioLoadError(Exception):
    """Raised when audio decoding fails."""


def decode_audio_bytes(
    audio_data: Union[bytes, io.BytesIO, Path, str],
    target_sr: int = TARGET_SAMPLE_RATE,
) -> Tuple[np.ndarray, float]:
    """Decode audio bytes or file path to mono float32 numpy array.

    Supports WAV, MP3, WebM (Opus/Vorbis), OGG, FLAC via PyAV / SoundFile.

    Args:
        audio_data: Raw audio bytes, BytesIO buffer, or filesystem path.
        target_sr: Desired output sample rate.

    Returns:
        Tuple of (audio_array, duration_seconds).
    """
    buffer: Union[io.BytesIO, str]
    if isinstance(audio_data, bytes):
        buffer = io.BytesIO(audio_data)
    elif isinstance(audio_data, (Path, str)):
        buffer = str(audio_data)
    else:
        buffer = audio_data

    # Attempt 1: PyAV (Universal container & codec decoder)
    try:
        if isinstance(buffer, io.BytesIO):
            buffer.seek(0)
        container = av.open(buffer)
        audio_streams = [s for s in container.streams if s.type == "audio"]
        if not audio_streams:
            raise AudioLoadError("No audio stream found in container.")

        audio_stream = audio_streams[0]
        resampler = av.AudioResampler(format="fltp", layout="mono", rate=target_sr)

        frames: List[np.ndarray] = []
        for frame in container.decode(audio_stream):
            for resampled_frame in resampler.resample(frame):
                frames.append(resampled_frame.to_ndarray())

        # Flush resampler buffer
        for flushed_frame in resampler.resample(None):
            frames.append(flushed_frame.to_ndarray())

        container.close()

        if not frames:
            raise AudioLoadError("Decoded audio stream contained zero frames.")

        y = np.concatenate(frames, axis=1).squeeze().astype(np.float32)
        duration = float(len(y) / target_sr)
        return y, duration

    except Exception as av_err:
        logger.debug("PyAV decode failed, trying soundfile fallback: %s", av_err)

    # Attempt 2: SoundFile fallback
    try:
        if isinstance(buffer, io.BytesIO):
            buffer.seek(0)
        y, sr = sf.read(buffer, dtype="float32")
        if y.ndim > 1:
            y = np.mean(y, axis=1)  # Convert to mono
        if sr != target_sr:
            y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
        duration = float(len(y) / target_sr)
        return y, duration
    except Exception as sf_err:
        raise AudioLoadError(f"Failed to decode audio file: {sf_err}") from sf_err


class AudioFeatureExtractor:
    """Extracts acoustic and vocal stress features from raw audio waveform."""

    def __init__(self, sample_rate: int = TARGET_SAMPLE_RATE) -> None:
        self.sample_rate = sample_rate

    def extract_features(
        self,
        y: np.ndarray,
        duration: Optional[float] = None,
    ) -> Dict[str, float]:
        """Extract all 26 acoustic features from audio array."""
        if duration is None or duration <= 0:
            duration = float(len(y) / self.sample_rate)

        if len(y) == 0:
            raise ValueError("Audio signal is empty.")

        # Normalize waveform amplitude to [-1, 1] range to prevent scale bias
        max_abs = float(np.max(np.abs(y)))
        if max_abs > 1e-5:
            y_norm = y / max_abs
        else:
            y_norm = y

        # 1. Fundamental Frequency (F0 Pitch) & Jitter via Downsampled YIN
        sr_f0 = 4000
        down_factor = max(1, int(self.sample_rate / sr_f0))
        y_f0 = signal.resample_poly(y_norm, up=1, down=down_factor)

        # Vocal range: 65 Hz (deep bass) to 500 Hz (high soprano / stressed voice)
        f0_curve = librosa.yin(
            y_f0,
            fmin=65,
            fmax=500,
            sr=sr_f0,
            frame_length=512,
            hop_length=128,
        )

        voiced_mask = (f0_curve >= 65.0) & (f0_curve <= 500.0)
        voiced_f0 = f0_curve[voiced_mask]

        if len(voiced_f0) > 0:
            pitch_f0_mean = float(np.mean(voiced_f0))
            pitch_f0_std = float(np.std(voiced_f0))
            pitch_f0_range = float(np.ptp(voiced_f0))
        else:
            pitch_f0_mean = 120.0
            pitch_f0_std = 0.0
            pitch_f0_range = 0.0

        # Jitter: Relative cycle-to-cycle frequency variation (Period perturbation)
        if len(voiced_f0) > 1:
            periods = 1.0 / voiced_f0
            period_diffs = np.abs(np.diff(periods))
            jitter_local = float(np.mean(period_diffs) / (np.mean(periods) + 1e-9))
        else:
            jitter_local = 0.0

        # 2. RMS Energy & Shimmer (Amplitude micro-variations)
        rms = librosa.feature.rms(y=y_norm, frame_length=2048, hop_length=512)[0]
        energy_variance = float(np.var(rms))
        energy_std = float(np.std(rms))
        energy_mean = float(np.mean(rms))

        # Shimmer: Relative cycle-to-cycle amplitude perturbation
        if len(rms) > 1 and energy_mean > 1e-6:
            rms_diffs = np.abs(np.diff(rms))
            shimmer_local = float(np.mean(rms_diffs) / (energy_mean + 1e-9))
        else:
            shimmer_local = 0.0

        # 3. Speech Rate & Pause Metrics
        onsets = librosa.onset.onset_detect(
            y=y_norm,
            sr=self.sample_rate,
            hop_length=512,
            backtrack=False,
        )
        speech_rate = float(len(onsets) / max(0.1, duration))

        # Silence / Pause detection using top_db=30 split
        non_silent_intervals = librosa.effects.split(y=y_norm, top_db=30)
        if len(non_silent_intervals) > 0:
            non_silent_duration = sum(
                (end - start) for start, end in non_silent_intervals
            ) / self.sample_rate
            pause_total_duration = max(0.0, duration - non_silent_duration)
            pause_ratio = float(pause_total_duration / max(0.1, duration))

            if len(non_silent_intervals) > 1:
                internal_pauses = [
                    (non_silent_intervals[i + 1][0] - non_silent_intervals[i][1])
                    / self.sample_rate
                    for i in range(len(non_silent_intervals) - 1)
                ]
                significant_pauses = [p for p in internal_pauses if p >= 0.15]
                pause_count = float(len(significant_pauses))
                pause_mean_duration = (
                    float(np.mean(significant_pauses)) if significant_pauses else 0.0
                )
            else:
                pause_count = 0.0
                pause_mean_duration = 0.0
        else:
            pause_total_duration = duration
            pause_ratio = 1.0
            pause_count = 1.0
            pause_mean_duration = duration

        # 4. Mel-Frequency Cepstral Coefficients (13 MFCC Means)
        mfccs = librosa.feature.mfcc(
            y=y_norm,
            sr=self.sample_rate,
            n_mfcc=13,
            hop_length=512,
        )
        mfcc_means = np.mean(mfccs, axis=1)

        features: Dict[str, float] = {
            "pitch_f0_mean": pitch_f0_mean,
            "pitch_f0_std": pitch_f0_std,
            "pitch_f0_range": pitch_f0_range,
            "jitter_local": jitter_local,
            "shimmer_local": shimmer_local,
            "speech_rate": speech_rate,
            "pause_count": pause_count,
            "pause_total_duration": pause_total_duration,
            "pause_mean_duration": pause_mean_duration,
            "pause_ratio": pause_ratio,
            "energy_variance": energy_variance,
            "energy_std": energy_std,
            "energy_mean": energy_mean,
        }

        for i in range(13):
            features[f"mfcc_{i + 1}"] = float(mfcc_means[i])

        return features

    def extract_from_bytes(
        self,
        audio_bytes: Union[bytes, io.BytesIO, Path, str],
    ) -> Tuple[Dict[str, float], float]:
        """Decode audio and extract acoustic feature dictionary."""
        y, duration = decode_audio_bytes(audio_bytes, target_sr=self.sample_rate)
        features = self.extract_features(y, duration=duration)
        return features, duration


def extract_audio_features(
    audio_data: Union[bytes, io.BytesIO, Path, str],
) -> Tuple[Dict[str, float], float]:
    """Helper function to extract features directly from raw audio."""
    extractor = AudioFeatureExtractor()
    return extractor.extract_from_bytes(audio_data)


def compute_delta_features(
    baseline_features: Dict[str, float],
    test_features: Dict[str, float],
) -> Dict[str, float]:
    """Compute the delta feature dictionary (test clip minus baseline clip)."""
    deltas: Dict[str, float] = {
        "delta_pitch_f0_mean": test_features["pitch_f0_mean"] - baseline_features["pitch_f0_mean"],
        "delta_pitch_f0_std": test_features["pitch_f0_std"] - baseline_features["pitch_f0_std"],
        "delta_pitch_f0_range": test_features["pitch_f0_range"] - baseline_features["pitch_f0_range"],
        "delta_jitter_local": test_features["jitter_local"] - baseline_features["jitter_local"],
        "delta_shimmer_local": test_features["shimmer_local"] - baseline_features["shimmer_local"],
        "delta_speech_rate": test_features["speech_rate"] - baseline_features["speech_rate"],
        "delta_pause_ratio": test_features["pause_ratio"] - baseline_features["pause_ratio"],
        "delta_energy_variance": test_features["energy_variance"] - baseline_features["energy_variance"],
        "delta_energy_std": test_features["energy_std"] - baseline_features["energy_std"],
    }

    for i in range(1, 14):
        mfcc_key = f"mfcc_{i}"
        deltas[f"delta_mfcc_{i}"] = test_features[mfcc_key] - baseline_features[mfcc_key]

    return deltas


def delta_dict_to_vector(delta_features: Dict[str, float]) -> np.ndarray:
    """Convert delta feature dictionary to ordered numpy vector for ML model."""
    return np.array([delta_features[name] for name in DELTA_FEATURE_NAMES], dtype=np.float32)


def feature_dict_to_vector(features: Dict[str, float]) -> np.ndarray:
    """Convert feature dictionary to ordered numpy feature vector for ML model."""
    return np.array([features[name] for name in FEATURE_NAMES], dtype=np.float32)
