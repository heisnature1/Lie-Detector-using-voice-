import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Gauge, Activity } from "lucide-react";
import Card3D from "./Card3D";

export default function StressGauge({ verdict, confidence, baselineDuration, testDuration }) {
  const isTruthful = verdict === "Truthful-leaning";
  const confPct = Math.round((confidence || 0.85) * 100);

  // Calculate needle rotation angle (-90deg for Truthful far left, +90deg for Deception far right)
  const needleAngle = isTruthful
    ? -75 + (1 - (confidence || 0.8)) * 50
    : 15 + ((confidence || 0.8) - 0.5) * 130;

  const theme = isTruthful
    ? {
        border: "border-accent-emerald/30",
        badge: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30",
        accentColor: "#10b981",
        glow: "shadow-glow-emerald",
        title: "Truthful-Leaning",
        subtitle: "Minimal acoustic delta shift detected",
        summary:
          "Vocal acoustics during the statement closely matched your neutral calibration baseline. Fundamental pitch, micro-frequency instability (jitter), and syllable rhythm showed relaxed, unstrained neuromuscular control.",
      }
    : {
        border: "border-accent-rose/30",
        badge: "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
        accentColor: "#f43f5e",
        glow: "shadow-glow-rose",
        title: "Elevated Stress Indicators",
        subtitle: "Significant differential stress shift detected",
        summary:
          "Pronounced acoustic divergence detected relative to your resting baseline. Notable fundamental frequency ($F_0$) rise, elevated vocal fold micro-tremors (jitter), and accelerated speech pacing were measured during the response.",
      };

  return (
    <Card3D depth={12} className={`rounded-3xl glass-panel ${theme.border} p-6 sm:p-8 ${theme.glow}`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: 3D Radial Dial */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center shrink-0">
          {/* Metallic Dial Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-white/10 bg-gradient-to-br from-studio-800 to-studio-950 shadow-2xl flex items-center justify-center p-3">
            {/* Inner Recessed Bezel */}
            <div className="w-full h-full rounded-full border border-black/40 bg-studio-900 shadow-inner relative flex items-center justify-center">
              {/* Dial Tick Marks SVG */}
              <svg className="w-full h-full p-2" viewBox="0 0 100 100">
                {/* Background Arc */}
                <path
                  d="M 20 80 A 40 40 0 1 1 80 80"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Active Colored Arc */}
                <path
                  d={
                    isTruthful
                      ? "M 20 80 A 40 40 0 0 1 50 10"
                      : "M 50 10 A 40 40 0 0 1 80 80"
                  }
                  fill="none"
                  stroke={theme.accentColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>

              {/* 3D Animated Needle with Pivot */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${needleAngle}deg)` }}
              >
                <div
                  className="w-1.5 h-20 rounded-full origin-bottom relative shadow-lg"
                  style={{
                    backgroundColor: theme.accentColor,
                    boxShadow: `0 0 10px ${theme.accentColor}`,
                    transform: "translateY(-24px)",
                  }}
                />
              </div>

              {/* Center Metal Cap */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-studio-700 to-studio-950 border border-white/20 shadow-xl flex items-center justify-center z-10">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Verdict Details & Plain English Breakdown */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${theme.badge}`}>
              {isTruthful ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-accent-rose" />
              )}
              {isTruthful ? "Stable Delta" : "Stress Surge"}
            </span>

            <span className="text-xs font-mono text-studio-400 bg-studio-850 px-2.5 py-1 rounded-full border border-studio-700/60">
              {confPct}% Model Confidence
            </span>

            {testDuration && (
              <span className="text-xs font-mono text-studio-400 bg-studio-850 px-2.5 py-1 rounded-full border border-studio-700/60">
                {testDuration}s Test Response
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {theme.title}
            </h2>
            <p className="text-xs text-studio-400 font-medium mt-0.5">
              {theme.subtitle}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-studio-200/90 leading-relaxed bg-studio-950/60 p-4 rounded-2xl border border-white/5">
            {theme.summary}
          </p>
        </div>
      </div>
    </Card3D>
  );
}
