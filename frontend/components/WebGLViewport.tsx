'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WebGLRenderer, CameraControls, Vec3 } from '@/lib/webgl';
import { GeometryResponse } from '@/lib/api-client';
import StatsOverlay from './StatsOverlay';

interface WebGLViewportProps {
  geometry: GeometryResponse | null;
}

export default function WebGLViewport({ geometry }: WebGLViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const controlsRef = useRef<CameraControls | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Animation loop
  const animate = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.render();
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    try {
      // Create renderer
      rendererRef.current = new WebGLRenderer({
        canvas: canvasRef.current,
        clearColor: [0, 0, 0], // Black background like OpenSCAD
      });

      // Set initial size
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      rendererRef.current.resize(width, height);

      // Create camera controls
      controlsRef.current = new CameraControls(canvasRef.current, {
        position: [100, 100, 100],
        target: [0, 0, 0],
        up: [0, 0, 1], // Z-up like OpenSCAD
      });

      // Update renderer when camera changes
      controlsRef.current.setOnChange(() => {
        const state = controlsRef.current!.getState();
        rendererRef.current!.setCamera(state.position, state.target, state.up);
      });

      // Set initial camera
      const state = controlsRef.current.getState();
      rendererRef.current.setCamera(state.position, state.target, state.up);

      // Start animation loop
      animate();

      console.log('Custom WebGL renderer initialized');
    } catch (error) {
      console.error('Failed to initialize WebGL renderer:', error);
    }

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [animate]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!containerRef.current || !rendererRef.current || !canvasRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        rendererRef.current.resize(width, height);
      }, 16);
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  // Update geometry when it changes
  useEffect(() => {
    if (!geometry || !rendererRef.current) return;
    if (!geometry.vertices || !geometry.indices || !geometry.normals) return;

    try {
      // Convert arrays to typed arrays
      const vertices = new Float32Array(geometry.vertices);
      const normals = new Float32Array(geometry.normals);
      const indices = new Uint32Array(geometry.indices);

      rendererRef.current.setMesh({ vertices, normals, indices });

      // Fit camera to bounds
      if (geometry.bounds && controlsRef.current) {
        const min: Vec3 = [
          geometry.bounds.min[0],
          geometry.bounds.min[1],
          geometry.bounds.min[2],
        ];
        const max: Vec3 = [
          geometry.bounds.max[0],
          geometry.bounds.max[1],
          geometry.bounds.max[2],
        ];
        controlsRef.current.fitToBounds(min, max, 2.0);

        // Update camera in renderer
        const state = controlsRef.current.getState();
        rendererRef.current.setCamera(state.position, state.target, state.up);
      }

      console.log(`Loaded mesh: ${vertices.length / 3} vertices, ${indices.length / 3} triangles`);
    } catch (error) {
      console.error('Failed to update geometry:', error);
    }
  }, [geometry]);

  const resetView = useCallback(() => {
    if (controlsRef.current && rendererRef.current && geometry?.bounds) {
      const min: Vec3 = [
        geometry.bounds.min[0],
        geometry.bounds.min[1],
        geometry.bounds.min[2],
      ];
      const max: Vec3 = [
        geometry.bounds.max[0],
        geometry.bounds.max[1],
        geometry.bounds.max[2],
      ];
      controlsRef.current.fitToBounds(min, max, 2.0);
      const state = controlsRef.current.getState();
      rendererRef.current.setCamera(state.position, state.target, state.up);
    } else if (controlsRef.current && rendererRef.current) {
      controlsRef.current.reset([100, 100, 100], [0, 0, 0]);
      const state = controlsRef.current.getState();
      rendererRef.current.setCamera(state.position, state.target, state.up);
    }
  }, [geometry]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
      style={{ position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Stats overlay */}
      <StatsOverlay geometry={geometry} />

      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={resetView}
          className="px-3 py-1 bg-[#4772B3] hover:bg-[#5882C3] text-white text-sm rounded transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* Renderer label */}
      <div className="absolute bottom-4 left-4 text-white text-xs opacity-50">
        Custom WebGL Renderer
      </div>
    </div>
  );
}
