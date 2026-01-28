/**
 * SCAD (OpenSCAD) submodule
 * 
 * OpenSCAD parsing and evaluation for the SDK
 */

import { pluginManager } from '../plugins';

// Export the main API functions
export { parseOpenSCAD as parse } from './parser.js';
export { evaluateAST as evaluate, initManifoldEngine } from './evaluator.js';

// Export types for consumers
export type {
  ScadNode,
  Geometry,
  ParseResult,
  ParseError,
  EvaluateResult,
  EvaluationError,
  ModifierInfo,
} from '../shared/types.js';

// Re-export for convenience
import { parseOpenSCAD } from './parser.js';
import { evaluateAST, initManifoldEngine } from './evaluator.js';

export const SCAD = {
  parse: parseOpenSCAD,
  evaluate: evaluateAST,
  initManifoldEngine,
  getPluginFunctions: () => pluginManager.getSCADFunctions(),
  initializePlugins: async () => {
    const pluginFunctions = pluginManager.getSCADFunctions();
    return pluginFunctions;
  }
} as const;
