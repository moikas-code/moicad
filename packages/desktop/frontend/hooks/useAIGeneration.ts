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

/**
 * Format error message for better user experience
 */
function formatErrorMessage(err: unknown): string {
  let errorMessage = 'Generation failed';

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes('api key') || msg.includes('credentials') || msg.includes('unauthorized')) {
      errorMessage = 'Invalid API key. Please check your Settings and ensure you have a valid fal.ai API key.';
    } else if (msg.includes('timeout') || msg.includes('timed out')) {
      errorMessage = 'Generation timed out after 15 minutes. Try using Preview mode for faster results.';
    } else if (msg.includes('quota') || msg.includes('limit') || msg.includes('rate')) {
      errorMessage = 'API quota exceeded. Please check your fal.ai account billing and usage.';
    } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (msg.includes('not found') || msg.includes('404')) {
      errorMessage = 'Model service not available. The fal.ai endpoint may be temporarily down.';
    } else if (msg.includes('payment') || msg.includes('billing')) {
      errorMessage = 'Payment required. Please check your fal.ai account billing status.';
    } else {
      errorMessage = `Generation failed: ${err.message}`;
    }
  }

  return errorMessage;
}

export function useAIGeneration() {
  const [state, setState] = useState<AIGenerationState>({
    loading: false,
    progress: 0,
    stage: '',
    error: null
  });

  const generatorRef = useRef<AIGenerator | null>(null);
  const timeoutWarningsRef = useRef<NodeJS.Timeout[]>([]);

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
    // Clear any existing timeout warnings
    timeoutWarningsRef.current.forEach(clearTimeout);
    timeoutWarningsRef.current = [];

    setState({
      loading: true,
      progress: 0,
      stage: 'Initializing...',
      error: null
    });

    try {
      const generator = await getGenerator();

      setState(prev => ({ ...prev, stage: 'Queuing generation...' }));

      // Set up timeout warnings
      const warnings = [
        { time: 5 * 60 * 1000, message: 'Still generating... (5 min elapsed)' },
        { time: 10 * 60 * 1000, message: 'Still generating... (10 min elapsed - preview mode is faster!)' },
        { time: 15 * 60 * 1000, message: 'Generation taking longer than expected... (15 min elapsed)' },
      ];

      warnings.forEach(({ time, message }) => {
        const timeout = setTimeout(() => {
          setState(prev => prev.loading ? { ...prev, stage: message } : prev);
        }, time);
        timeoutWarningsRef.current.push(timeout);
      });

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

      // Clear timeout warnings on success
      timeoutWarningsRef.current.forEach(clearTimeout);
      timeoutWarningsRef.current = [];

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
      // Clear timeout warnings on error
      timeoutWarningsRef.current.forEach(clearTimeout);
      timeoutWarningsRef.current = [];

      const errorMessage = formatErrorMessage(err);
      setState({
        loading: false,
        progress: 0,
        stage: '',
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, [getGenerator]);

  /**
   * Generate 3D model from image
   */
  const generateFromImage = useCallback(async (
    params: Omit<ImageTo3DParams, 'onProgress'>
  ): Promise<GenerationResult> => {
    // Clear any existing timeout warnings
    timeoutWarningsRef.current.forEach(clearTimeout);
    timeoutWarningsRef.current = [];

    setState({
      loading: true,
      progress: 0,
      stage: 'Initializing...',
      error: null
    });

    try {
      const generator = await getGenerator();

      setState(prev => ({ ...prev, stage: 'Queuing generation...' }));

      // Set up timeout warnings
      const warnings = [
        { time: 5 * 60 * 1000, message: 'Still generating... (5 min elapsed)' },
        { time: 10 * 60 * 1000, message: 'Still generating... (10 min elapsed)' },
        { time: 15 * 60 * 1000, message: 'Generation taking longer than expected... (15 min elapsed)' },
      ];

      warnings.forEach(({ time, message }) => {
        const timeout = setTimeout(() => {
          setState(prev => prev.loading ? { ...prev, stage: message } : prev);
        }, time);
        timeoutWarningsRef.current.push(timeout);
      });

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

      // Clear timeout warnings on success
      timeoutWarningsRef.current.forEach(clearTimeout);
      timeoutWarningsRef.current = [];

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
      // Clear timeout warnings on error
      timeoutWarningsRef.current.forEach(clearTimeout);
      timeoutWarningsRef.current = [];

      const errorMessage = formatErrorMessage(err);
      setState({
        loading: false,
        progress: 0,
        stage: '',
        error: errorMessage
      });
      throw new Error(errorMessage);
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
