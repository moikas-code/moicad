/**
 * Runtime module types for @moicad/sdk
 */

import type { Geometry, EvaluateResult } from '../types';

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
}

/**
 * JavaScript runtime error information
 */
export interface RuntimeError {
  message: string;
  line: number;
  column: number;
  stack?: string;
}

/**
 * Runtime evaluation result with additional metadata
 */
export interface RuntimeEvaluateResult extends EvaluateResult {
  /** Runtime-specific metadata */
  metadata?: {
    memoryUsed?: number;
    timeoutHit?: boolean;
    modulesAccessed?: string[];
  };
}

/**
 * Code validation result
 */
export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Runtime execution context
 */
export interface RuntimeContext {
  /** Available modules */
  modules: Record<string, any>;
  /** Execution options */
  options: RuntimeOptions;
  /** Execution statistics */
  stats: {
    startTime: number;
    memoryBefore?: number;
    memoryAfter?: number;
  };
}

/**
 * Worker message types for browser execution
 */
export interface WorkerMessage {
  type: 'execute' | 'result' | 'error';
  payload?: any;
  modules?: Record<string, any>;
  code?: string;
}

/**
 * Runtime event types
 */
export interface RuntimeEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  timestamp: number;
  data?: any;
}

/**
 * Runtime event handler
 */
export type RuntimeEventHandler = (event: RuntimeEvent) => void;