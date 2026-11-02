import React, { useState, useEffect } from "react";
import { RotateCcw, Volume2, ShieldAlert, Download, Sliders, ChevronDown, ChevronUp, Terminal } from "lucide-react";
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
      appName: "VoiceStress DSP Analyzer",
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
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. Stress Score Gauge & Hardware Verdict Readout */}
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

      {/* 3. Dual Audio Waveform Inspection Player */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-dark-800 pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-dark-500 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-neon-cyan" />
            AUDIO TELEMETRY VERIFICATION
          </span>
          <span className="text-[10px] font-mono text-neon-mint">DUAL-CHANNEL</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {baseUrl && (
            <div className="p-4 bg-dark-950 rounded-2xl border border-dark-800 space-y-2">
              <span className="text-xs font-mono font-bold text-neon-mint block">
                [CH 01] CALIBRATION BASELINE ({result.baseline_duration_seconds || "10"}s)
              </span>
              <audio src={baseUrl} controls className="w-full h-8 opacity-90" />
            </div>
          )}

          {testUrl && (
            <div className="p-4 bg-dark-950 rounded-2xl border border-dark-800 space-y-2">
              <span className="text-xs font-mono font-bold text-neon-amber block">
                [CH 02] TARGET INQUIRY RESPONSE ({result.test_duration_seconds || "8"}s)
              </span>
              <audio src={testUrl} controls className="w-full h-8 opacity-90" />
            </div>
          )}
        </div>
      </div>

      {/* 4. Detailed Delta Matrix Drawer */}
      {result.delta_metrics && (
        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl overflow-hidden shadow-lg">
          <button
            onClick={() => setShowDeltas(!showDeltas)}
            className="w-full p-4 flex items-center justify-between text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neon-mint" />
              FULL 22-DIMENSION ACOUSTIC DELTA MATRIX (&Delta; = TEST − CALIB)
            </span>
            {showDeltas ? <ChevronUp className="w-4 h-4 text-neon-mint" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDeltas && (
            <div className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              {Object.entries(result.delta_metrics).map(([key, val]) => (
                <div key={key} className="p-2.5 bg-dark-950/80 rounded-xl border border-dark-800 flex justify-between items-center">
                  <span className="text-dark-500 truncate mr-2">{key.replace("delta_", "&Delta;_")}</span>
                  <span className={val > 0 ? "text-neon-coral font-bold" : "text-neon-mint font-bold"}>
                    {val > 0 ? "+" : ""}{val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Tactical Hardware Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          onClick={handleDownloadReport}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 bg-dark-850 hover:bg-dark-800 text-slate-300 font-mono font-bold rounded-2xl text-xs uppercase tracking-wider transition-all border border-dark-700 shadow-lg transform hover:scale-[1.02] active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT TELEMETRY JSON</span>
        </button>

        <button
          onClick={onReset}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 bg-neon-mint hover:bg-neon-mint/90 text-dark-950 font-mono font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-neon-mint/20 transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>START NEW SESSION</span>
        </button>
      </div>

      {/* 6. Legal & Ethics Banner */}
      <div className="p-4 bg-dark-950/90 border border-dark-800 rounded-2xl flex items-start gap-3 text-xs text-dark-500 font-mono">
        <ShieldAlert className="w-4 h-4 text-neon-amber shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-400">RESEARCH NOTICE:</strong> {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
