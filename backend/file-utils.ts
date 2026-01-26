import { join, resolve } from 'path';
import { readFileSync } from 'fs';

// Allowed file extensions for surface data
const ALLOWED_EXTENSIONS = ['.dat', '.txt', '.csv'];

// Maximum file size to prevent DoS attacks (1MB)
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
 * Read a text file with security validation (async)
 * @param filePath - Path to the file (relative or absolute)
 * @param workingDirectory - Base directory for relative paths
 * @returns FileReadResult with content or error
 */
export async function readTextFile(filePath: string, workingDirectory: string = process.cwd()): Promise<FileReadResult> {
  try {
    // Validate file path
    const validation = validateFilePath(filePath, workingDirectory);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Check file extension
    const ext = getFileExtension(filePath);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        success: false,
        error: `File extension "${ext}" not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      };
    }

    // Read file
    const fullPath = validation.resolvedPath!;
    const file = Bun.file(fullPath);
    
    // Check file size
    const size = file.size;
    if (size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${size} bytes (max: ${MAX_FILE_SIZE} bytes)`
      };
    }

    // Read content (async to sync for simplicity)
    const content = await file.text();
    
    return {
      success: true,
      content
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file "${filePath}": ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Parse surface data from string content
 * Supports space-separated, tab-separated, and comma-separated values
 * @param content - File content as string
 * @returns Parsed data as flat f32 array
 */
export function parseSurfaceData(content: string): Float32Array {
  // Split by lines and filter out empty lines
  const lines = content.trim().split('\n').filter(line => line.trim());
  const numbers: number[] = [];

  for (const line of lines) {
    // Split by whitespace, tabs, or commas
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
 * Read a text file with security validation (sync)
 * @param filePath - Path to the file (relative or absolute)
 * @param workingDirectory - Base directory for relative paths
 * @returns FileReadSyncResult with content or error
 */
export function readTextFileSync(filePath: string, workingDirectory: string = process.cwd()): FileReadSyncResult {
  try {
    // Validate file path
    const validation = validateFilePath(filePath, workingDirectory);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Check file extension
    const ext = getFileExtension(filePath);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        success: false,
        error: `File extension "${ext}" not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      };
    }

    // Read file using Node.js sync method for compatibility
    const fullPath = validation.resolvedPath!;
    const content = readFileSync(fullPath, 'utf8');
    
    // Check file size (for sync, we need to read first)
    try {
      const stats = readFileSync(fullPath);
      const size = stats.length;
      if (size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File too large: ${size} bytes (max: ${MAX_FILE_SIZE} bytes)`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file "${filePath}": ${error instanceof Error ? error.message : String(error)}`
      };
    }

    return {
      success: true,
      content
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file "${filePath}": ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate file path for security
 */
function validateFilePath(filePath: string, workingDirectory: string): { valid: boolean; resolvedPath?: string; error?: string } {
  try {
    // Resolve relative to working directory
    const resolved = resolve(workingDirectory, filePath);
    
    // Normalize paths for comparison
    const normalizedWorking = normalizePath(resolve(workingDirectory));
    const normalizedResolved = normalizePath(resolved);
    
    // Check for path traversal attacks
    if (!normalizedResolved.startsWith(normalizedWorking)) {
      return {
        valid: false,
        error: `Path traversal detected: "${filePath}" attempts to access outside working directory`
      };
    }

    // Check for dangerous patterns
    if (filePath.includes('..') || filePath.includes('~') || filePath.startsWith('/')) {
      return {
        valid: false,
        error: `Dangerous path pattern detected in: "${filePath}"`
      };
    }

    return {
      valid: true,
      resolvedPath: normalizedResolved
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid path "${filePath}": ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Normalize file path for consistent comparison
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Get file extension in lowercase
 */
function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot >= 0 ? filePath.slice(lastDot).toLowerCase() : '';
}