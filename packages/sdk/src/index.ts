/**
 * @moicad/sdk - Modern JavaScript CAD Library
 *
 * A high-performance CAD library for JavaScript/TypeScript with 98-99% OpenSCAD compatibility.
 *
 * @version 0.1.2
 * @author moicad
 * @license MIT
 *
 * @example Fluent API (recommended)
 * ```typescript
 * import { Shape } from '@moicad/sdk';
 *
 * const model = Shape.cube(10)
 *   .union(Shape.sphere(5).translate([15, 0, 0]))
 *   .color('red');
 *
 * export default model;
 * ```
 *
 * @example Functional API
 * ```typescript
 * import { cube, sphere, translate, union, color } from '@moicad/sdk';
 *
 * const model = color('red',
 *   union(
 *     cube(10),
 *     translate([15, 0, 0], sphere(5))
 *   )
 * );
 *
 * export default model;
 * ```
 */

// ============================================================================
// CORE SHAPE CLASS
// ============================================================================

export { Shape } from './shape';

// ============================================================================
// FUNCTIONAL API
// ============================================================================

export {
  // 3D Primitives
  cube,
  sphere,
  cylinder,
  cone,
  polyhedron,
  // 2D Primitives
  circle,
  square,
  polygon,
  // Advanced Primitives
  text,
  surface,
  // Transforms
  translate,
  rotate,
  scale,
  mirror,
  multmatrix,
  color,
  // Boolean Operations
  union,
  difference,
  intersection,
  hull,
  minkowski,
  // 2D/3D Operations
  linearExtrude,
  rotateExtrude,
  offset,
  projection,
} from './functional';

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Basic types
  PrimitiveOptions,
  Color,
  Vector3,
  Vector2,
  TextOptions,
  SurfaceOptions,
  LinearExtrudeOptions,
  RotateExtrudeOptions,
  OffsetOptions,
  ProjectionOptions,
  Geometry,
  BoundingBox,
  ParseResult,
  EvaluateResult,
} from './types';

// Re-export geometry types for convenience
export type {
  ScadNode,
  ColorInfo,
  ModifierInfo,
  HighlightInfo,
  GeometryObject,
  ParseError,
  EvaluationError,
  WsMessage,
  ExportOptions,
  ExportResult,
  RenderStage,
  RenderProgress,
  ProgressMessage,
} from './types/geometry-types';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export {
  // Vector schemas
  Vector2Schema,
  Vector3Schema,
  // Color schema
  ColorSchema,
  // Size schemas
  SizeSchema,
  Size2DSchema,
  // Primitive parameter schemas
  CubeParamsSchema,
  SphereParamsSchema,
  CylinderParamsSchema,
  ConeParamsSchema,
  CircleParamsSchema,
  SquareParamsSchema,
  PolygonParamsSchema,
  PolyhedronParamsSchema,
  // Transform parameter schemas
  TranslateParamsSchema,
  RotateParamsSchema,
  ScaleParamsSchema,
  MirrorParamsSchema,
  // Extrusion schemas
  LinearExtrudeParamsSchema,
  RotateExtrudeParamsSchema,
  // Geometry schemas
  BoundsSchema,
  GeometryStatsSchema,
  GeometrySchema,
  // Evaluation schemas
  ParseErrorSchema,
  ParseResultSchema,
  EvaluationErrorSchema,
  EvaluateResultSchema,
} from './schemas';

// Re-export Zod-inferred types with distinct names to avoid conflicts
export type {
  CubeParams,
  SphereParams,
  CylinderParams,
  ConeParams,
  CircleParams,
  SquareParams,
  PolygonParams,
  PolyhedronParams,
  TranslateParams,
  RotateParams,
  ScaleParams,
  MirrorParams,
  LinearExtrudeParams,
  RotateExtrudeParams,
  Bounds,
  GeometryStats,
  GeometryOutput,
  ParseResultOutput,
  EvaluateResultOutput,
} from './schemas';

// ============================================================================
// MANIFOLD ENGINE
// ============================================================================

export { initManifold, isManifoldInitialized } from './manifold/engine';

// ============================================================================
// VIEWPORT (Three.js 3D Rendering)
// ============================================================================

export { Viewport, ViewportControls, StatsOverlay } from './viewport';
export type { SceneConfig, ViewportConfig, ViewportEventHandlers, CameraState } from './viewport';

// ============================================================================
// VERSION AND METADATA
// ============================================================================

export const VERSION = '0.1.2';

export function getInfo() {
  return {
    name: '@moicad/sdk',
    version: VERSION,
    description: 'Modern JavaScript CAD Library with OpenSCAD Compatibility',
    engines: {
      node: '18.0+',
      bun: '1.0+',
    },
    features: [
      'Fluent API (Shape class)',
      'Functional API',
      'OpenSCAD compatibility (98-99%)',
      'TypeScript support',
      'Zod validation schemas',
      'Browser and Node.js support',
      'manifold-3d CSG engine',
    ],
  };
}
