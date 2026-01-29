'use client';

import { useMemo } from 'react';

interface ErrorDisplayProps {
  errors: string | null;
  onLineClick?: (line: number) => void;
}

export default function ErrorDisplay({ errors, onLineClick }: ErrorDisplayProps) {
  const parsedErrors = useMemo(() => {
    if (!errors) return [];

    // Split by newline and parse error messages
    return errors.split('\n').filter((e) => e.trim().length > 0).map((error, idx) => {
      // Try to extract line number from error message
      // Common formats: "Line 5:", "line 5,", "at line 5", etc.
      const lineMatch = error.match(/(?:line|Line)\s*(\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]) : null;

      return {
        id: idx,
        message: error,
        line,
      };
    });
  }, [errors]);

  if (parsedErrors.length === 0) return null;

  return (
    <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-3 space-y-2">
      <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
        <span>⚠️</span>
        {parsedErrors.length === 1 ? 'Error' : `${parsedErrors.length} Errors`}
      </h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {parsedErrors.map((error) => (
          <div
            key={error.id}
            onClick={() => error.line && onLineClick?.(error.line)}
            className={`text-xs text-red-300 flex items-start gap-2 ${
              error.line ? 'cursor-pointer hover:text-red-200 transition-colors' : ''
            }`}
          >
            {error.line && <span className="text-red-500 font-semibold flex-shrink-0">{error.line}:</span>}
            <span className="break-words flex-1">{error.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
