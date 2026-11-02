import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Activity, Disc, Radio } from "lucide-react";

const BASELINE_QUESTIONS = [
  "1. State your full name and current location.",
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Oscilloscope & Spectrum Analyzer Canvas Renderer
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDomainArray);

      // Dark background with subtle scanlines
      ctx.fillStyle = "rgba(7, 8, 11, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // 1. Draw Spectrum Bars in the background
      const barWidth = (canvas.width / bufferLength) * 1.8;
      let barX = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height * 0.75);
        const barGradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        
        if (step === "baseline") {
          barGradient.addColorStop(0, "rgba(0, 245, 155, 0.1)");
          barGradient.addColorStop(1, "rgba(0, 229, 255, 0.5)");
        } else {
          barGradient.addColorStop(0, "rgba(255, 183, 3, 0.1)");
          barGradient.addColorStop(1, "rgba(255, 51, 102, 0.5)");
        }

        ctx.fillStyle = barGradient;
        ctx.fillRect(barX, canvas.height - barHeight, barWidth - 1, barHeight);
        barX += barWidth;
      }

      // 2. Draw Oscilloscope Time-Domain Waveform on top
      ctx.lineWidth = 2.5;
      if (step === "baseline") {
        ctx.strokeStyle = "#00f59b";
        ctx.shadowColor = "#00f59b";
      } else {
        ctx.strokeStyle = "#ffb703";
        ctx.shadowColor = "#ffb703";
      }
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = timeDomainArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
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
      analyser.fftSize = 128;
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
          setIsRecording(false);
          if (baselineBlob) {
            onSessionReady(baselineBlob, blob);
          }
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
    <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {micError && (
        <div className="mb-6 p-4 bg-neon-coral/10 border border-neon-coral/30 rounded-2xl flex items-start gap-3 text-sm text-neon-coral">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{micError}</p>
        </div>
      )}

      {/* Hardware Studio Stepper Header */}
      <div className="flex items-center justify-between mb-7 pb-4 border-b border-dark-800">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs transition-all ${
              step === "baseline"
                ? "bg-neon-mint text-dark-950 shadow-[0_0_15px_rgba(0,245,155,0.5)] scale-105"
                : "bg-dark-800 text-neon-mint border border-neon-mint/30"
            }`}
          >
            {baselineBlob ? <CheckCircle2 className="w-4 h-4" /> : "01"}
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-white tracking-wide">PHASE 1: CALIBRATION</p>
            <p className="text-[11px] font-mono text-dark-500">Resting Vocal Profile (~15s)</p>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-dark-600 hidden sm:block" />

        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs transition-all ${
              step === "test"
                ? "bg-neon-amber text-dark-950 shadow-[0_0_15px_rgba(255,183,3,0.5)] scale-105"
                : "bg-dark-800 text-dark-500 border border-dark-700"
            }`}
          >
            02
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-white tracking-wide">PHASE 2: TEST INQUIRY</p>
            <p className="text-[11px] font-mono text-dark-500">Target Statement & Auto-Submit</p>
          </div>
        </div>

        {baselineBlob && (
          <button
            onClick={handleRestart}
            disabled={isRecording || isAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-500 hover:text-white text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        )}
      </div>

      {/* Calibration Questions vs Target Statement Card */}
      {step === "baseline" ? (
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-dark-850/80 border border-neon-mint/30 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neon-mint flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-neon-mint animate-pulse" />
                CALIBRATION SCRIPT // READ IN RELAXED VOICE
              </span>
              <span className="text-[10px] font-mono text-dark-500">MIN 5.0s</span>
            </div>
            <ul className="text-xs sm:text-sm text-slate-200 space-y-1.5 font-medium">
              {BASELINE_QUESTIONS.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-neon-mint font-mono font-bold">&gt;</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-dark-850/80 border border-neon-amber/30 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neon-amber flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-neon-amber animate-spin" />
                TARGET INQUIRY RESPONSE
              </span>
              <span className="text-[10px] font-mono text-neon-mint font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CALIB LOCKED ({baselineDuration.toFixed(1)}s)
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white mb-2 font-mono">
              "{customPrompt}"
            </p>
            <p className="text-xs text-dark-500">
              Deliver your response. When you click <strong>STOP</strong>, it will automatically compute the acoustic delta vector and render the verdict!
            </p>
          </div>
        </div>
      )}

      {/* Real-Time Oscilloscope Waveform & Frequency Canvas */}
      <div className="relative mb-6 rounded-2xl bg-dark-950 border border-dark-800 overflow-hidden h-40 flex flex-col items-center justify-center p-3 shadow-inner">
        {isRecording ? (
          <>
            <canvas ref={canvasRef} width="500" height="140" className="w-full h-full" />
            <div className="absolute top-3 left-4 flex items-center space-x-2 bg-dark-900/90 px-2.5 py-1 rounded-lg border border-dark-700">
              <span className="w-2 h-2 rounded-full bg-neon-coral animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neon-coral">
                {step === "baseline" ? "CALIBRATING DSP" : "ANALYZING TARGET"}
              </span>
            </div>
            <div className="absolute bottom-3 right-4 font-mono text-lg font-bold text-white bg-dark-900/90 px-3 py-1 rounded-xl border border-dark-700 shadow-lg">
              {duration.toFixed(1)}s <span className="text-xs text-dark-500">/ 60.0s</span>
            </div>
          </>
        ) : (
          <div className="text-center text-dark-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-dark-850 border border-dark-700 flex items-center justify-center mx-auto text-neon-mint shadow-lg">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-200">
              {step === "baseline"
                ? "ACOUSTIC WORKSTATION READY"
                : "CALIBRATION STORED // READY FOR TEST INQUIRY"}
            </p>
            <p className="text-[11px] font-mono text-dark-500">
              {step === "baseline"
                ? "Click START and read the 3 calibration questions in a natural tone."
                : "Click START, answer the inquiry, and click STOP to evaluate."}
            </p>
          </div>
        )}
      </div>

      {/* Progress & Timing Bar */}
      {isRecording && (
        <div className="mb-6 space-y-1.5 font-mono">
          <div className="flex justify-between text-xs">
            <span className={isMinDurationMet ? "text-neon-mint font-bold" : "text-neon-amber"}>
              {isMinDurationMet
                ? step === "baseline"
                  ? "✓ MIN 5.0s MET // CLICK STOP WHEN DONE SCRIPT"
                  : "✓ MIN 5.0s MET // CLICK STOP TO AUTO-ANALYZE"
                : `RECORDING... (${(5.0 - duration).toFixed(1)}s UNTIL MINIMUM)`}
            </span>
            <span className="text-slate-400">{duration.toFixed(1)}s</span>
          </div>
          <div className="h-2 w-full bg-dark-950 rounded-full overflow-hidden p-0.5 border border-dark-800">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isMinDurationMet ? "bg-neon-mint" : "bg-neon-amber"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Tactical Hardware Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isAnalyzing}
            className={`flex items-center space-x-2.5 px-7 py-4 font-mono font-bold rounded-2xl text-xs uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl ${
              step === "baseline"
                ? "bg-neon-mint hover:bg-neon-mint/90 text-dark-950 shadow-neon-mint/20"
                : "bg-neon-amber hover:bg-neon-amber/90 text-dark-950 shadow-neon-amber/20"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>
              {step === "baseline" ? "START CALIBRATION CAPTURE" : "START TEST INQUIRY CAPTURE"}
            </span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            disabled={!isMinDurationMet}
            className={`flex items-center space-x-2.5 px-7 py-4 font-mono font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl ${
              isMinDurationMet
                ? "bg-neon-coral hover:bg-neon-coral/90 text-white shadow-neon-coral/25 cursor-pointer transform hover:scale-[1.02] active:scale-95"
                : "bg-dark-800 text-dark-500 cursor-not-allowed border border-dark-700"
            }`}
          >
            <Square className="w-4 h-4 fill-current" />
            <span>
              {isMinDurationMet
                ? step === "baseline"
                  ? "STOP CALIBRATION & PROCEED"
                  : "STOP & AUTO-ANALYZE VERDICT"
                : `SPEAKING... (${(5.0 - duration).toFixed(0)}s LEFT)`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
