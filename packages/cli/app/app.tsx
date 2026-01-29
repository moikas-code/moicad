import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  CADEditor,
  ViewportControlsProvider,
  ErrorBoundary
} from '@moicad/gui/components';

function App() {
  return (
    <ErrorBoundary>
      <ViewportControlsProvider>
        <CADEditor
          initialLanguage="javascript"
          initialCode={`import { cube } from "@moicad/sdk";

export default cube(20);`}
        />
      </ViewportControlsProvider>
    </ErrorBoundary>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
