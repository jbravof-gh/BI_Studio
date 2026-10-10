import React, { useState, useMemo } from 'react';
import {
  CanvasElement,
  CanvasPage,
  DocumentElementWithPage,
  DatabaseInfo
} from '../types';
import {
  Filter,
  Layers,
  CheckSquare,
  Square,
  Search,
  Check,
  X,
  Table as TableIcon,
  BarChart3,
  TrendingUp,
  Grid3X3,
  Contact,
  ClipboardList,
  Type,
  QrCode,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

interface GlobalFilterRelationshipManagerProps {
  filterElement: CanvasElement;
  allDocumentElements: DocumentElementWithPage[];
  pages?: CanvasPage[];
  activePageIndex?: number;
  onUpdateFilter: (updated: CanvasElement) => void;
  onSelectElement?: (elementId: string, pageIndex?: number) => void;
  onSwitchPage?: (pageIndex: number) => void;
  onOpenDependenciesTab?: () => void;
  dbInfo?: DatabaseInfo | null;
  compactMode?: boolean;
}

const CONTROL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  table: TableIcon,
  chart: BarChart3,
  kpi: TrendingUp,
  matrix: Grid3X3,
  detailCard: Contact,
  card: Square,
  form: ClipboardList,
  text: Type,
  qrcode: QrCode,
  filter: Filter,
  minibrowser: Globe
};

const CONTROL_TYPE_LABELS: Record<string, string> = {
  table: 'Tabla',
  chart: 'Gráfico',
  kpi: 'KPI Métrica',
  matrix: 'Matriz',
  detailCard: 'Ficha Detalle',
  card: 'Ficha Simple',
  form: 'Formulario',
  text: 'Texto',
  qrcode: 'Código QR',
  minibrowser: 'MiniBrowser',
  filter: 'Filtro'
};

const CONTROL_TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  table: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  chart: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  kpi: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  matrix: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  detailCard: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  card: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  form: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  text: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  qrcode: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  filter: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' }
};

