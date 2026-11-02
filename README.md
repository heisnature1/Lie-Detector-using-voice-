# VoiceStress — Acoustic Voice Stress Analyzer (MVP)

> **Important Ethics & Legal Notice**: VoiceStress is designed strictly as an entertainment and exploratory acoustics research demonstration. Vocal stress analysis is **NOT a scientifically validated lie detector** and must never be used for hiring, legal, security, relationship, or accusatory decisions.

---

## 📌 Overview

**VoiceStress** is a full-stack web application that allows users to record or upload a 10–60 second voice clip and receive:
1. **Stress Likelihood Score**: Categorized as **Low**, **Medium**, or **High**.
2. **Model Confidence**: Probability score (0.0 to 1.0).
3. **Top 3 Contributing Signals**: Key acoustic markers (e.g., Pitch $F_0$ variability, vocal jitter micro-tremors, amplitude shimmer, speech pacing) with plain-English physiological explanations.
4. **Mandatory Research Disclaimer**: Prominently displayed across all UI screens and API responses.
5. **Zero Persistent Audio Storage**: Audio streams are processed strictly in ephemeral memory and immediately discarded.

---

## 🛠 Tech Stack

- **Backend**: Python 3.11, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn, Pydantic v2
- **Audio Processing**: [librosa](https://librosa.org/), [PyAV (av)](https://pyav.org/) (handles WebM Opus, MP3, WAV, OGG, FLAC in-memory), [soundfile](https://pysoundfile.readthedocs.io/), SciPy, NumPy
- **Machine Learning**: [scikit-learn](https://scikit-learn.org/) (Random Forest Classifier baseline), [joblib](https://joblib.readthedocs.io/)
- **Frontend**: [React 18](https://react.dev/), [Vite](https://vitejs.dev/), Tailwind CSS, Lucide Icons, Browser MediaRecorder & Web Audio API
- **Testing**: [pytest](https://docs.pytest.org/), HTTPX TestClient
- **Containerization**: Docker & Docker Compose

---

## 📐 Project Structure

```text
Lie-Detector-using-voice-/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── errors.py          # Custom exceptions & structured JSON error handlers
│   │   │   └── routes.py          # POST /analyze, GET /health, GET /api/model-info
│   │   ├── features/
│   │   │   ├── explainer.py       # Plain-English vocal signal explainer
│   │   │   └── extractor.py       # 26-feature acoustic extractor (F0, Jitter, Shimmer, Pauses, MFCCs)
│   │   ├── model/
│   │   │   ├── classifier.py      # Random Forest inference & probability wrapper
│   │   │   └── artifacts/         # Saved model.joblib, scaler.joblib, model_meta.json
│   │   ├── schemas/
│   │   │   └── analysis.py        # Pydantic request/response models
│   │   ├── config.py              # Constraints (10-60s, 10MB limit), MIME types, disclaimers
│   │   └── main.py                # FastAPI app initialization, CORS, lifespan
│   ├── train/
│   │   ├── dataset.py             # Emotional speech synthesizer & RAVDESS mapping
│   │   ├── evaluate.py            # Confusion matrix, Precision/Recall/F1 reporting
│   │   ├── train.py               # Random Forest training pipeline
│   │   └── eval_report.json       # Generated evaluation metrics
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioRecorder.jsx  # MediaRecorder with live canvas waveform visualizer & timer
│   │   │   ├── FileUpload.jsx     # Drag & drop upload with client-side validation
│   │   │   ├── SampleTester.jsx   # 1-click synthetic demo audio generator (no mic required)
│   │   │   ├── StressGauge.jsx    # Tri-state score gauge (Low / Medium / High) with confidence
│   │   │   ├── SignalsList.jsx    # Top 3 driving signals with plain-English cards
│   │   │   ├── AnalysisLoader.jsx # Animated acoustic extraction loading state
│   │   │   ├── ResultScreen.jsx   # Results dashboard with playback & JSON export
│   │   │   ├── Header.jsx         # Navigation and model status badge
│   │   │   └── Disclaimer.jsx     # Ethics disclaimer banner & modal dialog
│   │   ├── services/
│   │   │   └── api.js             # API client for POST /analyze
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── test_api.py                # API endpoint tests (validation, duration, corrupt files)
│   ├── test_features.py           # Feature extraction & vector consistency tests
│   └── test_model.py              # Model inference & prediction tests
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── pytest.ini
└── README.md
```

---

## ⚡ Quick Start

### 1. Local Development Setup

#### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

#### A. Backend Setup
```bash
# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Train ML model (optional, pre-trained artifacts are included)
python backend/train/train.py --samples 100

# 4. Start the FastAPI backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at `http://localhost:8000` (OpenAPI Swagger docs at `http://localhost:8000/docs`).

#### B. Frontend Setup
```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`.

---

### 2. Docker & Docker Compose Setup

Run both services with a single command:
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:8000`

---

## 🧪 Running Tests

Run the full pytest suite (15 unit & integration tests):
```bash
pytest -v
```

Tests cover:
- 13 MFCC coefficients, $F_0$ pitch tracking, jitter, shimmer, speech rate, and pause extraction.
- Edge cases: silent audio, corrupt audio, duration $<10$s, duration $>60$s, oversized uploads.
- API response contract and schema validation.
- Model classification inference across stress levels.

---

## 📡 API Specification

### `POST /analyze`
Accepts multipart audio file (`wav`, `mp3`, `webm`, `ogg`, `flac`, max 10 MB, 10–60 s).

#### Response Schema (HTTP 200 OK):
```json
{
  "score": "High",
  "confidence": 0.945,
  "top_signals": [
    {
      "name": "Pitch Variability (F0 Std)",
      "value": 41.25,
      "explanation": "High pitch fluctuations (41.2 Hz) reflect vocal cord tension and autonomic arousal."
    },
    {
      "name": "Vocal Jitter (Frequency Instability)",
      "value": 0.0384,
      "explanation": "Elevated cycle-to-cycle frequency variation (3.84%) indicates micro-tremors in vocal fold control."
    },
    {
      "name": "Speech Pacing & Syllable Rate",
      "value": 4.12,
      "explanation": "Accelerated speech pacing (4.12 syllables/sec) correlates with autonomic sympathetic activation."
    }
  ],
  "duration_seconds": 12.0,
  "disclaimer": "VoiceStress is designed strictly as an entertainment and preliminary research tool..."
}
```

### `GET /health`
Returns service readiness and model status.

### `GET /api/model-info`
Returns model type, accuracy, classes, and list of all 26 acoustic features.

---

## 🔒 Privacy & Audio Handling Guarantee

- **Zero Persistence**: Audio data is received as an in-memory stream, decoded, and immediately discarded upon feature vector extraction.
- **No Disk Buffers**: No user audio files are saved, cached, or logged.
