'use client';
import React, { useRef, useEffect } from 'react';
import { useEditor } from '@/hooks/useEditor';
import { useGeometry } from '@/hooks/useGeometry';
import { useWebSocket } from '@/hooks/useWebSocket';
import Editor from '@/components/Editor';
import Viewport from '@/components/Viewport';
import TopMenu from '@/components/TopMenu';
import FileManager from '@/components/FileManager';
import ErrorDisplay from '@/components/ErrorDisplay';
import ResizablePanel from '@/components/ResizablePanel';

export default function Home() {
  // State management
  const { code, setCode, hasUnsavedChanges, save, savedFileId } = useEditor();
  const {
    geometry,
    loading,
    error,
    executionTime,
    setLoading,
    updateGeometry,
    clearGeometry,
  } = useGeometry();
  const { connected: wsConnected } = useWebSocket();

  // File manager ref
  const fileManagerRef = React.useRef<any>(null);

  // Example custom menus
  const customMenus = {
    Edit: {
      label: 'Edit',
      items: [
        {
          label: 'Undo',
          action: () => console.log('Undo'),
          shortcut: 'Ctrl+Z',
          disabled: true // TODO: Implement undo functionality
        },
        {
          label: 'Redo',
          action: () => console.log('Redo'),
          shortcut: 'Ctrl+Y',
          disabled: true // TODO: Implement redo functionality
        },
        { separator: true },
        {
          label: 'Copy',
          action: () => {
            navigator.clipboard.writeText(code);
            console.log('Code copied to clipboard');
          },
          shortcut: 'Ctrl+C'
        },
        {
          label: 'Paste',
          action: async () => {
            try {
              const text = await navigator.clipboard.readText();
              setCode(text);
              console.log('Code pasted from clipboard');
            } catch (error) {
              console.error('Failed to paste from clipboard:', error);
            }
          },
          shortcut: 'Ctrl+V'
        },
        {
          label: 'Select All',
          action: () => {
            // This would need to be handled by the Monaco editor
            console.log('Select all requested');
          },
          shortcut: 'Ctrl+A'
        }
      ]
    },
    View: {
      label: 'View',
      items: [
        {
          label: 'Reset View',
          action: () => console.log('Reset 3D view'),
          shortcut: 'R'
        },
        {
          label: 'Toggle Stats',
          action: () => console.log('Toggle stats overlay'),
          shortcut: 'Ctrl+I'
        },
        {
          label: 'Toggle Grid',
          action: () => console.log('Toggle grid'),
          shortcut: 'G'
        },
        { separator: true },
        {
          label: 'Zoom to Fit',
          action: () => console.log('Zoom to fit geometry'),
          shortcut: 'F'
        },
        {
          label: 'Front View',
          action: () => console.log('Front view'),
          shortcut: '1'
        },
        {
          label: 'Top View',
          action: () => console.log('Top view'),
          shortcut: '7'
        },
        {
          label: 'Side View',
          action: () => console.log('Side view'),
          shortcut: '3'
        }
      ]
    },
    Tools: {
      label: 'Tools',
      items: [
        {
          label: 'Validate Syntax',
          action: () => console.log('Validate OpenSCAD syntax'),
          shortcut: 'Ctrl+L'
        },
        {
          label: 'Format Code',
          action: () => console.log('Format OpenSCAD code'),
          shortcut: 'Ctrl+Shift+F'
        },
        { separator: true },
        {
          label: 'Generate Documentation',
          action: () => console.log('Generate documentation'),
          disabled: true // TODO: Implement doc generation
        },
        {
          label: 'Performance Analysis',
          action: () => console.log('Performance analysis'),
          disabled: true // TODO: Implement perf analysis
        }
      ]
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check if the event target is within Monaco editor
      const target = event.target as HTMLElement;
      const isMonacoEditor = target.closest('.monaco-editor') !== null;

      const { ctrlKey, metaKey, shiftKey, key } = event;
      const cmdOrCtrl = ctrlKey || metaKey;

      if (cmdOrCtrl) {
        switch (key) {
          case 'n':
          case 'N':
            event.preventDefault();
            handleNew();
            break;
          case 'o':
          case 'O':
            event.preventDefault();
            handleOpenFileManager();
            break;
          case 's':
          case 'S':
            event.preventDefault();
            if (shiftKey) {
              // Export .scad (Cmd+Shift+S)
              const scadContent = code;
              const blob = new Blob([scadContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'model.scad';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } else {
              // Save (Cmd+S)
              save();
            }
            break;
          case 'e':
          case 'E':
            event.preventDefault();
            // Export geometry (Cmd+E)
            if (geometry) {
              console.log('Export geometry requested');
            }
            break;
          case 'z':
          case 'Z':
            // Skip undo/redo when in Monaco editor - let Monaco handle it
            if (isMonacoEditor) {
              return;
            }
            event.preventDefault();
            if (shiftKey) {
              // Redo (Cmd+Shift+Z)
              console.log('Redo requested');
            } else {
              // Undo (Cmd+Z)
              console.log('Undo requested');
            }
            break;
          case 'y':
          case 'Y':
            // Skip undo/redo when in Monaco editor - let Monaco handle it
            if (isMonacoEditor) {
              return;
            }
            event.preventDefault();
            // Redo (Cmd+Y)
            console.log('Redo requested');
            break;
          case 'c':
          case 'C':
            // Skip copy/paste when in Monaco editor - let Monaco handle it
            if (isMonacoEditor) {
              return;
            }
            event.preventDefault();
            // Copy (Cmd+C) - only when not in editor
            navigator.clipboard.writeText(code);
            console.log('Code copied to clipboard');
            break;
          case 'v':
          case 'V':
            // Skip copy/paste when in Monaco editor - let Monaco handle it
            if (isMonacoEditor) {
              return;
            }
            event.preventDefault();
            // Paste (Cmd+V) - only when not in editor
            navigator.clipboard.readText().then(text => {
              setCode(text);
              console.log('Code pasted from clipboard');
            }).catch(error => {
              console.error('Failed to paste:', error);
            });
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [code, geometry, save]);

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

  const handleNew = () => {
    setCode('cube(10);');
    clearGeometry();
  };

  const handleOpen = (loadedCode: string) => {
    setCode(loadedCode);
  };

  const handleOpenFileManager = () => {
    fileManagerRef.current?.openFileManager?.();
  };

  // Build left (Editor) and right (Viewport) content for the resizable panel
  const leftContent = (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col bg-[#2D2D2D] rounded-lg border border-[#3D3D3D] overflow-hidden">
        <div className="px-4 py-2 border-b border-[#3D3D3D] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#E5E5E5]">Code Editor</h2>
          <div className="flex gap-2">
            {hasUnsavedChanges && <span className="text-xs text-[#E66E00]">●</span>}
            {wsConnected && <span className="text-xs text-green-400">WS Connected</span>}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            code={code}
            onChange={handleEditorChange}
            onErrors={handleEditorErrors}
            onGeometry={handleEditorGeometry}
            onLoading={handleEditorLoading}
          />
        </div>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorDisplay errors={error} />
        </div>
      )}
      {executionTime !== null && (
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
        {loading && <span className="text-xs text-[#4772B3] animate-pulse">Rendering...</span>}
      </div>
      <div className="flex-1 overflow-hidden">
        <Viewport geometry={geometry} />
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
          // Show export dialog functionality
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
      <div ref={fileManagerRef}>
        <FileManager onOpen={handleOpen} onNew={handleNew} />
      </div>
    </div>
  );
}