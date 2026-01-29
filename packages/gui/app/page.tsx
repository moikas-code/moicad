'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import { ViewportControlsProvider } from '@/components/ViewportControlsContext';
import CADEditor from '@/components/CADEditor';

export default function Home() {
  return (
    <ErrorBoundary>
      <ViewportControlsProvider>
        <CADEditor />
      </ViewportControlsProvider>
    </ErrorBoundary>
  );
}
