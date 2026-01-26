/**
 * Manifold Primitive Shapes
 *
 * Creates basic 3D geometric primitives using the manifold-3d library.
 * These replace the Rust WASM primitive generators.
 */

import { getManifold } from './manifold-engine';
import type { ManifoldObject } from './manifold-types';

/**
 * Create a cube/box
 * @param size - Single number or [width, depth, height]
 * @param center - If true, cube is centered at origin (default: true for OpenSCAD compatibility)
 */
export function createCube(
  size: number | [number, number, number],
  center: boolean = true
): ManifoldObject {
  const Manifold = getManifold();
  const dimensions: [number, number, number] = Array.isArray(size)
    ? size
    : [size, size, size];

  return Manifold.cube(dimensions, center);
}

/**
 * Create a sphere
 * @param radius - Sphere radius
 * @param circularSegments - Number of segments (corresponds to OpenSCAD $fn)
 */
export function createSphere(
  radius: number,
  circularSegments: number = 32
): ManifoldObject {
  const Manifold = getManifold();
  return Manifold.sphere(radius, circularSegments);
}

/**
 * Create a cylinder
 * @param height - Cylinder height
 * @param radius - Radius (or bottom radius if radiusTop is specified)
 * @param radiusTop - Top radius (for tapered cylinders, default: same as radius)
 * @param circularSegments - Number of segments (corresponds to OpenSCAD $fn)
 * @param center - If true, cylinder is centered vertically
 */
export function createCylinder(
  height: number,
  radius: number,
  radiusTop?: number,
  circularSegments: number = 32,
  center: boolean = true
): ManifoldObject {
  const Manifold = getManifold();
  const rTop = radiusTop !== undefined ? radiusTop : radius;

  return Manifold.cylinder(height, radius, rTop, circularSegments, center);
}

/**
 * Create a cone
 * @param height - Cone height
 * @param radius - Base radius
 * @param circularSegments - Number of segments
 * @param center - If true, cone is centered vertically
 */
export function createCone(
  height: number,
  radius: number,
  circularSegments: number = 32,
  center: boolean = true
): ManifoldObject {
  // Cone is a cylinder with top radius = 0
  return createCylinder(height, radius, 0, circularSegments, center);
}

/**
 * Create a tetrahedron (4-sided polyhedron)
 */
export function createTetrahedron(): ManifoldObject {
  const Manifold = getManifold();
  return Manifold.tetrahedron();
}

/**
 * Create a 2D circle (for extrusion)
 * Note: This returns a Manifold object, not a CrossSection
 * To create a true 2D shape, use CrossSection class
 *
 * @param radius - Circle radius
 * @param circularSegments - Number of segments
 */
export function createCircle(
  radius: number,
  circularSegments: number = 32
): ManifoldObject {
  // Create a very thin cylinder (effectively 2D)
  return createCylinder(0.001, radius, radius, circularSegments, true);
}

/**
 * Create a 2D square (for extrusion)
 *
 * @param size - Single number or [width, height]
 * @param center - If true, square is centered
 */
export function createSquare(
  size: number | [number, number],
  center: boolean = true
): ManifoldObject {
  // Create a very thin cube (effectively 2D)
  const dimensions: [number, number, number] = Array.isArray(size)
    ? [size[0], size[1], 0.001]
    : [size, size, 0.001];

  return createCube(dimensions, center);
}

/**
 * Create a polyhedron from vertices and faces
 *
 * @param points - Array of [x, y, z] vertices
 * @param faces - Array of face indices (e.g., [[0,1,2], [0,2,3]])
 */
export function createPolyhedron(
  points: number[][],
  faces: number[][]
): ManifoldObject {
  const Manifold = getManifold();

  // Flatten points to Float32Array
  const vertProperties = new Float32Array(points.flat());

  // Flatten faces to Uint32Array (triangles only)
  const triVerts: number[] = [];
  for (const face of faces) {
    if (face.length === 3) {
      // Already a triangle
      triVerts.push(...face);
    } else if (face.length === 4) {
      // Quad - split into two triangles
      triVerts.push(face[0], face[1], face[2]);
      triVerts.push(face[0], face[2], face[3]);
    } else {
      // Polygon - fan triangulation
      for (let i = 1; i < face.length - 1; i++) {
        triVerts.push(face[0], face[i], face[i + 1]);
      }
    }
  }

  const triVertsArray = new Uint32Array(triVerts);

  return new Manifold({
    numVert: points.length,
    numTri: triVertsArray.length / 3,
    vertProperties,
    triVerts: triVertsArray,
  });
}

/**
 * Create a polygon from 2D points (for extrusion)
 *
 * @param points - Array of [x, y] points
 */
export function createPolygon(points: number[][]): ManifoldObject {
  // Convert 2D points to 3D (z=0) and create a very thin polyhedron
  const points3D = points.map(([x, y]) => [x, y, 0]);
  const pointsTop = points.map(([x, y]) => [x, y, 0.001]);

  const allPoints = [...points3D, ...pointsTop];

  // Create faces
  const faces: number[][] = [];
  const n = points.length;

  // Bottom face (reversed for correct winding)
  faces.push([...Array(n).keys()].reverse());

  // Top face
  faces.push([...Array(n).keys()].map(i => i + n));

  // Side faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push([i, next, next + n, i + n]);
  }

  return createPolyhedron(allPoints, faces);
}

/**
 * Parse OpenSCAD-style size parameter
 * Handles: size=10, size=[10,20,30]
 */
export function parseSize(
  size: number | [number, number, number] | undefined,
  defaultSize: number = 10
): [number, number, number] {
  if (size === undefined) {
    return [defaultSize, defaultSize, defaultSize];
  }
  if (Array.isArray(size)) {
    return size;
  }
  return [size, size, size];
}

/**
 * Parse OpenSCAD-style 2D size parameter
 * Handles: size=10, size=[10,20]
 */
export function parseSize2D(
  size: number | [number, number] | undefined,
  defaultSize: number = 10
): [number, number] {
  if (size === undefined) {
    return [defaultSize, defaultSize];
  }
  if (Array.isArray(size)) {
    return size;
  }
  return [size, size];
}
