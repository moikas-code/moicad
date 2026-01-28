/**
 * React hook for AI 3D model generation
 *
 * Provides a simple interface for generating 3D models from text or images
 * with progress tracking and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { AIGenerator } from '@moicad/sdk/ai';
import type { TextTo3DParams, ImageTo3DParams, GenerationResult } from '@moicad/sdk/ai';
import { getAPIKey, updateAPIKeyUsage } from '@/lib/api-key-storage';
import { getBrowserStorage } from '@/lib/ai-model-storage';

export interface AIGenerationState {
  loading: boolean;
  progress: number;
  stage: string;
  error: string | null;
}

export function useAIGeneration() {
  const [state, setState] = useState<AIGenerationState>({
    loading: false,
    progress: 0,
    stage: '',
    error: null
  });

  const generatorRef = useRef<AIGenerator | null>(null);

  /**
   * Get or create AI generator instance
   */
  const getGenerator = useCallback(async (): Promise<AIGenerator> => {
    if (generatorRef.current) {
      return generatorRef.current;
    }

    const apiKey = await getAPIKey('fal.ai');
    if (!apiKey) {
      throw new Error('fal.ai API key not configured');
    }

    const storage = getBrowserStorage();
    await storage.init();

    generatorRef.current = new AIGenerator({
      apiKey,
      storage
    });

    return generatorRef.current;
  }, []);

  /**
   * Generate 3D model from text prompt
   */
  const generateFromText = useCallback(async (
    params: Omit<TextTo3DParams, 'onProgress'>
  ): Promise<GenerationResult> => {
    setState({
      loading: true,
      progress: 0,
      stage: 'Initializing...',
      error: null
    });

    try {
      const generator = await getGenerator();

      setState(prev => ({ ...prev, stage: 'Queuing generation...' }));

      const result = await generator.generateFromText({
        ...params,
        onProgress: (p) => {
          setState(prev => ({
            ...prev,
            progress: p,
            stage: p < 50 ? 'Queued...' : 'Generating...'
          }));
        }
      });

      setState({
        loading: false,
        progress: 100,
        stage: 'Complete',
        error: null
      });

      // Update API key usage timestamp
      await updateAPIKeyUsage('fal.ai');

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setState({
        loading: false,
        progress: 0,
        stage: '',
        error: errorMessage
      });
      throw err;
    }
  }, [getGenerator]);

  /**
   * Generate 3D model from image
   */
  const generateFromImage = useCallback(async (
    params: Omit<ImageTo3DParams, 'onProgress'>
  ): Promise<GenerationResult> => {
    setState({
      loading: true,
      progress: 0,
      stage: 'Initializing...',
      error: null
    });

    try {
      const generator = await getGenerator();

      setState(prev => ({ ...prev, stage: 'Queuing generation...' }));

      const result = await generator.generateFromImage({
        ...params,
        onProgress: (p) => {
          setState(prev => ({
            ...prev,
            progress: p,
            stage: p < 50 ? 'Queued...' : 'Generating...'
          }));
        }
      });

      setState({
        loading: false,
        progress: 100,
        stage: 'Complete',
        error: null
      });

      // Update API key usage timestamp
      await updateAPIKeyUsage('fal.ai');

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setState({
        loading: false,
        progress: 0,
        stage: '',
        error: errorMessage
      });
      throw err;
    }
  }, [getGenerator]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      progress: 0,
      stage: '',
      error: null
    });
  }, []);

  return {
    ...state,
    generateFromText,
    generateFromImage,
    reset
  };
}
