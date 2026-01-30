/**
 * useGeometry Hook - Manages geometry state and rendering with error recovery
 * 
 * Key feature: Keeps previous successful geometry when errors occur,
 * allowing users to see what worked before while fixing issues.
 */

import { useState, useCallback, useRef } from 'react';
import { GeometryResponse } from '@/lib/api-client';
import { RenderProgress } from '@moicad/sdk';

export interface GeometryState {
  geometry: GeometryResponse | null;
  loading: boolean;
  error: string | null;
  executionTime: number | null;
  previousGeometry: GeometryResponse | null; // Keeps last successful render
  renderAttemptCount: number;
  lastSuccessfulRender: Date | null;
}

export interface GeometryUpdate {
  geometry: GeometryResponse | null;
  errors: string[];
  executionTime: number;
}

export function useGeometry() {
  const [state, setState] = useState<GeometryState>({
    geometry: null,
    loading: false,
    error: null,
    executionTime: null,
    previousGeometry: null,
    renderAttemptCount: 0,
    lastSuccessfulRender: null,
  });

  // Track if we're currently processing a render to prevent state conflicts
  const isRenderingRef = useRef(false);

  /**
   * Set new geometry (successful render)
   */
  const setGeometry = useCallback((geometry: GeometryResponse | null) => {
    setState((prev) => ({
      ...prev,
      geometry,
      error: null,
      previousGeometry: geometry || prev.previousGeometry, // Keep as fallback
      lastSuccessfulRender: geometry ? new Date() : prev.lastSuccessfulRender,
      renderAttemptCount: prev.renderAttemptCount + 1,
    }));
    isRenderingRef.current = false;
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
    }));
    isRenderingRef.current = loading;
  }, []);

  /**
   * Set error - CRITICAL: Does NOT clear geometry!
   * This preserves the previous successful render for reference.
   */
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
      // Intentionally NOT clearing geometry here
      // Users can still see their last successful render
      loading: false,
      renderAttemptCount: prev.renderAttemptCount + 1,
    }));
    isRenderingRef.current = false;
  }, []);

  /**
   * Set execution time
   */
  const setExecutionTime = useCallback((time: number | null) => {
    setState((prev) => ({
      ...prev,
      executionTime: time,
    }));
  }, []);

  /**
   * Update geometry from evaluation response
   * Preserves previous geometry on error
   */
  const updateGeometry = useCallback((response: GeometryUpdate) => {
    try {
      if (response.errors.length > 0) {
        // Error occurred - set error but KEEP existing geometry
        setError(response.errors.join('\n'));
      } else if (response.geometry && response.geometry.vertices && response.geometry.indices) {
        // Success - update geometry
        setGeometry(response.geometry);
      } else if (response.geometry) {
        // Invalid geometry data
        setError('Invalid geometry data received');
      } else {
        // No geometry and no errors - this is odd
        setError('No geometry generated');
      }
      setExecutionTime(response.executionTime);
    } catch (error) {
      console.error('Error updating geometry:', error);
      setError('Failed to update geometry');
    }
  }, [setGeometry, setError, setExecutionTime]);

  /**
   * Clear all geometry and errors (for "New File" operations)
   */
  const clearGeometry = useCallback(() => {
    setState({
      geometry: null,
      loading: false,
      error: null,
      executionTime: null,
      previousGeometry: null,
      renderAttemptCount: 0,
      lastSuccessfulRender: null,
    });
    isRenderingRef.current = false;
  }, []);

  /**
   * Reset to previous successful geometry (recovery option)
   */
  const restorePreviousGeometry = useCallback(() => {
    setState((prev) => {
      if (prev.previousGeometry) {
        return {
          ...prev,
          geometry: prev.previousGeometry,
          error: null,
        };
      }
      return prev;
    });
  }, []);

  /**
   * Force clear error while keeping current geometry
   */
  const dismissError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Start a new render attempt
   */
  const startRender = useCallback(() => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    isRenderingRef.current = true;
  }, []);

  /**
   * Update render progress
   */
  const updateProgress = useCallback((progress: RenderProgress) => {
    // Progress updates don't change state directly
    // They can be used by components to show progress UI
    return progress;
  }, []);

  return {
    ...state,
    isRendering: isRenderingRef.current,
    setGeometry,
    setLoading,
    setError,
    setExecutionTime,
    updateGeometry,
    clearGeometry,
    restorePreviousGeometry,
    dismissError,
    startRender,
    updateProgress,
  };
}
