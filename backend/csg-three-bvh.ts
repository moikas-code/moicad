/**
 * CSG Operations using three-bvh-csg
 * Replaces WASM BSP with production-ready three-bvh-csg library
 */

import * as THREE from "three";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
  INTERSECTION,
} from "three-bvh-csg";
import type { Geometry } from "../shared/types";

const evaluator = new Evaluator();

/**
 * Convert our Geometry format to THREE.BufferGeometry
 */
function geometryToThree(geom: Geometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Convert arrays to Float32Array/Uint32Array if they aren't already
  const positions =
    geom.vertices instanceof Float32Array
      ? geom.vertices
      : new Float32Array(geom.vertices);
  const indices =
    geom.indices instanceof Uint32Array
      ? geom.indices
      : new Uint32Array(geom.indices);

  // Set position attribute
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Set index
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  // Compute normals (three-bvh-csg will use them)
  geometry.computeVertexNormals();

  // Compute bounding box/sphere for BVH
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Convert THREE.BufferGeometry back to our Geometry format
 */
function threeToGeometry(geometry: THREE.BufferGeometry): Geometry {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const indexAttr = geometry.getIndex() as THREE.BufferAttribute;

  const vertices = Array.from(posAttr.array);
  const normals = normalAttr ? Array.from(normalAttr.array) : [];
  const indices = indexAttr ? Array.from(indexAttr.array) : [];

  // Calculate bounds
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  return {
    vertices,
    normals,
    indices,
    bounds: {
      min: [bbox.min.x, bbox.min.y, bbox.min.z],
      max: [bbox.max.x, bbox.max.y, bbox.max.z],
    },
    stats: {
      vertexCount: vertices.length / 3,
      faceCount: indices.length / 3,
      volume: 0, // TODO: calculate volume
    },
  };
}

/**
 * Create a Brush from our Geometry format
 */
function createBrush(geom: Geometry): Brush {
  const threeGeom = geometryToThree(geom);

  // Validate geometry
  if (!threeGeom.getAttribute("position")) {
    throw new Error("Geometry missing position attribute");
  }
  if (!threeGeom.getIndex()) {
    throw new Error("Geometry missing index");
  }

  // Create material with flat shading and polygon offset to prevent Z-fighting
  const material = new THREE.MeshStandardMaterial({
    flatShading: true,
    polygonOffset: true,
    polygonOffsetUnits: 1,
    polygonOffsetFactor: 1,
    side: THREE.DoubleSide,
  });

  const brush = new Brush(threeGeom, material);

  // Ensure the brush geometry is properly initialized
  brush.prepareGeometry();

  return brush;
}

/**
 * Union operation: A ∪ B
 */
export function union(geomA: Geometry, geomB: Geometry): Geometry {
  const brushA = createBrush(geomA);
  const brushB = createBrush(geomB);

  const resultMesh = evaluator.evaluate(brushA, brushB, ADDITION);
  if (!resultMesh || !resultMesh.geometry) {
    throw new Error("CSG evaluation failed: no geometry returned");
  }
  return threeToGeometry(resultMesh.geometry as THREE.BufferGeometry);
}

/**
 * Difference operation: A - B
 */
export function difference(geomA: Geometry, geomB: Geometry): Geometry {
  const brushA = createBrush(geomA);
  const brushB = createBrush(geomB);

  // three-bvh-csg returns a Mesh, not just geometry
  const resultMesh = evaluator.evaluate(brushA, brushB, SUBTRACTION);

  // The result is a THREE.Mesh with .geometry property
  if (!resultMesh || !resultMesh.geometry) {
    throw new Error("CSG evaluation failed: no geometry returned");
  }

  return threeToGeometry(resultMesh.geometry as THREE.BufferGeometry);
}

/**
 * Intersection operation: A ∩ B
 */
export function intersection(geomA: Geometry, geomB: Geometry): Geometry {
  const brushA = createBrush(geomA);
  const brushB = createBrush(geomB);

  const resultMesh = evaluator.evaluate(brushA, brushB, INTERSECTION);
  if (!resultMesh || !resultMesh.geometry) {
    throw new Error("CSG evaluation failed: no geometry returned");
  }
  return threeToGeometry(resultMesh.geometry as THREE.BufferGeometry);
}
