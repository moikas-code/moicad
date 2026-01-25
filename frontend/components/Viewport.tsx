'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/lib/three-utils';
import { GeometryResponse } from '@/lib/api-client';
import StatsOverlay from './StatsOverlay';
import { ViewportControlsProvider, useViewportControls } from './ViewportControlsContext';

interface ViewportProps {
  geometry: GeometryResponse | null;
}

function ViewportInner({ geometry }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const { setSceneManager } = useViewportControls();

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const config = {
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    };

    sceneRef.current = new SceneManager(config);
    setSceneManager(sceneRef.current);

    // Cleanup on unmount
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
        setSceneManager(null);
      }
    };
  }, [setSceneManager]);

  // Update geometry when it changes
  useEffect(() => {
    try {
      if (geometry && sceneRef.current && geometry.vertices && geometry.indices) {
        sceneRef.current.renderGeometry(geometry);
      }
    } catch (error) {
      console.error('Failed to render geometry:', error);
    }
  }, [geometry]);

  // Handle container resize (e.g., when dragging ResizablePanel divider)
  useEffect(() => {
    if (!containerRef.current || !sceneRef.current) return;

    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !sceneRef.current) return;

      // Debounce resize to avoid ResizeObserver loop warning
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!containerRef.current || !sceneRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        sceneRef.current.resize(width, height);
      }, 16); // One frame at 60fps for layout stability
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#303030]"
      style={{ position: 'relative' }}
    >
      {/* Stats overlay */}
      <StatsOverlay geometry={geometry} />
      
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => sceneRef.current?.resetView()}
          className="px-3 py-1 bg-[#4772B3] hover:bg-[#5882C3] text-white text-sm rounded transition-colors"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}

export default function Viewport({ geometry }: ViewportProps) {
  return (
    <ViewportControlsProvider>
      <ViewportInner geometry={geometry} />
    </ViewportControlsProvider>
  );
}
