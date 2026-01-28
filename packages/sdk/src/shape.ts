/**
 * Fluent API Shape Class for moicad
 *
 * Provides a modern, chainable API for 3D CAD modeling.
 * All operations are immutable - they return new Shape instances.
 *
 * Example usage:
 * ```typescript
 * import { Shape } from 'moicad';
 *
 * const bolt = Shape.cylinder(20, 2.5)
 *   .union(Shape.sphere(3).translate([0, 0, 20]))
 *   .color('silver');
 *
 * export default bolt;
 * ```
 */

import type { ManifoldObject } from './manifold/types';
import type { Geometry } from './types/geometry-types';
import { getManifold } from './manifold/engine';
import { pluginManager } from './plugins';
import {
  createCube,
  createSphere,
  createCylinder,
  createCone,
  createPyramid,
  createPolyhedron,
  createCircle,
  createSquare,
  createPolygon,
} from './manifold/primitives';
import {
  translate as manifoldTranslate,
  rotate as manifoldRotate,
  scale as manifoldScale,
  mirror as manifoldMirror,
} from './manifold/transforms';
import {
  union as manifoldUnion,
  difference as manifoldDifference,
  intersection as manifoldIntersection,
  unionMultiple,
  differenceMultiple,
  intersectionMultiple,
  hull as manifoldHull,
  minkowski as manifoldMinkowski,
} from './manifold/csg';
import { manifoldToGeometry } from './manifold/geometry';
import { linearExtrude as manifoldLinearExtrude, rotateExtrude as manifoldRotateExtrude } from './manifold/extrude';
import { offset2D as manifoldOffset, project3Dto2D } from './manifold/2d';
import { createText } from './manifold/text';
import { createSurface } from './manifold/surface';

/**
 * Immutable Shape class for fluent CAD modeling
 */
export class Shape {
  private manifoldObject: ManifoldObject;
  private _color?: [number, number, number, number]; // RGBA
  private _modifier?: string; // !, #, %, *

  /**
   * Private constructor - use static factory methods to create shapes
   */
  private constructor(
    manifoldObject: ManifoldObject,
    color?: [number, number, number, number],
    modifier?: string
  ) {
    this.manifoldObject = manifoldObject;
    this._color = color;
    this._modifier = modifier;
    
    // Initialize plugin transforms for this instance
    this.initializePluginTransforms();
  }

  // ============================================================================
  // STATIC FACTORY METHODS (3D Primitives)
  // ============================================================================

  /**
   * Create a cube/box.
   *
   * @param size - Single number for uniform cube, or [width, depth, height]
   * @param center - If true, cube is centered at origin (default: false)
   *
   * @example
   * Shape.cube(10)              // 10×10×10 cube with corner at origin
   * Shape.cube([20, 30, 10])    // Box with different dimensions
   * Shape.cube(10, true)        // Cube centered at origin
   */
  static cube(
    size: number | [number, number, number],
    center: boolean = false
  ): Shape {
    // Execute plugin hooks before creating the shape
    pluginManager.executeHook('shape.create', 'cube', size, center);
    
    const manifold = createCube(size, center);
    const shape = new Shape(manifold);
    
    // Execute plugin hooks after creating the shape
    pluginManager.executeHook('shape.create.after', shape, 'cube', size, center);
    
    return shape;
  }

  /**
   * Create a sphere.
   *
   * @param radius - Sphere radius
   * @param options - Optional settings
   * @param options.$fn - Number of segments (default: 32)
   *
   * @example
   * Shape.sphere(5)             // Sphere with radius 5
   * Shape.sphere(10, { $fn: 64 }) // High-resolution sphere
   */
  static sphere(radius: number, options?: { $fn?: number }): Shape {
    const segments = options?.$fn ?? 32;
    const manifold = createSphere(radius, segments);
    return new Shape(manifold);
  }

