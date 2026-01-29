/**
 * API Client for moicad Frontend Demo
 * Handles REST API calls to the SDK-powered API routes
 */

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
    volume?: number;
  };
  color?: {
    r: number;
    g: number;
    b: number;
    a?: number;
  };
  modifier?: {
    type: "!" | "%" | "#" | "*";
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
 * Evaluate JavaScript or OpenSCAD code to geometry with SDK
 */
export async function evaluateCode(
  code: string,
  language: string,
  onProgress?: (progress: any) => void
): Promise<EvaluateResult> {
  try {
    onProgress?.({ 
      stage: 'evaluating' as any,
      progress: 50,
      message: 'Processing code with SDK...'
    });

    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      throw new Error(`Evaluation failed: ${response.statusText}`);
    }

    const data = await response.json();

    onProgress?.({
      stage: 'complete' as any,
      progress: 90,
      message: 'Geometry ready for display',
    });

    return data;
  } catch (error) {
    console.error('Evaluation error:', error);
    return {
      geometry: null,
      errors: [{ message: error instanceof Error ? error.message : 'Network error' }],
      success: false,
      executionTime: 0,
    };
  }
}

/**
 * Parse OpenSCAD code to AST
 */
export async function parseCode(code: string): Promise<ParseResult> {
  try {
    const response = await fetch('/api/parse', {
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
      errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
      success: false,
    };
  }
}

/**
 * Export geometry to file format
 */
export async function exportGeometry(
  geometry: GeometryResponse,
  format: 'stl' | 'obj',
): Promise<Blob> {
  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ geometry, format }),
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