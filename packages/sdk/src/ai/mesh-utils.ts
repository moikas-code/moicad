import type { Geometry } from '../types';

/**
 * Decompose mesh into separate connected components
 */
export function decomposeMesh(geometry: Geometry): Geometry[] {
  // TODO: Implement connected-components algorithm
  // Group triangles by connectivity
  // Return array of separate geometries

  // Placeholder: Return original geometry as single component
  return [geometry];
}

/**
 * Merge multiple geometries into one
 */
export function mergeMeshes(geometries: Geometry[]): Geometry {
  if (geometries.length === 0) {
    throw new Error('Cannot merge empty geometry list');
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  let vertexOffset = 0;

  for (const geom of geometries) {
    // Append vertices and normals
    vertices.push(...geom.vertices);
    normals.push(...geom.normals);

    // Append indices with offset
    for (const idx of geom.indices) {
      indices.push(idx + vertexOffset);
    }

    vertexOffset += geom.vertices.length / 3;
  }

  // Compute combined bounding box
  const minBounds = [Infinity, Infinity, Infinity];
  const maxBounds = [-Infinity, -Infinity, -Infinity];

  for (const geom of geometries) {
    for (let i = 0; i < 3; i++) {
      minBounds[i] = Math.min(minBounds[i], geom.bounds.min[i]);
      maxBounds[i] = Math.max(maxBounds[i], geom.bounds.max[i]);
    }
  }

  const bounds = {
    min: minBounds as [number, number, number],
    max: maxBounds as [number, number, number]
  };

  return {
    vertices,
    indices,
    normals,
    bounds,
    stats: {
      vertexCount: vertices.length / 3,
      faceCount: indices.length / 3
    }
  };
}
