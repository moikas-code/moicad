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