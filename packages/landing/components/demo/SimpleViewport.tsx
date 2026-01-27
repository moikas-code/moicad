'use client';

interface DemoViewportProps {
  geometry: any;
  width: string;
  height: string;
}

export default function DemoViewport({ geometry, width, height }: DemoViewportProps) {
  if (!geometry) {
    return (
      <div 
        className="flex items-center justify-center bg-slate-800"
        style={{ width, height }}
      >
        <div className="text-gray-400 text-center">
          <div className="text-4xl mb-2">📦</div>
          <div>Your 3D model will appear here</div>
          <div className="text-sm mt-2">Write some code and click "Run" to see the result</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-slate-800 flex items-center justify-center"
      style={{ width, height }}
    >
      <div className="text-green-400 text-center">
        <div className="text-4xl mb-2">✨</div>
        <div>Geometry rendered successfully!</div>
        <div className="text-sm mt-2">
          Vertices: {geometry.stats?.vertexCount || 'N/A'} | 
          Faces: {geometry.stats?.faceCount || 'N/A'}
        </div>
      </div>
    </div>
  );
}