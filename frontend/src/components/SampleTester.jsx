import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Helper to encode audio buffer to 16-bit PCM WAV Blob in browser.
 */
function audioBufferToWavBlob(buffer) {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function synthesizeClip(ctx, baseFreq, jitterAmp, modDepth, syllableRate, pauseDensity, duration = 8.0) {
  const sr = ctx.sampleRate;
  const totalSamples = Math.floor(sr * duration);
  const buffer = ctx.createBuffer(1, totalSamples, sr);
  const data = buffer.getChannelData(0);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    const pitchMod = 1.0 + modDepth * Math.sin(2 * Math.PI * 3.0 * t);
    const jitter = (Math.random() - 0.5) * jitterAmp;
    const instPitch = baseFreq * pitchMod * (1.0 + jitter);

    phase += (2 * Math.PI * instPitch) / sr;
    const wave =
      0.5 * Math.sin(phase) +
      0.25 * Math.sin(2 * phase) +
      0.15 * Math.sin(3 * phase);

    const cycle = (t * syllableRate) % 1.0;
    const envelope = cycle < (1.0 - pauseDensity) ? Math.sin((cycle / (1.0 - pauseDensity)) * Math.PI) : 0.0;
    const noise = (Math.random() - 0.5) * 0.01;

    data[i] = wave * envelope * 0.8 + noise;
  }

  return audioBufferToWavBlob(buffer);
}

export default function SampleTester({ onSessionReady, isAnalyzing }) {
  const [loadingType, setLoadingType] = useState(null);

  const generateAndTest = (type) => {
    setLoadingType(type);
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx({ sampleRate: 16000 });

    // 1. Calibration Baseline (Neutral 130 Hz, calm)
    const baselineBlob = synthesizeClip(ctx, 130.0, 0.004, 0.02, 2.1, 0.26, 10.0);

    // 2. Test Response
    let testBlob;
    if (type === "Truthful") {
      // Near zero delta (132 Hz, low jitter)
      testBlob = synthesizeClip(ctx, 132.0, 0.005, 0.025, 2.2, 0.25, 8.0);
    } else {
      // Significant delta shift (185 Hz, high jitter, rapid pacing)
      testBlob = synthesizeClip(ctx, 185.0, 0.038, 0.12, 4.2, 0.10, 8.0);
    }

    setLoadingType(null);
    onSessionReady(baselineBlob, testBlob);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-center mt-6">
      <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
        <span>One-Click Calibrated Test Sessions (No Mic Required)</span>
      </div>
      <p className="text-xs text-slate-400 mb-4 max-w-lg mx-auto">
        Test delta feature extraction instantly using pre-calibrated baseline and statement session pairs:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
        <button
          onClick={() => generateAndTest("Truthful")}
          disabled={isAnalyzing}
          className="p-3.5 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Truthful-Leaning Session
            </span>
            <span className="text-[10px] text-slate-400 font-mono">10s base + 8s test</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Steady fundamental frequency (&Delta;F0 &approx; 0 Hz), minimal jitter delta, consistent breath pacing.
          </p>
        </button>

        <button
          onClick={() => generateAndTest("Deceptive")}
          disabled={isAnalyzing}
          className="p-3.5 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 hover:border-rose-500/60 rounded-xl text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Deception Indicators Session
            </span>
            <span className="text-[10px] text-slate-400 font-mono">10s base + 8s test</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Elevated pitch delta (&Delta;F0 &gt; +50 Hz), high jitter perturbation, hurried speech rate.
          </p>
        </button>
      </div>
    </div>
  );
}
