import React, { useState, useEffect } from "react";
import { Loader2, Activity, Sparkles } from "lucide-react";

const STEPS = [
  "Decoding audio waveform and validating duration...",
  "Extracting fundamental frequency (F0), jitter & shimmer...",
  "Measuring syllable pacing, pauses & 13 MFCC spectral coefficients...",
  "Evaluating random forest model & compiling driving signals...",
];

export default function AnalysisLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-md">
      {/* Animated Waveform Visualizer */}
      <div className="flex items-center justify-center space-x-1.5 h-16 mb-8">
        {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 75, 40].map((height, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-sky-600 to-indigo-400"
            style={{
              height: `${height}%`,
              animation: `wave 1.2s ease-in-out infinite`,
              animationDelay: `${(i * 0.1).toFixed(1)}s`,
            }}
          />
        ))}
      </div>

      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
        <Sparkles className="w-3.5 h-3.5 animate-spin" />
        <span>Processing Audio Analysis</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
        Analyzing Vocal Stress Indicators
      </h3>

      <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 h-6 transition-all duration-300">
        {STEPS[currentStep]}
      </p>

      {/* Progress step indicators */}
      <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= currentStep ? "bg-sky-500" : "bg-slate-800"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-6">
        Average processing time &lt; 2 seconds for a 30s voice clip.
      </p>
    </div>
  );
}
