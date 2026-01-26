/**
 * Test utilities for moicad test suite
 * Provides common helpers for geometry comparison, WASM mocking, and test data generation
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GeometryStats {
  vertexCount: number;
  faceCount: number;
  volume: number;
}

export interface GeometryBounds {
  min: Vec3;
  max: Vec3;
}

export interface TestGeometry {
  vertices: (number[] | undefined)[];
  indices: (number[] | undefined)[];
  normals: (number[] | undefined)[];
  bounds: GeometryBounds;
  stats: GeometryStats;
}

/**
 * Compare two geometries for equality within tolerance
 */
export function compareGeometries(geo1: TestGeometry, geo2: TestGeometry, tolerance: number = 1e-6): boolean {
  // Compare vertex counts
  if (geo1.vertices.length !== geo2.vertices.length) return false;
  
  // Compare index counts
  if (geo1.indices.length !== geo2.indices.length) return false;
  
  // Compare vertices
  for (let i = 0; i < geo1.vertices.length; i++) {
    const v1 = geo1.vertices[i];
    const v2 = geo2.vertices[i];
    if (!v1 || !v2) return false;
    if (Math.abs((v1[0] ?? 0) - (v2[0] ?? 0)) > tolerance ||
        Math.abs((v1[1] ?? 0) - (v2[1] ?? 0)) > tolerance ||
        Math.abs((v1[2] ?? 0) - (v2[2] ?? 0)) > tolerance) {
      return false;
    }
  }
  
  // Compare indices
  for (let i = 0; i < geo1.indices.length; i++) {
    const idx1 = geo1.indices[i];
    const idx2 = geo2.indices[i];
    if (!idx1 || !idx2 || idx1.length !== idx2.length) return false;
    for (let j = 0; j < idx1.length; j++) {
      if (idx1[j] !== idx2[j]) return false;
    }
  }
  
  return true;
}

/**
 * Create mock WASM engine for testing
 */
export function createMockWasmEngine() {
  return {
    create_cube: (size: number) => ({
      vertices: generateCubeVertices(size),
      indices: generateCubeIndices(),
      normals: generateCubeNormals()
    }),
    
    create_sphere: (radius: number) => ({
      vertices: generateSphereVertices(radius),
      indices: generateSphereIndices(),
      normals: generateSphereNormals()
    }),
    
    union: (mesh1: any, mesh2: any) => mockCSGOperation('union', mesh1, mesh2),
    difference: (mesh1: any, mesh2: any) => mockCSGOperation('difference', mesh1, mesh2),
    intersection: (mesh1: any, mesh2: any) => mockCSGOperation('intersection', mesh1, mesh2),
    
    translate: (mesh: any, vec: Vec3) => ({ ...mesh, translated: vec }),
    rotate: (mesh: any, angle: number, axis: Vec3) => ({ ...mesh, rotated: { angle, axis } }),
    scale: (mesh: any, factor: Vec3) => ({ ...mesh, scaled: factor })
  };
}

/**
 * Generate test OpenSCAD code snippets
 */
export const testCodeSnippets = {
  basic_cube: 'cube(10);',
  basic_sphere: 'sphere(5);',
  basic_cylinder: 'cylinder(r=5, h=10);',
  transform_translate: 'translate([10, 0, 0]) cube(5);',
  transform_rotate: 'rotate([45, 0, 0]) cube(10);',
  transform_scale: 'scale([2, 1, 0.5]) cube(5);',
  boolean_union: 'union() { cube(10); sphere(5); }',
  boolean_difference: 'difference() { cube(10); sphere(5); }',
  boolean_intersection: 'intersection() { cube(10); sphere(5); }',
  variable_assignment: 'size = 10; cube(size);',
  function_definition: 'function double(x) = x * 2; cube(double(5));',
  module_definition: 'module box(w, h, d) { cube([w, h, d]); } box(10, 20, 5);',
  conditional_statement: 'if (true) { cube(10); } else { sphere(5); }',
  for_loop: 'for (i = [0:4]) translate([i*10, 0, 0]) cube(5);',
  modifier_debug: '#cube(10);',
  modifier_transparent: '%sphere(5);',
  modifier_root: '!cylinder(3, 8);',
  modifier_disable: '*cube(15);',
  color_red: 'color("red") cube(10);',
  color_hex: 'color("#FF0000") sphere(5);',
  linear_extrude: 'linear_extrude(10) circle(5);',
  rotate_extrude: 'rotate_extrude(360) square([5, 10]);'
};

/**
 * Generate expected geometry stats for basic primitives
 */
