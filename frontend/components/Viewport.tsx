'use client';

import { useEffect, useRef, useState } from 'react';
import { SceneManager } from '@/lib/three-utils';
import { GeometryResponse } from '@/lib/api-client';
import StatsOverlay from './StatsOverlay';
import { ViewportControlsProvider, useViewportControls } from './ViewportControlsContext';
import { PrinterPreset } from '@/lib/printer-presets';

interface ViewportProps {
  geometry: GeometryResponse | null;
  printerSize?: PrinterPreset;
}

function ViewportInner({ geometry, printerSize }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const { setSceneManager } = useViewportControls();
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const config = {
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      printerSize: printerSize ? {
        width: printerSize.width,
        depth: printerSize.depth,
        height: printerSize.height,
        name: `${printerSize.manufacturer} ${printerSize.name}`
      } : undefined
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
  }, [setSceneManager, printerSize]);

  // Update printer size when it changes
  useEffect(() => {
    if (sceneRef.current && printerSize) {
      sceneRef.current.updatePrinterSize({
        width: printerSize.width,
        depth: printerSize.depth,
        height: printerSize.height,
        name: `${printerSize.manufacturer} ${printerSize.name}`
      });
    }
  }, [printerSize]);

  // Update geometry when it changes
  useEffect(() => {
    try {
      if (geometry && sceneRef.current && geometry.vertices && geometry.indices && geometry.bounds) {
        sceneRef.current.renderGeometry(geometry);
        
        // Setup highlighting callbacks
        sceneRef.current.setHoverCallback((objectId: string | null) => {
          setHoveredObject(objectId);
          // Handle hover - could highlight corresponding code in editor
          console.log('Hovered object:', objectId);
        });
        
        sceneRef.current.setSelectCallback((objectIds: string[]) => {
          setSelectedObjects(objectIds);
          // Handle selection - could select corresponding code in editor
          console.log('Selected objects:', objectIds);
        });
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
      
      {/* Highlighting status overlay */}
      {(hoveredObject || selectedObjects.length > 0) && (
        <div className="absolute top-4 left-4 bg-[#1D1D1D] border border-[#4772B3] rounded p-2 text-white text-sm z-10">
          {hoveredObject && (
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span>Hover: {hoveredObject}</span>
            </div>
          )}
          {selectedObjects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
              <span>Selected: {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => {
            sceneRef.current?.clearHighlighting();
            setSelectedObjects([]);
            setHoveredObject(null);
          }}
          className="px-3 py-1 bg-[#4772B3] hover:bg-[#5882C3] text-white text-sm rounded transition-colors"
        >
          Clear Selection
        </button>
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
