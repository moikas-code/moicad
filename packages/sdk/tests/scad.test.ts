/**
 * Unit tests for @moicad/sdk
 * OpenSCAD parsing and evaluation tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('OpenSCAD Support', () => {
  let parse, evaluate, initManifoldEngine;

  beforeEach(async () => {
    const scad = await import('../dist/scad/index.js');
    parse = scad.parse;
    evaluate = scad.evaluate;
    initManifoldEngine = scad.initManifoldEngine;
    await initManifoldEngine();
  });

  it('should parse basic OpenSCAD code', () => {
    const result = parse('cube(10);');
    
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.errors).toHaveLength(0);
    expect(result.ast.length).toBeGreaterThan(0);
  });

  it('should handle multiple statements', () => {
    const result = parse('cube(10); sphere(5);');
    
    expect(result.success).toBe(true);
    expect(result.ast.length).toBe(2); // cube and sphere
  });

it('should detect syntax errors', () => {
    const result = parse('cube(10) unknown_function'); // actual syntax error
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should evaluate parsed AST', async () => {
    const parseResult = parse('cube(10);');
    const evalResult = await evaluate(parseResult.ast);
    
    expect(evalResult.success).toBe(true);
    expect(evalResult.geometry).toBeDefined();
    expect(evalResult.geometry.vertices.length).toBeGreaterThan(0);
    expect(evalResult.errors).toHaveLength(0);
  });

  it('should handle evaluation errors', async () => {
    // This would normally fail with a proper error
    const parseResult = parse('cube(10); undefined_function();');
    const evalResult = await evaluate(parseResult.ast);
    
    expect(evalResult.success).toBe(false);
    expect(evalResult.errors.length).toBeGreaterThan(0);
  });

  it('should handle complex expressions', () => {
    const result = parse('union(cube(10), sphere(5));');
    
    expect(result.success).toBe(true);
    expect(result.ast.length).toBeGreaterThan(0);
  });
});