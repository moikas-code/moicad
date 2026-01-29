"use client";

import { useState, useEffect, useRef } from "react";

export type ExportFormat = "gif" | "webm" | "mp4";

export interface ExportSettings {
  format: ExportFormat;
  width: number;
  height: number;
  fps: number;
  quality: number;
  loop: boolean;
}

export interface ExportAnimationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => Promise<void>;
  duration: number;
  defaultSettings?: Partial<ExportSettings>;
}

const RESOLUTION_PRESETS = [
  { name: "480p", width: 854, height: 480 },
  { name: "720p", width: 1280, height: 720 },
  { name: "1080p", width: 1920, height: 1080 },
  { name: "Square", width: 800, height: 800 },
  { name: "Custom", width: 0, height: 0 },
];

const FPS_OPTIONS = [15, 24, 30, 60];

export default function ExportAnimationDialog({
  isOpen,
  onClose,
  onExport,
  duration,
  defaultSettings,
}: ExportAnimationDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    format: defaultSettings?.format || "gif",
    width: defaultSettings?.width || 800,
    height: defaultSettings?.height || 600,
    fps: defaultSettings?.fps || 30,
    quality: defaultSettings?.quality || 10,
    loop: defaultSettings?.loop !== false,
  });

  const [selectedPreset, setSelectedPreset] = useState("Custom");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Update preset when resolution changes
  useEffect(() => {
    const preset = RESOLUTION_PRESETS.find(
      (p) => p.width === settings.width && p.height === settings.height
    );
    setSelectedPreset(preset?.name || "Custom");
  }, [settings.width, settings.height]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isExporting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isExporting, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = RESOLUTION_PRESETS.find((p) => p.name === presetName);
    if (preset && preset.width > 0) {
      setSettings((s) => ({ ...s, width: preset.width, height: preset.height }));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setError(null);

    try {
      await onExport(settings);
      onClose();
    } catch (err: any) {
      setError(err.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const estimatedFrames = Math.floor((duration / 1000) * settings.fps);
  const estimatedSize = estimateFileSize(settings, duration);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-[#2D2D2D] rounded-lg shadow-xl w-full max-w-md mx-4 outline-none"
        role="dialog"
        aria-labelledby="export-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3E3E3E]">
          <h2 id="export-title" className="text-lg font-semibold text-white">
            Export Animation
          </h2>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Format
            </label>
            <div className="flex gap-2">
              {(["gif", "webm", "mp4"] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setSettings((s) => ({ ...s, format }))}
                  disabled={isExporting}
                  className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    settings.format === format
                      ? "bg-[#4772B3] text-white"
                      : "bg-[#3E3E3E] text-gray-300 hover:bg-[#4E4E4E]"
                  } disabled:opacity-50`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {settings.format === "gif" && "Best for short loops, widely supported"}
              {settings.format === "webm" && "Best quality/size ratio, modern browsers"}
              {settings.format === "mp4" && "Universal compatibility (browser support varies)"}
            </p>
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution
            </label>
            <div className="flex gap-2 mb-2">
              {RESOLUTION_PRESETS.slice(0, -1).map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetChange(preset.name)}
                  disabled={isExporting}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedPreset === preset.name
                      ? "bg-[#4772B3] text-white"
                      : "bg-[#3E3E3E] text-gray-300 hover:bg-[#4E4E4E]"
                  } disabled:opacity-50`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Width</label>
                <input
                  type="number"
                  value={settings.width}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, width: parseInt(e.target.value) || 800 }))
                  }
                  disabled={isExporting}
                  min={100}
                  max={4096}
                  className="w-full px-3 py-2 bg-[#1D1D1D] text-white rounded border border-[#3E3E3E] focus:border-[#4772B3] focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex items-end pb-2 text-gray-500">×</div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  value={settings.height}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, height: parseInt(e.target.value) || 600 }))
                  }
                  disabled={isExporting}
                  min={100}
                  max={4096}
                  className="w-full px-3 py-2 bg-[#1D1D1D] text-white rounded border border-[#3E3E3E] focus:border-[#4772B3] focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* FPS */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Frame Rate
            </label>
            <div className="flex gap-2">
              {FPS_OPTIONS.map((fps) => (
                <button
                  key={fps}
                  onClick={() => setSettings((s) => ({ ...s, fps }))}
                  disabled={isExporting}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    settings.fps === fps
                      ? "bg-[#4772B3] text-white"
                      : "bg-[#3E3E3E] text-gray-300 hover:bg-[#4E4E4E]"
                  } disabled:opacity-50`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Quality (for GIF) */}
          {settings.format === "gif" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quality (lower = better quality, larger file)
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={settings.quality}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, quality: parseInt(e.target.value) }))
                }
                disabled={isExporting}
                className="w-full accent-[#4772B3]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Best</span>
                <span>{settings.quality}</span>
                <span>Fast</span>
              </div>
            </div>
          )}

          {/* Loop */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="loop-checkbox"
              checked={settings.loop}
              onChange={(e) => setSettings((s) => ({ ...s, loop: e.target.checked }))}
              disabled={isExporting}
              className="w-4 h-4 accent-[#4772B3]"
            />
            <label htmlFor="loop-checkbox" className="text-sm text-gray-300">
              Loop animation
            </label>
          </div>

          {/* Estimated Info */}
          <div className="p-3 bg-[#1D1D1D] rounded text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Duration:</span>
              <span>{(duration / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total frames:</span>
              <span>{estimatedFrames}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Estimated size:</span>
              <span>{formatBytes(estimatedSize)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Exporting...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#1D1D1D] rounded overflow-hidden">
                <div
                  className="h-full bg-[#4772B3] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500 rounded text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#3E3E3E]">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-[#3E3E3E] hover:bg-[#4E4E4E] text-white rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export {settings.format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Estimate file size based on settings
 */
function estimateFileSize(settings: ExportSettings, duration: number): number {
  const frames = Math.floor((duration / 1000) * settings.fps);
  const pixels = settings.width * settings.height;

  if (settings.format === "gif") {
    // GIF: ~0.5-2 bytes per pixel per frame (varies a lot with content)
    const bytesPerPixel = 0.5 + (settings.quality / 30) * 1.5;
    return Math.round(frames * pixels * bytesPerPixel);
  } else {
    // Video: use bitrate estimation
    const bitrate =
      settings.format === "webm"
        ? 5000000 // 5 Mbps for WebM
        : 8000000; // 8 Mbps for MP4
    return Math.round((duration / 1000) * (bitrate / 8));
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
