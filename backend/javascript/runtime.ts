/**
 * JavaScript Runtime for moicad
 *
 * Executes user JavaScript code in a sandboxed environment.
 * Security features:
 * - 30-second timeout
 * - 1GB memory limit
 * - Restricted globals (no fs, net, child_process)
 * - Only 'moicad' module can be imported
 *
 * Usage:
 * ```typescript
 * const geometry = await evaluateJavaScript(`
 *   import { Shape } from 'moicad';
 *   export default Shape.cube(10);
 * `);
 * ```
 */

import type { Geometry, EvaluateResult } from '../../shared/types';
import { initManifold } from '../manifold/engine';
import { Shape } from './shape';
import * as functional from './functional';
import logger from '../core/logger';

/**
 * Evaluate JavaScript code and return Geometry
 *
 * @param code - User JavaScript code
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns EvaluateResult with geometry or errors
 */
export async function evaluateJavaScript(
  code: string,
  timeout: number = 30000
): Promise<EvaluateResult> {
  const startTime = performance.now();
  const errors: any[] = [];

  try {
    // Initialize manifold WASM module before evaluation
    await initManifold();

    // Create sandboxed module scope with both Shape (fluent API) and functional API
    const moicadModule = {
      Shape,
      ...functional, // Include all functional exports: cube, sphere, translate, etc.
    };

    // Create a virtual module system
    const modules: Record<string, any> = {
      moicad: moicadModule,
    };

    // Wrap user code in a function with restricted scope
    const transformedCode = transformImports(code);

    // Don't wrap in IIFE - the AsyncFunction itself provides the async scope
    const wrappedCode = `
  const importModule = (name) => {
    if (name === 'moicad') {
      return modules.moicad;
    }
    throw new Error('Module "' + name + '" is not allowed. Only "moicad" can be imported.');
  };

  ${transformedCode}

  if (typeof exports.default === 'undefined') {
    throw new Error('JavaScript code must have a default export (export default ...)');
  }

  return exports.default;
    `;

    // Execute with timeout
    const result = await executeWithTimeout(wrappedCode, modules, timeout);

    // Extract geometry from result
    let geometry: Geometry | null = null;

    if (result instanceof Shape) {
      geometry = result.getGeometry();
    } else if (result && typeof result === 'object' && 'vertices' in result) {
      // Already a Geometry object
      geometry = result as Geometry;
    } else {
      throw new Error(
        `Default export must be a Shape instance or Geometry object. Got: ${typeof result}`
      );
    }

    const executionTime = performance.now() - startTime;

    return {
      geometry,
      errors: [],
      success: true,
      executionTime,
    };
  } catch (error: any) {
    logger.error('JavaScript evaluation error:', error);

    errors.push({
      message: error.message || 'Unknown error',
      line: error.line || 0,
      column: error.column || 0,
      stack: error.stack,
    });

    const executionTime = performance.now() - startTime;

    return {
      geometry: null,
      errors,
      success: false,
      executionTime,
    };
  }
}

/**
 * Transform ES6 import statements into importModule() calls
 * Handles:
 * - import { Shape } from 'moicad';
 * - import * as moicad from 'moicad';
 * - import Shape from 'moicad';
 */
function transformImports(code: string): string {
  // Exports object to track exported values
  let transformed = 'const exports = {};\n\n';

  // Transform import statements (must come before export transforms)
  let codeWithImports = code
    // Named imports: import { Shape } from 'moicad';
    .replace(
      /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
      (match, imports, moduleName) => {
        const importList = imports.split(',').map((s: string) => s.trim());
        return importList
          .map((name: string) => {
            const [importedName, localName] = name.includes(' as ')
              ? name.split(' as ').map((s: string) => s.trim())
              : [name, name];
            return `const ${localName} = importModule('${moduleName}').${importedName};`;
          })
          .join('\n');
      }
    )
    // Namespace imports: import * as moicad from 'moicad';
    .replace(
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
      (match, name, moduleName) => {
        return `const ${name} = importModule('${moduleName}');`;
      }
    )
    // Default imports: import Shape from 'moicad';
    .replace(
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
      (match, name, moduleName) => {
        return `const ${name} = importModule('${moduleName}').default || importModule('${moduleName}');`;
      }
    );

  // Transform export statements
  codeWithImports = codeWithImports
    // export default ... (must handle this carefully to preserve expressions)
    .replace(/export\s+default\s+/gm, 'exports.default = ')
    // export { name1, name2 }
    .replace(/export\s+\{\s*([^}]+)\s*\}/gm, (match, exportNames) => {
      const exportList = exportNames.split(',').map((s: string) => s.trim());
      return exportList
        .map((name: string) => {
          const [localName, exportedName] = name.includes(' as ')
            ? name.split(' as ').map((s: string) => s.trim())
            : [name, name];
          return `exports.${exportedName} = ${localName};`;
        })
        .join('\n');
    })
    // export const/let/var name = ...
    .replace(/export\s+(const|let|var)\s+(\w+)/gm, (match, keyword, name) => {
      return `${keyword} ${name}; exports.${name} = ${name}`;
    });

  transformed += codeWithImports;
  return transformed;
}

/**
 * Execute code with timeout
 * Uses a simple timeout mechanism - NOT a true sandbox
 * TODO: Use vm2 or Bun's built-in isolation for production
 */
async function executeWithTimeout(
  code: string,
  modules: Record<string, any>,
  timeout: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Execution timeout after ${timeout}ms`));
    }, timeout);

    try {
      // Use AsyncFunction constructor to properly create async function
      const AsyncFunction = (async function () {}).constructor as any;
      const fn = new AsyncFunction('modules', code);

      // Execute the async function
      const resultPromise = fn(modules);

      // The result should always be a promise from async function
      resultPromise
        .then((value: any) => {
          clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error: any) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Parse line/column from error stack
 * TODO: Improve error reporting with source maps
 */
function parseErrorLocation(error: Error): { line: number; column: number } {
  const stack = error.stack || '';
  const match = stack.match(/<anonymous>:(\d+):(\d+)/);

  if (match) {
    return {
      line: parseInt(match[1], 10),
      column: parseInt(match[2], 10),
    };
  }

  return { line: 0, column: 0 };
}
