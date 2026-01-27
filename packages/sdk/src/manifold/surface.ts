/**
 * Surface and Heightmap Operations
 *
 * Creates 3D surfaces from heightmap data using manifold's levelSet function.
 */

import { getManifold } from './engine';
import type { ManifoldObject } from './types';

/**
 * Create a surface from heightmap data
 *
 * @param data - 2D array of height values or flat Float32Array
 * @param width - Width of the heightmap (X dimension)
 * @param depth - Depth of the heightmap (Y dimension)
 * @param options - Configuration options
 */
export function createSurface(
  data: number[][] | Float32Array | number[],
  width: number,
  depth: number,
  options: {
    center?: boolean;
    invert?: boolean;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
  } = {}
): ManifoldObject {
  const {
    center = false,
    invert = false,
    scaleX = 1,
    scaleY = 1,
    scaleZ = 1
  } = options;

  const Manifold = getManifold();

  // Convert data to flat array if needed
  let flatData: number[];
  if (data instanceof Float32Array) {
    flatData = Array.from(data);
  } else if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    // 2D array - flatten row by row
    flatData = (data as number[][]).flat();
  } else {
    // Already a flat number array
    flatData = data as number[];
  }

  // Ensure we have enough data
  const expectedSize = width * depth;
  if (flatData.length < expectedSize) {
    // Pad with zeros
    flatData = [...flatData, ...new Array(expectedSize - flatData.length).fill(0)];
  }

  // Find min/max for proper surface generation
  let minZ = Infinity, maxZ = -Infinity;
  for (const z of flatData) {
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  // Use levelSet to create the surface
  // We create a signed distance function that represents the heightmap
  const edgeLength = Math.max(width, depth) / 20; // Resolution of the mesh
  const bounds = {
    min: center ? [-width * scaleX / 2, -depth * scaleY / 2, (invert ? -maxZ : minZ) * scaleZ - edgeLength] : [0, 0, (invert ? -maxZ : minZ) * scaleZ - edgeLength],
    max: center ? [width * scaleX / 2, depth * scaleY / 2, (invert ? -minZ : maxZ) * scaleZ + edgeLength] : [width * scaleX, depth * scaleY, (invert ? -minZ : maxZ) * scaleZ + edgeLength]
  };

  // Create SDF function for heightmap
  const sdf = (x: number, y: number, z: number): number => {
    // Map x, y to heightmap indices
    let ix = center ? (x / scaleX + width / 2) : (x / scaleX);
    let iy = center ? (y / scaleY + depth / 2) : (y / scaleY);

    // Clamp to valid range
    ix = Math.max(0, Math.min(width - 1, ix));
    iy = Math.max(0, Math.min(depth - 1, iy));

    // Bilinear interpolation for smooth surface
    const ix0 = Math.floor(ix);
    const iy0 = Math.floor(iy);
    const ix1 = Math.min(ix0 + 1, width - 1);
    const iy1 = Math.min(iy0 + 1, depth - 1);

    const fx = ix - ix0;
    const fy = iy - iy0;

    const z00 = flatData[iy0 * width + ix0] || 0;
    const z10 = flatData[iy0 * width + ix1] || 0;
    const z01 = flatData[iy1 * width + ix0] || 0;
    const z11 = flatData[iy1 * width + ix1] || 0;

    // Bilinear interpolation
    const z0 = z00 * (1 - fx) + z10 * fx;
    const z1 = z01 * (1 - fx) + z11 * fx;
    const surfaceZ = (z0 * (1 - fy) + z1 * fy) * scaleZ;

    // SDF: negative inside, positive outside
    // For a heightmap surface, we want points below the surface to be "inside"
    if (invert) {
      return z + surfaceZ; // Inverted surface
    }
    return z - surfaceZ;
  };

  try {
    // Use levelSet to create the surface mesh
    const surface = Manifold.levelSet(sdf, bounds, edgeLength, 0);
    return surface;
  } catch (error) {
    // Fallback: create a simple plane mesh if levelSet fails
    console.warn('levelSet failed, creating simple mesh fallback:', error);
    return createSimpleSurfaceMesh(flatData, width, depth, scaleX, scaleY, scaleZ, center, invert);
  }
}

