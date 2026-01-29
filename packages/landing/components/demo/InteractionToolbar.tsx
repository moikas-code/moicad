'use client';

import React, { useState, useCallback } from 'react';

/**
 * Types for the interaction toolbar
 */
export interface PartInfo {
  id: string;
  constraintType: string;
  currentValue?: number;
  range?: [number, number];
}

export interface InteractionToolbarProps {
  /** List of interactive parts in the model */
  parts: PartInfo[];
  /** Currently selected part ID */
  selectedPart: string | null;
  /** Callback when user selects a part */
  onPartSelect: (partId: string | null) => void;
  /** Callback to reset all parts to initial positions */
  onResetAll: () => void;
  /** Callback to export current state */
  onExportState?: () => void;
  /** Callback to import state */
  onImportState?: (state: string) => void;
  /** Current interaction mode */
  mode: 'interact' | 'orbit' | 'pan';
  /** Callback when mode changes */
  onModeChange: (mode: 'interact' | 'orbit' | 'pan') => void;
  /** Whether interaction mode is enabled */
  interactionEnabled: boolean;
  /** Callback to toggle interaction mode */
  onToggleInteraction: () => void;
}

/**
 * InteractionToolbar - UI for interacting with parts of a 3D model
 *
 * Provides:
 * - Mode selector (Interact/Orbit/Pan)
 * - Part list with selection
 * - Current part info with value slider
 * - Reset and export controls
 */
export default function InteractionToolbar({
  parts,
  selectedPart,
  onPartSelect,
  onResetAll,
  onExportState,
  onImportState,
  mode,
  onModeChange,
  interactionEnabled,
  onToggleInteraction,
}: InteractionToolbarProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportedState, setExportedState] = useState<string>('');

  const selectedPartInfo = parts.find(p => p.id === selectedPart);

  const handleExport = useCallback(() => {
    if (onExportState) {
      onExportState();
      setShowExportDialog(true);
    }
  }, [onExportState]);

  const handleImport = useCallback(() => {
    const input = prompt('Paste exported state JSON:');
    if (input && onImportState) {
      try {
        onImportState(input);
      } catch (e) {
        alert('Invalid state JSON');
      }
    }
  }, [onImportState]);

  const getConstraintIcon = (type: string): string => {
    switch (type) {
      case 'hinge': return '🔄';
      case 'slider': return '↔️';
      case 'ball': return '🔮';
      case 'piston': return '🔩';
      case 'planar': return '📐';
      case 'free': return '✨';
      case 'fixed': return '🔒';
      default: return '❓';
    }
  };

  const formatValue = (value: number | undefined, type: string): string => {
    if (value === undefined) return '-';
    if (type === 'hinge' || type === 'ball') {
      return `${value.toFixed(1)}°`;
    }
    return `${value.toFixed(2)}mm`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 w-64 text-sm">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Interaction</h3>
        <button
          onClick={onToggleInteraction}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            interactionEnabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
          }`}
        >
          {interactionEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {interactionEnabled && (
        <>
          {/* Mode selector */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => onModeChange('interact')}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'interact'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title="Click and drag parts"
            >
              🖱️ Interact
            </button>
            <button
              onClick={() => onModeChange('orbit')}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'orbit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title="Rotate camera around model"
            >
              🔄 Orbit
            </button>
            <button
              onClick={() => onModeChange('pan')}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'pan'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title="Pan camera"
            >
              ✋ Pan
            </button>
          </div>

          {/* Parts list */}
          <div className="mb-3">
            <div className="text-zinc-400 text-xs mb-1.5 uppercase tracking-wide">Parts</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {parts.length === 0 ? (
                <div className="text-zinc-500 text-xs italic py-2 text-center">
                  No interactive parts
                </div>
              ) : (
                parts.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => onPartSelect(selectedPart === part.id ? null : part.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
                      selectedPart === part.id
                        ? 'bg-blue-600/30 border border-blue-500'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{getConstraintIcon(part.constraintType)}</span>
                      <span className="text-white">{part.id}</span>
                    </span>
                    <span className="text-zinc-400 text-xs">
                      {part.constraintType}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected part info */}
          {selectedPartInfo && (
            <div className="mb-3 p-2 bg-zinc-800 rounded border border-zinc-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getConstraintIcon(selectedPartInfo.constraintType)}</span>
                <div>
                  <div className="text-white font-medium">{selectedPartInfo.id}</div>
                  <div className="text-zinc-400 text-xs capitalize">{selectedPartInfo.constraintType}</div>
                </div>
              </div>

              {selectedPartInfo.currentValue !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Value</span>
                    <span className="text-white font-mono">
                      {formatValue(selectedPartInfo.currentValue, selectedPartInfo.constraintType)}
                    </span>
                  </div>

                  {selectedPartInfo.range && (
                    <>
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{
                            width: `${
                              ((selectedPartInfo.currentValue - selectedPartInfo.range[0]) /
                                (selectedPartInfo.range[1] - selectedPartInfo.range[0])) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 mt-0.5">
                        <span>{formatValue(selectedPartInfo.range[0], selectedPartInfo.constraintType)}</span>
                        <span>{formatValue(selectedPartInfo.range[1], selectedPartInfo.constraintType)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-2 text-xs text-zinc-400 italic">
                Drag in viewport to interact
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onResetAll}
              className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition-colors"
            >
              Reset All
            </button>
            {onExportState && (
              <button
                onClick={handleExport}
                className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition-colors"
              >
                Export
              </button>
            )}
            {onImportState && (
              <button
                onClick={handleImport}
                className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition-colors"
              >
                Import
              </button>
            )}
          </div>

          {/* Help text */}
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="text-zinc-500 text-xs">
              <p className="mb-1"><strong>Interact mode:</strong> Click parts to select, drag to move</p>
              <p><strong>Orbit/Pan:</strong> Drag anywhere to control camera</p>
            </div>
          </div>
        </>
      )}

      {!interactionEnabled && (
        <div className="text-zinc-500 text-xs text-center py-4">
          Enable interaction mode to manipulate parts
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing interaction toolbar state
 */
export function useInteractionToolbar() {
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [mode, setMode] = useState<'interact' | 'orbit' | 'pan'>('interact');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const toggleInteraction = useCallback(() => {
    setInteractionEnabled(prev => !prev);
  }, []);

  const handleModeChange = useCallback((newMode: 'interact' | 'orbit' | 'pan') => {
    setMode(newMode);
  }, []);

  const handlePartSelect = useCallback((partId: string | null) => {
    setSelectedPart(partId);
  }, []);

  return {
    interactionEnabled,
    mode,
    selectedPart,
    toggleInteraction,
    handleModeChange,
    handlePartSelect,
    setSelectedPart,
  };
}
