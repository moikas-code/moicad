/**
 * Unit tests for @moicad/sdk
 * Geometry creation tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('Geometry Creation', () => {
  let Shape, initManifoldEngine;

  beforeEach(async () => {
    const sdk = await import('../dist/index.js');
    const scad = await import('../dist/scad/index.js');
    Shape = sdk.Shape;
    await scad.initManifoldEngine();
  });

  it('should create basic cube', () => {
    const cube = Shape.cube(10);
    const geometry = cube.getGeometry();
    
    expect(geometry.vertices).toBeDefined();
    expect(geometry.indices).toBeDefined();
    expect(geometry.bounds).toBeDefined();
    expect(geometry.vertices.length).toBeGreaterThan(0);
    expect(geometry.indices.length).toBeGreaterThan(0);
  });

  it('should create sphere', () => {
    const sphere = Shape.sphere(5);
    const geometry = sphere.getGeometry();

    expect(geometry.vertices).toBeDefined();
    expect(geometry.vertices.length).toBeGreaterThan(0);
  });

  it('should create basic square pyramid', () => {
    const pyramid = Shape.pyramid(10);
    const geometry = pyramid.getGeometry();

    expect(geometry.vertices).toBeDefined();
    expect(geometry.indices).toBeDefined();
    expect(geometry.normals).toBeDefined();
    expect(geometry.vertices.length).toBeGreaterThan(0);

    // Check bounds (default: base at Z=0, apex at Z=10)
    expect(geometry.bounds.min[2]).toBeCloseTo(0, 0);
    expect(geometry.bounds.max[2]).toBeCloseTo(10, 0);
  });

  it('should create rectangular pyramid', () => {
    const pyramid = Shape.pyramid([30, 20, 15]);
    const geometry = pyramid.getGeometry();

    expect(geometry.vertices.length).toBeGreaterThan(0);
    expect(geometry.bounds.max[2]).toBeCloseTo(15, 0);

    // Check base dimensions
    expect(geometry.bounds.max[0] - geometry.bounds.min[0]).toBeCloseTo(30, 0);
    expect(geometry.bounds.max[1] - geometry.bounds.min[1]).toBeCloseTo(20, 0);
  });

  it('should create triangular pyramid (tetrahedron)', () => {
    const pyramid = Shape.pyramid(10, { sides: 3 });
    const geometry = pyramid.getGeometry();

    expect(geometry.vertices.length).toBeGreaterThan(0);
    expect(geometry.bounds.max[2]).toBeCloseTo(10, 0);

    // Triangular pyramid should have valid geometry
    expect(geometry.bounds).toBeDefined();
    expect(geometry.indices.length).toBeGreaterThan(0);
  });

  it('should create hexagonal pyramid', () => {
    const pyramid = Shape.pyramid(10, { sides: 6 });
    const geometry = pyramid.getGeometry();

    expect(geometry.vertices.length).toBeGreaterThan(0);
    expect(geometry.bounds.max[2]).toBeCloseTo(10, 0);

    // Hexagonal pyramid should have roughly hexagonal footprint
    const baseWidth = geometry.bounds.max[0] - geometry.bounds.min[0];
    expect(baseWidth).toBeCloseTo(10, 0);
  });

  it('should create centered pyramid', () => {
    const pyramid = Shape.pyramid(20, { center: true });
    const geometry = pyramid.getGeometry();

    // Centered: base at Z=-10, apex at Z=10
    expect(geometry.bounds.min[2]).toBeCloseTo(-10, 0);
    expect(geometry.bounds.max[2]).toBeCloseTo(10, 0);
  });

  it('should throw error for invalid pyramid sides', () => {
    expect(() => Shape.pyramid(10, { sides: 2 })).toThrow();
    expect(() => Shape.pyramid(10, { sides: 1 })).toThrow();
    expect(() => Shape.pyramid(10, { sides: 0 })).toThrow();
  });

  it('should throw error for negative pyramid dimensions', () => {
    expect(() => Shape.pyramid(-5)).toThrow();
    expect(() => Shape.pyramid([10, -5, 10])).toThrow();
    expect(() => Shape.pyramid([10, 10, -5])).toThrow();
  });

  it('should transform pyramid correctly', () => {
    const pyramid = Shape.pyramid(10)
      .translate([5, 0, 0])
      .rotate([45, 0, 0]);
    const geometry = pyramid.getGeometry();

    expect(geometry.vertices.length).toBeGreaterThan(0);
    expect(geometry.bounds).toBeDefined();
  });

  it('should perform boolean operations with pyramid', () => {
    const cube = Shape.cube(20);
    const pyramid = Shape.pyramid(15, { center: true });

    // Test union
    const unionResult = cube.union(pyramid);
    expect(unionResult.getGeometry().vertices.length).toBeGreaterThan(0);

    // Test difference
    const diffResult = cube.subtract(pyramid);
    expect(diffResult.getGeometry().vertices.length).toBeGreaterThan(0);

    // Test intersection
    const intersectResult = cube.intersect(pyramid);
    expect(intersectResult.getGeometry().vertices.length).toBeGreaterThan(0);
  });

  it('should create user example house with pyramid roof', () => {
    // User's desired API: house with pyramid roof
    const house = Shape.cube(20)
      .union(Shape.pyramid([20, 20, 15]).translate([0, 0, 10]));

    const geometry = house.getGeometry();
    expect(geometry.vertices.length).toBeGreaterThan(0);
    expect(geometry.bounds.max[2]).toBeCloseTo(25, 0); // Base (20) + roof (15)
  });

  it('should perform union operation', () => {
    const result = Shape.cube(10).union(Shape.sphere(5));
    const geometry = result.getGeometry();
    
    expect(geometry.vertices.length).toBeGreaterThan(24); // More than just a cube
  });

  it('should apply transforms', () => {
    const cube = Shape.cube(10)
      .translate([5, 5, 5])
      .rotate([45, 0, 0])
      .scale([2, 2, 2]);
    const geometry = cube.getGeometry();
    
    expect(geometry.vertices.length).toBeGreaterThan(0);
  });

  it('should export geometry in correct format', () => {
    const cube = Shape.cube(10);
    const geometry = cube.getGeometry();
    
    expect(geometry).toHaveProperty('vertices');
    expect(geometry).toHaveProperty('indices');
    expect(geometry).toHaveProperty('normals');
    expect(geometry).toHaveProperty('bounds');
    
    expect(geometry.bounds).toHaveProperty('min');
    expect(geometry.bounds).toHaveProperty('max');
  });
});