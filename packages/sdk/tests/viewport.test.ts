/**
 * Unit tests for @moicad/sdk  
 * Viewport and rendering tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('Viewport Module', () => {
  let Viewport, ViewportControls, StatsOverlay;

  beforeEach(async () => {
    const viewport = await import('../dist/viewport/index.js');
    Viewport = viewport.Viewport;
    ViewportControls = viewport.ViewportControls;
    StatsOverlay = viewport.StatsOverlay;
  });

  it('should export all viewport components', () => {
    expect(Viewport).toBeDefined();
    expect(ViewportControls).toBeDefined();
    expect(StatsOverlay).toBeDefined();
  });

  it('should create viewport class instance', () => {
    // Mock DOM for testing
    global.document = {
      createElement: (tag) => {
        if (tag === 'div') {
          return {
            style: { setCSSText: () => {} },
            appendChild: () => {},
            removeChild: () => {},
            clientWidth: 800,
            clientHeight: 600
          };
        }
        return {};
      },
      body: { appendChild: () => {} }
    };

    const container = global.document.createElement('div');
    const viewport = new Viewport(container, {
      width: 800,
      height: 600,
      enableStats: true
    });

    expect(viewport).toBeDefined();
    expect(typeof viewport.updateGeometry).toBe('function');
    expect(typeof viewport.getStats).toBe('function');
    expect(typeof viewport.dispose).toBe('function');
  });

  it('should handle geometry updates', () => {
    // Mock DOM
    global.document = {
      createElement: () => ({
        style: { setCSSText: () => {} },
        appendChild: () => {},
        removeChild: () => {},
        clientWidth: 800,
        clientHeight: 600
      }),
      body: { appendChild: () => {} }
    };

    const container = global.document.createElement('div');
    const viewport = new Viewport(container);
    
    const testGeometry = {
      vertices: [0,0,0, 1,0,0, 0,1,0, 0,0,1],
      indices: [0,1,2, 1,2,0],
      normals: [0,0,1, 0,0,1, 0,0,1, 0,0,1],
      bounds: { min: [0,0,0], max: [1,1,1] }
    };

    expect(() => viewport.updateGeometry(testGeometry)).not.toThrow();
    const stats = viewport.getStats();
    expect(stats.geometries).toBeGreaterThan(0);
  });

  it('should handle viewport disposal', () => {
    // Mock DOM
    global.document = {
      createElement: () => ({
        style: { setCSSText: () => {} },
        appendChild: () => {},
        removeChild: () => {},
        clientWidth: 800,
        clientHeight: 600
      }),
      body: { appendChild: () => {} }
    };

    const container = global.document.createElement('div');
    const viewport = new Viewport(container);
    
    expect(() => viewport.dispose()).not.toThrow();
  });
});