import React from "react";
import { Radio, ShieldAlert, Cpu, Sparkles } from "lucide-react";

export default function Header({ modelInfo, onOpenDisclaimer }) {
  return (
    <header className="border-b border-dark-800 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Hardware Workstation Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center relative overflow-hidden group shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-tr from-neon-mint/20 to-neon-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Radio className="w-5 h-5 text-neon-mint relative z-10" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-neon-mint rounded-full blur-[3px] opacity-75 animate-ping" />
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-mono">
                VOICE<span className="text-neon-mint">STRESS</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-neon-cyan">
                DSP v2.0
              </span>
            </div>
            <p className="text-[11px] font-mono text-dark-500 hidden sm:block tracking-wide">
              DIFFERENTIAL ACOUSTIC VOCAL LAB
            </p>
          </div>
        </div>

        {/* Right Badges & Controls */}
        <div className="flex items-center space-x-3">
          {modelInfo && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-700/80 text-xs font-mono text-slate-300">
              <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
              <span>DELTA RF MODEL [{modelInfo.accuracy ? `${(modelInfo.accuracy * 100).toFixed(0)}%` : "READY"}]</span>
            </div>
          )}

          <button
            onClick={onOpenDisclaimer}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-neon-amber/10 hover:bg-neon-amber/20 text-neon-amber border border-neon-amber/30 text-xs font-semibold font-mono tracking-wide transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-neon-amber/5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESEARCH NOTICE</span>
            <span className="sm:hidden">NOTICE</span>
          </button>
        </div>
      </div>
    </header>
  );
}
