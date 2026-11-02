import React, { useState, useEffect } from "react";
import { RotateCcw, Volume2, ShieldAlert, Download, Sliders, ChevronDown, ChevronUp } from "lucide-react";
import StressGauge from "./StressGauge";
import SignalsList from "./SignalsList";

export default function ResultScreen({ result, baselineBlob, testBlob, onReset }) {
  const [baseUrl, setBaseUrl] = useState(null);
  const [testUrl, setTestUrl] = useState(null);
  const [showDeltas, setShowDeltas] = useState(false);

  useEffect(() => {
    if (baselineBlob) {
      const url = URL.createObjectURL(baselineBlob);
      setBaseUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [baselineBlob]);

  useEffect(() => {
    if (testBlob) {
      const url = URL.createObjectURL(testBlob);
      setTestUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [testBlob]);

  const handleDownloadReport = () => {
    const reportData = {
      appName: "VoiceStress Analyzer",
      version: "2.0.0",
      analyzedAt: new Date().toISOString(),
      verdict: result.verdict,
      confidence: result.confidence,
      baseline_duration_seconds: result.baseline_duration_seconds,
      test_duration_seconds: result.test_duration_seconds,
      top_signals: result.top_signals,
      delta_metrics: result.delta_metrics,
      disclaimer: result.disclaimer,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voicestress_verdict_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Stress Score Gauge & Verdict */}
      <StressGauge
        verdict={result.verdict}
        confidence={result.confidence}
        baselineDuration={result.baseline_duration_seconds}
        testDuration={result.test_duration_seconds}
      />

      {/* 2. Top 3 Driving Delta Signals */}
      <SignalsList
        signals={result.top_signals}
        deltaMetrics={result.delta_metrics}
      />

      {/* 3. Dual Audio Playback Comparison */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Audio Session Verification
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {baseUrl && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs text-sky-400 font-semibold block mb-2">
                1. Calibration Baseline ({result.baseline_duration_seconds || "10"}s)
              </span>
              <audio src={baseUrl} controls className="w-full h-8" />
            </div>
          )}

          {testUrl && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs text-indigo-400 font-semibold block mb-2">
                2. Target Inquiry Response ({result.test_duration_seconds || "8"}s)
              </span>
              <audio src={testUrl} controls className="w-full h-8" />
            </div>
          )}
        </div>
      </div>

      {/* 4. Optional Detailed Delta Metrics Drawer */}
      {result.delta_metrics && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowDeltas(!showDeltas)}
            className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              Detailed Acoustic Delta Vector (Test − Baseline)
            </span>
            {showDeltas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDeltas && (
            <div className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {Object.entries(result.delta_metrics).map(([key, val]) => (
                <div key={key} className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 flex justify-between">
                  <span className="text-slate-400 truncate mr-2">{key.replace("delta_", "Δ_")}</span>
                  <span className={val > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                    {val > 0 ? "+" : ""}{val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          onClick={handleDownloadReport}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Full JSON Report</span>
        </button>

        <button
          onClick={onReset}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-600/25 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Start New Calibrated Analysis</span>
        </button>
      </div>

      {/* 6. Visible Mandatory Legal & Ethics Disclaimer */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Notice:</strong> {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
