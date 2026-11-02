import React from "react";
import { AlertTriangle, Info, X, ShieldCheck } from "lucide-react";

export function DisclaimerBanner({ onOpenModal }) {
  return (
    <div className="bg-amber-950/40 border-y sm:border sm:rounded-xl border-amber-500/30 p-3 sm:p-4 text-xs sm:text-sm text-amber-200/90 flex items-start space-x-3 mb-6">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-300">
          Important Research & Ethics Disclaimer: Not a Lie Detector
        </p>
        <p className="text-amber-200/80 mt-1 leading-relaxed">
          VoiceStress is designed strictly as an experimental acoustics research and entertainment demonstration. 
          Vocal stress analysis is <strong>not scientifically proven</strong> as a lie detector or definitive determinant of deception. 
          Never use this tool for hiring, legal, relationship, or accusatory decisions.
        </p>
      </div>
    </div>
  );
}

export function DisclaimerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Ethics & Scientific Limitations</h3>
            <p className="text-xs text-slate-400">Positioning and Usage Guidelines</p>
          </div>
        </div>

        <div className="space-y-3.5 text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Not a Validated Lie Detector
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Scientific consensus (including reviews by the National Research Council) confirms that vocal stress analysis 
              cannot reliably distinguish between truthfulness and deception. High stress can be triggered by fatigue, caffeine, excitement, room acoustics, or nervousness.
            </p>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <p className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              What This Tool Actually Measures
            </p>
            <p className="text-xs text-slate-300 mt-1">
              VoiceStress extracts 26 quantifiable acoustic features including fundamental frequency ($F_0$), micro-period perturbation (jitter), amplitude perturbation (shimmer), speech onset pacing, and MFCC spectral coefficients.
            </p>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Zero Audio Storage Guarantee
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Your voice data is processed entirely in ephemeral system memory and is never saved, logged, or shared. Audio streams are immediately deleted upon feature extraction.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl text-sm transition-colors"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
