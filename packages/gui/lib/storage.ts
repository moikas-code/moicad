/**
 * LocalStorage utilities for saving/loading OpenSCAD files
 */

const STORAGE_KEY = 'moicad_files';
const CURRENT_FILE_KEY = 'moicad_current_file';
const AUTO_SAVE_KEY = 'moicad_autosave';
const SETTINGS_KEY = 'moicad_settings';

export interface SavedFile {
  id: string;
  name: string;
  code: string;
  timestamp: number;
  description?: string;
}

/** Layout preferences stored for resizable panels */
export interface LayoutPrefs {
  leftWidth: number; // percentage (0-100)
  rightWidth?: number;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
  lastModified?: number;
}

const LAYOUT_KEY = 'moicad-layout_v1';

/**
 * Save file to localStorage
 */
export function saveFile(name: string, code: string, description?: string): SavedFile {
  try {
    const files = loadAllFiles();
    const id = `file_${Date.now()}`;
    const file: SavedFile = {
      id,
      name,
      code,
      timestamp: Date.now(),
      description,
    };

    files.push(file);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    localStorage.setItem(CURRENT_FILE_KEY, id);

    return file;
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
}

/**
 * Load file from localStorage
 */
export function loadFile(id: string): SavedFile | null {
  try {
    const files = loadAllFiles();
    const file = files.find((f) => f.id === id);
    if (file) {
      localStorage.setItem(CURRENT_FILE_KEY, id);
    }
    return file || null;
  } catch (error) {
    console.error('Failed to load file:', error);
    return null;
  }
}

/**
 * Load all saved files
 */
export function loadAllFiles(): SavedFile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load files:', error);
    return [];
  }
}

/**
 * Delete file from localStorage
 */
export function deleteFile(id: string): boolean {
  try {
    const files = loadAllFiles();
    const filtered = files.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    if (localStorage.getItem(CURRENT_FILE_KEY) === id) {
      localStorage.removeItem(CURRENT_FILE_KEY);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * Get current file ID
 */
export function getCurrentFileId(): string | null {
  try {
    return localStorage.getItem(CURRENT_FILE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get current file
 */
export function getCurrentFile(): SavedFile | null {
  const id = getCurrentFileId();
  if (!id) return null;
  return loadFile(id);
}

/**
 * Create new file with default code
 */
export function createNewFile(): SavedFile {
  return saveFile('Untitled', 'cube(10);');
}

/**
 * Export file as .scad file
 */
export function exportFileAsScad(code: string, filename: string = 'model.scad') {
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import code from file
 */
export function importFileFromScad(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

/**
 * Save layout preferences to localStorage
 */
export function saveLayoutPrefs(p: Partial<LayoutPrefs>): void {
  try {
    const current = loadLayoutPrefs() ?? { leftWidth: 40 } as LayoutPrefs;
    const merged: LayoutPrefs = {
      ...current,
      ...p,
      lastModified: Date.now(),
    };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('Failed to save layout prefs', err);
  }
}

/**
 * Load layout preferences from localStorage
 */
export function loadLayoutPrefs(): LayoutPrefs | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutPrefs;
    return parsed;
  } catch (err) {
    console.error('Failed to load layout prefs', err);
    return null;
  }
}

/**
 * Auto-save code for crash recovery
 * This is separate from regular file saving - it preserves unsaved changes
 */
export interface AutoSaveData {
  code: string;
  timestamp: number;
}

export function saveAutoSave(code: string): void {
  try {
    const data: AutoSaveData = {
      code,
      timestamp: Date.now(),
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to auto-save:', error);
  }
}

export function loadAutoSave(): AutoSaveData | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutoSaveData;
    
    // Check if auto-save is too old (older than 7 days)
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > oneWeek) {
      clearAutoSave();
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load auto-save:', error);
    return null;
  }
}

export function clearAutoSave(): void {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
  } catch (error) {
    console.error('Failed to clear auto-save:', error);
  }
}

/**
 * User settings
 */
export interface UserSettings {
  timeout: number; // milliseconds
  autoSave: boolean;
  autoSaveDelay: number;
  progressDetail: 'simple' | 'detailed';
  lastModified: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  timeout: 60000, // 60 seconds
  autoSave: true,
  autoSaveDelay: 500, // 500ms
  progressDetail: 'simple',
  lastModified: Date.now(),
};

export function saveSettings(settings: Partial<UserSettings>): void {
  try {
    const current = loadSettings();
    const merged: UserSettings = {
      ...current,
      ...settings,
      lastModified: Date.now(),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as UserSettings;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}
