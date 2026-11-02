import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Sparkles } from "lucide-react";

const BASELINE_QUESTIONS = [
  "1. State your full name and current city.",
  "2. Describe what you had to eat or drink today in a relaxed voice.",
  "3. Count slowly from 1 to 10 in a natural, conversational tone.",
];

export default function LiveSessionRecorder({ onSessionReady, isAnalyzing }) {
  const [step, setStep] = useState("baseline"); // 'baseline' | 'test'
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [baselineBlob, setBaselineBlob] = useState(null);
  const [baselineDuration, setBaselineDuration] = useState(0);
  const [micError, setMicError] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("Did you tell the full truth about the matter in question?");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Clean up timer and AudioContext
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        if (step === "baseline") {
          gradient.addColorStop(0, "#0284c7");
          gradient.addColorStop(1, "#38bdf8");
        } else {
          gradient.addColorStop(0, "#6366f1");
          gradient.addColorStop(1, "#a855f7");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  const startRecording = async () => {
    setMicError(null);
    setDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        stream.getTracks().forEach((track) => track.stop());
        if (audioCtx.state !== "closed") audioCtx.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        if (step === "baseline") {
          setBaselineBlob(blob);
          setBaselineDuration(duration);
          setIsRecording(false);
          setStep("test");
        } else {
          // Auto-submit immediately on Stop of test question!
          setIsRecording(false);
          if (baselineBlob) {
            onSessionReady(baselineBlob, blob);
          }
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

      drawWaveform();
    } catch (err) {
      console.error("Microphone access error:", err);
      setMicError(
        "Could not access microphone. Please ensure microphone permissions are granted in your browser."
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRestart = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setStep("baseline");
    setBaselineBlob(null);
    setBaselineDuration(0);
    setDuration(0);
    setIsRecording(false);
  };

  const isMinDurationMet = duration >= 5.0;
  const progressPct = Math.min(100, (duration / 60) * 100);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      {micError && (
        <div className="mb-6 p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p>{micError}</p>
        </div>
      )}

      {/* Wizard Steps Navigation Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              step === "baseline"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}
          >
            {baselineBlob ? <CheckCircle2 className="w-4 h-4" /> : "1"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Step 1: Calibration Baseline</p>
            <p className="text-[11px] text-slate-400">Neutral voice reference (~15s)</p>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />

        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              step === "test"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            2
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Step 2: Test Inquiry</p>
            <p className="text-[11px] text-slate-400">Target response & auto-analysis</p>
          </div>
        </div>

        {baselineBlob && (
          <button
            onClick={handleRestart}
            disabled={isRecording || isAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        )}
      </div>

      {/* Step Prompt Details */}
      {step === "baseline" ? (
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-sky-950/30 border border-sky-500/30 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block mb-1">
              Calibration Protocol (Answer in a calm, relaxed voice)
            </span>
            <ul className="text-sm text-slate-200 space-y-1 font-medium">
              {BASELINE_QUESTIONS.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Target Inquiry / Statement
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Baseline Calibrated ({baselineDuration.toFixed(1)}s)
              </span>
            </div>
            <p className="text-base font-bold text-white mb-2">"{customPrompt}"</p>
            <p className="text-xs text-slate-400">
              Record your statement for 5–60s. When you click <strong>Stop</strong>, your response will be automatically analyzed against your calibration baseline!
            </p>
          </div>
        </div>
      )}

      {/* Recording Visualizer & Waveform Canvas */}
      <div className="relative mb-6 rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden h-36 flex flex-col items-center justify-center p-4">
        {isRecording ? (
          <>
            <canvas ref={canvasRef} width="400" height="120" className="w-full h-full opacity-80" />
            <div className="absolute top-3 left-4 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                {step === "baseline" ? "Recording Calibration Baseline" : "Recording Target Statement"}
              </span>
            </div>
            <div className="absolute bottom-3 right-4 font-mono text-xl font-bold text-white bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
              {duration.toFixed(1)}s / 60.0s
            </div>
          </>
        ) : (
          <div className="text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-sky-400">
              <Mic className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              {step === "baseline"
                ? "Ready to Record Calibration Baseline"
                : "Ready to Record Target Response"}
            </p>
            <p className="text-xs text-slate-400">
              {step === "baseline"
                ? "Click start and answer the 3 neutral questions (min 5s, ~15s recommended)."
                : "Click start, deliver your statement, and click Stop to auto-analyze."}
            </p>
          </div>
        )}
      </div>

      {/* Live Duration & Progress Bar */}
      {isRecording && (
        <div className="mb-6 space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className={isMinDurationMet ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {isMinDurationMet
                ? step === "baseline"
                  ? "✓ Minimum 5s Reached (Click Stop when finished answering)"
                  : "✓ Ready (Click Stop to Auto-Submit & Analyze)"
                : `Recording... (${(5.0 - duration).toFixed(1)}s until minimum)`}
            </span>
            <span className="text-slate-400 font-mono">{duration.toFixed(1)}s</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isMinDurationMet ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0s</span>
            <span className="text-amber-400">5s (Min)</span>
            <span>60s (Max)</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isAnalyzing}
            className={`flex items-center space-x-2.5 px-6 py-3.5 font-bold rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 ${
              step === "baseline"
                ? "bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25"
            }`}
          >
            <Mic className="w-5 h-5" />
            <span>
              {step === "baseline" ? "Start Calibration Recording" : "Start Statement Recording"}
            </span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            disabled={!isMinDurationMet}
            className={`flex items-center space-x-2.5 px-6 py-3.5 font-bold rounded-2xl shadow-lg transition-all ${
              isMinDurationMet
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 cursor-pointer"
                : "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
            }`}
          >
            <Square className="w-5 h-5 fill-current" />
            <span>
              {isMinDurationMet
                ? step === "baseline"
                  ? "Stop Calibration & Proceed to Step 2"
                  : "Stop & Auto-Submit for Analysis"
                : `Keep speaking... (${(5.0 - duration).toFixed(0)}s left)`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
