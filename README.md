# VoiceStress — Calibrated Acoustic Voice Stress & Delta Analyzer

> **Important Ethics & Legal Notice**: VoiceStress is designed strictly as an entertainment and exploratory acoustics research demonstration. Vocal stress and delta acoustic analysis are **NOT scientifically proven as a reliable lie detector** and must never be used for hiring, legal, security, relationship, or accusatory decisions.

---

## 📌 Overview

**VoiceStress** is a calibrated voice stress analysis platform utilizing differential acoustic shifts between a **neutral calibration baseline** and a **target response statement**:
1. **Live Recording First Flow**:
   - **Step 1: Calibration Baseline (~15s)**: Answers 2–3 neutral control questions (e.g., name, daily routine, counting) to measure your vocal resting acoustic profile.
   - **Step 2: Target Response (5–60s)**: Records the inquiry response and **auto-submits** upon stopping.
2. **Delta Acoustic Features**: Computes differential features ($\Delta = \text{Test} - \text{Baseline}$) for fundamental pitch ($F_0$), vocal jitter micro-tremors, amplitude shimmer, syllable rate, pause ratio, energy variance, and MFCC spectral timbre.
3. **Binary Verdict**: Categorized as **Truthful-leaning** (stable delta) or **Deception indicators** (elevated stress delta) with probability confidence.
4. **Top Driving Signals**: Identifies the top 3 differential acoustic markers with plain-English physiological explanations.
5. **Data Collection Studio**: Allows recording labeled truth/lie samples (with explicit consent) to expand the training dataset.
6. **Zero Persistent Audio Storage**: Audio streams are analyzed in ephemeral memory and immediately deleted.

---

## 🛠 Tech Stack

- **Backend**: Python 3.11, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn, Pydantic v2
- **Audio Processing**: [librosa](https://librosa.org/), [PyAV (av)](https://pyav.org/) (decodes WebM Opus, MP3, WAV, OGG, FLAC in-memory), [soundfile](https://pysoundfile.readthedocs.io/), SciPy, NumPy
- **Machine Learning**: [scikit-learn](https://scikit-learn.org/) (Random Forest Binary Classifier), [joblib](https://joblib.readthedocs.io/)
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
│   │   │   └── routes.py          # POST /analyze/session, POST /analyze, POST /api/dataset/collect
│   │   ├── features/
│   │   │   ├── explainer.py       # Plain-English delta signal explainer
│   │   │   └── extractor.py       # Acoustic extractor & delta computation (test minus baseline)
│   │   ├── model/
│   │   │   ├── classifier.py      # Binary Random Forest classifier wrapper
│   │   │   └── artifacts/         # Saved model.joblib, scaler.joblib, model_meta.json
│   │   ├── schemas/
│   │   │   └── analysis.py        # Pydantic request/response models
│   │   ├── config.py              # Constraints (5-60s, 10MB limit), MIME types, disclaimers
│   │   └── main.py                # FastAPI app initialization, CORS, lifespan
│   ├── data/
│   │   └── collected_sessions.json# User-collected labeled training dataset
│   ├── train/
│   │   ├── dataset.py             # Calibrated session pair generator & dataset loader
│   │   ├── evaluate.py            # Confusion matrix, Precision/Recall/F1 reporting
│   │   ├── train.py               # Binary delta classifier training pipeline
│   │   └── eval_report.json       # Generated evaluation metrics
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LiveSessionRecorder.jsx # Live recording with calibration wizard & AnalyserNode canvas
│   │   │   ├── DataCollectionMode.jsx  # Collect consented truth/lie samples for training
│   │   │   ├── SampleTester.jsx        # 1-click synthetic demo session pairs
│   │   │   ├── StressGauge.jsx         # Verdict meter (Truthful-leaning vs Deception indicators)
│   │   │   ├── SignalsList.jsx         # Top 3 driving delta signals breakdown
│   │   │   ├── AnalysisLoader.jsx      # Animated acoustic extraction loading state
│   │   │   ├── ResultScreen.jsx        # Verdict dashboard with dual playback & JSON export
│   │   │   ├── Header.jsx              # Navigation and model status badge
│   │   │   └── Disclaimer.jsx          # Ethics disclaimer banner & modal dialog
│   │   ├── services/
│   │   │   └── api.js                  # API client for session analysis & data collection
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── test_api.py                # Session API, validation, and data collection tests
│   ├── test_features.py           # Feature extraction & delta vector consistency tests
│   └── test_model.py              # Binary model inference & session prediction tests
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── pytest.ini
└── README.md
```

---

## ⚡ Quick Start

### 1. Local Development Setup

#### A. Backend Setup
```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Train ML model (optional, pre-trained artifacts are included)
python backend/train/train.py --samples 150

# 4. Start the FastAPI backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at `http://localhost:8000` (OpenAPI Swagger docs at `http://localhost:8000/docs`).

#### B. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`.

---

### 2. Docker Setup
```bash
docker-compose up --build
```

---

### 3. Hosting on Vercel (Frontend) + Dedicated Container (Backend)

1. **Frontend on Vercel**:
   - Set Root Directory to `frontend` (or deploy from repository root using the included `vercel.json`).
   - Framework preset: `Vite`.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
2. **Backend**:
   - Host on Render, Railway, Fly.io, or AWS using the provided `Dockerfile.backend`.
   - Configure proxy rewrites in `frontend/vercel.json` or environment variables to point to your deployed backend URL.

---

## 🧪 Running Tests

Run the full pytest suite (14 unit & integration tests):
```bash
pytest -v
```

---

## 📡 API Specification

### `POST /analyze/session`
Accepts `baseline_file` and `test_file` (multipart/form-data, 5–60s each, max 10 MB).

#### Response Schema (HTTP 200 OK):
```json
{
  "verdict": "Deception indicators",
  "confidence": 0.962,
  "top_signals": [
    {
      "name": "Pitch Shift (Δ F0 Mean)",
      "value": 38.45,
      "explanation": "Fundamental pitch rose by +38.5 Hz above calibration baseline, reflecting laryngeal tension."
    },
    {
      "name": "Vocal Jitter Perturbation (Δ Jitter)",
      "value": 0.0312,
      "explanation": "Micro-frequency instability increased by +3.12% compared to baseline, indicating micro-tremors in vocal folds."
    },
    {
      "name": "Speech Pacing Shift (Δ Syllables/s)",
      "value": 1.45,
      "explanation": "Speaking rate shifted by +1.45 syllables/sec compared to neutral answers, reflecting autonomic arousal."
    }
  ],
  "baseline_duration_seconds": 12.0,
  "test_duration_seconds": 8.5,
  "delta_metrics": {
    "delta_pitch_f0_mean": 38.45,
    "delta_jitter_local": 0.0312,
    "delta_speech_rate": 1.45
  },
  "disclaimer": "VoiceStress is an experimental acoustic research and entertainment demonstration..."
}
```

### `POST /api/dataset/collect`
Accepts `baseline_file`, `test_file`, `label` ("Truthful" | "Deceptive"), `speaker_id`, `prompt_question`, and `consent_given`. Appends session to `backend/data/collected_sessions.json`.
