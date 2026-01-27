import type {
  ScadNode,
  Geometry,
  EvaluateResult,
  EvaluationError,
  ModifierInfo,
} from "../../shared/types";
import { readTextFile, readTextFileSync, parseSurfaceData } from "../utils/file-utils";
import logger, { logWarn, logInfo, logDebug, logError } from "../core/logger";

// Import manifold-based evaluator (replaces WASM CSG engine)
import {
  ensureManifoldReady,
  evalPrimitive,
  evalTransform,
  evalBoolean,
  toGeometry,
  calculateFragments,
  getParam,
  extractRadius,
  extractSize,
  createDefaultContext,
  updateContext,
  type EvalContext,
  type EvalParams,
} from "../manifold/evaluator";
import type { ManifoldObject } from "../manifold/types";
import * as CSG from "../manifold/csg";
import * as Transforms from "../manifold/transforms";
import * as Extrude from "../manifold/extrude";
import { manifoldToGeometry, parseColor } from "../manifold/geometry";
import * as Ops2D from "../manifold/2d";
import * as Surface from "../manifold/surface";

/**
 * OpenSCAD Evaluator - Executes AST using Manifold CSG engine
 *
 * Migration from WASM BSP-tree to manifold-3d npm package.
 * Benefits: Guaranteed manifold output, robust Boolean operations, better performance.
 */

let manifoldInitialized = false;

export async function initManifoldEngine(): Promise<void> {
  if (!manifoldInitialized) {
    await ensureManifoldReady();
    manifoldInitialized = true;
  }
}

// Legacy compatibility - no-op since we don't use WASM anymore
export async function initWasm(_module: any): Promise<void> {
  await initManifoldEngine();
}

export function setWasmModule(_module: any): void {
  // No-op for backwards compatibility
}

/**
 * Primitive cache to avoid recreating identical geometries
 */
class PrimitiveCache {
  private cache = new Map<string, any>();
  private maxCacheSize = 100;
  private accessOrder: string[] = [];

