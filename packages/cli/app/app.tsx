/**
 * moicad CLI - App Entry Point
 * Bundled by Vite into gui-bundle.js
 * This is the main React app that runs in the browser
 */

import './styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CADEditor, ViewportControlsProvider } from '@moicad/gui/components';

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ViewportControlsProvider>
      <CADEditor
        initialLanguage="javascript"
        showFileManager={true}
        showAnimationExport={true}
        showTopMenu={true}
        showPrinterSettings={true}
        apiBaseUrl=""
      />
    </ViewportControlsProvider>
  </React.StrictMode>
);
