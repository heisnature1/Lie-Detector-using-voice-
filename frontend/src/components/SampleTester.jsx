import React, { useState } from "react";
import { Sparkles, Play, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

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

  // Write PCM audio data
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

export default function SampleTester({ onAudioReady, isAnalyzing }) {
  const [loadingType, setLoadingType] = useState(null);

  const generateAndTest = (type) => {
    setLoadingType(type);
    const sr = 16000;
    const duration = 12.0;
    const totalSamples = sr * duration;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx({ sampleRate: sr });
    const buffer = ctx.createBuffer(1, totalSamples, sr);
    const data = buffer.getChannelData(0);

    let baseFreq = 130.0;
    let jitterAmp = 0.003;
    let modDepth = 0.02;
    let syllableRate = 2.0;
    let pauseDensity = 0.28;

    if (type === "Medium") {
      baseFreq = 175.0;
      jitterAmp = 0.015;
      modDepth = 0.06;
      syllableRate = 3.0;
      pauseDensity = 0.20;
    } else if (type === "High") {
      baseFreq = 230.0;
      jitterAmp = 0.045;
      modDepth = 0.14;
      syllableRate = 4.4;
      pauseDensity = 0.10;
    }

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

      // Syllable gating
      const cycle = (t * syllableRate) % 1.0;
      const envelope = cycle < (1.0 - pauseDensity) ? Math.sin((cycle / (1.0 - pauseDensity)) * Math.PI) : 0.0;
      const noise = (Math.random() - 0.5) * 0.01;

      data[i] = (wave * envelope * 0.8 + noise);
    }

    const wavBlob = audioBufferToWavBlob(buffer);
    setLoadingType(null);
    onAudioReady(wavBlob, `sample_${type.toLowerCase()}_stress.wav`);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-center mt-6">
      <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
        <span>One-Click Test Samples (No Mic Required)</span>
      </div>
      <p className="text-xs text-slate-400 mb-4 max-w-lg mx-auto">
        Test the analyzer instantly using synthetic 12-second speech samples calibrated to different vocal stress levels:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => generateAndTest("Low")}
          disabled={isAnalyzing}
          className="p-3 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Low Stress
            </span>
            <span className="text-[10px] text-slate-400 font-mono">12.0s</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Steady 130 Hz pitch, low jitter, natural breath pauses
          </p>
        </button>

        <button
          onClick={() => generateAndTest("Medium")}
          disabled={isAnalyzing}
          className="p-3 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Medium Stress
            </span>
            <span className="text-[10px] text-slate-400 font-mono">12.0s</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            175 Hz pitch with moderate dynamic swings & micro-variations
          </p>
        </button>

        <button
          onClick={() => generateAndTest("High")}
          disabled={isAnalyzing}
          className="p-3 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 hover:border-rose-500/60 rounded-xl text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              High Stress
            </span>
            <span className="text-[10px] text-slate-400 font-mono">12.0s</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            230 Hz elevated pitch, high jitter & rapid syllable pacing
          </p>
        </button>
      </div>
    </div>
  );
}
