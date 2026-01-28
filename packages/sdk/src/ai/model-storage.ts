import type { AIModelMetadata, GenerationResult, ModelStorage } from './types';

/**
 * In-memory storage (for testing, not persistent)
 */
export class MemoryModelStorage implements ModelStorage {
  private models = new Map<string, GenerationResult>();

  async save(modelId: string, result: GenerationResult): Promise<void> {
    this.models.set(modelId, result);
  }

  async load(modelId: string): Promise<GenerationResult | null> {
    return this.models.get(modelId) || null;
  }

  async list(): Promise<AIModelMetadata[]> {
    return Array.from(this.models.values()).map(r => r.metadata);
  }

  async delete(modelId: string): Promise<void> {
    this.models.delete(modelId);
  }

  async exists(modelId: string): Promise<boolean> {
    return this.models.has(modelId);
  }
}

/**
 * Filesystem storage (Node.js/Bun)
 * For CLI tools or backend usage
 */
export class FileModelStorage implements ModelStorage {
  private baseDir: string;

  constructor(baseDir: string = './ai-models') {
    this.baseDir = baseDir;
  }

  async save(modelId: string, result: GenerationResult): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create base directory if it doesn't exist
    await fs.mkdir(this.baseDir, { recursive: true });

    const modelDir = path.join(this.baseDir, modelId);
    await fs.mkdir(modelDir, { recursive: true });

    // Save GLB file
    await fs.writeFile(
      path.join(modelDir, 'model.glb'),
      Buffer.from(result.glbData)
    );

    // Save geometry JSON
    await fs.writeFile(
      path.join(modelDir, 'geometry.json'),
      JSON.stringify(result.geometry, null, 2)
    );

    // Save metadata JSON
    await fs.writeFile(
      path.join(modelDir, 'metadata.json'),
      JSON.stringify(result.metadata, null, 2)
    );
  }

  async load(modelId: string): Promise<GenerationResult | null> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const modelDir = path.join(this.baseDir, modelId);

    try {
      // Check if directory exists
      await fs.access(modelDir);

      // Load GLB file
      const glbData = await fs.readFile(path.join(modelDir, 'model.glb'));

      // Load geometry JSON
      const geometryJson = await fs.readFile(path.join(modelDir, 'geometry.json'), 'utf-8');
      const geometry = JSON.parse(geometryJson);

      // Load metadata JSON
      const metadataJson = await fs.readFile(path.join(modelDir, 'metadata.json'), 'utf-8');
      const metadata = JSON.parse(metadataJson);

      return {
        modelId,
        geometry,
        glbData: glbData.buffer,
        metadata
      };
    } catch (error) {
      // Directory or files don't exist
      return null;
    }
  }

  async list(): Promise<AIModelMetadata[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      // Check if base directory exists
      await fs.access(this.baseDir);

      // List all subdirectories
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const modelIds = entries.filter(e => e.isDirectory()).map(e => e.name);

      // Load metadata for each model
      const metadataList: AIModelMetadata[] = [];
      for (const modelId of modelIds) {
        const metadataPath = path.join(this.baseDir, modelId, 'metadata.json');
        try {
          const metadataJson = await fs.readFile(metadataPath, 'utf-8');
          const metadata = JSON.parse(metadataJson);
          metadataList.push({ ...metadata, id: modelId });
        } catch (error) {
          // Skip invalid models
          continue;
        }
      }

      return metadataList;
    } catch (error) {
      // Base directory doesn't exist
      return [];
    }
  }

  async delete(modelId: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const modelDir = path.join(this.baseDir, modelId);

    try {
      // Remove directory recursively
      await fs.rm(modelDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  }

  async exists(modelId: string): Promise<boolean> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const modelDir = path.join(this.baseDir, modelId);

    try {
      await fs.access(modelDir);
      return true;
    } catch (error) {
      return false;
    }
  }
}
