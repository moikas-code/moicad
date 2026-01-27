/**
 * TypeScript type definitions for moicad JavaScript API
 *
 * Import these types in your TypeScript projects:
 * ```typescript
 * import { Shape, ShapeOptions } from 'moicad';
 * ```
 */

import type { Geometry } from './geometry-types';

/**
 * Options for primitive shapes
 */
export interface PrimitiveOptions {
  /** Number of fragments for curved surfaces ($fn in OpenSCAD) */
  $fn?: number;
  /** Center the shape at origin */
  center?: boolean;
}

/**
 * Options for text rendering
 */
export interface TextOptions {
  /** Font size (default: 10) */
  size?: number;
  /** Font name (default: 'Liberation Sans') */
  font?: string;
  /** Horizontal alignment: 'left', 'center', 'right' (default: 'left') */
  halign?: 'left' | 'center' | 'right';
  /** Vertical alignment: 'top', 'center', 'baseline', 'bottom' (default: 'baseline') */
  valign?: 'top' | 'center' | 'baseline' | 'bottom';
  /** Letter spacing multiplier (default: 1) */
  spacing?: number;
  /** Text direction: 'ltr', 'rtl', 'ttb', 'btt' (default: 'ltr') */
  direction?: 'ltr' | 'rtl' | 'ttb' | 'btt';
}

/**
 * Options for surface generation
 */
export interface SurfaceOptions {
  /** Center the surface (default: false) */
  center?: boolean;
  /** Invert the heightmap (default: false) */
  invert?: boolean;
  /** Convexity parameter for rendering (default: 1) */
  convexity?: number;
}

/**
 * Options for linear extrusion
 */
export interface LinearExtrudeOptions {
  /** Twist angle in degrees (default: 0) */
  twist?: number;
  /** Scale factor at top, or [scaleX, scaleY] (default: 1) */
  scale?: number | [number, number];
  /** Number of slices for twist (default: auto) */
  slices?: number;
  /** Center vertically (default: false) */
  center?: boolean;
}

/**
 * Options for rotate extrusion
 */
export interface RotateExtrudeOptions {
  /** Angle to revolve in degrees (default: 360) */
  angle?: number;
  /** Number of fragments (default: auto) */
  $fn?: number;
}

/**
 * Options for offset operation
 */
export interface OffsetOptions {
  /** Use chamfer instead of round (default: false) */
  chamfer?: boolean;
}

/**
 * Options for projection operation
 */
export interface ProjectionOptions {
  /** Cut at Z=0 plane instead of shadow projection (default: false) */
  cut?: boolean;
}

/**
 * Color type - CSS color name, hex string, RGB, or RGBA
 */
export type Color = string | [number, number, number] | [number, number, number, number];

/**
 * 3D vector [x, y, z]
 */
export type Vector3 = [number, number, number];

/**
 * 2D vector [x, y]
 */
export type Vector2 = [number, number];

/**
 * Bounding box
 */
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

/**
 * Immutable Shape class for fluent CAD modeling.
 * All operations return new Shape instances (functional programming principle).
 *
 * @example Basic usage
 * ```typescript
 * import { Shape } from 'moicad';
 *
 * const cube = Shape.cube(10);
 * const sphere = Shape.sphere(5).translate([15, 0, 0]);
 * const combined = cube.union(sphere);
 *
 * export default combined;
 * ```
 *
 * @example Parametric design with classes
 * ```typescript
 * import { Shape } from 'moicad';
 *
 * class Bolt {
 *   constructor(public length: number, public diameter: number) {}
 *
 *   build(): Shape {
 *     return Shape.cylinder(this.length, this.diameter / 2)
 *       .union(
 *         Shape.sphere(this.diameter / 2)
 *           .translate([0, 0, this.length])
 *       );
 *   }
 * }
 *
 * export default new Bolt(20, 5).build();
 * ```
 */
export declare class Shape {
  // ============================================================================
  // STATIC FACTORY METHODS (3D Primitives)
  // ============================================================================

  /**
   * Create a cube or box.
   *
   * @param size - Single number for uniform cube, or [width, depth, height]
   * @param center - If true, cube is centered at origin (default: false)
   *
   * @example
   * Shape.cube(10)                    // 10x10x10 cube at origin
   * Shape.cube([20, 10, 5], true)    // Centered box
   */
  static cube(size: number | Vector3, center?: boolean): Shape;

