/**
 * Enhanced Error System for @moicad/sdk Runtime
 *
 * Provides:
 * - Categorized error types (SYNTAX, LOGIC, SYSTEM)
 * - Error severity levels (WARNING, ERROR, CRITICAL)
 * - Smart error detection (missing return, wrong exports, etc.)
 * - Adaptive error messages based on context
 * - Actionable suggestions and code examples
 * - Stack trace parsing and code snippet extraction
 */

/**
 * Error category based on user action
 * - SYNTAX: User made a syntax/parsing mistake
 * - LOGIC: User made a logical/semantic mistake
 * - SYSTEM: System/environment issue (WASM crash, timeout, etc.)
 */
export enum ErrorCategory {
  SYNTAX = 'syntax',
  LOGIC = 'logic',
  SYSTEM = 'system',
}

/**
 * Error severity level
 * - WARNING: Non-fatal, execution may continue with caveats
 * - ERROR: Fatal, execution cannot proceed
 * - CRITICAL: System failure requiring intervention
 */
export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Specific error codes (hierarchical: category.specific)
 * Used for:
 * - Programmatic error handling
 * - Analytics and error tracking
 * - Localization/i18n keys
 * - Documentation links
 */
export enum ErrorCode {
  // SYNTAX category
  SYNTAX_PARSE_ERROR = 'syntax.parse_error',
  SYNTAX_INVALID_TOKEN = 'syntax.invalid_token',
  SYNTAX_UNEXPECTED_EOF = 'syntax.unexpected_eof',

  // LOGIC category
  LOGIC_MISSING_EXPORT = 'logic.missing_export',
  LOGIC_MISSING_RETURN = 'logic.missing_return',
  LOGIC_INVALID_EXPORT_TYPE = 'logic.invalid_export_type',
  LOGIC_FORBIDDEN_IMPORT = 'logic.forbidden_import',
  LOGIC_UNDEFINED_VARIABLE = 'logic.undefined_variable',
  LOGIC_NULL_GEOMETRY = 'logic.null_geometry',

  // SYSTEM category
  SYSTEM_RUNTIME_ERROR = 'system.runtime_error',
  SYSTEM_TIMEOUT = 'system.timeout',
  SYSTEM_WASM_CRASH = 'system.wasm_crash',
  SYSTEM_MEMORY_EXCEEDED = 'system.memory_exceeded',
  SYSTEM_NETWORK = 'system.network',
}

/**
 * Enhanced error interface with metadata for smart error handling
 * Includes context information, suggestions, and actionable help
 */
export interface EnhancedError {
  // Core error information
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: ErrorCode;
  message: string;

  // Location information
  line?: number;
  column?: number;

  // Debug context
  stack?: string;
  codeSnippet?: string; // Relevant code context showing the error
  context?: string; // Additional context about what was being executed

  // User help
  suggestion?: string; // Actionable suggestion for fixing
  fixExample?: string; // Code example showing the fix
  documentation?: string; // URL to relevant documentation

  // Internal tracking
  originalError?: Error; // Original error object for debugging
}

/**
 * Detect if a function is missing a return statement
 *
 * Heuristics:
 * 1. Result is undefined
 * 2. Exported value is a function
 * 3. Function body doesn't contain 'return' keyword
 *
 * @param result - The evaluated result from function call
 * @param exportedValue - The exported function value
 * @param code - Original source code (optional, for analysis)
 * @returns true if missing return is likely
 */
