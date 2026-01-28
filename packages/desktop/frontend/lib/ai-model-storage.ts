/**
 * Browser-based AI model storage using IndexedDB
 *
 * Stores AI-generated models persistently in the browser using IndexedDB.
 * Each model includes geometry data, GLB file, and metadata.
 */

import type { AIModelMetadata, GenerationResult, ModelStorage } from '@moicad/sdk/ai';

const DB_NAME = 'moicad-ai-models';
const STORE_NAME = 'models';
const DB_VERSION = 1;

export class BrowserModelStorage implements ModelStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return Promise.resolve();
    }

    // Create new initialization promise
    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error(`IndexedDB error: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'modelId' });

          // Create indexes for querying
          store.createIndex('createdAt', 'metadata.createdAt', { unique: false });
          store.createIndex('source', 'metadata.source', { unique: false });
          store.createIndex('polycount', 'metadata.polycount', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save model to IndexedDB
   */
  async save(modelId: string, result: GenerationResult): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put({
        modelId,
        ...result
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save model: ${request.error?.message}`));
    });
  }

  /**
   * Load model from IndexedDB
   */
  async load(modelId: string): Promise<GenerationResult | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(modelId);

      request.onsuccess = () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }

        resolve({
          modelId: data.modelId,
          geometry: data.geometry,
          glbData: data.glbData,
          metadata: data.metadata
        });
      };

      request.onerror = () => reject(new Error(`Failed to load model: ${request.error?.message}`));
    });
  }

  /**
   * List all models in storage
   */
  async list(): Promise<AIModelMetadata[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result.map((r: any) => ({
          ...r.metadata,
          id: r.modelId
        }));

        // Sort by creation date (newest first)
        models.sort((a: AIModelMetadata, b: AIModelMetadata) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        resolve(models);
      };

      request.onerror = () => reject(new Error(`Failed to list models: ${request.error?.message}`));
    });
  }

  /**
   * Delete model from storage
   */
  async delete(modelId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(modelId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete model: ${request.error?.message}`));
    });
  }

  /**
   * Check if model exists
   */
  async exists(modelId: string): Promise<boolean> {
    const model = await this.load(modelId);
    return model !== null;
  }

  /**
   * Get storage usage statistics
   */
  async getStats(): Promise<{
    totalModels: number;
    totalSize: number;
    oldestModel: string | null;
    newestModel: string | null;
  }> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result;

        let totalSize = 0;
        let oldestDate = Infinity;
        let newestDate = -Infinity;
        let oldestModel: string | null = null;
        let newestModel: string | null = null;

        for (const model of models) {
          // Estimate size (GLB data + geometry JSON)
          const glbSize = model.glbData?.byteLength || 0;
          const geometrySize = JSON.stringify(model.geometry).length;
          totalSize += glbSize + geometrySize;

          const createdAt = new Date(model.metadata.createdAt).getTime();
          if (createdAt < oldestDate) {
            oldestDate = createdAt;
            oldestModel = model.modelId;
          }
          if (createdAt > newestDate) {
            newestDate = createdAt;
            newestModel = model.modelId;
          }
        }

        resolve({
          totalModels: models.length,
          totalSize,
          oldestModel,
          newestModel
        });
      };

      request.onerror = () => reject(new Error(`Failed to get stats: ${request.error?.message}`));
    });
  }

  /**
   * Clear all models from storage
   */
  async clear(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear storage: ${request.error?.message}`));
    });
  }
}

// Singleton instance
let browserStorage: BrowserModelStorage | null = null;

/**
 * Get singleton instance of BrowserModelStorage
 */
export function getBrowserStorage(): BrowserModelStorage {
  if (!browserStorage) {
    browserStorage = new BrowserModelStorage();
  }
  return browserStorage;
}
