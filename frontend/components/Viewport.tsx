'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/lib/three-utils';
import { GeometryResponse } from '@/lib/api-client';

interface ViewportProps {
  geometry: GeometryResponse | null;
}

export default function Viewport({ geometry }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const config = {
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    };

    sceneRef.current = new SceneManager(config);

    // Cleanup on unmount
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, []);

  // Update geometry when it changes
  useEffect(() => {
    if (geometry && sceneRef.current) {
      sceneRef.current.renderGeometry(geometry);
    }
  }, [geometry]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#303030]"
      style={{ position: 'relative' }}
    >
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
