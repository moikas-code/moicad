/**
 * Geometry Conversion Utilities
 *
 * Converts between manifold-3d format and moicad's Geometry type.
 * Handles metadata preservation through CSG operations.
 */

import type { Geometry } from "../types/geometry-types";
import type {
  ManifoldObject,
  ManifoldMesh,
  ManifoldWithMeta,
} from "./types";
import { getManifold } from "./engine";

/**
 * Convert a Manifold object to moicad's Geometry format
 * Uses buffer pooling to reduce memory allocations
 */
export function manifoldToGeometry(manifold: ManifoldObject): Geometry {
  const mesh = manifold.getMesh();
  const volume = manifold.volume();
  const bbox = manifold.boundingBox();

  // Extract vertex positions (every 3 values = one vertex)
  // manifold's vertProperties contains [x,y,z, x,y,z, ...]
  const vertices = new Float32Array(mesh.vertProperties);

  // Triangle indices
  const indices = new Uint32Array(mesh.triVerts);

  // Calculate normals from the mesh
  // For now, we'll calculate face normals and average them per vertex
  const normals = calculateVertexNormals(vertices, indices);

  // OPTIMIZATION: Convert TypedArrays to regular arrays for JSON serialization
  // Using Array.from() is memory-intensive, but necessary for JSON compatibility
  // The alternative (streaming serialization) requires frontend changes
  // TODO: Implement streaming geometry protocol to eliminate this conversion
  return {
    vertices: Array.from(vertices),
    indices: Array.from(indices),
    normals: Array.from(normals),
    bounds: {
      min: bbox.min,
      max: bbox.max,
    },
    stats: {
      vertexCount: mesh.numVert,
      faceCount: mesh.numTri,
      volume: volume || 0,
    },
  };
}

/**
 * Convert a Manifold object to moicad's Geometry format (zero-copy version)
 * Returns TypedArrays directly - more efficient but requires special handling
 * Use this when frontend supports TypedArray deserialization
 */
export function manifoldToGeometryZeroCopy(manifold: ManifoldObject): {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  bounds: { min: number[]; max: number[] };
  stats: { vertexCount: number; faceCount: number; volume: number };
} {
  const mesh = manifold.getMesh();
  const volume = manifold.volume();
  const bbox = manifold.boundingBox();

  const vertices = new Float32Array(mesh.vertProperties);
  const indices = new Uint32Array(mesh.triVerts);
  const normals = calculateVertexNormals(vertices, indices);

  return {
    vertices,
    indices,
    normals,
    bounds: {
      min: bbox.min,
      max: bbox.max,
    },
    stats: {
      vertexCount: mesh.numVert,
      faceCount: mesh.numTri,
      volume: volume || 0,
    },
  };
}

/**
 * Calculate smooth vertex normals from mesh geometry
 */
function calculateVertexNormals(
  vertices: Float32Array,
  indices: Uint32Array,
): Float32Array {
  const numVertices = vertices.length / 3;
  const normals = new Float32Array(numVertices * 3);

  // Initialize all normals to zero
  normals.fill(0);

  // Accumulate face normals to vertex normals
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    // Get triangle vertices
    const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
    const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
    const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

    // Calculate face normal using cross product
    const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    const normal = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0],
    ];

    // Accumulate to each vertex of the triangle
    for (let j = 0; j < 3; j++) {
      const idx = indices[i + j] * 3;
      normals[idx] += normal[0];
      normals[idx + 1] += normal[1];
      normals[idx + 2] += normal[2];
    }
  }

  // Normalize all vertex normals
  for (let i = 0; i < numVertices; i++) {
    const idx = i * 3;
    const length = Math.sqrt(
      normals[idx] * normals[idx] +
        normals[idx + 1] * normals[idx + 1] +
        normals[idx + 2] * normals[idx + 2],
    );

    if (length > 0) {
      normals[idx] /= length;
      normals[idx + 1] /= length;
      normals[idx + 2] /= length;
    } else {
      // Degenerate normal - use up direction
      normals[idx] = 0;
      normals[idx + 1] = 0;
      normals[idx + 2] = 1;
    }
  }

  return normals;
}

