/**
 * Zod validation schemas for moicad SDK
 *
 * These schemas provide runtime validation for shape parameters
 * and geometry data.
 */

import { z } from 'zod';

// ============================================================================
// VECTOR SCHEMAS
// ============================================================================

export const Vector2Schema = z.tuple([z.number(), z.number()]);
export const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

// ============================================================================
// COLOR SCHEMAS
// ============================================================================

export const ColorSchema = z.union([
  z.string(), // CSS color name or hex
  z.tuple([z.number(), z.number(), z.number()]), // RGB
  z.tuple([z.number(), z.number(), z.number(), z.number()]), // RGBA
]);

// ============================================================================
// SIZE SCHEMAS
// ============================================================================

export const SizeSchema = z.union([
  z.number().positive(),
  z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
]);

export const Size2DSchema = z.union([
  z.number().positive(),
  z.tuple([z.number().positive(), z.number().positive()]),
]);

// ============================================================================
// PRIMITIVE PARAMETER SCHEMAS
// ============================================================================

export const CubeParamsSchema = z.object({
  size: SizeSchema,
  center: z.boolean().optional(),
});

export const SphereParamsSchema = z.object({
  radius: z.number().positive(),
  $fn: z.number().int().positive().optional(),
  $fa: z.number().positive().optional(),
  $fs: z.number().positive().optional(),
});

export const CylinderParamsSchema = z.object({
  height: z.number().positive(),
  radius: z.union([
    z.number().positive(),
    z.tuple([z.number().positive(), z.number().positive()]), // [r1, r2]
  ]),
  center: z.boolean().optional(),
  $fn: z.number().int().positive().optional(),
});

export const ConeParamsSchema = z.object({
  height: z.number().positive(),
  radius: z.number().positive(),
  center: z.boolean().optional(),
  $fn: z.number().int().positive().optional(),
});

export const CircleParamsSchema = z.object({
  radius: z.number().positive(),
  $fn: z.number().int().positive().optional(),
});

export const SquareParamsSchema = z.object({
  size: Size2DSchema,
  center: z.boolean().optional(),
});

export const PolygonParamsSchema = z.object({
  points: z.array(Vector2Schema),
  paths: z.array(z.array(z.number().int().nonnegative())).optional(),
});

export const PolyhedronParamsSchema = z.object({
  points: z.array(Vector3Schema),
  faces: z.array(z.array(z.number().int().nonnegative())),
});

// ============================================================================
// TRANSFORM PARAMETER SCHEMAS
// ============================================================================

export const TranslateParamsSchema = z.object({
  offset: Vector3Schema,
});

export const RotateParamsSchema = z.object({
  angles: Vector3Schema,
});

export const ScaleParamsSchema = z.object({
  factors: z.union([
    z.number().positive(),
    Vector3Schema,
  ]),
});

export const MirrorParamsSchema = z.object({
  normal: Vector3Schema,
});

// ============================================================================
// EXTRUSION PARAMETER SCHEMAS
// ============================================================================

export const LinearExtrudeParamsSchema = z.object({
  height: z.number().positive(),
  twist: z.number().optional(),
  scale: z.union([z.number().positive(), Vector2Schema]).optional(),
  slices: z.number().int().positive().optional(),
  center: z.boolean().optional(),
  $fn: z.number().int().positive().optional(),
});

export const RotateExtrudeParamsSchema = z.object({
  angle: z.number().positive().max(360).optional(),
  $fn: z.number().int().positive().optional(),
});

// ============================================================================
// GEOMETRY SCHEMAS
// ============================================================================

export const BoundsSchema = z.object({
  min: Vector3Schema,
  max: Vector3Schema,
});

export const GeometryStatsSchema = z.object({
  vertexCount: z.number().int().nonnegative(),
  faceCount: z.number().int().nonnegative(),
  volume: z.number().optional(),
  surfaceArea: z.number().optional(),
});

export const GeometrySchema = z.object({
  vertices: z.array(z.number()),
  indices: z.array(z.number().int().nonnegative()),
  normals: z.array(z.number()),
  bounds: BoundsSchema,
  stats: GeometryStatsSchema.optional(),
});

// ============================================================================
// EVALUATION SCHEMAS
// ============================================================================

export const ParseErrorSchema = z.object({
  message: z.string(),
  line: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  code: z.string(),
});

export const ParseResultSchema = z.object({
  ast: z.any().nullable(),
  errors: z.array(ParseErrorSchema),
  success: z.boolean(),
});

export const EvaluationErrorSchema = z.object({
  message: z.string(),
  line: z.number().int().nonnegative().optional(),
  stack: z.string().optional(),
});

export const EvaluateResultSchema = z.object({
  geometry: GeometrySchema.nullable(),
  errors: z.array(EvaluationErrorSchema),
  success: z.boolean(),
  executionTime: z.number().nonnegative(),
});

// ============================================================================
// INFERRED TYPES (for convenience)
// ============================================================================

export type Vector2 = z.infer<typeof Vector2Schema>;
export type Vector3 = z.infer<typeof Vector3Schema>;
export type Color = z.infer<typeof ColorSchema>;
export type CubeParams = z.infer<typeof CubeParamsSchema>;
export type SphereParams = z.infer<typeof SphereParamsSchema>;
export type CylinderParams = z.infer<typeof CylinderParamsSchema>;
export type ConeParams = z.infer<typeof ConeParamsSchema>;
export type CircleParams = z.infer<typeof CircleParamsSchema>;
export type SquareParams = z.infer<typeof SquareParamsSchema>;
export type PolygonParams = z.infer<typeof PolygonParamsSchema>;
export type PolyhedronParams = z.infer<typeof PolyhedronParamsSchema>;
export type TranslateParams = z.infer<typeof TranslateParamsSchema>;
export type RotateParams = z.infer<typeof RotateParamsSchema>;
export type ScaleParams = z.infer<typeof ScaleParamsSchema>;
export type MirrorParams = z.infer<typeof MirrorParamsSchema>;
export type LinearExtrudeParams = z.infer<typeof LinearExtrudeParamsSchema>;
export type RotateExtrudeParams = z.infer<typeof RotateExtrudeParamsSchema>;
export type Bounds = z.infer<typeof BoundsSchema>;
export type GeometryStats = z.infer<typeof GeometryStatsSchema>;
export type GeometryOutput = z.infer<typeof GeometrySchema>;
export type ParseError = z.infer<typeof ParseErrorSchema>;
export type ParseResultOutput = z.infer<typeof ParseResultSchema>;
export type EvaluationError = z.infer<typeof EvaluationErrorSchema>;
export type EvaluateResultOutput = z.infer<typeof EvaluateResultSchema>;
