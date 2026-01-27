/**
 * Functional API wrapper for moicad
 *
 * Provides functional-style API as an alternative to the fluent/OOP API.
 * Each function creates and returns Shape instances.
 *
 * @example Functional style
 * ```typescript
 * import { cube, sphere, translate, union } from 'moicad';
 *
 * export default union(
 *   cube(10),
 *   translate([15, 0, 0], sphere(5))
 * );
 * ```
 *
 * @example Fluent style (primary)
 * ```typescript
 * import { Shape } from 'moicad';
 *
 * export default Shape.cube(10)
 *   .union(Shape.sphere(5).translate([15, 0, 0]));
 * ```
 */

import { Shape } from './shape';
import type {
  PrimitiveOptions,
  TextOptions,
  SurfaceOptions,
  LinearExtrudeOptions,
  RotateExtrudeOptions,
  OffsetOptions,
  ProjectionOptions,
  Color,
  Vector3,
  Vector2,
} from '../../shared/javascript-types';

// ============================================================================
// 3D PRIMITIVES
// ============================================================================

/**
 * Create a cube or box.
 *
 * @example
 * cube(10)                    // 10x10x10 cube
 * cube([20, 10, 5], true)    // Centered box
 */
export function cube(size: number | Vector3, center?: boolean): Shape {
  return Shape.cube(size, center);
}

/**
 * Create a sphere.
 *
 * @example
 * sphere(5)
 * sphere(5, { $fn: 64 })
 */
export function sphere(radius: number, options?: PrimitiveOptions): Shape {
  return Shape.sphere(radius, options);
}

/**
 * Create a cylinder.
 *
 * @example
 * cylinder(20, 5)
 * cylinder(20, [5, 3], { center: true })
 */
export function cylinder(
  height: number,
  radius: number | [number, number],
  options?: PrimitiveOptions
): Shape {
  return Shape.cylinder(height, radius, options);
}

/**
 * Create a cone.
 *
 * @example
 * cone(20, 10)
 * cone(20, 10, 5, { center: true })
 */
export function cone(
  height: number,
  radiusBottom: number,
  radiusTop?: number,
  options?: PrimitiveOptions
): Shape {
  return Shape.cone(height, radiusBottom, radiusTop, options);
}

/**
 * Create a polyhedron from vertices and faces.
 *
 * @example
 * polyhedron([[0,0,0], [10,0,0], [5,10,0]], [[0,1,2]])
 */
export function polyhedron(points: number[][], faces: number[][]): Shape {
  return Shape.polyhedron(points, faces);
}

// ============================================================================
// 2D PRIMITIVES
// ============================================================================

/**
 * Create a 2D circle.
 *
 * @example
 * circle(10)
 * circle(10, { $fn: 64 })
 */
export function circle(radius: number, options?: PrimitiveOptions): Shape {
  return Shape.circle(radius, options);
}

/**
 * Create a 2D square or rectangle.
 *
 * @example
 * square(10)
 * square([20, 10], true)
 */
export function square(size: number | Vector2, center?: boolean): Shape {
  return Shape.square(size, center);
}

/**
 * Create a 2D polygon from points.
 *
 * @example
 * polygon([[0,0], [10,0], [5,10]])
 */
export function polygon(points: Vector2[]): Shape {
  return Shape.polygon(points);
}

// ============================================================================
// ADVANCED PRIMITIVES
// ============================================================================

/**
 * Create 3D text (async operation).
 *
 * @example
 * await text('Hello')
 * await text('moicad', { size: 20, halign: 'center' })
 */
export function text(text: string, options?: TextOptions): Promise<Shape> {
  return Shape.text(text, options);
}

/**
 * Create a surface from heightmap data.
 *
 * @example
 * surface('terrain.png')
 */
export function surface(file: string, options?: SurfaceOptions): Shape {
  return Shape.surface(file, options);
}

// ============================================================================
// TRANSFORMS
// ============================================================================

/**
 * Translate (move) a shape.
 *
 * @example
 * translate([10, 0, 0], cube(10))
 */