  private getKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  get(type: string, params: any): any | null {
    const key = this.getKey(type, params);
    if (this.cache.has(key)) {
      // Move to end of access order (LRU)
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      }
      return this.cache.get(key)!;
    }
    return null;
  }

  set(type: string, params: any, geometry: any): void {
    const key = this.getKey(type, params);

    // Remove oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, geometry);
    this.accessOrder.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Global primitive cache instance
const primitiveCache = new PrimitiveCache();

// Fragment calculation is imported from manifold-evaluator (calculateFragments)
// This alias provides backward compatibility with existing code
const getFragments = calculateFragments;

async function evaluateProjection(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  // Parse projection parameters
  const params = evaluateParameters(node.params, context);

  // Check which projection type
  // cut=true: slice at Z=0 plane (cross-section)
  // cut=false: project entire object onto XY plane (shadow)
  const cut = params.cut ?? false;

  // Get child geometry
  const childGeom = await evaluateNode(node.children[0], context);
  if (!childGeom) {
    context.errors.push({ message: "Projection requires child geometry" });
    return null;
  }

  try {
    // Use manifold's project() or slice() based on cut parameter
    let crossSection;
    if (cut) {
      // Cut: slice at Z=0 to get cross-section
      crossSection = Ops2D.slice3Dto2D(childGeom, 0);
    } else {
      // Project: shadow projection onto XY plane
      crossSection = Ops2D.project3Dto2D(childGeom);
    }

    // Extrude the 2D result to a thin 3D shape for display purposes
    // (OpenSCAD projection() returns 2D, but we need 3D for our pipeline)
    const extruded = Ops2D.linearExtrude2D(crossSection, 0.1);
    return extruded;
  } catch (error: any) {
    context.errors.push({
      message: `projection() failed: ${error.message}`,
    });
    // Fallback: return a thin slice of the original geometry
    return childGeom;
  }
}

interface EvaluationContext {
  variables: Map<string, any>;
  functions: Map<string, any>;
  modules: Map<string, any>;
  errors: EvaluationError[];
  children?: ScadNode[];
  includedFiles?: Set<string>;
  evaluationDepth?: number; // Track recursion depth to prevent stack overflow
}

/**
 * Evaluate AST to produce geometry
 */
export async function evaluateAST(
  ast: ScadNode[],
  options?: { previewMode?: boolean; disableParallel?: boolean },
): Promise<EvaluateResult> {
  const startTime = performance.now();
  const context: EvaluationContext = {
    variables: new Map<string, any>([
      ["$fn", 0], // Fragment number (facets)
      ["$fa", 12], // Fragment angle in degrees
      ["$fs", 2], // Fragment size in mm
      ["$t", 0], // Animation time
      ["$children", 0], // Number of children (for modules)
      // Viewport special variables
      ["$vpr", [0, 0, 0]], // Viewport rotation [x, y, z] in degrees
      ["$vpt", [0, 0, 0]], // Viewport translation [x, y, z]
      ["$vpd", 100], // Viewport camera distance
      ["$vpf", 45], // Viewport field of view in degrees
      ["$preview", options?.previewMode ?? true], // Preview mode flag (auto-detected with manual override)
      ["$version", [2021, 1, 0]], // OpenSCAD version
      ["$version_num", 20210100], // OpenSCAD version number
    ]),
    functions: new Map(),
    modules: new Map(),
    errors: [],
    includedFiles: new Set(),
  };

  try {
    // Initialize manifold engine if not already done
    await initManifoldEngine();

    // Single optimized pass: collect definitions and evaluate in one traversal
    const geometries: ManifoldObject[] = [];
    const executableNodes: any[] = [];

    // Check for root modifiers (!) - if found, only evaluate those and ignore others
    const rootModifiers: any[] = [];

    for (const node of ast) {
      // Handle definitions
      if (node.type === "function_def") {
        context.functions.set((node as any).name, node);
        continue; // Skip to evaluation phase
      }
      if (node.type === "module_def") {
        context.modules.set((node as any).name, node);
        continue; // Skip to evaluation phase
      }

      // Check for root modifier
      if (node.type === "modifier" && (node as any).modifier === "!") {
        rootModifiers.push(node);
        continue; // Will be processed separately
      }

      // Collect executable nodes for batch processing
      executableNodes.push(node);
    }

    // If we have root modifiers, only evaluate those and ignore other geometry
    if (rootModifiers.length > 0) {
      for (const modifierNode of rootModifiers) {
        const result = await evaluateNode(modifierNode, context);
        if (result) {
          geometries.push(result);
        }
      }
    } else {
      // Check if parallel evaluation would be beneficial
      // DISABLED: Parallel evaluation is causing hangs - worker communication issue
      // TODO: Fix worker pool initialization and message handling
      if (false && executableNodes.length > 3 && !options?.disableParallel) {
        try {
          // Use parallel evaluation for complex scenes
          const batchResults = await parallelEvaluator.batchEvaluateNodes(
            executableNodes,
            context,
          );
          for (const result of batchResults) {
            if (result) {
              geometries.push(result);
            }
          }
        } catch (error) {
          logWarn("Parallel evaluation failed, falling back to sequential", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Fallback to sequential evaluation
          for (const node of executableNodes) {
            const result = await evaluateNode(node, context);
            if (result) {
              geometries.push(result);
            }
          }
        }
      } else {
        // Sequential evaluation for simple scenes
        for (const node of executableNodes) {
          const result = await evaluateNode(node, context);
          if (result) {
            geometries.push(result);
          }
        }
      }
    }

    // Combine all geometries with union
    if (geometries.length === 0) {
      return {
        geometry: null,
        errors: [{ message: "No geometry generated" }],
        success: false,
        executionTime: performance.now() - startTime,
      };
    }

    // Filter out null/undefined geometries
    const validGeometries = geometries.filter(
      (g): g is ManifoldObject => g !== null && g !== undefined,
    );
    if (validGeometries.length === 0) {
      return {
        geometry: null,
        errors: [{ message: "No valid geometry generated" }],
        success: false,
        executionTime: performance.now() - startTime,
      };
    }

    // Combine geometries using manifold union
    let finalManifold: ManifoldObject;
    if (validGeometries.length === 1) {
      finalManifold = validGeometries[0];
    } else {
      finalManifold = CSG.unionMultiple(validGeometries);
    }

    // Convert manifold geometry to JSON
    const geometry = toGeometry(finalManifold);

    // Memory management: Clear primitive cache if it's getting large
    const cacheStats = primitiveCache.getStats();
    if (cacheStats.size > 50) {
      // Clear if > 50% full
      primitiveCache.clear();
    }

    return {
      geometry,
      errors: context.errors,
      success: context.errors.length === 0,
      executionTime: performance.now() - startTime,
    };
  } catch (err: any) {
    // Clear cache on error too
    primitiveCache.clear();

    return {
      geometry: null,
      errors: [{ message: err.message, stack: err.stack }],
      success: false,
      executionTime: performance.now() - startTime,
    };
  }
}

async function evaluateNode(
  node: ScadNode,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  switch (node.type) {
    case "primitive":
      return evaluatePrimitive(node as any, context);

    case "transform":
      return evaluateTransform(node as any, context);

    case "boolean":
      return evaluateBooleanOp(node as any, context);

    case "for":
      return evaluateForLoop(node as any, context);

    case "intersection_for":
      return evaluateIntersectionFor(node as any, context);

    case "assignment":
      return evaluateAssignment(node as any, context);

    case "if":
      return evaluateIf(node as any, context);

    case "module_call":
      return evaluateModuleCall(node as any, context);

    case "echo":
      return evaluateEcho(node as any, context);

    case "assert":
      return evaluateAssert(node as any, context);

    case "function_def":
    case "module_def":
      // Already handled in first pass
      return null;

    case "import":
      return evaluateImport(node as any, context);

    case "children":
      return await evaluateChildren(node as any, context);

    case "let":
      return evaluateLet(node as any, context);

    case "modifier":
      return evaluateModifier(node as any, context);

    default:
      context.errors.push({ message: `Unknown node type: ${node.type}` });
      return null;
  }
}

async function evaluatePrimitive(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  const params = evaluateParameters(node.params, context);

  // Check cache first
  const cacheKey = node.op;
  let cachedGeometry = primitiveCache.get(cacheKey, params);
  if (cachedGeometry) {
    return cachedGeometry;
  }

  // Build manifold evaluation context from scad context
  const evalCtx: EvalContext = {
    variables: context.variables,
    $fn: context.variables.get("$fn") ?? 0,
    $fa: context.variables.get("$fa") ?? 12,
    $fs: context.variables.get("$fs") ?? 2,
  };

  let geometry: ManifoldObject | null = null;

  try {
    // Use manifold-evaluator for supported primitives
    switch (node.op) {
      case "cube":
      case "sphere":
      case "cylinder":
      case "cone":
      case "circle":
      case "square":
      case "polygon":
      case "polyhedron":
        geometry = evalPrimitive(node.op, params, evalCtx);
        break;

      case "surface": {
        // Surface creates a 3D surface from a heightmap file or data
        const file = params.file ?? params._positional;
        const center = params.center ?? false;
        const invert = params.invert ?? false;
        const convexity = params.convexity ?? 1;

        if (!file) {
          context.errors.push({
            message: "surface() requires a file parameter",
          });
          geometry = evalPrimitive("cube", { size: 10 }, evalCtx);
          break;
        }

        try {
          // Read the surface data file
          const fileContent = await readTextFile(file);
          const { data, width, depth } = Surface.parseSurfaceFile(
            fileContent,
            file.endsWith(".csv") ? "csv" : "space",
          );

          if (data.length === 0 || width === 0 || depth === 0) {
            context.errors.push({
              message: `surface(): Empty or invalid data file: ${file}`,
            });
            geometry = evalPrimitive("cube", { size: 10 }, evalCtx);
            break;
          }

          geometry = Surface.createSurface(data, width, depth, {
            center,
            invert,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          });
        } catch (error: any) {
          context.errors.push({
            message: `surface() failed to load file "${file}": ${error.message}`,
          });
          geometry = evalPrimitive("cube", { size: 10 }, evalCtx);
        }
        break;
      }

      case "text": {
        // Text creates 3D text geometry from a string
        const text_content =
          params.text ?? params.t ?? params._positional ?? "";
        const text_size = params.size ?? params.s ?? 10;
        const text_halign = params.halign ?? "left";
        const text_valign = params.valign ?? "baseline";
        const text_spacing = params.spacing ?? 1;
        const text_direction = params.direction ?? "ltr";
        const text_font = params.font ?? "Liberation Sans";

        try {
          const Text = await import("../manifold/text");
          geometry = await Text.createText(text_content, {
            size: text_size,
            halign: text_halign,
            valign: text_valign,
            spacing: text_spacing,
            direction: text_direction,
            font: text_font,
            $fn: evalCtx.$fn,
          });
        } catch (error: any) {
          context.errors.push({
            message: `text("${text_content}") failed: ${error.message}`,
          });
          geometry = evalPrimitive("cube", { size: text_size }, evalCtx);
        }
        break;
      }

      default:
        context.errors.push({ message: `Unknown primitive: ${node.op}` });
        return null;
    }
  } catch (error: any) {
    context.errors.push({
      message: `Error creating primitive ${node.op}: ${error.message}`,
    });
    return null;
  }

  // Cache the result for future use
  if (geometry) {
    primitiveCache.set(cacheKey, params, geometry);
  }

  return geometry;
}

function handleColor(
  geometry: ManifoldObject,
  params: any,
  context: EvaluationContext,
): ManifoldObject {
  if (!geometry) {
    context.errors.push({ message: "No geometry to color" });
    return geometry;
  }

  // Extract color parameters - can be:
  // 1. Single vector [r, g, b] or [r, g, b, a]
  // 2. Named parameters: c=[r,g,b], or separate r,g,b,a
  // 3. String color name (CSS names, hex colors)

  let colorInfo: [number, number, number, number] | null = null;

  // Handle vector color (most common: color([1,0,0]) or color([1,0,0,0.5]))
  const colorVector = params.c ?? params._positional;
  if (Array.isArray(colorVector)) {
    if (colorVector.length >= 3) {
      colorInfo = [
        Math.max(0, Math.min(1, colorVector[0])),
        Math.max(0, Math.min(1, colorVector[1])),
        Math.max(0, Math.min(1, colorVector[2])),
        colorVector.length >= 4
          ? Math.max(0, Math.min(1, colorVector[3]))
          : 1.0,
      ];
    }
  }
  // Handle separate color components
  else if (
    params.r !== undefined ||
    params.g !== undefined ||
    params.b !== undefined
  ) {
    colorInfo = [
      Math.max(0, Math.min(1, params.r ?? 0)),
      Math.max(0, Math.min(1, params.g ?? 0)),
      Math.max(0, Math.min(1, params.b ?? 0)),
      Math.max(0, Math.min(1, params.a ?? 1.0)),
    ];
  }
  // Handle string color names and hex colors
  else if (typeof params._positional === "string") {
    const colorString = params._positional;
    const parsedColor = parseColor(colorString);
    if (parsedColor) {
      colorInfo = parsedColor;
    } else {
      context.errors.push({
        message: `Invalid color string: "${colorString}". Use CSS color names (red, steelblue) or hex colors (#FF0000, #F00, #FF000080)`,
      });
      return geometry;
    }
  }

  if (!colorInfo) {
    context.errors.push({
      message:
        "Invalid color parameters - expected vector [r,g,b] or [r,g,b,a] or separate r,g,b,a components, or CSS color name/hex string",
    });
    return geometry;
  }

  // Store color information on the geometry object
  // Note: Manifold objects are immutable, so we attach metadata differently
  if (typeof geometry === "object" && geometry !== null) {
    (geometry as any)._color = {
      r: colorInfo[0],
      g: colorInfo[1],
      b: colorInfo[2],
      a: colorInfo[3],
    };
  }

  return geometry;
}

async function evaluateTransform(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  // Handle projection separately - it needs the child geometry directly
  if (node.op === "projection") {
    return evaluateProjection(node, context);
  }

  // Handle extrusion operations separately - they only operate on first child
  if (node.op === "linear_extrude" || node.op === "rotate_extrude") {
    if (!node.children || node.children.length === 0) {
      context.errors.push({ message: `${node.op} requires child geometry` });
      return null;
    }

    const childGeom = await evaluateNode(node.children[0], context);
    if (!childGeom) {
      context.errors.push({
        message: `${node.op} child geometry evaluation failed`,
      });
      return null;
    }

    const params = evaluateParameters(node.params, context);
    const fn = params.$fn ?? context.variables.get("$fn") ?? 0;
    const fs = params.$fs ?? context.variables.get("$fs") ?? 2;
    const fa = params.$fa ?? context.variables.get("$fa") ?? 12;

    try {
      if (node.op === "linear_extrude") {
        const height = params.h ?? params.height ?? 10;
        const twist = params.twist ?? 0;
        const scale_val = params.scale ?? 1;
        const slices = params.slices ?? fn ?? 20;
        return Extrude.linearExtrude(
          childGeom,
          height,
          twist,
          scale_val,
          slices,
        );
      } else {
        // rotate_extrude
        const angle = params.angle ?? 360;
        const segments = params.$fn ?? params.segments ?? 20;
        return Extrude.rotateExtrude(childGeom, angle, segments);
      }
    } catch (error: any) {
      context.errors.push({
        message: `${node.op} failed: ${error.message}`,
      });
      return null;
    }
  }

  // For regular transforms, evaluate and combine all children
  let geometry: ManifoldObject | null = null;
  for (const child of node.children) {
    const childGeom = await evaluateNode(child, context);
    if (childGeom) {
      if (!geometry) {
        geometry = childGeom;
      } else {
        geometry = CSG.union(geometry, childGeom);
      }
    }
  }

  if (!geometry) {
    context.errors.push({ message: `No geometry in transform ${node.op}` });
    return null;
  }

  const params = evaluateParameters(node.params, context);

  try {
    switch (node.op) {
      case "translate": {
        const translate_arr = params.v ?? params._positional ?? [0, 0, 0];
        const tx = Array.isArray(translate_arr)
          ? (translate_arr[0] ?? 0)
          : (params.x ?? 0);
        const ty = Array.isArray(translate_arr)
          ? (translate_arr[1] ?? 0)
          : (params.y ?? 0);
        const tz = Array.isArray(translate_arr)
          ? (translate_arr[2] ?? 0)
          : (params.z ?? 0);
        return Transforms.translate(geometry, [tx, ty, tz]);
      }

      case "rotate": {
        const rot_a = params.a ?? params.angle ?? params._positional ?? 0;
        // Handle array rotation [x, y, z] or scalar rotation around v axis
        if (Array.isArray(rot_a)) {
          return Transforms.rotate(geometry, rot_a as [number, number, number]);
        }
        // Scalar rotation around axis v (default Z)
        const rot_v = params.v ?? [0, 0, 1];
        // For scalar rotation, apply to appropriate axis
        if (rot_v[0] !== 0) return Transforms.rotate(geometry, [rot_a, 0, 0]);
        if (rot_v[1] !== 0) return Transforms.rotate(geometry, [0, rot_a, 0]);
        return Transforms.rotate(geometry, [0, 0, rot_a]);
      }

      case "scale": {
        const s = params.v ?? params._positional;
        let sx: number, sy: number, sz: number;
        if (Array.isArray(s)) {
          sx = s[0] ?? 1;
          sy = s[1] ?? 1;
          sz = s[2] ?? 1;
        } else if (typeof s === "number") {
          sx = sy = sz = s;
        } else {
          sx = params.x ?? 1;
          sy = params.y ?? 1;
          sz = params.z ?? 1;
        }
        return Transforms.scale(geometry, [sx, sy, sz]);
      }

      case "mirror": {
        const mirror_v = params.v ?? params._positional ?? [1, 0, 0];
        return Transforms.mirror(
          geometry,
          mirror_v as [number, number, number],
        );
      }

      case "multmatrix": {
        const matrix = params.m ?? params._positional ?? [];
        // Flatten nested array if needed
        const flat = Array.isArray(matrix[0]) ? matrix.flat() : matrix;
        if (flat.length >= 12) {
          return Transforms.multmatrix(geometry, flat);
        }
        context.errors.push({
          message:
            "multmatrix requires at least 12 elements (4x3 or 4x4 matrix)",
        });
        return geometry;
      }

      case "color":
        return handleColor(geometry, params, context);

      // projection is handled at the start of evaluateTransform

      case "offset": {
        // Offset is primarily a 2D operation
        // For 3D shapes, we project to 2D, apply offset, then extrude back
        const delta = params.r ?? params.delta ?? params._positional ?? 0;
        const chamfer = params.chamfer ?? false;
        const joinType = chamfer ? "miter" : "round";
        const $fn = params.$fn ?? context.variables.get("$fn") ?? 32;

        try {
          // Project 3D geometry to 2D cross-section
          const crossSection = Ops2D.project3Dto2D(geometry);

          // Apply offset to the 2D shape
          const offsetResult = Ops2D.offset2D(
            crossSection,
            delta,
            joinType as "round" | "miter" | "square",
            2.0,
            $fn,
          );

          // Extrude back to thin 3D shape for pipeline compatibility
          // Use a thin extrusion (0.1) as a placeholder
          // In real usage, linear_extrude would be applied after offset
          const extruded = Ops2D.linearExtrude2D(offsetResult, 0.1);
          return extruded;
        } catch (error: any) {
          context.errors.push({
            message: `offset() failed: ${error.message}`,
          });
          return geometry;
        }
      }

      case "resize": {
        const newsize = params.newsize ??
          params.size ??
          params._positional ?? [1, 1, 1];
        const auto = params.auto ?? false;
        const sizeArr = Array.isArray(newsize)
          ? newsize
          : [newsize, newsize, newsize];
        return Transforms.resize(
          geometry,
          sizeArr as [number, number, number],
          auto,
        );
      }

      default:
        context.errors.push({ message: `Unknown transform: ${node.op}` });
        return geometry;
    }
  } catch (error: any) {
    context.errors.push({
      message: `Transform ${node.op} failed: ${error.message}`,
    });
    return geometry;
  }
}

async function evaluateBooleanOp(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  if (node.children.length === 0) {
    return null;
  }

  // Evaluate all children first
  const childGeoms: ManifoldObject[] = [];
  for (const child of node.children) {
    const geom = await evaluateNode(child, context);
    if (geom) {
      childGeoms.push(geom);
    }
  }

  if (childGeoms.length === 0) {
    return null;
  }

  // Preserve color from the first child (main geometry) in boolean operations
  const colorInfo = (childGeoms[0] as any)._color;

  let result: ManifoldObject;

  try {
    switch (node.op) {
      case "union":
        result = CSG.unionMultiple(childGeoms);
        break;
      case "difference":
        if (childGeoms.length === 1) {
          result = childGeoms[0];
        } else {
          result = CSG.differenceMultiple(childGeoms[0], childGeoms.slice(1));
        }
        break;
      case "intersection":
        result = CSG.intersectionMultiple(childGeoms);
        break;
      case "hull":
        result = CSG.hull(childGeoms);
        break;
      case "minkowski":
        // Minkowski sum - requires at least 2 shapes
        if (childGeoms.length < 2) {
          context.errors.push({
            message: "minkowski() requires at least 2 children",
          });
          result = childGeoms[0];
        } else {
          try {
            // Use first two children for minkowski
            result = CSG.minkowski(childGeoms[0], childGeoms[1]);
            // If more children, add them (though unusual for minkowski)
            for (let i = 2; i < childGeoms.length; i++) {
              result = CSG.minkowski(result, childGeoms[i]);
            }
          } catch (error: any) {
            context.errors.push({
              message: `minkowski() failed: ${error.message}`,
            });
            result = childGeoms[0];
          }
        }
        break;
      default:
        context.errors.push({
          message: `Unknown boolean operation: ${node.op}`,
        });
        result = childGeoms[0];
    }
  } catch (error: any) {
    context.errors.push({
      message: `Boolean operation ${node.op} failed: ${error.message}`,
    });
    result = childGeoms[0];
  }

  // Restore color information after boolean operation
  if (colorInfo && typeof result === "object" && result !== null) {
    (result as any)._color = colorInfo;
  }

  return result;
}

async function evaluateForLoop(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  const variable = node.variable;
  const range = node.range;

  let start: number,
    end: number,
    step = 1;

  if (range.length === 2) {
    [start, end] = range;
  } else if (range.length === 3) {
    [start, step, end] = range;
  } else {
    context.errors.push({ message: "Invalid range in for loop" });
    return null;
  }

  const geometries: ManifoldObject[] = [];

  // Create loop range array
  const range_arr: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      range_arr.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      range_arr.push(i);
    }
  }

  // Evaluate body for each iteration
  for (const value of range_arr) {
    context.variables.set(variable, value);

    for (const bodyNode of node.body) {
      const geom = await evaluateNode(bodyNode, context);
      if (geom) {
        geometries.push(geom);
      }
    }
  }

  // Combine geometries with union
  if (geometries.length === 0) {
    return null;
  }

  return CSG.unionMultiple(geometries);
}

