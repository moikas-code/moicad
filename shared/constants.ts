// Shared constants for moicad

// OpenSCAD keywords
export const SCAD_KEYWORDS = [
  'cube', 'sphere', 'cylinder', 'cone', 'polygon', 'polyhedron', 'circle', 'square',
  'translate', 'rotate', 'scale', 'mirror', 'multmatrix', 'color',
  'union', 'difference', 'intersection', 'hull', 'minkowski',
  'linear_extrude', 'rotate_extrude', 'projection', 'offset', 'resize',
  'for', 'let', 'function', 'module', 'include', 'use', 'import',
  'if', 'else', 'echo', 'surface',
  'true', 'false', 'undef',
] as const;

// OpenSCAD special variables
export const SPECIAL_VARIABLES = [
  '$fn',      // Fragment number (facets)
  '$fa',      // Fragment angle in degrees
  '$fs',      // Fragment size in mm
  '$t',       // Animation time (0-1)
  '$children', // Number of module children
  '$vpr',     // Viewport rotation [x, y, z] in degrees
  '$vpt',     // Viewport translation [x, y, z]
  '$vpd',     // Viewport camera distance
  '$vpf',     // Viewport field of view in degrees
  '$preview', // Preview mode flag
] as const;

// Default values for special variables
export const DEFAULT_SPECIAL_VARIABLES = {
  $fn: 0,
  $fa: 12,
  $fs: 2,
  $t: 0,
  $children: 0,
  $vpr: [0, 0, 0],
  $vpt: [0, 0, 0],
  $vpd: 100,
  $vpf: 45,
  $preview: true,
} as const;

// Primitive operators
export const PRIMITIVES = [
  'cube', 'sphere', 'cylinder', 'cone', 'polygon', 'polyhedron', 'text', 'surface',
 ] as const;

// Boolean operations
export const BOOLEAN_OPS = ['union', 'difference', 'intersection', 'hull', 'minkowski'] as const;

// Transformation operations
export const TRANSFORMS = [
  'translate', 'rotate', 'scale', 'mirror', 'multmatrix', 'color',
  'linear_extrude', 'rotate_extrude', 'projection', 'offset', 'resize',
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
  text: { text: "", size: 10, spacing: 1 },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  PARSE: '/api/parse',
  EVALUATE: '/api/evaluate',
  EXPORT: '/api/export',
  WS: 'ws://localhost:42069/ws',
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