export const GlobalFilterRelationshipManager: React.FC<GlobalFilterRelationshipManagerProps> = ({
  filterElement,
  allDocumentElements,
  pages = [],
  activePageIndex = 0,
  onUpdateFilter,
  onSelectElement,
  onSwitchPage,
  onOpenDependenciesTab,
  dbInfo,
  compactMode = false
}) => {
  const binding = filterElement.binding || {};
  const currentScope = binding.filterPageScope || 'current';
  const targetControlIds = binding.targetControlIds || [];
  const filterTable = binding.tableName || '';
  const filterField = binding.field || '';

  // Local state for UI filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<'all' | string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'table' | 'chart' | 'kpi' | 'filter' | 'other'>('all');
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({});

  // Eligible target controls across the whole document (exclude self, dividers, containers)
  const eligibleControls = useMemo(() => {
    return allDocumentElements.filter(item => {
      const el = item.element;
      if (el.id === filterElement.id) return false;
      if (el.type === 'divider' || el.type === 'container') return false;
      return true;
    });
  }, [allDocumentElements, filterElement.id]);

  // Determine if all controls are targeted
  const isTargetingAll = !targetControlIds || targetControlIds.length === 0 || targetControlIds.includes('*');

  // Check if a control is actively filtered by this filter considering page scope & targets
  const isControlTargeted = (item: DocumentElementWithPage): boolean => {
    const elId = item.element.id;

    // Check target ID
    if (!isTargetingAll) {
      if (!targetControlIds.includes(elId)) return false;
    }

    // Check page scope
    if (currentScope === 'current') {
      const currentDocPage = pages[activePageIndex];
      const currentDocPageId = currentDocPage?.id || `page_${activePageIndex}`;
      if (item.pageId !== currentDocPageId && item.pageIndex !== activePageIndex) {
        return false;
      }
    } else if (currentScope === 'selected') {
      const targetPages = binding.targetPageIds || [];
      const matchesPage = targetPages.includes(item.pageId) || targetPages.includes(String(item.pageIndex));
      if (!matchesPage) return false;
    }

    return true;
  };

  // Filtered list of controls for display
  const filteredControls = useMemo(() => {
    return eligibleControls.filter(item => {
      const el = item.element;

      // Page filter
      if (selectedPageFilter !== 'all') {
        if (item.pageId !== selectedPageFilter && String(item.pageIndex) !== selectedPageFilter) {
          return false;
        }
      }

      // Type filter
      if (selectedTypeFilter !== 'all') {
        if (selectedTypeFilter === 'other') {
          if (['table', 'chart', 'kpi', 'filter'].includes(el.type)) return false;
        } else if (el.type !== selectedTypeFilter) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (el.name || '').toLowerCase().includes(q);
        const matchesType = (el.type || '').toLowerCase().includes(q);
        const matchesTable = (el.binding?.tableName || '').toLowerCase().includes(q);
        const matchesPage = (item.pageName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesTable && !matchesPage) {
          return false;
        }
      }

      return true;
    });
  }, [eligibleControls, selectedPageFilter, selectedTypeFilter, searchTerm]);

  // Group controls by page
  const controlsByPage = useMemo(() => {
    const grouped: Record<string, { pageId: string; pageName: string; pageIndex: number; isCurrent: boolean; items: DocumentElementWithPage[] }> = {};

    filteredControls.forEach(item => {
      const pKey = item.pageId || `page_${item.pageIndex}`;
      if (!grouped[pKey]) {
        grouped[pKey] = {
          pageId: item.pageId,
          pageName: item.pageName,
          pageIndex: item.pageIndex,
          isCurrent: item.isCurrentPage,
          items: []
        };
      }
      grouped[pKey].items.push(item);
    });

    return Object.values(grouped).sort((a, b) => a.pageIndex - b.pageIndex);
  }, [filteredControls]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalTargeted = 0;
    const pagesWithTargeted = new Set<string>();

    eligibleControls.forEach(item => {
      if (isControlTargeted(item)) {
        totalTargeted++;
        pagesWithTargeted.add(item.pageId);
      }
    });

    // Check if any targeted control is on another page while scope is 'current'
    const hasOffPageTargetsWithCurrentScope = currentScope === 'current' && !isTargetingAll && targetControlIds.some(id => {
      const match = eligibleControls.find(c => c.element.id === id);
      return match && !match.isCurrentPage;
    });

    return {
      totalEligible: eligibleControls.length,
      totalTargeted,
      pagesAffectedCount: pagesWithTargeted.size,
      totalPages: pages.length || 1,
      hasOffPageTargetsWithCurrentScope
    };
  }, [eligibleControls, isTargetingAll, targetControlIds, currentScope, pages, activePageIndex]);

  // Scope update helper
  const handleSetScope = (newScope: 'current' | 'selected' | 'all') => {
    const updated = {
      ...filterElement,
      binding: {
        ...binding,
        filterPageScope: newScope
      }
    };
    if (newScope === 'selected' && (!binding.targetPageIds || binding.targetPageIds.length === 0)) {
      const curPageId = pages[activePageIndex]?.id || String(activePageIndex);
      updated.binding.targetPageIds = [curPageId];
    }
    onUpdateFilter(updated);
  };

  // Toggle page in selected pages scope
  const handleTogglePageScopeId = (pageId: string) => {
    const currentList = binding.targetPageIds || [];
    let nextList: string[];
    if (currentList.includes(pageId)) {
      nextList = currentList.filter(id => id !== pageId);
    } else {
      nextList = [...currentList, pageId];
    }
    onUpdateFilter({
      ...filterElement,
      binding: {
        ...binding,
        targetPageIds: nextList
      }
    });
  };

  // Toggle single control target status
  const handleToggleControl = (controlId: string) => {
    let nextIds: string[];

    if (isTargetingAll) {
      // Switching from "all" to "specific": include all eligible controls except this one
      nextIds = eligibleControls
        .filter(c => c.element.id !== controlId)
        .map(c => c.element.id);
      if (nextIds.length === 0) nextIds = ['__none__'];
    } else {
      const currentList = targetControlIds.filter(id => id !== '*' && id !== '__none__');
      if (currentList.includes(controlId)) {
        nextIds = currentList.filter(id => id !== controlId);
        if (nextIds.length === 0) nextIds = ['__none__'];
      } else {
        nextIds = [...currentList, controlId];

        // Intelligent scope enhancement: if targeted control is on another page and scope is 'current',
        // offer or expand scope automatically
        const targetItem = eligibleControls.find(c => c.element.id === controlId);
        if (targetItem && !targetItem.isCurrentPage && currentScope === 'current') {
          onUpdateFilter({
            ...filterElement,
            binding: {
              ...binding,
              filterPageScope: 'all',
              targetControlIds: nextIds
            }
          });
          return;
        }
      }
    }

    onUpdateFilter({
      ...filterElement,
      binding: {
        ...binding,
        targetControlIds: nextIds
      }
    });
  };

  // Bulk actions
  const handleSelectAllVisible = () => {
    const visibleIds = filteredControls.map(c => c.element.id);
    const existingIds = isTargetingAll
      ? []
      : targetControlIds.filter(id => id !== '*' && id !== '__none__');
    const combined = Array.from(new Set([...existingIds, ...visibleIds]));

    // If visible controls cross pages and current scope is 'current', expand to 'all'
    const crossesPages = filteredControls.some(c => !c.isCurrentPage);
    const nextScope = crossesPages && currentScope === 'current' ? 'all' : currentScope;

    onUpdateFilter({
      ...filterElement,
      binding: {
        ...binding,
        filterPageScope: nextScope,
        targetControlIds: combined
      }
    });
  };

  const handleSelectByType = (type: 'table' | 'chart' | 'kpi' | 'filter') => {
    const matchingIds = eligibleControls
      .filter(c => c.element.type === type)
      .map(c => c.element.id);

    const crossesPages = eligibleControls.some(c => c.element.type === type && !c.isCurrentPage);
    const nextScope = crossesPages && currentScope === 'current' ? 'all' : currentScope;

    onUpdateFilter({
      ...filterElement,
      binding: {
        ...binding,
        filterPageScope: nextScope,
        targetControlIds: matchingIds
      }
    });
  };

  const handleDeselectAll = () => {
    onUpdateFilter({
      ...filterElement,
      binding: {
        ...binding,
        targetControlIds: ['__none__']
      }
    });
  };

  const handleSetTargetAllMode = () => {
    onUpdateFilter({
      ...filterElement,
      binding: {
        ...binding,
        targetControlIds: []
      }
    });
  };

  const togglePageCollapse = (pKey: string) => {
    setCollapsedPages(prev => ({
      ...prev,
      [pKey]: !prev[pKey]
    }));
  };

  return (
    <div className="space-y-3.5 text-xs text-[#e1e1e6]">
      {/* Scope banner & Summary badges */}
      <div className="bg-[#1e2024] rounded-lg p-3 border border-[#2f3136] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
            <Globe className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span>Ámbito Global en el Documento</span>
          </div>
          {onOpenDependenciesTab && (
            <button
              type="button"
              onClick={onOpenDependenciesTab}
              className="text-[10px] text-[#06b6d4] hover:text-[#22d3ee] flex items-center gap-1 font-semibold transition"
              title="Abrir pestaña dedicada de Dependencias"
            >
              <span>Ver Dependencias</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Scope selection buttons: All Pages vs Specific Pages vs Current Page */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleSetScope('all')}
            className={`p-2 rounded-md border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              currentScope === 'all'
                ? 'bg-[#06b6d4]/15 border-[#06b6d4] text-white font-bold shadow-xs'
                : 'bg-[#141517] border-[#2f3136] text-[#9ca3af] hover:border-[#3f4147] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#06b6d4]" />
              <span className="text-[11px]">Todo el Doc</span>
            </div>
            <span className="text-[9px] text-[#9ca3af] opacity-80">Todas las páginas</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetScope('selected')}
            className={`p-2 rounded-md border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              currentScope === 'selected'
                ? 'bg-[#06b6d4]/15 border-[#06b6d4] text-white font-bold shadow-xs'
                : 'bg-[#141517] border-[#2f3136] text-[#9ca3af] hover:border-[#3f4147] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#06b6d4]" />
              <span className="text-[11px]">Páginas Sel.</span>
            </div>
            <span className="text-[9px] text-[#9ca3af] opacity-80">
              {binding.targetPageIds?.length || 0} páginas
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSetScope('current')}
            className={`p-2 rounded-md border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              currentScope === 'current'
                ? 'bg-[#06b6d4]/15 border-[#06b6d4] text-white font-bold shadow-xs'
                : 'bg-[#141517] border-[#2f3136] text-[#9ca3af] hover:border-[#3f4147] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1">
              <ListFilter className="w-3 h-3 text-[#06b6d4]" />
              <span className="text-[11px]">Pág. Actual</span>
            </div>
            <span className="text-[9px] text-[#9ca3af] opacity-80">Solo local</span>
          </button>
        </div>

        {/* Selected pages checklist if scope === 'selected' */}
        {currentScope === 'selected' && (
          <div className="pt-2 border-t border-[#2f3136] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#9ca3af]">
              <span>Páginas donde aplicará el filtro:</span>
              <button
                type="button"
                onClick={() => {
                  const allIds = pages.map((p, idx) => p.id || String(idx));
                  onUpdateFilter({
                    ...filterElement,
                    binding: {
                      ...binding,
                      targetPageIds: allIds
                    }
                  });
                }}
                className="text-[#06b6d4] hover:underline font-semibold"
              >
                Marcar todas
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
              {pages.map((p, idx) => {
                const pageId = p.id || String(idx);
                const isChecked = (binding.targetPageIds || []).includes(pageId) ||
                                  (binding.targetPageIds || []).includes(String(idx));
                return (
                  <label
                    key={`p_scope_${pageId}`}
                    className={`flex items-center gap-1.5 p-1.5 rounded text-[11px] border cursor-pointer transition ${
                      isChecked
                        ? 'bg-[#06b6d4]/10 border-[#06b6d4]/40 text-white font-medium'
                        : 'bg-[#141517] border-[#2f3136] text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePageScopeId(pageId)}
                      className="w-3 h-3 rounded text-[#06b6d4] border-[#373a40] focus:ring-0 cursor-pointer"
                    />
                    <span className="truncate">{p.name || `Página ${idx + 1}`}</span>
                    {idx === activePageIndex && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-900/60 text-cyan-300 font-mono shrink-0 ml-auto">
                        Actual
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Warning badge if user selected off-page controls while scope is 'current' */}
        {stats.hasOffPageTargetsWithCurrentScope && (
          <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-semibold">Controles de otras páginas seleccionados</div>
              <p className="text-[10px] text-amber-200/80 leading-relaxed">
                El ámbito está en "Solo Esta Página", por lo que los controles de otras páginas no recibirán el filtro.
              </p>
              <button
                type="button"
                onClick={() => handleSetScope('all')}
                className="mt-1 px-2 py-0.5 rounded bg-amber-500 text-black font-bold text-[10px] hover:bg-amber-400 transition"
              >
                Hacer Ámbito Todo el Documento
              </button>
            </div>
          </div>
        )}

        {/* Impact summary pills */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-[#2f3136] text-[10px] font-mono">
          <span className="text-[#9ca3af]">Impacto:</span>
          <span className="px-1.5 py-0.5 rounded bg-[#06b6d4]/15 text-[#22d3ee] border border-[#06b6d4]/30 font-bold">
            {stats.totalTargeted} de {stats.totalEligible} controles
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#141517] text-[#9ca3af] border border-[#2f3136]">
            {stats.pagesAffectedCount} de {stats.totalPages} páginas
          </span>
        </div>
      </div>

      {/* Target Control Selection Mode: All vs Specific */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">
            Modo de Destino de Controles
          </label>
          <span className="text-[10px] font-mono text-[#06b6d4]">
            {isTargetingAll ? 'Automático (Todos)' : 'Selección Personalizada'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-[#141517] p-1 rounded-lg border border-[#2f3136]">
          <button
            type="button"
            onClick={handleSetTargetAllMode}
            className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isTargetingAll
                ? 'bg-[#06b6d4] text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Todos los compatibles</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isTargetingAll) {
                // Initialize specific list with all current eligible controls
                const allIds = eligibleControls.map(c => c.element.id);
                onUpdateFilter({
                  ...filterElement,
                  binding: {
                    ...binding,
                    targetControlIds: allIds
                  }
                });
              }
            }}
            className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              !isTargetingAll
                ? 'bg-[#06b6d4] text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Controles específicos</span>
          </button>
        </div>
      </div>

      {/* Search & Quick Filters Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por control, tabla o página..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#141517] border border-[#2f3136] rounded-md text-xs text-white placeholder-[#6b7280] focus:border-[#06b6d4] focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick type filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition ${
              selectedTypeFilter === 'all'
                ? 'bg-[#06b6d4] text-white'
                : 'bg-[#1e2024] text-[#9ca3af] hover:text-white'
            }`}
          >
            Todos ({eligibleControls.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('table')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              selectedTypeFilter === 'table'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1e2024] text-[#9ca3af] hover:text-white'
            }`}
          >
            <TableIcon className="w-3 h-3" />
            <span>Tablas</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('chart')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              selectedTypeFilter === 'chart'
                ? 'bg-cyan-600 text-white'
                : 'bg-[#1e2024] text-[#9ca3af] hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Gráficos</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('kpi')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              selectedTypeFilter === 'kpi'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#1e2024] text-[#9ca3af] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>KPIs</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('filter')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              selectedTypeFilter === 'filter'
                ? 'bg-teal-600 text-white'
                : 'bg-[#1e2024] text-[#9ca3af] hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Filtros ({eligibleControls.filter(c => c.element.type === 'filter').length})</span>
          </button>
        </div>

        {/* Bulk Action Buttons (when in specific controls mode) */}
        {!isTargetingAll && (
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#2f3136]">
            <span className="text-[#9ca3af]">Acciones rápidas:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-[#06b6d4] hover:underline font-semibold"
              >
                Marcar Visibles
              </button>
              <span className="text-[#373a40]">|</span>
              <button
                type="button"
                onClick={() => handleSelectByType('table')}
                className="text-indigo-400 hover:underline"
              >
                Tablas
              </button>
              <span className="text-[#373a40]">|</span>
              <button
                type="button"
                onClick={() => handleSelectByType('chart')}
                className="text-cyan-400 hover:underline"
              >
                Gráficos
              </button>
              <span className="text-[#373a40]">|</span>
              <button
                type="button"
                onClick={() => handleSelectByType('filter')}
                className="text-teal-400 hover:underline"
              >
                Filtros
              </button>
              <span className="text-[#373a40]">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[#9ca3af] hover:text-rose-400"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Checklist Grouped by Page across the whole document */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
        {controlsByPage.length > 0 ? (
          controlsByPage.map(pageGroup => {
            const isCollapsed = collapsedPages[pageGroup.pageId];
            const targetedOnPage = pageGroup.items.filter(item => isControlTargeted(item)).length;

            return (
              <div
                key={`page_grp_${pageGroup.pageId}`}
                className="bg-[#181a1d] rounded-lg border border-[#2f3136] overflow-hidden"
              >
                {/* Page Group Header */}
                <div
                  onClick={() => togglePageCollapse(pageGroup.pageId)}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-[#202225] border-b border-[#2f3136] cursor-pointer hover:bg-[#25282c] transition select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#9ca3af]" />
                    )}
                    <span className="font-bold text-white truncate text-xs">
                      {pageGroup.pageName}
                    </span>
                    {pageGroup.isCurrent && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                        Pág. Activa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${
                      targetedOnPage > 0
                        ? 'bg-[#06b6d4]/15 text-[#22d3ee] font-bold'
                        : 'bg-[#141517] text-[#9ca3af]'
                    }`}>
                      {targetedOnPage}/{pageGroup.items.length} activos
                    </span>
                    {onSwitchPage && !pageGroup.isCurrent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwitchPage(pageGroup.pageIndex);
                        }}
                        className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white"
                        title="Ir a esta página"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Page Items */}
                {!isCollapsed && (
                  <div className="p-1.5 space-y-1">
                    {pageGroup.items.map(item => {
                      const el = item.element;
                      const isTargeted = isControlTargeted(item);
                      const IconComp = CONTROL_ICONS[el.type] || Square;
                      const typeStyle = CONTROL_TYPE_COLORS[el.type] || CONTROL_TYPE_COLORS.text;

                      // Table compatibility check
                      const sameTable = filterTable && el.binding?.tableName && filterTable === el.binding.tableName;
                      const boundTable = el.binding?.tableName;

                      return (
                        <div
                          key={`ctl_${el.id}`}
                          className={`flex items-center justify-between p-2 rounded-md transition text-xs border ${
                            isTargeted
                              ? 'bg-[#06b6d4]/10 border-[#06b6d4]/30 text-white'
                              : 'bg-[#141517] border-[#232528] text-[#9ca3af] hover:border-[#373a40] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isTargeted}
                              disabled={isTargetingAll}
                              onChange={() => handleToggleControl(el.id)}
                              className="w-3.5 h-3.5 rounded border-[#373a40] text-[#06b6d4] focus:ring-0 cursor-pointer disabled:opacity-50"
                              title={isTargetingAll ? 'Modo automático: desactiva "Todos los compatibles" para elegir individualmente' : undefined}
                            />
                            <div className={`p-1 rounded shrink-0 ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold truncate text-white">
                                  {el.name || (el.type === 'filter' ? (el.binding?.template || `Filtro ${el.binding?.field || ''}`) : 'Control sin nombre')}
                                </span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${typeStyle.bg} ${typeStyle.text}`}>
                                  {el.type === 'filter'
                                    ? (el.binding?.filterDisplayMode === 'checkbox_list' ? 'Lista de Casilla' : 'Filtro Desplegable')
                                    : (CONTROL_TYPE_LABELS[el.type] || el.type)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#9ca3af] mt-0.5 flex-wrap">
                                {boundTable ? (
                                  <span className={`font-mono ${sameTable ? 'text-emerald-400 font-semibold' : 'text-[#9ca3af]'}`}>
                                    Tabla: {boundTable} {sameTable ? '✓' : ''}
                                  </span>
                                ) : (
                                  <span className="italic text-[#6b7280]">Sin tabla enlazada</span>
                                )}
                                {el.type === 'filter' && el.binding?.field && (
                                  <span className="text-cyan-400 font-mono">
                                    • Campo: {el.binding.field}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isTargeted ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-800/60 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>Filtrado</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#202225] text-[#6b7280]">
                                Inactivo
                              </span>
                            )}

                            {onSelectElement && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSwitchPage && !item.isCurrentPage) {
                                    onSwitchPage(item.pageIndex);
                                  }
                                  onSelectElement(el.id, item.pageIndex);
                                }}
                                className="p-1 hover:bg-[#2a2d32] rounded text-[#9ca3af] hover:text-white"
                                title="Seleccionar e inspeccionar este control"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-[#9ca3af] bg-[#181a1d] rounded-lg border border-[#2f3136] space-y-1">
            <Filter className="w-5 h-5 text-[#06b6d4] mx-auto opacity-50" />
            <p className="font-semibold text-white">No se encontraron controles</p>
            <p className="text-[11px] text-[#6b7280]">
              {searchTerm ? 'Prueba con otro término de búsqueda.' : 'No hay tablas ni gráficos en el documento.'}
            </p>
          </div>
        )}
      </div>

      {/* Mode help note */}
      <div className="p-2 rounded bg-[#141517] border border-[#26282c] text-[10px] text-[#9ca3af] space-y-0.5">
        <div className="flex items-center gap-1 text-[#06b6d4] font-semibold">
          <Sparkles className="w-3 h-3" />
          <span>Consejo de Relaciones Globales</span>
        </div>
        <p className="leading-relaxed">
          {currentScope === 'all'
            ? 'Este filtro afectará a todos los controles seleccionados en cualquier página del documento que tengan la tabla vinculada.'
            : currentScope === 'selected'
            ? 'Este filtro solo se propaga a las páginas marcadas en la lista de páginas.'
            : 'Este filtro solo se aplica en la página activa. Para sincronizar dashboards en varias páginas, cambia el ámbito a "Todo el Documento".'}
        </p>
      </div>
    </div>
  );
};