async function evaluateIntersectionFor(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  const variable = node.variable;
  const range = node.range;

  let start: number,
    end: number,
    step = 1;

  if (range.length === 2) {
    [start, end] = range;
  } else if (range.length === 3) {
    [start, step, end] = range;
  } else {
    context.errors.push({ message: "Invalid range in intersection_for loop" });
    return null;
  }

  const geometries: ManifoldObject[] = [];

  // Create loop range array
  const range_arr: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      range_arr.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      range_arr.push(i);
    }
  }

  // Evaluate body for each iteration
  for (const value of range_arr) {
    context.variables.set(variable, value);

    for (const bodyNode of node.body) {
      const geom = await evaluateNode(bodyNode, context);
      if (geom) {
        geometries.push(geom);
      }
    }
  }

  // Combine geometries with intersection
  if (geometries.length === 0) {
    return null;
  }

  return CSG.intersectionMultiple(geometries);
}

async function evaluateEcho(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const values = node.values.map((v: any) => {
    const evaluated = evaluateExpression(v, context);
    return evaluated;
  });
  logInfo("ECHO output", { values });
  return null; // Echo doesn't produce geometry
}

async function evaluateAssert(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const condition = evaluateExpression(node.condition, context);
  logDebug("ASSERT condition evaluation", {
    condition: node.condition,
    result: condition,
    type: typeof condition,
    line: node.line,
  });
  if (!condition) {
    const message = node.message
      ? evaluateExpression(node.message, context)
      : "Assertion failed";
    context.errors.push({
      message: `Assert failed: ${message}`,
      line: node.line,
    });
  }
  return null; // Assert doesn't produce geometry
}

