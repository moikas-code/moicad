import { GeometryResponse } from "@/lib/api-client";

interface StatsOverlayProps {
  geometry: GeometryResponse | null;
}

export default function StatsOverlay({ geometry }: StatsOverlayProps) {
  if (!geometry) {
    return null;
  }

  const { stats } = geometry;

  return (
    <div className="absolute top-4 right-4 bg-[#1D1D1D] border border-[#4772B3] rounded p-3 text-white text-sm z-10">
      <div className="space-y-1">
        <div className="font-semibold text-xs text-gray-300 uppercase tracking-wide">
          Geometry Stats
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Vertices:</span>
          <span className="text-white">{stats.vertexCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Faces:</span>
          <span className="text-white">{stats.faceCount.toLocaleString()}</span>
        </div>
        {stats.volume && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Volume:</span>
            <span className="text-white">{stats.volume.toFixed(2)} mm³</span>
          </div>
        )}
      </div>
    </div>
  );
}