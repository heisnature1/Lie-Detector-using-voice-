import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Activity, Gauge } from "lucide-react";

export default function StressGauge({ verdict, confidence, baselineDuration, testDuration }) {
  const isTruthful = verdict === "Truthful-leaning";
  const confPct = Math.round((confidence || 0.85) * 100);

  const theme = isTruthful
    ? {
        border: "border-neon-mint/30",
        bg: "bg-dark-900/90",
        badgeBg: "bg-neon-mint/10 border-neon-mint/30 text-neon-mint",
        glowClass: "glow-mint",
        accentText: "text-neon-mint",
        verdictTitle: "TRUTHFUL-LEANING",
        verdictSub: "NOMINAL BASELINE DELTA",
        summary:
          "Acoustic delta metrics showed minimal divergence from your neutral calibration. Laryngeal pitch, cycle-to-cycle frequency perturbations (jitter), and syllable pacing matched calm speech baselines.",
      }
    : {
        border: "border-neon-coral/30",
        bg: "bg-dark-900/90",
        badgeBg: "bg-neon-coral/10 border-neon-coral/30 text-neon-coral",
        glowClass: "glow-coral",
        accentText: "text-neon-coral",
        verdictTitle: "DECEPTION INDICATORS",
        verdictSub: "ELEVATED STRESS DELTA DETECTED",
        summary:
          "Differential acoustic analysis detected significant upward shifts in vocal cord tension. Fundamental pitch surge, elevated frequency jitter micro-tremors, and hurried syllable pacing were observed during the response.",
      };

  // Generate 24 LED segments for the hardware VU meter
  const totalSegments = 24;
  const activeSegments = isTruthful
    ? Math.max(3, Math.floor((1 - (confidence || 0.5) * 0.3) * (totalSegments / 2)))
    : Math.min(totalSegments, Math.floor((totalSegments / 2) + ((confidence || 0.5) * (totalSegments / 2))));

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${theme.border} ${theme.bg} ${theme.glowClass} transition-all relative overflow-hidden backdrop-blur-xl animate-fade-in-up`}>
      {/* Corner Bracket Hardware Accents */}
      <div className="absolute top-3 left-3 text-[10px] font-mono text-dark-600 select-none">[ + ]</div>
      <div className="absolute top-3 right-3 text-[10px] font-mono text-dark-600 select-none">[ + ]</div>
      <div className="absolute bottom-3 left-3 text-[10px] font-mono text-dark-600 select-none">[ + ]</div>
      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-dark-600 select-none">[ + ]</div>

      {/* Main Header / Status Readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${theme.badgeBg} shadow-inner`}>
            {isTruthful ? (
              <CheckCircle2 className="w-7 h-7 text-neon-mint" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-neon-coral animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-dark-500 font-bold">
                DIFFERENTIAL VERDICT
              </span>
              <span className={`w-2 h-2 rounded-full ${isTruthful ? "bg-neon-mint" : "bg-neon-coral"} animate-ping`} />
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${theme.accentText}`}>
              {theme.verdictTitle}
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {theme.verdictSub}
            </p>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center space-x-3 bg-dark-950/80 p-3 rounded-2xl border border-dark-800 self-start sm:self-auto font-mono">
          <div className="text-right px-2">
            <span className="text-[10px] uppercase text-dark-500 block font-bold">CONFIDENCE</span>
            <span className={`text-xl font-extrabold ${theme.accentText}`}>{confPct}%</span>
          </div>
          {testDuration && (
            <div className="border-l border-dark-800 pl-3 pr-2 text-right">
              <span className="text-[10px] uppercase text-dark-500 block font-bold">TEST DURATION</span>
              <span className="text-base font-bold text-slate-200">{testDuration}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Hardware LED Segmented VU Meter */}
      <div className="space-y-2 mb-5">
        <div className="flex justify-between items-center text-[11px] font-mono font-bold text-dark-500">
          <span className={isTruthful ? "text-neon-mint flex items-center gap-1.5" : "text-dark-500"}>
            <span className="w-1.5 h-1.5 rounded-full bg-neon-mint" />
            TRUTHFUL-LEANING (LOW DELTA)
          </span>
          <span className={!isTruthful ? "text-neon-coral flex items-center gap-1.5" : "text-dark-500"}>
            DECEPTION INDICATORS (STRESS SURGE)
            <span className="w-1.5 h-1.5 rounded-full bg-neon-coral" />
          </span>
        </div>

        {/* 24 Segment LED Bar */}
        <div className="h-4 w-full bg-dark-950 rounded-xl p-1 flex gap-1 border border-dark-800 items-center">
          {Array.from({ length: totalSegments }).map((_, idx) => {
            const isActive = idx < activeSegments;
            const isDangerZone = idx >= totalSegments / 2;
            let barColor = "bg-dark-800";

            if (isActive) {
              if (isDangerZone) {
                barColor = "bg-neon-coral shadow-[0_0_8px_rgba(255,51,102,0.8)]";
              } else {
                barColor = "bg-neon-mint shadow-[0_0_8px_rgba(0,245,155,0.8)]";
              }
            }

            return (
              <div
                key={idx}
                className={`flex-1 h-full rounded-sm transition-all duration-300 ${barColor}`}
              />
            );
          })}
        </div>
      </div>

      {/* Laboratory Acoustic Summary */}
      <div className="p-4 bg-dark-950/70 rounded-2xl border border-dark-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
        {theme.summary}
      </div>
    </div>
  );
}