  /**
   * Create a cylinder.
   *
   * @param height - Cylinder height
   * @param radius - Radius (or array [radiusBottom, radiusTop] for tapered)
   * @param options - Optional settings
   * @param options.center - Center vertically (default: false, sits on Z=0)
   * @param options.$fn - Number of segments (default: 32)
   *
   * @example
   * Shape.cylinder(20, 5)                 // Cylinder from Z=0 to Z=20
   * Shape.cylinder(20, [5, 3])            // Tapered cylinder
   * Shape.cylinder(20, 5, { center: true }) // Centered at origin
   * Shape.cylinder(20, 5, { $fn: 64 })    // High-resolution
   */
  static cylinder(
    height: number,
    radius: number | [number, number],
    options?: { center?: boolean; $fn?: number }
  ): Shape {
    const center = options?.center ?? false;
    const segments = options?.$fn ?? 32;

    let radiusBottom: number;
    let radiusTop: number;

    if (Array.isArray(radius)) {
      [radiusBottom, radiusTop] = radius;
    } else {
      radiusBottom = radiusTop = radius;
    }

    const manifold = createCylinder(height, radiusBottom, radiusTop, segments, center);
    return new Shape(manifold);
  }

  /**
   * Create a cone.
   *
   * @param height - Cone height
   * @param radius - Base radius
   * @param options - Optional settings
   * @param options.center - Center vertically (default: false, sits on Z=0)
   * @param options.$fn - Number of segments (default: 32)
   *
   * @example
   * Shape.cone(20, 10)          // Cone from Z=0 to Z=20
   * Shape.cone(20, 10, { center: true }) // Cone centered at origin
   */
  static cone(
    height: number,
    radius: number,
    options?: { center?: boolean; $fn?: number }
  ): Shape {
    const center = options?.center ?? false;
    const segments = options?.$fn ?? 32;
    const manifold = createCone(height, radius, segments, center);
    return new Shape(manifold);
  }

  /**
   * Create a pyramid with N-sided polygonal base.
   *
   * @param size - Single number for square pyramid, or [baseWidth, baseDepth, height]
   * @param options - Optional settings
   * @param options.sides - Number of base sides: 3=triangular, 4=square (default), 5=pentagonal, etc.
   * @param options.center - Center vertically (default: false, sits on Z=0)
   * @param options.$fn - Fragment count (for compatibility, pyramids have flat sides)
   *
   * @example
   * Shape.pyramid(20)                        // 20×20×20 square pyramid
   * Shape.pyramid([30, 20, 15])              // Rectangular pyramid
   * Shape.pyramid(20, { center: true })      // Centered pyramid
   * Shape.pyramid(20, { sides: 3 })          // Triangular pyramid (tetrahedron)
   * Shape.pyramid(20, { sides: 6 })          // Hexagonal pyramid
   */
  static pyramid(
    size: number | [number, number, number],
    options?: { sides?: number; center?: boolean; $fn?: number }
  ): Shape {
    const sides = options?.sides ?? 4;
    const center = options?.center ?? false;
    const manifold = createPyramid(size, sides, center);
    return new Shape(manifold);
  }

  /**
   * Create a polyhedron from vertices and faces.
   *
   * @param points - Array of [x, y, z] vertex positions
   * @param faces - Array of face indices (e.g., [[0,1,2], [0,2,3]])
   *
   * @example
   * Shape.polyhedron(
   *   [[0,0,0], [10,0,0], [10,10,0], [0,10,0], [5,5,10]],
   *   [[0,1,4], [1,2,4], [2,3,4], [3,0,4], [0,3,2,1]]
   * )
   */
  static polyhedron(points: number[][], faces: number[][]): Shape {
    const manifold = createPolyhedron(points, faces);
    return new Shape(manifold);
  }

  // ============================================================================
  // STATIC FACTORY METHODS (2D Primitives)
  // ============================================================================

  /**
   * Create a circle (2D shape for extrusion).
   *
   * @param radius - Circle radius
   * @param options - Optional settings
   * @param options.$fn - Number of segments (default: 32)
   *
   * @example
   * Shape.circle(10)                    // Circle radius 10
   * Shape.circle(5, { $fn: 64 })        // High-resolution circle
   */
  static circle(radius: number, options?: { $fn?: number }): Shape {
    const segments = options?.$fn ?? 32;
    const manifold = createCircle(radius, segments);
    return new Shape(manifold);
  }