/**
 * Convert moicad's Geometry to a Manifold object
 * Useful for operations that need to go back to manifold format
 */
export function geometryToManifold(geometry: Geometry): ManifoldObject {
  const Manifold = getManifold();

  // Convert arrays to TypedArrays if needed
  const vertices = geometry.vertices instanceof Float32Array
    ? geometry.vertices
    : new Float32Array(geometry.vertices);
  const indices = geometry.indices instanceof Uint32Array
    ? geometry.indices
    : new Uint32Array(geometry.indices);

  // Create mesh data structure
  const meshData: Partial<ManifoldMesh> = {
    numVert: vertices.length / 3,
    numTri: indices.length / 3,
    vertProperties: vertices,
    triVerts: indices,
  };

  return new Manifold(meshData);
}

/**
 * Wrap a Manifold object with metadata
 */
export function wrapWithMetadata(
  manifold: ManifoldObject,
  metadata: Partial<ManifoldWithMeta["metadata"]> = {},
): ManifoldWithMeta {
  return {
    manifold,
    metadata: {
      color: metadata.color,
      modifier: metadata.modifier,
      objectId: metadata.objectId || generateObjectId(),
      line: metadata.line,
      operation: metadata.operation,
    },
  };
}

/**
 * Preserve metadata through an operation
 * The result manifold gets the metadata from the original
 */
export function preserveMetadata(
  result: ManifoldObject,
  original: ManifoldWithMeta,
): ManifoldWithMeta {
  return {
    manifold: result,
    metadata: { ...original.metadata },
  };
}

/**
 * Merge metadata from multiple sources
 * Used when combining multiple manifolds (e.g., union)
 */
export function mergeMetadata(
  result: ManifoldObject,
  sources: ManifoldWithMeta[],
): ManifoldWithMeta {
  // For merged objects, we take metadata from the first source
  // and mark it as a composite
  const firstMeta = sources[0]?.metadata || {};

  return {
    manifold: result,
    metadata: {
      ...firstMeta,
      objectId: generateObjectId(),
      operation: "composite",
    },
  };
}

/**
 * Convert Manifold with metadata to moicad Geometry with metadata preserved
 */
export function manifoldWithMetaToGeometry(
  manifoldWithMeta: ManifoldWithMeta,
): Geometry & { metadata?: ManifoldWithMeta["metadata"] } {
  const geometry = manifoldToGeometry(manifoldWithMeta.manifold);

  return {
    ...geometry,
    metadata: manifoldWithMeta.metadata,
  };
}

/**
 * Generate a unique object ID
 */
let objectIdCounter = 0;
function generateObjectId(): string {
  return `manifold_object_${objectIdCounter++}_${Date.now()}`;
}

/**
 * Reset object ID counter (useful for testing)
 */
export function resetObjectIdCounter(): void {
  objectIdCounter = 0;
}

// ============================================================================
// COLOR PARSING
// ============================================================================

/**
 * CSS named colors lookup table
 */
const CSS_COLORS: Record<string, [number, number, number]> = {
  // Basic colors
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],

  // Extended colors
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  blanchedalmond: [255, 235, 205],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  greenyellow: [173, 255, 47],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  whitesmoke: [245, 245, 245],
  yellowgreen: [154, 205, 50],
};

/**
 * Parse a color string (CSS name or hex) to RGBA tuple (0-1 range)
 */
