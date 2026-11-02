import React from "react";
import { Activity, Zap, Volume2, Clock, Mic, Sparkles } from "lucide-react";
import Card3D from "./Card3D";

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
      <div className="flex items-center justify-between border-b border-studio-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-amber" />
            Top Contributing Vocal Signals
          </h3>
          <p className="text-xs text-studio-400">
            Acoustic markers with the highest relative shift compared to your calibration baseline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {signals.map((signal, idx) => {
          const Icon = getSignalIcon(signal.name);
          const isPositive = typeof signal.value === "number" && signal.value > 0;
          return (
            <Card3D
              key={idx}
              depth={10}
              className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-studio-800 border border-studio-700/80 flex items-center justify-center text-accent-amber">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-studio-400">
                      Factor #{idx + 1}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isPositive
                        ? "bg-accent-rose/15 text-accent-rose border-accent-rose/30"
                        : "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30"
                    }`}
                  >
                    {typeof signal.value === "number"
                      ? `${signal.value > 0 ? "+" : ""}${signal.value.toFixed(3)}`
                      : signal.value}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                  {signal.name}
                </h4>

                <p className="text-xs text-studio-300 leading-relaxed bg-studio-950/70 p-3 rounded-xl border border-white/5">
                  {signal.explanation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-studio-800/80 flex items-center justify-between text-[11px] text-studio-400">
                <span>Vocal Feature</span>
                <span className="text-studio-200 font-medium">Test − Calibration</span>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
