'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import type { EditorRef, Language } from '@/components/Editor';
import PrinterSettings from '@/components/PrinterSettings';
import { getDefaultPrinter, PrinterPreset } from '@/lib/printer-presets';
import RenderProgressBar from '@/components/RenderProgressBar';
import type { RenderProgress } from '@moicad/sdk';
import ExportAnimationDialog from '@/components/ExportAnimationDialog';
import { detectAnimation, calculateTotalFrames } from '@/lib/animation-utils';
import { exportAnimation, type FrameRenderer } from '@/lib/export-animation';

// Type alias for export settings (matches the component)
type ExportSettings = {
  format: 'gif' | 'webm' | 'mp4';
  width: number;
  height: number;
  fps: number;
  quality: number;
  loop: boolean;
};

function HomeContent() {
  // State management
  const { code, setCode, loadFile, hasUnsavedChanges, save } = useEditor();
  const {
    geometry,
    loading,
    error,
    executionTime,
    setLoading,
    updateGeometry,
    clearGeometry,
  } = useGeometry();

  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    // Load language preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moicad-language');
      if (saved) {
        return (saved === 'javascript' ? 'javascript' : 'openscad') as Language;
      }
    }
    // Default to JavaScript for new users
    return 'javascript';
  });

  const [printerSize, setPrinterSize] = useState<PrinterPreset>(getDefaultPrinter());
  const { connected: wsConnected } = useWebSocket();
  
  // Animation state
  const [isAnimation, setIsAnimation] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Save language preference to localStorage
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('moicad-language', newLanguage);
    }
    // Update code if switching to JavaScript for the first time
    if (newLanguage === 'javascript' && code === 'cube(10);') {
      setCode(`import { Shape } from 'moicad';\n\nexport default Shape.cube(10);`);
    } else if (newLanguage === 'openscad' && code.includes('import { Shape')) {
      setCode('cube(10);');
    }
  };

  // File manager and editor refs
  const fileManagerRef = React.useRef<FileManagerRef>(null);
  const editorRef = React.useRef<any>(null);

  const viewportMenus = useViewportMenus();

  // Examples menu with starter templates
  const examplesMenu = {
    Examples: {
      label: 'Examples',
      items: [
        {
          label: 'Basic Cube',
          action: () => {
            const template = language === 'javascript'
              ? `import { Shape } from 'moicad';\n\n// Simple cube example\nexport default Shape.cube(10);`
              : 'cube(10);';
            loadFile(template);
            clearGeometry();
          }
        },
        {
          label: 'Sphere',
          action: () => {
            const template = language === 'javascript'
              ? `import { Shape } from 'moicad';\n\n// Sphere with custom resolution\nexport default Shape.sphere(10, { $fn: 32 });`
              : 'sphere(10, $fn=32);';
            loadFile(template);
            clearGeometry();
          }
        },
        {
          label: 'Cylinder',
          action: () => {
            const template = language === 'javascript'
              ? `import { Shape } from 'moicad';\n\n// Cylinder: height=20, radius=5\nexport default Shape.cylinder(20, 5);`
              : 'cylinder(h=20, r=5);';
            loadFile(template);
            clearGeometry();
          }
        },
        { separator: true },
        {
          label: 'Boolean Operations',
          action: () => {
            const template = language === 'javascript'
              ? `import { Shape } from 'moicad';\n\n// Cube with spherical cutout\nconst cube = Shape.cube([20, 20, 10]);\nconst sphere = Shape.sphere(8).translate([10, 10, 5]);\n\nexport default cube.subtract(sphere);`
              : 'difference() {\n  cube([20, 20, 10]);\n  translate([10, 10, 5]) sphere(8);\n}';
            loadFile(template);
            clearGeometry();
          }
        },
        {
          label: 'Parametric Class',
          action: () => {
            const template = language === 'javascript'
              ? `import { Shape } from 'moicad';\n\n// ISO Metric Bolt with realistic threads\nclass ISOMetricBolt {\n  constructor(diameter, length, pitch = null) {\n    this.diameter = diameter; // Nominal diameter (M5 = 5mm)\n    this.length = length;\n    // Standard ISO metric thread pitches\n    this.pitch = pitch || this.getStandardPitch(diameter);\n    this.threadHeight = this.pitch * 0.54; // ISO standard\n  }\n\n  getStandardPitch(diameter) {\n    // Standard coarse thread pitches\n    const pitches = {\n      3: 0.5, 4: 0.7, 5: 0.8, 6: 1.0, 8: 1.25,\n      10: 1.5, 12: 1.75, 16: 2.0, 20: 2.5\n    };\n    return pitches[diameter] || 1.0;\n  }\n\n  build() {\n    // Core diameter (nominal - thread height)\n    const coreRadius = (this.diameter / 2) - this.threadHeight;\n    const shaft = Shape.cylinder(this.length, coreRadius);\n    \n    // Thread profile (60-degree ISO profile)\n    const threadProfile = Shape.polygon([\n      [coreRadius, 0],\n      [this.diameter / 2, this.pitch / 2],\n      [coreRadius, this.pitch]\n    ]);\n    \n    // Create helical thread\n    const turns = this.length / this.pitch;\n    const thread = threadProfile.linearExtrude(this.length, { \n      twist: 360 * turns, \n      $fn: 48\n    });\n    \n    const threadedShaft = shaft.union(thread);\n    \n    // Hexagonal head (ISO standard)\n    const headHeight = this.diameter * 0.7;\n    const headDiameter = this.diameter * 1.6;\n    const head = Shape.cylinder(headHeight, headDiameter / 2, { $fn: 6 })\n      .translate([0, 0, this.length]);\n    \n    return threadedShaft.union(head);\n  }\n}\n\n// M5 bolt, 20mm long\nexport default new ISOMetricBolt(5, 20).build();`
              : 'module bolt(length=20, diameter=5) {\n  cylinder(h=length, r=diameter/2);\n  translate([0, 0, length])\n    cylinder(h=diameter*0.7, r=diameter*0.9, $fn=6);\n}\n\nbolt();';
            loadFile(template);
            clearGeometry();
          }
        }
      ]
    }
  };

  const customMenus = { ...viewportMenus, ...examplesMenu };

  // Initialize code template based on saved language preference (on mount only)
  useEffect(() => {
    const jsTemplate = `import { Shape } from 'moicad';\n\nexport default Shape.cube(10);`;
    const osTemplate = 'cube(10);';

    // Sync code with language if user is starting with default template
    if (language === 'javascript' && code === osTemplate) {
      setCode(jsTemplate);
    } else if (language === 'openscad' && code === jsTemplate) {
      setCode(osTemplate);
    }
  }, []); // Empty deps - run only on mount

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
    // Detect if code contains animation
    const hasAnimation = detectAnimation(newCode, language);
    setIsAnimation(hasAnimation);
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
      setRenderProgress({
        stage: 'initializing',
        progress: 0,
        message: 'Starting render...'
      });
      await editorRef.current.render();
      setRenderProgress(null);
    }
  };

  const handleAnimationExport = async (settings: ExportSettings) => {
    try {
      // Validate format - only gif and webm are supported by exportAnimation
      if (settings.format === 'mp4') {
        alert('MP4 export is not yet supported. Please choose GIF or WebM.');
        return;
      }

      // Calculate total frames
      const totalFrames = calculateTotalFrames(settings.fps, 2000); // Default 2 second duration

      // Create frame renderer that captures from viewport
      const frameRenderer: FrameRenderer = async (t: number) => {
        // Re-render with t parameter
        if (editorRef.current && 'renderWithT' in editorRef.current) {
          await editorRef.current.renderWithT(t);

          // Wait for rendering to complete
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Capture frame from Three.js viewport
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) {
          throw new Error('Could not find viewport canvas for frame capture');
        }
        return canvas;
      };

      // Convert settings format to match exportAnimation signature
      const exportSettings = {
        format: settings.format as 'gif' | 'webm',
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        quality: settings.quality,
        loop: settings.loop,
      };

      // Export animation with progress updates
      await exportAnimation(
        frameRenderer,
        exportSettings,
        totalFrames,
        (progress) => {
          console.log(`Export progress: ${progress}%`);
        }
      );

      // Close dialog on success
      setShowExportDialog(false);
    } catch (error) {
      console.error('Animation export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRenderProgress = (progress: RenderProgress) => {
    setRenderProgress(progress);
  };

  const handleNew = () => {
    // Create new file with template matching current language
    const template = language === 'javascript'
      ? `import { Shape } from 'moicad';\n\nexport default Shape.cube(10);`
      : 'cube(10);';
    loadFile(template);
    clearGeometry();
  };

  const handleOpen = (loadedCode: string) => {
    loadFile(loadedCode);
    clearGeometry();
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
            language={language}
            onChange={handleEditorChange}
            onErrors={handleEditorErrors}
            onGeometry={handleEditorGeometry}
            onLoading={handleEditorLoading}
            onProgress={handleRenderProgress}
            onRenderRequest={handleRender}
          />
        </div>
      </div>
      {/* Use the new RenderProgressBar component */}
      <RenderProgressBar progress={renderProgress} show={renderProgress !== null} />
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
        language={language}
        onNew={handleNew}
        onOpenFiles={handleOpenFileManager}
        onSave={() => save()}
        onExportGeometry={() => {
          console.log('Export geometry dialog requested');
        }}
        onLanguageChange={handleLanguageChange}
        unsavedChanges={hasUnsavedChanges}
        customMenus={customMenus}
      />

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanel left={leftContent} right={rightContent} defaultLeft={40} />
      </div>

      {/* File Manager */}
      <FileManager ref={fileManagerRef} onOpen={handleOpen} onNew={handleNew} />

      {/* Export Animation Dialog - shows when animation is detected */}
      <ExportAnimationDialog
        isOpen={showExportDialog}
        duration={2000}
        onClose={() => setShowExportDialog(false)}
        onExport={handleAnimationExport}
      />

      {/* Animation Indicator */}
      {isAnimation && (
        <div className="fixed bottom-6 right-6 bg-green-900/30 border border-green-500 rounded-lg p-3 text-sm text-green-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Animation detected</span>
            <button
              onClick={() => setShowExportDialog(true)}
              className="ml-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
            >
              Export
            </button>
          </div>
        </div>
      )}
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