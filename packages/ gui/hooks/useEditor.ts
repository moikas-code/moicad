/**
 * useEditor Hook - Manages editor state and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentFile, saveFile } from '@/lib/storage';

export function useEditor(initialCode: string = `import { Shape } from 'moicad';\n\nexport default Shape.cube(10);`) {
  const [code, setCode] = useState<string>(initialCode);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [savedFileId, setSavedFileId] = useState<string | null>(null);

  // Load saved file on mount
  useEffect(() => {
    const currentFile = getCurrentFile();
    if (currentFile) {
      setCode(currentFile.code);
      setSavedFileId(currentFile.id);
      setHasUnsavedChanges(false);
    }
  }, []);

  // Update code (marks as unsaved)
  const updateCode = useCallback((newCode: string) => {
    setCode(newCode);
    setHasUnsavedChanges(true);
  }, []);

  // Load file (doesn't mark as unsaved)
  const loadFile = useCallback((newCode: string, fileId?: string) => {
    setCode(newCode);
    setSavedFileId(fileId || null);
    setHasUnsavedChanges(false);
  }, []);

  // Save file
  const save = useCallback((name?: string) => {
    try {
      const file = saveFile(name || 'Untitled', code);
      setSavedFileId(file.id);
      setHasUnsavedChanges(false);
      return file;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  }, [code]);

  // Mark as saved
  const markSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    code,
    setCode: updateCode,
    loadFile,
    hasUnsavedChanges,
    cursorPosition,
    setCursorPosition,
    save,
    markSaved,
    savedFileId,
  };
}
