/**
 * Manifold-based AST Evaluator
 *
 * Functional, DRY approach to evaluating OpenSCAD AST nodes using manifold-3d.
 * This module provides a clean interface that mirrors the WASM evaluator structure
 * but uses manifold primitives and operations instead.
 */

import type { ManifoldObject, ManifoldWithMeta } from './types';
import { initManifold } from './engine';
import * as Primitives from './primitives';
import * as CSG from './csg';
import * as Transforms from './transforms';
import {
  manifoldToGeometry,
  wrapWithMetadata,
  preserveMetadata,
  mergeMetadata
} from './geometry';
import type { Geometry } from '../../shared/types';

// ============================================================================
// TYPES
// ============================================================================

export interface EvalContext {
  variables: Map<string, any>;
  $fn: number;
  $fa: number;
  $fs: number;
}

export interface EvalParams {
  [key: string]: any;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

export async function ensureManifoldReady(): Promise<void> {
  if (!initialized) {
    await initManifold();
    initialized = true;
  }
}

// ============================================================================
// UTILITY: Fragment Calculation (DRY)
// ============================================================================

/**
 * Calculate fragment count for circular primitives (OpenSCAD spec)
 */
export function calculateFragments(
  radius: number,
  fn: number,
  fs: number,
  fa: number
): number {
  // If $fn is explicitly set and > 0, use it directly
  if (fn > 0) {
    return Math.max(3, Math.floor(fn));
  }

  // Calculate based on $fa and $fs
  const minFragmentsAngle = Math.ceil(360 / fa);
  const circumference = 2 * Math.PI * Math.abs(radius);
  const minFragmentsSize = Math.ceil(circumference / fs);
  const fragments = Math.max(minFragmentsAngle, minFragmentsSize);

  // OpenSCAD minimum: 5 fragments
  return Math.max(5, fragments);
}

// ============================================================================
// UTILITY: Parameter Extraction (DRY)
// ============================================================================

/**
 * Extract a parameter with fallbacks and defaults
 */
export function getParam<T>(
  params: EvalParams,
  names: string[],
  defaultValue: T
): T {
  for (const name of names) {
    if (params[name] !== undefined) {
      return params[name];
    }
  }
  return defaultValue;
}

/**
 * Extract radius from various parameter formats (r, radius, d, diameter)
 */
export function extractRadius(params: EvalParams, defaultValue: number = 1): number {
  return getParam(params, ['_positional', 'r', 'radius'],
    getParam(params, ['d', 'diameter'], defaultValue * 2) / 2
  );
}

/**
 * Extract size parameter (number or array)
 */
export function extractSize(
  params: EvalParams,
  defaultValue: number = 10
): number | [number, number, number] {
  return getParam(params, ['_positional', 'size'], defaultValue);
}

// ============================================================================
// PRIMITIVES (Functional composition)
// ============================================================================

type PrimitiveEvaluator = (params: EvalParams, ctx: EvalContext) => ManifoldObject;

const primitiveEvaluators: Record<string, PrimitiveEvaluator> = {
  cube: (params, ctx) => {
    const size = extractSize(params, 10);
    const center = getParam(params, ['center'], false);
    return Primitives.createCube(size, center);
  },

  sphere: (params, ctx) => {
    const radius = extractRadius(params, 1);
    const fn = getParam(params, ['$fn'], ctx.$fn);
    const segments = calculateFragments(radius, fn, ctx.$fs, ctx.$fa);
    return Primitives.createSphere(radius, segments);
  },

  cylinder: (params, ctx) => {
    const height = getParam(params, ['h', 'height'], 1);
    const r1 = getParam(params, ['r', 'r1', 'radius'], 1);
    const r2 = getParam(params, ['r', 'r2'], r1);
    const center = getParam(params, ['center'], false);
    const fn = getParam(params, ['$fn'], ctx.$fn);
    const segments = calculateFragments(Math.max(r1, r2), fn, ctx.$fs, ctx.$fa);
    return Primitives.createCylinder(height, r1, r2, segments, center);
  },

  cone: (params, ctx) => {
    const height = getParam(params, ['h', 'height'], 1);
    const radius = extractRadius(params, 1);
    const center = getParam(params, ['center'], false);
    const fn = getParam(params, ['$fn'], ctx.$fn);
    const segments = calculateFragments(radius, fn, ctx.$fs, ctx.$fa);
    return Primitives.createCone(height, radius, segments, center);
  },

  circle: (params, ctx) => {
    const radius = extractRadius(params, 1);
    const fn = getParam(params, ['$fn'], ctx.$fn);
    const segments = calculateFragments(radius, fn, ctx.$fs, ctx.$fa);
    return Primitives.createCircle(radius, segments);
  },

  square: (params, ctx) => {
    const size = extractSize(params, 1);
    const center = getParam(params, ['center'], false);
    return Primitives.createSquare(size, center);
  },

  polygon: (params, ctx) => {
    const points = getParam(params, ['points'], []);
    return Primitives.createPolygon(points);
  },

  polyhedron: (params, ctx) => {
    const points = getParam(params, ['points'], []);
    const faces = getParam(params, ['faces', 'triangles'], []);
    return Primitives.createPolyhedron(points, faces);
  },
};

/**
 * Evaluate a primitive node
 */
export function evalPrimitive(
  op: string,
  params: EvalParams,
  ctx: EvalContext
): ManifoldObject {
  const evaluator = primitiveEvaluators[op];
  if (!evaluator) {
    throw new Error(`Unknown primitive: ${op}`);
  }
  return evaluator(params, ctx);
}

// ============================================================================
// TRANSFORMS (Functional composition)
// ============================================================================

type TransformEvaluator = (manifold: ManifoldObject, params: EvalParams, ctx: EvalContext) => ManifoldObject;

const transformEvaluators: Record<string, TransformEvaluator> = {
  translate: (m, params) => {
    const v = getParam(params, ['v', '_positional'], [0, 0, 0]);
    return Transforms.translate(m, v as [number, number, number]);
  },

  rotate: (m, params) => {
    const a = getParam(params, ['a', '_positional'], [0, 0, 0]);
    // Handle scalar rotation (around Z) or vector rotation
    const angles = Array.isArray(a) ? a : [0, 0, a];
    return Transforms.rotate(m, angles as [number, number, number]);
  },

  scale: (m, params) => {
    const v = getParam(params, ['v', '_positional'], [1, 1, 1]);
    const factors = Array.isArray(v) ? v : [v, v, v];
    return Transforms.scale(m, factors as [number, number, number]);
  },

  mirror: (m, params) => {
    const v = getParam(params, ['v', '_positional'], [1, 0, 0]);
    return Transforms.mirror(m, v as [number, number, number]);
  },

  multmatrix: (m, params) => {
    const matrix = getParam(params, ['m', '_positional'], []);
    // Flatten if needed
    const flat = Array.isArray(matrix[0]) ? matrix.flat() : matrix;
    return Transforms.multmatrix(m, flat);
  },

  resize: (m, params) => {
    const newsize = getParam(params, ['newsize', '_positional'], [1, 1, 1]);
    const auto = getParam(params, ['auto'], false);
    return Transforms.resize(m, newsize as [number, number, number], auto);
  },
};

/**
 * Evaluate a transform node
 */
export function evalTransform(
  op: string,
  manifold: ManifoldObject,
  params: EvalParams,
  ctx: EvalContext
): ManifoldObject {
  const evaluator = transformEvaluators[op];
  if (!evaluator) {
    throw new Error(`Unknown transform: ${op}`);
  }
  return evaluator(manifold, params, ctx);
}

// ============================================================================
// BOOLEAN OPERATIONS (Functional composition)
// ============================================================================

type BooleanEvaluator = (manifolds: ManifoldObject[]) => ManifoldObject;

const booleanEvaluators: Record<string, BooleanEvaluator> = {
  union: (manifolds) => CSG.unionMultiple(manifolds),
  difference: (manifolds) => {
    if (manifolds.length === 0) throw new Error('difference requires at least 1 manifold');
    if (manifolds.length === 1) return manifolds[0];
    return CSG.differenceMultiple(manifolds[0], manifolds.slice(1));
  },
  intersection: (manifolds) => CSG.intersectionMultiple(manifolds),
  hull: (manifolds) => CSG.hull(manifolds),
};

/**
 * Evaluate a boolean operation
 */
export function evalBoolean(
  op: string,
  manifolds: ManifoldObject[]
): ManifoldObject {
  const evaluator = booleanEvaluators[op];
  if (!evaluator) {
    throw new Error(`Unknown boolean operation: ${op}`);
  }
  return evaluator(manifolds);
}

// ============================================================================
// METADATA HANDLING (Functional composition)
// ============================================================================

export interface NodeMetadata {
  modifier?: '#' | '%' | '!' | '*';
  color?: [number, number, number, number];
  objectId?: string;
  line?: number;
}

/**
 * Apply metadata to a manifold
 */
export function applyMetadata(
  manifold: ManifoldObject,
  metadata: NodeMetadata
): ManifoldWithMeta {
  return wrapWithMetadata(manifold, metadata);
}

/**
 * Extract metadata from a node
 */
export function extractMetadata(node: any): NodeMetadata {
  return {
    modifier: node.modifier,
    color: node.color,
    objectId: node.id,
    line: node.line,
  };
}

// ============================================================================
// CONVERSION
// ============================================================================

/**
 * Convert manifold to moicad Geometry format
 */
export function toGeometry(manifold: ManifoldObject | ManifoldWithMeta): Geometry {
  if ('manifold' in manifold) {
    // ManifoldWithMeta
    const geo = manifoldToGeometry(manifold.manifold);
    return { ...geo, metadata: manifold.metadata };
  }
  // Plain ManifoldObject
  return manifoldToGeometry(manifold);
}

// ============================================================================
// CONTEXT HELPERS
// ============================================================================

/**
 * Create a default evaluation context
 */
export function createDefaultContext(): EvalContext {
  return {
    variables: new Map(),
    $fn: 0,
    $fa: 12,
    $fs: 2,
  };
}

/**
 * Update context with special variables
 */
export function updateContext(
  ctx: EvalContext,
  variables: Record<string, any>
): EvalContext {
  const newVars = new Map(ctx.variables);
  Object.entries(variables).forEach(([k, v]) => newVars.set(k, v));

  return {
    ...ctx,
    variables: newVars,
    $fn: newVars.get('$fn') ?? ctx.$fn,
    $fa: newVars.get('$fa') ?? ctx.$fa,
    $fs: newVars.get('$fs') ?? ctx.$fs,
  };
}
