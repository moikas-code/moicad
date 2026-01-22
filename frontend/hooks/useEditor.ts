/**
 * useEditor Hook - Manages editor state and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentFile, saveFile } from '@/lib/storage';

export function useEditor(initialCode: string = 'cube(10);') {
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

  // Update code
  const updateCode = useCallback((newCode: string) => {
    setCode(newCode);
    setHasUnsavedChanges(true);
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
    hasUnsavedChanges,
    cursorPosition,
    setCursorPosition,
    save,
    markSaved,
    savedFileId,
  };
}