  /**
   * Create a sphere.
   *
   * @param radius - Sphere radius
   * @param options - Optional settings like $fn for fragment count
   *
   * @example
   * Shape.sphere(5)                   // Sphere with default detail
   * Shape.sphere(5, { $fn: 64 })     // High-detail sphere
   */
  static sphere(radius: number, options?: PrimitiveOptions): Shape;

  /**
   * Create a cylinder or cone.
   *
   * @param height - Cylinder height
   * @param radius - Single radius, or [radiusBottom, radiusTop] for tapered cylinder
   * @param options - Optional settings (center, $fn)
   *
   * @example
   * Shape.cylinder(20, 5)                        // Cylinder: height 20, radius 5
   * Shape.cylinder(20, [5, 3], { center: true }) // Tapered cylinder (cone-like)
   */
  static cylinder(
    height: number,
    radius: number | [number, number],
    options?: PrimitiveOptions
  ): Shape;

  /**
   * Create a cone.
   *
   * @param height - Cone height
   * @param radiusBottom - Base radius
   * @param radiusTop - Top radius (default: 0 for pointed cone)
   * @param options - Optional settings (center, $fn)
   *
   * @example
   * Shape.cone(20, 10)                     // Pointed cone
   * Shape.cone(20, 10, 5, { center: true })// Truncated cone
   */
  static cone(
    height: number,
    radiusBottom: number,
    radiusTop?: number,
    options?: PrimitiveOptions
  ): Shape;

  /**
   * Create a polyhedron from vertices and faces.
   *
   * @param points - Array of [x, y, z] vertices
   * @param faces - Array of face indices (triangles or polygons)
   *
   * @example
   * const points = [[0,0,0], [10,0,0], [5,10,0], [5,5,10]];
   * const faces = [[0,1,2], [0,2,3], [0,3,1], [1,3,2]];
   * Shape.polyhedron(points, faces)
   */
  static polyhedron(points: number[][], faces: number[][]): Shape;

  // ============================================================================
  // STATIC FACTORY METHODS (2D Primitives)
  // ============================================================================

  /**
   * Create a 2D circle.
   *
   * @param radius - Circle radius
   * @param options - Optional settings like $fn
   *
   * @example
   * Shape.circle(10)
   * Shape.circle(10, { $fn: 64 })
   */
  static circle(radius: number, options?: PrimitiveOptions): Shape;

  /**
   * Create a 2D square or rectangle.
   *
   * @param size - Single number for square, or [width, height]
   * @param center - If true, centered at origin
   *
   * @example
   * Shape.square(10)                 // 10x10 square
   * Shape.square([20, 10], true)     // Centered rectangle
   */
  static square(size: number | Vector2, center?: boolean): Shape;

  /**
   * Create a 2D polygon from points.
   *
   * @param points - Array of [x, y] points
   *
   * @example
   * Shape.polygon([[0,0], [10,0], [5,10]])           // Triangle
   * Shape.polygon([[0,0], [10,0], [10,10], [0,10]])  // Square
   */
  static polygon(points: Vector2[]): Shape;

  // ============================================================================
  // STATIC FACTORY METHODS (Advanced Primitives)
  // ============================================================================

  /**
   * Create 3D text (async operation).
   *
   * @param text - Text string to render
   * @param options - Text rendering options
   *
   * @example
   * await Shape.text('Hello')
   * await Shape.text('moicad', { size: 20, halign: 'center' })
   */
  static text(text: string, options?: TextOptions): Promise<Shape>;

  /**
   * Create a surface from heightmap data.
   *
   * @param file - Path to heightmap file
   * @param options - Surface generation options
   *
   * @example
   * Shape.surface('terrain.png')
   * Shape.surface('heightmap.dat', { center: true })
   */
  static surface(file: string, options?: SurfaceOptions): Shape;

  // ============================================================================
  // CHAINABLE TRANSFORM METHODS (Return new Shape)
  // ============================================================================

  /**
   * Translate (move) this shape.
   * Returns a new Shape instance (immutable).
   *
   * @param offset - [x, y, z] translation vector
   *
   * @example
   * shape.translate([10, 0, 0])       // Move 10 units on X-axis
   * shape.translate([5, 5, 10])       // Move in 3D space
   */
  translate(offset: Vector3): Shape;

