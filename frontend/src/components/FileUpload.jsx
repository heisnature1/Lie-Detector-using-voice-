import React, { useState, useRef } from "react";
import { UploadCloud, FileAudio, AlertCircle, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";

export default function FileUpload({ onAudioReady, isAnalyzing }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setError(null);
    if (!file) return;

    // Check size (< 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 10 MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      setDuration(dur);
      setSelectedFile(file);
      setAudioUrl(url);

      if (dur < 10.0) {
        setError(`Audio duration is ${dur.toFixed(1)}s. Minimum required duration is 10.0 seconds.`);
      } else if (dur > 60.0) {
        setError(`Audio duration is ${dur.toFixed(1)}s. Maximum allowed duration is 60.0 seconds.`);
      }
    };

    audio.onerror = () => {
      // If browser can't decode container directly in Audio element, still allow backend PyAV decoding
      setSelectedFile(file);
      setAudioUrl(url);
      setDuration(null);
    };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setSelectedFile(null);
    setAudioUrl(null);
    setDuration(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;
    onAudioReady(selectedFile, selectedFile.name);
  };

  const isValidDuration = duration === null || (duration >= 10.0 && duration <= 60.0);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      {error && (
        <div className="mb-6 p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-sky-400 bg-sky-500/10"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/wav,audio/mp3,audio/mpeg,audio/webm,audio/ogg,audio/flac,audio/x-m4a,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-sky-400 mb-4 shadow-lg">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            Choose an Audio File or Drag & Drop
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Supports WAV, MP3, WebM, OGG, or FLAC (10 to 60 seconds, max 10 MB).
          </p>

          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold border border-slate-700">
            Browse Files
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <FileAudio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  {duration ? ` • ${duration.toFixed(1)}s duration` : ""}
                </p>
              </div>
            </div>

            {isValidDuration && !error && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valid Duration
              </span>
            )}
          </div>

          {audioUrl && (
            <div className="max-w-md mx-auto">
              <audio src={audioUrl} controls className="w-full rounded-lg" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={handleReset}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition-colors border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Choose Another File</span>
            </button>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !isValidDuration}
              className="flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              <span>Analyze Stress Indicators</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
