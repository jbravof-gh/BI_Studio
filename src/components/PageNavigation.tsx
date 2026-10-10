import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CanvasDocument, CanvasPage } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Columns2,
  Rows2,
  FileSpreadsheet,
  Check,
  X,
  FilePlus2,
  ChevronDown,
  Sparkles,
  Palette,
  Image
} from 'lucide-react';
import { CanvasThumbnail } from './CanvasThumbnail';

export const PRESET_TAB_COLORS = [
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Naranja', hex: '#f97316' },
  { name: 'Ámbar', hex: '#f59e0b' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Cian', hex: '#06b6d4' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Pizarra', hex: '#64748b' }
];

/* ----------------------------------------------------
   1. PAGE NAVIGATION TOOLBAR
   Top bar with page selector, independent prev/next,
   action buttons, and position/visibility toggles.
---------------------------------------------------- */
interface PageNavigationToolbarProps {
  document: CanvasDocument;
  onSwitchPage: (pageIndex: number) => void;
  onAddPage: (customName?: string) => void;
  onDuplicatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onRenamePage: (pageIndex: number, newName: string) => void;
  onChangeTabsPosition: (position: 'bottom' | 'left') => void;
  onToggleTabsVisibility: (show?: boolean) => void;
  previewMode?: boolean;
}

export const PageNavigationToolbar: React.FC<PageNavigationToolbarProps> = ({
  document: canvasDoc,
  onSwitchPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onRenamePage,
  onChangeTabsPosition,
  onToggleTabsVisibility,
  previewMode = false
}) => {
  const pages: CanvasPage[] = canvasDoc.pages && canvasDoc.pages.length > 0
    ? canvasDoc.pages
    : [
        {
          id: 'page_default_1',
          name: 'Página 1',
          elements: canvasDoc.elements || []
        }
      ];

  const activeIndex = typeof canvasDoc.activePageIndex === 'number'
    ? Math.min(Math.max(0, canvasDoc.activePageIndex), pages.length - 1)
    : 0;

  const tabsPosition = canvasDoc.pageTabsPosition || 'bottom';
  const showTabs = canvasDoc.showPageTabs !== undefined ? canvasDoc.showPageTabs : true;

  const [showPagePicker, setShowPagePicker] = useState<boolean>(false);
  const [isRenamingModal, setIsRenamingModal] = useState<boolean>(false);
  const [renameInputValue, setRenameInputValue] = useState<string>('');
  const pagePickerBtnRef = useRef<HTMLButtonElement>(null);

  const canGoBack = activeIndex > 0;
  const canGoForward = activeIndex < pages.length - 1;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showPagePicker &&
        pagePickerBtnRef.current &&
        !pagePickerBtnRef.current.contains(e.target as Node)
      ) {
        const pickerEl = document.getElementById('page-picker-dropdown');
        if (pickerEl && !pickerEl.contains(e.target as Node)) {
          setShowPagePicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPagePicker]);

  const handleStartRename = () => {
    setRenameInputValue(pages[activeIndex]?.name || '');
    setIsRenamingModal(true);
  };

  const handleConfirmRename = () => {
    if (renameInputValue.trim()) {
      onRenamePage(activeIndex, renameInputValue.trim());
    }
    setIsRenamingModal(false);
  };

  return (
    <div className="h-9 bg-[#1e2023] border-b border-[#2f3136] px-3 flex items-center justify-between select-none z-15 text-xs text-[#e1e1e6] flex-shrink-0">
      {/* Left Section: Independent Prev/Next Buttons & Page Picker */}
      <div className="flex items-center gap-1.5">
        {/* Independent Back Button */}
        <button
          onClick={() => canGoBack && onSwitchPage(activeIndex - 1)}
          disabled={!canGoBack}
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition text-xs font-semibold cursor-pointer ${
            canGoBack
              ? 'bg-[#2b2d31] hover:bg-[#35383e] hover:text-white text-[#e1e1e6] shadow-xs border border-[#3f4248]'
              : 'bg-transparent text-[#4f545c] cursor-not-allowed border border-transparent opacity-60'
          }`}
          title="Página Anterior (Alt + ←)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Atrás</span>
        </button>

        {/* Quick Page Picker Dropdown Button */}
        <div className="relative">
          <button
            ref={pagePickerBtnRef}
            onClick={() => setShowPagePicker(!showPagePicker)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141517] hover:bg-[#25282c] border border-[#2f3136] hover:border-[#5865f2] rounded-md transition font-medium text-xs text-[#e1e1e6] cursor-pointer"
            title="Desplegar lista de páginas"
          >
            {(pages[activeIndex]?.tabColor || pages[activeIndex]?.colorTag) ? (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs ring-1 ring-white/30"
                style={{ backgroundColor: pages[activeIndex]?.tabColor || pages[activeIndex]?.colorTag }}
              />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#5865f2]" />
            )}
            <span className="font-bold text-white">
              Página {activeIndex + 1} de {pages.length}
            </span>
            <span className="text-[#9ca3af] truncate max-w-[130px] hidden md:inline font-normal">
              : {pages[activeIndex]?.name}
            </span>
            <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
          </button>

          {/* Page Picker Popover Menu */}
          {showPagePicker && (
            <div
              id="page-picker-dropdown"
              className="absolute left-0 top-full mt-1.5 w-64 bg-[#18191c] border border-[#2f3136] rounded-lg shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="text-[11px] font-semibold text-[#9ca3af] px-2 py-1 border-b border-[#2f3136] mb-1 flex items-center justify-between">
                <span>Todas las Hojas ({pages.length})</span>
                <span className="text-[10px] text-[#5865f2] font-mono">Atajo: Alt + ← / →</span>
              </div>
              <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5 scrollbar-thin scrollbar-thumb-[#2f3136]">
                {pages.map((p, idx) => {
                  const pColor = p.tabColor || p.colorTag;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwitchPage(idx);
                        setShowPagePicker(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition cursor-pointer ${
                        idx === activeIndex
                          ? 'bg-[#5865f2] text-white font-medium shadow-xs'
                          : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-mono font-bold ${
                            idx === activeIndex
                              ? 'bg-white text-[#5865f2]'
                              : 'bg-[#25282c] text-[#9ca3af]'
                          }`}
                          style={pColor && idx !== activeIndex ? { borderColor: pColor, borderWidth: '1px', color: pColor } : undefined}
                        >
                          {idx + 1}
                        </span>
                        {pColor && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 shadow-xs"
                            style={{ backgroundColor: pColor }}
                          />
                        )}
                        <span className="truncate">{p.name}</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono ml-2">
                        {p.elements?.length || 0} elem
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 pt-1 border-t border-[#2f3136] flex items-center justify-between px-1">
                <button
                  onClick={() => {
                    onAddPage();
                    setShowPagePicker(false);
                  }}
                  className="flex items-center gap-1 text-[11px] text-[#5865f2] hover:text-[#7983f5] py-1 font-medium cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Añadir nueva página</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Independent Forward Button */}
        <button
          onClick={() => canGoForward && onSwitchPage(activeIndex + 1)}
          disabled={!canGoForward}
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition text-xs font-semibold cursor-pointer ${
            canGoForward
              ? 'bg-[#2b2d31] hover:bg-[#35383e] hover:text-white text-[#e1e1e6] shadow-xs border border-[#3f4248]'
              : 'bg-transparent text-[#4f545c] cursor-not-allowed border border-transparent opacity-60'
          }`}
          title="Página Siguiente (Alt + →)"
        >
          <span className="hidden sm:inline">Adelante</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Section: Page Actions (New, Duplicate, Rename, Delete) */}
      {!previewMode && (
        <div className="hidden md:flex items-center gap-1 bg-[#141517] px-1.5 py-0.5 rounded-md border border-[#2f3136]">
          <button
            onClick={() => onAddPage()}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#9ca3af] hover:text-white hover:bg-[#25282c] transition cursor-pointer"
            title="Crear nueva hoja en blanco"
          >
            <Plus className="w-3 h-3 text-[#5865f2]" />
            <span>Nueva Hoja</span>
          </button>
          <div className="w-[1px] h-3.5 bg-[#2f3136]" />
          <button
            onClick={() => onDuplicatePage(activeIndex)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#9ca3af] hover:text-white hover:bg-[#25282c] transition cursor-pointer"
            title="Duplicar página actual con todos sus elementos"
          >
            <Copy className="w-3 h-3 text-amber-400" />
            <span>Duplicar</span>
          </button>
          <div className="w-[1px] h-3.5 bg-[#2f3136]" />
          <button
            onClick={handleStartRename}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#9ca3af] hover:text-white hover:bg-[#25282c] transition cursor-pointer"
            title="Renombrar la página activa"
          >
            <Edit2 className="w-3 h-3 text-cyan-400" />
            <span>Renombrar</span>
          </button>
          {pages.length > 1 && (
            <>
              <div className="w-[1px] h-3.5 bg-[#2f3136]" />
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Eliminar la página "${pages[activeIndex].name}" y todos sus elementos?`
                    )
                  ) {
                    onDeletePage(activeIndex);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                title="Eliminar página activa"
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Right Section: Tab Visibility & Position Controls */}
      <div className="flex items-center gap-2">
        {/* Visibility Toggle Button */}
        <button
          onClick={() => onToggleTabsVisibility()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition text-xs font-medium cursor-pointer border ${
            showTabs
              ? 'bg-[#2b2d31] text-[#e1e1e6] border-[#3f4248] hover:bg-[#35383e] hover:text-white'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
          }`}
          title={showTabs ? 'Ocultar pestañas de hojas' : 'Mostrar pestañas de hojas'}
        >
          {showTabs ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-[#9ca3af]" />
              <span className="hidden sm:inline">Ocultar Etiquetas</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Mostrar Etiquetas</span>
            </>
          )}
        </button>

        {/* Position Switcher: Bottom / Left Toggle */}
        <div className="flex items-center bg-[#141517] p-0.5 rounded border border-[#2f3136]" title="Posición de las pestañas">
          <button
            onClick={() => onChangeTabsPosition('bottom')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
              tabsPosition === 'bottom'
                ? 'bg-[#5865f2] text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
            title="Mostrar pestañas abajo"
          >
            <Rows2 className="w-3 h-3" />
            <span className="hidden xl:inline">Abajo</span>
          </button>
          <button
            onClick={() => onChangeTabsPosition('left')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
              tabsPosition === 'left'
                ? 'bg-[#5865f2] text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
            title="Mostrar pestañas a la izquierda"
          >
            <Columns2 className="w-3 h-3" />
            <span className="hidden xl:inline">Izquierda</span>
          </button>
        </div>
      </div>

      {/* Rename Dialog Modal */}
      {isRenamingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#202225] border border-[#2f3136] rounded-xl shadow-2xl w-full max-w-sm p-4 text-[#e1e1e6] animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#5865f2]" />
              <span>Renombrar Página {activeIndex + 1}</span>
            </h4>
            <input
              type="text"
              autoFocus
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename();
                if (e.key === 'Escape') setIsRenamingModal(false);
              }}
              className="w-full bg-[#141517] border border-[#2f3136] focus:border-[#5865f2] rounded-lg px-3 py-2 text-xs text-white outline-none mb-4"
              placeholder="Nombre descriptivo de la hoja"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setIsRenamingModal(false)}
                className="px-3 py-1.5 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#2b2d31] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRename}
                className="px-4 py-1.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium shadow-sm transition cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------
   2. PAGE TAB STRIP COMPONENT
   Renders the actual visual tabs at bottom or left.
---------------------------------------------------- */
interface PageTabStripProps {
  document: CanvasDocument;
  position: 'bottom' | 'left';
  onSwitchPage: (pageIndex: number) => void;
  onAddPage: (customName?: string) => void;
  onDuplicatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onRenamePage: (pageIndex: number, newName: string) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onToggleTabsVisibility: (show?: boolean) => void;
  onUpdatePageColor?: (pageIndex: number, color?: string) => void;
  previewMode?: boolean;
}

export const PageTabStrip: React.FC<PageTabStripProps> = ({
  document: canvasDoc,
  position,
  onSwitchPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onRenamePage,
  onReorderPages,
  onToggleTabsVisibility,
  onUpdatePageColor,
  previewMode = false
}) => {
  const pages: CanvasPage[] = canvasDoc.pages && canvasDoc.pages.length > 0
    ? canvasDoc.pages
    : [
        {
          id: 'page_default_1',
          name: 'Página 1',
          elements: canvasDoc.elements || []
        }
      ];

  const activeIndex = typeof canvasDoc.activePageIndex === 'number'
    ? Math.min(Math.max(0, canvasDoc.activePageIndex), pages.length - 1)
    : 0;

  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const isLeft = position === 'left';
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Option state: allow user to enable/disable hover thumbnail previews
  const [showHoverPreviews, setShowHoverPreviews] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tab_hover_previews_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleHoverPreviews = () => {
    setShowHoverPreviews(prev => {
      const next = !prev;
      try {
        localStorage.setItem('tab_hover_previews_enabled', String(next));
      } catch {}
      return next;
    });
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleTabMouseEnter = (index: number, e: React.MouseEvent<HTMLElement>) => {
    if (!showHoverPreviews || editingPageIndex !== null) return;
    const target = e.currentTarget;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const cardWidth = 260;
      const cardHeight = 220;
      if (isLeft) {
        let left = rect.right + 12;
        if (left + cardWidth > window.innerWidth) {
          left = Math.max(10, rect.left - cardWidth - 12);
        }
        let top = rect.top + rect.height / 2 - cardHeight / 2;
        top = Math.max(10, Math.min(window.innerHeight - cardHeight - 10, top));
        setHoverCoords({ top, left });
      } else {
        let top = rect.top - cardHeight - 12;
        if (top < 10) top = rect.bottom + 12;
        let left = rect.left + rect.width / 2 - cardWidth / 2;
        left = Math.max(10, Math.min(window.innerWidth - cardWidth - 10, left));
        setHoverCoords({ top, left });
      }
      setHoveredIndex(index);
    }, 180);
  };

  const handleTabMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 100);
  };

  const pageDocForThumbnail = useMemo(() => {
    if (hoveredIndex === null || !pages[hoveredIndex]) return null;
    const targetPage = pages[hoveredIndex];
    const elements = hoveredIndex === activeIndex ? (canvasDoc.elements || []) : (targetPage.elements || []);
    return {
      ...canvasDoc,
      name: targetPage.name,
      width: targetPage.width || canvasDoc.width,
      height: targetPage.height || canvasDoc.height,
      backgroundColor: targetPage.backgroundColor || canvasDoc.backgroundColor,
      thumbnail: targetPage.thumbnail,
      elements
    };
  }, [hoveredIndex, pages, activeIndex, canvasDoc]);

  const handleSetPageColor = (index: number, color?: string) => {
    if (onUpdatePageColor) {
      onUpdatePageColor(index, color);
    }
  };

  useEffect(() => {
    if (editingPageIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPageIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeMenuIndex !== null &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setActiveMenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuIndex]);

  useEffect(() => {
    if (tabsScrollRef.current) {
      const activeEl = tabsScrollRef.current.querySelector(`[data-page-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeIndex, position]);

  const showTabs = canvasDoc.showPageTabs !== undefined ? canvasDoc.showPageTabs : true;
  if (!showTabs) return null;

  const handleStartRename = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPageIndex(index);
    setEditingName(pages[index].name);
    setActiveMenuIndex(null);
  };

  const handleSaveRename = (index: number) => {
    if (editingName.trim()) {
      onRenamePage(index, editingName.trim());
    }
    setEditingPageIndex(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingPageIndex(null);
    setEditingName('');
  };

  const handleOpenTabMenu = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredIndex(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 310;

    let top = isLeft ? rect.top : rect.top - menuHeight - 8;
    if (top + menuHeight > window.innerHeight) {
      top = Math.max(10, window.innerHeight - menuHeight - 10);
    }
    if (top < 10) top = rect.bottom + 8;

    let left = isLeft ? rect.right + 8 : rect.left;
    if (left + menuWidth > window.innerWidth) {
      left = Math.max(10, window.innerWidth - menuWidth - 10);
    }

    setMenuCoords({ top, left });
    setActiveMenuIndex(index);
  };

  return (
    <>
      <div
        className={`bg-slate-50 dark:bg-[#18191c] border-slate-200 dark:border-[#2f3136] z-15 select-none flex ${
          isLeft
            ? 'w-56 border-r flex-col h-full overflow-hidden flex-shrink-0'
            : 'h-10 border-t items-center w-full overflow-hidden px-2 flex-shrink-0'
        }`}
      >
        {/* Header if positioned on Left */}
        {isLeft && (
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-[#2f3136] bg-white dark:bg-[#1e2023] flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#e1e1e6]">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#5865f2]" />
              <span>Hojas ({pages.length})</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Option to toggle hover previews */}
              <button
                onClick={toggleHoverPreviews}
                className={`p-1 rounded transition cursor-pointer ${
                  showHoverPreviews
                    ? 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#2b2d31]'
                }`}
                title={
                  showHoverPreviews
                    ? 'Vista previa en miniatura al pasar cursor: ACTIVADA (clic para desactivar)'
                    : 'Vista previa en miniatura al pasar cursor: DESACTIVADA (clic para activar)'
                }
              >
                <Image className="w-3.5 h-3.5" />
              </button>
              {!previewMode && (
                <button
                  onClick={() => onAddPage()}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#2b2d31] transition cursor-pointer"
                  title="Añadir nueva página"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onToggleTabsVisibility(false)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#2b2d31] transition cursor-pointer"
                title="Ocultar pestañas laterales"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable list of tabs */}
        <div
          ref={tabsScrollRef}
          className={`flex gap-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-[#2f3136] ${
            isLeft ? 'flex-col p-1.5 flex-1' : 'flex-row items-center flex-1 py-1'
          }`}
        >
          {pages.map((page, index) => {
            const isActive = index === activeIndex;
            const elementCount = page.elements ? page.elements.length : 0;
            const isEditing = editingPageIndex === index;
            const pageColor = page.tabColor || page.colorTag;

            if (isEditing) {
              return (
                <div
                  key={page.id}
                  data-page-index={index}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md bg-[#25282c] border border-[#5865f2] shadow-sm ${
                    isLeft ? 'w-full mb-1' : 'h-8 min-w-[160px]'
                  }`}
                >
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(index);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    className="flex-1 bg-transparent text-xs text-white px-1 py-0.5 outline-none font-medium"
                    placeholder="Nombre de página"
                  />
                  <button
                    onClick={() => handleSaveRename(index)}
                    className="p-0.5 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer"
                    title="Guardar nombre"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelRename}
                    className="p-0.5 text-red-400 hover:text-red-300 rounded cursor-pointer"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={page.id}
                data-page-index={index}
                onClick={() => onSwitchPage(index)}
                onDoubleClick={(e) => !previewMode && handleStartRename(index, e)}
                onContextMenu={(e) => !previewMode && handleOpenTabMenu(e, index)}
                onMouseEnter={(e) => handleTabMouseEnter(index, e)}
                onMouseLeave={handleTabMouseLeave}
                style={
                  pageColor
                    ? {
                        borderLeftColor: isLeft ? pageColor : undefined,
                        borderLeftWidth: isLeft ? '3.5px' : undefined,
                        borderBottomColor: !isLeft ? pageColor : undefined,
                        borderBottomWidth: !isLeft ? '3px' : undefined
                      }
                    : undefined
                }
                className={`group relative flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition select-none ${
                  isActive
                    ? 'bg-white dark:bg-[#2b2d31] text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200 dark:border-[#3f4248]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-[#e1e1e6] dark:hover:bg-[#202225] border border-transparent'
                } ${isLeft ? 'w-full mb-0.5' : 'h-8 max-w-[220px] min-w-[130px] flex-shrink-0'}`}
                title={
                  previewMode
                    ? `Página ${index + 1}: ${page.name} (${elementCount} elementos)`
                    : `Página ${index + 1}: ${page.name} (${elementCount} elementos)\nDoble clic para renombrar\nClic derecho para color y opciones`
                }
              >
                {/* Tab Index Badge & Name & Tag color dot */}
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span
                    style={
                      pageColor
                        ? {
                            backgroundColor: isActive ? pageColor : undefined,
                            borderColor: !isActive ? pageColor : undefined,
                            borderWidth: !isActive ? '1px' : undefined,
                            color: !isActive ? pageColor : '#ffffff'
                          }
                        : undefined
                    }
                    className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-mono font-bold flex-shrink-0 ${
                      isActive && !pageColor
                        ? 'bg-[#5865f2] text-white'
                        : !isActive && !pageColor
                        ? 'bg-[#1e2023] text-[#9ca3af] group-hover:bg-[#25282c]'
                        : ''
                    }`}
                  >
                    {index + 1}
                  </span>

                  {pageColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 shadow-xs ring-1 ring-white/20"
                      style={{ backgroundColor: pageColor }}
                      title={`Color de etiqueta: ${pageColor}`}
                    />
                  )}

                  <span className="truncate text-xs">{page.name}</span>
                </div>

                {/* Element Count & Menu */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] text-[#6b7280] group-hover:text-[#9ca3af] font-mono">
                    {elementCount}
                  </span>
                  {!previewMode && (
                    <button
                      onClick={(e) => handleOpenTabMenu(e, index)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#9ca3af] hover:text-white hover:bg-[#373a40] transition cursor-pointer"
                      title="Opciones de página y color"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Active Indicator Accent (when no custom color override) */}
                {isActive && !pageColor && (
                  <div
                    className={
                      isLeft
                        ? 'absolute left-0 top-1 bottom-1 w-1 bg-[#5865f2] rounded-r'
                        : 'absolute bottom-0 left-2 right-2 h-0.5 bg-[#5865f2] rounded-t'
                    }
                  />
                )}
              </div>
            );
          })}

          {/* Quick Add Page Tab Button */}
          {!previewMode && (
            <button
              onClick={() => onAddPage()}
              className={`flex items-center justify-center gap-1 text-xs text-[#9ca3af] hover:text-white hover:bg-[#25282c] border border-dashed border-[#2f3136] hover:border-[#5865f2] rounded-md transition cursor-pointer ${
                isLeft ? 'w-full py-1.5 mt-1' : 'h-8 px-2.5 flex-shrink-0'
              }`}
              title="Añadir nueva página"
            >
              <Plus className="w-3.5 h-3.5 text-[#5865f2]" />
              <span className="text-[11px]">Nueva Hoja</span>
            </button>
          )}
        </div>

        {/* Bottom tab bar quick toolbar tools (when position is bottom) */}
        {!isLeft && (
          <div className="flex items-center gap-1 pl-2 border-l border-[#2f3136] flex-shrink-0">
            {/* Option to toggle hover previews */}
            <button
              onClick={toggleHoverPreviews}
              className={`p-1 rounded transition cursor-pointer ${
                showHoverPreviews
                  ? 'text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/25'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
              }`}
              title={
                showHoverPreviews
                  ? 'Vista previa en miniatura al pasar cursor: ACTIVADA (clic para desactivar)'
                  : 'Vista previa en miniatura al pasar cursor: DESACTIVADA (clic para activar)'
              }
            >
              <Image className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onToggleTabsVisibility(false)}
              className="p-1 rounded text-[#9ca3af] hover:text-white hover:bg-[#25282c] transition cursor-pointer"
              title="Ocultar pestañas de páginas"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Page Thumbnail Hover Preview */}
      {showHoverPreviews && hoveredIndex !== null && hoverCoords && pageDocForThumbnail && (
        <div
          style={{
            top: hoverCoords.top,
            left: hoverCoords.left
          }}
          className="fixed z-50 pointer-events-none w-64 bg-[#18191c]/95 backdrop-blur-md border border-[#3f4248] rounded-xl shadow-2xl p-2.5 text-[#e1e1e6] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header with page number, name, element count, and custom tab color if set */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#2f3136]">
            <div className="flex items-center gap-1.5 min-w-0">
              {(pages[hoveredIndex]?.tabColor || pages[hoveredIndex]?.colorTag) ? (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs ring-1 ring-white/20"
                  style={{ backgroundColor: pages[hoveredIndex].tabColor || pages[hoveredIndex].colorTag }}
                />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#5865f2] flex-shrink-0" />
              )}
              <span className="text-[11px] font-bold text-white truncate">
                Pág. {hoveredIndex + 1}: {pages[hoveredIndex]?.name}
              </span>
            </div>
            {hoveredIndex === activeIndex && (
              <span className="text-[9px] font-semibold bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/40 px-1.5 py-0.5 rounded-full flex-shrink-0">
                Activa
              </span>
            )}
          </div>

          {/* Miniature Canvas Preview */}
          <div className="w-full bg-[#121315] rounded-lg overflow-hidden border border-[#2f3136] shadow-inner p-1">
            <CanvasThumbnail
              document={pageDocForThumbnail}
              className="w-full h-auto max-h-36"
              showBadge={false}
            />
          </div>

          {/* Footer metadata: dimensions and elements count */}
          <div className="flex items-center justify-between text-[10px] text-[#9ca3af] font-mono mt-2 pt-1 border-t border-[#25282c]">
            <span>{pageDocForThumbnail.width} × {pageDocForThumbnail.height} px</span>
            <span>{pageDocForThumbnail.elements?.length || 0} elementos</span>
          </div>
        </div>
      )}

      {/* Context Menu for Tab actions and Color Tag assignment */}
      {activeMenuIndex !== null && menuCoords && (
        <div
          ref={menuContainerRef}
          style={{ top: menuCoords.top, left: menuCoords.left }}
          className="fixed z-50 w-56 bg-[#18191c] border border-[#2f3136] rounded-lg shadow-2xl py-1 text-xs text-[#e1e1e6] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9ca3af] border-b border-[#2f3136] truncate flex items-center justify-between">
            <span className="truncate text-white font-bold">{pages[activeMenuIndex]?.name}</span>
            <span className="text-[10px] font-mono text-[#6b7280]">Pág. {activeMenuIndex + 1}</span>
          </div>

          <button
            onClick={() => handleStartRename(activeMenuIndex)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#25282c] text-left transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Renombrar</span>
          </button>
          <button
            onClick={() => {
              onDuplicatePage(activeMenuIndex);
              setActiveMenuIndex(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#25282c] text-left transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicar Página</span>
          </button>

          {/* Custom Color Tag Palette */}
          <div className="px-3 py-2 border-t border-[#2f3136]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#9ca3af] mb-1.5">
              <span className="flex items-center gap-1.5 text-[#e1e1e6]">
                <Palette className="w-3.5 h-3.5 text-[#5865f2]" />
                Color de etiqueta
              </span>
              {(pages[activeMenuIndex]?.tabColor || pages[activeMenuIndex]?.colorTag) && (
                <button
                  onClick={() => {
                    handleSetPageColor(activeMenuIndex, undefined);
                    setActiveMenuIndex(null);
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 transition cursor-pointer"
                  title="Quitar color asignado"
                >
                  Quitar
                </button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1.5 pt-0.5">
              {PRESET_TAB_COLORS.map(color => {
                const isSelected =
                  (pages[activeMenuIndex]?.tabColor || pages[activeMenuIndex]?.colorTag) === color.hex;
                return (
                  <button
                    key={color.hex}
                    onClick={() => {
                      handleSetPageColor(activeMenuIndex, color.hex);
                      setActiveMenuIndex(null);
                    }}
                    style={{ backgroundColor: color.hex }}
                    className={`w-5 h-5 rounded-full border transition-all hover:scale-115 cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'border-white ring-2 ring-white/40 scale-110 shadow-xs'
                        : 'border-black/30 hover:border-white/50'
                    }`}
                    title={color.name}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
              {/* Native Custom Color Picker */}
              <label
                className="w-5 h-5 rounded-full border border-[#4a4d55] bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400 flex items-center justify-center cursor-pointer hover:scale-115 transition-all relative overflow-hidden shadow-xs"
                title="Elegir color personalizado..."
              >
                <input
                  type="color"
                  value={pages[activeMenuIndex]?.tabColor || pages[activeMenuIndex]?.colorTag || '#5865f2'}
                  onChange={(e) => {
                    handleSetPageColor(activeMenuIndex, e.target.value);
                  }}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {/* Toggle hover previews option in menu */}
          <div className="border-t border-[#2f3136] pt-1">
            <button
              onClick={() => toggleHoverPreviews()}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#25282c] text-left transition cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2">
                <Image className="w-3.5 h-3.5 text-cyan-400" />
                <span>Miniatura al pasar cursor</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${showHoverPreviews ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-700/40 text-gray-400'}`}>
                {showHoverPreviews ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </button>
          </div>

          {/* Reorder Options */}
          {activeMenuIndex > 0 && (
            <button
              onClick={() => {
                onReorderPages(activeMenuIndex, activeMenuIndex - 1);
                setActiveMenuIndex(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#25282c] text-left transition cursor-pointer"
            >
              {isLeft ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#9ca3af]" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5 text-[#9ca3af]" />
              )}
              <span>Mover {isLeft ? 'arriba' : 'a la izquierda'}</span>
            </button>
          )}

          {activeMenuIndex < pages.length - 1 && (
            <button
              onClick={() => {
                onReorderPages(activeMenuIndex, activeMenuIndex + 1);
                setActiveMenuIndex(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#25282c] text-left transition cursor-pointer"
            >
              {isLeft ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#9ca3af]" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-[#9ca3af]" />
              )}
              <span>Mover {isLeft ? 'abajo' : 'a la derecha'}</span>
            </button>
          )}

          {pages.length > 1 && (
            <>
              <div className="my-1 border-t border-[#2f3136]" />
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Eliminar la página "${pages[activeMenuIndex].name}" y sus elementos?`
                    )
                  ) {
                    onDeletePage(activeMenuIndex);
                  }
                  setActiveMenuIndex(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/15 text-red-400 text-left transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Página</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

/* ----------------------------------------------------
   3. FLOATING PAGE NAVIGATION CONTROLS (Atrás / Adelante)
   Floating on canvas for quick independent back/forward
   access anywhere, anytime.
---------------------------------------------------- */
interface FloatingPageControlsProps {
  document: CanvasDocument;
  onSwitchPage: (pageIndex: number) => void;
  onToggleTabsVisibility: (show?: boolean) => void;
}

export const FloatingPageControls: React.FC<FloatingPageControlsProps> = ({
  document: canvasDoc,
  onSwitchPage,
  onToggleTabsVisibility
}) => {
  const pages: CanvasPage[] = canvasDoc.pages && canvasDoc.pages.length > 0
    ? canvasDoc.pages
    : [
        {
          id: 'page_default_1',
          name: 'Página 1',
          elements: canvasDoc.elements || []
        }
      ];

  const activeIndex = typeof canvasDoc.activePageIndex === 'number'
    ? Math.min(Math.max(0, canvasDoc.activePageIndex), pages.length - 1)
    : 0;

  const showTabs = canvasDoc.showPageTabs !== undefined ? canvasDoc.showPageTabs : true;
  const canGoBack = activeIndex > 0;
  const canGoForward = activeIndex < pages.length - 1;

  // Render floating pill if tabs are hidden or if user wants rapid independent navigation
  return (
    <div className="absolute bottom-4 left-6 z-30 flex items-center gap-1.5 bg-[#18191c]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#2f3136] shadow-xl text-xs text-[#e1e1e6] select-none hover:border-[#3f4248] transition">
      {/* Independent Prev Button */}
      <button
        onClick={() => canGoBack && onSwitchPage(activeIndex - 1)}
        disabled={!canGoBack}
        className={`p-1.5 rounded-full transition cursor-pointer ${
          canGoBack
            ? 'bg-[#2b2d31] hover:bg-[#5865f2] text-white'
            : 'text-[#4f545c] cursor-not-allowed opacity-50'
        }`}
        title="Página Anterior (Alt + ←)"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Page Info Pill */}
      <div className="flex items-center gap-1.5 px-2 font-mono text-[11px]">
        <span className="font-bold text-[#5865f2]">
          {activeIndex + 1}
        </span>
        <span className="text-[#6b7280]">/</span>
        <span className="text-[#9ca3af]">
          {pages.length}
        </span>
        <span className="text-[#9ca3af] font-sans font-medium truncate max-w-[110px] hidden sm:inline ml-1">
          {pages[activeIndex]?.name}
        </span>
      </div>

      {/* Independent Next Button */}
      <button
        onClick={() => canGoForward && onSwitchPage(activeIndex + 1)}
        disabled={!canGoForward}
        className={`p-1.5 rounded-full transition cursor-pointer ${
          canGoForward
            ? 'bg-[#2b2d31] hover:bg-[#5865f2] text-white'
            : 'text-[#4f545c] cursor-not-allowed opacity-50'
        }`}
        title="Página Siguiente (Alt + →)"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Quick toggle tab strip button if tabs are hidden */}
      {!showTabs && (
        <button
          onClick={() => onToggleTabsVisibility(true)}
          className="ml-1 p-1 rounded-full text-amber-400 hover:text-white hover:bg-amber-500/20 transition cursor-pointer"
          title="Mostrar pestañas de hojas"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
