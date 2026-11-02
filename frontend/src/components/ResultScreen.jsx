import React, { useState, useEffect } from "react";
import { RotateCcw, Volume2, ShieldAlert, Download, Share2 } from "lucide-react";
import StressGauge from "./StressGauge";
import SignalsList from "./SignalsList";

export default function ResultScreen({ result, audioBlob, onReset }) {
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  const handleDownloadReport = () => {
    const reportData = {
      appName: "VoiceStress Analyzer",
      version: "1.0.0",
      analyzedAt: new Date().toISOString(),
      score: result.score,
      confidence: result.confidence,
      duration_seconds: result.duration_seconds,
      top_signals: result.top_signals,
      disclaimer: result.disclaimer,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voicestress_analysis_${result.score.toLowerCase()}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Stress Score Gauge */}
      <StressGauge
        score={result.score}
        confidence={result.confidence}
        duration={result.duration_seconds}
      />

      {/* 2. Top 3 Driving Acoustic Signals */}
      <SignalsList signals={result.top_signals} />

      {/* 3. Audio Playback & Action Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {audioUrl && (
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <audio src={audioUrl} controls className="h-9 w-full sm:w-64" />
          </div>
        )}

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleDownloadReport}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-600/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Analyze Another Clip</span>
          </button>
        </div>
      </div>

      {/* 4. Visible Mandatory Legal & Ethics Disclaimer */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Notice:</strong> {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
