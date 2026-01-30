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
import {
  ErrorCategory,
  ErrorSeverity,
  ErrorCode,
  detectMissingReturn,
  parseJavaScriptStack,
  extractCodeSnippet,
  createSuggestion,
  createFixExample,
  getDocumentationURL,
  getErrorCategory,
} from './errors';

/**
 * Runtime options for JavaScript evaluation
 */
export interface RuntimeOptions {
  /** Execution timeout in milliseconds (default: 60000) */
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
    timeout = 60000,
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
    throw new Error('JavaScript code must have a default export.\\n\\nAdd this line at the end of your code:\\n  export default house;\\n\\nOr use the fluent API directly:\\n  export default Shape.cube(20);');
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
    } else if (evaluatedResult === null) {
      throw new Error(
        `Default export returned null. Expected a Shape or Geometry object.`
      );
    } else if (evaluatedResult === undefined) {
      // Check if this is a missing return situation
      if (typeof result === 'function' && detectMissingReturn(evaluatedResult, result, code)) {
        throw new Error(
          `Function doesn't return a value. Add a 'return' statement before your shape.`
        );
      }
      throw new Error(
        `Default export is undefined. Make sure your function returns a Shape or Geometry object.`
      );
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

    // Create enhanced error with smart detection
    let enhancedError: any = {
      message: error.message || 'Unknown error',
      stack: error.stack,
    };

    // Detect specific error types
    if (error.message.includes('export default')) {
      enhancedError.category = ErrorCategory.LOGIC;
      enhancedError.severity = ErrorSeverity.ERROR;
      enhancedError.code = ErrorCode.LOGIC_MISSING_EXPORT;
      enhancedError.suggestion = createSuggestion(ErrorCode.LOGIC_MISSING_EXPORT);
      enhancedError.fixExample = createFixExample(ErrorCode.LOGIC_MISSING_EXPORT);
      enhancedError.documentation = getDocumentationURL(ErrorCode.LOGIC_MISSING_EXPORT);
    } else if (error.message.includes("doesn't return")) {
      const { line, column } = parseJavaScriptStack(error);
      enhancedError.category = ErrorCategory.LOGIC;
      enhancedError.severity = ErrorSeverity.ERROR;
      enhancedError.code = ErrorCode.LOGIC_MISSING_RETURN;
      enhancedError.line = line;
      enhancedError.column = column;
      enhancedError.codeSnippet = line ? extractCodeSnippet(code, line) : undefined;
      enhancedError.suggestion = createSuggestion(ErrorCode.LOGIC_MISSING_RETURN);
      enhancedError.fixExample = createFixExample(ErrorCode.LOGIC_MISSING_RETURN);
      enhancedError.documentation = getDocumentationURL(ErrorCode.LOGIC_MISSING_RETURN);
    } else if (error.message.includes('not allowed')) {
      const moduleMatch = error.message.match(/Module "([^"]+)"/);
      const importedModule = moduleMatch ? moduleMatch[1] : 'this module';
      enhancedError.category = ErrorCategory.LOGIC;
      enhancedError.severity = ErrorSeverity.ERROR;
      enhancedError.code = ErrorCode.LOGIC_FORBIDDEN_IMPORT;
      enhancedError.suggestion = createSuggestion(ErrorCode.LOGIC_FORBIDDEN_IMPORT, { importedModule });
      enhancedError.fixExample = createFixExample(ErrorCode.LOGIC_FORBIDDEN_IMPORT);
      enhancedError.documentation = getDocumentationURL(ErrorCode.LOGIC_FORBIDDEN_IMPORT);
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      enhancedError.category = ErrorCategory.SYSTEM;
      enhancedError.severity = ErrorSeverity.ERROR;
      enhancedError.code = ErrorCode.SYSTEM_TIMEOUT;
      enhancedError.suggestion = createSuggestion(ErrorCode.SYSTEM_TIMEOUT);
      enhancedError.documentation = getDocumentationURL(ErrorCode.SYSTEM_TIMEOUT);
    } else {
      // Generic runtime error
      const { line, column } = parseJavaScriptStack(error);
      enhancedError.category = ErrorCategory.SYSTEM;
      enhancedError.severity = ErrorSeverity.ERROR;
      enhancedError.code = ErrorCode.SYSTEM_RUNTIME_ERROR;
      enhancedError.line = line;
      enhancedError.column = column;
      enhancedError.codeSnippet = line ? extractCodeSnippet(code, line) : undefined;
    }

    errors.push(enhancedError);

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
