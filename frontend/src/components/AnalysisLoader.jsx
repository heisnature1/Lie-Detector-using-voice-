import React, { useState, useEffect } from "react";
import { Loader2, Radio, Terminal, Cpu } from "lucide-react";

const DSP_STEPS = [
  "DECODING AUDIO WAVEFORM & ALIGNING CALIBRATION CHANNELS...",
  "EXTRACTING F0 PITCH CONTOURS & MICRO-JITTER VECTORS...",
  "COMPUTING SHIMMER PERTURBATION & 13 MFCC SPECTRAL TIMBRE...",
  "CALCULATING DIFFERENTIAL ACOUSTIC DELTAS (TEST − BASELINE)...",
  "EXECUTING RANDOM FOREST INFERENCE & COMPILING TOP SIGNALS...",
];

export default function AnalysisLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < DSP_STEPS.length - 1 ? prev + 1 : prev));
    }, 650);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-dark-900/95 border border-dark-700 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl relative overflow-hidden backdrop-blur-2xl animate-fade-in-up">
      {/* Subtle Scanline Overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

      {/* High-Tech Spectral Waterfall / Radar Scope */}
      <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
        {/* Radar Ring 1 */}
        <div className="absolute inset-0 rounded-full border border-dark-700" />
        <div className="absolute inset-3 rounded-full border border-neon-mint/20 animate-ping opacity-30" />
        <div className="absolute inset-6 rounded-full border border-dark-700" />
        
        {/* Radar Sweep Line */}
        <div className="absolute inset-0 rounded-full overflow-hidden animate-radar-sweep">
          <div className="w-1/2 h-1/2 bg-gradient-to-br from-neon-mint/40 to-transparent origin-bottom-right" />
        </div>

        {/* Center DSP Core Icon */}
        <div className="w-12 h-12 rounded-xl bg-dark-850 border border-dark-700 flex items-center justify-center relative z-10 shadow-lg">
          <Cpu className="w-6 h-6 text-neon-mint animate-pulse" />
        </div>
      </div>

      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neon-mint/10 border border-neon-mint/30 text-neon-mint text-[11px] font-mono font-bold mb-3">
        <Radio className="w-3.5 h-3.5 animate-pulse" />
        <span>DSP DELTA ENGINE RUNNING</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 font-mono tracking-tight">
        COMPUTING VOCAL DELTA PROFILE
      </h3>

      <p className="text-xs font-mono text-slate-300 max-w-md mx-auto mb-6 h-6 transition-all duration-300">
        &gt; {DSP_STEPS[currentStep]}
      </p>

      {/* Progress Bars */}
      <div className="grid grid-cols-5 gap-1.5 max-w-xs mx-auto">
        {DSP_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= currentStep ? "bg-neon-mint shadow-[0_0_8px_rgba(0,245,155,0.7)]" : "bg-dark-800"
            }`}
          />
        ))}
      </div>

      <p className="text-[11px] font-mono text-dark-500 mt-6">
        TELEMETRY: LIBROSA 26-FEATURE EXTRACTION // RF CALIBRATED INFERENCE
      </p>
    </div>
  );
}
