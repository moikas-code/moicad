'use client';

import { useEffect, useRef } from 'react';

interface DemoViewportProps {
  geometry: any;
  width: string;
  height: string;
}

export default function DemoViewport({ geometry, width, height }: DemoViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!geometry || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple 3D to 2D projection for visualization
    // Convert typed arrays to regular arrays for mapping
    const verticesFlat: number[] = geometry.vertices
      ? (Array.isArray(geometry.vertices) ? Array.from(geometry.vertices) : [])
      : [];
    const indices: number[] = geometry.indices
      ? (Array.isArray(geometry.indices) ? Array.from(geometry.indices) : [])
      : [];
    const bounds = geometry.bounds || { min: [0, 0, 0], max: [10, 10, 10] };
    const normalsFlat: number[] = geometry.normals
      ? (Array.isArray(geometry.normals) ? Array.from(geometry.normals) : [])
      : [];

    // Chunk flat vertices array into triplets [x,y,z]
    const vertices: number[][] = [];
    for (let i = 0; i < verticesFlat.length; i += 3) {
      vertices.push([verticesFlat[i], verticesFlat[i + 1], verticesFlat[i + 2]]);
    }

    // Chunk flat normals array into triplets [nx,ny,nz]
    const normals: number[][] = [];
    for (let i = 0; i < normalsFlat.length; i += 3) {
      normals.push([normalsFlat[i], normalsFlat[i + 1], normalsFlat[i + 2]]);
    }

    // Set canvas size
    const scale = Math.min(
      canvas.width / (bounds.max[0] - bounds.min[0] || 100),
      canvas.height / (bounds.max[1] - bounds.min[1] || 100)
    ) * 0.8; // Scale to fit with padding

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw vertices
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;

    // Simple orthographic projection
    const projectedVertices = vertices.map((v: number[]) => {
      //sif (!v || v.length < 3) return null;
      const [x, y, z] = v;
      // Simple orthographic projection (looking down from above)
      const projX = (x - bounds.min[0]) * scale + canvas.width * 0.1;
      const projY = (y - bounds.min[1]) * scale + canvas.height * 0.1;
      return [projX, projY];
    });

    // Draw faces
    const drawFace = (i: number) => {
      const face = geometry.indices.slice(i * 3, (i + 1) * 3);
      ctx.beginPath();

      // Get projected vertices for this face
      const v0 = projectedVertices[face[0]];
      const v1 = projectedVertices[face[1]];
      const v2 = projectedVertices[face[2]];

      if (v0 && v1 && v2) {
        ctx.moveTo(v0[0], v0[1]);
        ctx.lineTo(v1[0], v1[1]);
        ctx.lineTo(v2[0], v2[1]);
        ctx.closePath();
        ctx.stroke();

        // Fill with different color based on normal
        if (normals && normals[i]) {
          const [nx, ny, nz] = normals[i];
          // Simple lighting: brighter if facing up
          const brightness = Math.max(0.3, Math.abs(nz));
          const r = Math.floor(96 + brightness * 159);
          const g = Math.floor(64 + brightness * 127);
          const b = Math.floor(40 + brightness * 100);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
        }
      }
    };

    // Draw all faces
    const faceCount = geometry.indices.length / 3;
    for (let i = 0; i < faceCount; i++) {
      drawFace(i);
    }

    // Draw stats text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`Vertices: ${geometry.stats?.vertexCount || 0}`, 10, 20);
    ctx.fillText(`Faces: ${geometry.stats?.faceCount || 0}`, 10, 40);
    if (geometry.stats?.volume) {
      ctx.fillText(`Volume: ${geometry.stats.volume.toFixed(2)}`, 10, 60);
    }

  }, [geometry, width, height]);

  if (!geometry) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800"
        style={{ width, height }}
      >
        <div className="text-4xl mb-2">📦</div>
        <div className="text-gray-400 text-center">
          <div className="text-4xl mb-2">Your 3D model will appear here</div>
          <div className="text-sm mt-2">Write some code and click "Run"</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg">
      <canvas
        ref={canvasRef}
        width={parseInt(width)}
        height={parseInt(height)}
        className="w-full h-full"
      />
      {geometry && (
        <div className="absolute top-2 left-2 bg-slate-800 bg-opacity-90 rounded p-2 text-xs text-white font-mono">
          <div className="mb-1 text-green-400">🎯 3D Viewport (Simple)</div>
          <div className="text-gray-300">
            Vertices: {geometry.stats?.vertexCount || 0} |
            Faces: {geometry.stats?.faceCount || 0}
          </div>
        </div>
      )}
    </div>
  );
}
