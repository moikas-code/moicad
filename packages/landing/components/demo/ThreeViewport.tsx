'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/lib/three-utils';

interface ThreeViewportProps {
  geometry: any;
  width: string;
  height: string;
}

export default function ThreeViewport({ geometry, width, height }: ThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const config = {
      container,
      width: rect.width || 800,
      height: rect.height || 600,
      printerSize: {
        width: 256,
        depth: 256,
        height: 300,
        name: 'BambuLab P2S'
      }
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
    if (!geometry || !sceneRef.current) {
      console.log('Geometry or scene not ready:', { hasGeometry: !!geometry, hasScene: !!sceneRef.current });
      return;
    }

    console.log('Rendering geometry:', {
      vertices: geometry.vertices?.length,
      indices: geometry.indices?.length,
      bounds: geometry.bounds,
      stats: geometry.stats
    });

    try {
      if (geometry.vertices && geometry.indices && geometry.bounds) {
        sceneRef.current.renderGeometry(geometry);
        console.log('Geometry rendered successfully');
      } else {
        console.warn('Geometry missing required fields:', {
          hasVertices: !!geometry.vertices,
          hasIndices: !!geometry.indices,
          hasBounds: !!geometry.bounds
        });
      }
    } catch (error) {
      console.error('Failed to render geometry:', error);
    }
  }, [geometry]);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden"
      style={{ width, height }}
    >
      {/* Empty state overlay */}
      {!geometry && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-gray-400 text-center">
            <div className="text-2xl mb-2">Your 3D model will appear here</div>
            <div className="text-sm mt-2 text-gray-500">Write some code and click "Run"</div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {geometry && (
        <div className="absolute top-2 left-2 bg-slate-800 bg-opacity-90 rounded p-3 text-xs text-white font-mono z-10 pointer-events-none">
          <div className="mb-2 text-green-400 font-semibold">🎯 3D Viewport</div>
          <div className="text-gray-300 space-y-1">
            <div>Vertices: {geometry.stats?.vertexCount || 0}</div>
            <div>Faces: {geometry.stats?.faceCount || 0}</div>
            {geometry.stats?.volume && (
              <div>Volume: {geometry.stats.volume.toFixed(2)} mm³</div>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      {geometry && (
        <div className="absolute bottom-2 right-2 bg-slate-800 bg-opacity-90 rounded p-2 text-xs text-gray-400 font-mono z-10 pointer-events-none">
          <div>🖱️ Drag to rotate</div>
          <div>🔍 Scroll to zoom</div>
        </div>
      )}
    </div>
  );
}