export function translate(offset: Vector3, shape: Shape): Shape {
  return shape.translate(offset);
}

/**
 * Rotate a shape.
 *
 * @example
 * rotate([45, 0, 0], cube(10))
 */
export function rotate(angles: Vector3, shape: Shape): Shape {
  return shape.rotate(angles);
}

/**
 * Scale a shape.
 *
 * @example
 * scale(2, cube(10))
 * scale([2, 1, 0.5], cube(10))
 */
export function scale(factors: number | Vector3, shape: Shape): Shape {
  return shape.scale(factors);
}

/**
 * Mirror a shape across a plane.
 *
 * @example
 * mirror([1, 0, 0], cube(10))
 */
export function mirror(normal: Vector3, shape: Shape): Shape {
  return shape.mirror(normal);
}

/**
 * Apply a transformation matrix.
 *
 * @example
 * multmatrix([[1,0,0,10], [0,1,0,0], [0,0,1,0], [0,0,0,1]], cube(10))
 */
export function multmatrix(matrix: number[][], shape: Shape): Shape {
  return shape.multmatrix(matrix);
}

/**
 * Apply color to a shape.
 *
 * @example
 * color('red', cube(10))
 * color([1, 0, 0], cube(10))
 */
export function color(color: Color, shape: Shape): Shape {
  return shape.color(color);
}

// ============================================================================
// BOOLEAN OPERATIONS
// ============================================================================

/**
 * Union (combine) multiple shapes.
 *
 * @example
 * union(cube(10), sphere(5), cylinder(20, 3))
 */
export function union(...shapes: Shape[]): Shape {
  return Shape.union(...shapes);
}

/**
 * Subtract shapes from a base shape (difference operation).
 *
 * @example
 * difference(cube(20), sphere(8))
 */
export function difference(base: Shape, ...shapes: Shape[]): Shape {
  return base.subtract(...shapes);
}

/**
 * Intersect multiple shapes.
 *
 * @example
 * intersection(cube(10), sphere(8))
 */
export function intersection(...shapes: Shape[]): Shape {
  return Shape.intersection(...shapes);
}

/**
 * Compute convex hull of multiple shapes.
 *
 * @example
 * hull(sphere(5), cube(10).translate([20, 0, 0]))
 */
export function hull(...shapes: Shape[]): Shape {
  return Shape.hull(...shapes);
}

/**
 * Compute Minkowski sum of two shapes.
 *
 * @example
 * minkowski(cube(10), sphere(2))
 */
export function minkowski(a: Shape, b: Shape): Shape {
  return Shape.minkowski(a, b);
}

// ============================================================================
// 2D/3D OPERATIONS
// ============================================================================

/**
 * Extrude a 2D shape linearly.
 *
 * @example
 * linearExtrude(20, circle(10))
 * linearExtrude(30, square(10), { twist: 180, scale: 0.5 })
 */
export function linearExtrude(
  height: number,
  shape: Shape,
  options?: LinearExtrudeOptions
): Shape {
  return shape.linearExtrude(height, options);
}

/**
 * Revolve a 2D shape around the Z-axis.
 *
 * @example
 * rotateExtrude(polygon([[10,0], [15,0], [15,20], [10,20]]))
 * rotateExtrude(circle(5), { angle: 180 })
 */
export function rotateExtrude(
  shape: Shape,
  options?: RotateExtrudeOptions
): Shape {
  return shape.rotateExtrude(options);
}

/**
 * Offset a 2D shape.
 *
 * @example
 * offset(5, square(20))
 * offset(-2, circle(10))
 */
export function offset(
  delta: number,
  shape: Shape,
  options?: OffsetOptions
): Shape {
  return shape.offset(delta, options);
}

/**
 * Project a 3D shape to 2D.
 *
 * @example
 * projection(sphere(10))
 * projection(cube(20), { cut: true })
 */
export function projection(
  shape: Shape,
  options?: ProjectionOptions
): Shape {
  return shape.projection(options);
}
