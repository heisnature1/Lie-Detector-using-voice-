import React, { useState, useEffect } from "react";
import { Mic, UploadCloud, Activity, AlertCircle, RefreshCw } from "lucide-react";
import Header from "./components/Header";
import { DisclaimerBanner, DisclaimerModal } from "./components/Disclaimer";
import AudioRecorder from "./components/AudioRecorder";
import FileUpload from "./components/FileUpload";
import SampleTester from "./components/SampleTester";
import AnalysisLoader from "./components/AnalysisLoader";
import ResultScreen from "./components/ResultScreen";
import { analyzeAudio, fetchModelInfo, fetchHealth } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("record"); // 'record' | 'upload'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [lastAudioBlob, setLastAudioBlob] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  useEffect(() => {
    // Warm up model metadata
    fetchModelInfo().then((info) => {
      if (info) setModelInfo(info);
    });
  }, []);

  const handleAudioReady = async (audioBlobOrFile, filename) => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    setLastAudioBlob(audioBlobOrFile);

    try {
      const result = await analyzeAudio(audioBlobOrFile, filename);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis failed:", err);
      setErrorMessage(
        err.message || "An error occurred while analyzing the audio clip. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setLastAudioBlob(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100">
      {/* Top Navigation */}
      <Header
        modelInfo={modelInfo}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Ethics & Legal Disclaimer Banner */}
        <DisclaimerBanner onOpenModal={() => setIsDisclaimerOpen(true)} />

        {/* Global Error Banner */}
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

        {/* Loading State */}
        {isAnalyzing ? (
          <AnalysisLoader />
        ) : analysisResult ? (
          /* Results View */
          <ResultScreen
            result={analysisResult}
            audioBlob={lastAudioBlob}
            onReset={handleReset}
          />
        ) : (
          /* Input View: Record or Upload */
          <div className="space-y-6">
            {/* Tab Selection */}
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 max-w-sm mx-auto shadow-inner">
              <button
                onClick={() => {
                  setActiveTab("record");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "record"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Record Audio (10-60s)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("upload");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "upload"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload File</span>
              </button>
            </div>

            {/* Active Input Panel */}
            {activeTab === "record" ? (
              <AudioRecorder
                onAudioReady={handleAudioReady}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <FileUpload
                onAudioReady={handleAudioReady}
                isAnalyzing={isAnalyzing}
              />
            )}

            {/* Instant Demo One-Click Tester */}
            <SampleTester
              onAudioReady={handleAudioReady}
              isAnalyzing={isAnalyzing}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 VoiceStress Research & Entertainment MVP. All rights reserved.</p>
          <p className="text-slate-400">
            Acoustics engine powered by librosa & scikit-learn.
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
