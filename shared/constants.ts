// Shared constants for moicad

// OpenSCAD keywords
export const SCAD_KEYWORDS = [
  'cube', 'sphere', 'cylinder', 'cone', 'polygon', 'polyhedron', 'circle', 'square',
  'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
  'union', 'difference', 'intersection', 'hull', 'minkowski',
  'linear_extrude', 'rotate_extrude',
  'for', 'let', 'function', 'module', 'include', 'use', 'import',
  'if', 'else', 'echo',
  'true', 'false', 'undef',
] as const;

// Primitive operators
export const PRIMITIVES = [
  'cube', 'sphere', 'cylinder', 'cone', 'circle', 'square',
  'polygon', 'polyhedron', 'text',
] as const;

// Boolean operations
export const BOOLEAN_OPS = ['union', 'difference', 'intersection', 'hull'] as const;

// Transformation operations
export const TRANSFORMS = [
  'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
  'minkowski', 'linear_extrude', 'rotate_extrude',
] as const;

// Mathematical functions
export const MATH_FUNCTIONS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'abs', 'sign', 'pow', 'sqrt', 'exp', 'log', 'ln', 'round', 'floor', 'ceil',
  'min', 'max', 'len', 'str', 'chr',
] as const;

// Default parameter values
export const DEFAULT_PARAMS = {
  cube: { size: 10 },
  sphere: { r: 10, radius: 10, d: undefined, diameter: undefined, $fn: 20 },
  cylinder: { h: 10, r: 5, d: undefined, r1: 5, r2: 5, d1: undefined, d2: undefined, $fn: 20 },
  cone: { h: 10, r: 5, d: undefined, $fn: 20 },
  circle: { r: 5, d: undefined, $fn: 20 },
  square: { size: 10 },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  PARSE: '/api/parse',
  EVALUATE: '/api/evaluate',
  EXPORT: '/api/export',
  WS: 'ws://localhost:3000/ws',
} as const;

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  PARSE: 'parse',
  EVALUATE: 'evaluate',
  EXPORT: 'export',
  ERROR: 'error',
  RESPONSE: 'response',
} as const;

// Error codes
export const ERROR_CODES = {
  PARSE_ERROR: 'PARSE_ERROR',
  EVAL_ERROR: 'EVAL_ERROR',
  UNKNOWN_PRIMITIVE: 'UNKNOWN_PRIMITIVE',
  INVALID_PARAMS: 'INVALID_PARAMS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Three.js settings
export const THREE_JS_CONFIG = {
  INITIAL_CAMERA_Z: 50,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 10000,
  FOV: 75,
  AMBIENT_LIGHT: 0x888888,
  DIRECTIONAL_LIGHT_1: 0xffffff,
  DIRECTIONAL_LIGHT_2: 0xffffff,
} as const;

// UI settings
export const UI_CONFIG = {
  EDITOR_DEBOUNCE_MS: 300,
  DEFAULT_THEME: 'vs-dark',
  EDITOR_FONT_SIZE: 14,
  VIEWPORT_MIN_SIZE: 300,
} as const;

// Performance thresholds
export const PERFORMANCE_TARGETS = {
  PARSE_TIME_MS: 50,
  EVALUATE_TIME_MS: 100,
  WEBSOCKET_LATENCY_MS: 50,
  RENDER_FPS: 60,
} as const;
