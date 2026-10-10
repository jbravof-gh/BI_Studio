import { useState, useCallback, useEffect, useRef } from 'react';
import { CanvasDocument } from '../types';
import { normalizeDocumentPages } from '../utils/pageUtils';

export interface UseHistoryReturn {
  state: CanvasDocument;
  set: (newPresent: CanvasDocument | ((curr: CanvasDocument) => CanvasDocument), addToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  resetHistory: (initialState: CanvasDocument) => void;
}

export function useHistory(initialPresent: CanvasDocument, maxSnapshots: number = 40): UseHistoryReturn {
  const [past, setPast] = useState<CanvasDocument[]>([]);
  const [present, setPresent] = useState<CanvasDocument>(() => normalizeDocumentPages(initialPresent));
  const [future, setFuture] = useState<CanvasDocument[]>([]);

  // Ref to always access latest state in hotkeys
  const stateRef = useRef({ past, present, future });
  stateRef.current = { past, present, future };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    const { past: p, present: pr, future: f } = stateRef.current;
    if (p.length === 0) return;

    const previous = p[p.length - 1];
    const newPast = p.slice(0, p.length - 1);

    setPast(newPast);
    setFuture([pr, ...f]);
    setPresent(normalizeDocumentPages(previous));
  }, []);

  const redo = useCallback(() => {
    const { past: p, present: pr, future: f } = stateRef.current;
    if (f.length === 0) return;

    const next = f[0];
    const newFuture = f.slice(1);

    setPast([...p, pr]);
    setFuture(newFuture);
    setPresent(normalizeDocumentPages(next));
  }, []);

  const set = useCallback(
    (newPresentOrFn: CanvasDocument | ((curr: CanvasDocument) => CanvasDocument), addToHistory: boolean = true) => {
      setPresent(current => {
        const computed = typeof newPresentOrFn === 'function' ? newPresentOrFn(current) : newPresentOrFn;
        
        // Synchronize active page elements and dimensions with current elements and dimensions
        let pages = computed.pages ? [...computed.pages] : [];
        const activeIdx = typeof computed.activePageIndex === 'number' ? computed.activePageIndex : 0;
        if (pages.length > 0 && pages[activeIdx]) {
          pages[activeIdx] = {
            ...pages[activeIdx],
            elements: computed.elements ?? pages[activeIdx].elements,
            width: computed.width ?? pages[activeIdx].width,
            height: computed.height ?? pages[activeIdx].height,
            backgroundColor: computed.backgroundColor ?? pages[activeIdx].backgroundColor
          };
        }

        const normalized = normalizeDocumentPages({
          ...computed,
          pages,
          updatedAt: new Date().toISOString()
        });

        if (addToHistory) {
          setPast(prevPast => {
            const nextPast = [...prevPast, current];
            return nextPast.length > maxSnapshots ? nextPast.slice(nextPast.length - maxSnapshots) : nextPast;
          });
          setFuture([]);
        }

        return normalized;
      });
    },
    [maxSnapshots]
  );

  const resetHistory = useCallback((initialState: CanvasDocument) => {
    setPast([]);
    setFuture([]);
    setPresent(normalizeDocumentPages(initialState));
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: past.length,
    resetHistory
  };
}
