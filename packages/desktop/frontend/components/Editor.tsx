'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Editor from '@monaco-editor/react';
import { evaluateCodeWithSDK } from '@/lib/sdk-client';
import type { editor } from 'monaco-editor';

import type { RenderProgress } from '@moicad/sdk';

export type Language = 'openscad' | 'javascript';

interface EditorProps {
  code: string;
  language?: Language;
  onChange: (code: string) => void;
  onErrors?: (errors: string[]) => void;
  onGeometry?: (geometry: any) => void;
  onLoading?: (loading: boolean) => void;
  onProgress?: (progress: RenderProgress) => void;
  onRenderRequest?: () => void;
}

export interface EditorRef {
  render: () => Promise<void>;
  insertAtCursor: (text: string) => void;
}

const EditorComponent = forwardRef<EditorRef, EditorProps>(function EditorComponent({
  code,
  language = 'openscad',
  onChange,
  onErrors,
  onGeometry,
  onLoading,
  onProgress,
  onRenderRequest,
}: EditorProps, ref: React.ForwardedRef<EditorRef>) {
  // Use refs to avoid stale closures and prevent infinite loops
  const callbacksRef = useRef({ onGeometry, onErrors, onLoading, onProgress, onRenderRequest });
  callbacksRef.current = { onGeometry, onErrors, onLoading, onProgress, onRenderRequest };

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    
    // Add keyboard shortcut for Alt+R to trigger render
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyR, () => {
      callbacksRef.current.onRenderRequest?.();
    });

    // Give editor focus after mount to ensure clipboard events work
    setTimeout(() => {
      editor.focus();
    }, 100);
  };

  // Manual render function that can be called from parent
  const renderGeometry = async () => {
    if (!callbacksRef.current.onLoading || !callbacksRef.current.onGeometry || !callbacksRef.current.onErrors) {
      return;
    }

    callbacksRef.current.onLoading(true);
    try {
      const result = await evaluateCodeWithSDK(code, (progress: RenderProgress) => {
        callbacksRef.current.onProgress?.(progress);
      });
      if (result.success && result.geometry) {
        callbacksRef.current.onGeometry(result.geometry);
        callbacksRef.current.onErrors(result.errors.map((e: any) => e.message));
      } else {
        callbacksRef.current.onGeometry(null);
        callbacksRef.current.onErrors(result.errors.map((e: any) => e.message));
      }
    } catch (error) {
      callbacksRef.current.onErrors([`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      callbacksRef.current.onLoading(false);
    }
  };

  // Insert text at current cursor position
  const insertAtCursor = (text: string) => {
    if (!editorRef.current) return;

    const selection = editorRef.current.getSelection();
    if (selection) {
      // Insert text at cursor position
      editorRef.current.executeEdits('', [
        {
          range: selection,
          text: text,
          forceMoveMarkers: true,
        },
      ]);

      // Focus editor after insertion
      editorRef.current.focus();
    }
  };

  // Expose render and insertAtCursor functions to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      render: renderGeometry,
      insertAtCursor,
    })
  );

  // Map language to Monaco editor language
  const monacoLanguage = language === 'javascript' ? 'javascript' : 'cpp';

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        defaultLanguage={monacoLanguage}
        language={monacoLanguage}
        value={code}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Fira Code, Monaco, Courier New',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          wordWrap: 'on',
        }}
      />
    </div>
  );
});

export default EditorComponent;
