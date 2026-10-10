import React from 'react';
import { CanvasElement, CanvasDocument, DrillStep } from '../types';
import { useJQueryUI } from '../hooks/useJQueryUI';
import { CanvasElementView } from './CanvasElementView';
import { Lock, Unlock, Copy, Trash2, ArrowUp, ArrowDown, EyeOff, Package, PackageOpen } from 'lucide-react';

interface CanvasElementItemProps {
  element: CanvasElement;
  isSelected: boolean;
  isMultiSelected?: boolean;
  dbRecords: Record<string, Record<string, any>[]>;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
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
  currentDocument?: CanvasDocument;
  onUpdateElement?: (updated: CanvasElement) => void;
  onSelect: (e?: React.MouseEvent) => void;
  onDragMove?: (elementId: string, x: number, y: number, width: number, height: number) => void;
  onDragEnd?: () => void;
  onChangePosition: (x: number, y: number) => void;
  onChangeSize: (width: number, height: number, x: number, y: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onUngroup?: (groupId: string) => void;
  onContextMenu?: (e: React.MouseEvent, element: CanvasElement) => void;
}

export const CanvasElementItem: React.FC<CanvasElementItemProps> = ({
  element,
  isSelected,
  isMultiSelected = false,
  dbRecords,
  zoom,
  snapToGrid,
  gridSize,
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
  currentDocument,
  onUpdateElement,
  onSelect,
  onDragMove,
  onDragEnd,
  onChangePosition,
  onChangeSize,
  onDelete,
  onDuplicate,
  onToggleLock,
  onBringToFront,
  onSendToBack,
  onUngroup,
  onContextMenu
}) => {
  const nodeRef = useJQueryUI({
    elementId: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    locked: element.locked,
    disabled: previewMode,
    zoom,
    snapToGrid,
    gridSize,
    lockAspectRatio: element.lockAspectRatio,
    onDragMove: (newX, newY) => {
      if (onDragMove) {
        onDragMove(element.id, newX, newY, element.width, element.height);
      }
    },
    onDragEnd: () => {
      if (onDragEnd) {
        onDragEnd();
      }
    },
    onDragStop: (newX, newY) => onChangePosition(newX, newY),
    onResizeStop: (newW, newH, newX, newY) => onChangeSize(newW, newH, newX, newY),
    onSelect: () => onSelect()
  });

  if (!element.visible && !previewMode) {
    return null; // or render with low opacity
  }
  if (!element.visible && previewMode) {
    return null;
  }

  const itemStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: element.zIndex || 1,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    cursor: previewMode ? 'default' : element.locked ? 'not-allowed' : 'move',
    userSelect: 'none'
  };

  const activeSelection = (isSelected || isMultiSelected) && !previewMode;

  return (
    <div
      ref={nodeRef}
      id={`canvas-el-${element.id}`}
      style={itemStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (!previewMode) {
          onSelect(e);
        }
      }}
      onContextMenu={(e) => {
        if (!previewMode && onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(e);
          onContextMenu(e, element);
        }
      }}
      className={`group transition-all duration-150 ${
        activeSelection
          ? element.isGroup
            ? 'ring-2 ring-[#6366f1] ring-offset-1 ring-offset-[#1a1b1e] z-50'
            : isMultiSelected && !isSelected
            ? 'ring-2 ring-[#5865f2]/70 ring-dashed ring-offset-1 ring-offset-[#1a1b1e] z-40'
            : 'ring-2 ring-[#5865f2] ring-offset-1 ring-offset-[#1a1b1e] z-50'
          : !previewMode
          ? 'hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 hover:ring-offset-[#1a1b1e] hover:outline-dashed hover:outline-1 hover:outline-indigo-400/80 hover:shadow-lg hover:shadow-indigo-500/20'
          : ''
      }`}
    >
      {/* Visual Hover Badge showing which element is about to be selected */}
      {!activeSelection && !previewMode && (
        <div className="canvas-ui-ignore opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none absolute -top-6 left-0 bg-[#1e1f22]/95 border border-indigo-500/60 text-[#e1e1e6] text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg z-50 whitespace-nowrap flex items-center gap-1 backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="font-semibold text-white truncate max-w-[140px]">{element.name}</span>
          <span className="text-indigo-300 font-mono text-[8px] uppercase">({element.type})</span>
        </div>
      )}
      {/* Element Content */}
      <CanvasElementView
        element={element}
        dbRecords={dbRecords}
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
        currentDocument={currentDocument}
        onUpdateElement={onUpdateElement}
      />

      {/* Selection UI Badge & Quick Actions Bar */}
      {activeSelection && (
        <>
          {/* Dimension pill */}
          <div className="canvas-ui-ignore absolute -top-7 left-0 bg-[#202225] border border-[#2f3136] text-[#e1e1e6] text-[10px] font-mono px-2 py-0.5 rounded shadow-lg flex items-center gap-1.5 pointer-events-none z-50 whitespace-nowrap">
            {element.isGroup ? (
              <span className="font-semibold text-indigo-400 flex items-center gap-1">
                <Package className="w-3 h-3 text-indigo-400" />
                <span>{element.name}</span>
              </span>
            ) : (
              <span className="font-semibold text-white">{element.name}</span>
            )}
            <span className="text-[#9ca3af]">|</span>
            <span>{Math.round(element.width)}×{Math.round(element.height)}</span>
            <span className="text-[#9ca3af]">({Math.round(element.x)}, {Math.round(element.y)})</span>
          </div>

          {/* Quick Floating Actions Toolbar (only on primary selected item) */}
          {isSelected && (
            <div
              className="canvas-ui-ignore absolute -top-8 right-0 bg-[#202225] border border-[#2f3136] rounded-md shadow-2xl p-1 flex items-center gap-1 z-50 text-[#e1e1e6]"
              onClick={(e) => e.stopPropagation()}
            >
              {element.isGroup && onUngroup && (
                <button
                  onClick={() => onUngroup(element.id)}
                  title="Desagrupar contenedor (Ctrl+Shift+G)"
                  className="p-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-white rounded transition flex items-center gap-1 text-[10px] font-semibold px-1.5"
                >
                  <PackageOpen className="w-3 h-3" />
                  <span>Desagrupar</span>
                </button>
              )}
              <button
                onClick={onBringToFront}
                title="Traer al frente"
                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white transition"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onSendToBack}
                title="Enviar al fondo"
                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white transition"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDuplicate}
                title="Duplicar elemento"
                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white transition"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggleLock}
                title={element.locked ? 'Desbloquear' : 'Bloquear posición'}
                className={`p-1 hover:bg-[#2f3136] rounded transition ${element.locked ? 'text-amber-400' : 'text-[#9ca3af]'}`}
              >
                {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onDelete}
                title="Eliminar"
                className="p-1 hover:bg-rose-500/20 rounded text-[#9ca3af] hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Lock indicator */}
      {element.locked && !previewMode && (
        <div className="canvas-ui-ignore absolute bottom-1 right-1 bg-amber-500/80 text-white p-1 rounded-sm shadow pointer-events-none">
          <Lock className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};
