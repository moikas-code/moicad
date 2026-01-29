'use client';

import { useState } from 'react';
import { downloadFile, exportGeometry, GeometryResponse } from '@/lib/api-client';
import { exportFileAsScad } from '@/lib/storage';

interface SidebarProps {
  geometry: GeometryResponse | null;
  code: string;
  onNew?: () => void;
  onOpenFiles?: () => void;
  onSave?: () => void;
  unsavedChanges?: boolean;
}

export default function Sidebar({
  geometry,
  code,
  onNew,
  onOpenFiles,
  onSave,
  unsavedChanges,
}: SidebarProps) {
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
    <div className="h-full flex flex-col bg-[#2D2D2D] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#3D3D3D]">
        <h2 className="text-sm font-semibold text-[#E5E5E5]">Controls</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Geometry Stats */}
        {geometry && (
          <div className="bg-[#3D3D3D] rounded p-3">
            <h3 className="text-xs font-semibold text-[#E5E5E5] mb-2">Geometry Stats</h3>
            <div className="space-y-1 text-xs text-[#A0A0A0]">
              <div>
                <span className="text-[#B0B0B0]">Vertices:</span> {geometry.stats.vertexCount}
              </div>
              <div>
                <span className="text-[#B0B0B0]">Faces:</span> {geometry.stats.faceCount}
              </div>
              <div className="pt-2 border-t border-[#4D4D4D]">
                <span className="text-[#B0B0B0]">Bounds</span>
                <div className="mt-1 ml-2">
                  <div>Min: [{geometry.bounds.min.join(', ')}]</div>
                  <div>Max: [{geometry.bounds.max.join(', ')}]</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#E5E5E5] mb-2">Export</h3>
          <div className="space-y-2">
            <button
              onClick={() => setShowExportDialog(true)}
              disabled={!geometry || isExporting}
              className="w-full px-3 py-2 bg-[#4CAF50] hover:bg-[#5CBF60] disabled:bg-[#454545] disabled:cursor-not-allowed text-white text-xs rounded transition-colors font-medium"
            >
              {isExporting ? 'Exporting...' : 'Export Geometry'}
            </button>
            <button
              onClick={handleExportCode}
              className="w-full px-3 py-2 bg-[#4772B3] hover:bg-[#5882C3] text-white text-xs rounded transition-colors font-medium"
            >
              Export .scad
            </button>
          </div>
        </div>

        {/* File Operations */}
        <div>
          <h3 className="text-xs font-semibold text-[#E5E5E5] mb-2">File</h3>
          <div className="space-y-2">
            <button
              onClick={onNew}
              className="w-full px-3 py-2 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors font-medium"
            >
              New
            </button>
            <button
              onClick={onOpenFiles}
              className="w-full px-3 py-2 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors font-medium"
            >
              Open
            </button>
            <button
              onClick={onSave}
              className="w-full px-3 py-2 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors font-medium"
            >
              Save {unsavedChanges && <span className="text-[#E66E00]">●</span>}
            </button>
          </div>
        </div>
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