async function evaluateChildren(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  // Check if we have children available
  if (!context.children || context.children.length === 0) {
    context.errors.push({
      message:
        "children() called outside of module context or no children available",
    });
    return null;
  }

  // Handle backward compatibility with old parser structure
  const args = node.args || [];

  // Handle different children() syntax patterns
  if (args.length === 0) {
    // children() - return all children combined with union
    const childGeoms: ManifoldObject[] = [];
    for (const child of context.children) {
      const childGeom = await evaluateNode(child, context);
      if (childGeom) {
        childGeoms.push(childGeom);
      }
    }
    if (childGeoms.length === 0) return null;
    return CSG.unionMultiple(childGeoms);
  } else if (args.length === 1) {
    // children(argument) - handle indexing
    const arg = args[0];

    // Evaluate the argument expression
    const evaluatedArg = evaluateExpression(arg, context);

    if (typeof evaluatedArg === "number") {
      const index = Math.floor(evaluatedArg);
      if (
        index >= 0 &&
        index < context.children.length &&
        context.children[index]
      ) {
        return await evaluateNode(context.children[index], context);
      } else {
        context.errors.push({
          message: `children() index ${index} out of range (0-${context.children.length - 1})`,
        });
        return null;
      }
    } else {
      context.errors.push({
        message: "children() argument must evaluate to a number",
      });
      return null;
    }
  }

  // Fallback - return null for unsupported syntax for now
  context.errors.push({
    message:
      "Unsupported children() syntax. Only children() and children(index) are currently supported.",
  });
  return null;
}

async function evaluateLet(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  // Create new scope for let statement (inherits from parent context)
  const letContext: EvaluationContext = {
    variables: new Map(context.variables), // Copy existing variables
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
    includedFiles: context.includedFiles,
  };

  // Evaluate and bind all let variables in the local scope
  const bindings = node.bindings || {};
  for (const [varName, varValue] of Object.entries(bindings)) {
    const evaluatedValue = evaluateExpression(varValue, letContext);
    letContext.variables.set(varName, evaluatedValue);
  }

  // Evaluate body statements within the let scope
  const geometries: ManifoldObject[] = [];
  for (const bodyNode of node.body || []) {
    const geom = await evaluateNode(bodyNode, letContext);
    if (geom) {
      geometries.push(geom);
    }
  }

  // Combine geometries with union (if multiple)
  if (geometries.length === 0) {
    return null;
  }

  return CSG.unionMultiple(geometries);
}

async function evaluateModifier(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  const modifier = node.modifier as "!" | "#" | "%" | "*";

  switch (modifier) {
    case "!": {
      // Root modifier - show only this and children, ignore everything else
      // Evaluate the child normally - root filtering is handled at the AST level
      const childGeometry = await evaluateNode(node.child, context);
      return childGeometry;
    }

    case "#": {
      // Debug modifier - highlight in red
      // Evaluate child and mark for red highlighting in frontend
      const childGeometry = await evaluateNode(node.child, context);
      if (childGeometry) {
        // Store modifier metadata on the manifold object
        (childGeometry as any)._modifier = "#";
      }
      return childGeometry;
    }

    case "%": {
      // Transparent modifier - show as transparent
      // Evaluate child and mark for transparency in frontend
      const childGeometry = await evaluateNode(node.child, context);
      if (childGeometry) {
        // Store modifier metadata on the manifold object
        (childGeometry as any)._modifier = "%";
      }
      return childGeometry;
    }

    case "*": {
      // Disable modifier - ignore in preview (completely skip)
      // Simply return null to exclude this geometry
      return null;
    }

    default:
      context.errors.push({ message: `Unknown modifier: ${modifier}` });
      return null;
  }
}

async function evaluateAssignment(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const value = evaluateExpression(node.value, context);
  context.variables.set(node.name, value);
  return null; // Assignments don't produce geometry
}

async function evaluateIf(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  const condition = evaluateExpression(node.condition, context);

  // Evaluate condition as boolean
  const isTrue = Boolean(condition);

  const bodyToEvaluate = isTrue ? node.thenBody : node.elseBody || [];

  // Evaluate body and collect geometries
  const geometries: ManifoldObject[] = [];
  for (const bodyNode of bodyToEvaluate) {
    const geom = await evaluateNode(bodyNode, context);
    if (geom) {
      geometries.push(geom);
    }
  }

  // Combine geometries with union
  if (geometries.length === 0) {
    return null;
  }

  return CSG.unionMultiple(geometries);
}

async function evaluateModuleCall(
  node: any,
  context: EvaluationContext,
): Promise<ManifoldObject | null> {
  // Handle built-in surface as special case
  if (node.name === "surface") {
    // Surface is parsed as module_call but should be handled as primitive
    // Convert to primitive node for evaluation
    const primitiveNode = {
      type: "primitive",
      op: "surface",
      params: node.params,
      children: node.children,
      line: node.line,
      column: node.column,
    };
    return await evaluatePrimitive(primitiveNode, context);
  }

  // Handle render() explicitly
  if (node.name === "render") {
    // Evaluating render() - just pass through regular evaluation of children
    // In a full implementation we might force caching here
    if (!node.children || node.children.length === 0) return null;

    // Union all children like a regular group
    const childGeoms: ManifoldObject[] = [];
    for (const child of node.children) {
      const childGeom = await evaluateNode(child, context);
      if (childGeom) {
        childGeoms.push(childGeom);
      }
    }
    if (childGeoms.length === 0) return null;
    return CSG.unionMultiple(childGeoms);
  }

  // Handle built-in extrusion operations as special cases
  if (node.name === "linear_extrude" || node.name === "rotate_extrude") {
    if (!node.children || node.children.length === 0) {
      context.errors.push({ message: `${node.name} requires child geometry` });
      return null;
    }

    const childGeom = await evaluateNode(node.children[0], context);
    if (!childGeom) {
      context.errors.push({
        message: `${node.name} child geometry evaluation failed`,
      });
      return null;
    }

    const params = evaluateParameters(node.params, context);

    try {
      if (node.name === "linear_extrude") {
        const height = params.h ?? params.height ?? 10;
        const twist = params.twist ?? 0;
        const scale_val = params.scale ?? 1;
        const slices = params.slices ?? params.$fn ?? 20;
        return Extrude.linearExtrude(
          childGeom,
          height,
          twist,
          scale_val,
          slices,
        );
      } else {
        // rotate_extrude
        const angle = params.angle ?? 360;
        const segments = params.$fn ?? params.segments ?? 20;
        return Extrude.rotateExtrude(childGeom, angle, segments);
      }
    } catch (error: any) {
      context.errors.push({
        message: `${node.name} failed: ${error.message}`,
      });
      return null;
    }
  }

  const moduleDef = context.modules.get(node.name);
  if (!moduleDef) {
    context.errors.push({ message: `Unknown module: ${node.name}` });
    return null;
  }

  // Create new scope for module execution
  const moduleContext: EvaluationContext = {
    variables: new Map(context.variables),
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
    children: node.children || [],
    includedFiles: context.includedFiles,
  };

  // Bind parameters
  const params = evaluateParameters(node.params, context);

  // Handle positional parameters
  if (params._positional !== undefined) {
    // Map positional parameter to first module parameter
    if (moduleDef.params.length > 0) {
      moduleContext.variables.set(moduleDef.params[0], params._positional);
    }
  }

  // Handle named parameters
  for (const [key, value] of Object.entries(params)) {
    if (key !== "_positional") {
      moduleContext.variables.set(key, value);
    }
  }

  // Set $children variable for access to children count
  moduleContext.variables.set("$children", (node.children || []).length);

  // Evaluate module body
  const geometries: ManifoldObject[] = [];
  for (const bodyNode of moduleDef.body) {
    const geom = await evaluateNode(bodyNode, moduleContext);
    if (geom) {
      geometries.push(geom);
    }
  }

  // Combine geometries with union
  if (geometries.length === 0) {
    return null;
  }

  return CSG.unionMultiple(geometries);
}

