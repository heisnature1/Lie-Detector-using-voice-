import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";

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

    const baselineBlob = synthesizeClip(ctx, 130.0, 0.004, 0.02, 2.1, 0.26, 10.0);

    let testBlob;
    if (type === "Truthful") {
      testBlob = synthesizeClip(ctx, 132.0, 0.005, 0.025, 2.2, 0.25, 8.0);
    } else {
      testBlob = synthesizeClip(ctx, 185.0, 0.038, 0.12, 4.2, 0.10, 8.0);
    }

    setLoadingType(null);
    onSessionReady(baselineBlob, testBlob);
  };

  return (
    <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-6 text-center mt-6 backdrop-blur-md">
      <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-dark-500 uppercase tracking-widest mb-1.5">
        <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
        <span>HARDWARE DEMO PRESETS // ONE-CLICK EVALUATION</span>
      </div>
      <p className="text-xs font-mono text-dark-500 mb-5 max-w-lg mx-auto">
        Test calibrated delta feature modeling using pre-computed synthetic session pairs:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl mx-auto">
        <button
          onClick={() => generateAndTest("Truthful")}
          disabled={isAnalyzing}
          className="p-4 bg-dark-850 hover:bg-dark-800 border border-neon-mint/30 hover:border-neon-mint/60 rounded-2xl text-left transition-all group disabled:opacity-50 relative overflow-hidden transform hover:scale-[1.02] active:scale-95 shadow-lg"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono font-bold text-neon-mint flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              PRESET 01: TRUTHFUL-LEANING
            </span>
            <span className="text-[10px] text-dark-500 font-mono">10s + 8s</span>
          </div>
          <p className="text-xs text-slate-300 leading-snug font-sans">
            Minimal pitch delta (&Delta;F0 &approx; 0 Hz), steady vocal shimmer, natural breath intervals.
          </p>
        </button>

        <button
          onClick={() => generateAndTest("Deceptive")}
          disabled={isAnalyzing}
          className="p-4 bg-dark-850 hover:bg-dark-800 border border-neon-coral/30 hover:border-neon-coral/60 rounded-2xl text-left transition-all group disabled:opacity-50 relative overflow-hidden transform hover:scale-[1.02] active:scale-95 shadow-lg"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono font-bold text-neon-coral flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              PRESET 02: DECEPTION INDICATORS
            </span>
            <span className="text-[10px] text-dark-500 font-mono">10s + 8s</span>
          </div>
          <p className="text-xs text-slate-300 leading-snug font-sans">
            Elevated pitch delta (&Delta;F0 &gt; +50 Hz), high jitter micro-tremors, accelerated pacing.
          </p>
        </button>
      </div>
    </div>
  );
}
