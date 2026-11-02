import React, { useState, useEffect } from "react";
import { Mic, Database, AlertCircle } from "lucide-react";
import Header from "./components/Header";
import { DisclaimerBanner, DisclaimerModal } from "./components/Disclaimer";
import LiveSessionRecorder from "./components/LiveSessionRecorder";
import DataCollectionMode from "./components/DataCollectionMode";
import SampleTester from "./components/SampleTester";
import AnalysisLoader from "./components/AnalysisLoader";
import ResultScreen from "./components/ResultScreen";
import { analyzeSession, fetchModelInfo } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("live");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [lastBaselineBlob, setLastBaselineBlob] = useState(null);
  const [lastTestBlob, setLastTestBlob] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  useEffect(() => {
    fetchModelInfo().then((info) => {
      if (info) setModelInfo(info);
    });
  }, []);

  const handleSessionReady = async (baselineBlob, testBlob) => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    setLastBaselineBlob(baselineBlob);
    setLastTestBlob(testBlob);

    try {
      const result = await analyzeSession(baselineBlob, testBlob);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Session analysis failed:", err);
      setErrorMessage(
        err.message || "An error occurred while analyzing the audio session. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setLastBaselineBlob(null);
    setLastTestBlob(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100">
      <Header
        modelInfo={modelInfo}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <DisclaimerBanner onOpenModal={() => setIsDisclaimerOpen(true)} />

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl flex items-start justify-between gap-3 text-sm text-rose-200 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Analysis Error</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white text-xs px-2.5 py-1 rounded bg-rose-900/60 border border-rose-700/60"
            >
              Dismiss
            </button>
          </div>
        )}

        {isAnalyzing ? (
          <AnalysisLoader />
        ) : analysisResult ? (
          <ResultScreen
            result={analysisResult}
            baselineBlob={lastBaselineBlob}
            testBlob={lastTestBlob}
            onReset={handleReset}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto shadow-inner">
              <button
                onClick={() => {
                  setActiveTab("live");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "live"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Live Calibrated Analysis</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("dataset");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "dataset"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Data Collection Studio</span>
              </button>
            </div>

            {activeTab === "live" ? (
              <>
                <LiveSessionRecorder
                  onSessionReady={handleSessionReady}
                  isAnalyzing={isAnalyzing}
                />
                <SampleTester
                  onSessionReady={handleSessionReady}
                  isAnalyzing={isAnalyzing}
                />
              </>
            ) : (
              <DataCollectionMode />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 VoiceStress Research & Entertainment MVP. All rights reserved.</p>
          <p className="text-slate-400">
            Delta acoustic analysis engine powered by librosa & scikit-learn.
          </p>
        </div>
      </footer>

      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
