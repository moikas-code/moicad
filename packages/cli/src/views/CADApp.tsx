'use client';

import React from 'react';
import { CADEditor, type CADEditorProps } from '@moicad/gui/components';
import '@moicad/gui/styles.css';

/**
 * CLI CAD App - wraps the @moicad/gui CADEditor component
 * This component is the entry point for the CLI's web interface
 */
export function CADApp(props: Partial<CADEditorProps> = {}) {
  return (
    <div className="w-full h-screen bg-[#1D1D1D]">
      <CADEditor
        initialLanguage="javascript"
        showFileManager={true}
        showAnimationExport={true}
        showTopMenu={true}
        showPrinterSettings={true}
        {...props}
      />
    </div>
  );
}

export default CADApp;
