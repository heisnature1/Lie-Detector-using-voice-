import React from "react";
import { Activity, ShieldAlert, Cpu } from "lucide-react";

export default function Header({ modelInfo, onOpenDisclaimer }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-white">
                Voice<span className="text-sky-400">Stress</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                MVP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Acoustic Voice Stress & Vocal Correlates Analyzer
            </p>
          </div>
        </div>

        {/* Right Badges */}
        <div className="flex items-center space-x-3">
          {modelInfo && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>RF Classifier ({modelInfo.accuracy ? `${(modelInfo.accuracy * 100).toFixed(0)}% acc` : "Ready"})</span>
            </div>
          )}

          <button
            onClick={onOpenDisclaimer}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Research Tool Notice</span>
            <span className="sm:hidden">Notice</span>
          </button>
        </div>
      </div>
    </header>
  );
}
