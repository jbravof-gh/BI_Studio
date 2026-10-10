import { useEffect, useRef } from 'react';
import $ from '../lib/jquery-init';
import 'jquery-ui-dist/jquery-ui';

interface UseJQueryUIProps {
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  disabled: boolean;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
  lockAspectRatio?: boolean;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  onDragStop: (x: number, y: number) => void;
  onResizeStop: (width: number, height: number, x: number, y: number) => void;
  onSelect: () => void;
}

export function useJQueryUI({
  elementId,
  x,
  y,
  width,
  height,
  locked,
  disabled,
  zoom,
  snapToGrid,
  gridSize,
  lockAspectRatio,
  onDragMove,
  onDragEnd,
  onDragStop,
  onResizeStop,
  onSelect
}: UseJQueryUIProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Keep latest callbacks in refs
  const callbacksRef = useRef({
    onDragMove,
    onDragEnd,
    onDragStop,
    onResizeStop,
    onSelect,
    zoom,
    snapToGrid,
    gridSize,
    lockAspectRatio,
    x,
    y
  });

  callbacksRef.current = {
    onDragMove,
    onDragEnd,
    onDragStop,
    onResizeStop,
    onSelect,
    zoom,
    snapToGrid,
    gridSize,
    lockAspectRatio,
    x,
    y
  };

  useEffect(() => {
    if (!nodeRef.current || disabled || locked) return;

    const $el = $(nodeRef.current);

    // Clean previous instances safely
    try {
      if ($el.data('ui-draggable')) {
        $el.draggable('destroy');
      }
      if ($el.data('ui-resizable')) {
        $el.resizable('destroy');
      }
    } catch (e) {
      // ignore
    }

    // Initialize jQuery UI Draggable
    $el.draggable({
      containment: 'parent',
      grid: snapToGrid ? [gridSize, gridSize] : undefined,
      distance: 3,
      start: (event, ui) => {
        callbacksRef.current.onSelect();
      },
      drag: (event, ui) => {
        // Adjust for zoom scale if canvas is zoomed
        const z = callbacksRef.current.zoom;
        if (z !== 1) {
          const originalPosition = ui.originalPosition;
          ui.position.left = originalPosition.left + (ui.position.left - originalPosition.left) / z;
          ui.position.top = originalPosition.top + (ui.position.top - originalPosition.top) / z;
        }

        if (callbacksRef.current.onDragMove) {
          callbacksRef.current.onDragMove(Math.round(ui.position.left), Math.round(ui.position.top));
        }
      },
      stop: (event, ui) => {
        const finalX = Math.round(ui.position.left);
        const finalY = Math.round(ui.position.top);
        if (callbacksRef.current.onDragEnd) {
          callbacksRef.current.onDragEnd();
        }
        callbacksRef.current.onDragStop(Math.max(0, finalX), Math.max(0, finalY));
      }
    });

    // Initialize jQuery UI Resizable with 8 handles
    $el.resizable({
      handles: 'n, e, s, w, ne, se, sw, nw',
      containment: 'parent',
      aspectRatio: !!lockAspectRatio,
      grid: snapToGrid ? [gridSize, gridSize] : undefined,
      minWidth: 40,
      minHeight: 25,
      start: () => {
        callbacksRef.current.onSelect();
      },
      stop: (event, ui) => {
        const newW = Math.round(ui.size.width);
        const newH = Math.round(ui.size.height);
        const newX = Math.round(ui.position.left);
        const newY = Math.round(ui.position.top);
        callbacksRef.current.onResizeStop(
          Math.max(40, newW),
          Math.max(25, newH),
          Math.max(0, newX),
          Math.max(0, newY)
        );
      }
    });

    return () => {
      try {
        if ($el.data('ui-draggable')) {
          $el.draggable('destroy');
        }
        if ($el.data('ui-resizable')) {
          $el.resizable('destroy');
        }
      } catch (e) {
        // ignore
      }
    };
  }, [elementId, disabled, locked, snapToGrid, gridSize, zoom, lockAspectRatio]);

  return nodeRef;
}
