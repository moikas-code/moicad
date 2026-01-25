import type { ScadNode, Geometry, EvaluateResult, EvaluationError, ModifierInfo } from '../shared/types';

/**
 * OpenSCAD Evaluator - Executes AST using WASM CSG engine
 */

interface WasmModule {
  create_cube: (size: number) => any;
  create_sphere: (radius: number, detail: number) => any;
  create_cylinder: (radius: number, height: number, detail: number) => any;
  create_cone: (radius: number, height: number, detail: number) => any;
  create_circle: (radius: number, detail: number) => any;
  create_square: (size: number) => any;
  polygon: (points: number[] | Float32Array) => any;
  polyhedron: (points: number[] | Float32Array, faces: number[] | Uint32Array) => any;
  union: (a: any, b: any) => any;
  difference: (a: any, b: any) => any;
  intersection: (a: any, b: any) => any;
  minkowski: (a: any, b: any) => any;
  hull: (mesh: any) => any;
  hull_two: (a: any, b: any) => any;
  translate: (mesh: any, x: number, y: number, z: number) => any;
  rotate_x: (mesh: any, angle: number) => any;
  rotate_y: (mesh: any, angle: number) => any;
  rotate_z: (mesh: any, angle: number) => any;
  scale: (mesh: any, sx: number, sy: number, sz: number) => any;
  mirror_x: (mesh: any) => any;
  mirror_y: (mesh: any) => any;
  mirror_z: (mesh: any) => any;
  multmatrix: (mesh: any, matrix: number[]) => any;
}

let wasmModule: WasmModule | null = null;

export async function initWasm(module: any): Promise<void> {
  wasmModule = module;
}