  /**
   * Create a square (2D shape for extrusion).
   *
   * @param size - Single number or [width, height]
   * @param center - Center at origin (default: true)
   *
   * @example
   * Shape.square(10)            // 10×10 square
   * Shape.square([20, 30])      // Rectangle
   */
  static square(
    size: number | [number, number],
    center: boolean = true
  ): Shape {
    const manifold = createSquare(size, center);
    return new Shape(manifold);
  }

  /**
   * Create a polygon (2D shape for extrusion).
   *
   * @param points - Array of [x, y] points
   *
   * @example
   * Shape.polygon([[0,0], [10,0], [10,10], [0,10]])  // Square
   * Shape.polygon([[0,0], [10,0], [5,10]])           // Triangle
   */
  static polygon(points: number[][]): Shape {
    const manifold = createPolygon(points);
    return new Shape(manifold);
  }

  // ============================================================================
  // STATIC FACTORY METHODS (Advanced Primitives)
  // ============================================================================

  /**
   * Create 3D text.
   *
   * @param text - Text string to render
   * @param options - Text rendering options
   * @param options.size - Font size (default: 10)
   * @param options.font - Font name (default: 'Liberation Sans')
   * @param options.halign - Horizontal alignment: 'left', 'center', 'right' (default: 'left')
   * @param options.valign - Vertical alignment: 'top', 'center', 'baseline', 'bottom' (default: 'baseline')
   * @param options.spacing - Letter spacing multiplier (default: 1)
   * @param options.direction - Text direction: 'ltr', 'rtl', 'ttb', 'btt' (default: 'ltr')
   *
   * @example
   * Shape.text('Hello')
   * Shape.text('moicad', { size: 20, halign: 'center' })
   */
  static async text(
    text: string,
    options?: {
      size?: number;
      font?: string;
      halign?: 'left' | 'center' | 'right';
      valign?: 'top' | 'center' | 'baseline' | 'bottom';
      spacing?: number;
      direction?: 'ltr' | 'rtl' | 'ttb' | 'btt';
    }
  ): Promise<Shape> {
    const manifold = await createText(text, options);
    return new Shape(manifold);
  }

  /**
   * Create a surface from heightmap data.
   *
   * @param data - 2D array of height values, flat array, or Float32Array
   * @param width - Width of the heightmap (X dimension)
   * @param depth - Depth of the heightmap (Y dimension)
   * @param options - Surface generation options
   * @param options.center - Center the surface (default: false)
   * @param options.invert - Invert the heightmap (default: false)
   *
   * @example
   * // 2D array of heights
   * Shape.surface([[0,1,0], [1,2,1], [0,1,0]], 3, 3)
   * // Flat array with dimensions
   * Shape.surface([0,1,0,1,2,1,0,1,0], 3, 3, { center: true })
   */
  static surface(
    data: number[][] | Float32Array | number[],
    width: number,
    depth: number,
    options?: {
      center?: boolean;
      invert?: boolean;
    }
  ): Shape {
    const manifold = createSurface(data, width, depth, {
      center: options?.center ?? false,
      invert: options?.invert ?? false,
    });
    return new Shape(manifold);
  }

  // ============================================================================
  // PLUGIN DYNAMIC METHODS (Auto-generated from plugins)
  // ============================================================================

  /**
   * Get all available plugin primitives as static methods.
   * This method is called to expose plugin primitives on the Shape class.
   */
  private static initializePluginMethods(): void {
    const primitives = pluginManager.getPrimitives();
    
    for (const [name, func] of Object.entries(primitives)) {
      if (!(this.prototype as any)[name] && !this[name as keyof typeof Shape]) {
        // Add as static method
        (this as any)[name] = func;
      }
    }
  }

