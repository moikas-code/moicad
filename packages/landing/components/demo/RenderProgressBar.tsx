"use client";

import { useEffect, useState } from "react";
import type { RenderProgress } from "../../shared/types";

interface RenderProgressBarProps {
  progress: RenderProgress | null;
  show: boolean;
}

export default function RenderProgressBar({ progress, show }: RenderProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    if (progress) {
      setDisplayProgress(progress.progress * 100);
    }
  }, [progress]);

  if (!show || !progress) {
    return null;
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "initializing":
      case "parsing":
        return "bg-blue-500";
      case "analyzing":
      case "evaluating":
        return "bg-purple-500";
      case "chunking":
        return "bg-yellow-500";
      case "optimizing":
        return "bg-orange-500";
      case "combining":
      case "serializing":
        return "bg-green-500";
      case "complete":
        return "bg-green-600";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStageLabel = (stage: string) => {
    return stage
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px] z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-200">
          {getStageLabel(progress.stage)}
        </span>
        <span className="text-xs text-gray-400">
          {Math.round(displayProgress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className={`h-full ${getStageColor(progress.stage)} transition-all duration-300 ease-out`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Message */}
      <p className="text-xs text-gray-400 mb-2">{progress.message}</p>

      {/* Details */}
      {progress.details && (
        <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
          {progress.details.memoryUsageMB !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Memory:</span>
              <span className="text-gray-300">
                {progress.details.memoryUsageMB}MB
              </span>
            </div>
          )}

          {progress.details.currentChunk !== undefined &&
            progress.details.totalChunks !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Chunks:</span>
                <span className="text-gray-300">
                  {progress.details.currentChunk} / {progress.details.totalChunks}
                </span>
              </div>
            )}

          {progress.details.nodesProcessed !== undefined &&
            progress.details.totalNodes !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Nodes:</span>
                <span className="text-gray-300">
                  {progress.details.nodesProcessed} / {progress.details.totalNodes}
                </span>
              </div>
            )}

          {progress.details.estimatedTimeRemainingMs !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Remaining:</span>
              <span className="text-gray-300">
                {Math.round(progress.details.estimatedTimeRemainingMs / 1000)}s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