export function setWasmModule(module: WasmModule): void {
  wasmModule = module;
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

interface EvaluationContext {
  variables: Map<string, any>;
  functions: Map<string, any>;
  modules: Map<string, any>;
  errors: EvaluationError[];
}

/**
 * Evaluate AST to produce geometry
 */
export async function evaluateAST(ast: ScadNode[]): Promise<EvaluateResult> {
  const startTime = performance.now();
  const context: EvaluationContext = {
    variables: new Map([
      ['$fn', 0],      // Fragment number (facets)
      ['$fa', 12],     // Fragment angle in degrees
      ['$fs', 2],      // Fragment size in mm
      ['$t', 0]        // Animation time
    ]),
    functions: new Map(),
    modules: new Map(),
    errors: [],
  };

  try {
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    // Single optimized pass: collect definitions and evaluate in one traversal
    const geometries: any[] = [];
    const executableNodes: any[] = [];
    
    // Check for root modifiers (!) - if found, only evaluate those and ignore others
    const rootModifiers: any[] = [];
    
    for (const node of ast) {
      // Handle definitions
      if (node.type === 'function_def') {
        context.functions.set((node as any).name, node);
        continue; // Skip to evaluation phase
      }
      if (node.type === 'module_def') {
        context.modules.set((node as any).name, node);
        continue; // Skip to evaluation phase
      }

      // Check for root modifier
      if (node.type === 'modifier' && (node as any).modifier === '!') {
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
      if (executableNodes.length > 3) {
        try {
          // Use parallel evaluation for complex scenes
          const batchResults = await parallelEvaluator.batchEvaluateNodes(executableNodes, context);
          for (const result of batchResults) {
            if (result) {
              geometries.push(result);
            }
          }
        } catch (error) {
          console.warn('Parallel evaluation failed, falling back to sequential:', error);
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
        errors: [{ message: 'No geometry generated' }],
        success: false,
        executionTime: performance.now() - startTime,
      };
    }

    // Filter out null/undefined geometries
    const validGeometries = geometries.filter(g => g !== null && g !== undefined);
    if (validGeometries.length === 0) {
      return {
        geometry: null,
        errors: [{ message: 'No valid geometry generated' }],
        success: false,
        executionTime: performance.now() - startTime,
      };
    }

    let finalGeometry = validGeometries[0];
    if (validGeometries.length > 1) {
      for (let i = 1; i < validGeometries.length; i++) {
        if (finalGeometry && validGeometries[i]) {
          finalGeometry = wasmModule.union(finalGeometry, validGeometries[i]);
        }
      }
    }

    // Convert WASM geometry to JSON
    const geometry = convertWasmGeometry(finalGeometry);

    return {
      geometry,
      errors: context.errors,
      success: context.errors.length === 0,
      executionTime: performance.now() - startTime,
    };
  } catch (err: any) {
    return {
      geometry: null,
      errors: [{ message: err.message, stack: err.stack }],
      success: false,
      executionTime: performance.now() - startTime,
    };
  }
}

async function evaluateNode(node: ScadNode, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  switch (node.type) {
    case 'primitive':
      return evaluatePrimitive(node as any, context);

    case 'transform':
      return evaluateTransform(node as any, context);

    case 'boolean':
      return evaluateBooleanOp(node as any, context);

    case 'for':
      return evaluateForLoop(node as any, context);

    case 'assignment':
      return evaluateAssignment(node as any, context);

    case 'if':
      return evaluateIf(node as any, context);

    case 'module_call':
      return evaluateModuleCall(node as any, context);

    case 'echo':
      return evaluateEcho(node as any, context);

    case 'assert':
      return evaluateAssert(node as any, context);

    case 'function_def':
    case 'module_def':
      // Already handled in first pass
      return null;

    case 'import':
      return evaluateImport(node as any, context);

    case 'children':
      // Children nodes are handled in parent context
      return null;

    case 'modifier':
      return evaluateModifier(node as any, context);

    default:
      context.errors.push({ message: `Unknown node type: ${node.type}` });
      return null;
  }
}

function evaluatePrimitive(node: any, context: EvaluationContext): any {
  if (!wasmModule) throw new Error('WASM module not initialized');

  const params = evaluateParameters(node.params, context);

  // Check cache first
  const cacheKey = node.op;
  let cachedGeometry = primitiveCache.get(cacheKey, params);
  if (cachedGeometry) {
    return cachedGeometry;
  }

  let geometry = null;

  switch (node.op) {
    case 'cube':
      // Handle positional: cube(size) or named: cube(size=10)
      const cube_size = params._positional ?? params.size ?? 10;
      geometry = wasmModule.create_cube(cube_size);
      break;

    case 'sphere':
      // Handle positional: sphere(r) or named: sphere(r=5, $fn=20)
      const sphere_r = params._positional ?? params.r ?? params.radius ?? (params.d ? params.d / 2 : undefined) ?? (params.diameter ? params.diameter / 2 : undefined) ?? 10;
      const sphere_detail = params.$fn ?? params.detail ?? 20;
      geometry = wasmModule.create_sphere(sphere_r, sphere_detail);
      break;

    case 'cylinder':
      // Handle positional: cylinder(h, r) or named params
      const cyl_h = Array.isArray(params._positional) ? params._positional[0] : (params._positional ?? params.h ?? params.height ?? 10);
      const cyl_r = Array.isArray(params._positional) && params._positional[1] ? params._positional[1] : (params.r ?? params.radius ?? 5);
      const cyl_r1 = params.r1 ?? cyl_r;
      const cyl_r2 = params.r2 ?? cyl_r;
      const cyl_detail = params.$fn ?? params.detail ?? 20;
      const cyl_r_avg = (cyl_r1 + cyl_r2) / 2;
      geometry = wasmModule.create_cylinder(cyl_r_avg, cyl_h, cyl_detail);
      break;

    case 'cone':
      const cone_h = Array.isArray(params._positional) ? params._positional[0] : (params._positional ?? params.h ?? params.height ?? 10);
      const cone_r = Array.isArray(params._positional) && params._positional[1] ? params._positional[1] : (params.r ?? params.radius ?? 5);
      const cone_detail = params.$fn ?? params.detail ?? 20;
      geometry = wasmModule.create_cone(cone_r, cone_h, cone_detail);
      break;

    case 'circle':
      const circ_r = params._positional ?? params.r ?? params.radius ?? (params.d ? params.d / 2 : undefined) ?? (params.diameter ? params.diameter / 2 : undefined) ?? 5;
      const circ_detail = params.$fn ?? params.detail ?? 20;
      geometry = wasmModule.create_circle(circ_r, circ_detail);
      break;

    case 'square':
      const sq_size = params._positional ?? params.size ?? 10;
      geometry = wasmModule.create_square(sq_size);
      break;

    case 'polygon':
      const polygon_pts = params._positional ?? params.points ?? [];
      // Convert points array to flat array for WASM
      let polygon_flat = [];
      if (Array.isArray(polygon_pts[0])) {
        polygon_flat = polygon_pts.flat();
      } else {
        polygon_flat = polygon_pts;
      }
      geometry = wasmModule.polygon(polygon_flat);
      break;

    case 'polyhedron':
      const poly_pts = params._positional ?? params.points ?? [];
      const poly_faces = params.faces ?? [];
      // Convert points array to flat array for WASM
      let poly_flat = [];
      if (Array.isArray(poly_pts[0])) {
        poly_flat = poly_pts.flat();
      } else {
        poly_flat = poly_pts;
      }
      geometry = wasmModule.polyhedron(poly_flat, poly_faces);
      break;

    default:
      context.errors.push({ message: `Unknown primitive: ${node.op}` });
      return null;
  }

  // Cache the result for future use
  if (geometry) {
    primitiveCache.set(cacheKey, params, geometry);
  }

  return geometry;
}

function handleColor(geometry: any, params: any, context: EvaluationContext): any {
  if (!geometry) {
    context.errors.push({ message: 'No geometry to color' });
    return null;
  }

  // Extract color parameters - can be:
  // 1. Single vector [r, g, b] or [r, g, b, a]
  // 2. Named parameters: c=[r,g,b], or separate r,g,b,a
  // 3. String color name (not implemented yet)
  
  let colorInfo: { r: number; g: number; b: number; a?: number } | null = null;

  // Handle vector color (most common: color([1,0,0]) or color([1,0,0,0.5]))
  const colorVector = params.c ?? params._positional;
  if (Array.isArray(colorVector)) {
    if (colorVector.length >= 3) {
      colorInfo = {
        r: Math.max(0, Math.min(1, colorVector[0])),
        g: Math.max(0, Math.min(1, colorVector[1])),
        b: Math.max(0, Math.min(1, colorVector[2])),
        a: colorVector.length >= 4 ? Math.max(0, Math.min(1, colorVector[3])) : 1.0
      };
    }
  } 
  // Handle separate color components
  else if (params.r !== undefined || params.g !== undefined || params.b !== undefined) {
    colorInfo = {
      r: Math.max(0, Math.min(1, params.r ?? 0)),
      g: Math.max(0, Math.min(1, params.g ?? 0)),
      b: Math.max(0, Math.min(1, params.b ?? 0)),
      a: Math.max(0, Math.min(1, params.a ?? 1.0))
    };
  }

  if (!colorInfo) {
    context.errors.push({ message: 'Invalid color parameters - expected vector [r,g,b] or [r,g,b,a] or separate r,g,b,a components' });
    return geometry;
  }

  // Store color information on the geometry object
  if (typeof geometry === 'object' && geometry !== null) {
    (geometry as any)._color = colorInfo;
  }

  return geometry;
}

async function evaluateTransform(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  // Evaluate and combine all children
  let geometry = null;
  for (const child of node.children) {
    const childGeom = await evaluateNode(child, context);
    if (childGeom) {
      if (!geometry) {
        geometry = childGeom;
      } else {
        geometry = wasmModule.union(geometry, childGeom);
      }
    }
  }

  if (!geometry) {
    context.errors.push({ message: `No geometry in transform ${node.op}` });
    return null;
  }

  const params = evaluateParameters(node.params, context);

  switch (node.op) {
    case 'translate':
      // Handle both named params (v=[x,y,z]) and positional params ([x,y,z])
      const translate_arr = params.v ?? params._positional ?? [0, 0, 0];
      const tx = Array.isArray(translate_arr) ? translate_arr[0] ?? 0 : params.x ?? 0;
      const ty = Array.isArray(translate_arr) ? translate_arr[1] ?? 0 : params.y ?? 0;
      const tz = Array.isArray(translate_arr) ? translate_arr[2] ?? 0 : params.z ?? 0;
      return wasmModule.translate(geometry, tx, ty, tz);

    case 'rotate':
      const rot_a = params.a ?? params.angle ?? 0;
      const rot_v = params.v ?? [0, 0, 1];

      // Handle single axis rotations for backward compatibility
      if (Array.isArray(rot_v) && rot_v.length === 3) {
        const [rx, ry, rz] = rot_v;
        // Check if it's a single axis rotation
        const axis_count = (rx !== 0 ? 1 : 0) + (ry !== 0 ? 1 : 0) + (rz !== 0 ? 1 : 0);

        if (axis_count === 1) {
          // Single axis rotation
          if (rx !== 0) return wasmModule.rotate_x(geometry, rot_a);
          if (ry !== 0) return wasmModule.rotate_y(geometry, rot_a);
          if (rz !== 0) return wasmModule.rotate_z(geometry, rot_a);
        } else {
          // For now, fall back to single axis rotations
          if (rx !== 0) return wasmModule.rotate_x(geometry, rot_a);
          if (ry !== 0) return wasmModule.rotate_y(geometry, rot_a);
          if (rz !== 0) return wasmModule.rotate_z(geometry, rot_a);
        }
      }

      // Default to Z-axis rotation
      return wasmModule.rotate_z(geometry, rot_a);

    case 'scale':
      const s = params.v;
      const sx = s?.[0] ?? params.x ?? 1;
      const sy = s?.[1] ?? params.y ?? 1;
      const sz = s?.[2] ?? params.z ?? 1;
      return wasmModule.scale(geometry, sx, sy, sz);

    case 'mirror':
      const mirror_v = params.v ?? [1, 0, 0];
      if (mirror_v[0] !== 0) return wasmModule.mirror_x(geometry);
      if (mirror_v[1] !== 0) return wasmModule.mirror_y(geometry);
      if (mirror_v[2] !== 0) return wasmModule.mirror_z(geometry);
      return geometry;

    case 'multmatrix':
      const matrix = params.m ?? [];
      if (matrix.length === 16) {
        return wasmModule.multmatrix(geometry, matrix);
      }
      context.errors.push({ message: 'multmatrix requires 16 elements' });
      return geometry;

    case 'color':
      return handleColor(geometry, params, context);

    default:
      context.errors.push({ message: `Unknown transform: ${node.op}` });
      return geometry;
  }
}

async function evaluateBooleanOp(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  if (node.children.length === 0) {
    return null;
  }

  // Special handling for hull - combine all children then compute hull
  if (node.op === 'hull') {
    // First, evaluate all children and union them together
    let combined = await evaluateNode(node.children[0], context);
    for (let i = 1; i < node.children.length; i++) {
      const next = await evaluateNode(node.children[i], context);
      if (!next) continue;
      // Use union to combine vertices (not hull_two which computes hull immediately)
      combined = wasmModule.union(combined, next);
    }
    // Now compute convex hull on the combined geometry
    return combined ? wasmModule.hull(combined) : null;
  }

  let result = await evaluateNode(node.children[0], context);

  for (let i = 1; i < node.children.length; i++) {
    const next = await evaluateNode(node.children[i], context);
    if (!next) continue;

    // Preserve color from the first child (main geometry) in boolean operations
    const colorInfo = (result as any)._color;

    switch (node.op) {
      case 'union':
        result = wasmModule.union(result, next);
        break;
      case 'difference':
        result = wasmModule.difference(result, next);
        break;
      case 'intersection':
        result = wasmModule.intersection(result, next);
        break;
      case 'minkowski':
        result = wasmModule.minkowski(result, next);
        break;
    }

    // Restore color information after boolean operation
    if (colorInfo && typeof result === 'object' && result !== null) {
      (result as any)._color = colorInfo;
    }
  }

  return result;
}

async function evaluateForLoop(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  const variable = node.variable;
  const range = node.range;

  let start: number, end: number, step = 1;

  if (range.length === 2) {
    [start, end] = range;
  } else if (range.length === 3) {
    [start, step, end] = range;
  } else {
    context.errors.push({ message: 'Invalid range in for loop' });
    return null;
  }

  const geometries: any[] = [];

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

  let result = geometries[0];
  for (let i = 1; i < geometries.length; i++) {
    result = wasmModule.union(result, geometries[i]);
  }

  return result;
}

async function evaluateEcho(node: any, context: EvaluationContext): Promise<any> {
  const values = node.values.map((v: any) => {
    const evaluated = evaluateExpression(v, context);
    return evaluated;
  });
  console.log('ECHO:', ...values);
  return null; // Echo doesn't produce geometry
}

async function evaluateAssert(node: any, context: EvaluationContext): Promise<any> {
  const condition = evaluateExpression(node.condition, context);
  console.log('ASSERT condition:', node.condition, '=> evaluated to:', condition, 'type:', typeof condition);
  if (!condition) {
    const message = node.message
      ? evaluateExpression(node.message, context)
      : 'Assertion failed';
    context.errors.push({
      message: `Assert failed: ${message}`,
      line: node.line
    });
  }
  return null; // Assert doesn't produce geometry
}

async function evaluateModifier(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  const modifier = node.modifier as '!' | '#' | '%' | '*';
  
  switch (modifier) {
    case '!': {
      // Root modifier - show only this and children, ignore everything else
      // Evaluate the child normally - root filtering is handled at the AST level
      const childGeometry = await evaluateNode(node.child, context);
      return childGeometry;
    }

    case '#': {
      // Debug modifier - highlight in red
      // Evaluate child and mark for red highlighting in frontend
      const childGeometry = await evaluateNode(node.child, context);
      if (childGeometry) {
        // Store modifier information on the geometry object
        // The WASM geometry object might have different structure, so we need to be careful
        if (typeof childGeometry === 'object' && childGeometry !== null) {
          (childGeometry as any)._modifier = '#';
        }
      }
      return childGeometry;
    }

    case '%': {
      // Transparent modifier - show as transparent
      // Evaluate child and mark for transparency in frontend
      const childGeometry = await evaluateNode(node.child, context);
      if (childGeometry) {
        // Store modifier information for frontend rendering
        if (typeof childGeometry === 'object' && childGeometry !== null) {
          (childGeometry as any)._modifier = '%';
        }
      }
      return childGeometry;
    }

    case '*': {
      // Disable modifier - ignore in preview (completely skip)
      // Simply return null to exclude this geometry
      return null;
    }

    default:
      context.errors.push({ message: `Unknown modifier: ${modifier}` });
      return null;
  }
}

async function evaluateAssignment(node: any, context: EvaluationContext): Promise<any> {
  const value = evaluateExpression(node.value, context);
  context.variables.set(node.name, value);
  return null; // Assignments don't produce geometry
}

async function evaluateIf(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  const condition = evaluateExpression(node.condition, context);

  // Evaluate condition as boolean
  const isTrue = Boolean(condition);

  const bodyToEvaluate = isTrue ? node.thenBody : (node.elseBody || []);

  // Evaluate body and collect geometries
  const geometries: any[] = [];
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

  let result = geometries[0];
  for (let i = 1; i < geometries.length; i++) {
    result = wasmModule.union(result, geometries[i]);
  }

  return result;
}

async function evaluateModuleCall(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

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
    if (key !== '_positional') {
      moduleContext.variables.set(key, value);
    }
  }

  // Evaluate module body
  const geometries: any[] = [];
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

  let result = geometries[0];
  for (let i = 1; i < geometries.length; i++) {
    result = wasmModule.union(result, geometries[i]);
  }

  return result;
}

function evaluateExpression(expr: any, context: EvaluationContext): any {
  if (expr === null || expr === undefined) {
    return null;
  }

  // Check memoization cache first
  const cachedResult = expressionMemoizer.get(expr, context);
  if (cachedResult !== null) {
    return cachedResult;
  }

  let result: any;

  // Handle expression nodes
  if (typeof expr === 'object' && expr.type) {
    switch (expr.type) {
      case 'expression':
        result = evaluateBinaryExpression(expr, context);
        break;

      case 'ternary':
        const condition = evaluateExpression(expr.condition, context);
        result = Boolean(condition)
          ? evaluateExpression(expr.thenExpr, context)
          : evaluateExpression(expr.elseExpr, context);
        break;

      case 'function_call':
        result = evaluateFunctionCall(expr, context);
        break;

      case 'variable':
        result = context.variables.get(expr.name);
        break;

      case 'list_comprehension':
        result = evaluateListComprehensionExpression(expr, context);
        break;

      default:
        result = expr;
        break;
    }
  } else if (typeof expr === 'number' || typeof expr === 'boolean' || typeof expr === 'string') {
    // Handle primitive values
    result = expr;
  } else if (Array.isArray(expr)) {
    // Handle arrays
    result = expr.map(e => evaluateExpression(e, context));
  } else if (typeof expr === 'string' && context.variables.has(expr)) {
    // Handle variable references
    result = context.variables.get(expr);
  } else {
    result = expr;
  }

  // Cache the result for future use
  expressionMemoizer.set(expr, context, result);
  return result;
}

function evaluateBinaryExpression(expr: any, context: EvaluationContext): any {
  const operator = expr.operator;

  // Unary operators (optimized - no recursion)
  if (!expr.right && expr.left !== undefined) {
    const left = evaluateExpression(expr.left, context);
    switch (operator) {
      case '!': return !left;
      case '-': return -left;
      default: return left;
    }
  }

  // Binary operators with optimized evaluation for common cases
  const left = evaluateExpression(expr.left, context);
  const right = evaluateExpression(expr.right, context);

  // Fast path for numeric operations (most common)
  if (typeof left === 'number' && typeof right === 'number') {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: break;
    }
  }

  // Fallback to original logic for complex expressions
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '%': return left % right;
    case '==': return left === right;
    case '!=': return left !== right;
    case '<': return left < right;
    case '>': return left > right;
    case '<=': return left <= right;
    case '>=': return left >= right;
    case '&&': return left && right;
    case '||': return left || right;
    default: return null;
  }
}

