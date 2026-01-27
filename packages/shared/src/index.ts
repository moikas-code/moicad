// Shared types for moicad monorepo

export interface Geometry {
  vertices: number[];
  indices: number[];
  normals: number[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  stats?: {
    vertexCount: number;
    faceCount: number;
    volume?: number;
    surfaceArea?: number;
  };
}

export interface EvaluateResult {
  geometry: Geometry | null;
  errors: string[];
  success: boolean;
  executionTime?: number;
  language?: string;
}

export interface ParseResult {
  ast: any;
  errors: string[];
  success: boolean;
  language?: string;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

// Common colors
export const COLORS = {
  red: [1, 0, 0, 1],
  green: [0, 1, 0, 1],
  blue: [0, 0, 1, 1],
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],
  silver: [0.75, 0.75, 0.75, 1],
  cyan: [0, 1, 1, 1],
  magenta: [1, 0, 1, 1],
  yellow: [1, 1, 0, 1],
  gray: [0.5, 0.5, 0.5, 1],
} as const;

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}