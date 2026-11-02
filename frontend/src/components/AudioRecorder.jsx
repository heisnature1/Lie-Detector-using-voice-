import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Sparkles, AlertCircle } from "lucide-react";

export default function AudioRecorder({ onAudioReady, isAnalyzing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioUrl]);

  // Canvas visualizer loop
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
        gradient.addColorStop(0, "#0284c7");
        gradient.addColorStop(1, "#38bdf8");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    render();
  };

  const startRecording = async () => {
    setMicError(null);
    setRecordedBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // keep natural vocal nuances for stress analysis
          autoGainControl: true,
        },
      });

      // Set up AudioContext for live canvas visualization
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Choose supported MIME type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const options = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioCtx.state !== "closed") audioCtx.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect 250ms chunks
      setIsRecording(true);

      // Start duration counter
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setDuration(elapsed);

        // Auto-stop at 60s max limit
        if (elapsed >= 60) {
          stopRecording();
        }
      }, 100);

      // Start canvas drawing
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
    setIsRecording(false);
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setRecordedBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setMicError(null);
  };

  const handleAnalyze = () => {
    if (!recordedBlob) return;
    onAudioReady(recordedBlob, "mic_recording.webm");
  };

  const isMinDurationMet = duration >= 10.0;
  const progressPct = Math.min(100, (duration / 60) * 100);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      {micError && (
        <div className="mb-6 p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p>{micError}</p>
        </div>
      )}

      {/* Recording Visualizer & Status */}
      <div className="relative mb-6 rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden h-40 flex flex-col items-center justify-center p-4">
        {isRecording ? (
          <>
            <canvas ref={canvasRef} width="400" height="120" className="w-full h-full opacity-80" />
            <div className="absolute top-3 left-4 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Recording Active
              </span>
            </div>
            <div className="absolute bottom-3 right-4 font-mono text-xl font-bold text-white bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
              {duration.toFixed(1)}s / 60.0s
            </div>
          </>
        ) : recordedBlob ? (
          <div className="w-full text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span>Recording Complete ({duration.toFixed(1)}s)</span>
            </div>
            <div className="max-w-md mx-auto">
              <audio src={audioUrl} controls className="w-full rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-sky-400">
              <Mic className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Ready to Record Voice Clip</p>
            <p className="text-xs text-slate-400">
              Speak naturally for 10 to 60 seconds (describe your day or read any passage).
            </p>
          </div>
        )}
      </div>

      {/* Progress & Duration Requirement Bar */}
      {isRecording && (
        <div className="mb-6 space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className={isMinDurationMet ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {isMinDurationMet ? "✓ Minimum 10s Reached (Ready to analyze)" : "Recording: Need at least 10s"}
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
            <span className="text-amber-400">10s (Min)</span>
            <span>60s (Max)</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {!isRecording && !recordedBlob && (
          <button
            onClick={startRecording}
            className="flex items-center space-x-2.5 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Mic className="w-5 h-5" />
            <span>Start Recording Voice</span>
          </button>
        )}

        {isRecording && (
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
              {isMinDurationMet ? "Stop & Review Recording" : `Keep speaking... (${(10 - duration).toFixed(0)}s left)`}
            </span>
          </button>
        )}

        {recordedBlob && (
          <>
            <button
              onClick={handleReset}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition-colors border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Record Again</span>
            </button>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || duration < 10.0}
              className="flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              <span>Analyze Stress Indicators</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
