import React, { useState, useEffect, useRef } from "react";
import { Database, ShieldCheck, Check, AlertCircle, Mic, Square, Sparkles, UploadCloud } from "lucide-react";
import AudioVisualizer3D from "./AudioVisualizer3D";
import Card3D from "./Card3D";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function DataCollectionMode() {
  const [hasConsent, setHasConsent] = useState(false);
  const [label, setLabel] = useState("truthful");
  const [sessionNotes, setSessionNotes] = useState("");
  const [stats, setStats] = useState(null);

  // Step state: 1 = baseline, 2 = test statement
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [baselineBlob, setBaselineBlob] = useState(null);
  const [testBlob, setTestBlob] = useState(null);
  const [baselineUrl, setBaselineUrl] = useState(null);
  const [testUrl, setTestUrl] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dataset/stats`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setStats(data);
        } catch (e) {
          console.warn("Stats endpoint did not return JSON:", text.slice(0, 50));
        }
      }
    } catch (e) {
      console.warn("Could not fetch dataset stats", e);
    }
  };

  useEffect(() => {
    fetchStats();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg("");
    setSubmitSuccess(false);
    audioChunksRef.current = [];
    setElapsedSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        if (step === 1) {
          setBaselineBlob(blob);
          setBaselineUrl(url);
        } else {
          setTestBlob(blob);
          setTestUrl(url);
        }
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(sec);
        if (sec >= 60) stopRecording();
      }, 250);
    } catch (err) {
      setErrorMsg("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSaveToDataset = async () => {
    if (!hasConsent) {
      setErrorMsg("Participant consent is required before saving recording data.");
      return;
    }
    if (!baselineBlob || !testBlob) {
      setErrorMsg("Both baseline and labeled test recordings are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("baseline_file", baselineBlob, "baseline.webm");
    formData.append("test_file", testBlob, "test.webm");
    formData.append("baseline_audio", baselineBlob, "baseline.webm");
    formData.append("test_audio", testBlob, "test.webm");
    formData.append("label", label);
    formData.append("consent", "true");
    formData.append("consent_given", "true");
    formData.append("notes", sessionNotes);

    try {
      const res = await fetch(`${API_BASE}/api/dataset/collect`, {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text();
      let resData = {};
      try {
        resData = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(
          `Server returned HTTP ${res.status}. Expected JSON response from /api/dataset/collect.`
        );
      }

      if (!res.ok) {
        throw new Error(resData.detail || resData.message || "Submission failed");
      }

      setSubmitSuccess(true);
      setBaselineBlob(null);
      setTestBlob(null);
      setBaselineUrl(null);
      setTestUrl(null);
      setStep(1);
      setSessionNotes("");
      fetchStats();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save sample session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="border-b border-studio-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-accent-teal" />
            Vocal Dataset Collection Studio
          </h3>
          <p className="text-xs text-studio-400 mt-1">
            Contribute consented, calibrated audio pairs to expand and refine custom training datasets.
          </p>
        </div>

        {stats && (
          <div className="bg-studio-900/80 px-4 py-2 rounded-xl border border-studio-800 flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-studio-400 block text-[10px]">TOTAL COLLECTED</span>
              <span className="text-white font-bold">{stats.total_sessions || stats.total_collected || 0}</span>
            </div>
            <div>
              <span className="text-accent-emerald block text-[10px]">TRUTHFUL</span>
              <span className="text-accent-emerald font-bold">{stats.truthful_count || 0}</span>
            </div>
            <div>
              <span className="text-accent-rose block text-[10px]">DECEPTIVE</span>
              <span className="text-accent-rose font-bold">{stats.deceptive_count || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Consent Section */}
      <Card3D depth={8} className="glass-panel rounded-2xl p-6">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => setHasConsent(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-studio-600 bg-studio-950 text-accent-emerald focus:ring-accent-emerald/40"
          />
          <div className="space-y-1">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-emerald" />
              Informed Research Consent
            </span>
            <p className="text-xs text-studio-400 leading-relaxed">
              I consent to having these audio recordings anonymously processed, feature-extracted, and stored locally for machine learning training and calibration benchmarking. No personally identifying information will be publicly distributed.
            </p>
          </div>
        </label>
      </Card3D>

      {/* Label and Setup */}
      {hasConsent && (
        <Card3D depth={8} className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-studio-300 mb-2">
                Ground-Truth Label for Step 2 Statement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLabel("truthful")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    label === "truthful"
                      ? "bg-accent-emerald/20 border-accent-emerald text-accent-emerald shadow-glow-emerald"
                      : "bg-studio-900 border-studio-700 text-studio-400"
                  }`}
                >
                  Truthful Statement
                </button>
                <button
                  type="button"
                  onClick={() => setLabel("deceptive")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    label === "deceptive"
                      ? "bg-accent-rose/20 border-accent-rose text-accent-rose shadow-glow-rose"
                      : "bg-studio-900 border-studio-700 text-studio-400"
                  }`}
                >
                  Deceptive / High Stress
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-studio-300 mb-2">
                Session Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Quiet room, condenser mic, female speaker"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full bg-studio-950 border border-studio-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-accent-teal"
              />
            </div>
          </div>

          {/* 3D Wave Visualizer */}
          <div className="relative h-36 rounded-2xl bg-studio-950 border border-studio-800 overflow-hidden flex flex-col items-center justify-center">
            <AudioVisualizer3D
              analyserNode={analyserRef.current}
              isRecording={isRecording}
              mode={step === 1 ? "baseline" : "test"}
            />
            <div className="absolute top-2 left-3 text-xs font-mono bg-studio-900/80 px-2.5 py-1 rounded-lg border border-white/10 text-white">
              {isRecording ? `Recording (${elapsedSeconds}s)` : `Step ${step}: ${step === 1 ? "Neutral Baseline" : "Labeled Statement"}`}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="btn-3d px-5 py-3 rounded-xl bg-accent-teal hover:bg-teal-400 text-studio-950 font-bold text-xs flex items-center gap-2 shadow-lg"
              >
                <Mic className="w-4 h-4" />
                {step === 1
                  ? baselineBlob
                    ? "Re-record Baseline"
                    : "Record 5s+ Baseline"
                  : testBlob
                  ? "Re-record Statement"
                  : "Record Labeled Statement"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                disabled={elapsedSeconds < 5}
                className="btn-3d px-5 py-3 rounded-xl bg-accent-rose hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                {elapsedSeconds >= 5 ? "Stop Recording" : `Keep talking (${5 - elapsedSeconds}s)`}
              </button>
            )}

            <div className="flex items-center space-x-3">
              {step === 1 && baselineBlob && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setElapsedSeconds(0);
                  }}
                  className="btn-3d px-5 py-3 rounded-xl bg-studio-100 hover:bg-white text-studio-950 font-bold text-xs"
                >
                  Next: Labeled Statement
                </button>
              )}

              {step === 2 && testBlob && (
                <button
                  type="button"
                  onClick={handleSaveToDataset}
                  disabled={isSubmitting}
                  className="btn-3d px-6 py-3 rounded-xl bg-gradient-to-r from-accent-emerald to-accent-teal text-studio-950 font-extrabold text-xs flex items-center gap-2 shadow-lg"
                >
                  <UploadCloud className="w-4 h-4" />
                  {isSubmitting ? "Saving Sample..." : "Save to Dataset"}
                </button>
              )}
            </div>
          </div>
        </Card3D>
      )}

      {submitSuccess && (
        <div className="p-4 bg-accent-emerald/15 border border-accent-emerald/40 rounded-2xl text-accent-emerald text-xs flex items-center gap-2 font-bold animate-fadeIn">
          <Check className="w-4 h-4" />
          Successfully extracted acoustic features and committed session to training dataset!
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-accent-rose/15 border border-accent-rose/40 rounded-2xl text-accent-rose text-xs flex items-center gap-2 font-bold animate-fadeIn">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
