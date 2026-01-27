/**
 * Integration tests for @moicad/sdk
 * Tests integration between different modules
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('Integration Tests', () => {
  let sdk, scad;

  beforeEach(async () => {
    sdk = await import('../dist/index.js');
    scad = await import('../dist/scad/index.js');
    await scad.initManifoldEngine();
  });

  it('should integrate Shape API with SCAD evaluation', async () => {
    // Create geometry with Shape API
    const cube = sdk.Shape.cube(10);
    const shapeGeometry = cube.getGeometry();
    
    // Parse and evaluate equivalent SCAD
    const parseResult = scad.parse('cube(10);');
    const evalResult = await scad.evaluate(parseResult.ast);
    
    // Both should create valid geometry
    expect(shapeGeometry.vertices.length).toBeGreaterThan(0);
    expect(evalResult.geometry.vertices.length).toBeGreaterThan(0);
    
    // Results should be similar (allowing for some coordinate system differences)
    expect(Math.abs(shapeGeometry.vertices.length - evalResult.geometry.vertices.length)).toBeLessThan(100);
  });

  it('should handle complex multi-shape scenarios', async () => {
    // Create complex shape with API
    const complex = sdk.Shape.cube(20)
      .union(sdk.Shape.sphere(8))
      .subtract(sdk.Shape.cylinder(25, 3));
    const apiGeometry = complex.getGeometry();
    
    // Similar with SCAD evaluation
    const scadCode = `
      difference() {
        union() {
          cube(20);
          sphere(8);
        }
        cylinder(25, 3);
      }
    `;
    const parseResult = scad.parse(scadCode);
    const evalResult = await scad.evaluate(parseResult.ast);
    
    expect(apiGeometry.vertices.length).toBeGreaterThan(100);
    expect(evalResult.geometry.vertices.length).toBeGreaterThan(100);
  });

  it('should maintain consistent geometry format', async () => {
    const shapes = [
      sdk.Shape.cube(10),
      sdk.Shape.sphere(5),
      sdk.Shape.union(sdk.Shape.cube(5), sdk.Shape.sphere(3))
    ];
    
    for (const shape of shapes) {
      const geometry = shape.getGeometry();
      
      expect(geometry).toHaveProperty('vertices');
      expect(geometry).toHaveProperty('indices');
      expect(geometry).toHaveProperty('normals');
      expect(geometry).toHaveProperty('bounds');
      expect(geometry.bounds).toHaveProperty('min');
      expect(geometry.bounds).toHaveProperty('max');
    }
  });
});