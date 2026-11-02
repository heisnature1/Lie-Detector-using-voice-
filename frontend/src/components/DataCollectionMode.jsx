import React, { useState, useEffect, useRef } from "react";
import { Database, CheckCircle2, AlertCircle, Mic, Square, Sparkles } from "lucide-react";
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
      recorder.start(250);
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Data Collection Studio</h2>
            <p className="text-xs text-slate-400">
              Record labeled Truth / Lie calibrated samples to build your own custom ML dataset
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Collected</span>
            <span className="font-mono font-bold text-purple-400 text-sm">{stats.total_sessions} sessions</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-emerald-400 font-mono font-medium">{stats.truthful_count} Truth</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-rose-400 font-mono font-medium">{stats.deceptive_count} Lie</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm border ${
            statusMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <p>{statusMessage.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Speaker Identifier
          </label>
          <input
            type="text"
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-purple-500"
            placeholder="e.g. participant_01"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Ground Truth Label
          </label>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setLabel("Truthful")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                label === "Truthful"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Truthful
            </button>
            <button
              onClick={() => setLabel("Deceptive")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                label === "Deceptive"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Deceptive (Lie)
            </button>
          </div>
        </div>

        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Inquiry Prompt
          </label>
          <input
            type="text"
            value={promptQuestion}
            onChange={(e) => setPromptQuestion(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">
            {step === "baseline"
              ? "1. Record Calibration Baseline (Neutral voice, ~10-15s)"
              : step === "test"
              ? `2. Record ${label} Response Statement (5-60s)`
              : "3. Ready to Save Calibrated Sample"}
          </span>
          <span className="font-mono text-slate-400">{duration.toFixed(1)}s / 60s</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          {step !== "ready_to_save" ? (
            !isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/25 transition-all"
              >
                <Mic className="w-4 h-4" />
                <span>
                  {step === "baseline" ? "Record Calibration Clip" : `Record ${label} Clip`}
                </span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                disabled={!isMinDurationMet}
                className={`flex items-center space-x-2 px-5 py-3 font-bold rounded-xl text-sm transition-all ${
                  isMinDurationMet
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Square className="w-4 h-4 fill-current" />
                <span>
                  {isMinDurationMet
                    ? "Stop Recording"
                    : `Keep speaking (${(5 - duration).toFixed(0)}s left)`}
                </span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel & Re-record
              </button>

              <button
                onClick={handleSaveToDataset}
                disabled={isSubmitting || !consentGiven}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? "Saving..." : `Save '${label}' Sample to Dataset`}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <input
          type="checkbox"
          id="consentCheckbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
        />
        <label htmlFor="consentCheckbox" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
          <strong className="text-slate-200">Informed Research Consent:</strong> I confirm this voice sample was recorded with the speaker's knowledge and consent strictly for academic acoustic modeling and calibration research.
        </label>
      </div>
    </div>
  );
}
