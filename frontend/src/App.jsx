import React, { useState, useEffect } from "react";
import { Mic, Database, AlertCircle, Terminal, Radio } from "lucide-react";
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
    <div className="min-h-screen bg-dark-950 bg-grid-dots flex flex-col justify-between text-slate-100 selection:bg-neon-mint selection:text-dark-950 font-sans">
      {/* Top Header */}
      <Header
        modelInfo={modelInfo}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Ethics & Legal Disclaimer Banner */}
        <DisclaimerBanner onOpenModal={() => setIsDisclaimerOpen(true)} />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-neon-coral/15 border border-neon-coral/30 rounded-2xl flex items-start justify-between gap-3 text-xs sm:text-sm text-neon-coral shadow-2xl backdrop-blur-md font-mono animate-fade-in-up">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-neon-coral" />
              <div>
                <p className="font-bold uppercase tracking-wider">ANALYSIS ERROR OCCURRED</p>
                <p className="mt-1 leading-relaxed text-slate-300 font-sans">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-dark-900 border border-dark-700 text-neon-coral hover:text-white transition-colors"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing ? (
          <AnalysisLoader />
        ) : analysisResult ? (
          /* Results View */
          <ResultScreen
            result={analysisResult}
            baselineBlob={lastBaselineBlob}
            testBlob={lastTestBlob}
            onReset={handleReset}
          />
        ) : (
          /* Primary Mode Flow */
          <div className="space-y-6 animate-fade-in-up">
            {/* Tab Selection */}
            <div className="flex bg-dark-900/90 p-1.5 rounded-2xl border border-dark-800 max-w-md mx-auto shadow-2xl backdrop-blur-md">
              <button
                onClick={() => {
                  setActiveTab("live");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-mono font-bold tracking-wider transition-all transform ${
                  activeTab === "live"
                    ? "bg-neon-mint text-dark-950 shadow-lg shadow-neon-mint/20 scale-[1.02]"
                    : "text-dark-500 hover:text-slate-200"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>CALIBRATED WORKSTATION</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("dataset");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-mono font-bold tracking-wider transition-all transform ${
                  activeTab === "dataset"
                    ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20 scale-[1.02]"
                    : "text-dark-500 hover:text-slate-200"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>DATA STUDIO</span>
              </button>
            </div>

            {/* Active Panel */}
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

      {/* Footer */}
      <footer className="border-t border-dark-850 bg-dark-900/60 py-6 text-center text-xs font-mono text-dark-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 VOICESTRESS // ACOUSTIC RESEARCH WORKSTATION</p>
          <p className="text-dark-500">
            ENGINE: PYAV &bull; LIBROSA &bull; SCIKIT-LEARN
          </p>
        </div>
      </footer>

      {/* Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
