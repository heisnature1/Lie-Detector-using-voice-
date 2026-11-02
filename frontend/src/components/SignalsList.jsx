import React from "react";
import { Zap, Volume2, Mic, Activity, Clock, Terminal, ChevronRight } from "lucide-react";

export default function SignalsList({ signals = [], deltaMetrics = null }) {
  const getSignalIcon = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("pitch") || lower.includes("f0")) return Activity;
    if (lower.includes("jitter") || lower.includes("shimmer")) return Zap;
    if (lower.includes("energy") || lower.includes("loudness") || lower.includes("volume")) return Volume2;
    if (lower.includes("pacing") || lower.includes("pause") || lower.includes("speech") || lower.includes("silence")) return Clock;
    return Mic;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-dark-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neon-mint" />
            TOP 3 ACOUSTIC DELTA SIGNALS (TEST − BASELINE)
          </h3>
          <p className="text-xs font-mono text-dark-500">
            Acoustic markers showing highest differential deviation from calibrated resting voice
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {signals.map((signal, idx) => {
          const Icon = getSignalIcon(signal.name);
          const isPositive = typeof signal.value === "number" && signal.value > 0;
          return (
            <div
              key={idx}
              className="bg-dark-900/90 border border-dark-800 hover:border-dark-700 rounded-2xl p-4.5 flex flex-col justify-between transition-all shadow-xl hover:translate-y-[-2px] relative overflow-hidden group animate-fade-in-up"
              style={{ animationDelay: `${(idx * 120)}ms` }}
            >
              {/* Top accent line */}
              <div
                className={`absolute top-0 left-0 h-1 w-full ${
                  isPositive ? "bg-neon-coral/80" : "bg-neon-mint/80"
                }`}
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-neon-mint group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-dark-950 text-dark-500 border border-dark-800">
                      RANK #{idx + 1}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                      isPositive
                        ? "bg-neon-coral/10 text-neon-coral border-neon-coral/30"
                        : "bg-neon-mint/10 text-neon-mint border-neon-mint/30"
                    }`}
                  >
                    {typeof signal.value === "number"
                      ? `${signal.value > 0 ? "+" : ""}${signal.value.toFixed(3)}`
                      : signal.value}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-2 leading-snug font-mono">
                  {signal.name}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed bg-dark-950/80 p-3 rounded-xl border border-dark-850">
                  {signal.explanation}
                </p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-dark-800 flex items-center justify-between text-[10px] font-mono text-dark-500">
                <span>PHYSIOLOGICAL CORRELATE</span>
                <span className="text-slate-300 font-bold">Laryngeal / Autonomic</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
