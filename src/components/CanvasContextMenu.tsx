import React, { useEffect, useRef } from 'react';
import { CanvasElement } from '../types';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  AlignCenter,
  Sliders,
  Sparkles,
  Type,
  TrendingUp,
  Table,
  Square,
  Grid,
  Magnet,
  Maximize2,
  Plus,
  Package,
  PackageOpen,
  Paintbrush,
  Palette,
  LayoutGrid
} from 'lucide-react';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  element: CanvasElement | null;
}

interface CanvasContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onBringForward?: (id: string) => void;
  onSendBackward?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onCenterElement?: (id: string) => void;
  onOpenInspector?: (id: string) => void;
  // Style copying actions
  onCopyStyle?: (id: string) => void;
  onPasteStyle?: (id: string) => void;
  hasCopiedStyle?: boolean;
  // Grouping actions
  selectedCount?: number;
  onGroup?: () => void;
  onUngroup?: (groupId: string) => void;
  // Layout automation
  onAutoArrange?: (scope?: 'all' | 'selected') => void;
  // Empty canvas actions
  onAddQuickElement?: (type: string, x: number, y: number) => void;
  onResetZoom?: () => void;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
  showGrid?: boolean;
  snapToGrid?: boolean;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  menuState,
  onClose,
  onDelete,
  onDuplicate,
  onToggleLock,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onToggleVisibility,
  onCenterElement,
  onOpenInspector,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle = false,
  selectedCount = 1,
  onGroup,
  onUngroup,
  onAutoArrange,
  onAddQuickElement,
  onResetZoom,
  onToggleGrid,
  onToggleSnap,
  showGrid,
  snapToGrid
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuState.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menuState.visible, onClose]);

  if (!menuState.visible) return null;

  // Calculate clamped coordinates so menu stays inside viewport
  const menuWidth = 240;
  const menuHeight = menuState.element ? 360 : 280;

  const posX = Math.min(Math.max(10, menuState.x), window.innerWidth - menuWidth - 10);
  const posY = Math.min(Math.max(10, menuState.y), window.innerHeight - menuHeight - 10);

  const el = menuState.element;

  return (
    <div
      ref={menuRef}
      id="canvas-context-menu"
      style={{
        position: 'fixed',
        left: `${posX}px`,
        top: `${posY}px`,
        zIndex: 9999
      }}
      className="w-[240px] bg-[#202225] text-[#e1e1e6] rounded-xl border border-[#2f3136] shadow-2xl shadow-black/80 py-1.5 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {el ? (
        /* Context menu for element */
        <>
          {/* Element header tag */}
          <div className="px-3 py-1.5 border-b border-[#2f3136] mb-1 flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <p className="text-xs font-bold text-white truncate">{el.name}</p>
              <p className="text-[10px] text-[#9ca3af] font-mono capitalize truncate">
                {el.type} • {Math.round(el.width)}×{Math.round(el.height)} px
              </p>
            </div>
            {el.locked && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-semibold rounded flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>Bloqueado</span>
              </span>
            )}
          </div>

          {/* Quick Primary Actions */}
          <div className="px-1 space-y-0.5">
            {/* Group Elements Option */}
            {selectedCount >= 2 && onGroup && (
              <button
                onClick={() => {
                  onGroup();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Agrupar ({selectedCount} elementos)</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300">Ctrl+G</span>
              </button>
            )}

            {/* Ungroup Container Option */}
            {(el.isGroup || el.groupId) && onUngroup && (
              <button
                onClick={() => {
                  onUngroup(el.isGroup ? el.id : el.groupId!);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <PackageOpen className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Desagrupar contenedor</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300">Ctrl+Shift+G</span>
              </button>
            )}

            <button
              onClick={() => {
                onDuplicate(el.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-[#5865f2] group-hover:scale-110 transition-transform" />
                <span className="font-medium">Duplicar</span>
              </div>
              <span className="text-[10px] font-mono text-[#9ca3af]">Ctrl+D</span>
            </button>

            {/* Copy Style */}
            {onCopyStyle && (
              <button
                onClick={() => {
                  onCopyStyle(el.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Copiar Estilo</span>
                </div>
                <span className="text-[10px] font-mono text-[#9ca3af]">Ctrl+Alt+C</span>
              </button>
            )}

            {/* Paste Style */}
            {onPasteStyle && (
              <button
                disabled={!hasCopiedStyle}
                onClick={() => {
                  if (hasCopiedStyle) {
                    onPasteStyle(el.id);
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition cursor-pointer group ${
                  hasCopiedStyle
                    ? 'text-[#e1e1e6] hover:text-white hover:bg-[#2f3136]'
                    : 'text-[#6b7280] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Palette className={`w-3.5 h-3.5 ${hasCopiedStyle ? 'text-emerald-400 group-hover:scale-110 transition-transform' : 'text-[#6b7280]'}`} />
                  <span className="font-medium">Pegar Estilo</span>
                </div>
                <span className="text-[10px] font-mono text-[#9ca3af]">Ctrl+Alt+V</span>
              </button>
            )}

            <button
              onClick={() => {
                onToggleLock(el.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                {el.locked ? (
                  <Unlock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-[#9ca3af] group-hover:scale-110 transition-transform" />
                )}
                <span className="font-medium">
                  {el.locked ? 'Desbloquear elemento' : 'Bloquear posición'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#9ca3af]">
                {el.locked ? 'Fijado' : 'Libre'}
              </span>
            </button>

            {onCenterElement && (
              <button
                onClick={() => {
                  onCenterElement(el.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <AlignCenter className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Centrar en lienzo</span>
                </div>
              </button>
            )}

            {/* Auto-arrange Grid Action */}
            {onAutoArrange && (
              selectedCount >= 2 ? (
                <>
                  <button
                    onClick={() => {
                      onAutoArrange('selected');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 rounded-md transition cursor-pointer group"
                    title="Auto-organizar elementos seleccionados en cuadrícula evitando solapamientos"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold">Auto-arrange ({selectedCount} sel.)</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300/80">Grid</span>
                  </button>
                  <button
                    onClick={() => {
                      onAutoArrange('all');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
                    title="Auto-organizar todo el lienzo en cuadrícula sin solapamiento"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">Auto-arrange (Lienzo)</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#9ca3af]">Todo</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onAutoArrange('all');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 rounded-md transition cursor-pointer group"
                  title="Auto-organizar elementos del lienzo en cuadrícula para evitar solapamientos"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold">Auto-arrange</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300/80">Grid</span>
                </button>
              )
            )}

            {onToggleVisibility && (
              <button
                onClick={() => {
                  onToggleVisibility(el.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  {el.visible !== false ? (
                    <EyeOff className="w-3.5 h-3.5 text-[#9ca3af] group-hover:scale-110 transition-transform" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-medium">
                    {el.visible !== false ? 'Ocultar elemento' : 'Mostrar elemento'}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[#2f3136]" />

          {/* Layer Ordering Sub-group */}
          <div className="px-1 space-y-0.5">
            <div className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9ca3af]">
              Orden de Capas
            </div>
            <button
              onClick={() => {
                onBringToFront(el.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <ChevronsUp className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Traer al frente</span>
              </div>
              <span className="text-[10px] font-mono text-[#9ca3af]">Top</span>
            </button>

            {onBringForward && (
              <button
                onClick={() => {
                  onBringForward(el.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-3.5 h-3.5 text-blue-300 group-hover:scale-110 transition-transform" />
                  <span>Subir una capa</span>
                </div>
                <span className="text-[10px] font-mono text-[#9ca3af]">+1</span>
              </button>
            )}

            {onSendBackward && (
              <button
                onClick={() => {
                  onSendBackward(el.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-3.5 h-3.5 text-blue-300 group-hover:scale-110 transition-transform" />
                  <span>Bajar una capa</span>
                </div>
                <span className="text-[10px] font-mono text-[#9ca3af]">-1</span>
              </button>
            )}

            <button
              onClick={() => {
                onSendToBack(el.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <ChevronsDown className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Enviar al fondo</span>
              </div>
              <span className="text-[10px] font-mono text-[#9ca3af]">Base</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[#2f3136]" />

          {/* Properties & Delete */}
          <div className="px-1 space-y-0.5">
            {onOpenInspector && (
              <button
                onClick={() => {
                  onOpenInspector(el.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Abrir en Inspector</span>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                onDelete(el.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-md transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Eliminar</span>
              </div>
              <span className="text-[10px] font-mono text-rose-400/80">Supr</span>
            </button>
          </div>
        </>
      ) : (
        /* Context menu for empty canvas */
        <>
          <div className="px-3 py-1.5 border-b border-[#2f3136] mb-1">
            <p className="text-xs font-bold text-white">Lienzo de Diseño</p>
            <p className="text-[10px] text-[#9ca3af]">Acciones rápidas del lienzo</p>
          </div>

          {/* Quick elements creation */}
          <div className="px-1 space-y-0.5">
            <div className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9ca3af]">
              Insertar Elemento
            </div>
            {onAddQuickElement && (
              <>
                <button
                  onClick={() => {
                    onAddQuickElement('text', menuState.x, menuState.y);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-blue-400" />
                  <span>Añadir Texto / Título</span>
                </button>
                <button
                  onClick={() => {
                    onAddQuickElement('kpi', menuState.x, menuState.y);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Añadir Métrica / KPI</span>
                </button>
                <button
                  onClick={() => {
                    onAddQuickElement('table', menuState.x, menuState.y);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Añadir Tabla de Datos</span>
                </button>
                <button
                  onClick={() => {
                    onAddQuickElement('card', menuState.x, menuState.y);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-purple-400" />
                  <span>Añadir Tarjeta</span>
                </button>
              </>
            )}
          </div>

          <div className="my-1 border-t border-[#2f3136]" />

          {/* View Helpers */}
          <div className="px-1 space-y-0.5">
            {onAutoArrange && (
              <button
                onClick={() => {
                  onAutoArrange('all');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 rounded-md transition cursor-pointer group"
                title="Auto-organizar todos los elementos en cuadrícula evitando solapamientos"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Auto-arrange</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300/80">Cuadrícula</span>
              </button>
            )}

            {onResetZoom && (
              <button
                onClick={() => {
                  onResetZoom();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Restablecer Zoom (100%)</span>
                </div>
              </button>
            )}

            {onToggleGrid && (
              <button
                onClick={() => {
                  onToggleGrid();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mostrar Cuadrícula</span>
                </div>
                <span className={`text-[10px] font-mono ${showGrid ? 'text-emerald-400' : 'text-[#9ca3af]'}`}>
                  {showGrid ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            {onToggleSnap && (
              <button
                onClick={() => {
                  onToggleSnap();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#e1e1e6] hover:text-white hover:bg-[#2f3136] rounded-md transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Magnet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ajustar a Cuadrícula</span>
                </div>
                <span className={`text-[10px] font-mono ${snapToGrid ? 'text-emerald-400' : 'text-[#9ca3af]'}`}>
                  {snapToGrid ? 'ON' : 'OFF'}
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