function evaluateExpression(expr: any, context: EvaluationContext): any {
  if (expr === null || expr === undefined) {
    return null;
  }

  // Safety: Check recursion depth to prevent stack overflow
  const depth = (context.evaluationDepth || 0) + 1;
  const MAX_DEPTH = 100; // OpenSCAD-style limit

  if (depth > MAX_DEPTH) {
    context.errors.push({
      message: `Expression evaluation too deep (limit: ${MAX_DEPTH}). Possible infinite recursion.`,
    });
    return null;
  }

  // Create child context with incremented depth
  const childContext = { ...context, evaluationDepth: depth };

  let result: any;

  try {
    // Handle expression nodes
    if (typeof expr === "object" && expr.type) {
      switch (expr.type) {
        case "expression":
          result = evaluateBinaryExpression(expr, childContext);
          break;

        case "ternary":
          const condition = evaluateExpression(expr.condition, childContext);
          result = Boolean(condition)
            ? evaluateExpression(expr.thenExpr, childContext)
            : evaluateExpression(expr.elseExpr, childContext);
          break;

        case "function_call":
          result = evaluateFunctionCall(expr, childContext);
          break;

        case "variable":
          result = context.variables.get(expr.name);
          if (result === undefined) {
            // Variable not found - return undefined (OpenSCAD behavior)
            result = undefined;
          }
          break;

        case "list_comprehension":
          result = evaluateListComprehensionExpression(expr, childContext);
          break;

        default:
          result = expr;
          break;
      }
    } else if (
      typeof expr === "number" ||
      typeof expr === "boolean" ||
      typeof expr === "string"
    ) {
      // Handle primitive values
      result = expr;
    } else if (Array.isArray(expr)) {
      // Handle arrays - recursively evaluate each element
      result = expr.map((e) => evaluateExpression(e, childContext));
    } else if (typeof expr === "string" && context.variables.has(expr)) {
      // Handle variable references (legacy parser format)
      result = context.variables.get(expr);
    } else {
      result = expr;
    }
  } catch (error: any) {
    // Safety: Catch any unexpected errors during evaluation
    context.errors.push({
      message: `Error evaluating expression: ${error.message}`,
    });
    return null;
  }

  return result;
}

function evaluateBinaryExpression(expr: any, context: EvaluationContext): any {
  const operator = expr.operator;

  // Unary operators (optimized - no recursion)
  if (!expr.right && expr.left !== undefined) {
    const left = evaluateExpression(expr.left, context);
    switch (operator) {
      case "!":
        return !left;
      case "-":
        return -left;
      default:
        return left;
    }
  }

  // Binary operators with optimized evaluation for common cases
  const left = evaluateExpression(expr.left, context);
  const right = evaluateExpression(expr.right, context);

  // Fast path for numeric operations (most common)
  if (typeof left === "number" && typeof right === "number") {
    switch (operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "%":
        return left % right;
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "<":
        return left < right;
      case ">":
        return left > right;
      case "<=":
        return left <= right;
      case ">=":
        return left >= right;
      case "&&":
        return left && right;
      case "||":
        return left || right;
      default:
        break;
    }
  }

  // Fallback to original logic for complex expressions
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    case "%":
      return left % right;
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case "<":
      return left < right;
    case ">":
      return left > right;
    case "<=":
      return left <= right;
    case ">=":
      return left >= right;
    case "&&":
      return left && right;
    case "||":
      return left || right;
    default:
      return null;
  }
}

function evaluateFunctionCall(call: any, context: EvaluationContext): any {
  const funcDef = context.functions.get(call.name);
  if (!funcDef) {
    // Try built-in functions
    switch (call.name) {
      case "abs":
        return Math.abs(evaluateExpression(call.args[0], context));
      case "ceil":
        return Math.ceil(evaluateExpression(call.args[0], context));
      case "floor":
        return Math.floor(evaluateExpression(call.args[0], context));
      case "round":
        return Math.round(evaluateExpression(call.args[0], context));
      case "sqrt":
        return Math.sqrt(evaluateExpression(call.args[0], context));
      case "sin":
        return mathOptimizer.sin(evaluateExpression(call.args[0], context));
      case "cos":
        return mathOptimizer.cos(evaluateExpression(call.args[0], context));
      case "tan":
        return mathOptimizer.tan(evaluateExpression(call.args[0], context));
      case "min":
        return Math.min(
          ...call.args.map((a: any) => evaluateExpression(a, context)),
        );
      case "max":
        return Math.max(
          ...call.args.map((a: any) => evaluateExpression(a, context)),
        );
      case "pow":
        return Math.pow(
          evaluateExpression(call.args[0], context),
          evaluateExpression(call.args[1], context),
        );
      case "len": {
        const arg = evaluateExpression(call.args[0], context);
        return Array.isArray(arg) ? arg.length : 0;
      }

      // Additional trigonometric functions
      case "asin":
        return (
          (Math.asin(evaluateExpression(call.args[0], context)) * 180) / Math.PI
        );
      case "acos":
        return (
          (Math.acos(evaluateExpression(call.args[0], context)) * 180) / Math.PI
        );
      case "atan":
        return (
          (Math.atan(evaluateExpression(call.args[0], context)) * 180) / Math.PI
        );
      case "atan2":
        return (
          (Math.atan2(
            evaluateExpression(call.args[0], context),
            evaluateExpression(call.args[1], context),
          ) *
            180) /
          Math.PI
        );

      // Exponential and logarithmic functions
      case "exp":
        return Math.exp(evaluateExpression(call.args[0], context));
      case "log":
        return Math.log10(evaluateExpression(call.args[0], context));
      case "ln":
        return Math.log(evaluateExpression(call.args[0], context));

      // Sign function
      case "sign":
        return Math.sign(evaluateExpression(call.args[0], context));

      // Vector functions
      case "norm": {
        const vec = evaluateExpression(call.args[0], context);
        if (!Array.isArray(vec)) return 0;
        return Math.sqrt(
          vec.reduce((sum: number, v: number) => sum + v * v, 0),
        );
      }
      case "cross": {
        const v1 = evaluateExpression(call.args[0], context);
        const v2 = evaluateExpression(call.args[1], context);
        if (
          !Array.isArray(v1) ||
          !Array.isArray(v2) ||
          v1.length !== 3 ||
          v2.length !== 3
        ) {
          context.errors.push({ message: "cross() requires two 3D vectors" });
          return null;
        }
        return [
          v1[1] * v2[2] - v1[2] * v2[1],
          v1[2] * v2[0] - v1[0] * v2[2],
          v1[0] * v2[1] - v1[1] * v2[0],
        ];
      }

      // Array functions
      case "concat": {
        const arrays = call.args.map((a: any) =>
          evaluateExpression(a, context),
        );
        return arrays.flat();
      }

      // Search and Lookup
      case "search": {
        const matchVal = evaluateExpression(call.args[0], context);
        const vector = evaluateExpression(call.args[1], context);
        const numReturns =
          call.args.length > 2 ? evaluateExpression(call.args[2], context) : 1;
        const matchType =
          call.args.length > 3 ? evaluateExpression(call.args[3], context) : 0;
        return performSearch(matchVal, vector, numReturns, matchType);
      }

      case "lookup": {
        const key = evaluateExpression(call.args[0], context);
        const table = evaluateExpression(call.args[1], context);
        return performLookup(key, table);
      }

      case "rands": {
        const minVal = evaluateExpression(call.args[0], context);
        const maxVal = evaluateExpression(call.args[1], context);
        const count = evaluateExpression(call.args[2], context);
        const seed =
          call.args.length > 3
            ? evaluateExpression(call.args[3], context)
            : undefined;
        return performRands(minVal, maxVal, count, seed);
      }

      // String functions
      case "str": {
        return call.args
          .map((a: any) => {
            const val = evaluateExpression(a, context);
            return String(val);
          })
          .join("");
      }
      case "chr": {
        const code = evaluateExpression(call.args[0], context);
        return String.fromCharCode(code);
      }
      case "ord": {
        const str = String(evaluateExpression(call.args[0], context));
        return str.length > 0 ? str.charCodeAt(0) : 0;
      }

      case "children": {
        // children() as function call - delegate to evaluateChildren
        const childrenNode = {
          type: "children",
          args: call.args || [],
          line: call.line,
        };
        return evaluateChildren(childrenNode, context);
      }

      default:
        context.errors.push({ message: `Unknown function: ${call.name}` });
        return null;
    }
  }

  // User-defined function
  const funcContext: Map<string, any> = new Map(context.variables);

  // Bind arguments to parameters
  const evaluatedArgs = call.args.map((arg: any) =>
    evaluateExpression(arg, context),
  );
  funcDef.params.forEach((param: string, idx: number) => {
    funcContext.set(param, evaluatedArgs[idx]);
  });

  // Create temporary context for function evaluation
  const tempContext: EvaluationContext = {
    variables: funcContext,
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
    includedFiles: context.includedFiles,
  };

  return evaluateExpression(funcDef.expression, tempContext);
}

