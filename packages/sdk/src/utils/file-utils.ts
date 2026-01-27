/**
 * File utilities for SDK
 * Supports both Node.js/Bun and browser environments
 */

// Declare Bun global for type checking
declare const Bun: any;

// Maximum file size (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface FileReadSyncResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Read a text file asynchronously
 * Works in Node.js, Bun, and browser (with limitations)
 */
export async function readTextFile(
  filePath: string,
  _workingDirectory: string = ''
): Promise<FileReadResult> {
  try {
    // Try Bun first
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(filePath);
      const content = await file.text();
      return { success: true, content };
    }

    // Try Node.js fs/promises
    if (typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    }

    // Browser - file reading not supported directly
    return {
      success: false,
      error: 'File reading not supported in browser environment. Use data URLs or fetch instead.',
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file "${filePath}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Read a text file synchronously (Node.js/Bun only)
 */
export function readTextFileSync(
  filePath: string,
  _workingDirectory: string = ''
): FileReadSyncResult {
  try {
    // Try Bun first
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(filePath);
      // Bun doesn't have sync file read, use a workaround
      // This is a limitation - for truly sync reads, use Node.js
      return {
        success: false,
        error: 'Sync file reading in Bun requires Node.js fs module',
      };
    }

    // Node.js fs
    if (typeof process !== 'undefined' && process.versions?.node) {
      // Dynamic require for Node.js
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    }

    return {
      success: false,
      error: 'Sync file reading not supported in this environment',
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file "${filePath}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse surface data from string content
 * Supports space-separated, tab-separated, and comma-separated values
 */
export function parseSurfaceData(content: string): Float32Array {
  const lines = content.trim().split('\n').filter(line => line.trim());
  const numbers: number[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/[\s,\t]+/);
    for (const part of parts) {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }

  return new Float32Array(numbers);
}

/**
 * Check if a path is safe (no directory traversal)
 */
export function isPathSafe(filePath: string): boolean {
  // Block obvious traversal attempts
  if (filePath.includes('..')) return false;
  if (filePath.startsWith('/')) return false;
  if (filePath.includes('~')) return false;
  return true;
}
