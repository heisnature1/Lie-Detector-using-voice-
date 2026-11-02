import React, { useState } from "react";
import { Sparkles, Play, ShieldCheck, AlertTriangle, ArrowRight, Activity, Waves } from "lucide-react";
import Card3D from "./Card3D";

export default function SampleTester({ onAnalyzePair, isLoading }) {
  const [selectedDemo, setSelectedDemo] = useState("truthful");

  // Synthetic audio generator utility for 1-click demo runs
  const generateSyntheticToneAudio = (isStressed = false, durationSec = 6) => {
    const sampleRate = 16000;
    const numSamples = sampleRate * durationSec;
    const audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      1,
      numSamples,
      sampleRate
    );

    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const baseFreq = isStressed ? 210 : 130;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Speech envelope simulation
      const envelope = Math.sin((t / durationSec) * Math.PI) * 0.8;
      const jitter = isStressed ? Math.sin(t * 80) * 0.15 : 0.02;
      const freq = baseFreq + Math.sin(t * 5) * (isStressed ? 35 : 8) + jitter * 20;

      // Harmonically rich pseudo-vocal source
      const wave1 = Math.sin(2 * Math.PI * freq * t);
      const wave2 = 0.4 * Math.sin(2 * Math.PI * freq * 2 * t);
      const wave3 = 0.2 * Math.sin(2 * Math.PI * freq * 3 * t);
      const noise = (Math.random() - 0.5) * (isStressed ? 0.08 : 0.02);

      data[i] = (wave1 + wave2 + wave3 + noise) * envelope;
    }

    // Convert AudioBuffer to WAV Blob
    const wavBlob = audioBufferToWavBlob(buffer);
    return wavBlob;
  };

  const audioBufferToWavBlob = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels = [];
    let sampleRate = audioBuffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function setUint16(data) {
      out.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 16 for PCM
    setUint16(1); // PCM format
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // 16-bit

    // Data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: "audio/wav" });
  };

  const handleRunDemo = (mode) => {
    setSelectedDemo(mode);
    const baselineBlob = generateSyntheticToneAudio(false, 6);
    const testBlob = generateSyntheticToneAudio(mode === "stressed", 6);
    onAnalyzePair(baselineBlob, testBlob);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-studio-800 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-amber" />
          Synthetic Session Benchmarking
        </h3>
        <p className="text-xs text-studio-400 mt-1">
          Instantly evaluate the calibration model using synthesised vocal acoustic pairs without needing a live microphone.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Option 1: Truthful Simulation */}
        <Card3D depth={10} className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Benchmark Pair A
              </span>
              <span className="text-xs font-mono text-studio-400">$\Delta \approx 0$</span>
            </div>

            <h4 className="text-base font-bold text-white">Truthful-Leaning Simulation</h4>
            <p className="text-xs text-studio-300 leading-relaxed bg-studio-950/70 p-3 rounded-xl border border-white/5">
              Simulates a test statement that remains acoustically identical to the neutral calibration baseline ($F_0$ delta &lt; 5 Hz, minimal jitter delta).
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleRunDemo("truthful")}
            disabled={isLoading}
            className="mt-5 btn-3d w-full py-3 rounded-xl bg-accent-emerald/20 hover:bg-accent-emerald/30 text-accent-emerald font-bold text-xs flex items-center justify-center gap-2 border border-accent-emerald/40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isLoading && selectedDemo === "truthful" ? "Running Analysis..." : "Simulate Truthful Baseline"}
          </button>
        </Card3D>

        {/* Option 2: Stressed Simulation */}
        <Card3D depth={10} className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-rose/15 text-accent-rose border border-accent-rose/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Benchmark Pair B
              </span>
              <span className="text-xs font-mono text-studio-400">$\Delta \gt +80\text{Hz}$</span>
            </div>

            <h4 className="text-base font-bold text-white">Elevated Stress Indicators</h4>
            <p className="text-xs text-studio-300 leading-relaxed bg-studio-950/70 p-3 rounded-xl border border-white/5">
              Simulates an acute vocal stress response with marked pitch elevation, micro-jitter perturbation, and high-frequency spectral flux.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleRunDemo("stressed")}
            disabled={isLoading}
            className="mt-5 btn-3d w-full py-3 rounded-xl bg-accent-rose/20 hover:bg-accent-rose/30 text-accent-rose font-bold text-xs flex items-center justify-center gap-2 border border-accent-rose/40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isLoading && selectedDemo === "stressed" ? "Running Analysis..." : "Simulate Stressed Divergence"}
          </button>
        </Card3D>
      </div>
    </div>
  );
}
