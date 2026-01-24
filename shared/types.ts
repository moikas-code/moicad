// Shared type definitions for moicad

/**
 * AST Node Types for OpenSCAD parsing
 */
export type ScadNode =
  | PrimitiveNode
  | TransformNode
  | BooleanOpNode
  | FunctionDefNode
  | FunctionCallNode
  | ModuleDefNode
  | ModuleCallNode
  | VariableNode
  | AssignmentNode
  | IfNode
  | ExpressionNode
  | ForLoopNode
  | ChildrenNode
  | EchoNode
  | AssertNode
  | LetNode
  | ModifierNode
  | ListComprehensionNode
  | ImportNode;

export interface PrimitiveNode {
  type: 'primitive';
  op: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'circle' | 'square' | 'polygon' | 'polyhedron';
  params: Record<string, any>;
  line?: number;
}

export interface TransformNode {
  type: 'transform';
  op: 'translate' | 'rotate' | 'scale' | 'mirror' | 'multmatrix' | 'color' | 'linear_extrude' | 'rotate_extrude';
  params: Record<string, any>;
  children: ScadNode[];
  line?: number;
}

export interface BooleanOpNode {
  type: 'boolean';
  op: 'union' | 'difference' | 'intersection' | 'hull' | 'minkowski';
  children: ScadNode[];
  line?: number;
}

export interface FunctionDefNode {
  type: 'function_def';
  name: string;
  params: string[];
  expression: any; // For OpenSCAD functions: function f(x) = x * 2;
  line?: number;
}

export interface FunctionCallNode {
  type: 'function_call';
  name: string;
  args: any[];
  line?: number;
}

export interface ModuleDefNode {
  type: 'module_def';
  name: string;
  params: string[];
  body: ScadNode[];
  line?: number;
}

export interface ModuleCallNode {
  type: 'module_call';
  name: string;
  params: Record<string, any>;
  children: ScadNode[];
  line?: number;
}

export interface VariableNode {
  type: 'variable';
  name: string;
  line?: number;
}

export interface AssignmentNode {
  type: 'assignment';
  name: string;
  value: any;
  line?: number;
}

export interface IfNode {
  type: 'if';
  condition: any;
  thenBody: ScadNode[];
  elseBody?: ScadNode[];
  line?: number;
}

export interface ExpressionNode {
  type: 'expression';
  operator: string;
  left: any;
  right?: any;
  line?: number;
}

export interface ForLoopNode {
  type: 'for';
  variable: string;
  range: [number, number] | [number, number, number]; // [start, end] or [start, step, end]
  body: ScadNode[];
  line?: number;
}

export interface ChildrenNode {
  type: 'children';
  children: ScadNode[];
  line?: number;
}

export interface EchoNode {
  type: 'echo';
  values: any[];
  line?: number;
}

export interface AssertNode {
  type: 'assert';
  condition: any;
  message?: any;
  line?: number;
}

export interface LetNode {
  type: 'let';
  bindings: Record<string, any>;
  body: ScadNode[];
  line?: number;
}

export interface ModifierNode {
  type: 'modifier';
  modifier: '!' | '%' | '#' | '*';
  child: ScadNode;
  line?: number;
}

export interface ListComprehensionNode {
  type: 'list_comprehension';
  expression: any;
  comprehensions: Array<{
    variable: string;
    range: [number, number] | [number, number, number];
  }>;
  condition?: any;
  line?: number;
}

export interface ImportNode {
  type: 'import';
  op: 'import' | 'include' | 'use';
  filename: string;
  line?: number;
}

/**
 * Color information for geometry
 */
export interface ColorInfo {
  r: number;     // Red component 0-1
  g: number;     // Green component 0-1  
  b: number;     // Blue component 0-1
  a?: number;    // Alpha component 0-1 (optional)
}

/**
 * Geometry data structure (output from WASM)
 */
export interface Geometry {
  vertices: Float32Array | number[];
  indices: Uint32Array | number[];
  normals: Float32Array | number[];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  stats: {
    vertexCount: number;
    faceCount: number;
    volume?: number;
  };
  color?: ColorInfo;  // Optional color metadata
  modifier?: ModifierInfo; // Optional visualization modifier
}

/**
 * Visualization modifier information
 */
export interface ModifierInfo {
  type: '!' | '%' | '#' | '*';
  // Additional metadata for the frontend could be added here
}

/**
 * Parser result
 */
export interface ParseResult {
  ast: ScadNode[] | null;
  errors: ParseError[];
  success: boolean;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  code: string;
}

/**
 * Evaluator result
 */
export interface EvaluateResult {
  geometry: Geometry | null;
  errors: EvaluationError[];
  success: boolean;
  executionTime: number;
}

export interface EvaluationError {
  message: string;
  line?: number;
  stack?: string;
}

/**
 * WebSocket message types
 */
export interface WsMessage {
  type: 'parse' | 'evaluate' | 'export' | 'error';
  payload: any;
}

export interface EvaluateMessage {
  type: 'evaluate';
  code: string;
  requestId: string;
}

export interface EvaluateResponse {
  type: 'evaluate_response';
  requestId: string;
  geometry: Geometry | null;
  errors: EvaluationError[];
  executionTime: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'stl' | 'obj' | '3mf';
  binary?: boolean; // for STL
  precision?: number;
}

export interface ExportResult {
  data: ArrayBuffer | string;
  format: string;
  filename: string;
}
