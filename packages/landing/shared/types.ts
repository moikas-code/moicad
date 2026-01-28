export interface RenderProgress {
  stage: string;
  progress: number;
  message: string;
  details?: {
    memoryUsageMB?: number;
    currentChunk?: number;
    totalChunks?: number;
    nodesProcessed?: number;
    totalNodes?: number;
    estimatedTimeRemainingMs?: number;
  };
}

export interface Geometry {
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
  objects?: GeometryObject[];
}

export interface GeometryObject {
  geometry: any;
  highlight?: HighlightInfo;
}

export interface HighlightInfo {
  objectId: string;
  isSelected?: boolean;
  isHovered?: boolean;
  line?: number;
}