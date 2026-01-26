import type { ScadNode, EvaluationError } from "../shared/types";

// Minimal context for worker
interface EvaluationContext {
  variables: Map<string, any>;
  functions: Map<string, any>;
  modules: Map<string, any>;
  errors: EvaluationError[];
  children?: ScadNode[];
}

// This is the entry point for our Web Worker.
self.onmessage = async (event) => {
  const { node, context } = event.data;

  try {
    const result = await evaluateNode(node, context);
    self.postMessage({ result });
  } catch (error: any) {
    self.postMessage({ error: { message: error.message, stack: error.stack } });
  }
};

// --- Evaluation logic (subset of scad-evaluator.ts) ---

async function evaluateNode(
  node: ScadNode,
  context: EvaluationContext,
): Promise<any> {
  // This worker does not have access to the WASM module, so it can only
  // evaluate parts of the tree that are pure JavaScript.

  switch (node.type) {
    case "primitive":
      // Primitives require WASM, so we can't evaluate them here.
      // We'll return a placeholder that the main thread can then use
      // to call the real WASM function.
      return {
        _isPlaceholder: true,
        type: "primitive",
        op: (node as any).op,
        params: (node as any).params,
      };

    case "transform":
      return evaluateTransform(node as any, context);

    case "boolean":
      return evaluateBooleanOp(node as any, context);

    case "for":
      return evaluateForLoop(node as any, context);

    case "assignment":
      return evaluateAssignment(node as any, context);

    case "if":
      return evaluateIf(node as any, context);

    case "module_call":
      return evaluateModuleCall(node as any, context);

    case "echo":
    case "assert":
      // These have side effects (console.log) which are fine in a worker
      return null;

    case "function_def":
    case "module_def":
      // Handled in the main thread's first pass
      return null;

    case "children":
      return await evaluateChildren(node as any, context);

    case "let":
      return evaluateLet(node as any, context);

    default:
      // For unknown nodes, we'll just return a placeholder
      return { _isPlaceholder: true, ...node };
  }
}

async function evaluateTransform(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const childGeometries = [];
  for (const child of node.children) {
    const childGeom = await evaluateNode(child, context);
    if (childGeom) {
      childGeometries.push(childGeom);
    }
  }

  // We can't apply the transform here, but we can return a placeholder
  // with the evaluated children.
  return {
    _isPlaceholder: true,
    type: "transform",
    op: node.op,
    params: evaluateParameters(node.params, context),
    children: childGeometries,
  };
}

async function evaluateBooleanOp(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const childGeometries = [];
  for (const child of node.children) {
    const childGeom = await evaluateNode(child, context);
    if (childGeom) {
      childGeometries.push(childGeom);
    }
  }

  return {
    _isPlaceholder: true,
    type: "boolean",
    op: node.op,
    children: childGeometries,
  };
}

async function evaluateForLoop(
  node: any,
  context: EvaluationContext,
): Promise<any> {
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

  const geometries: any[] = [];
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

  for (const value of range_arr) {
    context.variables.set(variable, value);
    for (const bodyNode of node.body) {
      const geom = await evaluateNode(bodyNode, context);
      if (geom) {
        geometries.push(geom);
      }
    }
  }

  // Return a placeholder for a union of the generated geometries
  return {
    _isPlaceholder: true,
    type: "boolean",
    op: "union",
    children: geometries,
  };
}

async function evaluateIf(node: any, context: EvaluationContext): Promise<any> {
  const condition = evaluateExpression(node.condition, context);
  const isTrue = Boolean(condition);
  const bodyToEvaluate = isTrue ? node.thenBody : node.elseBody || [];

  const geometries: any[] = [];
  for (const bodyNode of bodyToEvaluate) {
    const geom = await evaluateNode(bodyNode, context);
    if (geom) {
      geometries.push(geom);
    }
  }

  return {
    _isPlaceholder: true,
    type: "boolean",
    op: "union",
    children: geometries,
  };
}

