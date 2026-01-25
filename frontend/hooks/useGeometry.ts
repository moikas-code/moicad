/**
 * useGeometry Hook - Manages geometry state and rendering
 */

import { useState, useCallback } from 'react';
import { GeometryResponse } from '@/lib/api-client';

export interface GeometryState {
  geometry: GeometryResponse | null;
  loading: boolean;
  error: string | null;
  executionTime: number | null;
}

export function useGeometry() {
  const [state, setState] = useState<GeometryState>({
    geometry: null,
    loading: false,
    error: null,
    executionTime: null,
  });

  const setGeometry = useCallback((geometry: GeometryResponse | null) => {
    setState((prev) => ({
      ...prev,
      geometry,
      error: null,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
      geometry: error ? null : prev.geometry,
    }));
  }, []);

  const setExecutionTime = useCallback((time: number | null) => {
    setState((prev) => ({
      ...prev,
      executionTime: time,
    }));
  }, []);

  const updateGeometry = useCallback((response: { geometry: GeometryResponse | null; errors: string[]; executionTime: number }) => {
    try {
      if (response.errors.length > 0) {
        setError(response.errors.join('\n'));
      } else if (response.geometry && response.geometry.vertices && response.geometry.indices) {
        setGeometry(response.geometry);
      } else if (response.geometry) {
        setError('Invalid geometry data received');
      }
      setExecutionTime(response.executionTime);
    } catch (error) {
      console.error('Error updating geometry:', error);
      setError('Failed to update geometry');
    }
  }, [setGeometry, setError, setExecutionTime]);

  const clearGeometry = useCallback(() => {
    setState({
      geometry: null,
      loading: false,
      error: null,
      executionTime: null,
    });
  }, []);

  return {
    ...state,
    setGeometry,
    setLoading,
    setError,
    setExecutionTime,
    updateGeometry,
    clearGeometry,
  };
}