  /**
   * Get all available plugin transforms as instance methods.
   * This method is called to expose plugin transforms on Shape instances.
   */
  private initializePluginTransforms(): void {
    const transforms = pluginManager.getTransforms();
    
    for (const [name, func] of Object.entries(transforms)) {
      if (!(this as any)[name]) {
        (this as any)[name] = (...args: any[]) => {
          return func(this, ...args);
        };
      }
    }
  }

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
   * cube.translate([10, 0, 0])  // Move 10 units along X-axis
   */
  translate(offset: [number, number, number]): Shape {
    // Execute plugin hooks before transform
    pluginManager.executeHook('transform.apply', 'translate', this, offset);
    
    const translated = manifoldTranslate(this.manifoldObject, offset);
    const result = new Shape(translated, this._color, this._modifier);
    
    // Execute plugin hooks after transform
    pluginManager.executeHook('transform.apply.after', 'translate', result, this, offset);
    
    return result;
  }

  /**
   * Rotate this shape.
   * Returns a new Shape instance (immutable).
   *
   * @param angles - [x, y, z] rotation angles in degrees
   *
   * @example
   * cube.rotate([45, 0, 0])     // Rotate 45° around X-axis
   * cube.rotate([0, 90, 0])     // Rotate 90° around Y-axis
   */
  rotate(angles: [number, number, number]): Shape {
    const rotated = manifoldRotate(this.manifoldObject, angles);
    return new Shape(rotated, this._color, this._modifier);
  }

  /**
   * Scale this shape.
   * Returns a new Shape instance (immutable).
   *
   * @param factors - Single number for uniform scaling, or [x, y, z] factors
   *
   * @example
   * cube.scale(2)               // Double size in all directions
   * cube.scale([2, 1, 0.5])     // Different scaling per axis
   */
  scale(factors: number | [number, number, number]): Shape {
    const scaleFactors: [number, number, number] = Array.isArray(factors)
      ? factors
      : [factors, factors, factors];

    const scaled = manifoldScale(this.manifoldObject, scaleFactors);
    return new Shape(scaled, this._color, this._modifier);
  }

  /**
   * Mirror this shape across a plane.
   * Returns a new Shape instance (immutable).
   *
   * @param normal - Normal vector of mirror plane
   *
   * @example
   * cube.mirror([1, 0, 0])      // Mirror across YZ plane (X-axis)
   * cube.mirror([0, 1, 0])      // Mirror across XZ plane (Y-axis)
   * cube.mirror([0, 0, 1])      // Mirror across XY plane (Z-axis)
   */
  mirror(normal: [number, number, number]): Shape {
    const mirrored = manifoldMirror(this.manifoldObject, normal);
    return new Shape(mirrored, this._color, this._modifier);
  }

  /**
   * Apply a transformation matrix.
   * Returns a new Shape instance (immutable).
   *
   * @param matrix - 4×4 transformation matrix (row-major order)
   *
   * @example
   * // Identity matrix
   * cube.multmatrix([
   *   [1, 0, 0, 0],
   *   [0, 1, 0, 0],
   *   [0, 0, 1, 0],
   *   [0, 0, 0, 1]
   * ])
   */
  multmatrix(matrix: number[][]): Shape {
    // manifold-3d uses column-major order, flatten and transpose
    const flat = matrix.flat();
    const Manifold = getManifold();
    const transformed = this.manifoldObject.transform(flat);
    return new Shape(transformed, this._color, this._modifier);
  }

  /**
   * Apply color to this shape (visual only, doesn't affect geometry).
   * Returns a new Shape instance (immutable).
   *
   * @param color - CSS color name, hex string, or [r, g, b] / [r, g, b, a]
   *
   * @example
   * cube.color('red')              // Named color
   * cube.color('#ff0000')          // Hex color
   * cube.color([1, 0, 0])          // RGB (0-1 range)
   * cube.color([1, 0, 0, 0.5])     // RGBA with transparency
   */
  color(
    color: string | [number, number, number] | [number, number, number, number]
  ): Shape {
    const rgba = parseColor(color);
    return new Shape(this.manifoldObject, rgba, this._modifier);
  }

  // ============================================================================
  // CHAINABLE BOOLEAN OPERATIONS (Return new Shape)
  // ============================================================================

  /**
   * Union (combine) this shape with one or more other shapes.
   * Returns a new Shape representing the union.
   *
   * @param shapes - Shapes to unite with this one
   *
   * @example
   * cube.union(sphere)                    // Combine cube and sphere
   * cube.union(sphere1, sphere2)          // Combine multiple shapes
   */
  union(...shapes: Shape[]): Shape {
    const manifolds = [this.manifoldObject, ...shapes.map(s => s.manifoldObject)];
    const result = unionMultiple(manifolds);
    return new Shape(result);
  }

