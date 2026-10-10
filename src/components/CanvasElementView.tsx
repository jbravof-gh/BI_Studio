import React, { useMemo, useState, useEffect } from 'react';
import { CanvasElement, CanvasDocument, DrillStep } from '../types';
import {
  evaluateTemplate,
  calculateAggregation,
  formatChartData,
  getDefaultDrillLevels
} from '../utils/dataBindingEvaluator';
import { applyDataTransformation } from '../utils/dataTransformation';
import { isColorDark } from '../utils/themePresets';
import { dexieManager } from '../services/dexieManager';
import { MiniBrowserControl } from './MiniBrowserControl';
import { QueryTableControl } from './QueryTableControl';
import { SplitPanelControl } from './SplitPanelControl';
import { buildMatrixGridModel } from '../utils/matrixUtils';
import { SeriesChartView } from './SeriesChartView';
import { 
  TrendingUp, 
  BarChart3, 
  Table as TableIcon, 
  Image as ImageIcon, 
  QrCode, 
  Hash, 
  Type, 
  Layers,
  GitFork,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Contact,
  CreditCard,
  Grid3X3,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Send,
  RotateCcw,
  Sparkles,
  User,
  Building2,
  DollarSign,
  Tag,
  Package,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Search,
  Filter,
  CheckSquare,
  ListFilter,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Sigma,
  Calculator,
  Plus,
  Minus,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface CanvasElementViewProps {
  element: CanvasElement;
  dbRecords: Record<string, Record<string, any>[]>;
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
}

export const CanvasElementView: React.FC<CanvasElementViewProps> = ({
  element,
  dbRecords,
  previewMode = false,
  selectedRecordIndex = 0,
  onRecordInserted,
  allFilterElements = [],
  activeFilters = {},
  onFilterChange,
  allDrillElements = [],
  activeDrillPaths = {},
  onDrillPathChange,
  currentPageId,
  currentPageIndex = 0,
  filterElPageMap = {},
  currentDocument,
  onUpdateElement
}) => {
  const { type, style, binding } = element;

  // Detect dark background for contrast
  const isDark = useMemo(() => isColorDark(style.backgroundColor), [style.backgroundColor]);

  // Local state for interactive drilldown fallback
  const [drillPath, setDrillPath] = useState<DrillStep[]>(element.binding.drillPath || []);
  
  // Local state for interactive registration form
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formValidationErrors, setFormValidationErrors] = useState<Record<string, string>>({});
  const [formIsSubmitting, setFormIsSubmitting] = useState<boolean>(false);
  const [formToast, setFormToast] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // Local state for table pagination & interactive column sorting
  const [tablePage, setTablePage] = useState<number>(0);
  const [tableSortColumn, setTableSortColumn] = useState<string | null>(binding.sortField || null);
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>((binding.sortOrder as 'asc' | 'desc') || 'asc');
  const [filterOptionSearch, setFilterOptionSearch] = useState<string>('');

  // Local state for Matrix interactive grouping/ungrouping
  const [matrixCollapsedRows, setMatrixCollapsedRows] = useState<Record<string, boolean>>({});
  const [matrixCollapsedCols, setMatrixCollapsedCols] = useState<Record<string, boolean>>({});

  // Reset table pagination when drill-down or standard filters change
  useEffect(() => {
    setTablePage(0);
  }, [activeDrillPaths, activeFilters]);

  // Handle clicking column header to sort
  const handleTableColumnSort = (col: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (tableSortColumn === col) {
      if (tableSortOrder === 'asc') {
        setTableSortOrder('desc');
      } else {
        setTableSortColumn(null);
        setTableSortOrder('asc');
      }
    } else {
      setTableSortColumn(col);
      setTableSortOrder('asc');
    }
    setTablePage(0);
  };

  // Full records for bound table (filtered & sorted)
  const fullTableData = useMemo(() => {
    if (!binding.tableName || !dbRecords[binding.tableName]) {
      return [];
    }
    let recs = dbRecords[binding.tableName] || [];

    // Apply interactive canvas filter controls targeting this element (including other filters)
    if (allFilterElements && allFilterElements.length > 0) {
      allFilterElements.forEach(filterEl => {
        if (filterEl.type !== 'filter' || filterEl.id === element.id) return;
        const fBinding = filterEl.binding;
        const filterField = fBinding.field;
        if (!filterField) return;

        // 1. Page Scope Verification
        const pageScope = fBinding.filterPageScope || 'current';
        if (pageScope === 'current') {
          // If filter is on current page only, verify this element is on the same page
          const filterPage = filterElPageMap[filterEl.id];
          if (filterPage && currentPageId && filterPage !== currentPageId) {
            return;
          }
        } else if (pageScope === 'selected') {
          const targetPages = fBinding.targetPageIds || [];
          const thisPageId = currentPageId || String(currentPageIndex ?? 0);
          const pageMatches = targetPages.includes(thisPageId) || 
                              targetPages.includes(String(currentPageIndex ?? 0));
          if (!pageMatches) {
            return;
          }
        }
        // If pageScope === 'all', it applies to all pages across the document!

        // 2. Target Control Verification
        const targetControlIds = fBinding.targetControlIds || [];
        if (targetControlIds.length > 0 && !targetControlIds.includes('*') && !targetControlIds.includes(element.id)) {
          return;
        }

        // 3. Table Match Verification
        if (fBinding.tableName && binding.tableName && fBinding.tableName !== binding.tableName) {
          return;
        }

        // 4. Selected Values Filtering
        const selectedVals = activeFilters[filterEl.id] ?? fBinding.filterSelectedValues ?? [];
        if (selectedVals.length > 0 && !selectedVals.includes('__ALL__') && !selectedVals.includes('')) {
          recs = recs.filter(r => {
            const val = r[filterField];
            if (val === undefined || val === null) return false;
            return selectedVals.some(sv => String(sv).trim().toLowerCase() === String(val).trim().toLowerCase());
          });
        }
      });
    }

    // Apply interactive drill-down filter controls targeting this element
    if (element.type !== 'drilldown' && allDrillElements && allDrillElements.length > 0) {
      allDrillElements.forEach(drillEl => {
        if (drillEl.type !== 'drilldown' || drillEl.id === element.id) return;
        const dBinding = drillEl.binding;
        if (dBinding.drillFilterEnabled === false) return;

        const path = activeDrillPaths[drillEl.id];
        if (!path || path.length === 0) return;

        // 1. Page Scope Verification
        const pageScope = dBinding.filterPageScope || 'current';
        if (pageScope === 'current') {
          const drillPage = filterElPageMap[drillEl.id];
          if (drillPage && currentPageId && drillPage !== currentPageId) {
            return;
          }
        } else if (pageScope === 'selected') {
          const targetPages = dBinding.targetPageIds || [];
          const thisPageId = currentPageId || String(currentPageIndex ?? 0);
          const pageMatches = targetPages.includes(thisPageId) || 
                              targetPages.includes(String(currentPageIndex ?? 0));
          if (!pageMatches) return;
        }

        // 2. Target Control Verification
        const targetControlIds = dBinding.targetControlIds || [];
        if (targetControlIds.length > 0 && !targetControlIds.includes('*') && !targetControlIds.includes(element.id)) {
          return;
        }

        // 3. Table Match Verification
        const tableMatches = !dBinding.tableName || !binding.tableName || dBinding.tableName === binding.tableName;
        const isExplicitlyTargeted = targetControlIds.includes(element.id);

        if (!tableMatches && !isExplicitlyTargeted) {
          const hasAnyMatchingField = recs.length > 0 && path.some(step => step.field in (recs[0] || {}));
          if (!hasAnyMatchingField) return;
        }

        // 4. Apply all active drill steps to filter records
        for (const step of path) {
          if (!step.field || step.value === undefined || step.value === null) continue;
          recs = recs.filter(r => {
            const val = r[step.field];
            if (val === undefined || val === null) {
              return !tableMatches && !isExplicitlyTargeted;
            }
            return String(val).trim().toLowerCase() === String(step.value).trim().toLowerCase();
          });
        }
      });
    }

    if (binding.filterField && binding.filterValue !== undefined && binding.filterValue !== '') {
      const fVal = String(binding.filterValue).toLowerCase();
      recs = recs.filter(r => String(r[binding.filterField!] ?? '').toLowerCase().includes(fVal));
    }

    const sortCol = tableSortColumn || binding.sortField;
    const isDesc = (tableSortColumn ? tableSortOrder : binding.sortOrder) === 'desc';

    if (sortCol) {
      recs = [...recs].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        // Numeric comparison (numbers or parseable numeric strings)
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && String(valA).trim() !== '' && String(valB).trim() !== '') {
          return isDesc ? numB - numA : numA - numB;
        }

        // Date comparison
        const dateA = Date.parse(String(valA));
        const dateB = Date.parse(String(valB));
        if (!isNaN(dateA) && !isNaN(dateB) && String(valA).length > 6 && String(valB).length > 6 && (String(valA).includes('-') || String(valA).includes('/'))) {
          return isDesc ? dateB - dateA : dateA - dateB;
        }

        return isDesc
          ? String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: 'base' })
          : String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return recs;
  }, [
    binding.tableName, 
    binding.filterField, 
    binding.filterValue, 
    binding.sortField, 
    binding.sortOrder, 
    tableSortColumn, 
    tableSortOrder, 
    dbRecords,
    allFilterElements,
    activeFilters,
    allDrillElements,
    activeDrillPaths,
    currentPageId,
    currentPageIndex,
    filterElPageMap,
    element.id,
    element.type
  ]);

  // Drill-down filters actively impacting this element
  const activeDrillFilters = useMemo(() => {
    if (element.type === 'drilldown' || !allDrillElements || allDrillElements.length === 0) return [];
    const list: Array<{ drillId: string; drillName: string; path: DrillStep[] }> = [];

    allDrillElements.forEach(drillEl => {
      if (drillEl.id === element.id || drillEl.binding.drillFilterEnabled === false) return;
      const path = activeDrillPaths[drillEl.id];
      if (!path || path.length === 0) return;

      const pageScope = drillEl.binding.filterPageScope || 'current';
      if (pageScope === 'current') {
        const drillPage = filterElPageMap[drillEl.id];
        if (drillPage && currentPageId && drillPage !== currentPageId) return;
      } else if (pageScope === 'selected') {
        const targetPages = drillEl.binding.targetPageIds || [];
        const thisPageId = currentPageId || String(currentPageIndex ?? 0);
        if (!targetPages.includes(thisPageId) && !targetPages.includes(String(currentPageIndex ?? 0))) return;
      }

      const targetControlIds = drillEl.binding.targetControlIds || [];
      if (targetControlIds.length > 0 && !targetControlIds.includes('*') && !targetControlIds.includes(element.id)) {
        return;
      }

      const tableMatches = !drillEl.binding.tableName || !binding.tableName || drillEl.binding.tableName === binding.tableName;
      const isExplicitlyTargeted = targetControlIds.includes(element.id);
      if (!tableMatches && !isExplicitlyTargeted) {
        const hasAny = path.some(step => step.field in (dbRecords[binding.tableName || '']?.[0] || {}));
        if (!hasAny) return;
      }

      list.push({
        drillId: drillEl.id,
        drillName: drillEl.binding.template || drillEl.name || 'Drill-Down',
        path
      });
    });

    return list;
  }, [
    element.id,
    element.type,
    allDrillElements,
    activeDrillPaths,
    binding.tableName,
    currentPageId,
    currentPageIndex,
    filterElPageMap,
    dbRecords
  ]);

  // Regular filters (checkbox lists, dropdowns) actively impacting this element
  const activeRegularFilters = useMemo(() => {
    if (!allFilterElements || allFilterElements.length === 0) return [];
    const list: Array<{ filterId: string; filterName: string; field: string; values: string[] }> = [];
    allFilterElements.forEach(filterEl => {
      if (filterEl.id === element.id || filterEl.type !== 'filter') return;
      const fBinding = filterEl.binding || {};
      const filterField = fBinding.field;
      if (!filterField) return;

      // 1. Page Scope Verification
      const pageScope = fBinding.filterPageScope || 'current';
      if (pageScope === 'current') {
        const filterPage = filterElPageMap[filterEl.id];
        if (filterPage && currentPageId && filterPage !== currentPageId) return;
      } else if (pageScope === 'selected') {
        const targetPages = fBinding.targetPageIds || [];
        const thisPageId = currentPageId || String(currentPageIndex ?? 0);
        const pageMatches = targetPages.includes(thisPageId) || targetPages.includes(String(currentPageIndex ?? 0));
        if (!pageMatches) return;
      }

      // 2. Target Control Verification
      const targetControlIds = fBinding.targetControlIds || [];
      if (targetControlIds.length > 0 && !targetControlIds.includes('*') && !targetControlIds.includes(element.id)) {
        return;
      }

      // 3. Table Match Verification
      if (fBinding.tableName && binding.tableName && fBinding.tableName !== binding.tableName) {
        return;
      }

      // 4. Selected Values Filtering
      const selectedVals = activeFilters[filterEl.id] ?? fBinding.filterSelectedValues ?? [];
      if (selectedVals.length > 0 && !selectedVals.includes('__ALL__') && !selectedVals.includes('')) {
        list.push({
          filterId: filterEl.id,
          filterName: filterEl.name || fBinding.template || filterField,
          field: filterField,
          values: selectedVals
        });
      }
    });
    return list;
  }, [
    element.id,
    binding.tableName,
    allFilterElements,
    activeFilters,
    currentPageId,
    currentPageIndex,
    filterElPageMap
  ]);

  // Apply data transformation step (formulas, aggregations, calculated columns)
  const transformedDataResult = useMemo(() => {
    return applyDataTransformation(fullTableData, binding.dataTransformation);
  }, [fullTableData, binding.dataTransformation]);

  // Non-table or limit-bound data
  const tableData = useMemo(() => {
    const sourceData = binding.dataTransformation?.enabled
      ? transformedDataResult.transformedRecords
      : fullTableData;

    if (binding.paginationMode === 'paginated') {
      return sourceData;
    }
    if (binding.limit && binding.limit > 0) {
      return sourceData.slice(0, binding.limit);
    }
    return sourceData;
  }, [fullTableData, transformedDataResult, binding.paginationMode, binding.limit, binding.dataTransformation?.enabled]);

  // Determine active single record for templating
  const activeRecord = useMemo(() => {
    if (tableData.length === 0) return undefined;
    const idx = (binding.recordIndex !== undefined && binding.recordIndex >= 0)
      ? binding.recordIndex
      : selectedRecordIndex;
    return tableData[idx] || tableData[0];
  }, [tableData, binding.recordIndex, selectedRecordIndex]);

  // Evaluate dynamic text
  const evaluatedText = useMemo(() => {
    if (binding.template) {
      return evaluateTemplate(binding.template, activeRecord);
    }
    if (binding.field && activeRecord) {
      const val = activeRecord[binding.field];
      return val !== undefined ? String(val) : '';
    }
    return binding.template || element.name;
  }, [binding, activeRecord, element.name]);

  // Compute Box Shadow based on presets or custom depth/blur/spread/color
  const computedBoxShadow = useMemo(() => {
    if (
      style.shadowBlur !== undefined ||
      style.shadowOffsetY !== undefined ||
      style.shadowOffsetX !== undefined ||
      style.shadowSpread !== undefined ||
      style.shadowColor
    ) {
      const x = style.shadowOffsetX ?? 0;
      const y = style.shadowOffsetY ?? 4;
      const blur = style.shadowBlur ?? 10;
      const spread = style.shadowSpread ?? 0;
      const color = style.shadowColor || 'rgba(0, 0, 0, 0.25)';
      return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    }
    switch (style.shadow) {
      case 'sm':
        return '0 1px 3px 0 rgba(0, 0, 0, 0.15), 0 1px 2px -1px rgba(0, 0, 0, 0.15)';
      case 'md':
        return '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -2px rgba(0, 0, 0, 0.25)';
      case 'lg':
        return '0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.35)';
      case 'xl':
        return '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)';
      case 'glow':
        return '0 0 20px 2px rgba(88, 101, 242, 0.5)';
      case 'none':
      default:
        return undefined;
    }
  }, [
    style.shadowBlur,
    style.shadowOffsetY,
    style.shadowOffsetX,
    style.shadowSpread,
    style.shadowColor,
    style.shadow
  ]);

  // Shadow class fallback (now handled natively via computedBoxShadow in containerStyle)
  const shadowClass = '';

  // Base container styling
  const containerStyle: React.CSSProperties = {
    backgroundColor: style.backgroundColor || 'transparent',
    color: style.color || '#0f172a',
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    fontFamily: style.fontFamily || 'inherit',
    fontWeight: style.fontWeight || 'normal',
    textAlign: style.textAlign || 'left',
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
    borderColor: style.borderColor || 'transparent',
    borderStyle: style.borderStyle || 'none',
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    padding: style.padding !== undefined ? `${style.padding}px` : '8px',
    opacity: style.opacity !== undefined ? style.opacity : 1,
    boxShadow: computedBoxShadow,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  switch (type) {
    case 'text':
      return (
        <div style={containerStyle} className={`${shadowClass} justify-center`}>
          <p className="w-full break-words whitespace-pre-wrap leading-relaxed m-0">
            {evaluatedText || (previewMode ? '' : <span className="text-slate-400 italic">Texto sin enlazar</span>)}
          </p>
        </div>
      );

    case 'kpi': {
      const agg = calculateAggregation(tableData, binding.field, binding.aggregation);
      return (
        <div style={containerStyle} className={`${shadowClass} justify-between select-none`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {binding.template || (binding.tableName ? `${binding.tableName}.${binding.field || '*'}` : 'Métrica KPI')}
            </span>
            <div className={`p-1 rounded-md ${isDark ? 'bg-white/10 text-cyan-400' : 'bg-blue-50 text-blue-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <div 
              className={`text-2xl font-bold tracking-tight truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
              style={{ color: style.color || undefined }}
            >
              {binding.prefix || ''}{agg.formatted}{binding.suffix || ''}
            </div>
            <div className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              {binding.aggregation ? `Operación: ${binding.aggregation.toUpperCase()}` : 'Valor directo'} • {tableData.length} registros
            </div>
          </div>
        </div>
      );
    }

    case 'card':
      return (
        <div style={containerStyle} className={`${shadowClass} justify-between`}>
          <div className={`flex items-center gap-2 pb-1.5 mb-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <span className={`text-xs font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {binding.tableName ? `Registro de ${binding.tableName}` : 'Ficha de Registro'}
            </span>
          </div>
          <div className={`flex-1 overflow-auto text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {evaluatedText || <span className="text-slate-400 italic">Sin datos</span>}
          </div>
        </div>
      );

    case 'table': {
      const effectiveData = binding.dataTransformation?.enabled
        ? transformedDataResult.transformedRecords
        : fullTableData;

      const isAggregated = Boolean(binding.dataTransformation?.enabled && transformedDataResult.isAggregated);

      let defaultCols: string[] = [];
      if (effectiveData[0]) {
        defaultCols = Object.keys(effectiveData[0]).filter(k => !k.startsWith('_')).slice(0, 6);
      } else {
        defaultCols = ['Columna 1', 'Columna 2', 'Columna 3'];
      }

      let columns: string[];
      if (isAggregated) {
        columns = defaultCols;
      } else {
        columns = binding.columns && binding.columns.length > 0
          ? [...binding.columns]
          : defaultCols;

        // Automatically append calculated columns if transformation is enabled
        if (binding.dataTransformation?.enabled && transformedDataResult.calculatedColumnNames.length > 0) {
          transformedDataResult.calculatedColumnNames.forEach(cn => {
            if (!columns.includes(cn)) {
              columns.push(cn);
            }
          });
        }
      }

      const isPaginated = binding.paginationMode === 'paginated';
      const pageSize = Math.max(1, binding.pageSize || 5);
      const totalRecords = effectiveData.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const currentPage = Math.min(Math.max(0, tablePage), totalPages - 1);

      const displayedRows = isPaginated
        ? effectiveData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
        : effectiveData.slice(0, binding.limit || 8);

      const startRecord = totalRecords > 0 ? (isPaginated ? currentPage * pageSize + 1 : 1) : 0;
      const endRecord = isPaginated
        ? Math.min((currentPage + 1) * pageSize, totalRecords)
        : Math.min(displayedRows.length, totalRecords);

      const showPaginationFooter = isPaginated && (binding.showPaginationControls !== false);

      return (
        <div style={containerStyle} className={`${shadowClass} overflow-hidden flex flex-col justify-between`}>
          {/* Header Title / Template / Active Sort Indicator / Filter & Drill-down Badges */}
          {(binding.template || tableSortColumn || activeDrillFilters.length > 0 || activeRegularFilters.length > 0 || binding.dataTransformation?.enabled) && (
            <div className={`flex items-center justify-between text-xs font-bold mb-1.5 pb-1 border-b truncate flex-shrink-0 gap-2 ${isDark ? 'text-slate-100 border-white/10' : 'text-slate-800 border-slate-100'}`}>
              <div className="flex items-center gap-1.5 truncate flex-wrap">
                <span className="truncate">{binding.template || (binding.tableName ? `Tabla: ${binding.tableName}` : 'Tabla')}</span>
                {binding.dataTransformation?.enabled && (
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium transition shadow-2xs border ${
                      isDark
                        ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                    title={
                      isAggregated
                        ? `Agrupado por: ${binding.dataTransformation.groupByField}`
                        : `Transformación activa (${transformedDataResult.calculatedColumnNames.length} campos calculados)`
                    }
                  >
                    <Sigma className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                    <span className="font-semibold truncate max-w-[120px]">
                      {isAggregated
                        ? `Group: ${binding.dataTransformation.groupByField}`
                        : (transformedDataResult.calculatedColumnNames.length > 0
                            ? `f(x) ${transformedDataResult.calculatedColumnNames.length}`
                            : 'f(x)')}
                    </span>
                  </span>
                )}
                {tableSortColumn && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTableSortColumn(null);
                      setTableSortOrder('asc');
                      setTablePage(0);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono font-medium transition cursor-pointer select-none ${
                      isDark 
                        ? 'bg-[#5865f2]/20 text-[#38bdf8] hover:bg-rose-500/20 hover:text-rose-300 border border-[#5865f2]/40' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-rose-50 hover:text-rose-600 border border-indigo-200'
                    }`}
                    title="Clic para quitar ordenación"
                  >
                    <span>{tableSortColumn} {tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
                {/* Active Regular Filter badges (Checkbox list, Dropdown) */}
                {activeRegularFilters.map(arf => (
                  <div
                    key={`arf_${arf.filterId}`}
                    className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium transition shadow-2xs border ${
                      isDark
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                        : 'bg-cyan-50 text-cyan-700 border-cyan-300'
                    }`}
                    title={`Filtrado por ${arf.filterName} (${arf.field}): ${arf.values.join(', ')}`}
                  >
                    <Filter className="w-2.5 h-2.5 text-cyan-500 flex-shrink-0" />
                    <span className="font-semibold truncate max-w-[120px]">
                      {arf.values.join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterChange?.(arf.filterId, []);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="hover:text-rose-600 p-0.5 rounded cursor-pointer transition"
                      title="Quitar este filtro"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {/* Active Drill-Down filter badges */}
                {activeDrillFilters.map(adf => (
                  <div
                    key={`adf_${adf.drillId}`}
                    className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium transition shadow-2xs border ${
                      isDark
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}
                    title={`Filtrado por Drill-Down (${adf.drillName}): ${adf.path.map(s => `${s.field}: ${s.value}`).join(' › ')}`}
                  >
                    <GitFork className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                    <span className="font-semibold truncate max-w-[120px]">
                      {adf.path.map(s => s.value).join(' › ')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDrillPathChange?.(adf.drillId, []);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="hover:text-rose-600 p-0.5 rounded cursor-pointer transition"
                      title="Quitar filtro de este Drill-Down"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              {isPaginated ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium flex-shrink-0 ${isDark ? 'bg-white/10 text-cyan-300' : 'bg-blue-50 text-blue-600'}`}>
                  Pág. {currentPage + 1}/{totalPages} {(activeDrillFilters.length > 0 || activeRegularFilters.length > 0) ? '• filtrada' : ''}
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium flex-shrink-0 ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {displayedRows.length} de {totalRecords} filas {(activeDrillFilters.length > 0 || activeRegularFilters.length > 0) ? '• filtradas' : ''}
                </span>
              )}
            </div>
          )}

          {/* Table Data Content */}
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`sticky top-0 z-10 ${isDark ? 'bg-[#25282c] text-slate-200 shadow-xs' : 'bg-slate-100/95 text-slate-700 shadow-xs'}`}>
                  {columns.map((col, cIdx) => {
                    const isSorted = tableSortColumn === col;
                    return (
                      <th
                        key={`th_${element.id}_${col}_${cIdx}`}
                        onClick={(e) => handleTableColumnSort(col, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`p-1.5 font-semibold text-[11px] uppercase tracking-wider border-b truncate cursor-pointer select-none transition group ${
                          isDark
                            ? (isSorted ? 'bg-[#5865f2]/20 text-[#38bdf8] border-b-2 border-b-[#5865f2]' : 'border-white/10 hover:bg-white/10 hover:text-white')
                            : (isSorted ? 'bg-indigo-50 text-indigo-700 border-b-2 border-b-indigo-500' : 'border-slate-200 hover:bg-slate-200/70 hover:text-slate-900')
                        }`}
                        title={
                          isSorted
                            ? `Ordenado por ${col}: ${tableSortOrder === 'asc' ? 'Ascendente (clic para descendente)' : 'Descendente (clic para quitar orden)'}`
                            : `Ordenar por ${col}`
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{col}</span>
                          <span className="shrink-0 flex items-center">
                            {isSorted ? (
                              tableSortOrder === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-[#5865f2]" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-[#5865f2]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition" />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
                {displayedRows.length > 0 ? (
                  displayedRows.map((row, rIdx) => {
                    const rowKey = row.id ?? row._id ?? `${currentPage}_${rIdx}`;
                    return (
                      <tr 
                        key={`tr_${element.id}_${rowKey}`} 
                        className={`transition-colors ${
                          isDark 
                            ? (rIdx % 2 === 0 ? 'bg-transparent hover:bg-white/[0.04]' : 'bg-white/[0.02] hover:bg-white/[0.06]') 
                            : (rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60')
                        }`}
                      >
                        {columns.map((col, colIdx) => {
                          const isSorted = tableSortColumn === col;
                          return (
                            <td 
                              key={`td_${element.id}_${rIdx}_${col}_${colIdx}`} 
                              className={`p-1.5 truncate max-w-[140px] ${
                                isSorted 
                                  ? (isDark ? 'bg-[#5865f2]/5 text-white font-medium' : 'bg-indigo-50/50 text-slate-900 font-medium')
                                  : (isDark ? 'text-slate-300' : 'text-slate-600')
                              }`}
                            >
                              {typeof row[col] === 'number' ? row[col].toLocaleString('es-ES') : String(row[col] ?? '-')}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="p-4 text-center text-slate-400 italic text-xs">
                      {binding.tableName ? (
                        activeDrillFilters.length > 0 ? (
                          <div className="py-2 flex flex-col items-center gap-1.5 not-italic">
                            <span className="text-slate-500 font-medium">Sin registros para los niveles seleccionados en el Drill-Down</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                activeDrillFilters.forEach(f => onDrillPathChange?.(f.drillId, []));
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition text-[11px] font-semibold cursor-pointer shadow-2xs"
                            >
                              Restablecer filtro Drill-Down
                            </button>
                          </div>
                        ) : (
                          `No hay registros en "${binding.tableName}"`
                        )
                      ) : (
                        'Selecciona una tabla para ver datos'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
              {binding.dataTransformation?.enabled && transformedDataResult.summaryRow && (
                <tfoot className={`sticky bottom-0 z-10 font-bold border-t-2 ${
                  isDark 
                    ? 'bg-[#1e2023] border-[#f59e0b]/40 text-amber-300' 
                    : 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-2xs'
                }`}>
                  <tr>
                    {columns.map((col, colIdx) => {
                      const val = transformedDataResult.summaryRow![col];
                      return (
                        <td key={`tf_${element.id}_${col}_${colIdx}`} className="p-1.5 truncate text-[11px]">
                          {val !== undefined
                            ? (typeof val === 'number' ? val.toLocaleString('es-ES') : String(val))
                            : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer Bar: Paginación Interactiva o Resumen de Límite de Filas */}
          {isPaginated && showPaginationFooter ? (
            <div 
              onClick={(e) => e.stopPropagation()} 
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex items-center justify-between px-2 py-1.5 mt-1 border-t text-[11px] select-none flex-shrink-0 ${
                isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-100 bg-slate-50/80 text-slate-600'
              }`}
            >
              {/* Record Summary */}
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="opacity-75">Reg.</span>
                <span className="font-semibold text-[#5865f2]">{startRecord}-{endRecord}</span>
                <span className="opacity-75">de</span>
                <span className="font-semibold">{totalRecords}</span>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-1">
                {binding.paginationStyle !== 'simple' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTablePage(0);
                    }}
                    disabled={currentPage === 0}
                    className={`p-1 rounded transition cursor-pointer ${
                      currentPage === 0
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 text-slate-800'
                    }`}
                    title="Primera Página"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTablePage(prev => Math.max(0, prev - 1));
                  }}
                  disabled={currentPage === 0}
                  className={`p-1 rounded transition cursor-pointer flex items-center gap-0.5 ${
                    currentPage === 0
                      ? 'opacity-30 cursor-not-allowed text-slate-400'
                      : isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 text-slate-800'
                  }`}
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {binding.paginationStyle === 'compact' && <span className="text-[10px]">Ant</span>}
                </button>

                {/* Page Indicator Pill */}
                <div className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  isDark ? 'bg-white/10 text-white' : 'bg-white shadow-xs border border-slate-200 text-slate-800'
                }`}>
                  {currentPage + 1} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTablePage(prev => Math.min(totalPages - 1, prev + 1));
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className={`p-1 rounded transition cursor-pointer flex items-center gap-0.5 ${
                    currentPage >= totalPages - 1
                      ? 'opacity-30 cursor-not-allowed text-slate-400'
                      : isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 text-slate-800'
                  }`}
                  title="Página Siguiente"
                >
                  {binding.paginationStyle === 'compact' && <span className="text-[10px]">Sig</span>}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {binding.paginationStyle !== 'simple' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTablePage(totalPages - 1);
                    }}
                    disabled={currentPage >= totalPages - 1}
                    className={`p-1 rounded transition cursor-pointer ${
                      currentPage >= totalPages - 1
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 text-slate-800'
                    }`}
                    title="Última Página"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : !isPaginated ? (
            <div className={`flex items-center justify-between px-2 py-1 mt-1 border-t text-[10px] font-mono select-none flex-shrink-0 ${
              isDark ? 'border-white/10 text-slate-400 bg-black/10' : 'border-slate-100 text-slate-500 bg-slate-50/50'
            }`}>
              <span>Límite: {displayedRows.length} de {totalRecords} filas</span>
              {totalRecords > displayedRows.length && (
                <span className="text-amber-500 font-sans font-medium">+{totalRecords - displayedRows.length} no mostradas</span>
              )}
            </div>
          ) : null}
        </div>
      );
    }

    case 'chart': {
      if (binding.chartType === 'series') {
        return (
          <SeriesChartView
            element={element}
            tableData={tableData}
            isDark={isDark}
            containerStyle={containerStyle}
            shadowClass={shadowClass}
          />
        );
      }

      const chartData = formatChartData(tableData, binding.labelField, binding.valueField, binding.dataTransformation);
      const maxVal = Math.max(...chartData.map(d => d.value), 1);
      const chartType = binding.chartType || 'bar';

      return (
        <div style={containerStyle} className={`${shadowClass} justify-between overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-slate-800 truncate">
                {binding.template || (binding.tableName ? `Gráfico ${binding.tableName}` : 'Gráfico Dinámico')}
              </span>
              {binding.dataTransformation?.enabled && (
                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sigma className="w-2.5 h-2.5 text-amber-600" />
                  {binding.dataTransformation.aggregateFunction && binding.dataTransformation.aggregateFunction !== 'none'
                    ? `${binding.dataTransformation.aggregateFunction.toUpperCase()}`
                    : 'f(x)'}
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {chartType}
            </span>
          </div>

          <div className="flex-1 w-full flex items-end justify-around gap-2 pt-2 px-1 pb-1 relative">
            {chartData.length > 0 ? (
              chartType === 'bar' ? (
                chartData.map((d, idx) => {
                  const heightPercent = Math.max(8, Math.min(100, (d.value / maxVal) * 100));
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={`bar_${element.id}_${d.label}_${idx}`} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-bold text-slate-700 mb-1 opacity-90 group-hover:opacity-100">
                        {d.value.toLocaleString('es-ES')}
                      </div>
                      <div
                        className="w-full rounded-t-md transition-all duration-300 relative"
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: barColor,
                          minWidth: '12px',
                          maxWidth: '48px'
                        }}
                      />
                      <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[60px] text-center" title={d.label}>
                        {d.label}
                      </div>
                    </div>
                  );
                })
              ) : chartType === 'pie' ? (
                <div className="w-full h-full flex items-center justify-center gap-4">
                  <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-inner flex items-center justify-center bg-gradient-to-tr from-blue-500 via-emerald-400 to-amber-400">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm">
                      {chartData.length} items
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px] max-w-[120px] overflow-hidden">
                    {chartData.slice(0, 4).map((d, i) => (
                      <div key={`pie_slice_${element.id}_${d.label}_${i}`} className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 4] }} />
                        <span className="truncate text-slate-600">{d.label}: <strong>{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Line / Area SVG
                <div className="w-full h-full flex flex-col justify-end">
                  <svg className="w-full h-28 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`grad_${element.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {chartData.length > 1 && (
                      <>
                        <polygon
                          points={
                            `0,100 ` +
                            chartData.map((d, i) => {
                              const x = (i / (chartData.length - 1)) * 300;
                              const y = 90 - (d.value / maxVal) * 80;
                              return `${x},${y}`;
                            }).join(' ') +
                            ` 300,100`
                          }
                          fill={`url(#grad_${element.id})`}
                        />
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                          points={chartData.map((d, i) => {
                            const x = (i / (chartData.length - 1)) * 300;
                            const y = 90 - (d.value / maxVal) * 80;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      </>
                    )}
                  </svg>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    {chartData.map((d, i) => (
                      <span key={i} className="truncate max-w-[45px]">{d.label}</span>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="m-auto text-xs text-slate-400 italic">Sin datos para graficar</div>
            )}
          </div>
        </div>
      );
    }

    case 'badge': {
      const variant = binding.badgeVariant || 'primary';
      const variantClasses = {
        primary: 'bg-blue-100 text-blue-800 border-blue-200',
        success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
        danger: 'bg-rose-100 text-rose-800 border-rose-200',
        neutral: 'bg-slate-100 text-slate-800 border-slate-200'
      }[variant];

      return (
        <div style={containerStyle} className={`${shadowClass} items-center justify-center`}>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center justify-center gap-1.5 w-full h-full ${variantClasses}`}>
            {evaluatedText || 'Badge'}
          </span>
        </div>
      );
    }

    case 'image': {
      const imgUrl = (activeRecord && binding.field && activeRecord[binding.field])
        ? activeRecord[binding.field]
        : (binding.imageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80');

      return (
        <div style={{ ...containerStyle, padding: 0 }} className={`${shadowClass} relative`}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={element.name}
              className="w-full h-full"
              style={{ objectFit: binding.imageFit || 'cover' }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80';
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
              <ImageIcon className="w-8 h-8 mb-1" />
              <span className="text-xs">Imagen</span>
            </div>
          )}
        </div>
      );
    }

    case 'qrcode': {
      const textToEncode = evaluatedText || 'https://indexeddb-canvas.app';
      return (
        <div style={containerStyle} className={`${shadowClass} items-center justify-center text-center gap-1`}>
          {binding.prefix && <span className="text-[10px] text-slate-500 font-medium">{binding.prefix}</span>}
          <div className="p-1.5 bg-white rounded border border-slate-200 shadow-sm flex items-center justify-center">
            {/* Elegant SVG simulated QR matrix */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-slate-900">
              <path d="M2 2h7v7H2V2zm2 2v3h3V4H4zm11-2h7v7h-7V2zm2 2v3h3V4h-3zM2 15h7v7H2v-7zm2 2v3h3v-3H4zm9-2h2v2h-2v-2zm4 0h3v2h-3v-2zm-4 4h2v3h-2v-3zm3 1h2v2h-2v-2zm2-1h2v3h-2v-3zm-9-8h2v2h-2V6zm3 0h2v2h-2V6zm2 2h2v2h-2V8zm-5 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2 2h2v2h-2v-2z" />
            </svg>
          </div>
          <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">
            {textToEncode}
          </span>
        </div>
      );
    }

    case 'drilldown': {
      // Available fields from the loaded table data
      const availableFields = tableData[0] ? Object.keys(tableData[0]) : [];

      // Hierarchy levels MUST ONLY be established over fields that actually exist in the table
      let levels: string[] = (binding.drillLevels || []).filter(f =>
        availableFields.length === 0 || availableFields.includes(f)
      );

      // If binding has no valid fields for the table, pick defaults strictly from availableFields
      if (levels.length === 0 && availableFields.length > 0) {
        levels = getDefaultDrillLevels(availableFields);
      }

      const hasValidLevels = levels.length > 0;

      // Filter drillPath to only include steps with fields that actually belong to the current hierarchy
      const safeDrillPath = (activeDrillPaths[element.id] ?? drillPath).filter(step => levels.includes(step.field));

      const handleDrillChange = (newPath: DrillStep[]) => {
        setDrillPath(newPath);
        onDrillPathChange?.(element.id, newPath);
      };

      const currentLevelIndex = hasValidLevels ? Math.min(safeDrillPath.length, levels.length - 1) : 0;
      const currentLevelField = hasValidLevels ? levels[currentLevelIndex] : '';

      let filteredData = tableData;
      for (const step of safeDrillPath) {
        filteredData = filteredData.filter(r => String(r[step.field]) === String(step.value));
      }

      const valueField = (binding.valueField && availableFields.includes(binding.valueField))
        ? binding.valueField
        : (availableFields.find(k => typeof tableData[0]?.[k] === 'number' && !/^(id|_id)$/i.test(k)));

      const groupsMap: Record<string, { label: string; count: number; value: number }> = {};
      if (currentLevelField) {
        filteredData.forEach(r => {
          const key = String(r[currentLevelField] ?? 'Sin clasificar');
          if (!groupsMap[key]) {
            groupsMap[key] = { label: key, count: 0, value: 0 };
          }
          groupsMap[key].count += 1;
          if (valueField && typeof r[valueField] === 'number') {
            groupsMap[key].value += r[valueField];
          } else {
            groupsMap[key].value += 1;
          }
        });
      }

      const groupItems = Object.values(groupsMap).sort((a, b) => b.value - a.value);
      const maxValue = Math.max(...groupItems.map(g => g.value), 1);
      const canDrillFurther = hasValidLevels && safeDrillPath.length < levels.length;

      return (
        <div style={containerStyle} className={`${shadowClass} justify-between select-none`}>
          {/* Header & Breadcrumb */}
          <div className="border-b border-slate-100 pb-1.5 mb-2">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded bg-indigo-50 text-indigo-600">
                  <GitFork className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800 truncate">
                  {binding.template || 'Explorador Drill-Down'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {binding.drillFilterEnabled !== false && (
                  <div
                    className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                      safeDrillPath.length > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                    title={
                      safeDrillPath.length > 0
                        ? `Filtrando tablas y controles por: ${safeDrillPath.map(s => `${s.field}=${s.value}`).join(' › ')}`
                        : 'Filtrado de tablas activo al navegar'
                    }
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${safeDrillPath.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{safeDrillPath.length > 0 ? `Filtrando (${safeDrillPath.length})` : 'Filtro activo'}</span>
                    {safeDrillPath.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrillChange([]);
                        }}
                        className="hover:text-rose-600 cursor-pointer font-bold ml-0.5"
                        title="Quitar todos los filtros"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}
                {hasValidLevels && currentLevelField && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                    Nivel {currentLevelIndex + 1}/{levels.length}: {currentLevelField}
                  </span>
                )}
              </div>
            </div>

            {/* Breadcrumb strip */}
            {hasValidLevels && (
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDrillChange([]);
                  }}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${safeDrillPath.length === 0 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
                >
                  Inicio
                </button>
                {safeDrillPath.map((step, sIdx) => (
                  <React.Fragment key={`crumb_${step.field}_${sIdx}`}>
                    <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrillChange(safeDrillPath.slice(0, sIdx + 1));
                      }}
                      className={`px-1.5 py-0.5 rounded truncate max-w-[100px] transition cursor-pointer ${sIdx === safeDrillPath.length - 1 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
                    >
                      {step.value}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Group Bars List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {!hasValidLevels ? (
              <div className="text-center py-6 text-xs text-slate-400 italic px-3">
                {tableData.length === 0
                  ? 'Sin datos disponibles en la tabla seleccionada'
                  : 'Configura los niveles de jerarquía en el inspector sobre los campos de la tabla'}
              </div>
            ) : groupItems.length > 0 ? (
              groupItems.map((grp, gIdx) => {
                const pct = Math.max(8, Math.min(100, (grp.value / maxValue) * 100));
                return (
                  <div
                    key={`grp_${grp.label}_${gIdx}`}
                    onClick={(e) => {
                      if (canDrillFurther) {
                        e.stopPropagation();
                        handleDrillChange([...safeDrillPath, { field: currentLevelField, value: grp.label }]);
                      }
                    }}
                    className={`p-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/80 transition relative overflow-hidden group ${canDrillFurther ? 'cursor-pointer hover:border-indigo-200 shadow-2xs' : ''}`}
                  >
                    {/* Background Progress bar fill */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-indigo-50/70 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between z-10">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-slate-800 truncate">{grp.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({grp.count} reg)</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600 font-mono">
                          {valueField ? grp.value.toLocaleString('es-ES') : grp.count}
                        </span>
                        {canDrillFurther && (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                {binding.tableName ? 'Sin registros para desglosar' : 'Selecciona una tabla en el inspector'}
              </div>
            )}
          </div>

          {/* Footer status / Back button */}
          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {safeDrillPath.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDrillChange(safeDrillPath.slice(0, -1));
                }}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Nivel anterior</span>
              </button>
            ) : (
              <span className="text-slate-400 text-[10px]">Haz clic en una fila para filtrar tablas</span>
            )}
            <div className="flex items-center gap-2">
              {safeDrillPath.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDrillChange([]);
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-600 transition cursor-pointer font-medium"
                >
                  Restablecer
                </button>
              )}
              <span className="text-slate-400 font-mono text-[10px]">{filteredData.length} registros</span>
            </div>
          </div>
        </div>
      );
    }

    case 'detailCard': {
      const titleRaw = (activeRecord && binding.headerField && activeRecord[binding.headerField] !== undefined)
        ? activeRecord[binding.headerField]
        : (activeRecord?.nombre ?? activeRecord?.cliente ?? activeRecord?.id ?? binding.template ?? element.name ?? 'Ficha Detalle');
      const title = String(titleRaw ?? 'Ficha Detalle');

      const subtitleRaw = (activeRecord && binding.subHeaderField && activeRecord[binding.subHeaderField] !== undefined)
        ? activeRecord[binding.subHeaderField]
        : (binding.subHeaderField ? '-' : '');
      const subtitle = subtitleRaw ? String(subtitleRaw) : '';

      const detailColumns = Array.isArray(binding.columns)
        ? binding.columns
        : [];

      const initials = title
        ? String(title).trim().split(/\s+/).map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ID'
        : 'ID';

      return (
        <div style={containerStyle} className={`${shadowClass} justify-between overflow-hidden`}>
          {/* Card Header with Avatar & Badges */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-[#2f3136] pb-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{title}</h4>
                {subtitle ? (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-[10px] font-semibold flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Activo</span>
            </span>
          </div>

          {/* Key-Value Fields Grid */}
          <div className="flex-1 grid grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 text-xs content-start">
            {detailColumns.length > 0 ? (
              activeRecord ? (
                detailColumns.map((col, cIdx) => {
                  const val = activeRecord[col];
                  const displayVal = val !== undefined && val !== null
                    ? (typeof val === 'number' ? val.toLocaleString('es-ES') : String(val))
                    : '-';

                  return (
                    <div key={`det_${col}_${cIdx}`} className="p-1.5 bg-slate-50/70 dark:bg-[#1a1b1e]/60 border border-slate-100 dark:border-[#2f3136] rounded-md min-w-0">
                      <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block truncate" title={col}>
                        {col}
                      </span>
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 font-mono truncate block" title={displayVal}>
                        {displayVal}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-4 text-slate-400 italic text-xs">
                  {binding.tableName ? `No hay registros en "${binding.tableName}"` : 'Enlaza una tabla en el inspector'}
                </div>
              )
            ) : (
              <div className="col-span-2 h-full min-h-[90px] flex flex-col items-center justify-center py-4 px-3 text-center border border-dashed border-slate-200 dark:border-[#2f3136] rounded-lg bg-slate-50/50 dark:bg-[#1a1b1e]/50">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">Ficha en blanco</span>
                <span className="text-[10px] mt-1 text-slate-400 dark:text-slate-400 leading-relaxed max-w-[240px]">
                  Configura los campos visibles en la sección <strong className="text-slate-600 dark:text-slate-300 font-semibold">Campos de Ficha</strong> del inspector.
                </span>
              </div>
            )}
          </div>

          {/* Footer with Actions */}
          <div className="pt-2 mt-1 border-t border-slate-100 dark:border-[#2f3136] flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-mono">
              {binding.tableName ? `BD: ${binding.tableName}` : 'Ficha individual'}
            </span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition">
                Ver detalle
              </span>
            </div>
          </div>
        </div>
      );
    }

    case 'matrix': {
      const rowFields = Array.isArray(binding.rowFields) && binding.rowFields.length > 0
        ? binding.rowFields.filter(Boolean)
        : (binding.rowField ? [binding.rowField] : (tableData[0] ? [Object.keys(tableData[0])[0]] : ['categoria']));

      const colFields = Array.isArray(binding.colFields) && binding.colFields.length > 0
        ? binding.colFields.filter(Boolean)
        : (binding.colField ? [binding.colField] : (tableData[0] ? [Object.keys(tableData[0])[1] || Object.keys(tableData[0])[0]] : ['ciudad']));

      const valKey = binding.valueField || (tableData[0] ? Object.keys(tableData[0]).find(k => typeof tableData[0][k] === 'number') : undefined);
      const aggType = (binding.aggregation as 'sum' | 'count' | 'avg' | 'min' | 'max') || 'sum';
      const showSubtotals = binding.matrixShowSubtotals !== false;
      const showGrandTotals = binding.matrixShowGrandTotals !== false;

      const matrixModel = buildMatrixGridModel({
        tableData,
        rowFields,
        colFields,
        valueField: valKey,
        aggregation: aggType,
        collapsedRows: matrixCollapsedRows,
        collapsedCols: matrixCollapsedCols,
        showSubtotals,
        showGrandTotals
      });

      // Interactive toggle handlers for single row / column groups
      const toggleRowCollapse = (rowId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setMatrixCollapsedRows(prev => ({
          ...prev,
          [rowId]: !prev[rowId]
        }));
      };

      const toggleColCollapse = (colId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setMatrixCollapsedCols(prev => ({
          ...prev,
          [colId]: !prev[colId]
        }));
      };

      // Collapse all groups to root level 1
      const handleCollapseAll = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsedRows: Record<string, boolean> = {};
        matrixModel.allRowGroupIds.forEach(id => {
          newCollapsedRows[id] = true;
        });
        const newCollapsedCols: Record<string, boolean> = {};
        matrixModel.allColGroupIds.forEach(id => {
          newCollapsedCols[id] = true;
        });
        setMatrixCollapsedRows(newCollapsedRows);
        setMatrixCollapsedCols(newCollapsedCols);
      };

      // Expand all groups across all levels
      const handleExpandAll = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setMatrixCollapsedRows({});
        setMatrixCollapsedCols({});
      };

      // Level-specific grouping actions for rows
      const handleSetRowLevel = (targetLevel: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsedRows: Record<string, boolean> = {};
        Object.entries(matrixModel.rowGroupsByLevel).forEach(([lvlStr, ids]) => {
          const lvl = parseInt(lvlStr, 10);
          if (lvl >= targetLevel - 1) {
            ids.forEach(id => { newCollapsedRows[id] = true; });
          }
        });
        setMatrixCollapsedRows(newCollapsedRows);
      };

      const handleCollapseOneRowLevel = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsed = { ...matrixCollapsedRows };
        for (let l = matrixModel.maxRowLevels - 2; l >= 0; l--) {
          const ids = matrixModel.rowGroupsByLevel[l] || [];
          const anyExpanded = ids.some(id => !newCollapsed[id]);
          if (anyExpanded) {
            ids.forEach(id => { newCollapsed[id] = true; });
            break;
          }
        }
        setMatrixCollapsedRows(newCollapsed);
      };

      const handleExpandOneRowLevel = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsed = { ...matrixCollapsedRows };
        for (let l = 0; l < matrixModel.maxRowLevels; l++) {
          const ids = matrixModel.rowGroupsByLevel[l] || [];
          const anyCollapsed = ids.some(id => newCollapsed[id]);
          if (anyCollapsed) {
            ids.forEach(id => { delete newCollapsed[id]; });
            break;
          }
        }
        setMatrixCollapsedRows(newCollapsed);
      };

      // Level-specific grouping actions for columns
      const handleSetColLevel = (targetLevel: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsedCols: Record<string, boolean> = {};
        Object.entries(matrixModel.colGroupsByLevel).forEach(([lvlStr, ids]) => {
          const lvl = parseInt(lvlStr, 10);
          if (lvl >= targetLevel - 1) {
            ids.forEach(id => { newCollapsedCols[id] = true; });
          }
        });
        setMatrixCollapsedCols(newCollapsedCols);
      };

      const handleCollapseOneColLevel = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsed = { ...matrixCollapsedCols };
        for (let l = matrixModel.maxColLevels - 2; l >= 0; l--) {
          const ids = matrixModel.colGroupsByLevel[l] || [];
          const anyExpanded = ids.some(id => !newCollapsed[id]);
          if (anyExpanded) {
            ids.forEach(id => { newCollapsed[id] = true; });
            break;
          }
        }
        setMatrixCollapsedCols(newCollapsed);
      };

      const handleExpandOneColLevel = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newCollapsed = { ...matrixCollapsedCols };
        for (let l = 0; l < matrixModel.maxColLevels; l++) {
          const ids = matrixModel.colGroupsByLevel[l] || [];
          const anyCollapsed = ids.some(id => newCollapsed[id]);
          if (anyCollapsed) {
            ids.forEach(id => { delete newCollapsed[id]; });
            break;
          }
        }
        setMatrixCollapsedCols(newCollapsed);
      };

      return (
        <div style={containerStyle} className={`${shadowClass} justify-between overflow-hidden select-none flex flex-col`}>
          {/* Top Header & Grouping Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-1 shrink-0">
            {/* Left: Title & level breadcrumb */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Grid3X3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {binding.template || 'Matriz Bidimensional'}
              </span>
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
                  {rowFields.join(' › ')}
                </span>
                <span>×</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
                  {colFields.join(' › ')}
                </span>
              </div>
            </div>

            {/* Right: Grouping & Ungrouping Controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              {/* Row grouping controls */}
              {matrixModel.maxRowLevels > 1 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-700 text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400 mr-1 font-semibold text-[9px]">Filas:</span>
                  <button
                    type="button"
                    onClick={handleCollapseOneRowLevel}
                    title="Agrupar 1 nivel de filas"
                    className="px-1 py-0.2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                  >
                    -
                  </button>
                  {Array.from({ length: matrixModel.maxRowLevels }).map((_, idx) => (
                    <button
                      key={`r_lvl_${idx}`}
                      type="button"
                      onClick={(e) => handleSetRowLevel(idx + 1, e)}
                      title={`Mostrar hasta nivel ${idx + 1} de filas`}
                      className="px-1 py-0.2 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded transition cursor-pointer text-[10px]"
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleExpandOneRowLevel}
                    title="Desagrupar 1 nivel de filas"
                    className="px-1 py-0.2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Col grouping controls */}
              {matrixModel.maxColLevels > 1 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-700 text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400 mr-1 font-semibold text-[9px]">Cols:</span>
                  <button
                    type="button"
                    onClick={handleCollapseOneColLevel}
                    title="Agrupar 1 nivel de columnas"
                    className="px-1 py-0.2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                  >
                    -
                  </button>
                  {Array.from({ length: matrixModel.maxColLevels }).map((_, idx) => (
                    <button
                      key={`c_lvl_${idx}`}
                      type="button"
                      onClick={(e) => handleSetColLevel(idx + 1, e)}
                      title={`Mostrar hasta nivel ${idx + 1} de columnas`}
                      className="px-1 py-0.2 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded transition cursor-pointer text-[10px]"
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleExpandOneColLevel}
                    title="Desagrupar 1 nivel de columnas"
                    className="px-1 py-0.2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Global Agrupar Todo / Desagrupar Todo buttons */}
              {(matrixModel.maxRowLevels > 1 || matrixModel.maxColLevels > 1) && (
                <div className="flex items-center gap-1 ml-0.5">
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    title="Agrupar todo (Colapsar a nivel 1)"
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <Minimize2 className="w-2.5 h-2.5" />
                    <span className="hidden md:inline">Agrupar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    title="Desagrupar todo (Expandir todos los niveles)"
                    className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded text-[10px] font-semibold border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center gap-1"
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                    <span className="hidden md:inline">Desagrupar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Matrix Table Grid */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                {matrixModel.headerRows.map((headerRow, hIdx) => (
                  <tr key={`m_hr_${hIdx}`} className="bg-slate-100/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 sticky top-0 z-10">
                    {/* Corner header cell */}
                    {hIdx === 0 && (
                      <th
                        rowSpan={matrixModel.headerRows.length}
                        className="p-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky left-0 z-20 align-bottom min-w-[120px]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 dark:text-slate-500 font-normal text-[9px] truncate">
                            {rowFields.join(' › ')} \
                          </span>
                          <span className="truncate">{colFields.join(' › ')}</span>
                        </div>
                      </th>
                    )}

                    {/* Tiered Column headers */}
                    {headerRow.map((colNode) => (
                      <th
                        key={`m_col_${colNode.id}`}
                        colSpan={colNode.colSpan}
                        rowSpan={colNode.rowSpan}
                        className={`p-1.5 text-[10px] font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center truncate ${
                          colNode.level === 0 ? 'bg-slate-200/70 dark:bg-slate-700/60' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        <div className="inline-flex items-center justify-center gap-1 max-w-[130px] mx-auto truncate">
                          {colNode.hasChildren && (
                            <button
                              type="button"
                              onClick={(e) => toggleColCollapse(colNode.id, e)}
                              title={colNode.isCollapsed ? `Desagrupar columna ${colNode.value}` : `Agrupar columna ${colNode.value}`}
                              className="p-0.5 rounded bg-slate-300/80 hover:bg-blue-500 hover:text-white dark:bg-slate-600 dark:hover:bg-blue-500 text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
                            >
                              {colNode.isCollapsed ? <Plus className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                            </button>
                          )}
                          <span className="truncate">{colNode.value}</span>
                          {colNode.isCollapsed && colNode.hasChildren && (
                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-mono">(Tot)</span>
                          )}
                        </div>
                      </th>
                    ))}

                    {/* Total header on top row */}
                    {hIdx === 0 && showGrandTotals && (
                      <th
                        rowSpan={matrixModel.headerRows.length}
                        className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-right border-b border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 min-w-[70px]"
                      >
                        Total
                      </th>
                    )}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {matrixModel.visibleRows.length > 0 ? (
                  matrixModel.visibleRows.map((rNode) => (
                    <tr key={`m_row_${rNode.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      {/* Hierarchical Row Label with Indentation & Collapse/Expand */}
                      <td
                        style={{ paddingLeft: `${6 + rNode.level * 14}px` }}
                        className={`p-1.5 font-semibold text-xs truncate max-w-[180px] border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 ${
                          rNode.level === 0
                            ? 'bg-slate-100/90 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 font-bold'
                            : 'bg-slate-50/70 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {rNode.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => toggleRowCollapse(rNode.id, e)}
                              title={rNode.isCollapsed ? `Desagrupar ${rNode.value}` : `Agrupar ${rNode.value}`}
                              className="p-0.5 rounded bg-slate-200 hover:bg-blue-500 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-500 text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
                            >
                              {rNode.isCollapsed ? <Plus className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                            </button>
                          ) : (
                            <span className="w-3 text-slate-300 dark:text-slate-600 text-center text-[10px]">▪</span>
                          )}
                          <span className="truncate">{rNode.value}</span>
                          {rNode.isCollapsed && rNode.hasChildren && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono">
                              +{rNode.children.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cells for each visible leaf column */}
                      {matrixModel.visibleLeafCols.map((cNode) => {
                        const cellVal = rNode.cellValues[cNode.id] ?? 0;
                        const intensity = cellVal > 0 ? Math.min(1, Math.max(0.08, cellVal / matrixModel.maxCellVal)) : 0;

                        return (
                          <td
                            key={`m_cell_${rNode.id}_${cNode.id}`}
                            style={{
                              backgroundColor: cellVal > 0 ? `rgba(59, 130, 246, ${intensity * 0.28})` : undefined
                            }}
                            className="p-1.5 text-center font-mono text-xs text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800/80 transition"
                          >
                            {cellVal > 0 ? (typeof cellVal === 'number' ? cellVal.toLocaleString('es-ES') : cellVal) : '-'}
                          </td>
                        );
                      })}

                      {/* Row Total */}
                      {showGrandTotals && (
                        <td className="p-1.5 text-right font-mono font-bold text-xs text-blue-700 dark:text-blue-400 bg-slate-50/60 dark:bg-slate-800/60">
                          {rNode.rowTotal.toLocaleString('es-ES')}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={matrixModel.visibleLeafCols.length + (showGrandTotals ? 2 : 1)} className="p-4 text-center text-slate-400 italic text-xs">
                      {binding.tableName ? 'Sin registros para tabular' : 'Selecciona una tabla en el inspector'}
                    </td>
                  </tr>
                )}

                {/* Grand Total Row at Bottom */}
                {showGrandTotals && matrixModel.visibleRows.length > 0 && (
                  <tr className="bg-slate-100 dark:bg-slate-800/95 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-10">
                    <td className="p-1.5 text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      Total General
                    </td>
                    {matrixModel.visibleLeafCols.map((cNode) => (
                      <td key={`m_tot_${cNode.id}`} className="p-1.5 text-center font-mono text-xs text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                        {(matrixModel.colTotals[cNode.id] || 0).toLocaleString('es-ES')}
                      </td>
                    ))}
                    <td className="p-1.5 text-right font-mono text-xs text-blue-800 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/50">
                      {matrixModel.grandTotal.toLocaleString('es-ES')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case 'form': {
      const selectedFields = (Array.isArray(binding.columns) ? binding.columns : []).filter(Boolean);

      const handleFieldChange = (f: string, v: any) => {
        setFormData(prev => ({ ...prev, [f]: v }));
        if (formValidationErrors[f]) {
          setFormValidationErrors(prev => {
            const next = { ...prev };
            delete next[f];
            return next;
          });
        }
        if (formToast?.show) {
          setFormToast(null);
        }
      };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!binding.tableName) {
          setFormToast({
            show: true,
            type: 'warning',
            title: 'Tabla no asignada',
            message: 'Selecciona una tabla en el inspector antes de guardar registros.'
          });
          return;
        }

        if (selectedFields.length === 0) {
          setFormToast({
            show: true,
            type: 'warning',
            title: 'Sin campos',
            message: 'Configura al menos un campo en el inspector para este formulario.'
          });
          return;
        }

        // Validate form inputs
        const errors: Record<string, string> = {};
        for (const field of selectedFields) {
          const val = formData[field];
          const isNumeric = ['precio', 'saldo', 'total', 'stock', 'cantidad', 'edad', 'id'].some(k => field.toLowerCase().includes(k));
          
          if (val === undefined || val === null || String(val).trim() === '') {
            errors[field] = 'Este campo es requerido';
          } else if (isNumeric && isNaN(Number(val))) {
            errors[field] = 'Debe ser un número válido';
          }
        }

        if (Object.keys(errors).length > 0) {
          setFormValidationErrors(errors);
          setFormToast({
            show: true,
            type: 'error',
            title: 'Validación requerida',
            message: `Por favor completa los ${Object.keys(errors).length} campo(s) obligatorios correctamente.`
          });
          return;
        }

        // Process insertion into active database
        setFormIsSubmitting(true);
        try {
          const targetDbName = dexieManager.getActiveDbName();
          if (!targetDbName) {
            throw new Error('No hay ninguna base de datos activa seleccionada.');
          }

          // Format payload converting numbers where appropriate
          const recordToInsert: Record<string, any> = {};
          for (const field of selectedFields) {
            const rawVal = formData[field];
            const isNumeric = ['precio', 'saldo', 'total', 'stock', 'cantidad', 'edad', 'id'].some(k => field.toLowerCase().includes(k));
            if (isNumeric && rawVal !== undefined && rawVal !== '') {
              recordToInsert[field] = Number(rawVal);
            } else {
              recordToInsert[field] = rawVal;
            }
          }

          // If id is not specified, generate one or let auto-increment
          const existingTableRecords = dbRecords[binding.tableName] || [];
          if (recordToInsert.id === undefined) {
            const maxId = existingTableRecords.reduce((max, r) => {
              const num = Number(r.id);
              return !isNaN(num) ? Math.max(max, num) : max;
            }, 0);
            recordToInsert.id = maxId > 0 ? maxId + 1 : Date.now();
          }

          // Execute insert via dexieManager
          await dexieManager.addRecord(targetDbName, binding.tableName, recordToInsert);

          // Notify parent app to refresh state
          if (onRecordInserted) {
            onRecordInserted(binding.tableName, recordToInsert);
          }

          // Clear form and show success toast
          setFormData({});
          setFormValidationErrors({});
          setFormToast({
            show: true,
            type: 'success',
            title: '¡Registro Insertado!',
            message: `El registro se guardó exitosamente en la tabla "${binding.tableName}" (ID: ${recordToInsert.id}).`
          });

          // Auto dismiss toast after 4 seconds
          setTimeout(() => {
            setFormToast(prev => prev?.type === 'success' ? null : prev);
          }, 4000);

        } catch (err: any) {
          console.error('Error inserting record into table:', err);
          setFormToast({
            show: true,
            type: 'error',
            title: 'Error al insertar registro',
            message: err.message || 'No se pudo guardar el registro en la base de datos.'
          });
        } finally {
          setFormIsSubmitting(false);
        }
      };

      return (
        <div style={containerStyle} className={`${shadowClass} justify-between select-none relative overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <ClipboardList className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {binding.template || 'Formulario de Registro'}
              </span>
            </div>
            {binding.tableName ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold flex-shrink-0">
                Tabla: {binding.tableName}
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold flex-shrink-0">
                Sin tabla
              </span>
            )}
          </div>

          {/* Form Content */}
          {selectedFields.length > 0 ? (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto gap-2 pr-0.5">
              <div className="grid grid-cols-2 gap-2">
                {selectedFields.map((field, idx) => {
                  const isNumeric = ['precio', 'saldo', 'total', 'stock', 'cantidad', 'edad', 'id'].some(k => field.toLowerCase().includes(k));
                  const isDate = ['fecha', 'date', 'creado'].some(k => field.toLowerCase().includes(k));
                  const hasError = !!formValidationErrors[field];

                  return (
                    <div key={`form_fld_${field}_${idx}`} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-slate-600 capitalize block truncate">
                          {field} <span className="text-rose-500 font-bold">*</span>
                        </label>
                        {isNumeric && (
                          <span className="text-[8px] font-mono text-slate-400">num</span>
                        )}
                      </div>
                      <input
                        type={isNumeric ? 'number' : isDate ? 'date' : 'text'}
                        step={isNumeric ? 'any' : undefined}
                        placeholder={`Ingresar ${field}...`}
                        value={formData[field] !== undefined ? formData[field] : ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 bg-slate-50 border rounded-md focus:bg-white focus:outline-none transition text-slate-800 placeholder-slate-400 font-medium ${
                          hasError 
                            ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 ring-1 ring-rose-400/30' 
                            : 'border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      {hasError && (
                        <p className="text-[9px] text-rose-500 font-medium leading-tight flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{formValidationErrors[field]}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Toast feedback banner inside the form */}
              {formToast && formToast.show && (
                <div 
                  className={`p-2 rounded-lg text-xs font-medium flex items-start gap-2 animate-fade-in my-1 shadow-sm border transition-all ${
                    formToast.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : formToast.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {formToast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : formToast.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] leading-tight">{formToast.title}</p>
                    <p className="text-[10px] opacity-90 leading-tight mt-0.5">{formToast.message}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormToast(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold leading-none p-0.5"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Actions Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0">
                <button
                  type="button"
                  disabled={formIsSubmitting}
                  onClick={() => {
                    setFormData({});
                    setFormValidationErrors({});
                    setFormToast(null);
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded text-[11px] font-medium transition cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={formIsSubmitting}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white rounded text-[11px] font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {formIsSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>{binding.prefix || 'Insertar Registro'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <ClipboardList className="w-6 h-6 text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-600">Sin campos seleccionados</p>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[220px]">
                {binding.tableName
                  ? `Selecciona en el inspector los campos de "${binding.tableName}" que deseas incluir.`
                  : 'Enlaza una tabla y selecciona los campos a capturar en el inspector.'}
              </p>
            </div>
          )}
        </div>
      );
    }

    case 'filter': {
      const isCheckboxList = binding.filterDisplayMode === 'checkbox_list';
      const targetTable = binding.tableName || '';
      const filterField = binding.field || '';
      const rawRecords = (targetTable && dbRecords[targetTable]) || [];
      // fullTableData contains records of targetTable filtered by OTHER active filters and drilldowns!
      const filteredRecords = fullTableData;
      const isFilteredByOthers = activeRegularFilters.length > 0 || activeDrillFilters.length > 0;

      // Extract unique values and counts for filterField in filtered records
      const filteredCounts: Record<string, number> = {};
      if (filterField && filteredRecords.length > 0) {
        filteredRecords.forEach(r => {
          const val = r[filterField];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const strVal = String(val).trim();
            filteredCounts[strVal] = (filteredCounts[strVal] || 0) + 1;
          }
        });
      }

      // Raw counts across the whole unfiltered table for reference
      const rawCounts: Record<string, number> = {};
      if (filterField && rawRecords.length > 0) {
        rawRecords.forEach(r => {
          const val = r[filterField];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const strVal = String(val).trim();
            rawCounts[strVal] = (rawCounts[strVal] || 0) + 1;
          }
        });
      }

      const currentSelected = activeFilters[element.id] ?? binding.filterSelectedValues ?? [];
      const hasActiveSelection = currentSelected.length > 0 && !currentSelected.includes('__ALL__') && !currentSelected.includes('');

      // Build distinct options list: all options present in the filtered dataset
      const distinctOptions: { value: string; count: number; rawCount: number; isOutOfScope?: boolean }[] = [];
      const sortedFilteredVals = Object.keys(filteredCounts).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      sortedFilteredVals.forEach(val => {
        distinctOptions.push({
          value: val,
          count: filteredCounts[val],
          rawCount: rawCounts[val] || filteredCounts[val],
          isOutOfScope: false
        });
      });

      // Preserve any currently selected values that may have 0 matching records under the current cross-filters
      currentSelected.forEach(selVal => {
        if (selVal && selVal !== '__ALL__' && !filteredCounts[selVal]) {
          distinctOptions.push({
            value: selVal,
            count: 0,
            rawCount: rawCounts[selVal] || 0,
            isOutOfScope: true
          });
        }
      });

      // Filter options by local search query if present
      const visibleOptions = filterOptionSearch.trim()
        ? distinctOptions.filter(opt => opt.value.toLowerCase().includes(filterOptionSearch.toLowerCase().trim()))
        : distinctOptions;

      const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val || val === '__ALL__') {
          onFilterChange?.(element.id, []);
        } else {
          onFilterChange?.(element.id, [val]);
        }
      };

      const handleToggleCheckbox = (val: string) => {
        let next: string[];
        if (currentSelected.includes(val)) {
          next = currentSelected.filter(v => v !== val);
        } else {
          next = [...currentSelected.filter(v => v !== '__ALL__' && v !== ''), val];
        }
        onFilterChange?.(element.id, next);
      };

      const handleSelectAll = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        // Select all available valid options in the currently filtered view
        const toSelect = visibleOptions.filter(o => !o.isOutOfScope && o.count > 0).map(o => o.value);
        const next = Array.from(new Set([...currentSelected, ...toSelect]));
        onFilterChange?.(element.id, next);
      };

      const handleClear = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        onFilterChange?.(element.id, []);
      };

      // Scope description
      const scopeDesc = binding.filterPageScope === 'all'
        ? 'Todas las páginas'
        : binding.filterPageScope === 'selected'
        ? `${binding.targetPageIds?.length || 0} páginas`
        : 'Esta página';

      const targetsDesc = (binding.targetControlIds && binding.targetControlIds.length > 0 && !binding.targetControlIds.includes('*'))
        ? `${binding.targetControlIds.length} controles`
        : 'Todos los controles';

      const cascadingFilterNames = [
        ...activeRegularFilters.map(f => f.filterName),
        ...activeDrillFilters.map(d => d.drillName)
      ];

      return (
        <div 
          style={containerStyle} 
          className={`${shadowClass} justify-between text-xs select-none`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`p-1 rounded shrink-0 ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-700'}`}>
                {isCheckboxList ? <CheckSquare className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <span className={`font-bold text-xs truncate block ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  {binding.template || element.name || (filterField ? `Filtro: ${filterField}` : 'Filtro')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isFilteredByOthers && (
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
                  title={`Filtrado en cascada por: ${cascadingFilterNames.join(', ')}`}
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>Cascada ({cascadingFilterNames.length})</span>
                </span>
              )}
              {hasActiveSelection && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center gap-0.5 transition cursor-pointer"
                  title="Quitar filtro activo"
                >
                  <X className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                hasActiveSelection
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                  : 'bg-black/5 dark:bg-white/10 text-slate-400'
              }`}>
                {hasActiveSelection ? `${currentSelected.length} activo` : 'Sin filtro'}
              </span>
            </div>
          </div>

          {/* Body: Dropdown vs Checkbox list */}
          <div className="flex-1 my-2 overflow-hidden flex flex-col min-h-0">
            {!targetTable ? (
              <div className="flex-1 flex flex-col items-center justify-center p-2 text-center text-slate-400 italic text-[11px]">
                <Filter className="w-4 h-4 opacity-40 mb-1" />
                <span>Enlaza una tabla en el Inspector</span>
              </div>
            ) : !filterField ? (
              <div className="flex-1 flex flex-col items-center justify-center p-2 text-center text-slate-400 italic text-[11px]">
                <ListFilter className="w-4 h-4 opacity-40 mb-1" />
                <span>Selecciona el campo a filtrar</span>
              </div>
            ) : distinctOptions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-2 text-center text-slate-400 italic text-[11px]">
                {isFilteredByOthers 
                  ? 'Sin opciones coincidentes con los otros filtros' 
                  : `No hay valores registrados en "${filterField}"`}
              </div>
            ) : isCheckboxList ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search if more than 5 options */}
                {distinctOptions.length > 5 && (
                  <div className="relative mb-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={filterOptionSearch}
                      onChange={(e) => setFilterOptionSearch(e.target.value)}
                      placeholder={`Buscar en ${distinctOptions.length} opciones...`}
                      className={`w-full pl-6 pr-6 py-1 rounded text-[11px] border transition focus:outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-[#1a1b1e] border-[#2f3136] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    {filterOptionSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterOptionSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Quick actions & Status bar */}
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-black/5 dark:border-white/5 text-[10px] shrink-0">
                  <span className="text-slate-400">
                    {isFilteredByOthers ? (
                      <span className="text-cyan-500 dark:text-cyan-400 font-medium">
                        {distinctOptions.filter(o => !o.isOutOfScope).length} de {Object.keys(rawCounts).length} disponibles
                      </span>
                    ) : (
                      `${distinctOptions.length} opciones`
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                      title="Seleccionar todas las opciones disponibles"
                    >
                      Todos
                    </button>
                    <span className="text-slate-400">|</span>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                      title="Deseleccionar todo"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {visibleOptions.length === 0 ? (
                    <div className="text-center py-4 text-[10px] text-slate-400 italic">
                      No hay opciones que coincidan con la búsqueda
                    </div>
                  ) : (
                    visibleOptions.map(opt => {
                      const isChecked = currentSelected.includes(opt.value);
                      return (
                        <label
                          key={`opt_${opt.value}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center justify-between px-2 py-1 rounded transition cursor-pointer select-none text-[11px] ${
                            isChecked 
                              ? 'bg-cyan-500/15 border border-cyan-500/30 font-medium text-cyan-600 dark:text-cyan-300' 
                              : opt.isOutOfScope
                              ? 'opacity-40 hover:opacity-75 hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 line-through'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                          title={opt.isOutOfScope ? 'Esta opción no tiene registros con los otros filtros activos' : `${opt.count} registros`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCheckbox(opt.value)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            />
                            <span className="truncate">{opt.value}</span>
                          </div>
                          <span className={`text-[10px] font-mono shrink-0 ml-1.5 ${opt.isOutOfScope ? 'text-amber-500 font-bold' : 'opacity-60'}`}>
                            {opt.isOutOfScope ? '(0)' : `(${opt.count})`}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Dropdown mode */
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                <div className="relative">
                  <select
                    value={hasActiveSelection ? currentSelected[0] : ''}
                    onChange={handleDropdownSelect}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full px-2.5 py-1.5 pr-7 text-xs rounded-md border transition cursor-pointer appearance-none ${
                      isDark
                        ? 'bg-[#1a1b1e] border-[#2f3136] text-white hover:border-[#5865f2] focus:border-[#5865f2]'
                        : 'bg-white border-slate-300 text-slate-900 hover:border-blue-500 focus:border-blue-500'
                    }`}
                  >
                    <option value="">-- {binding.filterPlaceholder || 'Todos los valores'} ({filteredRecords.length}) --</option>
                    {distinctOptions.map(opt => (
                      <option key={`dd_opt_${opt.value}`} value={opt.value}>
                        {opt.value} {opt.isOutOfScope ? '(0 - fuera de filtro)' : `(${opt.count})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {hasActiveSelection && (
                  <div className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                    <span>Filtrando por:</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 font-bold truncate max-w-[160px]">
                      {currentSelected[0]}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Info Pill */}
          <div className="pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-mono shrink-0">
            <span title="Ámbito de páginas del filtro">Ámbito: {scopeDesc}</span>
            <span title="Controles afectados">{targetsDesc}</span>
          </div>
        </div>
      );
    }

    case 'divider':
      return (
        <div style={containerStyle} className="items-center justify-center">
          <hr className="w-full border-t border-slate-300" style={{ borderColor: style.borderColor || '#cbd5e1' }} />
        </div>
      );

    case 'queryTable': {
      return (
        <QueryTableControl
          element={element}
          dbRecords={dbRecords}
          dbInfo={null}
          onUpdateElement={onUpdateElement}
          isInteractive={!previewMode || true}
        />
      );
    }

    case 'minibrowser': {
      return (
        <MiniBrowserControl
          element={element}
          dbRecords={dbRecords}
          previewMode={previewMode}
          currentDocument={currentDocument}
          onUpdateElement={onUpdateElement}
          renderElement={(subEl, subDoc) => (
            <CanvasElementView
              element={subEl}
              dbRecords={dbRecords}
              previewMode={true}
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
              currentDocument={subDoc || currentDocument}
              onUpdateElement={onUpdateElement}
            />
          )}
        />
      );
    }

    case 'splitPanel': {
      return (
        <SplitPanelControl
          element={element}
          dbRecords={dbRecords}
          previewMode={previewMode}
          onUpdateElement={onUpdateElement}
          renderItem={(subEl) => {
            if (subEl.type === 'splitPanel') {
              return (
                <div className="p-3 text-xs text-[#9ca3af] flex items-center justify-center h-full">
                  Panel Dividido (anidamiento no disponible)
                </div>
              );
            }
            return (
              <CanvasElementView
                element={subEl}
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
              />
            );
          }}
        />
      );
    }

    case 'container':
    default: {
      const isGroupContainer = !!element.isGroup;
      return (
        <div
          style={{
            ...containerStyle,
            backgroundColor: style.backgroundColor || (isGroupContainer ? 'rgba(99, 102, 241, 0.04)' : '#ffffff'),
            borderWidth: `${style.borderWidth !== undefined ? style.borderWidth : (isGroupContainer ? 1 : 1)}px`,
            borderColor: style.borderColor || (isGroupContainer ? '#6366f1' : '#e2e8f0'),
            borderStyle: style.borderStyle || (isGroupContainer ? 'dashed' : 'solid'),
            borderRadius: `${style.borderRadius !== undefined ? style.borderRadius : 8}px`,
          }}
          className={`${shadowClass} relative overflow-hidden`}
        >
          {isGroupContainer && !previewMode && (
            <div className="absolute top-1 left-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#6366f1] bg-[#6366f1]/10 px-1.5 py-0.5 rounded border border-[#6366f1]/25 pointer-events-none select-none">
              <Package className="w-3 h-3" />
              <span>{element.name || 'Grupo de Elementos'}</span>
              <span className="text-[9px] opacity-75 font-mono">({element.childrenIds?.length || 0})</span>
            </div>
          )}
        </div>
      );
    }
  }
};
