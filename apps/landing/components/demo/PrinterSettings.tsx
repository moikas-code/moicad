'use client';

import { useState } from 'react';
import { PRINTER_PRESETS, getManufacturers, getPrintersByManufacturer, PrinterPreset } from '../../lib/printer-presets';

interface PrinterSettingsProps {
  currentPrinter: PrinterPreset;
  onPrinterChange: (printer: PrinterPreset) => void;
}

export default function PrinterSettings({ currentPrinter, onPrinterChange }: PrinterSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState(currentPrinter.manufacturer);
  const [customSize, setCustomSize] = useState({
    width: currentPrinter.width,
    depth: currentPrinter.depth,
    height: currentPrinter.height
  });

  const manufacturers = getManufacturers();
  const printers = getPrintersByManufacturer(selectedManufacturer);

  const handlePresetSelect = (printer: PrinterPreset) => {
    if (printer.name === 'Custom') {
      setCustomSize({
        width: printer.width,
        depth: printer.depth,
        height: printer.height
      });
    }
    onPrinterChange(printer);
    setIsOpen(false);
  };

  const handleCustomSizeChange = (dimension: 'width' | 'depth' | 'height', value: string) => {
    const numValue = parseInt(value) || 0;
    const newSize = { ...customSize, [dimension]: numValue };
    setCustomSize(newSize);

    onPrinterChange({
      name: 'Custom',
      manufacturer: 'Custom',
      ...newSize
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 text-xs font-medium text-white bg-[#3D3D3D] hover:bg-[#4D4D4D] rounded transition-colors flex items-center gap-2"
      >
        <span className="text-[#4772B3]">📐</span>
        {currentPrinter.manufacturer} {currentPrinter.name}
        <span className="text-[#888888]">
          ({currentPrinter.width}×{currentPrinter.depth}×{currentPrinter.height}mm)
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-[#2D2D2D] border border-[#3D3D3D] rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[#E5E5E5] mb-3">Printer Build Volume</h3>

            {/* Manufacturer selector */}
            <div className="mb-3">
              <label className="text-xs text-[#B0B0B0] mb-1 block">Manufacturer</label>
              <select
                value={selectedManufacturer}
                onChange={(e) => setSelectedManufacturer(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[#1D1D1D] text-[#E5E5E5] border border-[#3D3D3D] rounded"
              >
                {manufacturers.map(mfg => (
                  <option key={mfg} value={mfg}>{mfg}</option>
                ))}
              </select>
            </div>

            {/* Printer model selector */}
            <div className="mb-3">
              <label className="text-xs text-[#B0B0B0] mb-1 block">Model</label>
              <div className="grid grid-cols-2 gap-2">
                {printers.map(printer => (
                  <button
                    key={printer.name}
                    onClick={() => handlePresetSelect(printer)}
                    className={`px-2 py-2 text-xs rounded transition-colors text-left ${
                      currentPrinter.name === printer.name && currentPrinter.manufacturer === printer.manufacturer
                        ? 'bg-[#4772B3] text-white'
                        : 'bg-[#1D1D1D] text-[#E5E5E5] hover:bg-[#3D3D3D]'
                    }`}
                  >
                    <div className="font-medium">{printer.name}</div>
                    <div className="text-[10px] text-[#888888] mt-0.5">
                      {printer.width}×{printer.depth}×{printer.height}mm
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom size inputs */}
            {currentPrinter.name === 'Custom' && (
              <div className="mt-3 p-3 bg-[#1D1D1D] rounded">
                <label className="text-xs text-[#B0B0B0] mb-2 block">Custom Size (mm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#888888]">Width (X)</label>
                    <input
                      type="number"
                      value={customSize.width}
                      onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-[#2D2D2D] text-[#E5E5E5] border border-[#3D3D3D] rounded"
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#888888]">Depth (Y)</label>
                    <input
                      type="number"
                      value={customSize.depth}
                      onChange={(e) => handleCustomSizeChange('depth', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-[#2D2D2D] text-[#E5E5E5] border border-[#3D3D3D] rounded"
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#888888]">Height (Z)</label>
                    <input
                      type="number"
                      value={customSize.height}
                      onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-[#2D2D2D] text-[#E5E5E5] border border-[#3D3D3D] rounded"
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
