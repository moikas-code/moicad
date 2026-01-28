import { fal } from "@fal-ai/client";
import type {
  AIGeneratorConfig,
  TextTo3DParams,
  ImageTo3DParams,
  UltrashapeParams,
  GenerationResult,
  AIModelMetadata
} from './types';
import { GLBLoader } from './glb-loader';
import type { ModelStorage } from './types';

export class AIGenerator {
  private storage?: ModelStorage;

  constructor(config: AIGeneratorConfig) {
    this.storage = config.storage;

    // Configure fal.ai client
    fal.config({ credentials: config.apiKey });
  }

  /**
   * Generate 3D model from text prompt
   */
  async generateFromText(params: TextTo3DParams): Promise<GenerationResult> {
    const result = await fal.subscribe("fal-ai/meshy/v6-preview/text-to-3d", {
      input: {
        prompt: params.prompt,
        mode: params.mode || 'full',
        art_style: params.artStyle || 'realistic',
        topology: params.topology || 'triangle',
        target_polycount: params.polycount || 30000,
        enable_pbr: params.enablePBR || false
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        params.onProgress?.(update.status === 'IN_PROGRESS' ? 50 : 10);
      }
    }) as any;

    // Download GLB file
    const glbResponse = await fetch(result.data.model_glb.url);
    const glbData = await glbResponse.arrayBuffer();

    // Convert to Geometry
    const loader = new GLBLoader();
    const geometry = await loader.load(glbData);

    // Generate model ID
    const modelId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const metadata: AIModelMetadata = {
      source: 'text-to-3d',
      prompt: params.prompt,
      createdAt: new Date().toISOString(),
      thumbnail: result.data.thumbnail?.url,
      glbUrl: result.data.model_glb.url,
      polycount: geometry.stats.vertexCount
    };

    // Store if storage provided
    if (this.storage) {
      await this.storage.save(modelId, {
        modelId,
        geometry,
        glbData,
        metadata
      });
    }

    return {
      modelId,
      geometry,
      glbData,
      metadata
    };
  }

  /**
   * Generate 3D model from image
   */
  async generateFromImage(params: ImageTo3DParams): Promise<GenerationResult> {
    const result = await fal.subscribe("fal-ai/meshy/v6-preview/image-to-3d", {
      input: {
        image_url: params.imageUrl,
        topology: params.topology || 'triangle',
        target_polycount: params.polycount || 30000,
        should_texture: params.shouldTexture || true,
        enable_pbr: params.enablePBR || false,
        texture_prompt: params.texturePrompt
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        params.onProgress?.(update.status === 'IN_PROGRESS' ? 50 : 10);
      }
    }) as any;

    // Download GLB file
    const glbResponse = await fetch(result.data.model_glb.url);
    const glbData = await glbResponse.arrayBuffer();

    // Convert to Geometry
    const loader = new GLBLoader();
    const geometry = await loader.load(glbData);

    // Generate model ID
    const modelId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const metadata: AIModelMetadata = {
      source: 'image-to-3d',
      imageUrl: params.imageUrl,
      createdAt: new Date().toISOString(),
      thumbnail: result.data.thumbnail?.url,
      glbUrl: result.data.model_glb.url,
      polycount: geometry.stats.vertexCount
    };

    // Store if storage provided
    if (this.storage) {
      await this.storage.save(modelId, {
        modelId,
        geometry,
        glbData,
        metadata
      });
    }

    return {
      modelId,
      geometry,
      glbData,
      metadata
    };
  }

  /**
   * Refine existing mesh with Ultrashape
   */
  async refineMesh(params: UltrashapeParams): Promise<GenerationResult> {
    // First, load the existing model
    if (!this.storage) {
      throw new Error('Storage required for mesh refinement');
    }

    const existingModel = await this.storage.load(params.modelId);
    if (!existingModel) {
      throw new Error(`Model not found: ${params.modelId}`);
    }

    // Upload GLB to temporary storage using fal.storage
    const glbBlob = new Blob([existingModel.glbData], { type: 'model/gltf-binary' });
    const file = new File([glbBlob], 'model.glb', { type: 'model/gltf-binary' });

    // Upload using fal storage API
    const modelUrl = await fal.storage.upload(file);

    // Run Ultrashape refinement
    const result = await fal.subscribe("fal-ai/ultrashape", {
      input: {
        model_url: modelUrl,
        reference_image_url: params.referenceImageUrl,
        octree_resolution: params.octreeResolution || 512,
        inference_steps: params.inferenceSteps || 50
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        params.onProgress?.(update.status === 'IN_PROGRESS' ? 50 : 10);
      }
    }) as any;

    // Download refined GLB
    const glbResponse = await fetch(result.data.model_glb.url);
    const glbData = await glbResponse.arrayBuffer();

    // Convert to Geometry
    const loader = new GLBLoader();
    const geometry = await loader.load(glbData);

    // Generate new model ID
    const modelId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const metadata: AIModelMetadata = {
      source: 'ultrashape',
      prompt: existingModel.metadata.prompt,
      imageUrl: params.referenceImageUrl,
      createdAt: new Date().toISOString(),
      thumbnail: result.data.thumbnail?.url,
      glbUrl: result.data.model_glb.url,
      polycount: geometry.stats.vertexCount
    };

    // Store refined model
    await this.storage.save(modelId, {
      modelId,
      geometry,
      glbData,
      metadata
    });

    return {
      modelId,
      geometry,
      glbData,
      metadata
    };
  }

  /**
   * Load model from storage
   */
  async loadModel(modelId: string): Promise<GenerationResult | null> {
    if (!this.storage) {
      throw new Error('No storage configured');
    }

    return await this.storage.load(modelId);
  }

  /**
   * List all stored models
   */
  async listModels(): Promise<AIModelMetadata[]> {
    if (!this.storage) {
      throw new Error('No storage configured');
    }

    return await this.storage.list();
  }

  /**
   * Delete model from storage
   */
  async deleteModel(modelId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('No storage configured');
    }

    await this.storage.delete(modelId);
  }
}