/**
 * Fallback: Create a simple surface mesh from heightmap data
 * Uses direct mesh construction instead of levelSet
 */
function createSimpleSurfaceMesh(
  data: number[],
  width: number,
  depth: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  center: boolean,
  invert: boolean
): ManifoldObject {
  const Manifold = getManifold();

  // Create vertices
  const vertices: number[] = [];
  const indices: number[] = [];

  const offsetX = center ? -width * scaleX / 2 : 0;
  const offsetY = center ? -depth * scaleY / 2 : 0;

  // Generate vertex grid
  for (let iy = 0; iy < depth; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const x = ix * scaleX + offsetX;
      const y = iy * scaleY + offsetY;
      let z = (data[iy * width + ix] || 0) * scaleZ;
      if (invert) z = -z;

      vertices.push(x, y, z);
    }
  }

  // Generate triangles
  for (let iy = 0; iy < depth - 1; iy++) {
    for (let ix = 0; ix < width - 1; ix++) {
      const i00 = iy * width + ix;
      const i10 = iy * width + ix + 1;
      const i01 = (iy + 1) * width + ix;
      const i11 = (iy + 1) * width + ix + 1;

      // Two triangles per quad
      indices.push(i00, i10, i11);
      indices.push(i00, i11, i01);
    }
  }

  // Create mesh from vertices and indices
  const mesh = {
    numProp: 3,
    vertProperties: new Float32Array(vertices),
    triVerts: new Uint32Array(indices)
  };

  return Manifold.ofMesh(mesh);
}

/**
 * Parse surface data from various file formats
 * Supports CSV, space-separated, and binary formats
 */
export function parseSurfaceFile(
  content: string | ArrayBuffer,
  format: 'csv' | 'space' | 'binary' = 'space'
): { data: number[], width: number, depth: number } {
  if (content instanceof ArrayBuffer) {
    // Binary format - assume float32 values
    const floats = new Float32Array(content);
    // Try to infer dimensions from data length
    const size = Math.sqrt(floats.length);
    const width = Math.floor(size);
    const depth = Math.ceil(floats.length / width);
    return { data: Array.from(floats), width, depth };
  }

  const text = content as string;
  const lines = text.trim().split('\n').filter(line => line.trim() && !line.startsWith('#'));

  if (lines.length === 0) {
    return { data: [], width: 0, depth: 0 };
  }

  const data: number[] = [];
  let width = 0;

  for (const line of lines) {
    const separator = format === 'csv' ? /[,;]/ : /\s+/;
    const values = line.trim().split(separator).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

    if (values.length > width) {
      width = values.length;
    }

    data.push(...values);
  }

  const depth = lines.length;

  return { data, width, depth };
}

/**
 * Create a surface from a mathematical function
 *
 * @param fn - Function (x, y) => z
 * @param bounds - {minX, maxX, minY, maxY}
 * @param resolution - Number of samples in each direction
 */
export function createSurfaceFromFunction(
  fn: (x: number, y: number) => number,
  bounds: { minX: number, maxX: number, minY: number, maxY: number },
  resolution: number = 50
): ManifoldObject {
  const { minX, maxX, minY, maxY } = bounds;
  const width = resolution;
  const depth = resolution;

  const scaleX = (maxX - minX) / (width - 1);
  const scaleY = (maxY - minY) / (depth - 1);

  // Sample the function
  const data: number[] = [];
  for (let iy = 0; iy < depth; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const x = minX + ix * scaleX;
      const y = minY + iy * scaleY;
      data.push(fn(x, y));
    }
  }

  return createSurface(data, width, depth, {
    scaleX,
    scaleY,
    scaleZ: 1,
    center: false
  });
}
