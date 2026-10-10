import React, { useState, useMemo } from 'react';
import {
  CanvasElement,
  CanvasPage,
  DocumentElementWithPage,
  DatabaseInfo
} from '../types';

export type { DocumentElementWithPage };
import { GlobalFilterRelationshipManager } from './GlobalFilterRelationshipManager';
import {
  Network,
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
  ArrowLeft,
  CheckCircle2,
  GitFork,
  Link2,
  Unlink,
  Eye,
  Plus
} from 'lucide-react';

interface DependenciesPanelProps {
  selectedElement: CanvasElement | null;
  allDocumentElements: DocumentElementWithPage[];
  pages?: CanvasPage[];
  activePageIndex?: number;
  allFilterElements?: CanvasElement[];
  activeFilters?: Record<string, string[]>;
  onUpdateElement: (updated: CanvasElement) => void;
  onSelectElement: (elementId: string | null, isMultiSelect?: boolean) => void;
  onSwitchPage?: (pageIndex: number) => void;
  dbInfo?: DatabaseInfo | null;
  onClose?: () => void;
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
  minibrowser: Globe,
  drilldown: GitFork
};

export const DependenciesPanel: React.FC<DependenciesPanelProps> = ({
  selectedElement,
  allDocumentElements,
  pages = [],
  activePageIndex = 0,
  allFilterElements = [],
  activeFilters = {},
  onUpdateElement,
  onSelectElement,
  onSwitchPage,
  dbInfo,
  onClose
}) => {
  // Top view mode: 'selected' (Selected element's dependencies) or 'matrix' (Global document filter matrix)
  const [viewMode, setViewMode] = useState<'selected' | 'matrix'>('selected');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [expandedMatrixFilterId, setExpandedMatrixFilterId] = useState<string | null>(null);
  const [showIncomingFilters, setShowIncomingFilters] = useState(false);

  // Identify all filter elements in the entire document with page info
  const filterElementsWithPage = useMemo(() => {
    return allDocumentElements.filter(item => item.element.type === 'filter' || item.element.type === 'drilldown');
  }, [allDocumentElements]);

  // Is selected element a filter/drilldown?
  const isSelectedFilter = selectedElement?.type === 'filter' || selectedElement?.type === 'drilldown';

  // Find page of the selected element
  const selectedElementPageItem = useMemo(() => {
    if (!selectedElement) return null;
    return allDocumentElements.find(item => item.element.id === selectedElement.id) || null;
  }, [selectedElement, allDocumentElements]);

  // Find all other filters that filter the selected element (whether it is a consumer control OR another filter)
  const filtersAffectingSelected = useMemo(() => {
    if (!selectedElement) return [];

    return filterElementsWithPage
      .filter(filterItem => filterItem.element.id !== selectedElement.id)
      .map(filterItem => {
        const fEl = filterItem.element;
        const fBinding = fEl.binding || {};
        const targetControlIds = fBinding.targetControlIds || [];
        const isTargetAll = targetControlIds.length === 0 || targetControlIds.includes('*');

        // Check target match
        let isTargeted = false;
        if (isTargetAll) {
          // Targets all compatible controls
          isTargeted = true;
        } else {
          isTargeted = targetControlIds.includes(selectedElement.id);
        }

        // Check page scope match
        let pageMatches = true;
        const fScope = fBinding.filterPageScope || 'current';
        const selectedPageId = selectedElementPageItem?.pageId || `page_${activePageIndex}`;
        const selectedPageIdx = selectedElementPageItem?.pageIndex ?? activePageIndex;

        if (fScope === 'current') {
          pageMatches = filterItem.pageId === selectedPageId;
        } else if (fScope === 'selected') {
          const targetPages = fBinding.targetPageIds || [];
          pageMatches = targetPages.includes(selectedPageId) || targetPages.includes(String(selectedPageIdx));
        } else {
          pageMatches = true; // 'all' matches all pages
        }

        // Check table match
        const sameTable = !fBinding.tableName || !selectedElement.binding?.tableName || fBinding.tableName === selectedElement.binding.tableName;

        const isActivelyFiltering = isTargeted && pageMatches;

        return {
          filterItem,
          filterElement: fEl,
          isActivelyFiltering,
          isTargeted,
          pageMatches,
          sameTable,
          scope: fScope,
          field: fBinding.field || 'campo',
          tableName: fBinding.tableName || '',
          activeValues: activeFilters[fEl.id] ?? fBinding.filterSelectedValues ?? []
        };
      });
  }, [selectedElement, filterElementsWithPage, selectedElementPageItem, activePageIndex, activeFilters]);

  // Toggle whether a filter affects the currently selected control or filter
  const handleToggleFilterForControl = (filterEl: CanvasElement, currentlyFiltering: boolean) => {
    if (!selectedElement) return;
    const fBinding = filterEl.binding || {};
    const currentTargets = fBinding.targetControlIds || [];
    const isTargetAll = currentTargets.length === 0 || currentTargets.includes('*');

    let nextTargets: string[];
    let nextScope = fBinding.filterPageScope || 'current';
    let nextTargetPages = fBinding.targetPageIds ? [...fBinding.targetPageIds] : [];

    const targetPageId = selectedElementPageItem?.pageId || `page_${activePageIndex}`;

    if (currentlyFiltering) {
      // Turn OFF: remove selectedElement from targetControlIds
      if (isTargetAll) {
        // Convert from all to explicit list excluding selectedElement
        nextTargets = allDocumentElements
          .filter(item => item.element.id !== filterEl.id && item.element.id !== selectedElement.id && item.element.type !== 'container' && item.element.type !== 'divider')
          .map(item => item.element.id);
        if (nextTargets.length === 0) nextTargets = ['__none__'];
      } else {
        nextTargets = currentTargets.filter(id => id !== selectedElement.id && id !== '*');
        if (nextTargets.length === 0) nextTargets = ['__none__'];
      }
    } else {
      // Turn ON: add selectedElement to targetControlIds
      if (isTargetAll) {
        nextTargets = []; // Already targets all, but check page scope!
      } else {
        nextTargets = [...currentTargets.filter(id => id !== '__none__' && id !== '*'), selectedElement.id];
      }

      // Check if selectedElement is on another page: if filter scope is 'current', expand to 'all' or add page
      const filterPageItem = allDocumentElements.find(item => item.element.id === filterEl.id);
      if (filterPageItem && filterPageItem.pageId !== targetPageId) {
        if (nextScope === 'current') {
          nextScope = 'all'; // Automatically expand to all pages for seamless cross-page filtering
        } else if (nextScope === 'selected') {
          if (!nextTargetPages.includes(targetPageId)) {
            nextTargetPages.push(targetPageId);
          }
        }
      }
    }

    onUpdateElement({
      ...filterEl,
      binding: {
        ...fBinding,
        filterPageScope: nextScope,
        targetPageIds: nextTargetPages,
        targetControlIds: nextTargets
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#1e2024] text-[#e1e1e6] select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-[#2f3136] bg-[#202225] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-white flex items-center gap-1.5">
              <span>Dependencias y Filtros</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {filterElementsWithPage.length} filtros
              </span>
            </div>
            <div className="text-[10px] text-[#9ca3af]">
              Relaciones entre controles en todo el documento
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9ca3af] hover:text-white rounded hover:bg-[#2f3136]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-[#2f3136] bg-[#1a1b1e] text-xs font-semibold px-2 pt-1 gap-1">
        <button
          type="button"
          onClick={() => setViewMode('selected')}
          className={`flex-1 py-2 px-3 rounded-t-md transition flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
            viewMode === 'selected'
              ? 'bg-[#1e2024] text-[#06b6d4] border-[#06b6d4] font-bold'
              : 'border-transparent text-[#9ca3af] hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Elemento Seleccionado</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('matrix')}
          className={`flex-1 py-2 px-3 rounded-t-md transition flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
            viewMode === 'matrix'
              ? 'bg-[#1e2024] text-[#06b6d4] border-[#06b6d4] font-bold'
              : 'border-transparent text-[#9ca3af] hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Matriz Global ({filterElementsWithPage.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {viewMode === 'selected' ? (
          selectedElement ? (
            isSelectedFilter ? (
              /* ========================================================================= */
              /* CASE A: A FILTER ELEMENT IS SELECTED                                      */
              /* ========================================================================= */
              <div className="space-y-4">
                {/* Element info banner */}
                <div className="p-3 bg-[#141517] rounded-lg border border-[#2f3136] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30">
                        <Filter className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">
                          {selectedElement.name || 'Filtro Interactivo'}
                        </div>
                        <div className="text-[10px] text-[#9ca3af] flex items-center gap-1.5">
                          <span>{selectedElementPageItem?.pageName || 'Página 1'}</span>
                          <span>•</span>
                          <span className="font-mono text-cyan-400">
                            {selectedElement.binding?.field ? `Campo: ${selectedElement.binding.field}` : 'Sin campo asignado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#06b6d4]/20 text-[#22d3ee] font-mono border border-[#06b6d4]/40 font-bold">
                      Emisor de Filtros
                    </span>
                  </div>

                  {/* Flow Diagram Mini-Preview */}
                  <div className="p-2.5 rounded bg-[#1e2024] border border-[#26282c] flex items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1 text-cyan-300 font-bold">
                      <Filter className="w-3 h-3 text-cyan-400" />
                      <span>{selectedElement.binding?.field || 'Filtro'}</span>
                    </div>
                    <div className="flex items-center text-[#9ca3af] gap-1">
                      <ArrowRight className="w-3.5 h-3.5 text-[#06b6d4]" />
                      <span className="text-white font-bold">
                        {(!selectedElement.binding?.targetControlIds || selectedElement.binding.targetControlIds.length === 0 || selectedElement.binding.targetControlIds.includes('*'))
                          ? 'Todos los compatibles'
                          : `${selectedElement.binding.targetControlIds.length} controles`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#9ca3af]">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span>
                        {selectedElement.binding?.filterPageScope === 'all'
                          ? 'Todo el doc'
                          : selectedElement.binding?.filterPageScope === 'selected'
                          ? `${selectedElement.binding?.targetPageIds?.length || 0} págs`
                          : 'Local'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Incoming Cascading Filters */}
                {filtersAffectingSelected.length > 0 && (
                  <div className="p-3 bg-[#141517] rounded-lg border border-[#2f3136] space-y-2">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setShowIncomingFilters(!showIncomingFilters)}
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-bold text-white">
                          Filtros Entrantes (Cascada)
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          filtersAffectingSelected.filter(f => f.isActivelyFiltering).length > 0
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-[#1e2024] text-[#9ca3af]'
                        }`}>
                          {filtersAffectingSelected.filter(f => f.isActivelyFiltering).length} activos
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#9ca3af] transition-transform ${showIncomingFilters ? 'rotate-180' : ''}`} />
                    </div>

                    <p className="text-[10px] text-[#9ca3af]">
                      Otros filtros que filtran las opciones de este filtro en tiempo real.
                    </p>

                    {showIncomingFilters && (
                      <div className="space-y-1.5 pt-1 border-t border-[#26282c]">
                        {filtersAffectingSelected.map(({ filterElement: fEl, isActivelyFiltering, filterItem, field }) => (
                          <div
                            key={`inc_${fEl.id}`}
                            className={`flex items-center justify-between p-2 rounded text-xs border ${
                              isActivelyFiltering
                                ? 'bg-[#06b6d4]/10 border-[#06b6d4]/30 text-white'
                                : 'bg-[#1e2024] border-[#26282c] text-[#9ca3af]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Filter className="w-3 h-3 text-cyan-400 shrink-0" />
                              <div className="min-w-0 truncate">
                                <span className="font-semibold text-white">{fEl.name || 'Filtro'}</span>
                                <span className="text-[10px] text-[#9ca3af] ml-1.5 font-mono">
                                  ({field}) • {filterItem.pageName}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleFilterForControl(fEl, isActivelyFiltering)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                                isActivelyFiltering
                                  ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                                  : 'bg-[#2a2c30] text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              {isActivelyFiltering ? 'Activo' : 'Inactivo'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* The Complete Global Filter Relationship Manager */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#06b6d4]" />
                      <span>Reglas y Controles Filtrados</span>
                    </span>
                  </div>

                  <GlobalFilterRelationshipManager
                    filterElement={selectedElement}
                    allDocumentElements={allDocumentElements}
                    pages={pages}
                    activePageIndex={activePageIndex}
                    onUpdateFilter={onUpdateElement}
                    onSelectElement={(id, pIdx) => {
                      if (onSwitchPage && typeof pIdx === 'number') {
                        onSwitchPage(pIdx);
                      }
                      onSelectElement(id);
                    }}
                    onSwitchPage={onSwitchPage}
                    dbInfo={dbInfo}
                  />
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* CASE B: A CONSUMER CONTROL (TABLE, CHART, KPI...) IS SELECTED             */
              /* ========================================================================= */
              <div className="space-y-4">
                {/* Control summary banner */}
                <div className="p-3 bg-[#141517] rounded-lg border border-[#2f3136] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {React.createElement(CONTROL_ICONS[selectedElement.type] || Square, { className: 'w-4 h-4' })}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">
                          {selectedElement.name || 'Control Seleccionado'}
                        </div>
                        <div className="text-[10px] text-[#9ca3af] flex items-center gap-1.5">
                          <span>{selectedElementPageItem?.pageName || 'Página 1'}</span>
                          <span>•</span>
                          <span className="font-mono text-indigo-300">
                            {selectedElement.binding?.tableName ? `Tabla: ${selectedElement.binding.tableName}` : 'Sin tabla'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 font-mono border border-indigo-800/60 font-bold">
                      Control Receptor
                    </span>
                  </div>

                  <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                    A continuación se listan todos los filtros disponibles en el documento. Activa o desactiva qué filtros afectarán a los datos de este componente.
                  </p>
                </div>

                {/* Filters affecting this control */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-[#06b6d4]" />
                      <span>Filtros en el Documento ({filtersAffectingSelected.length})</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#06b6d4]">
                      {filtersAffectingSelected.filter(f => f.isActivelyFiltering).length} activos
                    </span>
                  </div>

                  {filtersAffectingSelected.length > 0 ? (
                    <div className="space-y-2">
                      {filtersAffectingSelected.map(({ filterItem, filterElement: fEl, isActivelyFiltering, pageMatches, sameTable, scope, field, tableName, activeValues }) => {
                        return (
                          <div
                            key={`aff_flt_${fEl.id}`}
                            className={`p-3 rounded-lg border transition space-y-2.5 ${
                              isActivelyFiltering
                                ? 'bg-[#06b6d4]/10 border-[#06b6d4]/40 text-white shadow-xs'
                                : 'bg-[#141517] border-[#2f3136] text-[#9ca3af] hover:border-[#3f4147]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className={`p-1.5 rounded shrink-0 mt-0.5 ${
                                  isActivelyFiltering
                                    ? 'bg-[#06b6d4]/20 text-[#22d3ee]'
                                    : 'bg-[#1e2024] text-[#6b7280]'
                                }`}>
                                  <Filter className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                                    <span>{fEl.name || 'Filtro'}</span>
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#1e2024] text-[#9ca3af] font-mono">
                                      {filterItem.pageName}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#9ca3af] mt-0.5 space-x-1.5">
                                    <span className="font-mono text-cyan-300">Campo: {field}</span>
                                    {tableName && <span>• Tabla: {tableName}</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Toggle switch */}
                              <button
                                type="button"
                                onClick={() => handleToggleFilterForControl(fEl, isActivelyFiltering)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                  isActivelyFiltering
                                    ? 'bg-[#06b6d4] text-white shadow-xs hover:bg-[#0891b2]'
                                    : 'bg-[#202225] border border-[#373a40] text-[#9ca3af] hover:text-white hover:border-[#4b5563]'
                                }`}
                              >
                                {isActivelyFiltering ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Conectado</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Conectar</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Status and details bar */}
                            <div className="pt-2 border-t border-[#2f3136]/60 flex items-center justify-between text-[10px] text-[#9ca3af]">
                              <div className="flex items-center gap-2">
                                <span className={`flex items-center gap-1 ${sameTable ? 'text-emerald-400' : 'text-[#9ca3af]'}`}>
                                  {sameTable ? <Check className="w-2.5 h-2.5" /> : null}
                                  <span>{sameTable ? 'Misma tabla' : 'Tabla distinta'}</span>
                                </span>
                                <span>•</span>
                                <span className="font-mono">
                                  Ámbito: {scope === 'all' ? 'Todo el Doc' : scope === 'selected' ? 'Págs Selec' : 'Esta Pág'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onSwitchPage && !filterItem.isCurrentPage) {
                                    onSwitchPage(filterItem.pageIndex);
                                  }
                                  onSelectElement(fEl.id);
                                }}
                                className="text-[#06b6d4] hover:underline flex items-center gap-1 font-semibold"
                              >
                                <span>Editar filtro</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-[#141517] rounded-lg border border-[#2f3136] text-center space-y-2">
                      <Filter className="w-6 h-6 text-[#06b6d4] mx-auto opacity-50" />
                      <div className="font-bold text-xs text-white">No hay filtros en el documento</div>
                      <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                        Agrega un control de tipo "Filtro Desplegable" o "Filtro Casillas" desde la paleta izquierda para comenzar a filtrar este componente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* ========================================================================= */
            /* NO ELEMENT SELECTED: Guide & Fast Access to Document Filters              */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="p-4 bg-[#141517] rounded-lg border border-[#2f3136] text-center space-y-2">
                <Network className="w-8 h-8 text-[#06b6d4] mx-auto opacity-70" />
                <div className="font-bold text-sm text-white">Gestor de Dependencias</div>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Selecciona un elemento en el lienzo para ver y editar sus dependencias de filtrado, o explora la lista de filtros del documento a continuación.
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className="px-3 py-1.5 rounded-md bg-[#06b6d4] text-white font-bold text-xs hover:bg-[#0891b2] transition"
                >
                  Ver Matriz Global de Filtros
                </button>
              </div>

              {/* Fast list of filters in document */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                  <span>Filtros en el Documento</span>
                  <span className="text-[10px] font-mono text-[#06b6d4]">{filterElementsWithPage.length}</span>
                </div>

                {filterElementsWithPage.length > 0 ? (
                  <div className="space-y-1.5">
                    {filterElementsWithPage.map(item => {
                      const fEl = item.element;
                      const fBinding = fEl.binding || {};
                      return (
                        <div
                          key={`quick_flt_${fEl.id}`}
                          onClick={() => {
                            if (onSwitchPage && !item.isCurrentPage) {
                              onSwitchPage(item.pageIndex);
                            }
                            onSelectElement(fEl.id);
                          }}
                          className="p-2.5 rounded-lg bg-[#141517] border border-[#2f3136] hover:border-[#06b6d4] cursor-pointer transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 rounded bg-[#06b6d4]/15 text-[#06b6d4] group-hover:bg-[#06b6d4] group-hover:text-white transition">
                              <Filter className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate group-hover:text-[#22d3ee]">
                                {fEl.name || 'Filtro'}
                              </div>
                              <div className="text-[10px] text-[#9ca3af] font-mono">
                                {item.pageName} • Campo: {fBinding.field || 'Todos'}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#9ca3af] group-hover:text-white transition" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#6b7280] italic text-center py-2">
                    Aún no hay filtros en este documento.
                  </p>
                )}
              </div>
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* VIEW MODE: GLOBAL FILTER MATRIX                                           */
          /* ========================================================================= */
          <div className="space-y-4">
            <div className="p-3 bg-[#141517] rounded-lg border border-[#2f3136] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#06b6d4]" />
                  <span>Matriz Global de Filtros</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {filterElementsWithPage.length} filtros en {pages.length || 1} páginas
                </span>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                Visualiza y configura cómo cada filtro interactúa con todos los controles en cualquier página del proyecto.
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Filtrar por nombre de filtro o campo..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#1e2024] border border-[#2f3136] rounded-md text-xs text-white focus:border-[#06b6d4] focus:outline-none"
                />
              </div>
            </div>

            {/* List of Filters in Matrix */}
            <div className="space-y-3">
              {filterElementsWithPage
                .filter(item => {
                  if (!matrixSearch.trim()) return true;
                  const q = matrixSearch.toLowerCase();
                  return (
                    (item.element.name || '').toLowerCase().includes(q) ||
                    (item.element.binding?.field || '').toLowerCase().includes(q) ||
                    (item.pageName || '').toLowerCase().includes(q)
                  );
                })
                .map(item => {
                  const fEl = item.element;
                  const fBinding = fEl.binding || {};
                  const isExpanded = expandedMatrixFilterId === fEl.id;
                  const targetIds = fBinding.targetControlIds || [];
                  const isTargetAll = targetIds.length === 0 || targetIds.includes('*');

                  return (
                    <div
                      key={`mat_flt_${fEl.id}`}
                      className="bg-[#141517] rounded-lg border border-[#2f3136] overflow-hidden"
                    >
                      {/* Filter Header Card */}
                      <div className="p-3 flex items-center justify-between gap-2 border-b border-[#232528]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30 shrink-0">
                            <Filter className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                              <span>{fEl.name || 'Filtro'}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[#1e2024] text-[#9ca3af] font-mono">
                                {item.pageName}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#9ca3af] font-mono mt-0.5 space-x-1.5">
                              <span className="text-cyan-300 font-semibold">Campo: {fBinding.field || 'Todos'}</span>
                              {fBinding.tableName && <span>• Tabla: {fBinding.tableName}</span>}
                              <span>• Ámbito: {fBinding.filterPageScope || 'current'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSwitchPage && !item.isCurrentPage) {
                                onSwitchPage(item.pageIndex);
                              }
                              onSelectElement(fEl.id);
                              setViewMode('selected');
                            }}
                            className="px-2 py-1 rounded bg-[#202225] border border-[#373a40] text-[#9ca3af] hover:text-white text-xs font-semibold flex items-center gap-1 transition"
                            title="Seleccionar e inspeccionar este filtro"
                          >
                            <span>Inspeccionar</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedMatrixFilterId(isExpanded ? null : fEl.id)}
                            className="p-1 rounded hover:bg-[#202225] text-[#9ca3af] hover:text-white transition"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Target Controls Manager */}
                      {isExpanded && (
                        <div className="p-3 bg-[#181a1d] border-t border-[#232528]">
                          <GlobalFilterRelationshipManager
                            filterElement={fEl}
                            allDocumentElements={allDocumentElements}
                            pages={pages}
                            activePageIndex={activePageIndex}
                            onUpdateFilter={onUpdateElement}
                            onSelectElement={(id, pIdx) => {
                              if (onSwitchPage && typeof pIdx === 'number') {
                                onSwitchPage(pIdx);
                              }
                              onSelectElement(id);
                            }}
                            onSwitchPage={onSwitchPage}
                            dbInfo={dbInfo}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
