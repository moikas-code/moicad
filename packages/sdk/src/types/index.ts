/**
 * Type exports for @moicad/sdk
 */

// Re-export core types from javascript-types
export type {
  PrimitiveOptions,
  TextOptions,
  SurfaceOptions,
  LinearExtrudeOptions,
  RotateExtrudeOptions,
  OffsetOptions,
  ProjectionOptions,
  Color,
  Vector3,
  Vector2,
  BoundingBox,
} from './javascript-types';

// Re-export geometry types
export type {
  ScadNode,
  Geometry,
  ColorInfo,
  ModifierInfo,
  HighlightInfo,
  GeometryObject,
  ParseResult,
  ParseError,
  EvaluateResult,
  EvaluationError,
  WsMessage,
  ExportOptions,
  ExportResult,
  RenderStage,
  RenderProgress,
  ProgressMessage,
} from './geometry-types';