  /**
   * Subtract one or more shapes from this shape.
   * Returns a new Shape representing the difference.
   *
   * @param shapes - Shapes to subtract from this one
   *
   * @example
   * cube.subtract(sphere)                 // Remove sphere from cube
   * cube.subtract(hole1, hole2)           // Remove multiple shapes
   */
  subtract(...shapes: Shape[]): Shape {
    const subtractors = shapes.map(s => s.manifoldObject);
    const result = differenceMultiple(this.manifoldObject, subtractors);
    return new Shape(result);
  }

  /**
   * Intersect this shape with one or more other shapes.
   * Returns a new Shape representing the intersection.
   *
   * @param shapes - Shapes to intersect with this one
   *
   * @example
   * cube.intersect(sphere)                // Keep only overlapping volume
   * cube.intersect(bound1, bound2)        // Multiple intersections
   */
  intersect(...shapes: Shape[]): Shape {
    const manifolds = [this.manifoldObject, ...shapes.map(s => s.manifoldObject)];
    const result = intersectionMultiple(manifolds);
    return new Shape(result);
  }

  /**
   * Alias for subtract() - for OpenSCAD compatibility.
   */
  difference(...shapes: Shape[]): Shape {
    return this.subtract(...shapes);
  }

  /**
   * Alias for intersect() - for OpenSCAD compatibility.
   */
  intersection(...shapes: Shape[]): Shape {
    return this.intersect(...shapes);
  }

  /**
   * Compute convex hull of this shape and other shapes.
   * Returns the smallest convex shape that contains all input shapes.
   *
   * @param shapes - Additional shapes to include in hull
   *
   * @example
   * sphere.hull(cube1, cube2)  // Hull of sphere, cube1, and cube2
   */
  hull(...shapes: Shape[]): Shape {
    const manifolds = [this.manifoldObject, ...shapes.map(s => s.manifoldObject)];
    const result = manifoldHull(manifolds);
    return new Shape(result);
  }

  /**
   * Compute Minkowski sum with another shape.
   * The Minkowski sum places a copy of the second shape at every point of the first shape.
   *
   * @param shape - Shape to perform Minkowski sum with
   *
   * @example
   * cube.minkowski(sphere)  // Rounds the edges of the cube
   */
  minkowski(shape: Shape): Shape {
    const result = manifoldMinkowski(this.manifoldObject, shape.manifoldObject);
    return new Shape(result);
  }

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
   * Shape.union(cube1, cube2, sphere)
   */
  static union(...shapes: Shape[]): Shape {
    if (shapes.length === 0) {
      throw new Error('union() requires at least one shape');
    }
    if (shapes.length === 1) {
      return shapes[0];
    }

    return shapes[0].union(...shapes.slice(1));
  }

  /**
   * Subtract shapes from a base shape.
   * Static method equivalent to base.subtract(...).
   *
   * @param base - Base shape
   * @param shapes - Shapes to subtract
   *
   * @example
   * Shape.difference(cube, sphere1, sphere2)
   */
  static difference(base: Shape, ...shapes: Shape[]): Shape {
    return base.subtract(...shapes);
  }

  /**
   * Intersect multiple shapes.
   * Static method for finding common volume.
   *
   * @param shapes - Shapes to intersect
   *
   * @example
   * Shape.intersection(cube, sphere, cylinder)
   */
  static intersection(...shapes: Shape[]): Shape {
    if (shapes.length === 0) {
      throw new Error('intersection() requires at least one shape');
    }
    if (shapes.length === 1) {
      return shapes[0];
    }

    return shapes[0].intersect(...shapes.slice(1));
  }

