import type { RenderStage } from '@moicad/sdk';
/**
 * API Client for moicad Backend Communication
 * Handles REST API calls to the Bun backend server
 */

// Detect if running in Tauri desktop environment
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// In Tauri, the backend always runs on localhost:42069
// In web mode, use environment variable or default
const API_BASE = isTauri
  ? "http://localhost:42069"
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:42069";

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
 * Parse OpenSCAD code to AST
 */
export async function parseCode(code: string): Promise<ParseResult> {
  try {
    const response = await fetch(`${API_BASE}/api/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Parse failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Parse error:", error);
    const message =
      error instanceof Error && error.message.includes("Failed to fetch")
        ? `Could not connect to backend at ${API_BASE}. Is the server running?`
        : `Failed to connect to parser: ${error instanceof Error ? error.message : "Unknown error"}`;

    return {
      ast: null,
      errors: [{ message }],
      success: false,
    };
  }
}

/**
 * Evaluate code to geometry with progress tracking
 *
 * @param code - Source code to evaluate
 * @param onProgress - Progress callback
 * @param language - Language ('javascript' or 'openscad')
 * @param t - Animation time parameter (0-1) for animations
 */
export async function evaluateCode(
  code: string,
  onProgress?: (progress: {
    stage: RenderStage;
    progress: number;
    message: string;
    time?: number;
  }) => void,
  language: 'openscad' | 'javascript' = 'javascript',
  t?: number,
): Promise<EvaluateResult> {
  const startTime = Date.now();

  try {
    onProgress?.({ stage: "initializing", progress: 10, message: "Connecting to backend server." });

    const requestBody: any = { code, language };
    if (t !== undefined) {
      requestBody.t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
    }

    const response = await fetch(`${API_BASE}/api/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    onProgress?.({ stage: "parsing", progress: 30, message: "Parsing your code." });

    if (!response.ok) {
      throw new Error(`Evaluation failed: ${response.statusText}`);
    }

    onProgress?.({ stage: "evaluating", progress: 60, message: "Generating 3D geometry from code." });

    const data = await response.json();

    onProgress?.({
      stage: "complete",
      progress: 90,
      message: "Finalizing geometry and preparing for display.",
      time: Date.now() - startTime,
    });

    return data;
  } catch (error) {
    console.error("Evaluation error:", error);
    const message =
      error instanceof Error && error.message.includes("Failed to fetch")
        ? `Could not connect to backend at ${API_BASE}. Is the server running?`
        : `Failed to evaluate code: ${error instanceof Error ? error.message : "Unknown error"}`;

    return {
      geometry: null,
      errors: [{ message }],
      success: false,
      executionTime: 0,
    };
  }
}

/**
 * Evaluate OpenSCAD code to geometry (legacy version without progress)
 */
export async function evaluateCodeLegacy(
  code: string,
): Promise<EvaluateResult> {
  return evaluateCode(code);
}

/**
 * Export geometry to file format
 */
export async function exportGeometry(
  geometry: GeometryResponse,
  format: "stl" | "obj",
  binary: boolean = true,
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE}/api/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    console.error("Export error:", error);
    if (error instanceof Error && error.message.includes("Failed to fetch")) {
      throw new Error(
        `Could not connect to backend at ${API_BASE}. Is the server running?`,
      );
    }
    throw error;
  }
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
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
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
