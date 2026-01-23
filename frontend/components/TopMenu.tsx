'use client';

import { useState, useRef, useEffect } from 'react';
import { downloadFile, exportGeometry, GeometryResponse } from '@/lib/api-client';
import { exportFileAsScad } from '@/lib/storage';

interface MenuItem {
  label?: string;
  action?: () => void;
  disabled?: boolean;
  shortcut?: string;
  separator?: boolean;
  submenu?: MenuItem[];
  badge?: string;
  badgeColor?: string;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

interface TopMenuProps {
  geometry: GeometryResponse | null;
  code: string;
  onNew?: () => void;
  onOpenFiles?: () => void;
  onSave?: () => void;
  onExportGeometry?: () => void;
  unsavedChanges?: boolean;
  customMenus?: Record<string, MenuSection>;
}

export default function TopMenu({
  geometry,
  code,
  onNew,
  onOpenFiles,
  onSave,
  onExportGeometry,
  unsavedChanges,
  customMenus = {},
}: TopMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    setActiveMenu(null);
  };

  // Define menu structure
  const menus: Record<string, MenuSection> = {
    File: {
      label: 'File',
      items: [
        {
          label: 'New',
          action: () => { onNew?.(); setActiveMenu(null); },
          shortcut: 'Ctrl+N'
        },
        {
          label: 'Open',
          action: () => { onOpenFiles?.(); setActiveMenu(null); },
          shortcut: 'Ctrl+O'
        },
        {
          label: 'Save',
          action: () => { onSave?.(); setActiveMenu(null); },
          shortcut: 'Ctrl+S',
          badge: unsavedChanges ? '●' : undefined,
          badgeColor: unsavedChanges ? '#E66E00' : undefined
        },
        { separator: true },
        {
          label: 'Export Geometry…',
          action: () => { onExportGeometry?.(); setShowExportDialog(true); setActiveMenu(null); },
          disabled: !geometry || isExporting,
          shortcut: 'Ctrl+E'
        },
        {
          label: 'Export .scad',
          action: handleExportCode,
          shortcut: 'Ctrl+Shift+S'
        }
      ]
    },
    ...customMenus
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenu && menuRefs.current[activeMenu]) {
        const menuElement = menuRefs.current[activeMenu];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setActiveMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu]);

  // Render menu item helper
  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return <div key={`sep-${index}`} className="border-t border-[#4D4D4D] my-1" />;
    }

    return (
      <button
        key={item.label}
        onClick={item.action}
        disabled={item.disabled}
        className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#4D4D4D] disabled:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:text-[#606060] transition-colors flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {item.label}
          {item.badge && (
            <span style={{ color: item.badgeColor }} className="text-xs">
              {item.badge}
            </span>
          )}
        </span>
        {item.shortcut && <kbd className="text-[#808080] text-xs">{item.shortcut}</kbd>}
      </button>
    );
  };

  return (
    <div className="bg-[#2D2D2D] border-b border-[#3D3D3D] px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left side - Menu Bar */}
        <div className="flex items-center gap-3">
          {Object.entries(menus).map(([menuName, menuSection]) => (
            <div 
              key={menuName} 
              className="relative" 
              ref={(el) => { menuRefs.current[menuName] = el; }}
            >
              <button
                onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
                className="px-3 py-1 bg-[#454545] hover:bg-[#555555] text-white text-xs rounded transition-colors flex items-center gap-2"
              >
                {menuName}
                <svg 
                  className={`w-3 h-3 transition-transform ${activeMenu === menuName ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {activeMenu === menuName && (
                <div className="absolute top-full left-0 mt-1 bg-[#3D3D3D] border border-[#4D4D4D] rounded shadow-lg min-w-[160px] z-50">
                  {menuSection.items.map((item, index) => renderMenuItem(item, index))}
                </div>
              )}
            </div>
          ))}
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