export const expectedStats = {
  cube: (size: number): GeometryStats => ({
    vertexCount: 8,
    faceCount: 12,
    volume: Math.pow(size, 3)
  }),
  
  sphere: (radius: number): GeometryStats => ({
    vertexCount: 322, // Default sphere detail
    faceCount: 640,
    volume: (4/3) * Math.PI * Math.pow(radius, 3)
  }),
  
  cylinder: (radius: number, height: number): GeometryStats => ({
    vertexCount: 42, // Default cylinder detail
    faceCount: 80,
    volume: Math.PI * Math.pow(radius, 2) * height
  })
};

/**
 * Helper functions for geometry generation (mock implementations)
 */
function generateCubeVertices(size: number): number[][] {
  const s = size / 2;
  return [
    [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], // bottom
    [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]      // top
  ];
}

function generateCubeIndices(): number[][] {
  return [
    [0, 1, 2], [0, 2, 3], // bottom
    [4, 6, 5], [4, 7, 6], // top
    [0, 4, 5], [0, 5, 1], // front
    [2, 6, 7], [2, 7, 3], // back
    [0, 3, 7], [0, 7, 4], // left
    [1, 5, 6], [1, 6, 2]  // right
  ];
}

function generateCubeNormals(): number[][] {
  return [
    [0, 0, -1], [0, 0, -1], // bottom
    [0, 0, 1], [0, 0, 1],   // top
    [0, -1, 0], [0, -1, 0], // front
    [0, 1, 0], [0, 1, 0],   // back
    [-1, 0, 0], [-1, 0, 0], // left
    [1, 0, 0], [1, 0, 0]    // right
  ];
}

function generateSphereVertices(radius: number): number[][] {
  // Simplified sphere generation for testing
  const vertices: number[][] = [];
  const segments = 20;
  
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    
    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      const x = cosPhi * sinTheta * radius;
      const y = cosTheta * radius;
      const z = sinPhi * sinTheta * radius;
      
      vertices.push([x, y, z]);
    }
  }
  
  return vertices;
}

function generateSphereIndices(): number[][] {
  // Simplified sphere indices for testing
  const indices: number[][] = [];
  const segments = 20;
  
  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const current = lat * (segments + 1) + lon;
      const next = current + segments + 1;
      
      indices.push([current, next, current + 1]);
      indices.push([current + 1, next, next + 1]);
    }
  }
  
  return indices;
}

function generateSphereNormals(): number[][] {
  // For a sphere, normals are just normalized vertex positions
  return generateSphereVertices(1).map(v => {
    if (!v) return [0, 0, 1];
    const vx = v[0] ?? 0;
    const vy = v[1] ?? 0;
    const vz = v[2] ?? 0;
    const length = Math.sqrt(vx*vx + vy*vy + vz*vz);
    return [vx/length, vy/length, vz/length];
  });
}

function mockCSGOperation(operation: string, mesh1: any, mesh2: any): any {
  // Mock CSG operation for testing
  return {
    type: operation,
    operand1: mesh1,
    operand2: mesh2,
    vertices: [...(mesh1?.vertices || []), ...(mesh2?.vertices || [])],
    indices: [...(mesh1?.indices || []), ...(mesh2?.indices || [])]
  };
}

/**
 * Test assertion helpers
 */
export function assertGeometryEquals(actual: TestGeometry, expected: TestGeometry, message?: string) {
  if (!compareGeometries(actual, expected)) {
    throw new Error(message || `Geometry assertion failed. Expected ${expected.vertices.length} vertices, got ${actual.vertices.length}`);
  }
}

export function assertGeometryStats(actual: GeometryStats, expected: GeometryStats, tolerance: number = 0.01) {
  if (Math.abs(actual.vertexCount - expected.vertexCount) > tolerance * expected.vertexCount) {
    throw new Error(`Vertex count mismatch: expected ${expected.vertexCount}, got ${actual.vertexCount}`);
  }
  if (Math.abs(actual.faceCount - expected.faceCount) > tolerance * expected.faceCount) {
    throw new Error(`Face count mismatch: expected ${expected.faceCount}, got ${actual.faceCount}`);
  }
  if (Math.abs(actual.volume - expected.volume) > tolerance) {
    throw new Error(`Volume mismatch: expected ${expected.volume}, got ${actual.volume}`);
  }
}

/**
 * Create mock API responses for testing
 */
export function createMockApiResponse(code: string, success: boolean = true) {
  const geometry = success ? {
    vertices: [],
    indices: [],
    normals: [],
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
    stats: { vertexCount: 0, faceCount: 0, volume: 0 }
  } : null;
  
  return {
    success,
    errors: success ? [] : ['Mock error for testing'],
    geometry,
    executionTime: 42.5
  };
}

export default {
  compareGeometries,
  createMockWasmEngine,
  testCodeSnippets,
  expectedStats,
  assertGeometryEquals,
  assertGeometryStats,
  createMockApiResponse
};