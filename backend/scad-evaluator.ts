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

interface EvaluationContext {
  variables: Map<string, any>;
  functions: Map<string, ScadNode>;
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
    errors: [],
  };

  try {
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    // First pass: collect function definitions
    for (const node of ast) {
      if (node.type === 'function') {
        context.functions.set((node as any).name, node);
      }
    }

    // Second pass: evaluate statements and collect geometries
    const geometries: any[] = [];
    for (const node of ast) {
      if (node.type !== 'function') {
        const result = await evaluateNode(node, context);
        if (result) {
          geometries.push(result);
        }
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
    const geometryJson = JSON.parse(finalGeometry.to_json());
    const geometry = convertWasmGeometry(geometryJson);

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

  switch (node.op) {
    case 'cube':
      // Handle positional: cube(size) or named: cube(size=10)
      const cube_size = params._positional ?? params.size ?? 10;
      return wasmModule.create_cube(cube_size);

    case 'sphere':
      // Handle positional: sphere(r) or named: sphere(r=5, $fn=20)
      const sphere_r = params._positional ?? params.r ?? params.radius ?? (params.d ? params.d / 2 : undefined) ?? (params.diameter ? params.diameter / 2 : undefined) ?? 10;
      const sphere_detail = params.$fn ?? params.detail ?? 20;
      return wasmModule.create_sphere(sphere_r, sphere_detail);

    case 'cylinder':
      // Handle positional: cylinder(h, r) or named params
      const cyl_h = Array.isArray(params._positional) ? params._positional[0] : (params._positional ?? params.h ?? params.height ?? 10);
      const cyl_r = Array.isArray(params._positional) && params._positional[1] ? params._positional[1] : (params.r ?? params.radius ?? 5);
      const cyl_r1 = params.r1 ?? cyl_r;
      const cyl_r2 = params.r2 ?? cyl_r;
      const cyl_detail = params.$fn ?? params.detail ?? 20;
      const cyl_r_avg = (cyl_r1 + cyl_r2) / 2;
      return wasmModule.create_cylinder(cyl_r_avg, cyl_h, cyl_detail);

    case 'cone':
      const cone_h = Array.isArray(params._positional) ? params._positional[0] : (params._positional ?? params.h ?? params.height ?? 10);
      const cone_r = Array.isArray(params._positional) && params._positional[1] ? params._positional[1] : (params.r ?? params.radius ?? 5);
      const cone_detail = params.$fn ?? params.detail ?? 20;
      return wasmModule.create_cone(cone_r, cone_h, cone_detail);

    case 'circle':
      const circ_r = params._positional ?? params.r ?? params.radius ?? (params.d ? params.d / 2 : undefined) ?? (params.diameter ? params.diameter / 2 : undefined) ?? 5;
      const circ_detail = params.$fn ?? params.detail ?? 20;
      return wasmModule.create_circle(circ_r, circ_detail);

    case 'square':
      const sq_size = params._positional ?? params.size ?? 10;
      return wasmModule.create_square(sq_size);

    default:
      context.errors.push({ message: `Unknown primitive: ${node.op}` });
      return null;
  }
}

async function evaluateTransform(node: any, context: EvaluationContext): Promise<any> {
  if (!wasmModule) throw new Error('WASM module not initialized');

  // Evaluate children
  let geometry = null;
  for (const child of node.children) {
    const childGeom = await evaluateNode(child, context);
    if (childGeom) {
      geometry = childGeom;
      break; // For now, take first geometry (proper implementation would combine)
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
      // For simplicity, rotate around z-axis by default
      if (rot_v[2] !== 0) {
        return wasmModule.rotate_z(geometry, rot_a);
      } else if (rot_v[1] !== 0) {
        return wasmModule.rotate_y(geometry, rot_a);
      } else {
        return wasmModule.rotate_x(geometry, rot_a);
      }

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

function evaluateParameters(params: Record<string, any>, context: EvaluationContext): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    result[key] = evaluateValue(value, context);
  }

  return result;
}

function evaluateValue(value: any, context: EvaluationContext): any {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map((v) => evaluateValue(v, context));
    }
    return value;
  }

  if (typeof value === 'string' && context.variables.has(value)) {
    return context.variables.get(value);
  }

  return value;
}

/**
 * Convert WASM geometry to standard Geometry format (JSON-serializable)
 */
function convertWasmGeometry(wasmGeom: any): Geometry {
  // Convert to plain arrays for JSON serialization
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