async function evaluateModuleCall(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const moduleDef = context.modules.get(node.name);
  if (!moduleDef) {
    context.errors.push({ message: `Unknown module: ${node.name}` });
    return null;
  }

  const moduleContext: EvaluationContext = {
    variables: new Map(context.variables),
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
    children: node.children || [],
  };

  const params = evaluateParameters(node.params, context);
  if (params._positional !== undefined) {
    if (moduleDef.params.length > 0) {
      moduleContext.variables.set(moduleDef.params[0], params._positional);
    }
  }
  for (const [key, value] of Object.entries(params)) {
    if (key !== "_positional") {
      moduleContext.variables.set(key, value);
    }
  }
  moduleContext.variables.set("$children", (node.children || []).length);

  const geometries: any[] = [];
  for (const bodyNode of moduleDef.body) {
    const geom = await evaluateNode(bodyNode, moduleContext);
    if (geom) {
      geometries.push(geom);
    }
  }

  return {
    _isPlaceholder: true,
    type: "boolean",
    op: "union",
    children: geometries,
  };
}

async function evaluateChildren(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  if (!context.children || context.children.length === 0) {
    return null;
  }
  const geometries = [];
  for (const child of context.children) {
    geometries.push(await evaluateNode(child, context));
  }
  return {
    _isPlaceholder: true,
    type: "boolean",
    op: "union",
    children: geometries,
  };
}

async function evaluateLet(
  node: any,
  context: EvaluationContext,
): Promise<any> {
  const letContext: EvaluationContext = {
    variables: new Map(context.variables),
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
  };

  const bindings = node.bindings || {};
  for (const [varName, varValue] of Object.entries(bindings)) {
    const evaluatedValue = evaluateExpression(varValue, letContext);
    letContext.variables.set(varName, evaluatedValue);
  }

  const geometries: any[] = [];
  for (const bodyNode of node.body || []) {
    const geom = await evaluateNode(bodyNode, letContext);
    if (geom) {
      geometries.push(geom);
    }
  }

  return {
    _isPlaceholder: true,
    type: "boolean",
    op: "union",
    children: geometries,
  };
}

function evaluateAssignment(node: any, context: EvaluationContext): any {
  const value = evaluateExpression(node.value, context);
  context.variables.set(node.name, value);
  return null;
}

function evaluateParameters(
  params: Record<string, any>,
  context: EvaluationContext,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    result[key] = evaluateExpression(value, context);
  }
  return result;
}

function evaluateExpression(expr: any, context: EvaluationContext): any {
  if (expr === null || expr === undefined) {
    return null;
  }

  if (typeof expr === "object" && expr.type) {
    switch (expr.type) {
      case "expression":
        return evaluateBinaryExpression(expr, context);
      case "ternary":
        const condition = evaluateExpression(expr.condition, context);
        return Boolean(condition)
          ? evaluateExpression(expr.thenExpr, context)
          : evaluateExpression(expr.elseExpr, context);
      case "function_call":
        return evaluateFunctionCall(expr, context);
      case "variable":
        return context.variables.get(expr.name);
      case "list_comprehension":
        // Not implemented in worker for now
        return [];
      default:
        return expr;
    }
  } else if (Array.isArray(expr)) {
    return expr.map((e) => evaluateExpression(e, context));
  }
  return expr;
}

function evaluateBinaryExpression(expr: any, context: EvaluationContext): any {
  const left = evaluateExpression(expr.left, context);
  const right = evaluateExpression(expr.right, context);
  switch (expr.operator) {
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
    // Built-in functions
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
        return Math.sin(
          (evaluateExpression(call.args[0], context) * Math.PI) / 180,
        );
      case "cos":
        return Math.cos(
          (evaluateExpression(call.args[0], context) * Math.PI) / 180,
        );
      case "tan":
        return Math.tan(
          (evaluateExpression(call.args[0], context) * Math.PI) / 180,
        );
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
      case "len":
        const arg = evaluateExpression(call.args[0], context);
        return Array.isArray(arg) ? arg.length : 0;
      default:
        context.errors.push({
          message: `Unknown function in worker: ${call.name}`,
        });
        return null;
    }
  }

  // User-defined function
  const funcContext: EvaluationContext = {
    variables: new Map(context.variables),
    functions: context.functions,
    modules: context.modules,
    errors: context.errors,
  };

  const evaluatedArgs = call.args.map((arg: any) =>
    evaluateExpression(arg, context),
  );
  funcDef.params.forEach((param: string, idx: number) => {
    (funcContext.variables as Map<string, any>).set(param, evaluatedArgs[idx]);
  });

  return evaluateExpression(funcDef.expression, funcContext);
}
