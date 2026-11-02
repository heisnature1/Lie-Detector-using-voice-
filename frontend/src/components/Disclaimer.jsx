import React from "react";
import { AlertTriangle, Info, X, ShieldCheck, Terminal } from "lucide-react";

export function DisclaimerBanner({ onOpenModal }) {
  return (
    <div className="bg-dark-850/80 border border-neon-amber/25 sm:rounded-2xl p-4 text-xs sm:text-sm text-slate-300 relative overflow-hidden mb-6 shadow-xl backdrop-blur-md">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-neon-amber" />
      <div className="flex items-start space-x-3.5 pl-1">
        <div className="w-8 h-8 rounded-lg bg-neon-amber/10 border border-neon-amber/30 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-neon-amber" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-neon-amber uppercase tracking-wider text-xs">
              Scientific & Legal Disclaimer // Research Mode
            </span>
            <button
              onClick={onOpenModal}
              className="text-[11px] font-mono text-neon-amber/80 hover:text-neon-amber underline cursor-pointer"
            >
              Learn More
            </button>
          </div>
          <p className="text-slate-300/90 mt-1 leading-relaxed text-xs">
            VoiceStress is strictly an exploratory acoustic research demonstration. Vocal stress and delta acoustic shifts are 
            <strong> not scientifically validated as a lie detector</strong>. Do NOT use for legal, employment, relationship, or accusatory decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DisclaimerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5 border-b border-dark-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-neon-amber/10 border border-neon-amber/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-neon-amber" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-mono">ETHICS & METHODOLOGY</h3>
            <p className="text-xs text-dark-500 font-mono">Acoustic Signal Limits & Privacy</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <div className="p-3.5 bg-dark-850 rounded-xl border border-dark-700">
            <p className="font-mono font-bold text-neon-amber flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-neon-amber" />
              Not a Validated Polygraph / Lie Detector
            </p>
            <p className="text-slate-400">
              Extensive scientific reviews by the National Research Council confirm that vocal stress analysis cannot reliably prove deception. Stress surges can stem from room reverberation, cognitive load, excitement, or nervousness.
            </p>
          </div>

          <div className="p-3.5 bg-dark-850 rounded-xl border border-dark-700">
            <p className="font-mono font-bold text-neon-cyan flex items-center gap-2 mb-1">
              <Terminal className="w-4 h-4 text-neon-cyan" />
              Differential Acoustic Delta Pipeline
            </p>
            <p className="text-slate-400">
              Unlike single-clip analyzers, VoiceStress computes differential vectors ($\Delta = \text{Test} - \text{Baseline}$) across fundamental frequency $F_0$, cycle jitter, amplitude shimmer, syllable rate, and 13 MFCC spectral coefficients.
            </p>
          </div>

          <div className="p-3.5 bg-dark-850 rounded-xl border border-dark-700">
            <p className="font-mono font-bold text-neon-mint flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-neon-mint" />
              Zero Persistent Storage
            </p>
            <p className="text-slate-400">
              Audio is decoded strictly in temporary system memory and purged immediately after feature vector extraction.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neon-mint hover:bg-neon-mint/90 text-dark-950 font-bold rounded-xl text-xs font-mono tracking-wider transition-all shadow-lg shadow-neon-mint/20"
          >
            I UNDERSTAND & AGREE
          </button>
        </div>
      </div>
    </div>
  );
}
