"use client";

import { useState, useEffect } from "react";

export interface AnimationControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  duration: number;
  loop: boolean;
  scrubMode?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onFrameChange: (frame: number) => void;
  onFpsChange: (fps: number) => void;
  onDurationChange: (duration: number) => void;
  onLoopChange: (loop: boolean) => void;
  onScrubModeChange?: (enabled: boolean) => void;
  onExport?: () => void;
}

export default function AnimationControls({
  isPlaying,
  isPaused,
  currentFrame,
  totalFrames,
  fps,
  duration,
  loop,
  scrubMode = false,
  onPlay,
  onPause,
  onStop,
  onFrameChange,
  onFpsChange,
  onDurationChange,
  onLoopChange,
  onScrubModeChange,
  onExport,
}: AnimationControlsProps) {
  const [localDuration, setLocalDuration] = useState(duration.toString());

  useEffect(() => {
    setLocalDuration(duration.toString());
  }, [duration]);

  const handleDurationBlur = () => {
    const parsed = parseInt(localDuration);
    if (!isNaN(parsed) && parsed > 0) {
      onDurationChange(parsed);
    } else {
      setLocalDuration(duration.toString());
    }
  };

  const currentT = totalFrames > 1 ? currentFrame / (totalFrames - 1) : 0;

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#2D2D2D] border-t border-[#3E3E3E]">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        {!isPlaying && !isPaused && (
          <button
            onClick={onPlay}
            className="px-4 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white rounded transition-colors flex items-center gap-2"
            title="Play animation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 2v12l10-6z" />
            </svg>
            Play
          </button>
        )}

        {isPlaying && (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white rounded transition-colors flex items-center gap-2"
            title="Pause animation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 2h2v12H5zM9 2h2v12H9z" />
            </svg>
            Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={onPlay}
            className="px-4 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white rounded transition-colors flex items-center gap-2"
            title="Resume animation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 2v12l10-6z" />
            </svg>
            Resume
          </button>
        )}

        <button
          onClick={onStop}
          disabled={!isPlaying && !isPaused}
          className="px-4 py-2 bg-[#3E3E3E] hover:bg-[#4E4E4E] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Stop animation"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <rect x="3" y="3" width="10" height="10" />
          </svg>
          Stop
        </button>

        {/* Status indicator */}
        <div className="ml-4 px-3 py-1 bg-[#1D1D1D] rounded text-sm text-gray-300">
          {isPlaying && "▶ Playing"}
          {isPaused && "⏸ Paused"}
          {!isPlaying && !isPaused && "⏹ Stopped"}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Scrub Mode Toggle */}
        {onScrubModeChange && (
          <button
            onClick={() => onScrubModeChange(!scrubMode)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              scrubMode
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-[#3E3E3E] hover:bg-[#4E4E4E] text-gray-300"
            }`}
            title={scrubMode ? "Disable scrub mode" : "Enable scrub mode - drag in viewport to scrub timeline"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
            {scrubMode ? "Scrub ON" : "Scrub"}
          </button>
        )}

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            disabled={isPlaying}
            className="px-4 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Export animation as GIF or video"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        )}
      </div>

      {/* Timeline Slider */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 min-w-[60px]">
          Frame {currentFrame}/{totalFrames}
        </span>
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-[#1D1D1D] rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #4772B3 0%, #4772B3 ${(currentFrame / (totalFrames - 1)) * 100}%, #1D1D1D ${(currentFrame / (totalFrames - 1)) * 100}%, #1D1D1D 100%)`,
          }}
        />
        <span className="text-sm text-gray-400 min-w-[60px] text-right">
          t = {currentT.toFixed(2)}
        </span>
      </div>

      {/* Settings */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* FPS Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="fps-select" className="text-sm text-gray-400">
            FPS:
          </label>
          <select
            id="fps-select"
            value={fps}
            onChange={(e) => onFpsChange(parseInt(e.target.value))}
            className="px-3 py-1 bg-[#1D1D1D] text-white rounded border border-[#3E3E3E] focus:border-[#4772B3] focus:outline-none"
          >
            <option value={15}>15</option>
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </div>

        {/* Duration Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="duration-input" className="text-sm text-gray-400">
            Duration:
          </label>
          <input
            id="duration-input"
            type="number"
            value={localDuration}
            onChange={(e) => setLocalDuration(e.target.value)}
            onBlur={handleDurationBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleDurationBlur();
              }
            }}
            min={100}
            step={100}
            className="w-24 px-3 py-1 bg-[#1D1D1D] text-white rounded border border-[#3E3E3E] focus:border-[#4772B3] focus:outline-none"
          />
          <span className="text-sm text-gray-400">ms</span>
        </div>

        {/* Loop Toggle */}
        <div className="flex items-center gap-2">
          <label htmlFor="loop-toggle" className="text-sm text-gray-400 cursor-pointer select-none">
            <input
              id="loop-toggle"
              type="checkbox"
              checked={loop}
              onChange={(e) => onLoopChange(e.target.checked)}
              className="mr-2 w-4 h-4 accent-[#4772B3] cursor-pointer"
            />
            Loop
          </label>
        </div>

        {/* Calculated Info */}
        <div className="ml-auto text-sm text-gray-400">
          {totalFrames} frames @ {fps} FPS = {(duration / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 border-t border-[#3E3E3E] pt-2 mt-1">
        💡 Tip: Export a function with <code className="px-1 py-0.5 bg-[#1D1D1D] rounded">t</code> parameter for animation:{" "}
        <code className="px-1 py-0.5 bg-[#1D1D1D] rounded">
          export default (t) =&gt; Shape.cube(10).rotate([0, t * 360, 0]);
        </code>
      </div>
    </div>
  );
}
