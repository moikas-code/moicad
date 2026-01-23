import type { ScadNode, Geometry, EvaluateResult, EvaluationError } from '../shared/types';

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
  union: (a: any, b: any) => any;
  difference: (a: any, b: any) => any;
  intersection: (a: any, b: any) => any;
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
    variables: new Map(),
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

      // Evaluate executable nodes
      const result = await evaluateNode(node, context);
      if (result) {
        geometries.push(result);
      }
    }

    // Combine all geometries with union
    let finalGeometry = geometries[0];
    if (geometries.length > 1) {
      for (let i = 1; i < geometries.length; i++) {
        finalGeometry = wasmModule.union(finalGeometry, geometries[i]);
      }
    }

    if (!finalGeometry) {
      return {
        geometry: null,
        errors: [{ message: 'No geometry generated' }],
        success: false,
        executionTime: performance.now() - startTime,
      };
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

    case 'children':
      // Children nodes are handled in parent context
      return null;

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

  // Unary operators
  if (!expr.right && expr.left !== undefined) {
    const left = evaluateExpression(expr.left, context);
    switch (operator) {
      case '!': return !left;
      case '-': return -left;
      default: return left;
    }
  }

  // Binary operators
  const left = evaluateExpression(expr.left, context);
  const right = evaluateExpression(expr.right, context);

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
    return {
      vertices: Array.from(this.vertexCache.slice(0, vertexCount * 3)),
      indices: Array.from(this.indexCache.slice(0, indexCount)),
      normals: Array.from(this.normalCache.slice(0, normalCount * 3)),
      bounds: wasmGeom.bounds,
      stats: {
        vertexCount: vertexCount,
        faceCount: indexCount / 3,
      },
    };
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

    return {
      vertices: vertices as number[],
      indices: indices as number[],
      normals: normals as number[],
      bounds: wasmGeom.bounds,
      stats: {
        vertexCount: wasmGeom.stats.vertex_count,
        faceCount: wasmGeom.stats.face_count,
      },
    };
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
 * Convert WASM geometry to standard Geometry format (JSON-serializable)
 */
function convertWasmGeometry(wasmGeom: any): Geometry {
  return geometryConverter.convertWasmGeometry(wasmGeom);
}
