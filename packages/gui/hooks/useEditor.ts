/**
 * useEditor Hook - Manages editor state and persistence with auto-save
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentFile, saveFile, saveAutoSave, loadAutoSave, clearAutoSave } from '@/lib/storage';

export interface UseEditorOptions {
  /** Enable auto-save (default: true) */
  autoSave?: boolean;
  /** Auto-save debounce delay in ms (default: 500) */
  autoSaveDelay?: number;
  /** Enable auto-save to localStorage for crash recovery (default: true) */
  autoSaveToStorage?: boolean;
  /** Initial code to display if no saved file exists */
  initialCode?: string;
}

export interface EditorState {
  code: string;
  setCode: (newCode: string) => void;
  loadFile: (newCode: string, fileId?: string) => void;
  hasUnsavedChanges: boolean;
  cursorPosition: number;
  setCursorPosition: (position: number) => void;
  save: (name?: string) => { id: string; name: string; code: string; timestamp: number } | undefined;
  markSaved: () => void;
  savedFileId: string | null;
  lastSavedAt: Date | null;
  isAutoSaving: boolean;
}

export function useEditor(options: UseEditorOptions = {}): EditorState {
  const {
    autoSave = true,
    autoSaveDelay = 500,
    autoSaveToStorage = true,
    initialCode = `import { Shape } from 'moicad';

export default Shape.cube(10);`
  } = options;

  const [code, setCodeState] = useState<string>(initialCode);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [savedFileId, setSavedFileId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Refs for debounce
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  // Load saved file on mount - ONLY ONCE
  useEffect(() => {
    // Prevent re-loading on re-renders
    if (isMountedRef.current) return;
    isMountedRef.current = true;
    
    // First, try to restore from auto-save (for crash recovery)
    const autoSaved = autoSaveToStorage ? loadAutoSave() : null;
    
    if (autoSaved) {
      // Restore from auto-save (user had unsaved changes when they left/refreshed)
      setCodeState(autoSaved.code);
      setHasUnsavedChanges(true);
      console.log('[useEditor] Restored from auto-save');
      return;
    }
    
    // Otherwise, load from saved file
    const currentFile = getCurrentFile();
    if (currentFile) {
      setCodeState(currentFile.code);
      setSavedFileId(currentFile.id);
      setHasUnsavedChanges(false);
      console.log('[useEditor] Loaded saved file:', currentFile.name);
    } else {
      // No saved file, use initial code
      setCodeState(initialCode);
      console.log('[useEditor] Using initial code');
    }
  }, []); // Empty deps - only run once on mount

  // Update code (marks as unsaved and triggers auto-save)
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
    setHasUnsavedChanges(true);
    
    // Auto-save to localStorage immediately for crash recovery
    if (autoSaveToStorage) {
      saveAutoSave(newCode);
    }
  }, [autoSaveToStorage]);

  // Auto-save to file after debounce
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges) return;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set up new timer
    autoSaveTimerRef.current = setTimeout(() => {
      setIsAutoSaving(true);
      try {
        const fileName = savedFileId ? undefined : 'Auto-saved';
        const file = saveFile(fileName || 'Auto-saved', code);
        setSavedFileId(file.id);
        setLastSavedAt(new Date());
        console.log('[useEditor] Auto-saved at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('[useEditor] Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, autoSaveDelay);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [code, hasUnsavedChanges, autoSave, autoSaveDelay, savedFileId]);

  // Load file (doesn't mark as unsaved)
  const loadFile = useCallback((newCode: string, fileId?: string) => {
    setCodeState(newCode);
    setSavedFileId(fileId || null);
    setHasUnsavedChanges(false);
    setLastSavedAt(new Date());
    
    // Clear auto-save when loading a file
    if (autoSaveToStorage) {
      clearAutoSave();
    }
    
    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, [autoSaveToStorage]);

  // Manual save
  const save = useCallback((name?: string) => {
    try {
      const file = saveFile(name || 'Untitled', code);
      setSavedFileId(file.id);
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      
      // Clear auto-save after manual save
      if (autoSaveToStorage) {
        clearAutoSave();
      }
      
      console.log('[useEditor] Manually saved:', file.name);
      return file;
    } catch (error) {
      console.error('[useEditor] Failed to save:', error);
      throw error;
    }
  }, [code, autoSaveToStorage]);

  // Mark as saved without triggering save
  const markSaved = useCallback(() => {
    setHasUnsavedChanges(false);
    setLastSavedAt(new Date());
    
    if (autoSaveToStorage) {
      clearAutoSave();
    }
  }, [autoSaveToStorage]);

  return {
    code,
    setCode,
    loadFile,
    hasUnsavedChanges,
    cursorPosition,
    setCursorPosition,
    save,
    markSaved,
    savedFileId,
    lastSavedAt,
    isAutoSaving,
  };
}
