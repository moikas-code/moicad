/**
 * JavaScript Runtime for @moicad/sdk
 *
 * Executes user JavaScript code in a sandboxed environment.
 * Security features:
 * - Configurable timeout
 * - Memory monitoring
 * - Restricted imports (only moicad modules allowed)
 * - Browser-compatible execution
 *
 * Usage:
 * ```typescript
 * import { evaluateJavaScript } from '@moicad/sdk/runtime';
 *
 * const result = await evaluateJavaScript(`
 *   import { Shape } from '@moicad/sdk';
 *   export default Shape.cube(10);
 * `);
 * ```
 */

import type { Geometry, EvaluateResult } from '../types';
import { Shape } from '../shape';
import * as functional from '../functional';
import { initManifoldEngine } from '../scad/index';

/**
 * Runtime options for JavaScript evaluation
 */
export interface RuntimeOptions {
  /** Execution timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Memory limit in bytes (default: 1GB) */
  memoryLimit?: number;
  /** List of allowed module imports (default: ['@moicad/sdk', 'moicad']) */
  allowedModules?: string[];
  /** Animation time parameter (0.0 to 1.0) - if provided, exported function will be called with this value */
  t?: number;
}

/**
 * Evaluate JavaScript code and return Geometry
 *
 * @param code - User JavaScript code
 * @param options - Runtime options
 * @returns EvaluateResult with geometry or errors
 */
export async function evaluateJavaScript(
  code: string,
  options: RuntimeOptions = {}
): Promise<EvaluateResult> {
  const startTime = performance.now();
  const {
    timeout = 30000,
    memoryLimit = 1024 * 1024 * 1024, // 1GB
    allowedModules = ['@moicad/sdk', 'moicad']
  } = options;

  const errors: any[] = [];

  try {
    // Initialize manifold WASM module before evaluation
    await initManifoldEngine();

    // Create sandboxed module scope with both Shape (fluent API) and functional API
    const moicadModule = {
      Shape,
      ...functional, // Include all functional exports: cube, sphere, translate, etc.
    };

    // Create a virtual module system
    const modules: Record<string, any> = {
      '@moicad/sdk': moicadModule,
      'moicad': moicadModule,
    };

    // Wrap user code in a function with restricted scope
    const transformedCode = transformImports(code, allowedModules);

    // Don't wrap in IIFE - the AsyncFunction itself provides the async scope
    const wrappedCode = `
  const importModule = (name) => {
    if (modules.hasOwnProperty(name)) {
      return modules[name];
    }
    throw new Error('Module "' + name + '" is not allowed. Only ' + JSON.stringify(Object.keys(modules)) + ' can be imported.');
  };

  ${transformedCode}

  if (typeof exports.default === 'undefined') {
    throw new Error('JavaScript code must have a default export (export default ...)');
  }

  return exports.default;
    `;

    // Execute with timeout
    const result = await executeWithAsyncFunction(wrappedCode, modules, timeout);

    // Extract geometry from result
    let geometry: Geometry | null = null;
    let evaluatedResult = result;

    // Check if result is a function (animation support)
    if (typeof result === 'function') {
      // If t parameter is provided, call the function with it
      // Otherwise, call with t=0 for static evaluation
      const tValue = options.t !== undefined ? options.t : 0;
      evaluatedResult = await result(tValue);
    }

    // Now extract geometry from the evaluated result
    if (evaluatedResult instanceof Shape) {
      geometry = evaluatedResult.getGeometry();
    } else if (evaluatedResult && typeof evaluatedResult === 'object' && 'vertices' in evaluatedResult) {
      // Already a Geometry object
      geometry = evaluatedResult as Geometry;
    } else {
      throw new Error(
        `Default export must be a Shape instance, Geometry object, or a function returning either. Got: ${typeof evaluatedResult}`
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
    // Log error in development
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.error('JavaScript evaluation error:', error);
    }

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
 * - import { Shape } from '@moicad/sdk';
 * - import * as moicad from '@moicad/sdk';
 * - import Shape from '@moicad/sdk';
 */
function transformImports(code: string, allowedModules: string[]): string {
  // Exports object to track exported values
  let transformed = 'const exports = {};\n\n';

  // Transform import statements (must come before export transforms)
  let codeWithImports = code
    // Named imports: import { Shape } from '@moicad/sdk';
    .replace(
      /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
      (match, imports, moduleName) => {
        if (!allowedModules.includes(moduleName)) {
          throw new Error(`Import from module "${moduleName}" is not allowed`);
        }
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
    // Namespace imports: import * as moicad from '@moicad/sdk';
    .replace(
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
      (match, name, moduleName) => {
        if (!allowedModules.includes(moduleName)) {
          throw new Error(`Import from module "${moduleName}" is not allowed`);
        }
        return `const ${name} = importModule('${moduleName}');`;
      }
    )
    // Default imports: import Shape from '@moicad/sdk';
    .replace(
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
      (match, name, moduleName) => {
        if (!allowedModules.includes(moduleName)) {
          throw new Error(`Import from module "${moduleName}" is not allowed`);
        }
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
 * Execute using AsyncFunction for Node.js/direct execution
 */
async function executeWithAsyncFunction(
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
 * Additional utilities for JavaScript evaluation
 */
export class JavaScriptRuntime {
  /**
   * Create a runtime instance with custom options
   */
  constructor(private options: RuntimeOptions = {}) {}

  /**
   * Evaluate JavaScript code
   */
  async evaluate(code: string, options: Partial<RuntimeOptions> = {}): Promise<EvaluateResult> {
    const mergedOptions = { ...this.options, ...options };
    return evaluateJavaScript(code, mergedOptions);
  }

  /**
   * Check if a code snippet is safe to evaluate
   */
  validateCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /XMLHttpRequest/,
      /fetch\s*\(/,
      /require\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(`Potentially dangerous code detected: ${pattern.source}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
