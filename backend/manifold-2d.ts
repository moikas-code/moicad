/**
 * 2D Operations using Manifold CrossSection
 *
 * Implements 2D operations like offset, polygon creation, and conversion
 * between 2D CrossSection and 3D Manifold objects.
 */

import { getManifold, getManifoldWasm } from "./manifold-engine";
import type { ManifoldObject } from "./manifold-types";

// Type for CrossSection objects
export type CrossSectionObject = any;

/**
 * Create a 2D square/rectangle
 */
export function createSquare2D(
  size: number | [number, number],
  center: boolean = false,
): CrossSectionObject {
  const wasm = getManifoldWasm();
  const dims = Array.isArray(size) ? size : [size, size];
  const cs = wasm.CrossSection.square(dims, center);
  return cs;
}

/**
 * Create a 2D circle
 */
export function createCircle2D(
  radius: number,
  segments: number = 32,
): CrossSectionObject {
  const wasm = getManifoldWasm();
  return wasm.CrossSection.circle(radius, segments);
}

/**
 * Create a 2D polygon from points
 */
export function createPolygon2D(
  points: [number, number][],
): CrossSectionObject {
  const wasm = getManifoldWasm();
  // CrossSection.ofPolygons expects an array of contours (array of arrays of points)
  return wasm.CrossSection.ofPolygons([points]);
}

/**
 * Apply offset to a 2D shape
 * Positive delta expands, negative delta contracts
 */
export function offset2D(
  crossSection: CrossSectionObject,
  delta: number,
  joinType: "round" | "miter" | "square" = "round",
  miterLimit: number = 2.0,
  circularSegments: number = 0,
): CrossSectionObject {
  // Map join type to manifold's JoinType enum
  const joinTypeMap: Record<string, number> = {
    square: 0,
    round: 1,
    miter: 2,
  };

  const jt = joinTypeMap[joinType] ?? 1; // default to round
  return crossSection.offset(delta, jt, miterLimit, circularSegments);
}

/**
 * Union of multiple 2D shapes
 */
export function union2D(
  crossSections: CrossSectionObject[],
): CrossSectionObject {
  if (crossSections.length === 0) {
    throw new Error("union2D requires at least one cross section");
  }
  if (crossSections.length === 1) {
    return crossSections[0];
  }

  let result = crossSections[0];
  for (let i = 1; i < crossSections.length; i++) {
    result = result.add(crossSections[i]);
  }
  return result;
}

/**
 * Difference of 2D shapes (first minus rest)
 */
export function difference2D(
  crossSections: CrossSectionObject[],
): CrossSectionObject {
  if (crossSections.length === 0) {
    throw new Error("difference2D requires at least one cross section");
  }
  if (crossSections.length === 1) {
    return crossSections[0];
  }

  let result = crossSections[0];
  for (let i = 1; i < crossSections.length; i++) {
    result = result.subtract(crossSections[i]);
  }
  return result;
}

/**
 * Intersection of 2D shapes
 */
export function intersection2D(
  crossSections: CrossSectionObject[],
): CrossSectionObject {
  if (crossSections.length === 0) {
    throw new Error("intersection2D requires at least one cross section");
  }
  if (crossSections.length === 1) {
    return crossSections[0];
  }

  let result = crossSections[0];
  for (let i = 1; i < crossSections.length; i++) {
    result = result.intersect(crossSections[i]);
  }
  return result;
}

/**
 * Convex hull of 2D shapes
 */
export function hull2D(
  crossSections: CrossSectionObject[],
): CrossSectionObject {
  const wasm = getManifoldWasm();
  return wasm.CrossSection.hull(crossSections);
}

/**
 * Translate a 2D shape
 */
export function translate2D(
  crossSection: CrossSectionObject,
  offset: [number, number],
): CrossSectionObject {
  return crossSection.translate(offset);
}

/**
 * Scale a 2D shape
 */
export function scale2D(
  crossSection: CrossSectionObject,
  factors: [number, number] | number,
): CrossSectionObject {
  const f = typeof factors === "number" ? [factors, factors] : factors;
  return crossSection.scale(f);
}

/**
 * Rotate a 2D shape (degrees)
 */
export function rotate2D(
  crossSection: CrossSectionObject,
  degrees: number,
): CrossSectionObject {
  return crossSection.rotate(degrees);
}

/**
 * Mirror a 2D shape
 */
export function mirror2D(
  crossSection: CrossSectionObject,
  normal: [number, number],
): CrossSectionObject {
  return crossSection.mirror(normal);
}

/**
 * Linear extrude a 2D shape to 3D
 */
export function linearExtrude2D(
  crossSection: CrossSectionObject,
  height: number,
  nDivisions: number = 0,
  twistDegrees: number = 0,
  scaleTop: [number, number] = [1, 1],
  center: boolean = false,
): ManifoldObject {
  const result = crossSection.extrude(
    height,
    nDivisions,
    twistDegrees,
    scaleTop,
    center,
  );
  return result;
}

/**
 * Revolve a 2D shape around the Y axis to create 3D
 */
export function revolve2D(
  crossSection: CrossSectionObject,
  circularSegments: number = 0,
  revolveDegrees: number = 360,
): ManifoldObject {
  return crossSection.revolve(circularSegments, revolveDegrees);
}

/**
 * Project a 3D manifold to 2D (along Z axis)
 */
export function project3Dto2D(manifold: ManifoldObject): CrossSectionObject {
  return manifold.project();
}

/**
 * Slice a 3D manifold at Z=0 to get 2D cross section
 */
export function slice3Dto2D(
  manifold: ManifoldObject,
  height: number = 0,
): CrossSectionObject {
  // First translate so the slice plane is at the desired height
  if (height !== 0) {
    manifold = manifold.translate([0, 0, -height]);
  }
  return manifold.slice();
}

/**
 * Get area of a 2D shape
 */
export function area2D(crossSection: CrossSectionObject): number {
  return crossSection.area();
}

/**
 * Check if 2D shape is empty
 */
export function isEmpty2D(crossSection: CrossSectionObject): boolean {
  return crossSection.isEmpty();
}

/**
 * Get bounds of 2D shape
 */
export function bounds2D(crossSection: CrossSectionObject): {
  min: [number, number];
  max: [number, number];
} {
  const b = crossSection.bounds();
  return {
    min: [b.min[0], b.min[1]],
    max: [b.max[0], b.max[1]],
  };
}

/**
 * Convert CrossSection to polygon points (for debugging/export)
 */
export function toPolygons2D(
  crossSection: CrossSectionObject,
): [number, number][][] {
  return crossSection.toPolygons();
}
