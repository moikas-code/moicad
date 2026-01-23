'use client';

import { GeometryResponse } from '@/lib/api-client';
import { useViewportControls } from './ViewportControlsContext';

interface StatsOverlayProps {
  geometry: GeometryResponse | null;
}

export default function StatsOverlay({ geometry }: StatsOverlayProps) {
  const { showStatsOverlay } = useViewportControls();
  
  if (!geometry || !showStatsOverlay) return null;

  const { vertexCount, faceCount } = geometry.stats;
  const { min, max } = geometry.bounds;

  // Calculate dimensions
  const dimensions = {
    x: (max[0] - min[0]).toFixed(2),
    y: (max[1] - min[1]).toFixed(2),
    z: (max[2] - min[2]).toFixed(2),
  };

  return (
    <div className="absolute top-4 left-4 bg-[#2D2D2D]/95 backdrop-blur-sm border border-[#3D3D3D] rounded-lg p-3 text-xs text-[#A0A0A0] shadow-lg pointer-events-none">
      <div className="font-semibold text-white mb-2">Geometry Stats</div>
      
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span>Vertices:</span>
          <span className="text-white font-mono">{vertexCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Faces:</span>
          <span className="text-white font-mono">{faceCount.toLocaleString()}</span>
        </div>
        
        <div className="border-t border-[#3D3D3D] my-2" />
        
        <div className="font-semibold text-white mb-1">Dimensions</div>
        <div className="flex justify-between gap-4">
          <span>W:</span>
          <span className="text-white font-mono">{dimensions.x}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>H:</span>
          <span className="text-white font-mono">{dimensions.y}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>D:</span>
          <span className="text-white font-mono">{dimensions.z}</span>
        </div>
        
        <div className="border-t border-[#3D3D3D] my-2" />
        
        <div className="font-semibold text-white mb-1">Bounds</div>
        <div className="text-[#808080] text-xs font-mono">
          <div>Min: [{min.join(', ')}]</div>
          <div>Max: [{max.join(', ')}]</div>
        </div>
      </div>
    </div>
  );
}