function evaluateFunctionCall(call: any, context: EvaluationContext): any {
  const funcDef = context.functions.get(call.name);
  if (!funcDef) {
    // Try built-in functions
    switch (call.name) {
      case 'abs': return Math.abs(evaluateExpression(call.args[0], context));
      case 'ceil': return Math.ceil(evaluateExpression(call.args[0], context));
      case 'floor': return Math.floor(evaluateExpression(call.args[0], context));
      case 'round': return Math.round(evaluateExpression(call.args[0], context));
      case 'sqrt': return Math.sqrt(evaluateExpression(call.args[0], context));
      case 'sin': return mathOptimizer.sin(evaluateExpression(call.args[0], context));
      case 'cos': return mathOptimizer.cos(evaluateExpression(call.args[0], context));
      case 'tan': return mathOptimizer.tan(evaluateExpression(call.args[0], context));
      case 'min': return Math.min(...call.args.map((a: any) => evaluateExpression(a, context)));
      case 'max': return Math.max(...call.args.map((a: any) => evaluateExpression(a, context)));
      case 'pow': return Math.pow(
        evaluateExpression(call.args[0], context),
        evaluateExpression(call.args[1], context)
      );
      case 'len': {
        const arg = evaluateExpression(call.args[0], context);
        return Array.isArray(arg) ? arg.length : 0;
      }

      // Additional trigonometric functions
      case 'asin': return Math.asin(evaluateExpression(call.args[0], context)) * 180 / Math.PI;
      case 'acos': return Math.acos(evaluateExpression(call.args[0], context)) * 180 / Math.PI;
      case 'atan': return Math.atan(evaluateExpression(call.args[0], context)) * 180 / Math.PI;
      case 'atan2': return Math.atan2(
        evaluateExpression(call.args[0], context),
        evaluateExpression(call.args[1], context)
      ) * 180 / Math.PI;

      // Exponential and logarithmic functions
      case 'exp': return Math.exp(evaluateExpression(call.args[0], context));
      case 'log': return Math.log10(evaluateExpression(call.args[0], context));
      case 'ln': return Math.log(evaluateExpression(call.args[0], context));

      // Sign function
      case 'sign': return Math.sign(evaluateExpression(call.args[0], context));

      // Vector functions
      case 'norm': {
        const vec = evaluateExpression(call.args[0], context);
        if (!Array.isArray(vec)) return 0;
        return Math.sqrt(vec.reduce((sum: number, v: number) => sum + v * v, 0));
      }
      case 'cross': {
        const v1 = evaluateExpression(call.args[0], context);
        const v2 = evaluateExpression(call.args[1], context);
        if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== 3 || v2.length !== 3) {
          context.errors.push({ message: 'cross() requires two 3D vectors' });
          return null;
        }
        return [
          v1[1] * v2[2] - v1[2] * v2[1],
          v1[2] * v2[0] - v1[0] * v2[2],
          v1[0] * v2[1] - v1[1] * v2[0]
        ];
      }

      // Array functions
      case 'concat': {
        const arrays = call.args.map((a: any) => evaluateExpression(a, context));
        return arrays.flat();
      }

      // String functions
      case 'str': {
        return call.args.map((a: any) => {
          const val = evaluateExpression(a, context);
          return String(val);
        }).join('');
      }
      case 'chr': {
        const code = evaluateExpression(call.args[0], context);
        return String.fromCharCode(code);
      }
      case 'ord': {
        const str = String(evaluateExpression(call.args[0], context));
        return str.length > 0 ? str.charCodeAt(0) : 0;
      }

      default:
        context.errors.push({ message: `Unknown function: ${call.name}` });
        return null;
    }
  }

  // User-defined function
  const funcContext: Map<string, any> = new Map(context.variables);

  // Bind arguments to parameters
  const evaluatedArgs = call.args.map((arg: any) => evaluateExpression(arg, context));
  funcDef.params.forEach((param: string, idx: number) => {
    funcContext.set(param, evaluatedArgs[idx]);
  });

  // Create temporary context for function evaluation
  const tempContext: EvaluationContext = {
    variables: funcContext,
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
  };

  return evaluateExpression(funcDef.expression, tempContext);
}

