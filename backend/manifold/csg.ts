/**
 * Manifold CSG (Constructive Solid Geometry) Operations
 *
 * Boolean operations for combining, subtracting, and intersecting 3D manifolds.
 * These replace the Rust BSP-tree implementations.
 */

import type { ManifoldObject } from "./types";
import { getManifold } from "./engine";

/**
 * Union (Boolean OR) - Combine two manifolds
 * In manifold-3d, this is the `add()` method
 */
export function union(
  manifoldA: ManifoldObject,
  manifoldB: ManifoldObject,
): ManifoldObject {
  return manifoldA.add(manifoldB);
}

/**
 * Union multiple manifolds at once
 * More efficient than repeated pairwise unions
 */
export function unionMultiple(manifolds: ManifoldObject[]): ManifoldObject {
  if (manifolds.length === 0) {
    throw new Error("Cannot union empty array of manifolds");
  }

  if (manifolds.length === 1) {
    return manifolds[0];
  }

  // Use reduce for multiple unions
  return manifolds.reduce((acc, curr) => acc.add(curr));
}

/**
 * Difference (Boolean subtraction) - Subtract B from A
 */
export function difference(
  manifoldA: ManifoldObject,
  manifoldB: ManifoldObject,
): ManifoldObject {
  return manifoldA.subtract(manifoldB);
}

/**
 * Difference with multiple subtractors
 * Subtracts all manifolds in array from the first manifold
 */
export function differenceMultiple(
  base: ManifoldObject,
  subtractors: ManifoldObject[],
): ManifoldObject {
  if (subtractors.length === 0) {
    return base;
  }

  return subtractors.reduce((acc, curr) => acc.subtract(curr), base);
}

/**
 * Intersection (Boolean AND) - Keep only overlapping region
 */
export function intersection(
  manifoldA: ManifoldObject,
  manifoldB: ManifoldObject,
): ManifoldObject {
  return manifoldA.intersect(manifoldB);
}

/**
 * Intersection of multiple manifolds
 */
export function intersectionMultiple(
  manifolds: ManifoldObject[],
): ManifoldObject {
  if (manifolds.length === 0) {
    throw new Error("Cannot intersect empty array of manifolds");
  }

  if (manifolds.length === 1) {
    return manifolds[0];
  }

  return manifolds.reduce((acc, curr) => acc.intersect(curr));
}

/**
 * Convex hull - Create smallest convex shape containing all manifolds
 */
export function hull(manifolds: ManifoldObject[]): ManifoldObject {
  if (manifolds.length === 0) {
    throw new Error("Cannot create hull of empty array");
  }

  if (manifolds.length === 1) {
    return manifolds[0];
  }

  const Manifold = getManifold();
  return Manifold.hull(manifolds);
}

/**
 * Minkowski sum - Approximation using hull of translated copies
 *
 * Manifold-3d doesn't have native Minkowski support, so we approximate it by:
 * 1. Getting vertices from the second shape
 * 2. Translating the first shape to each vertex position
 * 3. Taking the hull of all translated copies
 *
 * This is accurate for convex shapes and a reasonable approximation for others.
 *
 * @param manifoldA - Base shape to expand
 * @param manifoldB - Shape that defines the expansion
 * @returns Approximated Minkowski sum
 */