function evaluateParameters(
  params: Record<string, any>,
  context: EvaluationContext,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    try {
      result[key] = evaluateValue(value, context);
    } catch (error: any) {
      // Safety: Catch parameter evaluation errors
      context.errors.push({
        message: `Error evaluating parameter '${key}': ${error.message}`,
      });
      result[key] = null;
    }
  }

  return result;
}

function evaluateValue(value: any, context: EvaluationContext): any {
  // Use the comprehensive expression evaluator
  return evaluateExpression(value, context);
}

/**
 * Memory-efficient geometry conversion with typed array reuse
 */
class GeometryConverter {
  private vertexCache: Float32Array = new Float32Array(1024);
  private indexCache: Uint32Array = new Uint32Array(1536); // Typically 1.5x vertices
  private normalCache: Float32Array = new Float32Array(1024);

  convertWasmGeometry(wasmGeom: any): Geometry {
    const vertexCount = wasmGeom.vertex_count
      ? wasmGeom.vertex_count()
      : wasmGeom.vertexCount();
    const indexCount = wasmGeom.face_count
      ? wasmGeom.face_count()
      : wasmGeom.faceCount();
    const normalCount = vertexCount;

    // Resize caches if needed
    this.resizeCaches(vertexCount, indexCount, normalCount);

    // Use efficient copy methods if available, fallback to array getters
    if (wasmGeom.copy_vertices_to_buffer && false) {
      // Temporarily disabled
      wasmGeom.copy_vertices_to_buffer(this.vertexCache, vertexCount);
      wasmGeom.copy_indices_to_buffer(this.indexCache, indexCount);
      wasmGeom.copy_normals_to_buffer(this.normalCache, normalCount);
    } else {
      // Fallback to original method
      return this.convertFallback(wasmGeom);
    }

    // Convert to plain arrays for JSON serialization
    const geometry: Geometry = {
      vertices: Array.from(this.vertexCache.slice(0, vertexCount * 3)),
      indices: Array.from(this.indexCache.slice(0, indexCount)),
      normals: Array.from(this.normalCache.slice(0, normalCount * 3)),
      bounds: wasmGeom.bounds,
      stats: {
        vertexCount: vertexCount,
        faceCount: indexCount / 3,
      },
    };

    // Add modifier information if present
    if (wasmGeom._modifier) {
      geometry.modifier = { type: wasmGeom._modifier as "!" | "#" | "%" | "*" };
    }

    // Add color information if present
    if (wasmGeom._color) {
      geometry.color = wasmGeom._color;
    }

    return geometry;
  }

  private resizeCaches(
    vertexCount: number,
    indexCount: number,
    normalCount: number,
  ) {
    if (this.vertexCache.length < vertexCount * 3) {
      this.vertexCache = new Float32Array(Math.ceil(vertexCount * 3 * 1.5));
    }
    if (this.indexCache.length < indexCount) {
      this.indexCache = new Uint32Array(Math.ceil(indexCount * 1.5));
    }
    if (this.normalCache.length < normalCount * 3) {
      this.normalCache = new Float32Array(Math.ceil(normalCount * 3 * 1.5));
    }
  }

  private calculateBounds(vertices: number[]): {
    min: [number, number, number];
    max: [number, number, number];
  } {
    if (vertices.length === 0) {
      return {
        min: [0, 0, 0],
        max: [0, 0, 0],
      };
    }

    let minX = vertices[0] || 0,
      minY = vertices[1] || 0,
      minZ = vertices[2] || 0;
    let maxX = vertices[0] || 0,
      maxY = vertices[1] || 0,
      maxZ = vertices[2] || 0;

    for (let i = 3; i < vertices.length; i += 3) {
      const x = vertices[i] || 0;
      const y = vertices[i + 1] || 0;
      const z = vertices[i + 2] || 0;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);

      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
  }

  private convertFallback(wasmGeom: any): Geometry {
    const vertices =
      wasmGeom.vertices instanceof Float32Array
        ? Array.from(wasmGeom.vertices)
        : Array.isArray(wasmGeom.vertices)
          ? wasmGeom.vertices
          : (Object.values(wasmGeom.vertices) as number[]);

    const indices =
      wasmGeom.indices instanceof Uint32Array
        ? Array.from(wasmGeom.indices)
        : Array.isArray(wasmGeom.indices)
          ? wasmGeom.indices
          : (Object.values(wasmGeom.indices) as number[]);

    const normals =
      wasmGeom.normals instanceof Float32Array
        ? Array.from(wasmGeom.normals)
        : Array.isArray(wasmGeom.normals)
          ? wasmGeom.normals
          : (Object.values(wasmGeom.normals) as number[]);

    // Calculate stats from arrays
    const vertexCount = vertices.length / 3;
    const faceCount = indices.length / 3;

    // Calculate bounds from vertices
    const bounds = this.calculateBounds(vertices);

    const geometry: Geometry = {
      vertices: vertices as number[],
      indices: indices as number[],
      normals: normals as number[],
      bounds,
      stats: {
        vertexCount,
        faceCount,
      },
    };

    // Add modifier information if present
    if (wasmGeom._modifier) {
      geometry.modifier = { type: wasmGeom._modifier as "!" | "#" | "%" | "*" };
    }

    // Add color information if present
    if (wasmGeom._color) {
      geometry.color = wasmGeom._color;
    }

    return geometry;
  }
}

// Global converter instance for reuse
const geometryConverter = new GeometryConverter();

/**
 * Expression memoization cache for faster repeated evaluations
 */
class ExpressionMemoizer {
  private cache = new Map<string, any>();
  private maxCacheSize = 1000;

  private getExpressionKey(expr: any, context: EvaluationContext): string {
    // Create hash from expression structure and variable values
    const exprHash = this.hashExpression(expr);
    const contextHash = this.hashContext(context);
    return `${exprHash}:${contextHash}`;
  }

  private hashExpression(expr: any): string {
    if (expr === null || expr === undefined) return "null";
    if (
      typeof expr === "number" ||
      typeof expr === "boolean" ||
      typeof expr === "string"
    ) {
      return `${typeof expr}:${expr}`;
    }
    if (Array.isArray(expr)) {
      return `arr:${expr.map((e) => this.hashExpression(e)).join(",")}`;
    }
    if (typeof expr === "object" && expr.type) {
      return `${expr.type}:${this.hashExpression(expr.left)}:${this.hashExpression(expr.right)}`;
    }
    return `obj:${JSON.stringify(expr)}`;
  }