  /**
   * Rotate this shape around X, Y, Z axes.
   * Returns a new Shape instance (immutable).
   *
   * @param angles - [x, y, z] rotation angles in degrees
   *
   * @example
   * shape.rotate([45, 0, 0])          // Rotate 45° around X-axis
   * shape.rotate([0, 90, 0])          // Rotate 90° around Y-axis
   */
  rotate(angles: Vector3): Shape;

  /**
   * Scale this shape.
   * Returns a new Shape instance (immutable).
   *
   * @param factors - Single number for uniform scale, or [x, y, z] scale factors
   *
   * @example
   * shape.scale(2)                    // Uniform 2x scaling
   * shape.scale([2, 1, 0.5])         // Non-uniform scaling
   */
  scale(factors: number | Vector3): Shape;

  /**
   * Mirror this shape across a plane defined by a normal vector.
   * Returns a new Shape instance (immutable).
   *
   * @param normal - [x, y, z] normal vector of the mirror plane
   *
   * @example
   * shape.mirror([1, 0, 0])           // Mirror across YZ plane
   * shape.mirror([0, 1, 0])           // Mirror across XZ plane
   */
  mirror(normal: Vector3): Shape;

  /**
   * Apply a transformation matrix to this shape.
   * Returns a new Shape instance (immutable).
   *
   * @param matrix - 4x4 transformation matrix (or 3x4)
   *
   * @example
   * const matrix = [[1,0,0,10], [0,1,0,0], [0,0,1,0], [0,0,0,1]];
   * shape.multmatrix(matrix)
   */
  multmatrix(matrix: number[][]): Shape;

  /**
   * Apply color to this shape (visual only, doesn't affect geometry).
   * Returns a new Shape instance (immutable).
   *
   * @param color - CSS color name, hex string, RGB, or RGBA
   *
   * @example
   * shape.color('red')
   * shape.color('#ff0000')
   * shape.color([1, 0, 0])            // RGB (0-1 range)
   * shape.color([1, 0, 0, 0.5])       // RGBA with transparency
   */
  color(color: Color): Shape;

  // ============================================================================
  // CHAINABLE BOOLEAN OPERATIONS (Return new Shape)
  // ============================================================================

  /**
   * Union (combine) this shape with one or more other shapes.
   * Returns a new Shape instance (immutable).
   *
   * @param shapes - Shapes to unite with this one
   *
   * @example
   * cube.union(sphere)
   * cube.union(sphere1, sphere2, sphere3)
   */
  union(...shapes: Shape[]): Shape;

  /**
   * Subtract one or more shapes from this shape (difference operation).
   * Returns a new Shape instance (immutable).
   *
   * @param shapes - Shapes to subtract
   *
   * @example
   * cube.subtract(sphere)             // Sphere-shaped hole in cube
   * box.subtract(hole1, hole2)        // Multiple subtractions
   */
  subtract(...shapes: Shape[]): Shape;

  /**
   * Intersect this shape with one or more other shapes.
   * Returns a new Shape instance (immutable).
   *
   * @param shapes - Shapes to intersect with
   *
   * @example
   * cube.intersect(sphere)            // Only the overlapping volume
   */
  intersect(...shapes: Shape[]): Shape;

  /**
   * Alias for subtract() - for OpenSCAD compatibility.
   */
  difference(...shapes: Shape[]): Shape;

  /**
   * Alias for intersect() - for OpenSCAD compatibility.
   */
  intersection(...shapes: Shape[]): Shape;

  /**
   * Compute convex hull of this shape and other shapes.
   * Returns the smallest convex shape that contains all input shapes.
   *
   * @param shapes - Additional shapes to include in hull
   *
   * @example
   * sphere.hull(cube1, cube2)         // Hull of sphere, cube1, and cube2
   */
  hull(...shapes: Shape[]): Shape;

  /**
   * Compute Minkowski sum with another shape.
   * The Minkowski sum places a copy of the second shape at every point of the first shape.
   *
   * @param shape - Shape to perform Minkowski sum with
   *
   * @example
   * cube.minkowski(sphere)            // Rounds the edges of the cube
   */
  minkowski(shape: Shape): Shape;

  // ============================================================================
  // STATIC BOOLEAN METHODS (For multi-shape operations)
  // ============================================================================

