import React, { useEffect, useRef, useState } from 'react';
import { loadLayoutPrefs, saveLayoutPrefs, LayoutPrefs } from '@/lib/storage';

type ResizablePanelProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeft?: number; // percentage (0-100)
  minLeft?: number; // min percentage for left panel
  maxLeft?: number; // max percentage for left panel
  dividerWidth?: number; // pixels
  onLeftWidthChange?: (width: number) => void;
};

/**
 * Two-panel resizable layout with a draggable vertical divider.
 * - Widths are expressed in percentages to be responsive.
 * - Persists left width via localStorage (LayoutPrefs) when changed.
 */
const ResizablePanel: React.FC<ResizablePanelProps> = ({
  left,
  right,
  defaultLeft = 40,
  minLeft = 25,
  maxLeft = 50,
  dividerWidth = 6,
  onLeftWidthChange,
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(defaultLeft);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startLeft = useRef<number>(defaultLeft);
  const startWidth = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load saved layout on mount
  useEffect(() => {
    try {
      const saved = loadLayoutPrefs();
      if (saved?.leftWidth != null) {
        setLeftWidth(saved.leftWidth);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist layout when leftWidth changes
  useEffect(() => {
    try {
      saveLayoutPrefs({ leftWidth });
      onLeftWidthChange?.(leftWidth);
    } catch {
      // ignore persistence errors
    }
  }, [leftWidth]);

  const onMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    dragging.current = true;
    startX.current = e.clientX;
    startLeft.current = leftWidth;
    startWidth.current = container.getBoundingClientRect().width;

    // Prevent text selection and set cursor globally
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    // Disable pointer events on children to prevent canvas from capturing mouse events
    container.style.pointerEvents = 'none';

    window.addEventListener('mousemove', onMouseMove as any);
    window.addEventListener('mouseup', onMouseUp as any);
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Recalculate container width on each move to handle any dynamic changes
    const currentWidth = container.getBoundingClientRect().width;
    const dx = e.clientX - startX.current;
    let newLeft = startLeft.current + (dx / currentWidth) * 100;

    if (newLeft < minLeft) newLeft = minLeft;
    if (newLeft > maxLeft) newLeft = maxLeft;
    setLeftWidth(newLeft);
  };

  const onMouseUp = () => {
    if (!dragging.current) return;
    dragging.current = false;

    // Reset body styles
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Re-enable pointer events on children
    if (containerRef.current) {
      containerRef.current.style.pointerEvents = '';
    }

    window.removeEventListener('mousemove', onMouseMove as any);
    window.removeEventListener('mouseup', onMouseUp as any);
  };

  // Double-click to reset
  const onDoubleClick = () => {
    setLeftWidth(defaultLeft);
  };

  // Keyboard shortcuts: Ctrl+Left / Ctrl+Right adjust by 5%
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (!ev.ctrlKey) return;
      if (ev.key === 'ArrowLeft') {
        setLeftWidth((w) => Math.max(minLeft, w - 5));
      } else if (ev.key === 'ArrowRight') {
        setLeftWidth((w) => Math.min(maxLeft, w + 5));
      } else if (ev.key.toLowerCase() === 'r') {
        setLeftWidth(defaultLeft);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div ref={containerRef} className="flex h-full w-full" style={{ height: '100%', width: '100%' }}>
      <div style={{ width: `${leftWidth}%`, minWidth: `${minLeft}%`, maxWidth: `${maxLeft}%`, display: 'flex', flexDirection: 'column' }}>
        {left}
      </div>
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        style={{
          width: `${dividerWidth}px`,
          cursor: 'col-resize',
          background: dragging.current ? '#4772B3' : '#3D3D3D',
          transition: dragging.current ? 'none' : 'background 0.2s',
          userSelect: 'none'
        }}
        aria-label="Resize divider"
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {right}
      </div>
    </div>
  );
};

export default ResizablePanel;
