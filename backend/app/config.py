"""Configuration and constants for VoiceStress application."""

from pathlib import Path
from typing import List, Set

# Base directories
BASE_DIR: Path = Path(__file__).resolve().parent.parent
BACKEND_DIR: Path = BASE_DIR
MODEL_ARTIFACTS_DIR: Path = Path(__file__).resolve().parent / "model" / "artifacts"
DATA_DIR: Path = BACKEND_DIR / "data"

# Audio Constraints
MIN_AUDIO_DURATION_SECONDS: float = 5.0
MAX_AUDIO_DURATION_SECONDS: float = 60.0
MAX_AUDIO_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
TARGET_SAMPLE_RATE: int = 16000

# Allowed MIME types and extensions
ALLOWED_EXTENSIONS: Set[str] = {".wav", ".mp3", ".webm", ".ogg", ".flac", ".m4a"}
ALLOWED_MIME_TYPES: List[str] = [
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/mp3",
    "audio/mpeg",
    "audio/webm",
    "audio/ogg",
    "audio/x-m4a",
    "audio/mp4",
    "audio/flac",
    "video/webm",
    "application/octet-stream",
]

# Model and Data Paths
MODEL_PATH: Path = MODEL_ARTIFACTS_DIR / "model.joblib"
SCALER_PATH: Path = MODEL_ARTIFACTS_DIR / "scaler.joblib"
MODEL_META_PATH: Path = MODEL_ARTIFACTS_DIR / "model_meta.json"
EVAL_REPORT_PATH: Path = BACKEND_DIR / "train" / "eval_report.json"
COLLECTED_DATA_PATH: Path = DATA_DIR / "collected_sessions.json"

# Disclaimer
STANDARD_DISCLAIMER: str = (
    "VoiceStress is an experimental acoustic research and entertainment demonstration. "
    "Voice stress and delta acoustic analysis are NOT scientifically proven as a reliable lie detector. "
    "Never use this tool for hiring, legal, relationship, or accusatory decisions."
)
