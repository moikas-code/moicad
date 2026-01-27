'use client';

import React, { useEffect, useState } from 'react';
import { useEditor } from '@/hooks/useEditor';
import { useGeometry } from '@/hooks/useGeometry';
import { useWebSocket } from '@/hooks/useWebSocket';
import ErrorBoundary from '@/components/ErrorBoundary';
import Editor from '@/components/Editor';
import Viewport from '@/components/Viewport';
import TopMenu from '@/components/TopMenu';
import FileManager, { FileManagerRef } from '@/components/FileManager';
import ErrorDisplay from '@/components/ErrorDisplay';
import ResizablePanel from '@/components/ResizablePanel';
import { ViewportControlsProvider } from '@/components/ViewportControlsContext';
import { useViewportMenus } from '@/hooks/useViewportMenus';
import type { EditorRef } from '@/components/Editor';
import PrinterSettings from '@/components/PrinterSettings';
import { getDefaultPrinter, PrinterPreset } from '@/lib/printer-presets';

function HomeContent() {
  // State management
  const { code, setCode, hasUnsavedChanges, save } = useEditor();
  const {
    geometry,
    loading,
    error,
    executionTime,
    setLoading,
    updateGeometry,
    clearGeometry,
  } = useGeometry();

  const [renderProgress, setRenderProgress] = useState<{
    stage: string;
    percentage?: number;
    time?: number;
  } | null>(null);

  const [printerSize, setPrinterSize] = useState<PrinterPreset>(getDefaultPrinter());
  const { connected: wsConnected } = useWebSocket();

  // File manager and editor refs
  const fileManagerRef = React.useRef<FileManagerRef>(null);
  const editorRef = React.useRef<any>(null);

  const customMenus = useViewportMenus();

  // Add global keyboard shortcut for Alt+R
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'r') {
        event.preventDefault();
        handleRender();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  const handleEditorChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleEditorErrors = (errors: string[]) => {
    if (errors.length > 0) {
      updateGeometry({ geometry: null, errors, executionTime: 0 });
    }
  };

  const handleEditorGeometry = (geometry: any) => {
    if (geometry) {
      updateGeometry({ geometry, errors: [], executionTime: 0 });
    }
  };

  const handleEditorLoading = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  const handleRender = async () => {
    if (editorRef.current) {
      setRenderProgress({ stage: 'Starting render...', percentage: 0 });
      await editorRef.current.render();
      setRenderProgress(null);
    }
  };

  const handleRenderProgress = (progress: { stage: string; percentage?: number; time?: number }) => {
    setRenderProgress(progress);
  };

  const handleNew = () => {
    setCode('cube(10);');
    clearGeometry();
  };

  const handleOpen = (loadedCode: string) => {
    setCode(loadedCode);
  };

  const handleOpenFileManager = () => {
    fileManagerRef.current?.openFileManager();
  };

  // Build left (Editor) and right (Viewport) content for resizable panel
  const leftContent = (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col bg-[#2D2D2D] rounded-lg border border-[#3D3D3D] overflow-hidden">
        <div className="px-4 py-2 border-b border-[#3D3D3D] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#E5E5E5]">Code Editor</h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleRender}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium text-white bg-[#4772B3] hover:bg-[#5A8BC7] disabled:bg-[#333333] disabled:text-[#666666] rounded transition-colors"
            >
              {loading ? 'Rendering...' : 'Render (Alt+R)'}
            </button>
            {hasUnsavedChanges && <span className="text-xs text-[#E66E00]">●</span>}
            {wsConnected && <span className="text-xs text-green-400">WS Connected</span>}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            ref={editorRef}
            code={code}
            onChange={handleEditorChange}
            onErrors={handleEditorErrors}
            onGeometry={handleEditorGeometry}
            onLoading={handleEditorLoading}
            onProgress={handleRenderProgress}
            onRenderRequest={handleRender}
          />
        </div>
      </div>
      {renderProgress && (
        <div className="mt-2 p-3 bg-[#3D3D3D] rounded">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#B0B0B0]">{renderProgress.stage}</span>
            {renderProgress.percentage !== undefined && (
              <span className="text-xs text-[#4772B3] font-semibold">{renderProgress.percentage}%</span>
            )}
          </div>
          <div className="w-full h-2 bg-[#1D1D1D] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#4772B3] to-[#5A8BC7] transition-all duration-300 ease-out"
              style={{ width: `${renderProgress.percentage || 0}%` }}
            />
          </div>
          {renderProgress.time && (
            <div className="mt-1 text-xs text-[#888888]">
              {renderProgress.time}ms elapsed
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-2">
          <ErrorDisplay errors={error} />
        </div>
      )}
      {executionTime !== null && !renderProgress && (
        <div className="mt-2 p-2 bg-[#3D3D3D] rounded text-xs text-[#B0B0B0]">
          Execution time: {executionTime.toFixed(2)}ms
        </div>
      )}
    </div>
  );

  const rightContent = (
    <div className="flex-1 flex flex-col bg-[#2D2D2D] rounded-lg border border-[#3D3D3D] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#3D3D3D] flex justify-between items-center">
        <h2 className="text-sm font-semibold text-[#E5E5E5]">3D Viewport</h2>
        <div className="flex gap-2 items-center">
          <PrinterSettings 
            currentPrinter={printerSize} 
            onPrinterChange={(printer) => setPrinterSize(printer)}
          />
          {loading && <span className="text-xs text-[#4772B3] animate-pulse">Rendering...</span>}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Viewport geometry={geometry} printerSize={printerSize} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#1D1D1D]" id="moicad-root">
      {/* Top Menu */}
      <TopMenu
        geometry={geometry}
        code={code}
        onNew={handleNew}
        onOpenFiles={handleOpenFileManager}
        onSave={() => save()}
        onExportGeometry={() => {
          console.log('Export geometry dialog requested');
        }}
        unsavedChanges={hasUnsavedChanges}
        customMenus={customMenus}
      />

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanel left={leftContent} right={rightContent} defaultLeft={40} />
      </div>

      {/* File Manager */}
      <FileManager ref={fileManagerRef} onOpen={handleOpen} onNew={handleNew} />
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <ViewportControlsProvider>
        <HomeContent />
      </ViewportControlsProvider>
    </ErrorBoundary>
  );
}