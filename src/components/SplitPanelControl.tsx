import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CanvasElement, ControlType } from '../types';
import {
  Columns2,
  Rows2,
  Grid2x2,
  Plus,
  Trash2,
  GripVertical,
  GripHorizontal,
  Move,
  Package,
  Sparkles,
  Info
} from 'lucide-react';

export interface SplitPanelSlotItem {
  id: string;
  type: ControlType;
  name: string;
  width?: number;
  height?: number;
  style?: any;
  binding?: any;
}

interface SplitPanelControlProps {
  element: CanvasElement;
  dbRecords: Record<string, Record<string, any>[]>;
  previewMode?: boolean;
  onUpdateElement?: (updated: CanvasElement) => void;
  renderItem?: (subElement: CanvasElement) => React.ReactNode;
}

export const SplitPanelControl: React.FC<SplitPanelControlProps> = ({
  element,
  dbRecords,
  previewMode = false,
  onUpdateElement,
  renderItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const binding = element.binding || {};

  // Orientation: 'vertical' (2 cols) | 'horizontal' (2 rows) | 'grid4' (2x2)
  const orientation = binding.splitOrientation || 'vertical';

  // Split ratios (0.1 to 0.9)
  const [ratio, setRatio] = useState<number>(binding.splitRatio ?? 0.5);
  const [ratioH, setRatioH] = useState<number>(binding.splitRatioH ?? 0.5);
  const [ratioV, setRatioV] = useState<number>(binding.splitRatioV ?? 0.5);

  const ratioRef = useRef<number>(binding.splitRatio ?? 0.5);
  const ratioHRef = useRef<number>(binding.splitRatioH ?? 0.5);
  const ratioVRef = useRef<number>(binding.splitRatioV ?? 0.5);
  const elementRef = useRef<CanvasElement>(element);
  const onUpdateElementRef = useRef(onUpdateElement);

  elementRef.current = element;
  onUpdateElementRef.current = onUpdateElement;

  // Dragging active state
  const [isDragging, setIsDragging] = useState<'ratio' | 'ratioH' | 'ratioV' | 'center' | null>(null);

  // Active drop target slot
  const [activeDropSlot, setActiveDropSlot] = useState<string | null>(null);

  // Sync external changes
  useEffect(() => {
    if (binding.splitRatio !== undefined && !isDragging) {
      setRatio(binding.splitRatio);
      ratioRef.current = binding.splitRatio;
    }
  }, [binding.splitRatio, isDragging]);

  useEffect(() => {
    if (binding.splitRatioH !== undefined && !isDragging) {
      setRatioH(binding.splitRatioH);
      ratioHRef.current = binding.splitRatioH;
    }
    if (binding.splitRatioV !== undefined && !isDragging) {
      setRatioV(binding.splitRatioV);
      ratioVRef.current = binding.splitRatioV;
    }
  }, [binding.splitRatioH, binding.splitRatioV, isDragging]);

  // Current slot dictionary
  const slots: Record<string, SplitPanelSlotItem[]> = binding.splitSlots || {};

  // Persist updated slots and ratios
  const handleUpdateSlots = useCallback(
    (newSlots: Record<string, SplitPanelSlotItem[]>, newRatio?: number, newH?: number, newV?: number) => {
      if (!onUpdateElementRef.current) return;
      const currentEl = elementRef.current;
      onUpdateElementRef.current({
        ...currentEl,
        binding: {
          ...currentEl.binding,
          splitSlots: newSlots,
          splitRatio: newRatio !== undefined ? newRatio : ratioRef.current,
          splitRatioH: newH !== undefined ? newH : ratioHRef.current,
          splitRatioV: newV !== undefined ? newV : ratioVRef.current
        }
      });
    },
    []
  );

  // Divider mouse down handlers
  const handleMouseDownDivider = (
    mode: 'ratio' | 'ratioH' | 'ratioV' | 'center',
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(mode);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      if (mode === 'ratio') {
        if (orientation === 'vertical') {
          const relX = moveEvent.clientX - rect.left;
          const newRatio = Math.max(0.08, Math.min(0.92, relX / rect.width));
          const rounded = Math.round(newRatio * 1000) / 1000;
          ratioRef.current = rounded;
          setRatio(rounded);
        } else {
          const relY = moveEvent.clientY - rect.top;
          const newRatio = Math.max(0.08, Math.min(0.92, relY / rect.height));
          const rounded = Math.round(newRatio * 1000) / 1000;
          ratioRef.current = rounded;
          setRatio(rounded);
        }
      } else if (mode === 'ratioV') {
        const relX = moveEvent.clientX - rect.left;
        const newV = Math.max(0.08, Math.min(0.92, relX / rect.width));
        const rounded = Math.round(newV * 1000) / 1000;
        ratioVRef.current = rounded;
        setRatioV(rounded);
      } else if (mode === 'ratioH') {
        const relY = moveEvent.clientY - rect.top;
        const newH = Math.max(0.08, Math.min(0.92, relY / rect.height));
        const rounded = Math.round(newH * 1000) / 1000;
        ratioHRef.current = rounded;
        setRatioH(rounded);
      } else if (mode === 'center') {
        const relX = moveEvent.clientX - rect.left;
        const relY = moveEvent.clientY - rect.top;
        const newV = Math.max(0.08, Math.min(0.92, relX / rect.width));
        const newH = Math.max(0.08, Math.min(0.92, relY / rect.height));
        const roundedV = Math.round(newV * 1000) / 1000;
        const roundedH = Math.round(newH * 1000) / 1000;
        ratioVRef.current = roundedV;
        ratioHRef.current = roundedH;
        setRatioV(roundedV);
        setRatioH(roundedH);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsDragging(null);

      // Persist latest state safely without side-effects in state updaters
      if (onUpdateElementRef.current) {
        const currentEl = elementRef.current;
        onUpdateElementRef.current({
          ...currentEl,
          binding: {
            ...currentEl.binding,
            splitRatio: ratioRef.current,
            splitRatioH: ratioHRef.current,
            splitRatioV: ratioVRef.current
          }
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Reset divider on double click
  const handleResetDivider = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (orientation === 'grid4') {
      ratioHRef.current = 0.5;
      ratioVRef.current = 0.5;
      setRatioH(0.5);
      setRatioV(0.5);
      handleUpdateSlots(slots, 0.5, 0.5, 0.5);
    } else {
      ratioRef.current = 0.5;
      setRatio(0.5);
      handleUpdateSlots(slots, 0.5);
    }
  };

  // Drag and drop handlers for each panel slot
  const handleSlotDragOver = (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (activeDropSlot !== slotId) {
      setActiveDropSlot(slotId);
    }
  };

  const handleSlotDragLeave = (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeDropSlot === slotId) {
      setActiveDropSlot(null);
    }
  };

  const handleSlotDrop = (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropSlot(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      const preset = JSON.parse(dataStr);
      const newItem: SplitPanelSlotItem = {
        id: 'slot_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: preset.type || 'text',
        name: preset.name || preset.title || 'Control',
        width: preset.width || 280,
        height: preset.height || 160,
        style: preset.style || {},
        binding: preset.binding || {}
      };

      const currentList = slots[slotId] || [];
      const updated = {
        ...slots,
        [slotId]: [...currentList, newItem]
      };

      handleUpdateSlots(updated);
    } catch (err) {
      console.error('Error dropping item in panel slot:', err);
    }
  };

  // Remove an item from a slot
  const handleDeleteSlotItem = (slotId: string, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentList = slots[slotId] || [];
    const updatedList = currentList.filter(it => it.id !== itemId);
    const updated = {
      ...slots,
      [slotId]: updatedList
    };
    handleUpdateSlots(updated);
  };

  // Render a single dropped sub-element
  const renderSlotItemContent = (item: SplitPanelSlotItem, slotId: string) => {
    // Construct a lightweight CanvasElement for rendering
    const subEl: CanvasElement = {
      id: item.id,
      type: item.type,
      name: item.name,
      x: 0,
      y: 0,
      width: item.width || 300,
      height: item.height || 180,
      zIndex: 1,
      visible: true,
      locked: false,
      style: {
        ...item.style,
        boxShadow: undefined
      },
      binding: item.binding || {}
    };

    return (
      <div
        key={item.id}
        className="w-full bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col group transition hover:border-indigo-300"
      >
        {/* Item mini-toolbar */}
        {!previewMode && (
          <div className="h-6 bg-slate-50/90 border-b border-slate-200 px-2 flex items-center justify-between text-[10px] text-slate-500 select-none">
            <div className="flex items-center gap-1 font-medium truncate">
              <Package className="w-3 h-3 text-indigo-500 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{item.name}</span>
              <span className="text-[9px] font-mono uppercase text-slate-400">({item.type})</span>
            </div>
            <button
              type="button"
              onClick={(e) => handleDeleteSlotItem(slotId, item.id, e)}
              title="Eliminar control de este panel"
              className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Item body */}
        <div className="p-2 w-full overflow-hidden" style={{ minHeight: item.height ? Math.min(item.height, 220) : 120 }}>
          {renderItem ? (
            renderItem(subEl)
          ) : (
            <div className="flex items-center justify-center p-4 text-xs text-slate-500">
              {item.name} ({item.type})
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render a panel slot view (interactive drop zone)
  const renderPanelSlot = (slotId: string, slotTitle: string, slotIcon: React.ReactNode) => {
    const items = slots[slotId] || [];
    const isTarget = activeDropSlot === slotId;
    const hasItems = items.length > 0;

    return (
      <div
        id={`slot-${slotId}`}
        onDragOver={(e) => handleSlotDragOver(slotId, e)}
        onDragLeave={(e) => handleSlotDragLeave(slotId, e)}
        onDrop={(e) => handleSlotDrop(slotId, e)}
        className={`w-full h-full min-w-0 min-h-0 relative flex flex-col overflow-y-auto overflow-x-hidden p-2 transition-colors duration-150 ${
          isTarget
            ? 'bg-indigo-50/60 ring-2 ring-indigo-500/80 ring-inset'
            : 'bg-slate-50/40 hover:bg-slate-50/70'
        }`}
      >
        {/* Panel Slot Header */}
        {!previewMode && (
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/60 text-[11px] select-none flex-shrink-0">
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              {slotIcon}
              <span>{slotTitle}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
              hasItems ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/70 text-slate-500'
            }`}>
              {items.length} {items.length === 1 ? 'control' : 'controles'}
            </span>
          </div>
        )}

        {/* Content list or Empty State */}
        {hasItems ? (
          <div className="space-y-2 flex-1 min-h-0">
            {items.map(it => renderSlotItemContent(it, slotId))}

            {/* Drop helper at bottom of slot */}
            {!previewMode && (
              <div
                className={`py-2 px-3 rounded-lg border border-dashed text-center text-[10px] font-medium transition flex items-center justify-center gap-1.5 select-none ${
                  isTarget
                    ? 'border-indigo-500 bg-indigo-100/60 text-indigo-800 animate-pulse'
                    : 'border-slate-300/80 bg-white/60 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                <Plus className="w-3 h-3 text-indigo-500" />
                <span>Arrastra aquí otro control para apilar</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex-1 min-h-[90px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-3 text-center select-none transition ${
              isTarget
                ? 'border-indigo-500 bg-indigo-100/50 text-indigo-800 scale-[0.99]'
                : 'border-slate-300 bg-white/40 text-slate-400 hover:border-indigo-400 hover:text-slate-600'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-1.5 text-slate-400 group-hover:text-indigo-600 shadow-2xs">
              <Plus className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 mb-0.5">
              {slotTitle}
            </span>
            <span className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
              Arrastra y suelta aquí cualquier control de la paleta (KPI, Gráfico, Tabla...)
            </span>
          </div>
        )}
      </div>
    );
  };

  // Outer border and style
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: element.style.backgroundColor || '#ffffff',
    borderColor: element.style.borderColor || '#cbd5e1',
    borderWidth: `${element.style.borderWidth !== undefined ? element.style.borderWidth : 1}px`,
    borderStyle: element.style.borderStyle || 'solid',
    borderRadius: `${element.style.borderRadius !== undefined ? element.style.borderRadius : 10}px`,
    overflow: 'hidden',
    position: 'relative'
  };

  // Render 2 Vertical Panels (Left | Right)
  if (orientation === 'vertical') {
    const leftPercent = Math.round(ratio * 100);
    const rightPercent = 100 - leftPercent;

    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className="w-full h-full flex flex-row relative select-none shadow-xs"
      >
        {/* Left Panel */}
        <div
          style={{ width: `${leftPercent}%` }}
          className="h-full min-w-0 min-h-0 flex flex-col overflow-hidden"
        >
          {renderPanelSlot('panel-1', 'Panel Izquierdo', <Columns2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>

        {/* Resizable Vertical Divider Bar */}
        <div
          onMouseDown={(e) => handleMouseDownDivider('ratio', e)}
          onDoubleClick={handleResetDivider}
          title="Arrastra para redimensionar paneles (Doble clic para 50/50)"
          className={`relative w-2.5 h-full flex items-center justify-center cursor-col-resize select-none flex-shrink-0 z-20 group transition-colors ${
            isDragging === 'ratio'
              ? 'bg-indigo-600'
              : 'bg-slate-200/90 hover:bg-indigo-500 border-x border-slate-300'
          }`}
        >
          <div className="w-1 h-6 rounded-full bg-slate-400 group-hover:bg-white flex items-center justify-center">
            <GripVertical className="w-2.5 h-2.5 text-white opacity-90" />
          </div>
          {/* Subtle percentage indicator when dragging */}
          {isDragging === 'ratio' && (
            <div className="absolute top-2 -left-6 px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[9px] font-bold shadow-md z-30 pointer-events-none">
              {leftPercent}%
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div
          style={{ width: `${rightPercent}%` }}
          className="h-full min-w-0 min-h-0 flex flex-col overflow-hidden"
        >
          {renderPanelSlot('panel-2', 'Panel Derecho', <Columns2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>
      </div>
    );
  }

  // Render 2 Horizontal Panels (Top / Bottom)
  if (orientation === 'horizontal') {
    const topPercent = Math.round(ratio * 100);
    const bottomPercent = 100 - topPercent;

    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className="w-full h-full flex flex-col relative select-none shadow-xs"
      >
        {/* Top Panel */}
        <div
          style={{ height: `${topPercent}%` }}
          className="w-full min-w-0 min-h-0 flex flex-col overflow-hidden"
        >
          {renderPanelSlot('panel-1', 'Panel Superior', <Rows2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>

        {/* Resizable Horizontal Divider Bar */}
        <div
          onMouseDown={(e) => handleMouseDownDivider('ratio', e)}
          onDoubleClick={handleResetDivider}
          title="Arrastra para redimensionar paneles (Doble clic para 50/50)"
          className={`relative h-2.5 w-full flex items-center justify-center cursor-row-resize select-none flex-shrink-0 z-20 group transition-colors ${
            isDragging === 'ratio'
              ? 'bg-indigo-600'
              : 'bg-slate-200/90 hover:bg-indigo-500 border-y border-slate-300'
          }`}
        >
          <div className="h-1 w-6 rounded-full bg-slate-400 group-hover:bg-white flex items-center justify-center">
            <GripHorizontal className="w-2.5 h-2.5 text-white opacity-90" />
          </div>
          {isDragging === 'ratio' && (
            <div className="absolute left-2 -top-5 px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[9px] font-bold shadow-md z-30 pointer-events-none">
              {topPercent}%
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div
          style={{ height: `${bottomPercent}%` }}
          className="w-full min-w-0 min-h-0 flex flex-col overflow-hidden"
        >
          {renderPanelSlot('panel-2', 'Panel Inferior', <Rows2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>
      </div>
    );
  }

  // Render 4 Panels (Grid 2x2: Cuadrante)
  const leftPercent = Math.round(ratioV * 100);
  const rightPercent = 100 - leftPercent;
  const topPercent = Math.round(ratioH * 100);
  const bottomPercent = 100 - topPercent;

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="w-full h-full flex flex-col relative select-none shadow-xs"
    >
      {/* Top Row */}
      <div style={{ height: `${topPercent}%` }} className="w-full flex flex-row min-h-0 overflow-hidden">
        {/* Slot 1: Top-Left */}
        <div style={{ width: `${leftPercent}%` }} className="h-full min-w-0 overflow-hidden">
          {renderPanelSlot('panel-1', 'Panel Sup. Izquierdo', <Grid2x2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>

        {/* Vertical Divider (Top Half) */}
        <div
          onMouseDown={(e) => handleMouseDownDivider('ratioV', e)}
          onDoubleClick={handleResetDivider}
          title="Arrastra para ajustar ancho de columnas"
          className="w-2.5 h-full bg-slate-200 hover:bg-indigo-500 border-x border-slate-300 cursor-col-resize flex-shrink-0 transition-colors"
        />

        {/* Slot 2: Top-Right */}
        <div style={{ width: `${rightPercent}%` }} className="h-full min-w-0 overflow-hidden">
          {renderPanelSlot('panel-2', 'Panel Sup. Derecho', <Grid2x2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>
      </div>

      {/* Horizontal Divider Bar */}
      <div className="relative h-2.5 w-full flex items-center justify-center flex-shrink-0 z-20">
        <div
          onMouseDown={(e) => handleMouseDownDivider('ratioH', e)}
          onDoubleClick={handleResetDivider}
          title="Arrastra para ajustar altura de filas"
          className="w-full h-full bg-slate-200 hover:bg-indigo-500 border-y border-slate-300 cursor-row-resize transition-colors"
        />

        {/* Center Intersection Crosshair Handle */}
        <div
          style={{ left: `${leftPercent}%` }}
          onMouseDown={(e) => handleMouseDownDivider('center', e)}
          onDoubleClick={handleResetDivider}
          title="Arrastra la cruz para ajustar ambos ejes a la vez (Doble clic para 50/50)"
          className="absolute -translate-x-1/2 w-5 h-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-2 border-white flex items-center justify-center cursor-move z-30 transition transform hover:scale-110 active:scale-95"
        >
          <Move className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ height: `${bottomPercent}%` }} className="w-full flex flex-row min-h-0 overflow-hidden">
        {/* Slot 3: Bottom-Left */}
        <div style={{ width: `${leftPercent}%` }} className="h-full min-w-0 overflow-hidden">
          {renderPanelSlot('panel-3', 'Panel Inf. Izquierdo', <Grid2x2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>

        {/* Vertical Divider (Bottom Half) */}
        <div
          onMouseDown={(e) => handleMouseDownDivider('ratioV', e)}
          onDoubleClick={handleResetDivider}
          title="Arrastra para ajustar ancho de columnas"
          className="w-2.5 h-full bg-slate-200 hover:bg-indigo-500 border-x border-slate-300 cursor-col-resize flex-shrink-0 transition-colors"
        />

        {/* Slot 4: Bottom-Right */}
        <div style={{ width: `${rightPercent}%` }} className="h-full min-w-0 overflow-hidden">
          {renderPanelSlot('panel-4', 'Panel Inf. Derecho', <Grid2x2 className="w-3.5 h-3.5 text-indigo-600" />)}
        </div>
      </div>
    </div>
  );
};