  /**
   * Union multiple shapes together.
   * Static method for combining independent shapes.
   *
   * @param shapes - Shapes to unite
   *
   * @example
   * Shape.union(cube, sphere, cylinder)
   */
  static union(...shapes: Shape[]): Shape;

  /**
   * Compute intersection of multiple shapes.
   * Static method for intersecting independent shapes.
   *
   * @param shapes - Shapes to intersect
   *
   * @example
   * Shape.intersection(cube, sphere)
   */
  static intersection(...shapes: Shape[]): Shape;

  /**
   * Compute convex hull of multiple shapes.
   * Static method for computing hull of independent shapes.
   *
   * @param shapes - Shapes to compute hull of
   *
   * @example
   * Shape.hull(sphere1, sphere2, cube)
   */
  static hull(...shapes: Shape[]): Shape;

  /**
   * Compute Minkowski sum of two shapes.
   * Static method equivalent to a.minkowski(b).
   *
   * @param a - First shape
   * @param b - Second shape
   *
   * @example
   * Shape.minkowski(cube, sphere)
   */
  static minkowski(a: Shape, b: Shape): Shape;

  // ============================================================================
  // 2D/3D OPERATIONS (Extrusion, Offset, Projection)
  // ============================================================================

  /**
   * Extrude a 2D shape linearly along the Z-axis.
   * Creates a 3D shape by extruding a 2D profile.
   *
   * @param height - Extrusion height
   * @param options - Extrusion options
   *
   * @example
   * Shape.circle(10).linearExtrude(20)
   * Shape.square(10).linearExtrude(30, { twist: 180, scale: 0.5 })
   */
  linearExtrude(height: number, options?: LinearExtrudeOptions): Shape;

  /**
   * Revolve a 2D shape around the Z-axis.
   * Creates a 3D shape by rotating a 2D profile.
   *
   * @param options - Revolution options
   *
   * @example
   * Shape.polygon([[10,0], [15,0], [15,20], [10,20]]).rotateExtrude()
   * Shape.circle(5).rotateExtrude({ angle: 180 })
   */
  rotateExtrude(options?: RotateExtrudeOptions): Shape;

  /**
   * Offset a 2D shape (expand or contract).
   * Positive values expand, negative values contract.
   *
   * @param delta - Offset distance (positive = expand, negative = contract)
   * @param options - Offset options
   *
   * @example
   * Shape.square(20).offset(5)        // Expand by 5 units
   * Shape.circle(10).offset(-2)       // Contract by 2 units
   */
  offset(delta: number, options?: OffsetOptions): Shape;

  /**
   * Project a 3D shape to 2D.
   * Creates a 2D silhouette of a 3D shape.
   *
   * @param options - Projection options
   *
   * @example
   * Shape.sphere(10).projection()             // Shadow projection
   * Shape.cube(20).projection({ cut: true })  // Cut at Z=0
   */
  projection(options?: ProjectionOptions): Shape;

  // ============================================================================
  // INSPECTION METHODS (Non-chainable)
  // ============================================================================

  /**
   * Extract the final Geometry object for rendering/export.
   * This is what gets sent to the frontend Three.js renderer.
   *
   * @returns Geometry with vertices, indices, normals, and stats
   */
  getGeometry(): Geometry;

  /**
   * Get bounding box of this shape.
   *
   * @returns Bounding box with min and max corners
   */
  getBounds(): BoundingBox;

  /**
   * Get volume of this shape.
   *
   * @returns Volume in cubic units
   */
  getVolume(): number;

  /**
   * Get surface area of this shape.
   *
   * @returns Surface area in square units
   */
  getSurfaceArea(): number;

  /**
   * Check if this shape is a valid manifold (closed, non-self-intersecting).
   *
   * @returns True if manifold is valid
   */
  isManifold(): boolean;

  // ============================================================================
  // EXPORT METHODS
  // ============================================================================

  /**
   * Export shape as STL file buffer.
   *
   * @returns Binary STL data
   */
  toSTL(): Buffer;

  /**
   * Export shape as OBJ file buffer.
   *
   * @returns Binary OBJ data
   */
  toOBJ(): Buffer;

  /**
   * Export shape as JSON string.
   *
   * @returns JSON representation of geometry
   */
  toJSON(): string;
}
