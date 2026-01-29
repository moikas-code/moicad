'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface ViewportControlsContextType {
  // View controls
  resetView: () => void;
  zoomToFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  
  // Orientation presets
  setViewOrientation: (position: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'diagonal' | 'center') => void;
  orientation: string;
  
  // Projection mode
  projectionMode: 'perspective' | 'orthographic';
  setProjectionMode: (mode: 'perspective' | 'orthographic') => void;
  
  // Visual toggles
  showGrid: boolean;
  toggleGrid: () => void;
  showEdges: boolean;
  toggleEdges: () => void;
  showAxes: boolean;
  toggleAxes: () => void;
  showScaleMarkers: boolean;
  toggleScaleMarkers: () => void;
  showCrosshair: boolean;
  toggleCrosshair: () => void;
  showStatsOverlay: boolean;
  toggleStatsOverlay: () => void;
  
  // Scene manager reference
  setSceneManager: (manager: any) => void;
}

const ViewportControlsContext = createContext<ViewportControlsContextType | null>(null);

export function ViewportControlsProvider({ children }: { children: ReactNode }) {
  const [sceneManager, setSceneManager] = useState<any>(null);
  const [orientation, setOrientation] = useState('default');
  const [projectionMode, setProjectionMode] = useState<'perspective' | 'orthographic'>('perspective');
  const [showGrid, setShowGrid] = useState(false);
  const [showEdges, setShowEdges] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showScaleMarkers, setShowScaleMarkers] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState(true);

  // Persist state to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('viewport-controls');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setProjectionMode(parsed.projectionMode || 'perspective');
        setShowGrid(parsed.showGrid || false);
        setShowEdges(parsed.showEdges || false);
        setShowAxes(parsed.showAxes !== false); // Default to true
        setShowScaleMarkers(parsed.showScaleMarkers || false);
        setShowCrosshair(parsed.showCrosshair || false);
        setShowStatsOverlay(parsed.showStatsOverlay !== false); // Default to true
      } catch (e) {
        console.warn('Failed to load viewport controls from localStorage:', e);
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    const state = {
      projectionMode,
      showGrid,
      showEdges,
      showAxes,
      showScaleMarkers,
      showCrosshair,
      showStatsOverlay
    };
    localStorage.setItem('viewport-controls', JSON.stringify(state));
  }, [projectionMode, showGrid, showEdges, showAxes, showScaleMarkers, showCrosshair, showStatsOverlay]);

  const resetView = () => {
    if (sceneManager?.resetView) {
      sceneManager.resetView();
      setOrientation('default');
    }
  };

  const zoomToFit = () => {
    if (sceneManager?.zoomToFit) {
      sceneManager.zoomToFit();
      setOrientation('fit');
    }
  };

  const zoomIn = () => {
    if (sceneManager?.zoomIn) {
      sceneManager.zoomIn();
    }
  };

  const zoomOut = () => {
    if (sceneManager?.zoomOut) {
      sceneManager.zoomOut();
    }
  };

  const setViewOrientation = (position: string) => {
    if (sceneManager?.setViewOrientation) {
      sceneManager.setViewOrientation(position);
      setOrientation(position);
    }
  };

  const changeProjectionMode = (mode: 'perspective' | 'orthographic') => {
    if (sceneManager?.setProjectionMode) {
      sceneManager.setProjectionMode(mode);
      setProjectionMode(mode);
    }
  };

  const toggleGrid = () => {
    const newState = !showGrid;
    setShowGrid(newState);
    if (sceneManager?.toggleGrid) {
      sceneManager.toggleGrid(newState);
    }
  };

  const toggleEdges = () => {
    const newState = !showEdges;
    setShowEdges(newState);
    if (sceneManager?.toggleEdges) {
      sceneManager.toggleEdges(newState);
    }
  };

  const toggleAxes = () => {
    const newState = !showAxes;
    setShowAxes(newState);
    if (sceneManager?.toggleAxes) {
      sceneManager.toggleAxes(newState);
    }
  };

  const toggleScaleMarkers = () => {
    const newState = !showScaleMarkers;
    setShowScaleMarkers(newState);
    if (sceneManager?.toggleScaleMarkers) {
      sceneManager.toggleScaleMarkers(newState);
    }
  };

  const toggleCrosshair = () => {
    const newState = !showCrosshair;
    setShowCrosshair(newState);
    if (sceneManager?.toggleCrosshair) {
      sceneManager.toggleCrosshair(newState);
    }
  };

  const toggleStatsOverlay = () => {
    setShowStatsOverlay(!showStatsOverlay);
  };

  return (
    <ViewportControlsContext.Provider
      value={{
        resetView,
        zoomToFit,
        zoomIn,
        zoomOut,
        setViewOrientation,
        orientation,
        projectionMode,
        setProjectionMode: changeProjectionMode,
        showGrid,
        toggleGrid,
        showEdges,
        toggleEdges,
        showAxes,
        toggleAxes,
        showScaleMarkers,
        toggleScaleMarkers,
        showCrosshair,
        toggleCrosshair,
        showStatsOverlay,
        toggleStatsOverlay,
        setSceneManager,
      }}
    >
      {children}
    </ViewportControlsContext.Provider>
  );
}

export function useViewportControls() {
  const context = useContext(ViewportControlsContext);
  if (!context) {
    throw new Error('useViewportControls must be used within a ViewportControlsProvider');
  }
  return context;
}