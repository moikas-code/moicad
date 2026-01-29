'use client';

interface ErrorDisplayProps {
  error: string;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-red-400">❌</div>
        <div className="font-semibold text-red-400">Error</div>
      </div>
      <div className="text-red-200 font-mono text-sm">
        {error}
      </div>
    </div>
  );
}