  private hashContext(context: EvaluationContext): string {
    // Hash only variable names and values that might affect expression
    const vars = Array.from(context.variables.entries())
      .filter(
        ([name, value]) =>
          typeof value === "number" || typeof value === "boolean",
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 10); // Limit to first 10 variables for performance
    return vars.map(([name, value]) => `${name}:${value}`).join("|");
  }

  get(expr: any, context: EvaluationContext): any | null {
    const key = this.getExpressionKey(expr, context);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    return null;
  }

  set(expr: any, context: EvaluationContext, result: any): void {
    const key = this.getExpressionKey(expr, context);

    // LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Global expression memoizer
const expressionMemoizer = new ExpressionMemoizer();

/**
 * Math function memoizer for expensive trigonometric calculations
 */
class MathOptimizer {
  private sinCache = new Map<number, number>();
  private cosCache = new Map<number, number>();
  private tanCache = new Map<number, number>();
  private readonly DEG_TO_RAD = Math.PI / 180;
  private readonly maxCacheSize = 360; // Cache all degree values 0-359

  sin(degrees: number): number {
    // Normalize degrees to 0-359 range for cache efficiency
    const normalizedDegrees = ((degrees % 360) + 360) % 360;

    if (!this.sinCache.has(normalizedDegrees)) {
      const radians = normalizedDegrees * this.DEG_TO_RAD;
      const result = Math.sin(radians);

      // Cache with LRU eviction if full
      if (this.sinCache.size >= this.maxCacheSize) {
        const firstKey = this.sinCache.keys().next().value;
        if (firstKey !== undefined) {
          this.sinCache.delete(firstKey);
        }
      }

      this.sinCache.set(normalizedDegrees, result);
    }

    return this.sinCache.get(normalizedDegrees)!;
  }

  cos(degrees: number): number {
    const normalizedDegrees = ((degrees % 360) + 360) % 360;

    if (!this.cosCache.has(normalizedDegrees)) {
      const radians = normalizedDegrees * this.DEG_TO_RAD;
      const result = Math.cos(radians);

      if (this.cosCache.size >= this.maxCacheSize) {
        const firstKey = this.cosCache.keys().next().value;
        if (firstKey !== undefined) {
          this.cosCache.delete(firstKey);
        }
      }

      this.cosCache.set(normalizedDegrees, result);
    }

    return this.cosCache.get(normalizedDegrees)!;
  }

  tan(degrees: number): number {
    const normalizedDegrees = ((degrees % 360) + 360) % 360;

    if (!this.tanCache.has(normalizedDegrees)) {
      const radians = normalizedDegrees * this.DEG_TO_RAD;
      const result = Math.tan(radians);

      if (this.tanCache.size >= this.maxCacheSize) {
        const firstKey = this.tanCache.keys().next().value;
        if (firstKey !== undefined) {
          this.tanCache.delete(firstKey);
        }
      }

      this.tanCache.set(normalizedDegrees, result);
    }

    return this.tanCache.get(normalizedDegrees)!;
  }

  clear(): void {
    this.sinCache.clear();
    this.cosCache.clear();
    this.tanCache.clear();
  }

  getStats(): { sinCache: number; cosCache: number; tanCache: number } {
    return {
      sinCache: this.sinCache.size,
      cosCache: this.cosCache.size,
      tanCache: this.tanCache.size,
    };
  }
}

// Global math optimizer instance
const mathOptimizer = new MathOptimizer();

/**
 * Parallel evaluation manager for complex geometry operations
 */
class ParallelEvaluator {
  private maxWorkers: number;
  private workerPool: Worker[] = [];
  private taskQueue: Array<{
    node: ScadNode;
    context: EvaluationContext;
    resolve: Function;
    reject: Function;
  }> = [];
  private idleWorkers: Worker[] = [];

  constructor(workerCount = 4) {
    this.maxWorkers = workerCount;
    this.initWorkerPool();
  }

  private initWorkerPool(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): void {
    // Bun can create a worker directly from a TypeScript file
    const worker = new Worker(new URL("eval-worker.ts", import.meta.url).href);

    worker.onmessage = (event) => {
      // Find the task this worker was working on and resolve its promise
      const taskIndex = this.taskQueue.findIndex(
        (t) => (t as any).worker === worker,
      );
      if (taskIndex > -1) {
        const task = this.taskQueue.splice(taskIndex, 1)[0];
        if (task && task.resolve) {
          task.resolve(event.data.result);
        }
      }
      // Add the worker back to the idle pool
      this.idleWorkers.push(worker);
      this.dispatchTasks();
    };

    worker.onerror = (error) => {
      logError("Error in parallel evaluator worker", {
        error: error instanceof Error ? error.message : String(error),
      });
      const taskIndex = this.taskQueue.findIndex(
        (t) => (t as any).worker === worker,
      );
      if (taskIndex > -1) {
        const task = this.taskQueue.splice(taskIndex, 1)[0];
        if (task && task.reject) {
          task.reject(error);
        }
      }
      // Don't add the worker back to the pool, let it terminate
    };

    this.workerPool.push(worker);
    this.idleWorkers.push(worker);
  }

  private dispatchTasks(): void {
    while (this.idleWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.idleWorkers.pop();
      const task = this.taskQueue.shift();
      if (worker && task) {
        (task as any).worker = worker;
        worker.postMessage({ node: task.node, context: task.context });
      }
    }
  }

  evaluateInWorker(node: ScadNode, context: EvaluationContext): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ node, context, resolve, reject });
      this.dispatchTasks();
    });
  }

  async batchEvaluateNodes(
    nodes: any[],
    context: EvaluationContext,
  ): Promise<any[]> {
    const promises = nodes.map((node) => this.evaluateInWorker(node, context));
    const placeholderResults = await Promise.all(promises);

    // Now, on the main thread, finalize the evaluation of the placeholders
    const finalResults = [];
    for (const placeholder of placeholderResults) {
      if (placeholder && placeholder._isPlaceholder) {
        // This is a placeholder, so we need to evaluate it for real
        const finalResult = await evaluateNode(placeholder, context);
        finalResults.push(finalResult);
      } else {
        // This was fully evaluated in the worker (e.g. an expression)
        finalResults.push(placeholder);
      }
    }
    return finalResults;
  }

  shutdown(): void {
    this.workerPool.forEach((worker) => worker.terminate());
  }
}

/**
 * Evaluate list comprehension expression
 */
function evaluateListComprehensionExpression(
  comp: any,
  context: EvaluationContext,
): any[] {
  const result: any[] = [];
  const MAX_ITERATIONS = 10000; // Prevent infinite loops
  const MAX_RANGE_VALUES = 1000; // Prevent range explosion

  let iterationCount = 0;

  // Helper function to generate range values with iteration limits
  const generateRange = (
    range: [number, number] | [number, number, number],
  ): number[] => {
    const values: number[] = [];
    let start: number, step: number, end: number;

    if (range.length === 2) {
      [start, end] = range;
      step = 1;
    } else {
      [start, step, end] = range;
    }

    // Prevent infinite loops and range explosion
    for (
      let value = start;
      step > 0 ? value < end : value > end;
      value += step
    ) {
      if (iterationCount++ > MAX_ITERATIONS) {
        context.errors.push({
          message: "List comprehension iteration limit exceeded",
        });
        break;
      }
      if (values.length >= MAX_RANGE_VALUES) {
        context.errors.push({
          message: "List comprehension range limit exceeded",
        });
        break;
      }
      values.push(value);
    }

    return values;
  };

  // Recursive function to handle multiple comprehensions
  const generateCombinations = (
    comprehensions: Array<{
      variable: string;
      range: [number, number] | [number, number, number];
    }>,
    index: number,
    currentVars: Map<string, number>,
  ): void => {
    if (index >= comprehensions.length) {
      // All variables set, evaluate expression
      // Create a temporary context with current variables
      const tempContext = {
        ...context,
        variables: new Map([...context.variables, ...currentVars]),
      };

      // Check condition if present
      if (comp.condition) {
        const conditionResult = evaluateExpression(comp.condition, tempContext);
        if (!Boolean(conditionResult)) {
          return;
        }
      }

      // Evaluate expression
      const exprResult = evaluateExpression(comp.expression, tempContext);
      result.push(exprResult);
      return;
    }

    const compVar = comprehensions[index];
    if (!compVar) return;

    const rangeValues = generateRange(compVar.range);

    for (const value of rangeValues) {
      if (iterationCount++ > MAX_ITERATIONS) {
        context.errors.push({
          message:
            "List comprehension iteration limit exceeded in combinations",
        });
        break;
      }
      currentVars.set(compVar.variable, value);
      generateCombinations(comprehensions, index + 1, currentVars);
      currentVars.delete(compVar.variable);
    }
  };

  // Start generating combinations
  generateCombinations(comp.comprehensions, 0, new Map());

  return result;
}