export function parseColor(
  colorStr: string,
): [number, number, number, number] | null {
  const normalized = colorStr.toLowerCase().trim();

  // Check CSS named colors
  if (CSS_COLORS[normalized]) {
    const [r, g, b] = CSS_COLORS[normalized];
    return [r / 255, g / 255, b / 255, 1.0];
  }

  // Parse hex colors
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);

    // #RGB
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return [r / 255, g / 255, b / 255, 1.0];
      }
    }

    // #RRGGBB
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return [r / 255, g / 255, b / 255, 1.0];
      }
    }

    // #RRGGBBAA
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
        return [r / 255, g / 255, b / 255, a / 255];
      }
    }
  }

  return null;
}

// ============================================================================
// MEMORY-EFFICIENT GEOMETRY CHUNKING
// ============================================================================

/**
 * Chunk large geometry for memory-efficient processing
 * Splits geometry into smaller chunks to avoid memory spikes during serialization
 */
export function* chunkGeometry(
  vertices: Float32Array,
  indices: Uint32Array,
  normals: Float32Array,
  chunkSize: number = 10000 // vertices per chunk
): Generator<{
  vertices: number[];
  indices: number[];
  normals: number[];
  chunkIndex: number;
  totalChunks: number;
}> {
  const totalVertices = vertices.length / 3;
  const totalChunks = Math.ceil(totalVertices / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const startVertex = i * chunkSize;
    const endVertex = Math.min((i + 1) * chunkSize, totalVertices);

    // Extract vertex chunk
    const vertexChunk = vertices.slice(startVertex * 3, endVertex * 3);
    const normalChunk = normals.slice(startVertex * 3, endVertex * 3);

    // Extract relevant indices (only triangles using vertices in this chunk)
    const relevantIndices: number[] = [];
    for (let j = 0; j < indices.length; j += 3) {
      const i0 = indices[j];
      const i1 = indices[j + 1];
      const i2 = indices[j + 2];

      if (
        i0 !== undefined &&
        i1 !== undefined &&
        i2 !== undefined &&
        i0 >= startVertex &&
        i0 < endVertex &&
        i1 >= startVertex &&
        i1 < endVertex &&
        i2 >= startVertex &&
        i2 < endVertex
      ) {
        // Reindex to local chunk coordinates
        relevantIndices.push(i0 - startVertex, i1 - startVertex, i2 - startVertex);
      }
    }

    yield {
      vertices: Array.from(vertexChunk),
      indices: relevantIndices,
      normals: Array.from(normalChunk),
      chunkIndex: i,
      totalChunks,
    };

    // Allow GC between chunks
    if (global.gc && i % 10 === 0) {
      global.gc();
    }
  }
}

/**
 * Serialize geometry with memory optimization
 * Automatically chunks large geometries to prevent memory spikes
 */
export function serializeGeometryOptimized(
  manifold: ManifoldObject,
  maxVertices: number = 50000
): Geometry | {
  chunks: Array<{
    vertices: number[];
    indices: number[];
    normals: number[];
  }>;
  isChunked: true;
  totalVertices: number;
  totalFaces: number;
  bounds: { min: number[]; max: number[] };
  stats: { vertexCount: number; faceCount: number; volume: number };
} {
  const mesh = manifold.getMesh();

  // If geometry is small enough, return normally
  if (mesh.numVert <= maxVertices) {
    return manifoldToGeometry(manifold);
  }

  // Large geometry - return chunked
  const zeroCopy = manifoldToGeometryZeroCopy(manifold);
  const chunks: Array<{
    vertices: number[];
    indices: number[];
    normals: number[];
  }> = [];

  for (const chunk of chunkGeometry(
    zeroCopy.vertices,
    zeroCopy.indices,
    zeroCopy.normals
  )) {
    chunks.push({
      vertices: chunk.vertices,
      indices: chunk.indices,
      normals: chunk.normals,
    });
  }

  return {
    chunks,
    isChunked: true,
    totalVertices: mesh.numVert,
    totalFaces: mesh.numTri,
    bounds: zeroCopy.bounds,
    stats: zeroCopy.stats,
  };
}
