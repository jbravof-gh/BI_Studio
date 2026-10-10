import React, { useState, useMemo } from 'react';
import { CanvasElement } from '../types';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Copy, 
  Edit2, 
  Edit3,
  Check, 
  Type, 
  TrendingUp, 
  Table as TableIcon, 
  BarChart2, 
  Image as ImageIcon, 
  QrCode, 
  Square,
  Package,
  PackageOpen,
  CornerDownRight,
  ListOrdered,
  X,
  Sparkles,
  Search,
  Filter,
  Tag,
  Palette,
  CheckCheck
} from 'lucide-react';

export interface ColorTagPreset {
  id: string;
  name: string;
  hex: string;
  border: string;
  bg: string;
  text: string;
}

export const COLOR_TAG_PRESETS: ColorTagPreset[] = [
  { id: 'red', name: 'Rojo', hex: '#ef4444', border: 'border-red-500', bg: 'bg-red-500/20', text: 'text-red-400' },
  { id: 'orange', name: 'Naranja', hex: '#f97316', border: 'border-orange-500', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { id: 'amber', name: 'Ámbar', hex: '#f59e0b', border: 'border-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  { id: 'green', name: 'Verde', hex: '#10b981', border: 'border-emerald-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  { id: 'cyan', name: 'Cian', hex: '#06b6d4', border: 'border-cyan-500', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  { id: 'indigo', name: 'Índigo', hex: '#6366f1', border: 'border-indigo-500', bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  { id: 'purple', name: 'Púrpura', hex: '#a855f7', border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { id: 'pink', name: 'Rosa', hex: '#ec4899', border: 'border-pink-500', bg: 'bg-pink-500/20', text: 'text-pink-400' },
];

interface LayersPanelProps {
  elements: CanvasElement[];
  selectedElementId: string | null;
  selectedElementIds?: string[];
  onSelectElement: (id: string, isMultiSelect?: boolean) => void;
  onSelectMultipleElements?: (ids: string[]) => void;
  onUpdateElement: (updated: CanvasElement) => void;
  onBatchUpdateElements?: (updated: CanvasElement[]) => void;
  onReorderElements: (reordered: CanvasElement[]) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onGroupElements?: () => void;
  onUngroupElement?: (groupId: string) => void;
  onToggleLockAll?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedElementId,
  selectedElementIds = [],
  onSelectElement,
  onSelectMultipleElements,
  onUpdateElement,
  onBatchUpdateElements,
  onReorderElements,
  onDeleteElement,
  onDuplicateElement,
  onGroupElements,
  onUngroupElement,
  onToggleLockAll
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorTagFilter, setSelectedColorTagFilter] = useState<string | null>(null);

  // Color tag popover menu active element ID
  const [openColorTagMenuId, setOpenColorTagMenuId] = useState<string | null>(null);

  // Batch Rename Modal / Flyout State
  const [showBatchRename, setShowBatchRename] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('Elemento');
  const [batchSuffix, setBatchSuffix] = useState('');
  const [batchFormat, setBatchFormat] = useState<'1' | '01' | 'paren' | 'hash' | 'alpha'>('1');
  const [batchStartIndex, setBatchStartIndex] = useState(1);
  const [batchOrder, setBatchOrder] = useState<'z-desc' | 'z-asc' | 'canvas-y'>('z-desc');
  const [batchScope, setBatchScope] = useState<'selected' | 'all'>('selected');

  const activeSelectedIds = selectedElementIds.length > 0
    ? selectedElementIds
    : (selectedElementId ? [selectedElementId] : []);

  // Elements sorted in descending Z-index (topmost first)
  const sortedElements = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  // Count tags in use
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    elements.forEach(el => {
      if (el.colorTag) {
        counts[el.colorTag] = (counts[el.colorTag] || 0) + 1;
      }
    });
    return counts;
  }, [elements]);

  const activeTagsInUse = useMemo(() => {
    return COLOR_TAG_PRESETS.filter(p => (tagCounts[p.hex] || 0) > 0);
  }, [tagCounts]);

  // Lock / Unlock All state calculation
  const allLocked = elements.length > 0 && elements.every(el => el.locked);
  const someLocked = elements.some(el => el.locked);
  const lockedCount = useMemo(() => elements.filter(el => el.locked).length, [elements]);

  const handleToggleLockAllInternal = () => {
    if (elements.length === 0) return;
    if (onToggleLockAll) {
      onToggleLockAll();
    } else if (onBatchUpdateElements) {
      const targetState = !allLocked;
      const updated = elements.map(el => ({ ...el, locked: targetState }));
      onBatchUpdateElements(updated);
    } else {
      const targetState = !allLocked;
      elements.forEach(el => onUpdateElement({ ...el, locked: targetState }));
    }
  };

  // Filtered elements matching search query AND color tag filter
  const filteredElements = useMemo(() => {
    let list = sortedElements;
    
    // 1. Color tag filter
    if (selectedColorTagFilter) {
      if (selectedColorTagFilter === '__untagged__') {
        list = list.filter(el => !el.colorTag);
      } else {
        list = list.filter(el => el.colorTag === selectedColorTagFilter);
      }
    }

    // 2. Text Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(el => 
        el.name.toLowerCase().includes(query) || 
        el.type.toLowerCase().includes(query) ||
        (el.binding?.tableName && el.binding.tableName.toLowerCase().includes(query))
      );
    }

    return list;
  }, [sortedElements, searchQuery, selectedColorTagFilter]);

  // Handler for setting color tag (supports single or multi-select batch assignment)
  const handleSetColorTag = (targetId: string, hexColor?: string) => {
    const isTargetSelected = activeSelectedIds.includes(targetId);
    
    // If target element is part of a multi-selection, update all selected elements!
    if (isTargetSelected && activeSelectedIds.length > 1) {
      if (onBatchUpdateElements) {
        const updatedBatch = elements
          .filter(el => activeSelectedIds.includes(el.id))
          .map(el => ({ ...el, colorTag: hexColor }));
        onBatchUpdateElements(updatedBatch);
      } else {
        elements.forEach(el => {
          if (activeSelectedIds.includes(el.id)) {
            onUpdateElement({ ...el, colorTag: hexColor });
          }
        });
      }
    } else {
      // Single element update
      const target = elements.find(el => el.id === targetId);
      if (target) {
        onUpdateElement({ ...target, colorTag: hexColor });
      }
    }
    setOpenColorTagMenuId(null);
  };

  // Select all layers that share a specific color tag
  const handleSelectAllWithColorTag = (hexColor: string) => {
    const matchingIds = elements.filter(el => el.colorTag === hexColor).map(el => el.id);
    if (matchingIds.length > 0) {
      if (onSelectMultipleElements) {
        onSelectMultipleElements(matchingIds);
      } else {
        onSelectElement(matchingIds[0]);
      }
    }
  };

  const moveLayerById = (id: string, direction: 'up' | 'down') => {
    const index = sortedElements.findIndex(el => el.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedElements.length) return;

    const newSorted = [...sortedElements];
    const temp = newSorted[index];
    newSorted[index] = newSorted[targetIndex];
    newSorted[targetIndex] = temp;

    // Recalculate zIndices
    const updated = newSorted.map((el, idx) => ({
      ...el,
      zIndex: newSorted.length - idx
    }));

    onReorderElements(updated);
  };

  const getElementIcon = (el: CanvasElement) => {
    if (el.isGroup || (el.type === 'container' && el.childrenIds && el.childrenIds.length > 0)) {
      return <Package className="w-3.5 h-3.5 text-indigo-400" />;
    }
    switch (el.type) {
      case 'text': return <Type className="w-3.5 h-3.5 text-blue-500" />;
      case 'kpi': return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
      case 'table': return <TableIcon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'chart': return <BarChart2 className="w-3.5 h-3.5 text-amber-500" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-pink-500" />;
      case 'qrcode': return <QrCode className="w-3.5 h-3.5 text-purple-500" />;
      case 'container': return <Square className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <Square className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Compute targets for batch rename
  const getBatchTargets = () => {
    let targets: CanvasElement[] = [];
    if (batchScope === 'selected' && activeSelectedIds.length > 0) {
      targets = elements.filter(el => activeSelectedIds.includes(el.id));
    } else {
      targets = [...elements];
    }

    if (batchOrder === 'z-desc') {
      targets.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    } else if (batchOrder === 'z-asc') {
      targets.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    } else if (batchOrder === 'canvas-y') {
      targets.sort((a, b) => a.y - b.y || a.x - b.x);
    }

    return targets;
  };

  const formatSequenceNumber = (index: number) => {
    const num = batchStartIndex + index;
    switch (batchFormat) {
      case '01':
        return String(num).padStart(2, '0');
      case 'paren':
        return `(${num})`;
      case 'hash':
        return `#${num}`;
      case 'alpha':
        return String.fromCharCode(65 + (index % 26));
      case '1':
      default:
        return String(num);
    }
  };

  const generateName = (prefix: string, index: number, suffix: string) => {
    const seq = formatSequenceNumber(index);
    const parts = [prefix.trim(), seq];
    if (suffix.trim()) parts.push(suffix.trim());
    return parts.join(' ');
  };

  const handleApplyBatchRename = () => {
    const targets = getBatchTargets();
    if (targets.length === 0) return;

    const updatedElements = elements.map(el => {
      const targetIdx = targets.findIndex(t => t.id === el.id);
      if (targetIdx !== -1) {
        return {
          ...el,
          name: generateName(batchPrefix, targetIdx, batchSuffix)
        };
      }
      return el;
    });

    if (onBatchUpdateElements) {
      onBatchUpdateElements(updatedElements);
    } else {
      updatedElements.forEach(updatedEl => onUpdateElement(updatedEl));
    }

    setShowBatchRename(false);
  };

  return (
    <div className="w-72 bg-[#202225] border-l border-[#2f3136] flex flex-col h-full select-none text-[#e1e1e6] z-10 relative">
      {/* Header */}
      <div className="p-3 border-b border-[#2f3136] bg-[#202225] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-white uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#5865f2]" />
            <span>Capas</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Lock/Unlock All Action Button */}
            <button
              id="layers-lock-unlock-all-btn"
              type="button"
              onClick={handleToggleLockAllInternal}
              disabled={elements.length === 0}
              title={
                allLocked
                  ? `Desbloquear todas las capas (${lockedCount}/${elements.length}) - Unlock All`
                  : `Bloquear todas las capas (${elements.length} capas) para protegerlas de movimientos o cambios accidentales - Lock All`
              }
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition cursor-pointer border ${
                elements.length === 0
                  ? 'opacity-30 cursor-not-allowed bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af]'
                  : allLocked
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 shadow-xs'
                  : someLocked
                  ? 'bg-[#1a1b1e] hover:bg-[#25282c] border-amber-500/40 text-amber-400 hover:text-amber-300'
                  : 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136] text-[#9ca3af] hover:text-white'
              }`}
            >
              {allLocked ? (
                <>
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Desbloquear todo</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-[#9ca3af]" />
                  <span>Bloquear todo</span>
                </>
              )}
            </button>

            {/* Batch Rename Action Button */}
            <button
              onClick={() => {
                // Guess a good prefix from first selected
                const first = elements.find(el => activeSelectedIds.includes(el.id));
                if (first) {
                  const cleanPrefix = first.name.replace(/\s*\d+.*$/, '').trim() || first.type;
                  setBatchPrefix(cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1));
                }
                setBatchScope(activeSelectedIds.length >= 2 ? 'selected' : 'all');
                setShowBatchRename(prev => !prev);
              }}
              title="Renombrar capas en lote secuencialmente"
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                showBatchRename
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] text-[#9ca3af] hover:text-white'
              }`}
            >
              <ListOrdered className="w-3 h-3 text-amber-400" />
              <span>Lote</span>
            </button>

            {activeSelectedIds.length >= 2 && onGroupElements && (
              <button
                onClick={onGroupElements}
                title="Agrupar elementos seleccionados (Ctrl+G)"
                className="px-1.5 py-0.5 text-[10px] font-bold bg-[#5865f2] hover:bg-[#4752c4] text-white rounded flex items-center gap-1 shadow transition"
              >
                <Package className="w-3 h-3" />
                <span>({activeSelectedIds.length})</span>
              </button>
            )}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1b1e] border border-[#2f3136] text-[#9ca3af]">
              {searchQuery || selectedColorTagFilter ? `${filteredElements.length}/${elements.length}` : elements.length}
            </span>
          </div>
        </div>

        {/* Search / Filter Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar capas por nombre o tipo..."
            className="w-full pl-8 pr-7 py-1.5 bg-[#141517] border border-[#2f3136] rounded-md text-xs text-white placeholder-[#6b7280] focus:outline-none focus:border-[#5865f2] focus:ring-1 focus:ring-[#5865f2]/40 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
              className="absolute right-2 p-0.5 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Color Tag Filter Chips Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none text-[10px]">
          <button
            type="button"
            onClick={() => setSelectedColorTagFilter(null)}
            className={`px-2 py-0.5 rounded-full font-medium transition cursor-pointer flex-shrink-0 flex items-center gap-1 ${
              selectedColorTagFilter === null
                ? 'bg-[#5865f2] text-white font-bold shadow-xs'
                : 'bg-[#141517] text-[#9ca3af] hover:text-white border border-[#2f3136]'
            }`}
          >
            <span>Todos</span>
            <span className="opacity-70 font-mono text-[9px]">{elements.length}</span>
          </button>

          {/* Color filter chips */}
          {COLOR_TAG_PRESETS.map((preset) => {
            const count = tagCounts[preset.hex] || 0;
            const isFilterActive = selectedColorTagFilter === preset.hex;
            if (count === 0 && selectedColorTagFilter !== preset.hex) return null;

            return (
              <button
                key={`filter_tag_${preset.id}`}
                type="button"
                onClick={() => setSelectedColorTagFilter(isFilterActive ? null : preset.hex)}
                className={`px-1.5 py-0.5 rounded-full font-medium transition cursor-pointer flex-shrink-0 flex items-center gap-1 border ${
                  isFilterActive
                    ? `${preset.bg} ${preset.border} ${preset.text} font-bold ring-1 ring-white/20 shadow-xs`
                    : 'bg-[#141517] text-[#9ca3af] hover:text-white border-[#2f3136]'
                }`}
                title={`Filtrar por etiqueta ${preset.name} (${count} capas)`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: preset.hex }}
                />
                <span className="truncate max-w-[50px]">{preset.name}</span>
                <span className="font-mono text-[9px] opacity-75">{count}</span>
              </button>
            );
          })}

          {/* Untagged filter button if some tagged elements exist */}
          {Object.keys(tagCounts).length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedColorTagFilter(selectedColorTagFilter === '__untagged__' ? null : '__untagged__')}
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium transition cursor-pointer flex-shrink-0 flex items-center gap-1 border ${
                selectedColorTagFilter === '__untagged__'
                  ? 'bg-zinc-700 text-white border-zinc-500 font-bold'
                  : 'bg-[#141517] text-[#9ca3af] hover:text-white border-[#2f3136]'
              }`}
              title="Mostrar solo capas sin etiqueta"
            >
              <span>Sin etiqueta</span>
              <span className="font-mono">{elements.filter(e => !e.colorTag).length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Rename Drawer / Modal */}
      {showBatchRename && (
        <div className="p-3 bg-[#1e1f22] border-b border-amber-500/40 space-y-2.5 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Renombrado en Lote</span>
            </div>
            <button
              onClick={() => setShowBatchRename(false)}
              className="p-1 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scope Selector */}
          <div className="flex bg-[#141517] p-0.5 rounded border border-[#2f3136] text-[10px]">
            <button
              onClick={() => setBatchScope('selected')}
              disabled={activeSelectedIds.length === 0}
              className={`flex-1 py-1 rounded font-semibold transition ${
                batchScope === 'selected'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-[#9ca3af] hover:text-white disabled:opacity-30'
              }`}
            >
              Seleccionados ({activeSelectedIds.length})
            </button>
            <button
              onClick={() => setBatchScope('all')}
              className={`flex-1 py-1 rounded font-semibold transition ${
                batchScope === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Todas las capas ({elements.length})
            </button>
          </div>

          {/* Prefix & Suffix */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-[#9ca3af] block mb-0.5">Prefijo / Nombre</label>
              <input
                type="text"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                placeholder="Ej. Tarjeta"
                className="w-full text-xs font-semibold px-2 py-1 bg-[#141517] border border-[#2f3136] rounded text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9ca3af] block mb-0.5">Sufijo (Opcional)</label>
              <input
                type="text"
                value={batchSuffix}
                onChange={(e) => setBatchSuffix(e.target.value)}
                placeholder="Ej. Resumen"
                className="w-full text-xs font-semibold px-2 py-1 bg-[#141517] border border-[#2f3136] rounded text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Format and Start Index */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-[#9ca3af] block mb-0.5">Formato Secuencia</label>
              <select
                value={batchFormat}
                onChange={(e) => setBatchFormat(e.target.value as any)}
                className="w-full text-xs bg-[#141517] border border-[#2f3136] rounded px-1.5 py-1 text-white focus:outline-none cursor-pointer"
              >
                <option value="1">1, 2, 3...</option>
                <option value="01">01, 02, 03...</option>
                <option value="paren">(1), (2), (3)...</option>
                <option value="hash">#1, #2, #3...</option>
                <option value="alpha">A, B, C...</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#9ca3af] block mb-0.5">Iniciar en</label>
              <input
                type="number"
                min={0}
                value={batchStartIndex}
                onChange={(e) => setBatchStartIndex(Math.max(0, parseInt(e.target.value) || 1))}
                className="w-full text-xs font-mono px-2 py-1 bg-[#141517] border border-[#2f3136] rounded text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Ordering strategy */}
          <div>
            <label className="text-[10px] text-[#9ca3af] block mb-0.5">Orden de Renombrado</label>
            <select
              value={batchOrder}
              onChange={(e) => setBatchOrder(e.target.value as any)}
              className="w-full text-xs bg-[#141517] border border-[#2f3136] rounded px-1.5 py-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="z-desc">De Arriba a Abajo (Z-Index Descendente)</option>
              <option value="z-asc">De Fondo a Frente (Z-Index Ascendente)</option>
              <option value="canvas-y">Posición Vertical en Lienzo (Y)</option>
            </select>
          </div>

          {/* Live Preview List */}
          <div className="bg-[#141517] p-2 rounded border border-[#2f3136] max-h-28 overflow-y-auto space-y-1">
            <div className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Vista Previa ({getBatchTargets().length} elementos)</span>
            </div>
            {getBatchTargets().length === 0 ? (
              <div className="text-[10px] text-[#9ca3af] italic">No hay elementos seleccionados</div>
            ) : (
              getBatchTargets().slice(0, 5).map((el, i) => (
                <div key={el.id} className="text-[10px] flex items-center justify-between text-[#9ca3af] gap-1">
                  <span className="truncate max-w-[90px]">{el.name}</span>
                  <span className="text-[#5865f2]">➔</span>
                  <span className="font-bold text-white truncate max-w-[100px]">
                    {generateName(batchPrefix, i, batchSuffix)}
                  </span>
                </div>
              ))
            )}
            {getBatchTargets().length > 5 && (
              <div className="text-[9px] text-[#6b7280] text-center pt-0.5">
                + {getBatchTargets().length - 5} elementos más...
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => setShowBatchRename(false)}
              className="flex-1 py-1 px-2 text-xs font-semibold text-[#9ca3af] hover:text-white bg-[#141517] hover:bg-[#25282c] border border-[#2f3136] rounded transition"
            >
              Cancelar
            </button>
            <button
              disabled={getBatchTargets().length === 0}
              onClick={handleApplyBatchRename}
              className="flex-1 py-1 px-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded shadow transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </button>
          </div>
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {elements.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#9ca3af]">
            No hay elementos en el lienzo. Arrastra controles desde el panel izquierdo.
          </div>
        ) : filteredElements.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#141517] border border-[#2f3136] flex items-center justify-center mx-auto text-[#9ca3af]">
              <Search className="w-4 h-4" />
            </div>
            <p className="text-xs text-[#9ca3af]">
              No se encontraron capas que coincidan con &ldquo;<span className="text-white font-semibold">{searchQuery}</span>&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] text-[#5865f2] rounded transition cursor-pointer"
            >
              Limpiar filtro
            </button>
          </div>
        ) : (
          filteredElements.map((el, idx) => {
            const isPrimarySelected = el.id === selectedElementId;
            const isMultiSelected = activeSelectedIds.includes(el.id);
            const isEditing = editingId === el.id;
            const isGroupContainer = !!el.isGroup;
            const isGroupChild = !!el.groupId;

            // Highlight search query in name if present
            const renderHighlightedName = (name: string) => {
              if (!searchQuery.trim()) return name;
              const q = searchQuery.trim();
              const lowerName = name.toLowerCase();
              const lowerQ = q.toLowerCase();
              const matchIdx = lowerName.indexOf(lowerQ);
              if (matchIdx === -1) return name;
              const before = name.substring(0, matchIdx);
              const match = name.substring(matchIdx, matchIdx + q.length);
              const after = name.substring(matchIdx + q.length);
              return (
                <span>
                  {before}
                  <mark className="bg-yellow-400/30 text-yellow-200 rounded-xs px-0.5 font-bold">{match}</mark>
                  {after}
                </span>
              );
            };

            const isColorMenuOpen = openColorTagMenuId === el.id;
            const currentTagPreset = COLOR_TAG_PRESETS.find(p => p.hex === el.colorTag);

            return (
              <div
                key={el.id}
                onClick={(e) => {
                  const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                  onSelectElement(el.id, isMulti);
                }}
                style={{
                  borderLeftColor: el.colorTag || undefined,
                  borderLeftWidth: el.colorTag ? '4px' : undefined
                }}
                className={`p-2 rounded-lg border flex items-center gap-2 transition-all cursor-pointer group relative ${
                  isGroupChild ? 'ml-3 bg-[#17181b]' : ''
                } ${
                  isPrimarySelected
                    ? 'bg-[#5865f2]/20 border-[#5865f2] ring-1 ring-[#5865f2] shadow-xs'
                    : isMultiSelected
                    ? 'bg-[#5865f2]/10 border-[#5865f2]/60 ring-1 ring-[#5865f2]/40'
                    : isGroupContainer
                    ? 'bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/60'
                    : el.colorTag
                    ? 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136]'
                    : 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136]'
                }`}
              >
                {/* Nested Group Child Indicator */}
                {isGroupChild && (
                  <CornerDownRight className="w-3 h-3 text-indigo-400/60 flex-shrink-0 -mr-1" />
                )}

                {/* Element icon */}
                <div className={`p-1 rounded border flex-shrink-0 ${
                  isGroupContainer 
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' 
                    : 'bg-[#25282c] border-[#373a40]'
                }`}>
                  {getElementIcon(el)}
                </div>

                {/* Name / Editable title */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateElement({ ...el, name: editName });
                            setEditingId(null);
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="w-full text-xs font-semibold px-1 py-0.5 border border-[#5865f2] rounded bg-[#1a1b1e] text-white"
                      />
                      <button
                        onClick={() => {
                          onUpdateElement({ ...el, name: editName });
                          setEditingId(null);
                        }}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(el.id);
                        setEditName(el.name);
                      }}
                      className="text-xs font-semibold text-white truncate flex items-center gap-1"
                      title={el.name}
                    >
                      <span className="truncate">{renderHighlightedName(el.name)}</span>
                      {isGroupContainer && (
                        <span className="text-[9px] px-1 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono font-bold">
                          GRUPO
                        </span>
                      )}
                      {currentTagPreset && (
                        <span
                          className={`text-[8px] font-bold px-1 py-0.2 rounded-full border ${currentTagPreset.bg} ${currentTagPreset.border} ${currentTagPreset.text}`}
                          title={`Etiqueta: ${currentTagPreset.name}`}
                        >
                          {currentTagPreset.name}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] text-[#9ca3af] flex items-center gap-1 truncate">
                    <span className="uppercase font-mono text-[9px]">{el.type}</span>
                    <span>•</span>
                    <span className="font-mono">z:{el.zIndex}</span>
                    {isGroupContainer && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-400 font-mono">({el.childrenIds?.length || 0} hijos)</span>
                      </>
                    )}
                    {el.binding.tableName && (
                      <>
                        <span>•</span>
                        <span className="text-[#5865f2] truncate">{el.binding.tableName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {/* Color Tag Picker Button */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenColorTagMenuId(isColorMenuOpen ? null : el.id)}
                      title={el.colorTag ? `Etiqueta de color: ${currentTagPreset?.name || 'Personalizada'} (clic para cambiar)` : 'Asignar etiqueta de color'}
                      className={`p-1 rounded transition flex items-center justify-center cursor-pointer ${
                        el.colorTag
                          ? 'hover:scale-110'
                          : 'text-[#9ca3af] opacity-40 group-hover:opacity-100 hover:text-white hover:bg-[#2f3136]'
                      }`}
                    >
                      {el.colorTag ? (
                        <span
                          className="w-3 h-3 rounded-full border border-white/40 shadow-xs block transition"
                          style={{ backgroundColor: el.colorTag }}
                        />
                      ) : (
                        <Tag className="w-3 h-3" />
                      )}
                    </button>

                    {/* Color Tag Selector Popover */}
                    {isColorMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 z-50 w-52 p-2 bg-[#1a1b1e] border border-[#373a40] rounded-lg shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="flex items-center justify-between border-b border-[#2f3136] pb-1.5 text-[11px] font-bold text-white">
                          <div className="flex items-center gap-1 text-[#e1e1e6]">
                            <Palette className="w-3.5 h-3.5 text-[#5865f2]" />
                            <span>Etiqueta de Color</span>
                          </div>
                          <button
                            onClick={() => setOpenColorTagMenuId(null)}
                            className="p-0.5 text-[#9ca3af] hover:text-white rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {COLOR_TAG_PRESETS.map((preset) => {
                            const isSelected = el.colorTag === preset.hex;
                            return (
                              <button
                                key={`layer_tag_preset_${preset.id}`}
                                type="button"
                                onClick={() => handleSetColorTag(el.id, preset.hex)}
                                title={preset.name}
                                className={`flex flex-col items-center gap-1 p-1 rounded-md transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#25282c] border-white/60 ring-1 ring-white/30'
                                    : 'bg-[#141517] hover:bg-[#25282c] border-[#2f3136]'
                                }`}
                              >
                                <span
                                  className="w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                                  style={{ backgroundColor: preset.hex }}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow" />}
                                </span>
                                <span className="text-[8.5px] text-[#9ca3af] leading-none truncate max-w-[40px]">
                                  {preset.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Multi-select hint */}
                        {activeSelectedIds.length > 1 && activeSelectedIds.includes(el.id) && (
                          <div className="text-[9.5px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-center font-medium">
                            Se aplicará a las {activeSelectedIds.length} capas seleccionadas
                          </div>
                        )}

                        {/* Actions: Clear Tag / Select All with Tag */}
                        <div className="pt-1 border-t border-[#2f3136] flex flex-col gap-1 text-[10px]">
                          {el.colorTag && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSelectAllWithColorTag(el.colorTag!)}
                                className="w-full py-1 px-1.5 text-left text-indigo-300 hover:text-white hover:bg-[#25282c] rounded flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <CheckCheck className="w-3 h-3 text-indigo-400" />
                                <span>Seleccionar todas con este color</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetColorTag(el.id, undefined)}
                                className="w-full py-1 px-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Quitar etiqueta de color</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Ungroup button for group containers */}
                  {isGroupContainer && onUngroupElement && (
                    <button
                      onClick={() => onUngroupElement(el.id)}
                      title="Desagrupar contenedor (Ctrl+Shift+G)"
                      className="p-1 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded transition"
                    >
                      <PackageOpen className="w-3 h-3" />
                    </button>
                  )}

                  {/* Move Up/Down */}
                  <button
                    disabled={sortedElements.findIndex(e => e.id === el.id) === 0}
                    onClick={() => moveLayerById(el.id, 'up')}
                    title="Subir capa"
                    className="p-1 text-[#9ca3af] hover:text-white disabled:opacity-20 rounded hover:bg-[#2f3136] transition cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    disabled={sortedElements.findIndex(e => e.id === el.id) === sortedElements.length - 1}
                    onClick={() => moveLayerById(el.id, 'down')}
                    title="Bajar capa"
                    className="p-1 text-[#9ca3af] hover:text-white disabled:opacity-20 rounded hover:bg-[#2f3136] transition cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>

                  {/* Visibility */}
                  <button
                    onClick={() => onUpdateElement({ ...el, visible: !el.visible })}
                    title={el.visible ? 'Ocultar' : 'Mostrar'}
                    className={`p-1 rounded transition cursor-pointer ${el.visible ? 'text-[#9ca3af] hover:text-white' : 'text-rose-400 bg-rose-500/20'}`}
                  >
                    {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  {/* Lock */}
                  <button
                    onClick={() => onUpdateElement({ ...el, locked: !el.locked })}
                    title={el.locked ? 'Desbloquear' : 'Bloquear'}
                    className={`p-1 rounded transition cursor-pointer ${el.locked ? 'text-amber-400 bg-amber-500/20' : 'text-[#9ca3af] hover:text-white'}`}
                  >
                    {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Layer footer info */}
      <div className="p-2.5 bg-[#202225] border-t border-[#2f3136] text-[11px] text-[#9ca3af] flex items-center justify-between">
        <span>Shift+Click multi-selección</span>
        <span className="text-[#6b7280]">Doble clic renombra</span>
      </div>
    </div>
  );
};
