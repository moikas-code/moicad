/**
 * LocalStorage utilities for saving/loading OpenSCAD files
 */

const STORAGE_KEY = 'moicad_files';
const CURRENT_FILE_KEY = 'moicad_current_file';

export interface SavedFile {
  id: string;
  name: string;
  code: string;
  timestamp: number;
  description?: string;
}

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