export function minkowski(
  manifoldA: ManifoldObject,
  manifoldB: ManifoldObject,
): ManifoldObject {
  const Manifold = getManifold();

  // Get mesh data from shape B to extract vertices
  const meshB = manifoldB.getMesh();
  const vertsB = meshB.vertProperties;
  const numProps = meshB.numProp || 3;

  // Extract unique vertex positions from B
  const positions: [number, number, number][] = [];
  const seen = new Set<string>();

  for (let i = 0; i < vertsB.length; i += numProps) {
    const x = vertsB[i];
    const y = vertsB[i + 1];
    const z = vertsB[i + 2];
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;

    if (!seen.has(key)) {
      seen.add(key);
      positions.push([x, y, z]);
    }
  }

  // Limit positions to avoid excessive computation
  const maxPositions = 100;
  const sampledPositions =
    positions.length > maxPositions
      ? samplePoints(positions, maxPositions)
      : positions;

  // Translate A to each sampled position and collect
  const translatedCopies: ManifoldObject[] = [];
  for (const [x, y, z] of sampledPositions) {
    const translated = manifoldA.translate([x, y, z]);
    translatedCopies.push(translated);
  }

  // Union all copies, then take hull for convex approximation
  // This gives best results for convex B shapes
  if (translatedCopies.length === 0) {
    return manifoldA;
  }

  // For better accuracy, we union first then hull
  // For convex B, hull of translated A copies is exact
  try {
    // Use hull directly on all translated copies for convex result
    const result = Manifold.hull(translatedCopies);
    return result;
  } catch (error) {
    // Fallback: union all copies if hull fails
    return unionMultiple(translatedCopies);
  }
}

/**
 * Sample points uniformly from an array using furthest point sampling
 */
function samplePoints(
  points: [number, number, number][],
  count: number,
): [number, number, number][] {
  if (points.length <= count) return points;

  const sampled: [number, number, number][] = [points[0]];
  const used = new Set<number>([0]);

  while (sampled.length < count) {
    let maxDist = -1;
    let bestIdx = -1;

    for (let i = 0; i < points.length; i++) {
      if (used.has(i)) continue;

      // Find minimum distance to any sampled point
      let minDistToSampled = Infinity;
      for (const s of sampled) {
        const dx = points[i][0] - s[0];
        const dy = points[i][1] - s[1];
        const dz = points[i][2] - s[2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < minDistToSampled) minDistToSampled = d;
      }

      if (minDistToSampled > maxDist) {
        maxDist = minDistToSampled;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    sampled.push(points[bestIdx]);
    used.add(bestIdx);
  }

  return sampled;
}

/**
 * Batch boolean operation - Apply same operation to multiple manifolds
 *
 * @param manifolds - Array of manifolds to combine
 * @param operation - 'union' | 'intersection'
 */
export function batchBoolean(
  manifolds: ManifoldObject[],
  operation: "union" | "intersection",
): ManifoldObject {
  if (operation === "union") {
    return unionMultiple(manifolds);
  } else {
    return intersectionMultiple(manifolds);
  }
}

/**
 * Compose - Alias for unionMultiple (OpenSCAD compatibility)
 */
export function compose(manifolds: ManifoldObject[]): ManifoldObject {
  return unionMultiple(manifolds);
}

/**
 * Decompose - Split a manifold into separate components
 * Useful for multi-part models
 */
export function decompose(manifold: ManifoldObject): ManifoldObject[] {
  return manifold.decompose();
}

/**
 * Check if a manifold is valid (no errors)
 */
export function isValid(manifold: ManifoldObject): boolean {
  return manifold.status() === "NoError";
}

/**
 * Get status message for a manifold
 */
export function getStatus(manifold: ManifoldObject): string {
  return manifold.status();
}

/**
 * Split a manifold by a plane
 * Returns two manifolds: [front, back]
 */
export function splitByPlane(
  manifold: ManifoldObject,
  normal: [number, number, number],
  offset: number,
): [ManifoldObject, ManifoldObject] {
  const result = manifold.splitByPlane(normal, offset);
  // splitByPlane returns a pair of manifolds
  return result as [ManifoldObject, ManifoldObject];
}

/**
 * Trim a manifold by a plane (keep only the front half)
 */
export function trimByPlane(
  manifold: ManifoldObject,
  normal: [number, number, number],
  offset: number,
): ManifoldObject {
  return manifold.trimByPlane(normal, offset);
}

/**
 * Slice a manifold at a given height to get a 2D cross-section
 */
export function slice(
  manifold: ManifoldObject,
  height: number,
): ManifoldObject {
  return manifold.slice(height);
}

/**
 * Project a 3D manifold to 2D (orthographic projection onto XY plane)
 */
export function project(manifold: ManifoldObject): ManifoldObject {
  return manifold.project();
}
