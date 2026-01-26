/**
 * API Client for moicad Backend Communication
 * Handles REST API calls to the Bun backend server
 */

// Detect if running in Tauri desktop environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// In Tauri, the backend always runs on localhost:3000
// In web mode, use environment variable or default
const API_BASE = isTauri
  ? 'http://localhost:3000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

export interface GeometryResponse {
  vertices: number[];
  indices: number[];
  normals: number[];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  stats: {
    vertexCount: number;
    faceCount: number;
  };
  color?: {
    r: number;
    g: number;
    b: number;
    a?: number;
  };
  modifier?: {
    type: '!' | '%' | '#' | '*';
    opacity?: number;
    highlightColor?: string;
  };
  objects?: Array<{
    geometry: any;
    highlight?: {
      objectId: string;
      isSelected?: boolean;
      isHovered?: boolean;
      line?: number;
    };
  }>;
}

export interface EvaluateResult {
  geometry: GeometryResponse | null;
  errors: { message: string; line?: number }[];
  success: boolean;
  executionTime: number;
}

export interface ParseResult {
  ast: any[] | null;
  errors: { message: string; line?: number; column?: number }[];
  success: boolean;
}

/**
 * Parse OpenSCAD code to AST
 */
export async function parseCode(code: string): Promise<ParseResult> {
  try {
    const response = await fetch(`${API_BASE}/api/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Parse failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Parse error:', error);
    return {
      ast: null,
      errors: [{ message: `Failed to connect to parser: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      success: false,
    };
  }
}

/**
 * Evaluate OpenSCAD code to geometry
 */
export async function evaluateCode(code: string): Promise<EvaluateResult> {
  try {
    const response = await fetch(`${API_BASE}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Evaluation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Evaluation error:', error);
    return {
      geometry: null,
      errors: [{ message: `Failed to evaluate code: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      success: false,
      executionTime: 0,
    };
  }
}

/**
 * Export geometry to file format
 */
export async function exportGeometry(
  geometry: GeometryResponse,
  format: 'stl' | 'obj',
  binary: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE}/api/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        geometry,
        format,
        binary,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string) {
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
 * Check server health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
