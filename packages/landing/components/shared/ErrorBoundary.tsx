'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error | null; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#1D1D1D] flex items-center justify-center p-4">
      <div className="bg-[#2D2D2D] border border-[#3D3D3D] rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💥</span>
          <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        </div>

        {error && (
          <div className="mb-4">
            <p className="text-sm text-red-400 mb-2">Error details:</p>
            <div className="bg-[#1D1D1D] p-3 rounded text-xs text-[#B0B0B0] font-mono break-words">
              {error.message}
            </div>
          </div>
        )}

        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white text-sm rounded transition-colors"
        >
          Try Again
        </button>

        <p className="text-xs text-[#808080] mt-3 text-center">
          If the problem persists, try refreshing the page.
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
