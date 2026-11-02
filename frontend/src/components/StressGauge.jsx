import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function StressGauge({ verdict, confidence, baselineDuration, testDuration }) {
  const isTruthful = verdict === "Truthful-leaning";
  const confPct = Math.round((confidence || 0.85) * 100);

  const theme = isTruthful
    ? {
        bg: "bg-emerald-950/40 border-emerald-500/30 text-emerald-300",
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        glow: "shadow-emerald-500/10",
        icon: CheckCircle2,
        title: "Truthful-Leaning",
        summary:
          "Minimal acoustic delta shift detected relative to your neutral baseline. Fundamental pitch, micro-perturbation (jitter/shimmer), and syllable pacing remained consistent with calibration.",
      }
    : {
        bg: "bg-rose-950/40 border-rose-500/30 text-rose-300",
        badge: "bg-rose-500/20 text-rose-400 border-rose-500/40",
        glow: "shadow-rose-500/10",
        icon: AlertTriangle,
        title: "Deception Indicators",
        summary:
          "Notable physiological delta shift detected relative to calibration baseline. Pronounced pitch variance, elevated vocal jitter micro-tremors, and accelerated speech pacing were observed during the response.",
      };

  const Icon = theme.icon;

  return (
    <div className={`p-6 rounded-2xl border ${theme.bg} shadow-xl ${theme.glow} transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${theme.badge}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Calibrated Analysis Verdict
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {theme.title}
            </h2>
          </div>
        </div>

        {/* Confidence & Timing Badges */}
        <div className="flex items-center space-x-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Model Confidence</span>
            <span className="text-base font-bold text-sky-400 font-mono">{confPct}%</span>
          </div>
          {testDuration && (
            <div className="border-l border-slate-700/80 pl-3 text-right">
              <span className="text-xs text-slate-400 block">Test Clip</span>
              <span className="text-base font-bold text-slate-200 font-mono">{testDuration}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Tri-state Visual Meter */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span className={isTruthful ? "text-emerald-400 font-bold" : ""}>
            ✓ Truthful-Leaning (Stable Delta)
          </span>
          <span className={!isTruthful ? "text-rose-400 font-bold" : ""}>
            ⚠ Deception Indicators (Elevated Stress Shift)
          </span>
        </div>
        <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 flex gap-1 relative">
          <div
            className={`flex-1 rounded-full transition-all duration-500 ${
              isTruthful ? "bg-emerald-500 shadow-md shadow-emerald-500/50" : "bg-emerald-950/40"
            }`}
          />
          <div
            className={`flex-1 rounded-full transition-all duration-500 ${
              !isTruthful ? "bg-rose-500 shadow-md shadow-rose-500/50" : "bg-rose-950/40"
            }`}
          />
        </div>
      </div>

      {/* Summary Note */}
      <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
        {theme.summary}
      </p>
    </div>
  );
}
