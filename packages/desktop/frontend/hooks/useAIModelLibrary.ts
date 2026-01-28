/**
 * React hook for managing AI model library
 *
 * Provides access to stored AI-generated models with CRUD operations.
 */

import { useState, useCallback, useEffect } from 'react';
import type { AIModelMetadata } from '@moicad/sdk/ai';
import { getBrowserStorage } from '@/lib/ai-model-storage';

export interface ModelLibraryState {
  models: AIModelMetadata[];
  loading: boolean;
  error: string | null;
  stats: {
    totalModels: number;
    totalSize: number;
    oldestModel: string | null;
    newestModel: string | null;
  } | null;
}

export function useAIModelLibrary() {
  const [state, setState] = useState<ModelLibraryState>({
    models: [],
    loading: false,
    error: null,
    stats: null
  });

  /**
   * Load all models from storage
   */
  const loadModels = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const storage = getBrowserStorage();
      await storage.init();

      const models = await storage.list();
      const stats = await storage.getStats();

      setState({
        models,
        loading: false,
        error: null,
        stats
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load models';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, []);

  /**
   * Delete a model from storage
   */
  const deleteModel = useCallback(async (modelId: string) => {
    try {
      const storage = getBrowserStorage();
      await storage.delete(modelId);

      // Reload models after deletion
      await loadModels();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete model';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [loadModels]);

  /**
   * Clear all models from storage
   */
  const clearAll = useCallback(async () => {
    try {
      const storage = getBrowserStorage();
      await storage.clear();

      setState({
        models: [],
        loading: false,
        error: null,
        stats: {
          totalModels: 0,
          totalSize: 0,
          oldestModel: null,
          newestModel: null
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear models';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, []);

  /**
   * Load a specific model
   */
  const loadModel = useCallback(async (modelId: string) => {
    try {
      const storage = getBrowserStorage();
      return await storage.load(modelId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, []);

  /**
   * Filter models by criteria
   */
  const filterModels = useCallback((
    criteria: {
      source?: 'text-to-3d' | 'image-to-3d' | 'ultrashape';
      prompt?: string;
      minPolycount?: number;
      maxPolycount?: number;
    }
  ) => {
    let filtered = [...state.models];

    if (criteria.source) {
      filtered = filtered.filter(m => m.source === criteria.source);
    }

    if (criteria.prompt) {
      const searchTerm = criteria.prompt.toLowerCase();
      filtered = filtered.filter(m =>
        m.prompt?.toLowerCase().includes(searchTerm)
      );
    }

    if (criteria.minPolycount !== undefined) {
      filtered = filtered.filter(m => m.polycount >= criteria.minPolycount!);
    }

    if (criteria.maxPolycount !== undefined) {
      filtered = filtered.filter(m => m.polycount <= criteria.maxPolycount!);
    }

    return filtered;
  }, [state.models]);

  /**
   * Sort models by criteria
   */
  const sortModels = useCallback((
    by: 'date' | 'polycount' | 'prompt',
    order: 'asc' | 'desc' = 'desc'
  ) => {
    const sorted = [...state.models];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (by) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'polycount':
          comparison = a.polycount - b.polycount;
          break;
        case 'prompt':
          comparison = (a.prompt || '').localeCompare(b.prompt || '');
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    setState(prev => ({ ...prev, models: sorted }));
  }, [state.models]);

  /**
   * Load models on mount
   */
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return {
    ...state,
    loadModels,
    deleteModel,
    clearAll,
    loadModel,
    filterModels,
    sortModels
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return then.toLocaleDateString();
}
