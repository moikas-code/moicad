'use client';

import React from 'react';
import { ViewportControlsProvider, useViewportControls } from './ViewportControlsContext';

interface ViewportWrapperProps {
  children: React.ReactNode;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
}

function ViewportContent({ leftContent, rightContent }: Omit<ViewportWrapperProps, 'children'>) {
  const {
    resetView,
    zoomToFit,
    zoomIn,
    zoomOut,
    setViewOrientation,
    projectionMode,
    setProjectionMode,
    showGrid,
    toggleGrid,
    showEdges,
    toggleEdges,
    showAxes,
    toggleAxes,
    showScaleMarkers,
    toggleScaleMarkers,
    showCrosshair,
    toggleCrosshair,
    showStatsOverlay,
    toggleStatsOverlay
  } = useViewportControls();

  // Example custom menus with real functionality
  const customMenus = {
    View: {
      label: 'View',
      items: [
        {
          label: 'Show Grid',
          action: toggleGrid,
          shortcut: 'G',
          badge: showGrid ? '✓' : undefined,
          badgeColor: '#4CAF50'
        },
        {
          label: 'Show Edges',
          action: toggleEdges,
          shortcut: 'E',
          badge: showEdges ? '✓' : undefined,
          badgeColor: '#4CAF50'
        },
        {
          label: 'Show Axes',
          action: toggleAxes,
          badge: showAxes ? '✓' : undefined,
          badgeColor: '#4CAF50'
        },
        {
          label: 'Show Scale Markers',
          action: toggleScaleMarkers,
          badge: showScaleMarkers ? '✓' : undefined,
          badgeColor: '#4CAF50'
        },
        {
          label: 'Show Crosshairs',
          action: toggleCrosshair,
          badge: showCrosshair ? '✓' : undefined,
          badgeColor: '#4CAF50'
        },
        {
          label: 'Show Stats Overlay',
          action: toggleStatsOverlay,
          badge: showStatsOverlay ? '✓' : undefined,
          badgeColor: '#4CAF50'
        },
        { separator: true },
        {
          label: 'Zoom In',
          action: zoomIn,
          shortcut: '+'
        },
        {
          label: 'Zoom Out',
          action: zoomOut,
          shortcut: '-'
        },
        {
          label: 'View All',
          action: zoomToFit,
          shortcut: 'F'
        },
        {
          label: 'Reset View',
          action: resetView,
          shortcut: 'R'
        },
        { separator: true },
        {
          label: 'Projection Mode',
          action: () => setProjectionMode(projectionMode === 'perspective' ? 'orthographic' : 'perspective'),
          badge: projectionMode === 'orthographic' ? 'Ortho' : 'Persp',
          badgeColor: '#4772B3'
        },
        { separator: true },
        {
          label: 'Front View',
          action: () => setViewOrientation('front'),
          shortcut: '1'
        },
        {
          label: 'Back View',
          action: () => setViewOrientation('back'),
          shortcut: '2'
        },
        {
          label: 'Left View',
          action: () => setViewOrientation('left'),
          shortcut: '3'
        },
        {
          label: 'Right View',
          action: () => setViewOrientation('right'),
          shortcut: '4'
        },
        {
          label: 'Top View',
          action: () => setViewOrientation('top'),
          shortcut: '7'
        },
        {
          label: 'Bottom View',
          action: () => setViewOrientation('bottom'),
          shortcut: '8'
        },
        {
          label: 'Diagonal View',
          action: () => setViewOrientation('diagonal'),
          shortcut: '5'
        },
        {
          label: 'Center View',
          action: () => setViewOrientation('center'),
          shortcut: '0'
        }
      ]
    },
    Tools: {
      label: 'Tools',
      items: [
        {
          label: 'Validate Syntax',
          action: () => console.log('Validate OpenSCAD syntax'),
          shortcut: 'Ctrl+L'
        },
        {
          label: 'Format Code',
          action: () => console.log('Format OpenSCAD code'),
          shortcut: 'Ctrl+Shift+F'
        },
        { separator: true },
        {
          label: 'Generate Documentation',
          action: () => console.log('Generate documentation'),
          disabled: true // TODO: Implement doc generation
        },
        {
          label: 'Performance Analysis',
          action: () => console.log('Performance analysis'),
          disabled: true // TODO: Implement perf analysis
        }
      ]
    }
  };

  return { customMenus };
}

export function ViewportWrapper({ children, leftContent, rightContent }: ViewportWrapperProps) {
  return (
    <ViewportControlsProvider>
      {children}
    </ViewportControlsProvider>
  );
}

export { ViewportContent };