function evaluateParameters(params: Record<string, any>, context: EvaluationContext): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    result[key] = evaluateValue(value, context);
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
    const vertexCount = wasmGeom.vertex_count ? wasmGeom.vertex_count() : wasmGeom.vertexCount();
    const indexCount = wasmGeom.face_count ? wasmGeom.face_count() : wasmGeom.faceCount();
    const normalCount = vertexCount;

    // Resize caches if needed
    this.resizeCaches(vertexCount, indexCount, normalCount);

    // Use efficient copy methods if available, fallback to array getters
    if (wasmGeom.copy_vertices_to_buffer && false) { // Temporarily disabled
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
      geometry.modifier = { type: wasmGeom._modifier as '!' | '#' | '%' | '*' };
    }

    // Add color information if present
    if (wasmGeom._color) {
      geometry.color = wasmGeom._color;
    }

    return geometry;
  }

  private resizeCaches(vertexCount: number, indexCount: number, normalCount: number) {
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

  private convertFallback(wasmGeom: any): Geometry {
    // Original conversion logic as fallback
    const vertices = wasmGeom.vertices instanceof Float32Array
      ? Array.from(wasmGeom.vertices)
      : Array.isArray(wasmGeom.vertices)
      ? wasmGeom.vertices
      : Object.values(wasmGeom.vertices) as number[];

    const indices = wasmGeom.indices instanceof Uint32Array
      ? Array.from(wasmGeom.indices)
      : Array.isArray(wasmGeom.indices)
      ? wasmGeom.indices
      : Object.values(wasmGeom.indices) as number[];

    const normals = wasmGeom.normals instanceof Float32Array
      ? Array.from(wasmGeom.normals)
      : Array.isArray(wasmGeom.normals)
      ? wasmGeom.normals
      : Object.values(wasmGeom.normals) as number[];

    // Calculate stats from arrays
    const vertexCount = vertices.length / 3;
    const faceCount = indices.length / 3;

    const geometry: Geometry = {
      vertices: vertices as number[],
      indices: indices as number[],
      normals: normals as number[],
      bounds: wasmGeom.bounds,
      stats: {
        vertexCount,
        faceCount,
      },
    };

    // Add modifier information if present
    if (wasmGeom._modifier) {
      geometry.modifier = { type: wasmGeom._modifier as '!' | '#' | '%' | '*' };
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
    if (expr === null || expr === undefined) return 'null';
    if (typeof expr === 'number' || typeof expr === 'boolean' || typeof expr === 'string') {
      return `${typeof expr}:${expr}`;
    }
    if (Array.isArray(expr)) {
      return `arr:${expr.map(e => this.hashExpression(e)).join(',')}`;
    }
    if (typeof expr === 'object' && expr.type) {
      return `${expr.type}:${this.hashExpression(expr.left)}:${this.hashExpression(expr.right)}`;
    }
    return `obj:${JSON.stringify(expr)}`;
  }

  private hashContext(context: EvaluationContext): string {
    // Hash only variable names and values that might affect expression
    const vars = Array.from(context.variables.entries())
      .filter(([name, value]) => typeof value === 'number' || typeof value === 'boolean')
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 10); // Limit to first 10 variables for performance
    return vars.map(([name, value]) => `${name}:${value}`).join('|');
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
  private maxWorkers = 4;
  private workerPool: any[] = [];
  private taskQueue: Array<{task: any, resolve: Function, reject: Function}> = [];

  constructor() {
    // Only use parallel evaluation if available and beneficial
    if (typeof Worker === 'undefined' || !this.isComplexEnoughForParallel()) {
      return;
    }

    // Initialize worker pool for CPU-bound operations
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private isComplexEnoughForParallel(): boolean {
    // Enable parallelism for operations that benefit from it
    // This is determined by the number of independent operations
    return true; // Can be made smarter based on code analysis
  }

  private createWorker(): void {
    // In a real implementation, This would create Web Workers
    // For now, this is a placeholder for parallel evaluation structure
    console.log('Parallel evaluation enabled (placeholder implementation)');
  }

  async evaluateParallel<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    if (operations.length <= 2) {
      // For small numbers, evaluate sequentially
      return Promise.all(operations.map(op => op()));
    }

    // Simulate parallel evaluation (would use Web Workers in browser)
    const promises = operations.map(op => {
      return new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          try {
            const result = op();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
    });

    return Promise.all(promises);
  }

  private isIndependentOperation(node: any): boolean {
    // Check if node can be evaluated independently
    const independentTypes = ['primitive', 'transform'];
    return independentTypes.includes(node.type);
  }

  async batchEvaluateNodes(nodes: any[], context: EvaluationContext): Promise<any[]> {
    // Group independent nodes for parallel processing
    const independentNodes = nodes.filter(node => this.isIndependentOperation(node));
    const dependentNodes = nodes.filter(node => !this.isIndependentOperation(node));

    const [independentResults] = await Promise.all([
      this.evaluateParallel(independentNodes.map(node => 
        () => evaluateNode(node, context)
      ))
    ]);

    // Process dependent nodes sequentially (they need context)
    const dependentResults = [];
    for (const node of dependentNodes) {
      dependentResults.push(await evaluateNode(node, context));
    }

    // Combine results maintaining original order
    const results = [];
    let independentIdx = 0;
    let dependentIdx = 0;

    for (const originalNode of nodes) {
      if (this.isIndependentOperation(originalNode)) {
        results.push(independentResults[independentIdx++]);
      } else {
        results.push(dependentResults[dependentIdx++]);
      }
    }

    return results;
  }
}

/**
 * Evaluate list comprehension expression
 */
function evaluateListComprehensionExpression(comp: any, context: EvaluationContext): any[] {
  const result: any[] = [];
  
  // Helper function to generate range values
  const generateRange = (range: [number, number] | [number, number, number]): number[] => {
    const values: number[] = [];
    let start: number, step: number, end: number;
    
    if (range.length === 2) {
      [start, end] = range;
      step = 1;
    } else {
      [start, step, end] = range;
    }
    
    for (let value = start; step > 0 ? value < end : value > end; value += step) {
      values.push(value);
    }
    
    return values;
  };
  
  // Recursive function to handle multiple comprehensions
  const generateCombinations = (
    comprehensions: Array<{ variable: string; range: [number, number] | [number, number, number] }>,
    index: number,
    currentVars: Map<string, number>
  ): void => {
    if (index >= comprehensions.length) {
      // All variables set, evaluate expression
      // Create a temporary context with current variables
      const tempContext = {
        ...context,
        variables: new Map([...context.variables, ...currentVars])
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
async function evaluateImport(node: any, context: EvaluationContext): Promise<any> {
  try {
    // For now, we'll implement a basic version that reads from allowed directories
    // This is a simplified implementation - production would need more security
    
    const allowedPaths = ['./lib/', './modules/', './'];
    
    // Try to resolve the filename to a valid path
    let filePath: string | null = null;
    for (const basePath of allowedPaths) {
      const testPath = basePath + node.filename;
      try {
        // Check if file exists (Bun file API)
        const file = Bun.file(testPath);
        if (await file.exists()) {
          filePath = testPath;
          break;
        }
      } catch (err) {
        // Continue to next path
      }
    }
    
    if (!filePath) {
      context.errors.push({ 
        message: `Import file not found: ${node.filename}`,
        line: node.line 
      });
      return null;
    }
    
    // Read file content
    const fileContent = await Bun.file(filePath).text();
    
    // Parse the imported file
    const { parseOpenSCAD } = await import('./scad-parser.ts');
    const parseResult = parseOpenSCAD(fileContent);
    
    if (!parseResult.success) {
      context.errors.push(...parseResult.errors);
      return null;
    }
    
    // Evaluate imported AST
    const importedGeometries: any[] = [];
    
    // Handle different import types
    switch (node.op) {
      case 'import':
        // Import: Makes the content available as modules
        for (const importedNode of parseResult.ast || []) {
          if (importedNode.type === 'module_def') {
            context.modules.set((importedNode as any).name, importedNode);
          } else if (importedNode.type === 'function_def') {
            context.functions.set((importedNode as any).name, importedNode);
          } else if (importedNode.type === 'assignment') {
            context.variables.set((importedNode as any).name, (importedNode as any).value);
          }
        }
        break;
        
      case 'include':
        // Include: Execute the content immediately
        for (const importedNode of parseResult.ast || []) {
          const result = await evaluateNode(importedNode, context);
          if (result) {
            importedGeometries.push(result);
          }
        }
        break;
        
      case 'use':
        // Use: Similar to include but only for modules
        for (const importedNode of parseResult.ast || []) {
          if (importedNode.type === 'module_def') {
            context.modules.set((importedNode as any).name, importedNode);
          }
        }
        break;
    }
    
    // Return combined geometry for include statements
    if (importedGeometries.length > 0 && wasmModule) {
      let combined = importedGeometries[0];
      for (let i = 1; i < importedGeometries.length; i++) {
        combined = wasmModule.union(combined, importedGeometries[i]);
      }
      return combined;
    }
    
    return null;
  } catch (error: any) {
    context.errors.push({ 
      message: `Failed to import ${node.filename}: ${error.message}`,
      line: node.line 
    });
    return null;
  }
}

// Global parallel evaluator instance
const parallelEvaluator = new ParallelEvaluator();

/**
 * Convert WASM geometry to standard Geometry format (JSON-serializable)
 */
function convertWasmGeometry(wasmGeom: any): Geometry {
  return geometryConverter.convertWasmGeometry(wasmGeom);
}