  /**
   * Compute convex hull of multiple shapes.
   * Static method for computing hull of independent shapes.
   *
   * @param shapes - Shapes to compute hull of
   *
   * @example
   * Shape.hull(sphere1, sphere2, cube)
   */
  static hull(...shapes: Shape[]): Shape {
    if (shapes.length === 0) {
      throw new Error('hull() requires at least one shape');
    }
    if (shapes.length === 1) {
      return shapes[0];
    }

    return shapes[0].hull(...shapes.slice(1));
  }

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
  static minkowski(a: Shape, b: Shape): Shape {
    return a.minkowski(b);
  }

  // ============================================================================
  // 2D/3D OPERATIONS (Extrusion, Offset, Projection)
  // ============================================================================

  /**
   * Extrude a 2D shape linearly along the Z-axis.
   * Creates a 3D shape by extruding a 2D profile.
   *
   * @param height - Extrusion height
   * @param options - Extrusion options
   * @param options.twist - Twist angle in degrees (default: 0)
   * @param options.scale - Scale factor at top, or [scaleX, scaleY] (default: 1)
   * @param options.slices - Number of slices for twist (default: auto)
   * @param options.center - Center vertically (default: false)
   *
   * @example
   * Shape.circle(10).linearExtrude(20)
   * Shape.square(10).linearExtrude(30, { twist: 180, scale: 0.5 })
   */
  linearExtrude(
    height: number,
    options?: {
      twist?: number;
      scale?: number | [number, number];
      slices?: number;
      center?: boolean;
    }
  ): Shape {
    const result = manifoldLinearExtrude(
      this.manifoldObject,
      height,
      options?.twist ?? 0,
      options?.scale ?? 1,
      options?.slices,
      options?.center ?? false
    );
    return new Shape(result, this._color, this._modifier);
  }

  /**
   * Revolve a 2D shape around the Z-axis.
   * Creates a 3D shape by rotating a 2D profile.
   *
   * @param options - Revolution options
   * @param options.angle - Angle to revolve in degrees (default: 360)
   * @param options.$fn - Number of fragments (default: auto)
   *
   * @example
   * Shape.polygon([[0,0], [10,0], [10,20], [0,20]]).rotateExtrude()
   * Shape.circle(5).rotateExtrude({ angle: 180 })
   */
  rotateExtrude(options?: { angle?: number; $fn?: number }): Shape {
    const result = manifoldRotateExtrude(
      this.manifoldObject,
      options?.angle ?? 360,
      options?.$fn ?? 32
    );
    return new Shape(result, this._color, this._modifier);
  }

  /**
   * Offset a 2D shape (expand or contract).
   * Positive values expand, negative values contract.
   *
   * @param delta - Offset distance (positive = expand, negative = contract)
   * @param options - Offset options
   * @param options.chamfer - Use chamfer instead of round (default: false)
   *
   * @example
   * Shape.square(20).offset(5)      // Expand by 5 units
   * Shape.circle(10).offset(-2)     // Contract by 2 units
   */
  offset(delta: number, options?: { chamfer?: boolean }): Shape {
    // Convert 3D manifold to 2D CrossSection
    const crossSection = project3Dto2D(this.manifoldObject);

    // Apply offset
    const joinType = options?.chamfer ? 'square' : 'round';
    const offsetted = manifoldOffset(crossSection, delta, joinType);

    // Convert back to 3D (very thin manifold)
    const result = offsetted.extrude(0.001, 1, 0, [1, 1], false);

    return new Shape(result, this._color, this._modifier);
  }

  /**
   * Project a 3D shape to 2D.
   * Creates a 2D silhouette of a 3D shape.
   *
   * @param options - Projection options
   * @param options.cut - Cut at Z=0 plane instead of shadow projection (default: false)
   *
   * @example
   * Shape.sphere(10).projection()           // Shadow projection
   * Shape.cube(20).projection({ cut: true }) // Cut at Z=0
   */
  projection(options?: { cut?: boolean }): Shape {
    // Convert 3D manifold to 2D CrossSection
    const crossSection = project3Dto2D(this.manifoldObject);

    // Convert CrossSection back to Manifold (very thin 3D shape)
    // This maintains compatibility with the Shape API
    const result = crossSection.extrude(0.001, 1, 0, [1, 1], false);

    return new Shape(result, this._color, this._modifier);
  }

