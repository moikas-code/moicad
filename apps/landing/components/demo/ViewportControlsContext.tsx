import { createContext, useContext, ReactNode, useState } from "react";
import { SceneManager } from "@/lib/three-utils";

interface ViewportControlsContextType {
  setSceneManager: (manager: SceneManager | null) => void;
  resetView: () => void;
  zoomToFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setViewOrientation: (orientation: string) => void;
  projectionMode: 'perspective' | 'orthographic';
  setProjectionMode: (mode: 'perspective' | 'orthographic') => void;
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
}

const ViewportControlsContext = createContext<ViewportControlsContextType | undefined>(
  undefined
);

interface ViewportControlsProviderProps {
  children: ReactNode;
}

export function ViewportControlsProvider({ children }: ViewportControlsProviderProps) {
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [projectionMode, setProjectionModeState] = useState<'perspective' | 'orthographic'>('perspective');
  const [showGrid, setShowGrid] = useState(true);
  const [showEdges, setShowEdges] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showScaleMarkers, setShowScaleMarkers] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState(false);

  const contextValue: ViewportControlsContextType = {
    setSceneManager,
    resetView: () => sceneManager?.resetView(),
    zoomToFit: () => sceneManager?.zoomToFit(),
    zoomIn: () => sceneManager?.zoomIn(),
    zoomOut: () => sceneManager?.zoomOut(),
    setViewOrientation: (orientation: string) => sceneManager?.setViewOrientation(orientation as any),
    projectionMode,
    setProjectionMode: (mode: 'perspective' | 'orthographic') => {
      setProjectionModeState(mode);
      sceneManager?.setProjectionMode(mode);
    },
    showGrid,
    toggleGrid: () => setShowGrid(!showGrid),
    showEdges,
    toggleEdges: () => setShowEdges(!showEdges),
    showAxes,
    toggleAxes: () => setShowAxes(!showAxes),
    showScaleMarkers,
    toggleScaleMarkers: () => setShowScaleMarkers(!showScaleMarkers),
    showCrosshair,
    toggleCrosshair: () => setShowCrosshair(!showCrosshair),
    showStatsOverlay,
    toggleStatsOverlay: () => setShowStatsOverlay(!showStatsOverlay),
  };

  return (
    <ViewportControlsContext.Provider value={contextValue}>
      {children}
    </ViewportControlsContext.Provider>
  );
}

export function useViewportControls(): ViewportControlsContextType {
  const context = useContext(ViewportControlsContext);
  if (context === undefined) {
    throw new Error("useViewportControls must be used within a ViewportControlsProvider");
  }
  return context;
}
