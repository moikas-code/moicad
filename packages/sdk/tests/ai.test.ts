/**
 * AI Module Tests
 *
 * Tests for AI-powered 3D generation functionality
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { AIGenerator, GLBLoader, MemoryModelStorage } from '../dist/ai/index.js';
import type { AIGeneratorConfig, TextTo3DParams, AIModelMetadata } from '../dist/ai/types.js';

describe('AI Module', () => {
  describe('Exports', () => {
    it('should export AIGenerator class', () => {
      expect(AIGenerator).toBeDefined();
      expect(typeof AIGenerator).toBe('function');
    });

    it('should export GLBLoader class', () => {
      expect(GLBLoader).toBeDefined();
      expect(typeof GLBLoader).toBe('function');
    });

    it('should export MemoryModelStorage class', () => {
      expect(MemoryModelStorage).toBeDefined();
      expect(typeof MemoryModelStorage).toBe('function');
    });
  });

  describe('MemoryModelStorage', () => {
    it('should create storage instance', () => {
      const storage = new MemoryModelStorage();
      expect(storage).toBeDefined();
    });

    it('should save and load models', async () => {
      const storage = new MemoryModelStorage();

      const mockResult = {
        modelId: 'test-123',
        geometry: {
          vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
          indices: [0, 1, 2],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1]
        },
        metadata: {
          id: 'test-123',
          source: 'text-to-3d' as const,
          prompt: 'test cube',
          polycount: 3,
          createdAt: new Date().toISOString()
        }
      };

      await storage.save('test-123', mockResult);
      const loaded = await storage.load('test-123');

      expect(loaded).toBeDefined();
      expect(loaded.geometry.vertices).toEqual(mockResult.geometry.vertices);
      expect(loaded.metadata.prompt).toBe('test cube');
    });

    it('should list stored models', async () => {
      const storage = new MemoryModelStorage();

      const mockResult1 = {
        modelId: 'test-1',
        geometry: {
          vertices: [0, 0, 0],
          indices: [0],
          normals: [0, 0, 1]
        },
        metadata: {
          id: 'test-1',
          source: 'text-to-3d' as const,
          prompt: 'model 1',
          polycount: 1,
          createdAt: new Date().toISOString()
        }
      };

      const mockResult2 = {
        modelId: 'test-2',
        geometry: {
          vertices: [0, 0, 0],
          indices: [0],
          normals: [0, 0, 1]
        },
        metadata: {
          id: 'test-2',
          source: 'image-to-3d' as const,
          imageUrl: 'https://example.com/image.jpg',
          polycount: 1,
          createdAt: new Date().toISOString()
        }
      };

      await storage.save('test-1', mockResult1);
      await storage.save('test-2', mockResult2);

      const models = await storage.list();
      expect(models.length).toBe(2);
      expect(models.some(m => m.id === 'test-1')).toBe(true);
      expect(models.some(m => m.id === 'test-2')).toBe(true);
    });

    it('should delete models', async () => {
      const storage = new MemoryModelStorage();

      const mockResult = {
        modelId: 'test-delete',
        geometry: {
          vertices: [0, 0, 0],
          indices: [0],
          normals: [0, 0, 1]
        },
        metadata: {
          id: 'test-delete',
          source: 'text-to-3d' as const,
          prompt: 'delete me',
          polycount: 1,
          createdAt: new Date().toISOString()
        }
      };

      await storage.save('test-delete', mockResult);
      let models = await storage.list();
      expect(models.length).toBe(1);

      await storage.delete('test-delete');
      models = await storage.list();
      expect(models.length).toBe(0);
    });

    it('should check if model exists', async () => {
      const storage = new MemoryModelStorage();

      const mockResult = {
        modelId: 'test-exists',
        geometry: {
          vertices: [0, 0, 0],
          indices: [0],
          normals: [0, 0, 1]
        },
        metadata: {
          id: 'test-exists',
          source: 'text-to-3d' as const,
          prompt: 'exists test',
          polycount: 1,
          createdAt: new Date().toISOString()
        }
      };

      expect(await storage.exists('test-exists')).toBe(false);
      await storage.save('test-exists', mockResult);
      expect(await storage.exists('test-exists')).toBe(true);
    });
  });

  describe('AIGenerator', () => {
    it('should create generator with API key', () => {
      const storage = new MemoryModelStorage();
      const generator = new AIGenerator({
        apiKey: 'fal_test_key',
        storage
      });

      expect(generator).toBeDefined();
    });

    it('should accept empty API key (validation happens on use)', () => {
      // Constructor doesn't validate - validation happens when API is called
      const generator = new AIGenerator({
        apiKey: '',
        storage: new MemoryModelStorage()
      });
      expect(generator).toBeDefined();
    });
  });

  describe('GLBLoader', () => {
    it('should create GLBLoader instance', () => {
      const loader = new GLBLoader();
      expect(loader).toBeDefined();
    });

    // Note: Actual GLB loading requires valid GLB file data
    // and would need integration tests with real files
  });
});

describe('AI Module Integration', () => {
  it('should export all required types', () => {
    // This test verifies TypeScript compilation succeeded
    // and all types are available for import
    const config: AIGeneratorConfig = {
      apiKey: 'test',
      storage: new MemoryModelStorage()
    };

    const textParams: Partial<TextTo3DParams> = {
      prompt: 'test',
      mode: 'preview'
    };

    const metadata: Partial<AIModelMetadata> = {
      id: 'test',
      source: 'text-to-3d',
      prompt: 'test',
      polycount: 100,
      createdAt: new Date().toISOString()
    };

    expect(config).toBeDefined();
    expect(textParams).toBeDefined();
    expect(metadata).toBeDefined();
  });
});
