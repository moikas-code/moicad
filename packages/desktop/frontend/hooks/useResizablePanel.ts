import { useEffect, useRef, useState } from 'react';
import { loadLayoutPrefs, saveLayoutPrefs } from '@/lib/storage';

/**
 * Hook to manage a resizable two-panel layout (left editor, right viewport).
 * Default left width is 40% with constraints left: 25% - 50% (right: 50% - 75%).
 */
export function useResizablePanel(initialLeft: number = 40) {
  const minLeft = 25;
  const maxLeft = 50;

  const [leftWidth, setLeftWidth] = useState<number>(initialLeft);
  const [isDragging, setDragging] = useState<boolean>(false);

  const dragStartX = useRef<number>(0);
  const startLeft = useRef<number>(initialLeft);

  // Load saved layout on mount
  useEffect(() => {
    try {
      const saved = loadLayoutPrefs();
      if (typeof saved?.leftWidth === 'number') {
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
    } catch {
      // ignore persistence errors
    }
  }, [leftWidth]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartX.current = e.clientX;
    startLeft.current = leftWidth;
    window.addEventListener('mousemove', onMouseMove as any);
    window.addEventListener('mouseup', onMouseUp as any);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const container = document.getElementById('moicad-main-container');
    if (!container) return;
    const w = container.getBoundingClientRect().width;
    const dx = e.clientX - dragStartX.current;
    let newLeft = startLeft.current + (dx / w) * 100;
    if (newLeft < minLeft) newLeft = minLeft;
    if (newLeft > maxLeft) newLeft = maxLeft;
    setLeftWidth(newLeft);
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    setDragging(false);
    window.removeEventListener('mousemove', onMouseMove as any);
    window.removeEventListener('mouseup', onMouseUp as any);
  };

  // Reset to default
  const reset = () => setLeftWidth(40);

  // Double-click to reset
  const onDoubleClick = () => reset();

  // Keyboard shortcuts: Ctrl+Left / Ctrl+Right adjust by 5%
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (!ev.ctrlKey) return;
      if (ev.key === 'ArrowLeft') {
        setLeftWidth((w) => Math.max(minLeft, w - 5));
      } else if (ev.key === 'ArrowRight') {
        setLeftWidth((w) => Math.min(maxLeft, w + 5));
      } else if (ev.key.toLowerCase() === 'r') {
        setLeftWidth(40);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { leftWidth, setLeftWidth, isDragging, onMouseDown, onDoubleClick, reset };
}

export default useResizablePanel;
