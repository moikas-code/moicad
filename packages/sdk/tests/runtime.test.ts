/**
 * Tests for @moicad/sdk runtime module
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { evaluateJavaScript, JavaScriptRuntime, RuntimeOptions } from '../src/runtime/index';
import { Shape } from '../src/shape';

describe('Runtime Module', () => {
  beforeAll(async () => {
    // Ensure manifold is initialized for all tests
    const { initManifoldEngine } = await import('../src/scad/index');
    await initManifoldEngine();
  });

  describe('evaluateJavaScript', () => {
    it('should evaluate simple Shape creation', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.cube(10);
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.geometry?.vertices).toBeDefined();
      expect(result.geometry?.indices).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate functional API', async () => {
      const code = `
        import { cube, sphere, union } from '@moicad/sdk';
        export default union(cube(10), sphere(5));
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.geometry?.vertices.length).toBeGreaterThan(0);
    });

    it('should handle complex operations', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        
        const cube = Shape.cube(10);
        const sphere = Shape.sphere(5).translate([15, 0, 0]);
        const union = cube.union(sphere);
        
        export default union.color('red');
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle import errors gracefully', async () => {
      const code = `
        import { Something } from 'nonexistent-module';
        export default Something();
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('not allowed');
    });

    it('should handle missing default export', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        const cube = Shape.cube(10);
        // No default export
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('must have a default export');
    });

    it('should handle runtime errors', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.nonexistent();
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should respect timeout', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        
        // Simulate long operation with infinite loop
        while (true) {
          // This will never finish
        }
        
        export default Shape.cube(10);
      `;

      const result = await evaluateJavaScript(code, { timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('timeout');
    });
  });

  describe('JavaScriptRuntime Class', () => {
    it('should create runtime with default options', () => {
      const runtime = new JavaScriptRuntime();
      
      expect(runtime).toBeDefined();
    });

    it('should create runtime with custom options', () => {
      const options: RuntimeOptions = {
        timeout: 5000,
        memoryLimit: 512 * 1024 * 1024, // 512MB
        allowedModules: ['@moicad/sdk']
      };

      const runtime = new JavaScriptRuntime(options);
      
      expect(runtime).toBeDefined();
    });

    it('should evaluate code using runtime instance', async () => {
      const runtime = new JavaScriptRuntime();
      
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.sphere(5);
      `;

      const result = await runtime.evaluate(code);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
    });

    it('should merge options correctly', async () => {
      const runtime = new JavaScriptRuntime({ timeout: 5000 });
      
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.cube(10);
      `;

      const result = await runtime.evaluate(code, { timeout: 1000 });

      expect(result.success).toBe(true);
      // The merged timeout should be 1000, not 5000
    });

    describe('validateCode', () => {
      it('should validate safe code', () => {
        const runtime = new JavaScriptRuntime();
        const safeCode = `
          import { Shape } from '@moicad/sdk';
          export default Shape.cube(10);
        `;

        const validation = runtime.validateCode(safeCode);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect dangerous patterns', () => {
        const runtime = new JavaScriptRuntime();
        const dangerousCode = `
          eval("malicious code");
          import { Shape } from '@moicad/sdk';
          export default Shape.cube(10);
        `;

        const validation = runtime.validateCode(dangerousCode);

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors[0]).toContain('eval');
      });

      it('should detect multiple dangerous patterns', () => {
        const runtime = new JavaScriptRuntime();
        const dangerousCode = `
          eval("code");
          fetch("http://evil.com");
          require("fs");
          import { Shape } from '@moicad/sdk';
          export default Shape.cube(10);
        `;

        const validation = runtime.validateCode(dangerousCode);

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(2);
      });
    });
  });

  describe('Import Transformations', () => {
    it('should handle named imports', async () => {
      const code = `
        import { cube, sphere } from '@moicad/sdk';
        export default cube(10);
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
    });

    it('should handle namespace imports', async () => {
      const code = `
        import * as moicad from '@moicad/sdk';
        export default moicad.cube(10);
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
    });

    it('should handle default imports', async () => {
      const code = `
        import Shape from '@moicad/sdk';
        export default Shape.cube(10);
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
    });

    it('should handle mixed imports', async () => {
      const code = `
        import Shape, { cube } from '@moicad/sdk';
        const shape1 = Shape.cube(10);
        const shape2 = cube(5);
        export default shape1.union(shape2);
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
    });
  });

  describe('Geometry Return Types', () => {
    it('should handle Shape return type', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.cube(10);
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
    });

    it('should handle direct Geometry return type', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.cube(10).getGeometry();
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
    });

    it('should reject invalid return types', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        export default "not a geometry";
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('must be a Shape instance or Geometry object');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        export default Shape.cube(-10); // Negative size might cause issues
      `;

      const result = await evaluateJavaScript(code);

      if (!result.success) {
        expect(result.errors[0].message).toBeDefined();
        expect(result.errors[0].line).toBeDefined();
        expect(result.errors[0].column).toBeDefined();
      }
    });

    it('should handle async operations in user code', async () => {
      const code = `
        import { Shape } from '@moicad/sdk';
        
        async function createShape() {
          return Shape.cube(10);
        }
        
        export default await createShape();
      `;

      const result = await evaluateJavaScript(code);

      expect(result.success).toBe(true);
    });
  });
});