/**
 * Evaluate import/include statement
 */
async function evaluateImport(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  // Check for circular dependencies
  const normalizedFilename = node.filename.replace(/\\/g, "/");

  try {
    // OpenSCAD-style library path resolution
    // Search order: 1) Current directory, 2) lib/, 3) modules/, 4) system library paths
    const envLibPath = process.env.OPENSCADPATH || "";
    const searchPaths = [
      "./", // Current directory first
      "./lib/",
      "./modules/",
      ...envLibPath
        .split(":")
        .filter((p) => p)
        .map((p) => p + "/"), // Environment OPENSCADPATH
      "/usr/share/openscad/libraries/", // System libraries (Unix)
      "/usr/local/share/openscad/libraries/", // Local system libraries (Unix)
      "C:\\Program Files\\OpenSCAD\\libraries\\", // System libraries (Windows)
    ];

    if (context.includedFiles?.has(normalizedFilename)) {
      context.errors.push({
        message: `Circular dependency detected: ${node.filename} is already included`,
        line: node.line,
      });
      return null;
    }

    // Support subdirectory imports (e.g., shapes/cube.scad)
    const hasPath = node.filename.includes("/");
    const baseDir = hasPath ? "./" : "";

    // Try to resolve the filename to a valid path
    let filePath: string | null = null;
    for (const searchPath of searchPaths) {
      const testPath = searchPath + node.filename;
      try {
        // Check if file exists (Bun file API)
        const file = Bun.file(testPath);
        if (await file.exists()) {
          filePath = testPath;
          break;
        }
      } catch (err) {
        // Continue to next path (especially for system paths that might not exist)
        continue;
      }
    }

    if (!filePath) {
      context.errors.push({
        message: `Import file not found: ${node.filename}`,
        line: node.line,
      });
      return null;
    }

    // Add to included files set to prevent circular dependencies
    context.includedFiles?.add(normalizedFilename);

    // Read file content
    const fileContent = await Bun.file(filePath).text();

    // Parse the imported file
    const { parseOpenSCAD } = await import("./parser");
    const parseResult = parseOpenSCAD(fileContent);

    if (!parseResult.success) {
      context.errors.push(...parseResult.errors);
      return null;
    }

    // Evaluate imported AST
    const importedGeometries: any[] = [];

    // Handle different import types
    switch (node.op) {
      case "import":
        // Import: Makes the content available as modules
        for (const importedNode of parseResult.ast || []) {
          if (importedNode.type === "module_def") {
            context.modules.set((importedNode as any).name, importedNode);
          } else if (importedNode.type === "function_def") {
            context.functions.set((importedNode as any).name, importedNode);
          } else if (importedNode.type === "assignment") {
            context.variables.set(
              (importedNode as any).name,
              (importedNode as any).value,
            );
          }
        }
        break;

      case "include":
        // Include: Execute the content immediately
        for (const importedNode of parseResult.ast || []) {
          const result = await evaluateNode(importedNode, context);
          if (result) {
            importedGeometries.push(result);
          }
        }
        break;

      case "use":
        // Use: Similar to include but only for modules
        for (const importedNode of parseResult.ast || []) {
          if (importedNode.type === "module_def") {
            context.modules.set((importedNode as any).name, importedNode);
          }
        }
        break;
    }

    // Return combined geometry for include statements
    if (importedGeometries.length > 0) {
      const combined = CSG.unionMultiple(importedGeometries);
      // Remove from included files set when done
      context.includedFiles?.delete(normalizedFilename);
      return combined;
    }

    // Remove from included files set when done (only if no geometry returned)
    context.includedFiles?.delete(normalizedFilename);
    return null;
  } catch (error: any) {
    // Remove from included files set on error
    context.includedFiles?.delete(normalizedFilename);
    context.errors.push({
      message: `Failed to import ${node.filename}: ${error.message}`,
      line: node.line,
    });
    return null;
  }
}

// Global parallel evaluator instance
const parallelEvaluator = new ParallelEvaluator();

/**
 * Helper for search() function
 */
function performSearch(
  matchVal: any,
  vector: any,
  numReturns: number,
  matchType: number,
): any[] {
  // Basic implementation of search
  // matchVal: value or list of values to search for
  // vector: string or list of values to search in

  const results: any[] = [];

  // Helper to find matches for a single value
  const findMatches = (val: any, target: any): number[] => {
    let indices: number[] = [];

    if (typeof target === "string") {
      // Search characters in string
      const sVal = String(val);
      for (let i = 0; i < target.length; i++) {
        if (target[i] === sVal) indices.push(i);
      }
    } else if (Array.isArray(target)) {
      // Search in list
      for (let i = 0; i < target.length; i++) {
        if (target[i] === val) indices.push(i);
        // Deep equality check could be added here for objects/lists
      }
    }

    return indices;
  };

  if (Array.isArray(matchVal)) {
    // If matchVal is a list, result is a list of lists of indices
    return matchVal.map((v) => {
      const matches = findMatches(v, vector);
      return numReturns === 0 ? matches : matches.slice(0, numReturns);
    });
  } else {
    // Single value search
    const matches = findMatches(matchVal, vector);
    return numReturns === 0 ? matches : matches.slice(0, numReturns);
  }
}

/**
 * Helper for lookup() function
 */
function performLookup(key: number, table: any[]): number {
  if (!Array.isArray(table) || table.length === 0) return 0;

  // Ensure table is sorted by key (first element) to be safe,
  // though OpenSCAD expects it to be sorted.
  // We'll trust the user provided it sorted for performance, or simple scan.

  // Find p1 and p2 such that p1.key <= key <= p2.key
  let p1 = table[0];
  let p2 = table[table.length - 1];

  // Key out of bounds
  if (key <= p1[0]) return p1[1];
  if (key >= p2[0]) return p2[1];

  // Linear search for interval (binary search would be better for large tables)
  for (let i = 0; i < table.length - 1; i++) {
    if (key >= table[i][0] && key <= table[i + 1][0]) {
      p1 = table[i];
      p2 = table[i + 1];
      break;
    }
  }

  // Interpolate
  // y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
  if (p2[0] === p1[0]) return p1[1];

  return p1[1] + ((key - p1[0]) * (p2[1] - p1[1])) / (p2[0] - p1[0]);
}

/**
 * Helper for rands() function
 */
function performRands(
  minVal: number,
  maxVal: number,
  count: number,
  seed?: number,
): number[] {
  const result: number[] = [];

  // If seed is provided, use a simple LCG or similar deterministic generator
  // If not, use Math.random()

  let currentSeed = seed !== undefined ? seed : Math.random() * 2147483647;

  const nextRand = () => {
    if (seed !== undefined) {
      // Simple LCG
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    } else {
      return Math.random();
    }
  };

  for (let i = 0; i < count; i++) {
    const r = nextRand();
    result.push(minVal + r * (maxVal - minVal));
  }

  return result;
}

/**
 * Convert WASM geometry to standard Geometry format (JSON-serializable)
 */
function convertWasmGeometry(wasmGeom: any): Geometry {
  return geometryConverter.convertWasmGeometry(wasmGeom);
}

/**
 * Convert WASM mesh to Geometry format for three-bvh-csg
 */
function wasmMeshToGeometry(wasmMesh: any): Geometry {
  return geometryConverter.convertWasmGeometry(wasmMesh);
}

/**
 * Convert Geometry format back to WASM mesh format
 */
function geometryToWasmMesh(geom: Geometry): any {
  // Create a mock WASM mesh object that looks like WASM output
  // but contains our Geometry data
  return {
    vertices: new Float32Array(geom.vertices),
    indices: new Uint32Array(geom.indices),
    normals: new Float32Array(geom.normals),
    bounds: geom.bounds,
    _color: (geom as any).color,
    _modifier: (geom as any).modifier?.type,
  };
}
