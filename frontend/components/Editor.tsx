'use client';

import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { evaluateCode } from '@/lib/api-client';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  onErrors: (errors: string[]) => void;
  onGeometry: (geometry: any) => void;
  onLoading: (loading: boolean) => void;
}

export default function EditorComponent({
  code,
  onChange,
  onErrors,
  onGeometry,
  onLoading,
}: EditorProps) {
  // Use refs to avoid stale closures and prevent infinite loops
  const callbacksRef = useRef({ onGeometry, onErrors, onLoading });
  callbacksRef.current = { onGeometry, onErrors, onLoading };

  useEffect(() => {
    // Debounce evaluation - only triggers when code changes
    const timer = setTimeout(async () => {
      callbacksRef.current.onLoading(true);
      try {
        const result = await evaluateCode(code);
        if (result.success && result.geometry) {
          callbacksRef.current.onGeometry(result.geometry);
          callbacksRef.current.onErrors(result.errors.map((e) => e.message));
        } else {
          callbacksRef.current.onGeometry(null);
          callbacksRef.current.onErrors(result.errors.map((e) => e.message));
        }
      } catch (error) {
        callbacksRef.current.onErrors([`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      } finally {
        callbacksRef.current.onLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [code]); // Only code as dependency - callbacks accessed via ref

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        defaultLanguage="cpp"
        defaultValue={code}
        value={code}
        onChange={(value) => onChange(value || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
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
}
