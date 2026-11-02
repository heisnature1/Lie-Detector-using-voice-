import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Check, ArrowRight, Play, RotateCcw, AlertCircle, Info, Sparkles } from "lucide-react";
import AudioVisualizer3D from "./AudioVisualizer3D";
import Card3D from "./Card3D";

const BASELINE_PROMPTS = [
  "State your full name and what city or town you are currently in.",
  "Describe what you had for breakfast or lunch today in a calm, normal tone.",
  "Count from one to ten at a steady, conversational pace.",
];

export default function LiveSessionRecorder({ onAnalyze, isLoading }) {
  // Step 1 = Calibration baseline, Step 2 = Test response
  const [step, setStep] = useState(1);
  const [promptIndex, setPromptIndex] = useState(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Stored audio blobs
  const [baselineBlob, setBaselineBlob] = useState(null);
  const [testBlob, setTestBlob] = useState(null);
  const [baselineUrl, setBaselineUrl] = useState(null);
  const [testUrl, setTestUrl] = useState(null);

  // Media references
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg("");
    audioChunksRef.current = [];
    setElapsedSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio Analyser for 3D Visualizer
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Setup MediaRecorder
      const options = { mimeType: "audio/webm" };
      let mediaRecorder;
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mediaRecorder = new MediaRecorder(stream, options);
      } else {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);

        if (step === 1) {
          setBaselineBlob(audioBlob);
          setBaselineUrl(url);
        } else {
          setTestBlob(audioBlob);
          setTestUrl(url);
        }

        // Clean up tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(seconds);

        // Auto-stop at 60s
        if (seconds >= 60) {
          stopRecording();
        }
      }, 250);
    } catch (err) {
      console.error("Microphone access error:", err);
      setErrorMsg(
        "Could not access your microphone. Please allow microphone permissions in your browser."
      );
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (elapsedSeconds < 5) {
      setErrorMsg("Recording must be at least 5 seconds long to extract reliable acoustics.");
    }
  };

  const proceedToTest = () => {
    if (!baselineBlob || elapsedSeconds < 5) {
      setErrorMsg("Please record at least 5 seconds for calibration before continuing.");
      return;
    }
    setErrorMsg("");
    setStep(2);
    setElapsedSeconds(0);
  };

  const handleReset = () => {
    setStep(1);
    setBaselineBlob(null);
    setTestBlob(null);
    setBaselineUrl(null);
    setTestUrl(null);
    setElapsedSeconds(0);
    setErrorMsg("");
  };

  const handleSubmit = () => {
    if (!baselineBlob || !testBlob) {
      setErrorMsg("Both baseline and test recordings are required.");
      return;
    }
    onAnalyze(baselineBlob, testBlob);
  };

  const isMinTimeMet = elapsedSeconds >= 5;

  return (
    <div className="space-y-6">
      {/* Step Progression Bar */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            step === 1
              ? "bg-studio-800/80 border-accent-emerald/40 shadow-glow-emerald"
              : baselineBlob
              ? "bg-studio-900/60 border-studio-700 text-studio-400"
              : "bg-studio-950/40 border-studio-850 opacity-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-accent-emerald uppercase tracking-wider">
              Step 1 of 2
            </span>
            {baselineBlob && <Check className="w-4 h-4 text-accent-emerald" />}
          </div>
          <p className="text-sm font-bold text-white mt-1">Neutral Calibration</p>
          <p className="text-xs text-studio-400 mt-0.5">Establishes your acoustic baseline</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            step === 2
              ? "bg-studio-800/80 border-accent-amber/40 shadow-glow-amber"
              : testBlob
              ? "bg-studio-900/60 border-studio-700 text-studio-400"
              : "bg-studio-950/40 border-studio-850 opacity-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-accent-amber uppercase tracking-wider">
              Step 2 of 2
            </span>
            {testBlob && <Check className="w-4 h-4 text-accent-amber" />}
          </div>
          <p className="text-sm font-bold text-white mt-1">Statement Analysis</p>
          <p className="text-xs text-studio-400 mt-0.5">Tested for differential stress shift</p>
        </div>
      </div>

      {/* Main Studio Card */}
      <Card3D depth={8} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Step Header & Prompt */}
        <div className="border-b border-studio-800 pb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-studio-400 uppercase tracking-wider">
              {step === 1 ? "Calibration Guidance" : "Test Statement Prompt"}
            </span>
            {step === 1 && (
              <button
                type="button"
                onClick={() => setPromptIndex((prev) => (prev + 1) % BASELINE_PROMPTS.length)}
                className="text-xs text-accent-teal hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Change Prompt
              </button>
            )}
          </div>

          <p className="text-lg sm:text-xl font-bold text-white leading-snug">
            {step === 1
              ? `"${BASELINE_PROMPTS[promptIndex]}"`
              : "Speak your statement or answer the target question clearly into your microphone."}
          </p>

          <p className="text-xs text-studio-400 mt-2">
            {step === 1
              ? "Speak at your natural pace and volume for 5–15 seconds to establish an accurate personal baseline."
              : "State the claim or answer for 5–30 seconds. The model calculates the differential acoustic shift against your baseline."}
          </p>
        </div>

        {/* 3D Acoustic Waveform Visualizer */}
        <div className="relative h-44 rounded-2xl bg-studio-950 border border-studio-800/80 overflow-hidden flex flex-col items-center justify-center">
          <AudioVisualizer3D
            analyserNode={analyserRef.current}
            isRecording={isRecording}
            mode={step === 1 ? "baseline" : "test"}
          />

          {/* Recording Timer & Status Overlay */}
          <div className="absolute top-3 left-4 flex items-center space-x-2 bg-studio-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording
                  ? "bg-accent-rose animate-ping"
                  : (step === 1 ? baselineBlob : testBlob)
                  ? "bg-accent-emerald"
                  : "bg-studio-500"
              }`}
            />
            <span className="text-xs font-mono font-bold text-white">
              {isRecording
                ? `Recording: ${elapsedSeconds}s (Min 5s)`
                : (step === 1 ? baselineBlob : testBlob)
                ? `Recorded: ${elapsedSeconds}s`
                : "Microphone Ready"}
            </span>
          </div>

          {!isRecording && !(step === 1 ? baselineBlob : testBlob) && (
            <p className="absolute bottom-4 text-xs text-studio-400 pointer-events-none">
              Click Start Recording below to begin
            </p>
          )}
        </div>

        {/* Playback preview if recorded */}
        {((step === 1 && baselineUrl) || (step === 2 && testUrl)) && !isRecording && (
          <div className="p-3 bg-studio-900/60 rounded-xl border border-studio-800 flex items-center justify-between">
            <span className="text-xs text-studio-300 font-medium">Review Audio Clip:</span>
            <audio
              src={step === 1 ? baselineUrl : testUrl}
              controls
              className="h-8 max-w-[280px]"
            />
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center space-x-2 text-accent-rose bg-accent-rose/10 border border-accent-rose/30 p-3 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Studio Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="btn-3d px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent-emerald to-accent-teal hover:from-emerald-400 hover:to-teal-400 text-studio-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-accent-emerald/20 border-b-2 border-emerald-700"
            >
              <Mic className="w-4 h-4" />
              {step === 1
                ? baselineBlob
                  ? "Re-record Calibration"
                  : "Start Calibration Recording"
                : testBlob
                ? "Re-record Test Statement"
                : "Start Statement Recording"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className={`btn-3d px-6 py-3.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 shadow-lg border-b-2 ${
                isMinTimeMet
                  ? "bg-accent-rose hover:bg-rose-600 shadow-accent-rose/30 border-rose-800 animate-pulse"
                  : "bg-studio-700 border-studio-850 cursor-not-allowed opacity-80"
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              {isMinTimeMet ? "Stop Recording (Auto-Save)" : `Recording (${5 - elapsedSeconds}s remaining)`}
            </button>
          )}

          {/* Navigation & Submit */}
          <div className="flex items-center space-x-3">
            {step === 2 && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border border-studio-700 hover:bg-studio-800 text-studio-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start Over
              </button>
            )}

            {step === 1 && baselineBlob && (
              <button
                type="button"
                onClick={proceedToTest}
                disabled={isRecording || elapsedSeconds < 5}
                className="btn-3d px-6 py-3.5 rounded-xl bg-studio-100 hover:bg-white text-studio-950 font-bold text-sm flex items-center gap-2 shadow-lg border-b-2 border-studio-300 disabled:opacity-50"
              >
                Proceed to Test Statement
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && testBlob && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || isRecording || elapsedSeconds < 5}
                className="btn-3d px-7 py-3.5 rounded-xl bg-gradient-to-r from-accent-amber to-amber-500 hover:from-amber-400 hover:to-amber-500 text-studio-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-accent-amber/20 border-b-2 border-amber-600 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-studio-950 border-t-transparent rounded-full animate-spin" />
                    Extracting Delta Vectors...
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Compute Differential Stress Analysis
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Card3D>
    </div>
  );
}