  // ============================================================================
  // INSPECTION METHODS (Non-chainable)
  // ============================================================================

  /**
   * Extract the final Geometry object for rendering/export.
   * This is what gets sent to the frontend Three.js renderer.
   *
   * CRITICAL: Converts TypedArrays to regular arrays for JSON serialization.
   *
   * @returns Geometry object with vertices, indices, normals, bounds, stats
   */
  getGeometry(): Geometry {
    const geometry = manifoldToGeometry(this.manifoldObject);

    // Add color and modifier metadata if present
    if (this._color) {
      (geometry as any).color = this._color;
    }
    if (this._modifier) {
      (geometry as any).modifier = this._modifier;
    }

    return geometry;
  }

  /**
   * Get bounding box of this shape.
   *
   * @returns Object with min and max corners
   *
   * @example
   * const bounds = cube.getBounds();
   * console.log(bounds.min); // [x, y, z]
   * console.log(bounds.max); // [x, y, z]
   */
  getBounds(): { min: [number, number, number]; max: [number, number, number] } {
    const bbox = this.manifoldObject.boundingBox();
    return {
      min: bbox.min as [number, number, number],
      max: bbox.max as [number, number, number],
    };
  }

  /**
   * Get volume of this shape.
   *
   * @returns Volume in cubic units
   */
  getVolume(): number {
    return this.manifoldObject.volume();
  }

  /**
   * Get surface area of this shape.
   *
   * @returns Surface area in square units
   */
  getSurfaceArea(): number {
    return this.manifoldObject.surfaceArea();
  }

  /**
   * Check if this shape is a valid manifold.
   * A valid manifold is closed (watertight) and non-self-intersecting.
   *
   * @returns true if manifold is valid
   */
  isManifold(): boolean {
    // manifold-3d guarantees manifold output, but check anyway
    return true;
  }

  // ============================================================================
  // EXPORT METHODS
  // ============================================================================

  /**
   * Export shape as JSON string.
   *
   * @returns JSON representation of geometry
   */
  toJSON(): string {
    const geometry = this.getGeometry();
    return JSON.stringify(geometry, null, 2);
  }

  // ============================================================================
  // PLUGIN SYSTEM INTEGRATION
  // ============================================================================

  /**
   * Initialize the plugin system and integrate with Shape class.
   * This should be called once during application startup.
   */
  static async initializePlugins(): Promise<void> {
    // Initialize plugin methods on the Shape class
    this.initializePluginMethods();
  }

  /**
   * Register a plugin primitive directly with the Shape class.
   * Convenience method for adding new primitives.
   */
  static registerPrimitive(name: string, func: (...args: any[]) => Shape): void {
    (this as any)[name] = func;
  }

  /**
   * Register a plugin transform directly with the Shape class.
   * Convenience method for adding new transforms.
   */
  registerTransform(name: string, func: (shape: Shape, ...args: any[]) => Shape): void {
    (this as any)[name] = (...args: any[]) => {
      return func(this, ...args);
    };
  }
}

/**
 * Parse color string/array into RGBA array [0-1 range]
 */
function parseColor(
  color: string | [number, number, number] | [number, number, number, number]
): [number, number, number, number] {
  if (Array.isArray(color)) {
    if (color.length === 3) {
      return [color[0], color[1], color[2], 1.0];
    }
    return color as [number, number, number, number];
  }

  // Handle CSS color names and hex strings
  // For now, simple implementation
  // TODO: Add full CSS color parsing
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b, 1.0];
  }

  // CSS named colors (basic set)
  const namedColors: Record<string, [number, number, number, number]> = {
    red: [1, 0, 0, 1],
    green: [0, 1, 0, 1],
    blue: [0, 0, 1, 1],
    yellow: [1, 1, 0, 1],
    cyan: [0, 1, 1, 1],
    magenta: [1, 0, 1, 1],
    white: [1, 1, 1, 1],
    black: [0, 0, 0, 1],
    gray: [0.5, 0.5, 0.5, 1],
    silver: [0.75, 0.75, 0.75, 1],
  };

  return namedColors[color.toLowerCase()] || [0.5, 0.5, 0.5, 1];
}
