import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

export default function StressGauge({ score, confidence, duration }) {
  const getTheme = () => {
    switch (score) {
      case "Low":
        return {
          bg: "bg-emerald-950/40 border-emerald-500/30 text-emerald-300",
          badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
          barColor: "bg-emerald-500",
          glow: "shadow-emerald-500/10",
          icon: CheckCircle2,
          levelText: "Low Stress Likelihood",
          summary: "Vocal acoustics show stable fundamental frequency, minimal micro-perturbations, and relaxed respiratory pacing.",
          pctPosition: "20%",
        };
      case "Medium":
        return {
          bg: "bg-amber-950/40 border-amber-500/30 text-amber-300",
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          barColor: "bg-amber-500",
          glow: "shadow-amber-500/10",
          icon: AlertCircle,
          levelText: "Moderate Stress Likelihood",
          summary: "Vocal acoustics exhibit moderate pitch variance and slight micro-perturbations indicative of mild arousal.",
          pctPosition: "50%",
        };
      case "High":
      default:
        return {
          bg: "bg-rose-950/40 border-rose-500/30 text-rose-300",
          badge: "bg-rose-500/20 text-rose-400 border-rose-500/40",
          barColor: "bg-rose-500",
          glow: "shadow-rose-500/10",
          icon: AlertTriangle,
          levelText: "Elevated Stress Likelihood",
          summary: "Vocal acoustics reveal pronounced pitch fluctuations, heightened frequency/amplitude jitter, and hurried articulation.",
          pctPosition: "85%",
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;
  const confPct = Math.round((confidence || 0.85) * 100);

  return (
    <div className={`p-6 rounded-2xl border ${theme.bg} shadow-xl ${theme.glow} transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${theme.badge}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stress Score Analysis
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {score} Stress
            </h2>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center space-x-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Model Confidence</span>
            <span className="text-base font-bold text-sky-400 font-mono">{confPct}%</span>
          </div>
          {duration && (
            <div className="border-l border-slate-700/80 pl-3 text-right">
              <span className="text-xs text-slate-400 block">Clip Duration</span>
              <span className="text-base font-bold text-slate-200 font-mono">{duration}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Tri-state Stress Meter Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span className={score === "Low" ? "text-emerald-400 font-bold" : ""}>Low</span>
          <span className={score === "Medium" ? "text-amber-400 font-bold" : ""}>Medium</span>
          <span className={score === "High" ? "text-rose-400 font-bold" : ""}>High</span>
        </div>
        <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 flex gap-1 relative">
          <div className={`flex-1 rounded-full ${score === "Low" ? "bg-emerald-500 shadow-md shadow-emerald-500/50" : "bg-emerald-950/60"}`} />
          <div className={`flex-1 rounded-full ${score === "Medium" ? "bg-amber-500 shadow-md shadow-amber-500/50" : "bg-amber-950/60"}`} />
          <div className={`flex-1 rounded-full ${score === "High" ? "bg-rose-500 shadow-md shadow-rose-500/50" : "bg-rose-950/60"}`} />
        </div>
      </div>

      {/* Summary Note */}
      <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
        {theme.summary}
      </p>
    </div>
  );
}
