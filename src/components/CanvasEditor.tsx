import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CanvasDocument, CanvasElement, DrillStep } from '../types';
import { CanvasElementItem } from './CanvasElementItem';
import { RulerOverlay } from './RulerOverlay';
import { 
  Sparkles, 
  MousePointerClick, 
  Package, 
  PackageOpen, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  MoveHorizontal,
  Trash2, 
  X,
  Layers,
  CheckSquare
} from 'lucide-react';

interface CanvasEditorProps {
  document: CanvasDocument;
  selectedElementId: string | null;
  selectedElementIds?: string[];
  dbRecords: Record<string, Record<string, any>[]>;
  zoom: number;
  previewMode?: boolean;
  selectedRecordIndex?: number;
  onRecordInserted?: (tableName: string, newRecord: Record<string, any>) => void;
  allFilterElements?: CanvasElement[];
  activeFilters?: Record<string, string[]>;
  onFilterChange?: (filterId: string, selectedValues: string[]) => void;
  allDrillElements?: CanvasElement[];
  activeDrillPaths?: Record<string, DrillStep[]>;
  onDrillPathChange?: (drillId: string, path: DrillStep[]) => void;
  currentPageId?: string;
  currentPageIndex?: number;
  filterElPageMap?: Record<string, string>;
  onSelectElement: (id: string | null, isMultiSelect?: boolean) => void;
  onSelectMultipleElements?: (ids: string[]) => void;
  onUpdateElement: (updated: CanvasElement) => void;
  onDeleteElement: (id: string) => void;
  onDeleteMultipleElements?: (ids: string[]) => void;
  onDuplicateElement: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onGroupElements?: () => void;
  onUngroupElement?: (groupId: string) => void;
  onAlignElements?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV') => void;
  onAddElement: (props: Partial<CanvasElement>, dropCoord?: { x: number; y: number }) => void;
  onContextMenuElement?: (e: React.MouseEvent, element: CanvasElement) => void;
  onContextMenuCanvas?: (e: React.MouseEvent) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  document: canvasDoc,
  selectedElementId,
  selectedElementIds = [],
  dbRecords,
  zoom,
  previewMode = false,
  selectedRecordIndex = 0,
  onRecordInserted,
  allFilterElements,
  activeFilters,
  onFilterChange,
  allDrillElements,
  activeDrillPaths,
  onDrillPathChange,
  currentPageId,
  currentPageIndex,
  filterElPageMap,
  onSelectElement,
  onSelectMultipleElements,
  onUpdateElement,
  onDeleteElement,
  onDeleteMultipleElements,
  onDuplicateElement,
  onBringToFront,
  onSendToBack,
  onGroupElements,
  onUngroupElement,
  onAlignElements,
  onAddElement,
  onContextMenuElement,
  onContextMenuCanvas
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Marquee Selection State
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);

  // Cursor coordinates relative to canvas (for ruler tracker & precision gauge)
  const [canvasCursorPos, setCanvasCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Custom User Guide lines created by clicking on rulers
  const [userGuides, setUserGuides] = useState<
    { id: string; type: 'horizontal' | 'vertical'; position: number }[]
  >([]);

  // Smart Guides State
  const [activeSmartGuides, setActiveSmartGuides] = useState<
    { type: 'vertical' | 'horizontal'; position: number; label?: string }[]
  >([]);

  const activeSelectedIds = selectedElementIds.length > 0 
    ? selectedElementIds 
    : (selectedElementId ? [selectedElementId] : []);

  const selectedElement = canvasDoc.elements.find(el => el.id === selectedElementId) || null;
  const selectedElements = canvasDoc.elements.filter(el => activeSelectedIds.includes(el.id));

  // Handler to add a user guide from ruler click
  const handleAddUserGuide = (type: 'horizontal' | 'vertical', position: number) => {
    const newGuide = {
      id: `guide_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      position
    };
    setUserGuides(prev => [...prev, newGuide]);
  };

  const handleRemoveUserGuide = (guideId: string) => {
    setUserGuides(prev => prev.filter(g => g.id !== guideId));
  };

  // Track cursor position on canvas for rulers
  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / zoom;
    const curY = (e.clientY - rect.top) / zoom;
    setCanvasCursorPos({ x: curX, y: curY });
  };

  const handleContainerMouseLeave = () => {
    setCanvasCursorPos(null);
  };

  // Smart Guides calculation during element drag
  const handleDragMove = useCallback((dragId: string, curX: number, curY: number, width: number, height: number) => {
    if (previewMode) return;

    const threshold = 5;
    const guides: { type: 'vertical' | 'horizontal'; position: number; label?: string }[] = [];

    const dragLeft = curX;
    const dragCenter = curX + width / 2;
    const dragRight = curX + width;

    const dragTop = curY;
    const dragMiddle = curY + height / 2;
    const dragBottom = curY + height;

    // 1. Canvas Boundary & Center Guides
    // Vertical Canvas Guides
    const canvasCenterX = canvasDoc.width / 2;
    if (Math.abs(dragCenter - canvasCenterX) <= threshold) {
      guides.push({ type: 'vertical', position: canvasCenterX, label: 'Centro Canvas' });
    }
    if (Math.abs(dragLeft - 0) <= threshold) {
      guides.push({ type: 'vertical', position: 0, label: 'Borde Izq' });
    }
    if (Math.abs(dragRight - canvasDoc.width) <= threshold) {
      guides.push({ type: 'vertical', position: canvasDoc.width, label: 'Borde Der' });
    }

    // Horizontal Canvas Guides
    const canvasCenterY = canvasDoc.height / 2;
    if (Math.abs(dragMiddle - canvasCenterY) <= threshold) {
      guides.push({ type: 'horizontal', position: canvasCenterY, label: 'Centro Canvas' });
    }
    if (Math.abs(dragTop - 0) <= threshold) {
      guides.push({ type: 'horizontal', position: 0, label: 'Borde Sup' });
    }
    if (Math.abs(dragBottom - canvasDoc.height) <= threshold) {
      guides.push({ type: 'horizontal', position: canvasDoc.height, label: 'Borde Inf' });
    }

    // 2. Alignments with other elements
    for (const other of canvasDoc.elements) {
      if (other.id === dragId || !other.visible) continue;

      const otherLeft = other.x;
      const otherCenter = other.x + other.width / 2;
      const otherRight = other.x + other.width;

      const otherTop = other.y;
      const otherMiddle = other.y + other.height / 2;
      const otherBottom = other.y + other.height;

      // Vertical Checks
      if (Math.abs(dragLeft - otherLeft) <= threshold) {
        guides.push({ type: 'vertical', position: otherLeft, label: `Izq (${other.name})` });
      } else if (Math.abs(dragCenter - otherCenter) <= threshold) {
        guides.push({ type: 'vertical', position: otherCenter, label: `Centro (${other.name})` });
      } else if (Math.abs(dragRight - otherRight) <= threshold) {
        guides.push({ type: 'vertical', position: otherRight, label: `Der (${other.name})` });
      } else if (Math.abs(dragLeft - otherRight) <= threshold) {
        guides.push({ type: 'vertical', position: otherRight, label: `Borde (${other.name})` });
      } else if (Math.abs(dragRight - otherLeft) <= threshold) {
        guides.push({ type: 'vertical', position: otherLeft, label: `Borde (${other.name})` });
      }

      // Horizontal Checks
      if (Math.abs(dragTop - otherTop) <= threshold) {
        guides.push({ type: 'horizontal', position: otherTop, label: `Sup (${other.name})` });
      } else if (Math.abs(dragMiddle - otherMiddle) <= threshold) {
        guides.push({ type: 'horizontal', position: otherMiddle, label: `Medio (${other.name})` });
      } else if (Math.abs(dragBottom - otherBottom) <= threshold) {
        guides.push({ type: 'horizontal', position: otherBottom, label: `Inf (${other.name})` });
      } else if (Math.abs(dragTop - otherBottom) <= threshold) {
        guides.push({ type: 'horizontal', position: otherBottom, label: `Borde (${other.name})` });
      } else if (Math.abs(dragBottom - otherTop) <= threshold) {
        guides.push({ type: 'horizontal', position: otherTop, label: `Borde (${other.name})` });
      }
    }

    // Deduplicate guides by type and proximity
    const uniqueGuides: typeof guides = [];
    for (const g of guides) {
      if (!uniqueGuides.some(u => u.type === g.type && Math.abs(u.position - g.position) < 2)) {
        uniqueGuides.push(g);
      }
    }

    setActiveSmartGuides(uniqueGuides.slice(0, 4));
  }, [canvasDoc.width, canvasDoc.height, canvasDoc.elements, previewMode]);

  const handleDragEnd = useCallback(() => {
    setActiveSmartGuides([]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (previewMode) return;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      const presetProps = JSON.parse(dataStr);
      const canvasRect = canvasRef.current?.getBoundingClientRect();

      if (canvasRect) {
        // Calculate coordinates relative to zoomed canvas
        const dropX = (e.clientX - canvasRect.left) / zoom;
        const dropY = (e.clientY - canvasRect.top) / zoom;

        // Snap to grid if enabled
        let finalX = dropX;
        let finalY = dropY;
        if (canvasDoc.snapToGrid && canvasDoc.gridSize > 0) {
          finalX = Math.round(dropX / canvasDoc.gridSize) * canvasDoc.gridSize;
          finalY = Math.round(dropY / canvasDoc.gridSize) * canvasDoc.gridSize;
        }

        onAddElement(presetProps, {
          x: Math.max(0, Math.round(finalX)),
          y: Math.max(0, Math.round(finalY))
        });
      }
    } catch (err) {
      console.error('Error handling drop on canvas:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Marquee Box Selection on Canvas Background
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (previewMode) return;
    // Only trigger if clicking directly on the canvas surface
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0) return; // only left click

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const startX = (e.clientX - canvasRect.left) / zoom;
    const startY = (e.clientY - canvasRect.top) / zoom;

    setIsMarqueeSelecting(true);
    setMarqueeStart({ x: startX, y: startY });
    setMarqueeCurrent({ x: startX, y: startY });

    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      onSelectElement(null);
    }
  };

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!isMarqueeSelecting || !marqueeStart || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const curX = (e.clientX - canvasRect.left) / zoom;
    const curY = (e.clientY - canvasRect.top) / zoom;

    setMarqueeCurrent({ x: curX, y: curY });
  }, [isMarqueeSelecting, marqueeStart, zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isMarqueeSelecting || !marqueeStart || !marqueeCurrent) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeCurrent(null);
      return;
    }

    const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
    const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
    const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
    const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

    const width = maxX - minX;
    const height = maxY - minY;

    // Only consider selection if dragged more than 5px
    if (width > 5 || height > 5) {
      const intersecting = canvasDoc.elements.filter(el => {
        if (!el.visible) return false;
        const elRight = el.x + el.width;
        const elBottom = el.y + el.height;
        return !(el.x > maxX || elRight < minX || el.y > maxY || elBottom < minY);
      });

      const ids = intersecting.map(el => el.id);
      if (onSelectMultipleElements) {
        onSelectMultipleElements(ids);
      } else if (ids.length > 0) {
        onSelectElement(ids[0]);
      }
    }

    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeCurrent(null);
  }, [isMarqueeSelecting, marqueeStart, marqueeCurrent, canvasDoc.elements, onSelectMultipleElements, onSelectElement]);

  useEffect(() => {
    if (isMarqueeSelecting) {
      window.addEventListener('mousemove', handleCanvasMouseMove);
      window.addEventListener('mouseup', handleCanvasMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleCanvasMouseMove);
        window.removeEventListener('mouseup', handleCanvasMouseUp);
      };
    }
  }, [isMarqueeSelecting, handleCanvasMouseMove, handleCanvasMouseUp]);

  // Compute marquee rect dimensions
  const marqueeBox = (isMarqueeSelecting && marqueeStart && marqueeCurrent) ? {
    left: Math.min(marqueeStart.x, marqueeCurrent.x),
    top: Math.min(marqueeStart.y, marqueeCurrent.y),
    width: Math.abs(marqueeCurrent.x - marqueeStart.x),
    height: Math.abs(marqueeCurrent.y - marqueeStart.y)
  } : null;

  return (
    <div
      className="flex-1 bg-[#141517] overflow-auto flex items-center justify-center p-10 relative select-none"
      onClick={() => onSelectElement(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      style={{
        backgroundImage: 'radial-gradient(rgba(75, 85, 99, 0.35) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Zoom transform container */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out'
        }}
        className="relative"
      >
        {/* Horizontal & Vertical Rulers Overlay */}
        {!previewMode && canvasDoc.showRulers !== false && (
          <RulerOverlay
            width={canvasDoc.width}
            height={canvasDoc.height}
            zoom={zoom}
            selectedElement={selectedElement}
            selectedElements={selectedElements}
            cursorPos={canvasCursorPos}
            onAddGuide={handleAddUserGuide}
          />
        )}

        {/* Canvas Surface Document */}
        <div
          ref={canvasRef}
          id="active-canvas-surface"
          style={{
            width: `${canvasDoc.width}px`,
            height: `${canvasDoc.height}px`,
            backgroundColor: canvasDoc.backgroundColor || '#ffffff'
          }}
          className={`relative shadow-2xl rounded-sm transition-colors duration-200 overflow-hidden border border-[#2f3136] ${
            canvasDoc.showGrid && !previewMode ? 'canvas-grid-pattern-dark' : ''
          }`}
          onMouseDown={handleCanvasMouseDown}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectElement(null);
            }
          }}
          onContextMenu={(e) => {
            if (!previewMode && onContextMenuCanvas) {
              e.preventDefault();
              onContextMenuCanvas(e);
            }
          }}
        >
          {/* Empty Canvas Placeholder Guide */}
          {canvasDoc.elements.length === 0 && !previewMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none select-none">
              <div className="w-12 h-12 rounded-xl bg-[#5865f2]/10 border border-[#5865f2]/20 flex items-center justify-center text-[#5865f2] mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-700 mb-1">
                Lienzo en Blanco (Clean Start)
              </h3>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed mb-3">
                Arrastra o haz clic en cualquier control de la barra izquierda para comenzar a diseñar tu reporte o interfaz.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-100/80 px-3 py-1.5 rounded-full border border-gray-200">
                <MousePointerClick className="w-3.5 h-3.5 text-[#5865f2]" />
                <span>Haz clic en un control del panel izquierdo para añadirlo</span>
              </div>
            </div>
          )}

          {/* User-created Guide Lines from Rulers */}
          {!previewMode && userGuides.map((guide) => {
            if (guide.type === 'vertical') {
              return (
                <div
                  key={guide.id}
                  className="absolute top-0 bottom-0 z-[9980] flex flex-col items-center group cursor-ew-resize"
                  style={{ left: `${guide.position}px` }}
                >
                  <div className="w-0 h-full border-l border-indigo-400/80 hover:border-indigo-300 drop-shadow-[0_0_4px_rgba(99,102,241,0.6)]" />
                  <div className="opacity-0 group-hover:opacity-100 absolute top-2 bg-[#1a1b1e] border border-indigo-500 text-[9px] font-mono text-indigo-300 px-1 py-0.5 rounded shadow flex items-center gap-1 -translate-x-1/2 transition">
                    <span>X: {Math.round(guide.position)}px</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUserGuide(guide.id);
                      }}
                      title="Eliminar guía"
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={guide.id}
                  className="absolute left-0 right-0 z-[9980] flex items-center group cursor-ns-resize"
                  style={{ top: `${guide.position}px` }}
                >
                  <div className="h-0 w-full border-t border-indigo-400/80 hover:border-indigo-300 drop-shadow-[0_0_4px_rgba(99,102,241,0.6)]" />
                  <div className="opacity-0 group-hover:opacity-100 absolute left-2 bg-[#1a1b1e] border border-indigo-500 text-[9px] font-mono text-indigo-300 px-1 py-0.5 rounded shadow flex items-center gap-1 -translate-y-1/2 transition">
                    <span>Y: {Math.round(guide.position)}px</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUserGuide(guide.id);
                      }}
                      title="Eliminar guía"
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            }
          })}

          {/* Marquee Drag Selection Box */}
          {marqueeBox && (
            <div
              className="absolute pointer-events-none border border-[#5865f2] bg-[#5865f2]/15 rounded-xs z-[9999]"
              style={{
                left: `${marqueeBox.left}px`,
                top: `${marqueeBox.top}px`,
                width: `${marqueeBox.width}px`,
                height: `${marqueeBox.height}px`
              }}
            />
          )}

          {/* Smart Alignment Guides */}
          {!previewMode && activeSmartGuides.map((guide, gIdx) => {
            if (guide.type === 'vertical') {
              return (
                <div
                  key={`smart_guide_v_${guide.position}_${gIdx}`}
                  className="absolute top-0 bottom-0 pointer-events-none z-[9990] flex flex-col items-center"
                  style={{ left: `${guide.position}px` }}
                >
                  <div className="w-0 h-full border-l-2 border-dashed border-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                  {guide.label && (
                    <div className="absolute top-2 bg-cyan-950/95 text-cyan-300 border border-cyan-400/80 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap -translate-x-1/2">
                      {guide.label} ({Math.round(guide.position)}px)
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div
                  key={`smart_guide_h_${guide.position}_${gIdx}`}
                  className="absolute left-0 right-0 pointer-events-none z-[9990] flex items-center"
                  style={{ top: `${guide.position}px` }}
                >
                  <div className="h-0 w-full border-t-2 border-dashed border-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                  {guide.label && (
                    <div className="absolute left-2 bg-cyan-950/95 text-cyan-300 border border-cyan-400/80 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap -translate-y-1/2">
                      {guide.label} ({Math.round(guide.position)}px)
                    </div>
                  )}
                </div>
              );
            }
          })}

          {/* Canvas Elements */}
          {canvasDoc.elements.map(el => {
            const isSelected = el.id === selectedElementId;
            const isMultiSelected = activeSelectedIds.includes(el.id);

            return (
              <CanvasElementItem
                key={el.id}
                element={el}
                isSelected={isSelected}
                isMultiSelected={isMultiSelected}
                dbRecords={dbRecords}
                zoom={zoom}
                snapToGrid={canvasDoc.snapToGrid}
                gridSize={canvasDoc.gridSize || 20}
                previewMode={previewMode}
                selectedRecordIndex={selectedRecordIndex}
                onRecordInserted={onRecordInserted}
                allFilterElements={allFilterElements}
                activeFilters={activeFilters}
                onFilterChange={onFilterChange}
                allDrillElements={allDrillElements}
                activeDrillPaths={activeDrillPaths}
                onDrillPathChange={onDrillPathChange}
                currentPageId={currentPageId}
                currentPageIndex={currentPageIndex}
                filterElPageMap={filterElPageMap}
                currentDocument={canvasDoc}
                onUpdateElement={onUpdateElement}
                onSelect={(e) => {
                  const isMulti = e?.shiftKey || e?.metaKey || e?.ctrlKey;
                  onSelectElement(el.id, isMulti);
                }}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onChangePosition={(newX, newY) => {
                  onUpdateElement({
                    ...el,
                    x: newX,
                    y: newY
                  });
                }}
                onChangeSize={(newW, newH, newX, newY) => {
                  onUpdateElement({
                    ...el,
                    width: newW,
                    height: newH,
                    x: newX,
                    y: newY
                  });
                }}
                onDelete={() => onDeleteElement(el.id)}
                onDuplicate={() => onDuplicateElement(el.id)}
                onToggleLock={() => onUpdateElement({ ...el, locked: !el.locked })}
                onBringToFront={() => onBringToFront(el.id)}
                onSendToBack={() => onSendToBack(el.id)}
                onUngroup={onUngroupElement}
                onContextMenu={(e, element) => {
                  if (onContextMenuElement) {
                    onContextMenuElement(e, element);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Dimension indicator badge outside canvas */}
        {!previewMode && (
          <div className="absolute -bottom-6 left-0 text-[11px] font-mono text-[#9ca3af] flex items-center gap-2">
            <span>{canvasDoc.width} × {canvasDoc.height} px</span>
            <span>•</span>
            <span>Base de Datos: <span className="font-semibold text-[#e1e1e6]">{canvasDoc.targetDatabase || 'Ninguna'}</span></span>
            {activeSelectedIds.length > 1 && (
              <>
                <span>•</span>
                <span className="text-[#5865f2] font-semibold">{activeSelectedIds.length} elementos seleccionados</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating Multi-Selection Action Toolbar */}
      {!previewMode && activeSelectedIds.length >= 2 && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#202225]/95 backdrop-blur-md border border-[#2f3136] rounded-xl shadow-2xl px-4 py-2 flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Selected Count Tag */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white pr-2 border-r border-[#2f3136]">
            <CheckSquare className="w-4 h-4 text-[#5865f2]" />
            <span>{activeSelectedIds.length} seleccionados</span>
          </div>

          {/* Group Elements Button */}
          {onGroupElements && (
            <button
              onClick={onGroupElements}
              title="Agrupar elementos seleccionados en un contenedor único (Ctrl+G)"
              className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#5865f2]/20 transition cursor-pointer hover:scale-105 active:scale-95"
            >
              <Package className="w-4 h-4" />
              <span>Agrupar Elementos (Ctrl+G)</span>
            </button>
          )}

          {/* Alignment Tools Group */}
          {onAlignElements && (
            <div className="flex items-center gap-1 px-2 border-l border-[#2f3136]">
              <button
                onClick={() => onAlignElements('left')}
                title="Alinear a la izquierda"
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignElements('center')}
                title="Centrar horizontalmente"
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignElements('right')}
                title="Alinear a la derecha"
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-px bg-[#2f3136] mx-0.5" />
              <button
                onClick={() => onAlignElements('top')}
                title="Alinear arriba"
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
              >
                <ArrowUpToLine className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignElements('bottom')}
                title="Alinear abajo"
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignElements('distributeH')}
                title="Distribuir horizontalmente"
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
              >
                <MoveHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Delete All Selected */}
          {onDeleteMultipleElements && (
            <button
              onClick={() => onDeleteMultipleElements(activeSelectedIds)}
              title="Eliminar todos los elementos seleccionados"
              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition hover:text-rose-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Clear Selection */}
          <button
            onClick={() => onSelectElement(null)}
            title="Deseleccionar todo (Escape)"
            className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2f3136] rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