export function detectMissingReturn(
  result: any,
  exportedValue: any,
  code?: string
): boolean {
  // Only check if result is actually undefined
  if (result !== undefined) {
    return false;
  }

  // Only check if exported value is a function
  if (typeof exportedValue !== 'function') {
    return false;
  }

  // Check function body for return statement
  try {
    const functionBody = exportedValue.toString();

    // Look for return keyword
    const hasReturnKeyword = /\breturn\b/.test(functionBody);

    if (!hasReturnKeyword) {
      return true; // Function has no return keyword at all
    }

    // Additional check: function might have unreachable return
    // (e.g., return statement after loop that doesn't execute)
    // This is harder to detect accurately, so we use heuristics
    if (code) {
      // Check if code has loops/conditionals that might hide return
      const hasConditionalLogic =
        /if\s*\(|for\s*\(|while\s*\(|switch\s*\(/.test(code);
      if (hasConditionalLogic && !hasReturnKeyword) {
        return true;
      }
    }

    return false;
  } catch {
    // If we can't analyze, assume not missing return
    return false;
  }
}

/**
 * Parse JavaScript error stack trace to extract line and column numbers
 *
 * Handles multiple stack trace formats:
 * - V8 (Chrome, Node.js): "at functionName (file:line:column)"
 * - Firefox: "functionName@file:line:column"
 * - Safari: "functionName@file:line:column"
 *
 * @param error - The error object with stack trace
 * @returns Object with line, column, and full stack
 */
export function parseJavaScriptStack(error: Error): {
  line?: number;
  column?: number;
  stack: string;
} {
  const stack = error.stack || '';

  if (!stack) {
    return { stack };
  }

  const stackLines = stack.split('\n');

  // Find first stack frame that's not internal
  for (const line of stackLines) {
    // Skip internal/node_modules frames
    if (
      line.includes('node_modules') ||
      line.includes('internal/') ||
      line.includes('<anonymous>')
    ) {
      continue;
    }

    // Try V8 format: "at functionName (file:line:column)"
    let match = line.match(/:(\d+):(\d+)\)/);
    if (match) {
      return {
        line: parseInt(match[1]),
        column: parseInt(match[2]),
        stack,
      };
    }

    // Try other formats: "file:line:column"
    match = line.match(/:(\d+):(\d+)/);
    if (match) {
      return {
        line: parseInt(match[1]),
        column: parseInt(match[2]),
        stack,
      };
    }
  }

  return { stack };
}

/**
 * Extract code snippet around a specific line
 *
 * Shows context lines before and after the error line
 * with line numbers and an arrow pointing to the error line
 *
 * @param code - Full source code
 * @param line - Line number (1-indexed)
 * @param contextLines - Number of lines to show before/after (default: 2)
 * @returns Formatted code snippet string
 */
export function extractCodeSnippet(
  code: string,
  line: number,
  contextLines: number = 2
): string {
  const lines = code.split('\n');

  // Validate line number
  if (line < 1 || line > lines.length) {
    return code;
  }

  const startLine = Math.max(0, line - contextLines - 1);
  const endLine = Math.min(lines.length, line + contextLines);

  const snippet = lines
    .slice(startLine, endLine)
    .map((lineContent, idx) => {
      const lineNum = startLine + idx + 1;
      const isErrorLine = lineNum === line;
      const prefix = isErrorLine ? '→ ' : '  ';
      const paddedLineNum = lineNum.toString().padStart(4);

      return `${prefix}${paddedLineNum} | ${lineContent}`;
    })
    .join('\n');

  return snippet;
}

/**
 * Create an adaptive suggestion based on error code and context
 *
 * Returns detailed suggestions for LOGIC errors (user mistakes)
 * and concise messages for SYSTEM errors (environment issues)
 *
 * @param code - Error code enum
 * @param context - Additional context for the suggestion
 * @returns Suggestion string (may include newlines)
 */
export function createSuggestion(
  code: ErrorCode,
  context: {
    exportType?: string;
    functionName?: string;
    importedModule?: string;
    expectedType?: string;
  } = {}
): string {
  switch (code) {
    case ErrorCode.LOGIC_MISSING_RETURN:
      return (
        "Add a 'return' statement before your shape in the function.\n" +
        "Example: return Shape.cube(10);"
      );

    case ErrorCode.LOGIC_MISSING_EXPORT:
      return (
        "Add 'export default' to the line you want to render.\n" +
        "Example: export default Shape.cube(10);"
      );

    case ErrorCode.LOGIC_INVALID_EXPORT_TYPE:
      return (
        `Cannot render ${context.exportType || 'the exported value'}.\n` +
        'Export a Shape, Geometry object, or a function that returns either.'
      );

    case ErrorCode.LOGIC_FORBIDDEN_IMPORT:
      return (
        `Module '${context.importedModule || 'this'}' is not allowed.\n` +
        'Only @moicad/sdk and moicad imports are permitted for security.'
      );

    case ErrorCode.LOGIC_UNDEFINED_VARIABLE:
      return 'This variable is not defined. Check for typos or missing declarations.';

    case ErrorCode.LOGIC_NULL_GEOMETRY:
      return (
        'The shape operation returned null or invalid geometry.\n' +
        'Check that all child shapes are valid before combining them.'
      );

    case ErrorCode.SYSTEM_TIMEOUT:
      return (
        'Code execution exceeded 30 second timeout.\n' +
        'Simplify your geometry or reduce complexity.'
      );

    case ErrorCode.SYSTEM_MEMORY_EXCEEDED:
      return 'Ran out of memory. Try with simpler geometry.';

    case ErrorCode.SYSTEM_WASM_CRASH:
      return (
        'The geometry engine crashed. This is usually due to invalid geometry.\n' +
        'Try with simpler shapes or check for NaN/infinity values.'
      );

    case ErrorCode.SYNTAX_PARSE_ERROR:
      return 'Check your code syntax. Look for missing brackets, parentheses, or semicolons.';

    default:
      return '';
  }
}

/**
 * Create a code example showing how to fix the error
 *
 * Provides copy-paste ready code examples for common mistakes
 *
 * @param code - Error code enum
 * @param context - Additional context (function name, etc.)
 * @returns Code example string
 */
export function createFixExample(
  code: ErrorCode,
  context: { functionName?: string } = {}
): string {
  const fnName = context.functionName || 'loop';

  switch (code) {
    case ErrorCode.LOGIC_MISSING_RETURN:
      return (
        `// ❌ Wrong\nexport default function(t) {\n` +
        `  ${fnName}(t);  // Missing return\n` +
        `}\n\n` +
        `// ✅ Correct\nexport default function(t) {\n` +
        `  return ${fnName}(t);  // Added return\n` +
        `}`
      );

    case ErrorCode.LOGIC_MISSING_EXPORT:
      return (
        `// ❌ Wrong\nimport { Shape } from '@moicad/sdk';\n` +
        `const myCube = Shape.cube(10);\n\n` +
        `// ✅ Correct\nimport { Shape } from '@moicad/sdk';\n` +
        `const myCube = Shape.cube(10);\n` +
        `export default myCube;  // Added export`
      );

    case ErrorCode.LOGIC_INVALID_EXPORT_TYPE:
      return (
        `// ❌ Wrong\nexport default "hello";  // String, not a Shape\n\n` +
        `// ✅ Correct\nimport { Shape } from '@moicad/sdk';\n` +
        `export default Shape.cube(10);  // Shape exported`
      );

    case ErrorCode.LOGIC_FORBIDDEN_IMPORT:
      return (
        `// ❌ Wrong\nimport fs from 'fs';  // Not allowed\n\n` +
        `// ✅ Correct\nimport { Shape } from '@moicad/sdk';\n` +
        `// Use only @moicad/sdk imports`
      );

    default:
      return '';
  }
}

/**
 * Get documentation URL for an error code
 *
 * Links users to relevant documentation for learning more
 *
 * @param code - Error code enum
 * @returns Full documentation URL
 */
export function getDocumentationURL(code: ErrorCode): string {
  const baseURL = 'https://moicad.ai/docs/errors';
  const anchor = code.replace(/\./g, '-');
  return `${baseURL}#${anchor}`;
}

/**
 * Determine error verbosity level based on category
 *
 * Adaptive verbosity:
 * - LOGIC errors: Detailed (user mistakes need help)
 * - SYNTAX errors: Detailed (user mistakes need help)
 * - SYSTEM errors: Concise (environment issues are usually not user's fault)
 *
 * @param category - Error category enum
 * @returns Verbosity level
 */
export function getVerbosityLevel(
  category: ErrorCategory
): 'concise' | 'detailed' {
  switch (category) {
    case ErrorCategory.SYNTAX:
    case ErrorCategory.LOGIC:
      return 'detailed'; // User errors get full help

    case ErrorCategory.SYSTEM:
      return 'concise'; // System errors stay brief

    default:
      return 'detailed';
  }
}

/**
 * Map error code to category
 * Useful for programmatic error handling
 *
 * @param code - Error code enum
 * @returns Error category enum
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  if (code.startsWith('syntax.')) {
    return ErrorCategory.SYNTAX;
  }
  if (code.startsWith('logic.')) {
    return ErrorCategory.LOGIC;
  }
  if (code.startsWith('system.')) {
    return ErrorCategory.SYSTEM;
  }
  return ErrorCategory.SYSTEM; // Default to system for unknown codes
}

/**
 * Create a formatted error message for display
 * Includes category emoji, code, and message
 *
 * @param error - Enhanced error object
 * @returns Formatted error string
 */
export function formatErrorForDisplay(error: EnhancedError): string {
  const categoryEmoji = {
    [ErrorCategory.SYNTAX]: '🔴',
    [ErrorCategory.LOGIC]: '⚠️',
    [ErrorCategory.SYSTEM]: '💥',
  };

  const severityLabel = {
    [ErrorSeverity.WARNING]: 'Warning',
    [ErrorSeverity.ERROR]: 'Error',
    [ErrorSeverity.CRITICAL]: 'Critical Error',
  };

  const emoji = categoryEmoji[error.category] || '❌';
  const severity = severityLabel[error.severity] || 'Error';

  let result = `${emoji} [${error.code}] ${error.message}`;

  if (error.line !== undefined) {
    result += ` (Line ${error.line})`;
  }

  return result;
}
