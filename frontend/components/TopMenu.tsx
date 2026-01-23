'use client';

import { useState } from 'react';
import { downloadFile, exportGeometry, GeometryResponse } from '@/lib/api-client';
import { exportFileAsScad } from '@/lib/storage';

interface TopMenuProps {
  geometry: GeometryResponse | null;
  code: string;
  onNew?: () => void;
  onOpenFiles?: () => void;
  onSave?: () => void;
  unsavedChanges?: boolean;
}

export default function TopMenu({
  geometry,
  code,
  onNew,
  onOpenFiles,
  onSave,
  unsavedChanges,
}: TopMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExportSTL = async () => {
    if (!geometry) return;
    setIsExporting(true);
    try {
      const blob = await exportGeometry(geometry, 'stl', true);
      downloadFile(blob, 'model.stl');
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  };

  const handleExportOBJ = async () => {
    if (!geometry) return;
    setIsExporting(true);
    try {
      const blob = await exportGeometry(geometry, 'obj', false);
      downloadFile(blob, 'model.obj');
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  };

  const handleExportCode = () => {
    exportFileAsScad(code, 'model.scad');
  };

  return (
    <div className="bg-[#2D2D2D] border-b border-[#3D3D3D] px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left side - File Operations */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#A0A0A0]">File:</span>
            <button
              onClick={onNew}
              className="px-2 py-1 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors"
            >
              New
            </button>
            <button
              onClick={onOpenFiles}
              className="px-2 py-1 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors"
            >
              Open
            </button>
            <button
              onClick={onSave}
              className="px-2 py-1 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors relative"
            >
              Save
              {unsavedChanges && (
                <span className="absolute -top-1 -right-1 text-[#E66E00] text-xs">●</span>
              )}
            </button>
          </div>

          <div className="h-4 w-px bg-[#3D3D3D]" />

          {/* Export Operations */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#A0A0A0]">Export:</span>
            <button
              onClick={() => setShowExportDialog(true)}
              disabled={!geometry || isExporting}
              className="px-2 py-1 bg-[#4CAF50] hover:bg-[#5CBF60] disabled:bg-[#454545] disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
            >
              {isExporting ? 'Exporting...' : 'Geometry'}
            </button>
            <button
              onClick={handleExportCode}
              className="px-2 py-1 bg-[#4772B3] hover:bg-[#5882C3] text-white text-xs rounded transition-colors"
            >
              .scad
            </button>
          </div>
        </div>

        {/* Right side - Geometry Stats */}
        {geometry && (
          <div className="flex items-center gap-4 text-xs text-[#A0A0A0]">
            <div className="flex items-center gap-3">
              <span className="font-semibold">Stats:</span>
              <span>V: {geometry.stats.vertexCount}</span>
              <span>F: {geometry.stats.faceCount}</span>
              <span className="text-[#808080]">
                B: [{geometry.bounds.min.join(',')}] → [{geometry.bounds.max.join(',')}]
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D2D2D] rounded-lg border border-[#3D3D3D] p-6 max-w-sm">
            <h2 className="text-lg font-bold text-white mb-4">Export Format</h2>
            <div className="space-y-3 mb-4">
              <button
                onClick={handleExportSTL}
                className="w-full px-4 py-2 bg-[#4CAF50] hover:bg-[#5CBF60] text-white rounded transition-colors font-medium"
              >
                Export as STL (Binary)
              </button>
              <button
                onClick={handleExportOBJ}
                className="w-full px-4 py-2 bg-[#4CAF50] hover:bg-[#5CBF60] text-white rounded transition-colors font-medium"
              >
                Export as OBJ
              </button>
            </div>
            <button
              onClick={() => setShowExportDialog(false)}
              className="w-full px-4 py-2 bg-[#454545] hover:bg-[#555555] text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}