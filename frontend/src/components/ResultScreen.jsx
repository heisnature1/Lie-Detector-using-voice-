import React from "react";
import { RotateCcw, Download, ShieldAlert, FileText, CheckCircle2, Mic, Activity } from "lucide-react";
import StressGauge from "./StressGauge";
import SignalsList from "./SignalsList";
import Card3D from "./Card3D";

export default function ResultScreen({ result, onReset }) {
  if (!result) return null;

  const { verdict, confidence, top_signals = [], disclaimer, baseline_duration_s, test_duration_s, delta_metrics } = result;

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `voice-stress-analysis-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 3D Radial Gauge Result Summary */}
      <StressGauge
        verdict={verdict}
        confidence={confidence}
        baselineDuration={baseline_duration_s}
        testDuration={test_duration_s}
      />

      {/* Top Driving Delta Signals */}
      <SignalsList signals={top_signals} deltaMetrics={delta_metrics} />

      {/* Acoustic Delta Comparison Details */}
      {delta_metrics && (
        <Card3D depth={8} className="glass-panel rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-teal" />
            Extracted Differential Features ($\Delta = \text{Test} - \text{Baseline}$)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {Object.entries(delta_metrics).slice(0, 8).map(([key, val]) => (
              <div key={key} className="bg-studio-950/80 p-3 rounded-xl border border-white/5">
                <span className="text-studio-400 block truncate text-[11px] font-mono">
                  {key.replace("delta_", "")}
                </span>
                <span className={`font-mono font-bold text-sm ${typeof val === "number" && val > 0 ? "text-accent-rose" : "text-accent-emerald"}`}>
                  {typeof val === "number" ? (val > 0 ? `+${val.toFixed(3)}` : val.toFixed(3)) : val}
                </span>
              </div>
            ))}
          </div>
        </Card3D>
      )}

      {/* Mandatory Scientific & Ethical Disclaimer Banner */}
      <div className="bg-studio-950/90 border border-amber-500/30 rounded-2xl p-5 text-studio-300 text-xs flex items-start gap-3.5 shadow-lg">
        <ShieldAlert className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-accent-amber">Scientific & Practical Limitation Notice</p>
          <p className="leading-relaxed text-studio-300">
            {disclaimer ||
              "This system measures differential acoustic stress indicators between a neutral baseline and a test response. Acoustic stress correlates with emotional arousal, cognitive load, or nervousness, but is NOT a scientifically definitive indicator of deception. Never use this system for employment, legal, relationship, or accusatory decisions."}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-studio-800">
        <button
          type="button"
          onClick={onReset}
          className="btn-3d px-6 py-3 rounded-xl bg-studio-800 hover:bg-studio-700 text-white font-bold text-xs flex items-center gap-2 border border-studio-600/60 shadow-lg"
        >
          <RotateCcw className="w-4 h-4" />
          Run Another Analysis
        </button>

        <button
          type="button"
          onClick={exportJSON}
          className="btn-3d px-6 py-3 rounded-xl bg-studio-100 hover:bg-white text-studio-950 font-bold text-xs flex items-center gap-2 border border-studio-300 shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export JSON Session Report
        </button>
      </div>
    </div>
  );
}
