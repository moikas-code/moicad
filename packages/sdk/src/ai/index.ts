/**
 * @moicad/sdk/ai - AI-powered 3D generation
 *
 * @example
 * ```typescript
 * import { AIGenerator } from '@moicad/sdk/ai';
 *
 * const ai = new AIGenerator({ apiKey: 'fal_...' });
 * const result = await ai.generateFromText({
 *   prompt: "modern office chair",
 *   mode: 'full'
 * });
 *
 * const geometry = result.geometry;
 * ```
 */

export { AIGenerator } from './generator';
export { GLBLoader } from './glb-loader';
export { MemoryModelStorage, FileModelStorage } from './model-storage';
export { decomposeMesh, mergeMeshes } from './mesh-utils';

export type {
  AIGeneratorConfig,
  TextTo3DParams,
  ImageTo3DParams,
  UltrashapeParams,
  AIModelMetadata,
  ModelStorage,
  GenerationResult
} from './types';
