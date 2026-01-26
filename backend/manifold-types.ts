/**
 * TypeScript type definitions for manifold-3d library
 *
 * These types define the interface for working with Manifold objects,
 * meshes, and related data structures.
 */

/**
 * Manifold mesh data structure
 * This represents the raw mesh data returned by manifold.getMesh()
 */
export interface ManifoldMesh {
  /** Number of vertices in the mesh */
  numVert: number;

  /** Number of triangles in the mesh */
  numTri: number;

  /** Vertex properties (positions and optionally normals) as flat array */
  vertProperties: Float32Array;

  /** Triangle vertex indices (3 indices per triangle) */
  triVerts: Uint32Array;

  /** Vertex half-edges (optional topology data) */
  halfedgeTangent?: Float32Array;
}

/**
 * Manifold object interface
 * Represents a 3D manifold with CSG operations
 */
export interface ManifoldObject {
  /** Get the mesh data from this manifold */
  getMesh(): ManifoldMesh;

  /** Get properties like volume, surface area */
  getProperties(): {
    volume: number;
    surfaceArea: number;
  };

  /** Boolean union (add) */
  add(other: ManifoldObject): ManifoldObject;

  /** Boolean difference (subtract) */
  subtract(other: ManifoldObject): ManifoldObject;

  /** Boolean intersection */
  intersect(other: ManifoldObject): ManifoldObject;

  /** Translate the manifold */
  translate(offset: [number, number, number]): ManifoldObject;

  /** Rotate the manifold (angles in degrees) */
  rotate(angles: [number, number, number]): ManifoldObject;

  /** Scale the manifold */
  scale(factors: [number, number, number]): ManifoldObject;

  /** Mirror the manifold across a plane defined by normal */
  mirror(normal: [number, number, number]): ManifoldObject;

  /** Transform with a 4x4 matrix */
  transform(matrix: number[]): ManifoldObject;

  /** Trim by plane */
  trimByPlane(normal: [number, number, number], originOffset: number): ManifoldObject;

  /** Get bounding box */
  boundingBox(): {
    min: [number, number, number];
    max: [number, number, number];
  };

  /** Check if this is a valid manifold */
  isManifold(): boolean;

  /** Get genus (topological property) */
  genus(): number;

  /** Number of triangles */
  numTri(): number;

  /** Number of vertices */
  numVert(): number;
}

/**
 * Manifold constructor interface
 */
export interface ManifoldConstructor {
  /** Create a manifold from mesh data */
  new (mesh: Partial<ManifoldMesh>): ManifoldObject;

  /** Create a cube */
  cube(dimensions: [number, number, number], center?: boolean): ManifoldObject;

  /** Create a sphere */
  sphere(radius: number, circularSegments?: number): ManifoldObject;

  /** Create a cylinder */
  cylinder(height: number, radiusLow: number, radiusHigh?: number, circularSegments?: number, center?: boolean): ManifoldObject;

  /** Create a tetrahedron */
  tetrahedron(): ManifoldObject;

  /** Create convex hull from multiple manifolds */
  hull(manifolds: ManifoldObject[]): ManifoldObject;

  /** Batch boolean operations */
  batchBoolean(manifolds: ManifoldObject[], operation: 'add' | 'subtract' | 'intersect'): ManifoldObject;

  /** Compose multiple manifolds (union) */
  compose(manifolds: ManifoldObject[]): ManifoldObject;
}

/**
 * CrossSection (2D) object interface
 * Used for 2D operations before extrusion
 */
export interface CrossSectionObject {
  /** Get the 2D polygon data */
  getPolygons(): number[][][];

  /** Offset (expand/contract) the cross-section */
  offset(delta: number, joinType?: 'square' | 'round' | 'miter'): CrossSectionObject;

  /** Boolean union */
  add(other: CrossSectionObject): CrossSectionObject;

  /** Boolean difference */
  subtract(other: CrossSectionObject): CrossSectionObject;

  /** Boolean intersection */
  intersect(other: CrossSectionObject): CrossSectionObject;

  /** Translate the cross-section */
  translate(offset: [number, number]): CrossSectionObject;

  /** Rotate the cross-section (angle in degrees) */
  rotate(angle: number): CrossSectionObject;

  /** Scale the cross-section */
  scale(factors: [number, number]): CrossSectionObject;
}

/**
 * CrossSection constructor interface
 */
export interface CrossSectionConstructor {
  /** Create a cross-section from polygons */
  new (polygons: number[][][]): CrossSectionObject;

  /** Create a square cross-section */
  square(dimensions: [number, number], center?: boolean): CrossSectionObject;

  /** Create a circle cross-section */
  circle(radius: number, circularSegments?: number): CrossSectionObject;
}

/**
 * Manifold object with preserved metadata
 * This wraps a Manifold object with OpenSCAD-specific metadata
 */
export interface ManifoldWithMeta {
  /** The manifold object */
  manifold: ManifoldObject;

  /** Metadata preserved through operations */
  metadata: {
    /** RGBA color [0-1] */
    color?: [number, number, number, number];

    /** OpenSCAD modifier */
    modifier?: '#' | '%' | '!' | '*';

    /** Unique object ID */
    objectId?: string;

    /** Source code line number */
    line?: number;

    /** Original operation name (for debugging) */
    operation?: string;
  };
}

/**
 * 2D extrusion parameters
 */
export interface ExtrusionParams {
  /** Height to extrude */
  height: number;

  /** Number of divisions along height */
  nDivisions?: number;

  /** Twist angle in degrees */
  twistDegrees?: number;

  /** Scale factor at top */
  scaleTop?: [number, number];

  /** Center the extrusion vertically */
  center?: boolean;
}

/**
 * Revolution parameters for rotate_extrude
 */
export interface RevolutionParams {
  /** Number of circular segments */
  circularSegments?: number;

  /** Angle to revolve (default 360) */
  revolveDegrees?: number;
}
