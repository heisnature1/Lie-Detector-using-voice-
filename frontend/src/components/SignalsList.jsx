import React from "react";
import { Zap, Volume2, Mic, Activity, Clock, Info } from "lucide-react";

export default function SignalsList({ signals = [] }) {
  const getSignalIcon = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("pitch") || lower.includes("f0")) return Activity;
    if (lower.includes("jitter") || lower.includes("shimmer")) return Zap;
    if (lower.includes("energy") || lower.includes("loudness")) return Volume2;
    if (lower.includes("pacing") || lower.includes("pause") || lower.includes("speech")) return Clock;
    return Mic;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Top 3 Contributing Vocal Signals
          </h3>
          <p className="text-xs text-slate-400">
            Acoustic markers with the highest relative divergence from unstrained baseline speech
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {signals.map((signal, idx) => {
          const Icon = getSignalIcon(signal.name);
          return (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-sky-400" />
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      Rank #{idx + 1}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-medium px-2 py-1 rounded bg-slate-800 text-sky-300">
                    {typeof signal.value === "number" ? signal.value.toFixed(3) : signal.value}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-100 mb-1.5 leading-snug">
                  {signal.name}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  {signal.explanation}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Physiological Driver</span>
                <span className="text-slate-300">Laryngeal / Autonomic</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p>
          These top 3 features represent the primary acoustic dimensions where the recorded voice differed from baseline relaxed vocal patterns, computed via random forest feature importance and z-score standard deviations.
        </p>
      </div>
    </div>
  );
}
