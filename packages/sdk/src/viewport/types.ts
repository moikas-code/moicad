/**
 * Viewport Module Types
 */

export interface SceneConfig {
  container: HTMLElement;
  width: number;
  height: number;
  printerSize?: {
    width: number; // X axis
    depth: number; // Y axis  
    height: number; // Z axis
    name?: string;
  };
}

export interface ViewportConfig {
  container: HTMLElement;
  width: number;
  height: number;
  printerSize?: {
    width: number;
    depth: number;
    height: number;
    name?: string;
  };
  enableGrid?: boolean;
  enableStats?: boolean;
  enableControls?: boolean;
  backgroundColor?: string;
}

export interface ViewportEventHandlers {
  onHover?: (objectId: string | null) => void;
  onSelect?: (objectIds: string[]) => void;
  onUpdate?: (stats: ViewportStats) => void;
}

export interface ViewportStats {
  fps: number;
  geometries: number;
  vertices: number;
  triangles: number;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export type HighlightMode = 'hover' | 'select' | 'both' | 'none';