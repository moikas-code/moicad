/**
 * Manifold 2D Extrusion and Operations
 *
 * Functions for extruding 2D shapes into 3D and performing 2D operations.
 * These replace the Rust WASM extrusion implementations.
 */

import type { ManifoldObject } from "./types";
import { getManifold, getManifoldWasm } from "./engine";
import * as Ops2D from "./2d";

/**
 * Linear extrude - Extrude a 2D shape along the Z-axis
 *
 * @param shape - Shape to extrude (can be 3D manifold, will be projected to 2D first)
 * @param height - Height to extrude
 * @param twist - Twist angle in degrees (default: 0)
 * @param scaleTop - Scale factor at top (number or [x, y]) (default: 1)
 * @param slices - Number of slices for twist (default: based on twist angle)
 * @param center - Center the extrusion vertically (default: false)
 */
export function linearExtrude(
  shape: ManifoldObject,
  height: number,
  twist: number = 0,
  scaleTop: number | [number, number] = 1,
  slices?: number,
  center: boolean = false,
): ManifoldObject {
  // Convert scaleTop to array format
  const scale: [number, number] =
    typeof scaleTop === "number" ? [scaleTop, scaleTop] : scaleTop;

  // Calculate number of slices based on twist if not specified
  const numSlices =
    slices !== undefined
      ? slices
      : Math.max(1, Math.ceil(Math.abs(twist) / 10));

  try {
    // Project 3D shape to 2D cross-section
    const crossSection = Ops2D.project3Dto2D(shape);

    // Use CrossSection's extrude method which supports twist and scale
    const extruded = crossSection.extrude(
      height,
      numSlices,
      twist,
      scale,
      center,
    );

    return extruded;
  } catch (error: any) {
    // Fallback: Simple scaling approach for basic extrusion
    if (twist === 0 && scale[0] === 1 && scale[1] === 1) {
      // Get bounding box to determine current thickness
      const bbox = shape.boundingBox();
      const currentZ = bbox.max[2] - bbox.min[2];

      // Scale to desired height
      const scaleFactor = height / Math.max(currentZ, 0.001);
      let result = shape.scale([1, 1, scaleFactor]);

      if (center) {
        result = result.translate([0, 0, -height / 2]);
      }

      return result;
    }

    throw new Error(`Linear extrude failed: ${error.message}`);
  }
}

/**
 * Rotate extrude - Revolve a 2D shape around the Y-axis
 *
 * @param shape - Shape to revolve (will be projected to 2D first)
 * @param angle - Angle to revolve in degrees (default: 360)
 * @param segments - Number of segments (default: based on $fn or angle)
 */
export function rotateExtrude(
  shape: ManifoldObject,
  angle: number = 360,
  segments?: number,
): ManifoldObject {
  // Calculate segments based on angle if not specified
  const numSegments =
    segments !== undefined ? segments : Math.max(3, Math.ceil(angle / 10));

  try {
    // Project 3D shape to 2D cross-section
    const crossSection = Ops2D.project3Dto2D(shape);

    // Use CrossSection's revolve method
    const revolved = crossSection.revolve(numSegments, angle);

    return revolved;
  } catch (error: any) {
    throw new Error(`Rotate extrude failed: ${error.message}`);
  }
}

/**
 * Offset - Expand or contract a 2D shape
 *
 * @param shape - Shape to offset (will be projected to 2D first)
 * @param delta - Offset distance (positive = expand, negative = contract)
 * @param chamfer - Use chamfer/miter instead of round (default: false)
 * @param segments - Number of segments for round corners
 */
export function offset(
  shape: ManifoldObject,
  delta: number,
  chamfer: boolean = false,
  segments: number = 32,
): ManifoldObject {
  try {
    // Project 3D shape to 2D cross-section
    const crossSection = Ops2D.project3Dto2D(shape);

    // Apply offset
    const joinType = chamfer ? "miter" : "round";
    const offsetSection = Ops2D.offset2D(
      crossSection,
      delta,
      joinType as "round" | "miter" | "square",
      2.0,
      segments,
    );

    // Extrude back to thin 3D for compatibility with pipeline
    return Ops2D.linearExtrude2D(offsetSection, 0.1);
  } catch (error: any) {
    throw new Error(`Offset failed: ${error.message}`);
  }
}

/**
 * Resize a shape to specific dimensions
 *
 * @param shape - Shape to resize
 * @param newSize - [width, height, depth] target dimensions
 * @param auto - Maintain aspect ratio (default: false)
 */
export function resize(
  shape: ManifoldObject,
  newSize: [number, number, number],
  auto: boolean = false,
): ManifoldObject {
  const bbox = shape.boundingBox();
  const currentSize = [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];

  let scaleFactors: [number, number, number];

  if (auto) {
    // Maintain aspect ratio - scale uniformly to fit within target
    const scales = [
      newSize[0] > 0 ? newSize[0] / currentSize[0] : 1,
      newSize[1] > 0 ? newSize[1] / currentSize[1] : 1,
      newSize[2] > 0 ? newSize[2] / currentSize[2] : 1,
    ];
    const minScale = Math.min(...scales.filter((s) => s !== 1));
    scaleFactors = [minScale, minScale, minScale];
  } else {
    // Scale independently for each axis
    scaleFactors = [
      newSize[0] > 0 ? newSize[0] / currentSize[0] : 1,
      newSize[1] > 0 ? newSize[1] / currentSize[1] : 1,
      newSize[2] > 0 ? newSize[2] / currentSize[2] : 1,
    ];
  }

  return shape.scale(scaleFactors);
}

/**
 * Project a 3D manifold to 2D (orthographic projection onto XY plane)
 * Returns a thin 3D manifold representing the 2D projection
 */
export function project(manifold: ManifoldObject): ManifoldObject {
  const crossSection = Ops2D.project3Dto2D(manifold);
  return Ops2D.linearExtrude2D(crossSection, 0.1);
}

/**
 * Helper: Check if a manifold is effectively 2D (very thin in Z)
 */
export function is2D(
  manifold: ManifoldObject,
  threshold: number = 0.01,
): boolean {
  const bbox = manifold.boundingBox();
  const zThickness = bbox.max[2] - bbox.min[2];
  return zThickness < threshold;
}

/**
 * Helper: Get the thickness of a manifold in Z direction
 */
export function getThickness(manifold: ManifoldObject): number {
  const bbox = manifold.boundingBox();
  return bbox.max[2] - bbox.min[2];
}
