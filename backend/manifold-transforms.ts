/**
 * Manifold Transformation Operations
 *
 * Geometric transformations for manifold objects.
 * These replace the Rust WASM transform implementations.
 */

import type { ManifoldObject } from './manifold-types';

/**
 * Translate (move) a manifold
 * @param manifold - Manifold to translate
 * @param offset - [x, y, z] translation vector
 */
export function translate(
  manifold: ManifoldObject,
  offset: [number, number, number]
): ManifoldObject {
  return manifold.translate(offset);
}

/**
 * Rotate a manifold
 * @param manifold - Manifold to rotate
 * @param angles - [x, y, z] rotation angles in degrees
 *
 * Note: Manifold uses degrees, OpenSCAD uses degrees
 * Rotation order: Z, then Y, then X (standard OpenSCAD order)
 */
export function rotate(
  manifold: ManifoldObject,
  angles: [number, number, number]
): ManifoldObject {
  return manifold.rotate(angles);
}

/**
 * Rotate around a single axis
 */
export function rotateX(manifold: ManifoldObject, angle: number): ManifoldObject {
  return manifold.rotate([angle, 0, 0]);
}

export function rotateY(manifold: ManifoldObject, angle: number): ManifoldObject {
  return manifold.rotate([0, angle, 0]);
}

export function rotateZ(manifold: ManifoldObject, angle: number): ManifoldObject {
  return manifold.rotate([0, 0, angle]);
}

/**
 * Scale a manifold
 * @param manifold - Manifold to scale
 * @param factors - [x, y, z] scale factors
 */
export function scale(
  manifold: ManifoldObject,
  factors: [number, number, number]
): ManifoldObject {
  return manifold.scale(factors);
}

/**
 * Uniform scale (same factor in all directions)
 */
export function scaleUniform(
  manifold: ManifoldObject,
  factor: number
): ManifoldObject {
  return manifold.scale([factor, factor, factor]);
}

/**
 * Mirror a manifold across a plane
 * @param manifold - Manifold to mirror
 * @param normal - Normal vector of the mirror plane
 *
 * Common mirrors:
 * - X-axis: [1, 0, 0]
 * - Y-axis: [0, 1, 0]
 * - Z-axis: [0, 0, 1]
 */
export function mirror(
  manifold: ManifoldObject,
  normal: [number, number, number]
): ManifoldObject {
  return manifold.mirror(normal);
}

/**
 * Mirror across X-axis
 */
export function mirrorX(manifold: ManifoldObject): ManifoldObject {
  return manifold.mirror([1, 0, 0]);
}

/**
 * Mirror across Y-axis
 */
export function mirrorY(manifold: ManifoldObject): ManifoldObject {
  return manifold.mirror([0, 1, 0]);
}

/**
 * Mirror across Z-axis
 */
export function mirrorZ(manifold: ManifoldObject): ManifoldObject {
  return manifold.mirror([0, 0, 1]);
}

/**
 * Apply a 4x4 transformation matrix
 * @param manifold - Manifold to transform
 * @param matrix - 16-element array representing 4x4 matrix in row-major order
 *
 * Matrix format (row-major):
 * [m00, m01, m02, m03,
 *  m10, m11, m12, m13,
 *  m20, m21, m22, m23,
 *  m30, m31, m32, m33]
 */
export function multmatrix(
  manifold: ManifoldObject,
  matrix: number[]
): ManifoldObject {
  if (matrix.length !== 16) {
    throw new Error(`multmatrix requires 16 elements, got ${matrix.length}`);
  }

  return manifold.transform(matrix);
}

/**
 * Create a 4x4 identity matrix
 */
export function identityMatrix(): number[] {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

/**
 * Create a translation matrix
 */
export function translationMatrix(x: number, y: number, z: number): number[] {
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1
  ];
}

/**
 * Create a scale matrix
 */
export function scaleMatrix(sx: number, sy: number, sz: number): number[] {
  return [
    sx, 0,  0,  0,
    0,  sy, 0,  0,
    0,  0,  sz, 0,
    0,  0,  0,  1
  ];
}

/**
 * Create a rotation matrix around X-axis (degrees)
 */
export function rotationMatrixX(angle: number): number[] {
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);

  return [
    1, 0,  0, 0,
    0, c, -s, 0,
    0, s,  c, 0,
    0, 0,  0, 1
  ];
}

/**
 * Create a rotation matrix around Y-axis (degrees)
 */
export function rotationMatrixY(angle: number): number[] {
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);

  return [
     c, 0, s, 0,
     0, 1, 0, 0,
    -s, 0, c, 0,
     0, 0, 0, 1
  ];
}

/**
 * Create a rotation matrix around Z-axis (degrees)
 */
export function rotationMatrixZ(angle: number): number[] {
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);

  return [
    c, -s, 0, 0,
    s,  c, 0, 0,
    0,  0, 1, 0,
    0,  0, 0, 1
  ];
}

/**
 * Multiply two 4x4 matrices
 * Used for combining transformations
 */
export function multiplyMatrices(a: number[], b: number[]): number[] {
  if (a.length !== 16 || b.length !== 16) {
    throw new Error('Matrix multiplication requires two 4x4 matrices (16 elements each)');
  }

  const result = new Array(16);

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] =
        a[i * 4 + 0] * b[0 * 4 + j] +
        a[i * 4 + 1] * b[1 * 4 + j] +
        a[i * 4 + 2] * b[2 * 4 + j] +
        a[i * 4 + 3] * b[3 * 4 + j];
    }
  }

  return result;
}

/**
 * Resize - Scale to specific dimensions
 * @param manifold - Manifold to resize
 * @param newSize - [width, height, depth] target dimensions
 * @param auto - If true, maintain aspect ratio
 */
export function resize(
  manifold: ManifoldObject,
  newSize: [number, number, number],
  auto: boolean = false
): ManifoldObject {
  const bbox = manifold.boundingBox();
  const currentSize = [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2]
  ];

  let scaleFactors: [number, number, number];

  if (auto) {
    // Maintain aspect ratio - scale uniformly to fit within newSize
    const maxScale = Math.min(
      newSize[0] / currentSize[0],
      newSize[1] / currentSize[1],
      newSize[2] / currentSize[2]
    );
    scaleFactors = [maxScale, maxScale, maxScale];
  } else {
    // Scale independently in each direction
    scaleFactors = [
      newSize[0] / currentSize[0],
      newSize[1] / currentSize[1],
      newSize[2] / currentSize[2]
    ];
  }

  return manifold.scale(scaleFactors);
}
