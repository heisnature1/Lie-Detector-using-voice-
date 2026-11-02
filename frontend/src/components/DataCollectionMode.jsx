import React, { useState, useEffect, useRef } from "react";
import { Database, CheckCircle2, AlertCircle, Mic, Square, Sparkles, Terminal } from "lucide-react";
import { submitDatasetSession, fetchDatasetStats } from "../services/api";

export default function DataCollectionMode() {
  const [speakerId, setSpeakerId] = useState("speaker_01");
  const [promptQuestion, setPromptQuestion] = useState("Did you finish all the tasks assigned to you today?");
  const [label, setLabel] = useState("Truthful");
  const [consentGiven, setConsentGiven] = useState(true);

  const [step, setStep] = useState("baseline");
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [baselineBlob, setBaselineBlob] = useState(null);
  const [testBlob, setTestBlob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [stats, setStats] = useState({ total_sessions: 0, truthful_count: 0, deceptive_count: 0 });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const loadStats = () => {
    fetchDatasetStats().then(setStats);
  };

  useEffect(() => {
    loadStats();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setStatusMessage(null);
    setDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        if (step === "baseline") {
          setBaselineBlob(blob);
          setIsRecording(false);
          setStep("test");
        } else {
          setTestBlob(blob);
          setIsRecording(false);
          setStep("ready_to_save");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsRecording(true);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setDuration(elapsed);
        if (elapsed >= 60.0) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.error("Mic error:", err);
      setStatusMessage({ type: "error", text: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSaveToDataset = async () => {
    if (!baselineBlob || !testBlob) return;
    if (!consentGiven) {
      setStatusMessage({ type: "error", text: "Consent is required to save training data." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await submitDatasetSession({
        baselineBlob,
        testBlob,
        label,
        speakerId,
        promptQuestion,
        consentGiven,
      });

      setStatusMessage({
        type: "success",
        text: `Sample #${res.total_collected_sessions} saved successfully as '${label}'!`,
      });
      loadStats();
      setBaselineBlob(null);
      setTestBlob(null);
      setStep("baseline");
      setDuration(0);
    } catch (err) {
      console.error("Save error:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to save sample." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setBaselineBlob(null);
    setTestBlob(null);
    setStep("baseline");
    setDuration(0);
    setIsRecording(false);
    setStatusMessage(null);
  };

  const isMinDurationMet = duration >= 5.0;

  return (
    <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-dark-850 border border-dark-700 flex items-center justify-center text-neon-purple shadow-lg">
            <Database className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white font-mono">DATA COLLECTION STUDIO</h2>
            <p className="text-xs font-mono text-dark-500">
              Record consented Truth / Lie delta samples to train your custom model
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center space-x-3 bg-dark-950 px-4 py-2.5 rounded-2xl border border-dark-800 text-xs font-mono">
          <div>
            <span className="text-dark-500 block text-[10px] uppercase font-bold">TOTAL DATASET</span>
            <span className="font-extrabold text-neon-purple text-sm">{stats.total_sessions} SESSIONS</span>
          </div>
          <div className="border-l border-dark-800 pl-3">
            <span className="text-neon-mint font-bold">{stats.truthful_count} Truth</span>
            <span className="text-dark-600 mx-1.5">/</span>
            <span className="text-neon-coral font-bold">{stats.deceptive_count} Lie</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-mono border ${
            statusMessage.type === "success"
              ? "bg-neon-mint/10 border-neon-mint/30 text-neon-mint"
              : "bg-neon-coral/10 border-neon-coral/30 text-neon-coral"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <p>{statusMessage.text}</p>
        </div>
      )}

      {/* Metadata Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div>
          <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">
            SPEAKER ID
          </label>
          <input
            type="text"
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-800 rounded-xl text-xs text-white focus:outline-none focus:border-neon-purple font-mono"
            placeholder="e.g. participant_01"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">
            GROUND TRUTH LABEL
          </label>
          <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800">
            <button
              onClick={() => setLabel("Truthful")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                label === "Truthful"
                  ? "bg-neon-mint text-dark-950 shadow-md"
                  : "text-dark-500 hover:text-white"
              }`}
            >
              Truthful
            </button>
            <button
              onClick={() => setLabel("Deceptive")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                label === "Deceptive"
                  ? "bg-neon-coral text-white shadow-md"
                  : "text-dark-500 hover:text-white"
              }`}
            >
              Deceptive
            </button>
          </div>
        </div>

        <div className="sm:col-span-1">
          <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">
            INQUIRY PROMPT
          </label>
          <input
            type="text"
            value={promptQuestion}
            onChange={(e) => setPromptQuestion(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-800 rounded-xl text-xs text-white focus:outline-none focus:border-neon-purple font-mono"
          />
        </div>
      </div>

      {/* Recording Steps */}
      <div className="p-5 bg-dark-950 rounded-2xl border border-dark-800 space-y-4 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">
            {step === "baseline"
              ? "> PHASE 1: RECORD CALIBRATION BASELINE (~10-15s)"
              : step === "test"
              ? `> PHASE 2: RECORD ${label.toUpperCase()} RESPONSE (5-60s)`
              : "> PHASE 3: SAMPLE CAPTURED // READY TO STORE"}
          </span>
          <span className="text-dark-500">{duration.toFixed(1)}s / 60s</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          {step !== "ready_to_save" ? (
            !isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-6 py-3.5 bg-neon-purple hover:bg-neon-purple/90 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-neon-purple/20 transition-all transform hover:scale-[1.02] active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>
                  {step === "baseline" ? "CAPTURE CALIBRATION" : `CAPTURE ${label.toUpperCase()} CLIP`}
                </span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                disabled={!isMinDurationMet}
                className={`flex items-center space-x-2 px-6 py-3.5 font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all ${
                  isMinDurationMet
                    ? "bg-neon-coral text-white shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-95"
                    : "bg-dark-800 text-dark-500 cursor-not-allowed border border-dark-700"
                }`}
              >
                <Square className="w-4 h-4 fill-current" />
                <span>
                  {isMinDurationMet
                    ? "STOP CAPTURE"
                    : `SPEAKING... (${(5 - duration).toFixed(0)}s LEFT)`}
                </span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-dark-850 hover:bg-dark-800 text-dark-500 hover:text-white rounded-xl text-xs font-mono font-bold"
              >
                DISCARD & RETRY
              </button>

              <button
                onClick={handleSaveToDataset}
                disabled={isSubmitting || !consentGiven}
                className="flex items-center space-x-2 px-7 py-3 bg-neon-mint hover:bg-neon-mint/90 text-dark-950 font-mono font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-neon-mint/20 transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? "STORING..." : `STORE '${label.toUpperCase()}' SAMPLE`}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Informed Consent Checkbox */}
      <div className="flex items-start space-x-3 p-3.5 bg-dark-950/60 rounded-xl border border-dark-800 font-mono text-xs">
        <input
          type="checkbox"
          id="consentCheckbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-neon-purple focus:ring-neon-purple bg-dark-900 border-dark-700"
        />
        <label htmlFor="consentCheckbox" className="text-dark-500 leading-relaxed cursor-pointer font-sans text-xs">
          <strong className="text-slate-300 font-mono">INFORMED RESEARCH CONSENT:</strong> I confirm this voice sample was recorded with the speaker's informed consent strictly for acoustic modeling and calibration training.
        </label>
      </div>
    </div>
  );
}
