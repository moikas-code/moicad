import type { Geometry } from '../types';

export interface AIGeneratorConfig {
  apiKey: string;
  storage?: ModelStorage;
}

export interface TextTo3DParams {
  prompt: string;
  mode?: 'preview' | 'full';
  artStyle?: 'realistic' | 'sculpture';
  topology?: 'quad' | 'triangle';
  polycount?: number;
  enablePBR?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ImageTo3DParams {
  imageUrl: string;
  topology?: 'quad' | 'triangle';
  polycount?: number;
  shouldTexture?: boolean;
  enablePBR?: boolean;
  texturePrompt?: string;
  onProgress?: (progress: number) => void;
}

export interface UltrashapeParams {
  modelId: string;
  referenceImageUrl: string;
  octreeResolution?: number;
  inferenceSteps?: number;
  onProgress?: (progress: number) => void;
}

export interface AIModelMetadata {
  id?: string;
  source: 'text-to-3d' | 'image-to-3d' | 'ultrashape';
  prompt?: string;
  imageUrl?: string;
  createdAt: string;
  polycount: number;
  thumbnail?: string;
  glbUrl?: string;
}

export interface GenerationResult {
  modelId: string;
  geometry: Geometry;
  glbData: ArrayBuffer;
  metadata: AIModelMetadata;
}

export interface ModelStorage {
  save(modelId: string, result: GenerationResult): Promise<void>;
  load(modelId: string): Promise<GenerationResult | null>;
  list(): Promise<AIModelMetadata[]>;
  delete(modelId: string): Promise<void>;
  exists(modelId: string): Promise<boolean>;
}
