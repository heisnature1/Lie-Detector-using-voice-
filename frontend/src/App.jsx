import React, { useState } from "react";
import { Mic, Activity, Database, Sparkles, Shield, Cpu } from "lucide-react";
import LiveSessionRecorder from "./components/LiveSessionRecorder";
import SampleTester from "./components/SampleTester";
import DataCollectionMode from "./components/DataCollectionMode";
import ResultScreen from "./components/ResultScreen";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Robust fetch helper that handles HTML 404/502 error pages gracefully
 * without throwing unhandled "Unexpected token '<' / 'T'" JSON parse crashes.
 */
async function postSessionAnalysis(baselineBlob, testBlob) {
  const formData = new FormData();
  formData.append("baseline_file", baselineBlob, "baseline.webm");
  formData.append("test_file", testBlob, "test.webm");
  // Also append audio aliases for backwards compatibility
  formData.append("baseline_audio", baselineBlob, "baseline.webm");
  formData.append("test_audio", testBlob, "test.webm");

  const endpoint = `${API_BASE}/analyze/session`;
  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
  } catch (netErr) {
    throw new Error(
      `Network connection failed to ${endpoint}. Please ensure the VoiceStress backend API server is online.`
    );
  }

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    if (!response.ok) {
      throw new Error(
        `Backend server returned HTTP ${response.status} (${response.statusText || "Server Error"}). If running locally or on Vercel, ensure the FastAPI backend is running and reachable.`
      );
    }
    throw new Error(
      `Invalid response format from ${endpoint}. Expected JSON but received: ${rawText.slice(0, 100)}...`
    );
  }

  if (!response.ok) {
    const errorMsg = data.detail || data.message || `Analysis failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("record"); // 'record' | 'benchmark' | 'dataset'
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [apiError, setApiError] = useState("");

  const handleAnalyzeSession = async (baselineBlob, testBlob) => {
    setIsLoading(true);
    setApiError("");

    try {
      const data = await postSessionAnalysis(baselineBlob, testBlob);
      setAnalysisResult(data);
    } catch (err) {
      console.error("Analysis request error:", err);
      setApiError(err.message || "Failed to communicate with the analysis backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setApiError("");
  };

  return (
    <div className="min-h-screen bg-studio-950 bg-ambient-mesh text-studio-100 flex flex-col justify-between selection:bg-accent-emerald selection:text-studio-950">
      {/* Top Studio Header */}
      <header className="border-b border-studio-800/80 bg-studio-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-emerald via-accent-teal to-accent-amber p-0.5 shadow-glow-emerald">
              <div className="w-full h-full bg-studio-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-accent-emerald" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">
                  VoiceStress
                </h1>
                <span className="text-[10px] font-mono uppercase bg-studio-800 text-studio-300 px-2 py-0.5 rounded-full border border-studio-700">
                  Calibrated v2.0
                </span>
              </div>
              <p className="text-[11px] text-studio-400 font-medium">
                Differential Vocal Stress & Acoustic Signal Analyzer
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-studio-950/80 p-1 rounded-xl border border-studio-800/80">
            <button
              type="button"
              onClick={() => {
                setActiveTab("record");
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "record"
                  ? "bg-studio-800 text-white shadow-sm"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-accent-emerald" />
              <span className="hidden sm:inline">Live Studio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("benchmark");
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "benchmark"
                  ? "bg-studio-800 text-white shadow-sm"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-amber" />
              <span className="hidden sm:inline">Benchmarking</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("dataset");
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "dataset"
                  ? "bg-studio-800 text-white shadow-sm"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-accent-teal" />
              <span className="hidden sm:inline">Data Studio</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* API Error Callout */}
        {apiError && (
          <div className="mb-6 p-4 bg-accent-rose/15 border border-accent-rose/40 rounded-2xl text-accent-rose text-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold block">Analysis Service Notice</span>
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={() => setApiError("")}
              className="text-accent-rose hover:underline font-bold ml-4 shrink-0 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content View Routing */}
        {analysisResult ? (
          <ResultScreen result={analysisResult} onReset={handleReset} />
        ) : activeTab === "record" ? (
          <LiveSessionRecorder onAnalyze={handleAnalyzeSession} isLoading={isLoading} />
        ) : activeTab === "benchmark" ? (
          <SampleTester onAnalyzePair={handleAnalyzeSession} isLoading={isLoading} />
        ) : (
          <DataCollectionMode />
        )}
      </main>

      {/* Senior Architectural Footer */}
      <footer className="border-t border-studio-800/80 bg-studio-950/80 backdrop-blur-md py-6 text-xs text-studio-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-studio-300">
              VoiceStress Differential Acoustic Intelligence Engine
            </p>
            <p className="text-[11px] text-studio-500">
              Calibrated session analysis computing relative pitch ($F_0$), micro-jitter, shimmer, and vocal tract formants.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center gap-1 text-studio-400">
              <Shield className="w-3.5 h-3.5 text-accent-amber" />
              Scientific Research Tool
            </span>
            <span className="flex items-center gap-1 text-studio-400">
              <Cpu className="w-3.5 h-3.5 text-accent-teal" />
              Scikit-Learn + Librosa
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
