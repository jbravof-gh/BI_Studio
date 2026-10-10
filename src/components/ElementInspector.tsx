import React, { useState, useMemo, useEffect } from 'react';
import { CanvasElement, DatabaseInfo, ControlType, CanvasPage, CanvasDocument, DocumentElementWithPage } from '../types';
import { dexieManager } from '../services/dexieManager';
import {
  evaluateTemplate,
  calculateAggregation,
  getDefaultDrillLevels,
  sanitizeDrillLevels,
  getDefaultDrillMetricField
} from '../utils/dataBindingEvaluator';
import { COLOR_TAG_PRESETS } from './LayersPanel';
import { useFormSchemaRefresh } from '../hooks/useFormSchemaRefresh';
import { GlobalFilterRelationshipManager } from './GlobalFilterRelationshipManager';
import { DependenciesPanel } from './DependenciesPanel';
import { 
  Database, 
  Palette, 
  Layout, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Sliders, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  Table as TableIcon, 
  BarChart2, 
  TrendingUp, 
  Image as ImageIcon, 
  QrCode, 
  Tag, 
  Square, 
  Minus, 
  CheckSquare, 
  SquareDashed, 
  Filter, 
  ListFilter,
  SlidersHorizontal,
  Search, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown, 
  Maximize2, 
  Minimize2, 
  Type, 
  CheckCircle2, 
  X, 
  Layers,
  Wand2,
  GitFork,
  Contact,
  Grid3X3,
  ClipboardList,
  Package,
  PackageOpen,
  Paintbrush,
  Check,
  BoxSelect,
  RefreshCw,
  Globe,
  Bookmark,
  Network,
  ExternalLink,
  TableProperties,
  Code2,
  Plus,
  Calendar,
  Spline,
  Columns2,
  Rows2,
  Grid2x2,
  Split,
  AppWindow,
  Navigation,
  FileSpreadsheet,
  PanelBottom,
  Pin,
  PinOff,
  History
} from 'lucide-react';
import { QueryBuilderModal } from './QueryBuilderModal';
import { DataTransformationInspector } from './DataTransformationInspector';
import { DataPreviewModal } from './DataPreviewModal';

interface ElementInspectorProps {
  element: CanvasElement | null;
  allElements?: CanvasElement[];
  dbInfo: DatabaseInfo | null;
  dbRecords: Record<string, Record<string, any>[]>;
  canvasWidth: number;
  canvasHeight: number;
  onChangeElement: (updated: CanvasElement) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onUngroupElement?: (groupId: string) => void;
  onSelectElementById?: (id: string, pageIndex?: number) => void;
  // Style copy & paste
  onCopyStyle?: (id: string) => void;
  onPasteStyle?: (id: string) => void;
  hasCopiedStyle?: boolean;
  pages?: CanvasPage[];
  activePageIndex?: number;
  allDocumentElements?: DocumentElementWithPage[];
  onOpenDependenciesTab?: () => void;
  onSwitchPage?: (pageIndex: number) => void;
}

const CONTROL_TYPE_INFO: Record<ControlType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  text: { label: 'Texto / Título', icon: Type },
  kpi: { label: 'Tarjeta Métrica KPI', icon: TrendingUp },
  table: { label: 'Tabla de Datos', icon: TableIcon },
  chart: { label: 'Gráfico Estadístico', icon: BarChart2 },
  image: { label: 'Imagen / Foto', icon: ImageIcon },
  qrcode: { label: 'Código QR', icon: QrCode },
  badge: { label: 'Etiqueta / Badge', icon: Tag },
  card: { label: 'Ficha de Registro', icon: Square },
  container: { label: 'Contenedor / Fondo', icon: Square },
  divider: { label: 'Separador / Línea', icon: Minus },
  drilldown: { label: 'Drill-Down / Jerarquía', icon: GitFork },
  detailCard: { label: 'Ficha Detalle', icon: Contact },
  matrix: { label: 'Matriz / Pivot Table', icon: Grid3X3 },
  form: { label: 'Formulario Registro', icon: ClipboardList },
  filter: { label: 'Filtro Interactivo', icon: Filter },
  minibrowser: { label: 'MiniBrowser (Navegador)', icon: Globe },
  queryTable: { label: 'QueryTable', icon: TableProperties },
  splitPanel: { label: 'Panel Dividido (Split)', icon: Columns2 }
};

type InspectorCategory = 'all' | 'binding' | 'typography' | 'styling' | 'position' | 'dependencies';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accentColor?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  icon: Icon,
  badge,
  isOpen,
  onToggle,
  children,
  accentColor = '#5865f2'
}) => {
  return (
    <div id={`inspector_section_${id}`} className="border border-[#2f3136] bg-[#25282c] rounded-lg overflow-hidden transition-all duration-200 shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2.5 bg-[#25282c] hover:bg-[#2a2d32] flex items-center justify-between transition cursor-pointer select-none text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1b1e] text-[#9ca3af] rounded border border-[#373a40] font-mono truncate max-w-[120px]">
              {badge}
            </span>
          )}
          <div className="text-[#9ca3af] transition-transform duration-200">
            {isOpen ? <ChevronDown className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#2f3136] bg-[#202225]/60 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  element,
  allElements = [],
  dbInfo,
  dbRecords,
  canvasWidth,
  canvasHeight,
  onChangeElement,
  onDeleteElement,
  onDuplicateElement,
  onBringToFront,
  onSendToBack,
  onUngroupElement,
  onSelectElementById,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle = false,
  pages = [],
  activePageIndex = 0,
  allDocumentElements,
  onOpenDependenciesTab,
  onSwitchPage
}) => {
  const [filterCategory, setFilterCategory] = useState<InspectorCategory>('all');
  const [columnSearch, setColumnSearch] = useState('');
  const [customColumnInput, setCustomColumnInput] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'group_management': true,
    'binding_source': true,
    'binding_control': true,
    'binding_filter_config': true,
    'binding_dependencies': true,
    'binding_minibrowser': true,
    'binding_queryTable': true,
    'binding_form': true,
    'binding_cards': true,
    'binding_matrix': true,
    'binding_chart': true,
    'binding_data_transformation': true,
    'binding_template': true,
    'binding_filters': false,
    'binding_preview': true,
    'style_typography': true,
    'style_background': true,
    'style_borders': false,
    'style_effects': false,
    'style_shadow': false,
    'pos_coordinates': true,
    'pos_fit_content': true,
    'pos_alignment': true,
    'pos_layers': true,
  });

  const [savedDbDesigns, setSavedDbDesigns] = useState<CanvasDocument[]>([]);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState<boolean>(false);
  const [isDataPreviewOpen, setIsDataPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    if (element?.type === 'minibrowser') {
      const fetchDesigns = async () => {
        try {
          const dbName = dbInfo?.name || dexieManager.getActiveDbName();
          if (dbName) {
            const list = await dexieManager.getCanvasDesigns(dbName);
            setSavedDbDesigns(list);
          }
        } catch (err) {
          console.warn('Error fetching saved designs in inspector:', err);
        }
      };
      fetchDesigns();
    }
  }, [element?.type, dbInfo?.name]);

  const [fitPadding, setFitPadding] = useState<number>(16);
  const [fitFeedback, setFitFeedback] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAllSections = () => {
    setOpenSections({
      'binding_source': true,
      'binding_control': true,
      'binding_form': true,
      'binding_cards': true,
      'binding_matrix': true,
      'binding_chart': true,
      'binding_template': true,
      'binding_filters': true,
      'binding_preview': true,
      'style_typography': true,
      'style_background': true,
      'style_borders': true,
      'style_effects': true,
      'style_shadow': true,
      'pos_coordinates': true,
      'pos_fit_content': true,
      'pos_alignment': true,
      'pos_layers': true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      'binding_source': false,
      'binding_control': false,
      'binding_form': false,
      'binding_cards': false,
      'binding_matrix': false,
      'binding_chart': false,
      'binding_template': false,
      'binding_filters': false,
      'binding_preview': false,
      'style_typography': false,
      'style_background': false,
      'style_borders': false,
      'style_effects': false,
      'style_shadow': false,
      'pos_coordinates': false,
      'pos_fit_content': false,
      'pos_alignment': false,
      'pos_layers': false,
    });
  };

  // Detect child elements for container/group or enclosed elements
  const detectedChildren = useMemo(() => {
    if (!element) return [];
    
    // 1. If explicit childrenIds
    if (element.childrenIds && element.childrenIds.length > 0) {
      const explicit = allElements.filter(el => element.childrenIds!.includes(el.id));
      if (explicit.length > 0) return explicit;
    }
    // 2. If isGroup
    if (element.isGroup) {
      const grouped = allElements.filter(el => el.groupId === element.id);
      if (grouped.length > 0) return grouped;
    }
    // 3. Elements that are geometrically inside or overlapping this element bounds
    return allElements.filter(el => {
      if (el.id === element.id) return false;
      if (el.groupId === element.id) return true;
      // Check if element center or box intersects/lies mostly inside this element
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;
      const insideX = elCenterX >= element.x - 20 && elCenterX <= element.x + element.width + 20;
      const insideY = elCenterY >= element.y - 20 && elCenterY <= element.y + element.height + 20;
      return insideX && insideY;
    });
  }, [element, allElements]);

  // Handler for 'Fit to Content' (Ajustar al Contenido)
  const handleFitToContent = (paddingOverride?: number) => {
    if (!element) return;
    const padding = paddingOverride !== undefined ? paddingOverride : fitPadding;
    
    if (detectedChildren.length === 0) {
      setFitFeedback('Sin elementos hijos dentro del contenedor');
      setTimeout(() => setFitFeedback(null), 3000);
      return;
    }

    const minX = Math.min(...detectedChildren.map(c => c.x));
    const minY = Math.min(...detectedChildren.map(c => c.y));
    const maxX = Math.max(...detectedChildren.map(c => c.x + c.width));
    const maxY = Math.max(...detectedChildren.map(c => c.y + c.height));

    const newX = Math.max(0, Math.round(minX - padding));
    const newY = Math.max(0, Math.round(minY - padding));
    const newWidth = Math.max(40, Math.round((maxX - minX) + padding * 2));
    const newHeight = Math.max(25, Math.round((maxY - minY) + padding * 2));

    onChangeElement({
      ...element,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });

    setFitFeedback(`✓ Ajustado a ${newWidth}×${newHeight}px (${detectedChildren.length} hijos)`);
    setTimeout(() => setFitFeedback(null), 3000);
  };

  // Available tables in active DB
  const availableTables = dbInfo?.tables || [];
  const selectedTableInfo = availableTables.find(t => t.name === element?.binding.tableName);
  const currentTableRecords = (element?.binding.tableName && dbRecords[element.binding.tableName]) || [];

  // Dynamic fields from tableInfo, records, and schema
  const tableFields = useMemo(() => {
    if (!element?.binding.tableName) return [];
    const fieldsSet = new Set<string>();
    if (selectedTableInfo?.fields && Array.isArray(selectedTableInfo.fields)) {
      selectedTableInfo.fields.forEach(f => f && fieldsSet.add(f));
    }
    if (selectedTableInfo?.sampleRecord && typeof selectedTableInfo.sampleRecord === 'object') {
      Object.keys(selectedTableInfo.sampleRecord).forEach(f => f && fieldsSet.add(f));
    }
    if (currentTableRecords && currentTableRecords.length > 0) {
      currentTableRecords.forEach(rec => {
        if (rec && typeof rec === 'object') {
          Object.keys(rec).forEach(f => f && fieldsSet.add(f));
        }
      });
    }
    if (selectedTableInfo?.schema) {
      selectedTableInfo.schema
        .split(',')
        .map(s => s.trim().replace(/^&|\*|\+\+/, ''))
        .filter(Boolean)
        .forEach(f => fieldsSet.add(f));
    }
    return Array.from(fieldsSet);
  }, [element?.binding.tableName, selectedTableInfo, currentTableRecords]);

  // Hook for automatic refresh of form schema and fields synchronization
  const {
    availableFields: formAvailableFields,
    selectedFields: formSelectedFields,
    selectAllFields: selectAllFormFields,
    deselectAllFields: deselectAllFormFields,
    toggleField: toggleFormField,
    refreshFields: refreshFormFields
  } = useFormSchemaRefresh({
    element,
    dbInfo,
    dbRecords,
    onChangeElement
  });

  // Live evaluation preview
  const liveEvaluated = useMemo(() => {
    if (!element) return '';
    if (element.type === 'kpi') {
      const agg = calculateAggregation(currentTableRecords, element.binding.field, element.binding.aggregation);
      return `${element.binding.prefix || ''}${agg.formatted}${element.binding.suffix || ''}`;
    }
    if (element.type === 'table') {
      const cols = element.binding.columns || [];
      return `${currentTableRecords.length} filas en '${element.binding.tableName || 'tabla'}', ${cols.length} cols visibles: ${cols.join(', ')}`;
    }
    if (element.binding.template) {
      return evaluateTemplate(element.binding.template, currentTableRecords[0]);
    }
    return '';
  }, [element, currentTableRecords]);

  // Distinct series values calculation for Series multi-chart preview
  const distinctSeriesPreview = useMemo(() => {
    if (!element?.binding?.seriesField || !currentTableRecords || currentTableRecords.length === 0) {
      return [];
    }
    const counts = new Map<string, number>();
    currentTableRecords.forEach(r => {
      const v = r[element.binding.seriesField!];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const strVal = String(v).trim();
        counts.set(strVal, (counts.get(strVal) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([val, count]) => ({ val, count }));
  }, [element?.binding?.seriesField, currentTableRecords]);

  // Synchronize drilldown element hierarchy levels strictly to existing table fields
  useEffect(() => {
    if (element?.type === 'drilldown' && element.binding.tableName && tableFields.length > 0) {
      const currentLevels = element.binding.drillLevels;
      // Check if currentLevels contains non-existent fields (like phantom categoria/nombre)
      const hasInvalidFields = currentLevels && currentLevels.some(f => !tableFields.includes(f));
      const isMissing = currentLevels === undefined;

      if (isMissing || hasInvalidFields) {
        const sanitized = sanitizeDrillLevels(currentLevels, tableFields);
        onChangeElement({
          ...element,
          binding: {
            ...element.binding,
            drillLevels: sanitized,
            valueField: element.binding.valueField && tableFields.includes(element.binding.valueField)
              ? element.binding.valueField
              : getDefaultDrillMetricField(tableFields)
          }
        });
      }
    }

    // Synchronize detailCard columns strictly to existing table fields
    if (element?.type === 'detailCard' && element.binding.tableName && tableFields.length > 0) {
      const currentCols = element.binding.columns;
      if (currentCols && currentCols.length > 0) {
        const validCols = currentCols.filter(c => tableFields.includes(c));
        if (validCols.length !== currentCols.length) {
          // Purge phantom fields not belonging to the bound table
          onChangeElement({
            ...element,
            binding: {
              ...element.binding,
              columns: validCols
            }
          });
        }
      }
    }
  }, [element?.id, element?.type, element?.binding.tableName, tableFields]);

  if (!element) {
    return (
      <div className="w-full h-full bg-[#202225] p-6 flex flex-col items-center justify-center text-center text-[#9ca3af] select-none">
        <div className="w-12 h-12 rounded-full bg-[#1a1b1e] border border-[#2f3136] flex items-center justify-center mb-3 text-[#5865f2]">
          <Sliders className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-white mb-1">Sin Elemento Seleccionado</h4>
        <p className="text-xs text-[#9ca3af] max-w-[200px]">
          Haz clic en cualquier elemento del lienzo para inspeccionar y editar sus propiedades agrupadas.
        </p>
      </div>
    );
  }

  // Helper updaters
  const updateStyle = (key: keyof CanvasElement['style'], value: any) => {
    onChangeElement({
      ...element,
      style: {
        ...element.style,
        [key]: value
      }
    });
  };

  const updateBinding = (key: keyof CanvasElement['binding'], value: any) => {
    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        [key]: value
      }
    });
  };

  const updateMultipleBindings = (updates: Partial<CanvasElement['binding']>) => {
    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        ...updates
      }
    });
  };

  const handleTableChange = (newTable: string) => {
    const newFields = availableTables.find(t => t.name === newTable)?.fields || [];
    const nextBinding: CanvasElement['binding'] = {
      ...element.binding,
      tableName: newTable
    };

    if (element.type === 'table') {
      if (newFields.length > 0) {
        nextBinding.columns = newFields.slice(0, 4);
      } else {
        nextBinding.columns = [];
      }
    } else if (element.type === 'form') {
      // In form, keep any already-selected columns that exist in the new table, or leave empty if none
      const validCols = (element.binding.columns || []).filter(c => newFields.includes(c));
      nextBinding.columns = validCols;
    } else if (element.type === 'chart') {
      if (element.binding.chartType === 'series') {
        const timeFieldMatch = newFields.find(f => ['fecha', 'date', 'time', 'timestamp', 'created', 'dia', 'mes', 'year', 'anio'].some(k => f.toLowerCase().includes(k)));
        const valFieldMatch = newFields.find(f => ['total', 'precio', 'salario', 'monto', 'cantidad', 'valor', 'score', 'ventas', 'amount'].some(k => f.toLowerCase().includes(k)));
        const seriesFieldMatch = newFields.find(f => f !== timeFieldMatch && f !== valFieldMatch && ['metodo', 'estado', 'categoria', 'tipo', 'departamento', 'canal', 'sucursal'].some(k => f.toLowerCase().includes(k)));

        nextBinding.timeField = timeFieldMatch || newFields[0] || '';
        nextBinding.labelField = nextBinding.timeField;
        nextBinding.valueField = valFieldMatch || (newFields.length > 1 ? newFields[1] : '');
        nextBinding.seriesField = seriesFieldMatch || (newFields.length > 2 ? newFields[2] : '');
      } else {
        if (newFields.length >= 2) {
          nextBinding.labelField = newFields[0];
          nextBinding.valueField = newFields[1];
        } else if (newFields.length === 1) {
          nextBinding.labelField = newFields[0];
          nextBinding.valueField = '';
        } else {
          nextBinding.labelField = '';
          nextBinding.valueField = '';
        }
      }
    } else if (element.type === 'kpi') {
      if (newFields.length > 0 && (!nextBinding.field || !newFields.includes(nextBinding.field))) {
        const numField = newFields.find(f => ['precio', 'total', 'saldo', 'stock', 'cantidad', 'monto', 'valor', 'amount', 'price', 'id'].some(k => f.toLowerCase().includes(k)));
        nextBinding.field = numField || newFields[0];
      }
    } else if (element.type === 'filter') {
      if (newFields.length > 0 && (!nextBinding.field || !newFields.includes(nextBinding.field))) {
        const catField = newFields.find(f => ['categoria', 'tipo', 'estado', 'ciudad', 'pais', 'departamento', 'marca', 'status', 'category', 'name', 'nombre'].some(k => f.toLowerCase().includes(k)));
        nextBinding.field = catField || newFields[0];
      }
    } else if (element.type === 'cards') {
      if (newFields.length > 0) {
        if (!nextBinding.headerField || !newFields.includes(nextBinding.headerField)) {
          nextBinding.headerField = newFields[0];
        }
        nextBinding.columns = newFields.slice(1, 4);
      }
    } else if (element.type === 'matrix') {
      if (newFields.length >= 2) {
        nextBinding.rowField = newFields[0];
        nextBinding.colField = newFields[1];
        if (newFields.length >= 3) {
          nextBinding.valueField = newFields[2];
        }
      }
    } else if (element.type === 'drilldown') {
      if (newFields.length > 0) {
        nextBinding.drillLevels = sanitizeDrillLevels(element.binding.drillLevels, newFields);
        if (nextBinding.valueField && !newFields.includes(nextBinding.valueField)) {
          nextBinding.valueField = getDefaultDrillMetricField(newFields);
        }
      } else {
        nextBinding.drillLevels = [];
        nextBinding.valueField = '';
      }
    } else if (element.type === 'detailCard') {
      const validCols = (element.binding.columns || []).filter(c => newFields.includes(c));
      nextBinding.columns = validCols;
      if (nextBinding.headerField && !newFields.includes(nextBinding.headerField)) {
        nextBinding.headerField = newFields[0] || '';
      }
      if (nextBinding.subHeaderField && !newFields.includes(nextBinding.subHeaderField)) {
        nextBinding.subHeaderField = newFields[1] || '';
      }
    }

    onChangeElement({
      ...element,
      binding: nextBinding
    });
  };

  const handleTypeChange = (newType: ControlType) => {
    const updatedBinding = { ...element.binding };
    const updatedStyle = { ...element.style };

    if (newType === 'table') {
      if (!updatedBinding.columns || updatedBinding.columns.length === 0) {
        updatedBinding.columns = tableFields.length > 0 ? tableFields.slice(0, 4) : ['id', 'nombre', 'categoria'];
      }
      if (!updatedBinding.limit) updatedBinding.limit = 6;
    } else if (newType === 'chart') {
      if (!updatedBinding.chartType) updatedBinding.chartType = 'bar';
      if (!updatedBinding.labelField && tableFields.length > 0) updatedBinding.labelField = tableFields[0];
      if (!updatedBinding.valueField && tableFields.length > 1) updatedBinding.valueField = tableFields[1];
    } else if (newType === 'kpi') {
      if (!updatedBinding.aggregation) updatedBinding.aggregation = 'count';
      if (!updatedBinding.template) updatedBinding.template = 'Métrica Total';
    } else if (newType === 'drilldown') {
      updatedBinding.drillLevels = sanitizeDrillLevels(updatedBinding.drillLevels, tableFields);
      if (!updatedBinding.valueField || !tableFields.includes(updatedBinding.valueField)) {
        updatedBinding.valueField = getDefaultDrillMetricField(tableFields);
      }
      if (!updatedBinding.aggregation) updatedBinding.aggregation = 'sum';
      if (!updatedBinding.template) updatedBinding.template = 'Desglose Jerárquico';
    } else if (newType === 'minibrowser') {
      if (!updatedBinding.browserUrl) updatedBinding.browserUrl = 'db://diseño-actual';
      if (!updatedBinding.browserSourceType) updatedBinding.browserSourceType = 'saved_design';
    } else if (newType === 'queryTable') {
      if (!updatedBinding.querySql) {
        updatedBinding.querySql = 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50';
      }
      if (!updatedBinding.queryParams || updatedBinding.queryParams.length === 0) {
        updatedBinding.queryParams = [
          { name: 'minTotal', type: 'number', label: 'Total Mínimo', defaultValue: 50, currentValue: 50 }
        ];
      }
    } else if (newType === 'detailCard') {
      if (tableFields.length > 0) {
        if (!updatedBinding.headerField || !tableFields.includes(updatedBinding.headerField)) {
          updatedBinding.headerField = tableFields[0];
        }
        if (!updatedBinding.subHeaderField || !tableFields.includes(updatedBinding.subHeaderField)) {
          updatedBinding.subHeaderField = tableFields[1] || '';
        }
        const validCols = (updatedBinding.columns || []).filter(c => tableFields.includes(c));
        if (validCols.length > 0) {
          updatedBinding.columns = validCols;
        } else {
          const pool = tableFields.filter(f => f !== updatedBinding.headerField && f !== updatedBinding.subHeaderField);
          const shuffled = [...(pool.length > 0 ? pool : tableFields)].sort(() => 0.5 - Math.random());
          updatedBinding.columns = shuffled.slice(0, Math.min(shuffled.length, 3));
        }
      } else {
        updatedBinding.headerField = '';
        updatedBinding.subHeaderField = '';
        updatedBinding.columns = [];
      }
    }

    onChangeElement({
      ...element,
      type: newType,
      binding: updatedBinding,
      style: updatedStyle
    });
  };

  const filteredFields = tableFields.filter(f => 
    f.toLowerCase().includes(columnSearch.toLowerCase())
  );

  const selectedColumns = element.binding.columns || [];

  const handleToggleColumn = (field: string) => {
    const current = element.binding.columns || [];
    if (current.includes(field)) {
      updateBinding('columns', current.filter(c => c !== field));
    } else {
      updateBinding('columns', [...current, field]);
    }
  };

  const handleSelectAllColumns = () => {
    updateBinding('columns', [...tableFields]);
  };

  const handleDeselectAllColumns = () => {
    updateBinding('columns', []);
  };

  const handleAddCustomColumn = () => {
    if (!customColumnInput.trim()) return;
    const clean = customColumnInput.trim();
    const current = element.binding.columns || [];
    if (!current.includes(clean)) {
      updateBinding('columns', [...current, clean]);
    }
    setCustomColumnInput('');
  };

  const CurrentTypeIcon = CONTROL_TYPE_INFO[element.type]?.icon || Type;

  const showBinding = filterCategory === 'all' || filterCategory === 'binding';
  const showTypography = filterCategory === 'all' || filterCategory === 'typography' || filterCategory === 'styling';
  const showStyling = filterCategory === 'all' || filterCategory === 'styling';
  const showPosition = filterCategory === 'all' || filterCategory === 'position';

  return (
    <div className="w-full bg-[#202225] flex flex-col h-full select-none text-[#e1e1e6]">
      {/* Header with Element Name, Type Selector & Quick Controls */}
      <div className="p-3 border-b border-[#2f3136] bg-[#202225] space-y-2.5">
        {/* Name and Visibility/Lock toggles */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={element.name}
            onChange={(e) => onChangeElement({ ...element, name: e.target.value })}
            className="text-xs font-bold text-white bg-[#1a1b1e] px-2.5 py-1.5 border border-[#2f3136] rounded-md focus:outline-none focus:border-[#5865f2] flex-1 truncate"
            title="Nombre del elemento"
          />
          <div className="flex items-center gap-1 bg-[#1a1b1e] p-0.5 rounded-md border border-[#2f3136]">
            {(element.type === 'table' || element.type === 'chart') && (
              <button
                type="button"
                onClick={() => setIsDataPreviewOpen(true)}
                title={
                  element.binding.tableName
                    ? `Vista previa de datos crudos: "${element.binding.tableName}"`
                    : 'Vista previa de datos (sin tabla vinculada)'
                }
                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition cursor-pointer"
              >
                <TableProperties className="w-3.5 h-3.5 text-blue-400" />
              </button>
            )}
            <button
              onClick={() => onChangeElement({ ...element, visible: !element.visible })}
              title={element.visible ? 'Ocultar elemento' : 'Mostrar elemento'}
              className="p-1.5 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition"
            >
              {element.visible ? <Eye className="w-3.5 h-3.5 text-[#5865f2]" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <button
              onClick={() => onChangeElement({ ...element, locked: !element.locked })}
              title={element.locked ? 'Desbloquear posición' : 'Bloquear posición'}
              className="p-1.5 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition"
            >
              {element.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Type Selector Dropdown */}
        <div className="flex items-center gap-2 bg-[#1a1b1e] p-1.5 rounded-md border border-[#2f3136]">
          <div className="p-1.5 rounded bg-[#25282c] text-[#5865f2] border border-[#2f3136] flex-shrink-0">
            <CurrentTypeIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[#9ca3af] uppercase font-bold leading-none mb-0.5">Tipo de Control</div>
            <select
              value={element.type}
              onChange={(e) => handleTypeChange(e.target.value as ControlType)}
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {Object.entries(CONTROL_TYPE_INFO).map(([key, info]) => (
                <option key={`ctrl_type_${key}`} value={key} className="bg-[#1a1b1e] text-white">
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Color Tag Selector Bar */}
        <div className="bg-[#1a1b1e] p-2 rounded-md border border-[#2f3136] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#5865f2]" />
              <span>Etiqueta de Color (Tag)</span>
            </div>
            {element.colorTag && (
              <button
                type="button"
                onClick={() => onChangeElement({ ...element, colorTag: undefined })}
                className="text-[9px] text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer"
              >
                Quitar
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-1 pt-0.5">
            {COLOR_TAG_PRESETS.map((preset) => {
              const isSelected = element.colorTag === preset.hex;
              return (
                <button
                  key={`insp_color_tag_${preset.id}`}
                  type="button"
                  onClick={() => onChangeElement({
                    ...element,
                    colorTag: isSelected ? undefined : preset.hex
                  })}
                  title={`${preset.name}${isSelected ? ' (Seleccionada - clic para quitar)' : ''}`}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center border ${
                    isSelected
                      ? 'scale-115 border-white ring-2 ring-white/40 shadow-xs'
                      : 'border-white/20 hover:scale-110 hover:border-white/60'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy & Paste Style Quick Bar */}
        {(onCopyStyle || onPasteStyle) && (
          <div className="flex items-center gap-1.5 bg-[#1a1b1e] p-1.5 rounded-md border border-[#2f3136]">
            <button
              type="button"
              onClick={() => {
                if (onCopyStyle) {
                  onCopyStyle(element.id);
                  setCopiedFeedback(true);
                  setTimeout(() => setCopiedFeedback(false), 2000);
                }
              }}
              title="Copiar propiedades visuales (fondo, borde, tipografía)"
              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-semibold bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] hover:text-white rounded border border-[#373a40] transition cursor-pointer"
            >
              {copiedFeedback ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Paintbrush className="w-3 h-3 text-pink-400" />
                  <span>Copiar Estilo</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!hasCopiedStyle}
              onClick={() => {
                if (onPasteStyle && hasCopiedStyle) {
                  onPasteStyle(element.id);
                }
              }}
              title={hasCopiedStyle ? "Pegar estilo copiado a este elemento" : "Primero copia un estilo para pegar"}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-semibold rounded border transition ${
                hasCopiedStyle
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 cursor-pointer shadow-xs'
                  : 'bg-[#25282c]/40 text-[#6b7280] border-[#373a40]/40 opacity-50 cursor-not-allowed'
              }`}
            >
              <Palette className={`w-3 h-3 ${hasCopiedStyle ? 'text-emerald-400' : 'text-[#6b7280]'}`} />
              <span>Pegar Estilo</span>
            </button>
          </div>
        )}

        {/* Filter Category Tabs & Global Expand/Collapse */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex bg-[#1a1b1e] p-0.5 rounded-lg text-xs font-medium border border-[#2f3136] flex-1 overflow-x-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                filterCategory === 'all' ? 'bg-[#5865f2] text-white shadow-xs' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Mostrar todas las categorías"
            >
              Todas
            </button>
            <button
              onClick={() => setFilterCategory('binding')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                filterCategory === 'binding' ? 'bg-[#5865f2] text-white shadow-xs' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Categoría: Datos"
            >
              <Database className="w-3 h-3" />
              <span>Datos</span>
            </button>
            <button
              onClick={() => setFilterCategory('styling')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                filterCategory === 'styling' ? 'bg-[#5865f2] text-white shadow-xs' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Categoría: Estilo y Apariencia"
            >
              <Palette className="w-3 h-3" />
              <span>Estilo</span>
            </button>
            <button
              onClick={() => setFilterCategory('position')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                filterCategory === 'position' ? 'bg-[#5865f2] text-white shadow-xs' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Categoría: Posición y Disposición"
            >
              <Layout className="w-3 h-3" />
              <span>Posición</span>
            </button>
            <button
              onClick={() => setFilterCategory('dependencies')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                filterCategory === 'dependencies' ? 'bg-[#06b6d4] text-white shadow-xs' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Categoría: Dependencias de Filtros Globales"
            >
              <Network className="w-3 h-3" />
              <span>Dependencias</span>
            </button>
          </div>

          <div className="flex items-center gap-0.5 bg-[#1a1b1e] p-0.5 rounded-lg border border-[#2f3136]">
            <button
              onClick={expandAllSections}
              className="p-1 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition"
              title="Expandir todas las secciones"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={collapseAllSections}
              className="p-1 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition"
              title="Colapsar todas las secciones"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* If category is 'dependencies', show the DependenciesPanel directly */}
      {filterCategory === 'dependencies' ? (
        <div className="flex-1 overflow-hidden">
          <DependenciesPanel
            selectedElement={element}
            allDocumentElements={allDocumentElements || (allElements || []).map(el => ({
              element: el,
              pageId: pages?.[activePageIndex || 0]?.id || `page_${activePageIndex || 0}`,
              pageName: pages?.[activePageIndex || 0]?.name || `Página ${(activePageIndex || 0) + 1}`,
              pageIndex: activePageIndex || 0,
              isCurrentPage: true
            }))}
            pages={pages}
            activePageIndex={activePageIndex}
            onUpdateElement={onChangeElement}
            onSelectElement={(id, pIdx) => {
              if (onSwitchPage && typeof pIdx === 'number') {
                onSwitchPage(pIdx);
              }
              onSelectElementById?.(id, pIdx);
            }}
            onSwitchPage={onSwitchPage}
            dbInfo={dbInfo}
          />
        </div>
      ) : (
        /* Main Collapsible Sections List */
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">

        {/* ======================================================== */}
        {/* GROUP 0: CONTAINER / GROUP MANAGEMENT                   */}
        {/* ======================================================== */}
        {(element.isGroup || element.groupId) && (
          <CollapsibleSection
            id="group_management"
            title={element.isGroup ? "Contenedor de Grupo" : "Elemento en Grupo"}
            icon={Package}
            accentColor="#6366f1"
            badge={element.isGroup ? `${element.childrenIds?.length || 0} elementos` : 'Agrupado'}
            isOpen={!!openSections['group_management']}
            onToggle={() => toggleSection('group_management')}
          >
            <div className="space-y-3">
              {element.isGroup ? (
                <>
                  <div className="text-[11px] text-[#9ca3af] leading-relaxed">
                    Este elemento es un contenedor que agrupa y sincroniza la posición y tamaño de los siguientes elementos del lienzo:
                  </div>

                  {/* List of bundled children */}
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {(element.childrenIds || []).map((childId, idx) => {
                      const childEl = allElements.find(el => el.id === childId);
                      return (
                        <div
                          key={`grp_child_${childId}_${idx}`}
                          onClick={() => onSelectElementById && onSelectElementById(childId)}
                          className="p-1.5 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] rounded flex items-center justify-between cursor-pointer transition text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono text-indigo-400 font-bold">#{idx + 1}</span>
                            <span className="text-white font-medium truncate">{childEl?.name || childId}</span>
                          </div>
                          <span className="text-[10px] text-[#9ca3af] uppercase font-mono">{childEl?.type || 'elem'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ungroup Action Button */}
                  {onUngroupElement && (
                    <button
                      type="button"
                      onClick={() => onUngroupElement(element.id)}
                      className="w-full py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-md font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <PackageOpen className="w-4 h-4" />
                      <span>Desagrupar Contenedor (Ctrl+Shift+G)</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#9ca3af]">
                    Este elemento forma parte de un grupo contenedor.
                  </div>
                  {onUngroupElement && element.groupId && (
                    <button
                      type="button"
                      onClick={() => onUngroupElement(element.groupId!)}
                      className="w-full py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-md font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PackageOpen className="w-4 h-4" />
                      <span>Desagrupar Contenedor Padre</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* ======================================================== */}
        {/* GROUP 1: DATA BINDING (ENLACE DE DATOS)                  */}
        {/* ======================================================== */}
        {showBinding && (
          <>
            {/* 1.1 Data Source / Table */}
            <CollapsibleSection
              id="binding_source"
              title="Fuente de Datos"
              icon={Database}
              accentColor="#5865f2"
              badge={element.binding.tableName ? `${element.binding.tableName}` : 'Sin tabla'}
              isOpen={!!openSections['binding_source']}
              onToggle={() => toggleSection('binding_source')}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
                      Tabla de IndexedDB
                    </label>
                    {(element.type === 'table' || element.type === 'chart') && (
                      <button
                        type="button"
                        onClick={() => setIsDataPreviewOpen(true)}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                          element.binding.tableName
                            ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 border border-blue-500/30'
                            : 'bg-[#25282c] text-[#6b7280] border border-[#373a40] opacity-60'
                        }`}
                        title={
                          element.binding.tableName
                            ? `Ver muestra de datos crudos de "${element.binding.tableName}"`
                            : 'Vista previa de datos (sin tabla vinculada)'
                        }
                      >
                        <TableProperties className="w-3 h-3 text-blue-400" />
                        <span>Vista previa</span>
                      </button>
                    )}
                  </div>
                  {selectedTableInfo && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1b1e] text-[#5865f2] rounded border border-[#373a40] font-mono">
                      {selectedTableInfo.recordCount} registros
                    </span>
                  )}
                </div>
                <select
                  value={element.binding.tableName || ''}
                  onChange={(e) => handleTableChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#5865f2] font-semibold text-white cursor-pointer"
                >
                  <option value="">-- Sin enlazar a tabla --</option>
                  {availableTables.map((t, tIdx) => (
                    <option key={`inspector_tbl_${t.name}_${tIdx}`} value={t.name}>
                      {t.name} ({t.recordCount} registros • {t.fields.length} campos)
                    </option>
                  ))}
                </select>
              </div>
            </CollapsibleSection>

            {/* 1.2 Control Specific Data Settings */}
            {element.type === 'table' && (
              <CollapsibleSection
                id="binding_control"
                title="Columnas de la Tabla"
                icon={TableIcon}
                accentColor="#3b82f6"
                badge={`${selectedColumns.length} visibles`}
                isOpen={!!openSections['binding_control']}
                onToggle={() => toggleSection('binding_control')}
              >
                <div className="space-y-3">
                  {/* Selected Columns Strip Header with Quick Data Preview Button */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-[#9ca3af] font-medium">
                      {selectedColumns.length > 0 ? 'Orden de columnas:' : 'Columnas configuradas:'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDataPreviewOpen(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
                      title="Ver muestra de datos crudos de la tabla vinculada"
                    >
                      <TableProperties className="w-3 h-3" />
                      <span>Ver datos</span>
                    </button>
                  </div>
                  {/* Selected Columns Strip */}
                  {selectedColumns.length > 0 ? (
                    <div>
                      <div className="flex flex-wrap gap-1 p-2 bg-[#1a1b1e] rounded-md border border-[#2f3136] max-h-24 overflow-y-auto">
                        {selectedColumns.map((col, cIdx) => (
                          <span
                            key={`sel_col_${col}_${cIdx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#25282c] text-[#e1e1e6] border border-[#373a40] rounded text-[11px] font-mono group"
                          >
                            <span className="text-[9px] text-[#5865f2] font-bold">#{cIdx + 1}</span>
                            <span className="text-white font-medium">{col}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleColumn(col)}
                              className="text-[#9ca3af] hover:text-rose-400 ml-0.5"
                              title={`Quitar columna ${col}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-[#1a1b1e] rounded-md border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Selecciona al menos una columna para mostrar en la tabla.</span>
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2f3136]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllColumns}
                        className="px-2 py-1 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] hover:border-[#5865f2] rounded text-[10px] font-semibold text-[#5865f2] transition flex items-center gap-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>Todas</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllColumns}
                        className="px-2 py-1 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] hover:border-rose-400 rounded text-[10px] font-semibold text-[#9ca3af] hover:text-rose-300 transition flex items-center gap-1"
                      >
                        <SquareDashed className="w-3 h-3" />
                        <span>Ninguna</span>
                      </button>
                    </div>

                    {tableFields.length > 4 && (
                      <div className="relative flex-1 max-w-[120px]">
                        <Search className="w-3 h-3 absolute left-1.5 top-2 text-[#9ca3af]" />
                        <input
                          type="text"
                          placeholder="Buscar..."
                          value={columnSearch}
                          onChange={(e) => setColumnSearch(e.target.value)}
                          className="w-full pl-5 pr-1.5 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-[10px] text-white focus:outline-none focus:border-[#5865f2]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Available Fields Checkbox List */}
                  <div className="space-y-1 max-h-36 overflow-y-auto p-2 bg-[#1a1b1e] rounded-md border border-[#2f3136]">
                    {filteredFields.length > 0 ? (
                      filteredFields.map((f, fIdx) => {
                        const isChecked = selectedColumns.includes(f);
                        return (
                          <label
                            key={`fld_chk_${f}_${fIdx}`}
                            className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                              isChecked ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleColumn(f)}
                                className="rounded border-[#2f3136] text-[#5865f2] focus:ring-[#5865f2] bg-[#141517] w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="font-mono text-xs font-medium">{f}</span>
                            </div>
                            {isChecked && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#5865f2]/20 text-[#5865f2] rounded font-semibold">
                                Visible
                              </span>
                            )}
                          </label>
                        );
                      })
                    ) : (
                      <div className="p-2 text-center text-[#9ca3af] text-[11px] italic">
                        {tableFields.length === 0 ? 'Sin campos en la tabla seleccionada' : 'No hay campos con esa búsqueda'}
                      </div>
                    )}
                  </div>

                  {/* Add Custom Column field */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Añadir columna manual..."
                      value={customColumnInput}
                      onChange={(e) => setCustomColumnInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomColumn()}
                      className="flex-1 px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-white placeholder-[#6b7280]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomColumn}
                      className="px-2.5 py-1 bg-[#25282c] hover:bg-[#5865f2] border border-[#373a40] hover:border-[#5865f2] text-white rounded text-xs font-semibold transition"
                    >
                      + Añadir
                    </button>
                  </div>

                  {/* Rows Limit vs Pagination Navigation Control */}
                  <div className="pt-3 border-t border-[#2f3136] space-y-3">
                    <div>
                      <label className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider block mb-1.5">
                        Modo de Visualización de Filas
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1a1b1e] rounded-lg border border-[#2f3136]">
                        {/* Mode 1: Fixed Limit */}
                        <button
                          type="button"
                          onClick={() => updateBinding('paginationMode', 'limit')}
                          className={`flex flex-col items-center justify-center p-2 rounded-md transition text-center cursor-pointer ${
                            (element.binding.paginationMode || 'limit') === 'limit'
                              ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                              : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
                          }`}
                        >
                          <ListFilter className="w-4 h-4 mb-1" />
                          <span className="text-[11px] font-bold">Límite Fijo</span>
                          <span className="text-[9px] opacity-80">N filas estáticas</span>
                        </button>

                        {/* Mode 2: Paginated Navigation Control */}
                        <button
                          type="button"
                          onClick={() => {
                            const updates: Record<string, any> = {
                              paginationMode: 'paginated'
                            };
                            if (!element.binding.pageSize) updates.pageSize = 5;
                            if (element.binding.showPaginationControls === undefined) updates.showPaginationControls = true;
                            if (!element.binding.paginationStyle) updates.paginationStyle = 'full';
                            
                            onChangeElement({
                              ...element,
                              binding: {
                                ...element.binding,
                                ...updates
                              }
                            });
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-md transition text-center cursor-pointer ${
                            element.binding.paginationMode === 'paginated'
                              ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                              : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
                          }`}
                        >
                          <Layers className="w-4 h-4 mb-1" />
                          <span className="text-[11px] font-bold">Paginación</span>
                          <span className="text-[9px] opacity-80">Control con páginas</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode-Specific Settings */}
                    {(element.binding.paginationMode || 'limit') === 'limit' ? (
                      /* FIXED ROW LIMIT CONFIGURATION */
                      <div className="p-2.5 bg-[#1a1b1e] rounded-md border border-[#2f3136] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-[#9ca3af] font-semibold uppercase flex items-center gap-1">
                            <ListFilter className="w-3 h-3 text-[#5865f2]" />
                            <span>Límite de filas visibles</span>
                          </label>
                          <span className="text-[10px] font-mono text-[#5865f2] font-bold bg-[#5865f2]/10 px-1.5 py-0.5 rounded border border-[#5865f2]/20">
                            {element.binding.limit || 6} filas
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1">
                          {[3, 5, 8, 10, 15, 20].map((num) => (
                            <button
                              key={`limit_btn_${num}`}
                              type="button"
                              onClick={() => updateBinding('limit', num)}
                              className={`flex-1 py-1 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                                (element.binding.limit || 6) === num
                                  ? 'bg-[#5865f2] text-white'
                                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>

                        {/* Slider and Input */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="range"
                            min={1}
                            max={50}
                            value={element.binding.limit || 6}
                            onChange={(e) => updateBinding('limit', parseInt(e.target.value) || 6)}
                            className="flex-1 accent-[#5865f2] cursor-pointer"
                          />
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={element.binding.limit || 6}
                            onChange={(e) => updateBinding('limit', parseInt(e.target.value) || 6)}
                            className="w-14 px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-center font-mono text-white focus:outline-none focus:border-[#5865f2]"
                          />
                        </div>

                        {selectedTableInfo && (
                          <div className="text-[10px] text-[#9ca3af] flex items-center justify-between pt-1 border-t border-[#25282c]">
                            <span>Registros en tabla:</span>
                            <span className="font-mono font-semibold text-white">{selectedTableInfo.recordCount}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* PAGINATED NAVIGATION CONFIGURATION */
                      <div className="p-2.5 bg-[#1a1b1e] rounded-md border border-[#2f3136] space-y-3">
                        {/* Records per page */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] text-[#9ca3af] font-semibold uppercase flex items-center gap-1">
                              <SlidersHorizontal className="w-3 h-3 text-[#5865f2]" />
                              <span>Registros por página</span>
                            </label>
                            <span className="text-[10px] font-mono text-[#5865f2] font-bold bg-[#5865f2]/10 px-1.5 py-0.5 rounded border border-[#5865f2]/20">
                              {element.binding.pageSize || 5} / pág.
                            </span>
                          </div>

                          {/* Quick Presets */}
                          <div className="flex items-center gap-1 mb-2">
                            {[3, 5, 8, 10, 15, 20].map((size) => (
                              <button
                                key={`pgsize_btn_${size}`}
                                type="button"
                                onClick={() => updateBinding('pageSize', size)}
                                className={`flex-1 py-1 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                                  (element.binding.pageSize || 5) === size
                                    ? 'bg-[#5865f2] text-white'
                                    : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>

                          {/* Slider & Number */}
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={1}
                              max={30}
                              value={element.binding.pageSize || 5}
                              onChange={(e) => updateBinding('pageSize', parseInt(e.target.value) || 5)}
                              className="flex-1 accent-[#5865f2] cursor-pointer"
                            />
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={element.binding.pageSize || 5}
                              onChange={(e) => updateBinding('pageSize', parseInt(e.target.value) || 5)}
                              className="w-14 px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-center font-mono text-white focus:outline-none focus:border-[#5865f2]"
                            />
                          </div>
                        </div>

                        {/* Navigation Style Variant */}
                        <div>
                          <label className="text-[10px] text-[#9ca3af] font-semibold uppercase block mb-1">
                            Estilo de Navegación
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { key: 'full', label: 'Completo', desc: '« ‹ 1/N › »' },
                              { key: 'compact', label: 'Compacto', desc: '‹ Ant 1/N Sig ›' },
                              { key: 'simple', label: 'Simple', desc: '‹ 1/N ›' }
                            ].map((st) => (
                              <button
                                key={`pg_st_${st.key}`}
                                type="button"
                                onClick={() => updateBinding('paginationStyle', st.key)}
                                className={`py-1.5 px-1 rounded text-center transition cursor-pointer ${
                                  (element.binding.paginationStyle || 'full') === st.key
                                    ? 'bg-[#5865f2] text-white border border-[#5865f2]'
                                    : 'bg-[#25282c] text-[#9ca3af] hover:text-white border border-[#2f3136]'
                                }`}
                              >
                                <div className="text-[10px] font-bold">{st.label}</div>
                                <div className="text-[8px] opacity-75 font-mono truncate">{st.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Toggle Show Footer Controls */}
                        <label className="flex items-center justify-between p-1.5 bg-[#25282c] rounded border border-[#2f3136] cursor-pointer">
                          <span className="text-[10px] text-[#e1e1e6] font-medium">Mostrar barra de navegación</span>
                          <input
                            type="checkbox"
                            checked={element.binding.showPaginationControls !== false}
                            onChange={(e) => updateBinding('showPaginationControls', e.target.checked)}
                            className="rounded border-[#2f3136] text-[#5865f2] focus:ring-[#5865f2] bg-[#141517] w-3.5 h-3.5 cursor-pointer"
                          />
                        </label>

                        {/* Real-time Calculation Summary */}
                        {selectedTableInfo && (
                          <div className="p-2 bg-[#25282c]/80 rounded border border-[#373a40] text-[10px] space-y-1">
                            <div className="flex items-center justify-between text-[#9ca3af]">
                              <span>Total de registros:</span>
                              <span className="font-mono font-bold text-white">{selectedTableInfo.recordCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-[#9ca3af]">
                              <span>Páginas estimadas:</span>
                              <span className="font-mono font-bold text-[#5865f2]">
                                {Math.max(1, Math.ceil(selectedTableInfo.recordCount / (element.binding.pageSize || 5)))} páginas
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Data Transformation Step for Tables */}
            {element.type === 'table' && (
              <DataTransformationInspector
                element={element}
                tableFields={tableFields}
                rawRecords={currentTableRecords}
                onChangeElement={onChangeElement}
                isOpen={openSections['binding_data_transformation'] ?? true}
                onToggle={() => toggleSection('binding_data_transformation')}
              />
            )}

            {/* KPI Calculation Section */}
            {['kpi', 'text', 'card'].includes(element.type) && (
              <CollapsibleSection
                id="binding_control"
                title="Cálculo & Agregación KPI"
                icon={TrendingUp}
                accentColor="#10b981"
                badge={element.binding.aggregation || 'none'}
                isOpen={!!openSections['binding_control']}
                onToggle={() => toggleSection('binding_control')}
              >
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-0.5">Operación</label>
                      <select
                        value={element.binding.aggregation || 'none'}
                        onChange={(e) => updateBinding('aggregation', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6] font-medium"
                      >
                        <option value="none">Sin agregación</option>
                        <option value="count">Conteo (COUNT)</option>
                        <option value="sum">Suma (SUM)</option>
                        <option value="avg">Promedio (AVG)</option>
                        <option value="min">Mínimo (MIN)</option>
                        <option value="max">Máximo (MAX)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-0.5">Campo objetivo</label>
                      <select
                        value={element.binding.field || ''}
                        onChange={(e) => updateBinding('field', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6] font-mono"
                      >
                        <option value="">-- Todos / ID --</option>
                        {tableFields.map((f, fIdx) => (
                          <option key={`agg_opt_${f}_${fIdx}`} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-0.5">Prefijo</label>
                      <input
                        type="text"
                        value={element.binding.prefix || ''}
                        onChange={(e) => updateBinding('prefix', e.target.value)}
                        placeholder="Ej: € "
                        className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-0.5">Sufijo</label>
                      <input
                        type="text"
                        value={element.binding.suffix || ''}
                        onChange={(e) => updateBinding('suffix', e.target.value)}
                        placeholder="Ej: EUR, uds"
                        className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Chart Settings Section */}
            {element.type === 'chart' && (
              <CollapsibleSection
                id="binding_control"
                title={element.binding.chartType === 'series' ? "Configuración de Series" : "Configuración de Gráfico"}
                icon={element.binding.chartType === 'series' ? Spline : BarChart2}
                accentColor={element.binding.chartType === 'series' ? "#6366f1" : "#8b5cf6"}
                badge={element.binding.chartType === 'series' ? 'Series' : (element.binding.chartType || 'bar')}
                isOpen={!!openSections['binding_control']}
                onToggle={() => toggleSection('binding_control')}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[#9ca3af]">Tipo de Gráfico</label>
                    <button
                      type="button"
                      onClick={() => setIsDataPreviewOpen(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
                      title="Ver muestra de datos crudos de la tabla vinculada"
                    >
                      <TableProperties className="w-3 h-3" />
                      <span>Ver datos</span>
                    </button>
                  </div>
                  <div>
                    <select
                      value={element.binding.chartType || 'bar'}
                      onChange={(e) => {
                        const newType = e.target.value;
                        if (newType === 'series') {
                          const timeMatch = tableFields.find(f => ['fecha', 'date', 'time', 'timestamp', 'created', 'dia', 'mes', 'year', 'anio'].some(k => f.toLowerCase().includes(k)));
                          const valMatch = tableFields.find(f => ['total', 'precio', 'salario', 'monto', 'cantidad', 'valor', 'score', 'ventas', 'amount'].some(k => f.toLowerCase().includes(k)));
                          const seriesMatch = tableFields.find(f => f !== timeMatch && f !== valMatch && ['metodo', 'estado', 'categoria', 'tipo', 'departamento', 'canal', 'sucursal'].some(k => f.toLowerCase().includes(k)));

                          onChangeElement({
                            ...element,
                            name: element.name === 'Gráfico' || element.name === 'Gráfico de Barras' || element.name === 'Gráfico de Líneas' ? 'Series' : element.name,
                            binding: {
                              ...element.binding,
                              chartType: 'series',
                              template: element.binding.template || 'Series Temporales',
                              timeField: element.binding.timeField || timeMatch || element.binding.labelField || tableFields[0] || '',
                              labelField: element.binding.timeField || timeMatch || element.binding.labelField || tableFields[0] || '',
                              valueField: element.binding.valueField || valMatch || tableFields[1] || '',
                              seriesField: element.binding.seriesField || seriesMatch || (tableFields.length > 2 ? tableFields[2] : ''),
                              seriesAggregation: element.binding.seriesAggregation || 'sum',
                              showSeriesLegend: element.binding.showSeriesLegend !== false,
                              showSeriesPoints: element.binding.showSeriesPoints !== false,
                              seriesCurve: element.binding.seriesCurve || 'monotone',
                              timeSortOrder: element.binding.timeSortOrder || 'asc',
                              limit: element.binding.limit || 20
                            }
                          });
                        } else {
                          updateBinding('chartType', newType);
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white font-medium"
                    >
                      <option value="bar">Barras (Bar Chart)</option>
                      <option value="pie">Circular (Pie Chart)</option>
                      <option value="line">Líneas / Tendencia</option>
                      <option value="series">Series (Multi-Serie Temporal)</option>
                    </select>
                  </div>

                  {element.binding.chartType === 'series' ? (
                    <div className="space-y-3 pt-1 border-t border-[#2f3136]">
                      {/* Eje X (Tiempo / Fecha) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Eje X (Campo de Tiempo / Fecha)</span>
                          </label>
                          <span className="text-[9px] text-[#9ca3af] font-mono">Temporal</span>
                        </div>
                        <select
                          value={element.binding.timeField || element.binding.labelField || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            onChangeElement({
                              ...element,
                              binding: {
                                ...element.binding,
                                timeField: val,
                                labelField: val
                              }
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-indigo-900/40 rounded text-xs font-mono text-[#e1e1e6] focus:border-indigo-500"
                        >
                          <option value="">-- Automático (Detectar fecha) --</option>
                          {tableFields.map((f, fIdx) => (
                            <option key={`series_x_${f}_${fIdx}`} value={f}>{f}</option>
                          ))}
                        </select>

                        {/* Orden cronológico */}
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[9px] text-[#9ca3af]">Orden eje X:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateBinding('timeSortOrder', 'asc')}
                              className={`px-2 py-0.5 rounded text-[9px] font-medium transition cursor-pointer ${
                                (element.binding.timeSortOrder || 'asc') === 'asc'
                                  ? 'bg-indigo-600 text-white font-semibold'
                                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              Ascendente (Antiguo → Reciente)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateBinding('timeSortOrder', 'desc')}
                              className={`px-2 py-0.5 rounded text-[9px] font-medium transition cursor-pointer ${
                                element.binding.timeSortOrder === 'desc'
                                  ? 'bg-indigo-600 text-white font-semibold'
                                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              Descendente
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Eje Y (Valor / Métrica) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>Eje Y (Campo de Valor / Métrica)</span>
                          </label>
                          <span className="text-[9px] text-[#9ca3af] font-mono">Numérico</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={element.binding.valueField || ''}
                              onChange={(e) => updateBinding('valueField', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-emerald-900/40 rounded text-xs font-mono text-[#e1e1e6] focus:border-emerald-500"
                            >
                              <option value="">-- Automático (Métrica) --</option>
                              {tableFields.map((f, fIdx) => (
                                <option key={`series_y_${f}_${fIdx}`} value={f}>{f}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <select
                              value={element.binding.seriesAggregation || 'sum'}
                              onChange={(e) => updateBinding('seriesAggregation', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                              title="Función de agregación para registros en la misma fecha"
                            >
                              <option value="sum">Suma (SUM)</option>
                              <option value="avg">Promedio (AVG)</option>
                              <option value="count">Recuento (COUNT)</option>
                              <option value="min">Mínimo (MIN)</option>
                              <option value="max">Máximo (MAX)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Campo para dividir en Series por cada valor distinto */}
                      <div className="p-2.5 rounded-lg bg-[#202225] border border-indigo-950/60">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Dividir en Series por Campo</span>
                          </label>
                        </div>
                        <p className="text-[9px] text-[#9ca3af] mb-1.5 leading-relaxed">
                          Se creará una serie por cada valor distinto dentro de los valores existentes en el campo seleccionado.
                        </p>
                        <select
                          value={element.binding.seriesField || ''}
                          onChange={(e) => updateBinding('seriesField', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-amber-900/40 rounded text-xs font-mono text-white focus:border-amber-500"
                        >
                          <option value="">-- Sin división (Serie única total) --</option>
                          {tableFields.map((f, fIdx) => (
                            <option key={`series_split_${f}_${fIdx}`} value={f}>{f}</option>
                          ))}
                        </select>

                        {/* Visor en vivo de valores distintos de series detectadas */}
                        {element.binding.seriesField && (
                          <div className="mt-2 pt-2 border-t border-[#2f3136]/80">
                            <div className="flex items-center justify-between text-[9px] text-[#9ca3af] mb-1.5">
                              <span>Series distintas detectadas:</span>
                              <span className="font-bold text-amber-300">
                                {distinctSeriesPreview.length} {distinctSeriesPreview.length === 1 ? 'serie' : 'series'}
                              </span>
                            </div>
                            {distinctSeriesPreview.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                {distinctSeriesPreview.map((item, idx) => {
                                  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#3b82f6'];
                                  const dotColor = colors[idx % colors.length];
                                  return (
                                    <span
                                      key={`distinct_${item.val}_${idx}`}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-[#1a1b1e] text-[#e1e1e6] border border-[#2f3136]"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                      <span className="font-medium truncate max-w-[85px]">{item.val}</span>
                                      <span className="text-[8px] text-[#9ca3af]">({item.count})</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-[#9ca3af] italic">Sin valores registrados en este campo</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Opciones de presentación de Series */}
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-[#9ca3af] block mb-0.5">Estilo de Curva</label>
                            <select
                              value={element.binding.seriesCurve || 'monotone'}
                              onChange={(e) => updateBinding('seriesCurve', e.target.value)}
                              className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                            >
                              <option value="monotone">Suave (Bézier)</option>
                              <option value="linear">Recta (Líneas)</option>
                              <option value="step">Escalonada (Step)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#9ca3af] block mb-0.5">Máx. Puntos (X)</label>
                            <input
                              type="number"
                              min={3}
                              max={50}
                              value={element.binding.limit || 20}
                              onChange={(e) => updateBinding('limit', parseInt(e.target.value) || 20)}
                              className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <label className="text-[10px] text-[#e1e1e6] flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={element.binding.showSeriesLegend !== false}
                              onChange={(e) => updateBinding('showSeriesLegend', e.target.checked)}
                              className="rounded border-[#2f3136] text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-[#1a1b1e]"
                            />
                            <span>Mostrar Leyenda</span>
                          </label>
                          <label className="text-[10px] text-[#e1e1e6] flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={element.binding.showSeriesPoints !== false}
                              onChange={(e) => updateBinding('showSeriesPoints', e.target.checked)}
                              className="rounded border-[#2f3136] text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-[#1a1b1e]"
                            />
                            <span>Puntos en Líneas</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#9ca3af] block mb-0.5">Eje X / Etiquetas</label>
                          <select
                            value={element.binding.labelField || ''}
                            onChange={(e) => updateBinding('labelField', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                          >
                            <option value="">-- Automático --</option>
                            {tableFields.map((f, fIdx) => (
                              <option key={`ch_lbl_${f}_${fIdx}`} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9ca3af] block mb-0.5">Eje Y / Valores</label>
                          <select
                            value={element.binding.valueField || ''}
                            onChange={(e) => updateBinding('valueField', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                          >
                            <option value="">-- Automático --</option>
                            {tableFields.map((f, fIdx) => (
                              <option key={`ch_val_${f}_${fIdx}`} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5">Máximo elementos</label>
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={element.binding.limit || 5}
                          onChange={(e) => updateBinding('limit', parseInt(e.target.value) || 5)}
                          className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Data Transformation Step for Charts */}
            {element.type === 'chart' && (
              <DataTransformationInspector
                element={element}
                tableFields={tableFields}
                rawRecords={currentTableRecords}
                onChangeElement={onChangeElement}
                isOpen={openSections['binding_data_transformation'] ?? true}
                onToggle={() => toggleSection('binding_data_transformation')}
              />
            )}

            {/* Badge Settings */}
            {element.type === 'badge' && (
              <CollapsibleSection
                id="binding_control"
                title="Variante de Etiqueta"
                icon={Tag}
                accentColor="#f59e0b"
                badge={element.binding.badgeVariant || 'primary'}
                isOpen={!!openSections['binding_control']}
                onToggle={() => toggleSection('binding_control')}
              >
                <div>
                  <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                    Esquema de Color
                  </label>
                  <select
                    value={element.binding.badgeVariant || 'primary'}
                    onChange={(e) => updateBinding('badgeVariant', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs font-medium text-[#e1e1e6]"
                  >
                    <option value="primary">Azul Primario (Primary)</option>
                    <option value="success">Verde Éxito (Success)</option>
                    <option value="warning">Ámbar Advertencia (Warning)</option>
                    <option value="danger">Rojo Alerta (Danger)</option>
                    <option value="neutral">Gris Neutro (Neutral)</option>
                  </select>
                </div>
              </CollapsibleSection>
            )}

            {/* Image Settings */}
            {element.type === 'image' && (
              <CollapsibleSection
                id="binding_control"
                title="Configuración de Imagen"
                icon={ImageIcon}
                accentColor="#ec4899"
                isOpen={!!openSections['binding_control']}
                onToggle={() => toggleSection('binding_control')}
              >
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                      URL de Imagen o Plantilla
                    </label>
                    <input
                      type="text"
                      value={element.binding.imageUrl || ''}
                      onChange={(e) => updateBinding('imageUrl', e.target.value)}
                      placeholder="https://... o {{foto_url}}"
                      className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs font-mono text-[#e1e1e6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                      Ajuste de Imagen (Object Fit)
                    </label>
                    <select
                      value={element.binding.imageFit || 'cover'}
                      onChange={(e) => updateBinding('imageFit', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs font-medium text-[#e1e1e6]"
                    >
                      <option value="cover">Cubrir (Cover)</option>
                      <option value="contain">Contener (Contain)</option>
                      <option value="fill">Rellenar (Fill)</option>
                    </select>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Drill-Down Hierarchical Settings */}
            {element.type === 'drilldown' && (() => {
              const configuredLevels = element.binding.drillLevels;
              const validLevels = (configuredLevels || []).filter(f => tableFields.includes(f));
              const curLevels = configuredLevels !== undefined
                ? validLevels
                : getDefaultDrillLevels(tableFields);

              const numLevels = curLevels.length;

              return (
                <CollapsibleSection
                  id="binding_drilldown"
                  title="Niveles de Jerarquía & Métrica"
                  icon={GitFork}
                  accentColor="#6366f1"
                  badge={`${numLevels} ${numLevels === 1 ? 'nivel' : 'niveles'}`}
                  isOpen={!!openSections['binding_drilldown']}
                  onToggle={() => toggleSection('binding_drilldown')}
                >
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                          Niveles de Desglose Jerárquico
                        </label>
                        {tableFields.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const defaults = getDefaultDrillLevels(tableFields);
                              updateBinding('drillLevels', defaults);
                            }}
                            className="text-[10px] text-[#818cf8] hover:text-[#a5b4fc] transition underline cursor-pointer"
                          >
                            Reestablecer sugeridos
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 max-h-40 overflow-y-auto p-2 bg-[#1a1b1e] rounded-md border border-[#2f3136]">
                        {tableFields.length > 0 ? (
                          tableFields.map((f, fIdx) => {
                            const isLevel = curLevels.includes(f);
                            const levelOrder = curLevels.indexOf(f);

                            return (
                              <label
                                key={`drill_lvl_${f}_${fIdx}`}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                                  isLevel ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isLevel}
                                    onChange={() => {
                                      let nextLevels = curLevels.filter(x => tableFields.includes(x));
                                      if (isLevel) {
                                        nextLevels = nextLevels.filter(x => x !== f);
                                      } else {
                                        nextLevels.push(f);
                                      }
                                      updateBinding('drillLevels', nextLevels);
                                    }}
                                    className="rounded border-[#2f3136] text-[#6366f1] focus:ring-[#6366f1] bg-[#141517] w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="font-mono text-xs font-medium">{f}</span>
                                </div>
                                {isLevel && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-[#6366f1]/20 text-[#818cf8] rounded font-semibold">
                                    Nivel #{levelOrder + 1}
                                  </span>
                                )}
                              </label>
                            );
                          })
                        ) : (
                          <div className="text-[11px] text-[#9ca3af] italic p-3 text-center">
                            {element.binding.tableName
                              ? 'La tabla no tiene campos detectados'
                              : 'Selecciona una tabla para configurar los niveles'}
                          </div>
                        )}
                      </div>
                      {curLevels.length === 0 && tableFields.length > 0 && (
                        <p className="text-[10px] text-amber-400/90 mt-1">
                          Selecciona al menos un campo para habilitar la jerarquía de desglose.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Campo Métrica</label>
                        <select
                          value={tableFields.includes(element.binding.valueField || '') ? (element.binding.valueField || '') : ''}
                          onChange={(e) => updateBinding('valueField', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-white"
                        >
                          <option value="">-- Automático / Conteo --</option>
                          {tableFields.map((f, fIdx) => (
                            <option key={`dd_vf_${f}_${fIdx}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Operación</label>
                        <select
                          value={element.binding.aggregation || 'sum'}
                          onChange={(e) => updateBinding('aggregation', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white"
                        >
                          <option value="sum">Suma (SUM)</option>
                          <option value="count">Conteo (COUNT)</option>
                          <option value="avg">Promedio (AVG)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              );
            })()}

            {/* Drill-Down Cross-Filter Targets & Scope Settings */}
            {element.type === 'drilldown' && (() => {
              const filterEnabled = element.binding.drillFilterEnabled !== false;
              const isSpecific = element.binding.targetControlIds && element.binding.targetControlIds.length > 0 && !element.binding.targetControlIds.includes('*');
              const targetCount = isSpecific ? element.binding.targetControlIds!.length : 'Todas';

              return (
                <CollapsibleSection
                  id="binding_drilldown_filter"
                  title="Filtrado Cruzado de Tablas y Controles"
                  icon={Filter}
                  accentColor="#10b981"
                  badge={filterEnabled ? (isSpecific ? `${targetCount} específicos` : 'Todas las tablas') : 'Desactivado'}
                  isOpen={openSections['binding_drilldown_filter'] ?? true}
                  onToggle={() => toggleSection('binding_drilldown_filter')}
                >
                  <div className="space-y-3">
                    {/* Toggle filter master switch */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-[#1a1b1e] border border-[#2f3136]">
                      <div>
                        <span className="text-xs font-semibold text-white block">Filtrar tablas al navegar</span>
                        <span className="text-[10px] text-[#9ca3af]">Sincroniza el nivel del drill-down con las tablas del lienzo</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterEnabled}
                          onChange={(e) => updateBinding('drillFilterEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-[#2f3136] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#10b981]"></div>
                      </label>
                    </div>

                    {filterEnabled && (
                      <>
                        {/* Target Controls */}
                        <div className="space-y-2 pt-1 border-t border-[#2f3136]">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">
                              Controles que Filtrará
                            </label>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1b1e] text-[#10b981] font-mono border border-[#373a40]">
                              {!isSpecific ? 'Todas las tablas compatibles' : `${targetCount} seleccionados`}
                            </span>
                          </div>

                          <div className="flex rounded-md bg-[#1a1b1e] p-0.5 border border-[#2f3136]">
                            <button
                              type="button"
                              onClick={() => updateBinding('targetControlIds', [])}
                              className={`flex-1 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                                !isSpecific
                                  ? 'bg-[#10b981] text-white shadow-xs'
                                  : 'text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              Todas las tablas
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSpecific) {
                                  const tableIds = allElements
                                    .filter(el => el.id !== element.id && el.type === 'table')
                                    .map(el => el.id);
                                  updateBinding('targetControlIds', tableIds.length > 0 ? tableIds : allElements.filter(el => el.id !== element.id && el.type !== 'drilldown').map(el => el.id));
                                }
                              }}
                              className={`flex-1 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                                isSpecific
                                  ? 'bg-[#10b981] text-white shadow-xs'
                                  : 'text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              Controles específicos
                            </button>
                          </div>

                          {isSpecific && (
                            <div className="space-y-1.5 mt-2 bg-[#1a1b1e] p-2.5 rounded-md border border-[#2f3136]">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#2f3136] text-[10px]">
                                <span className="text-[#9ca3af]">Selecciona los controles o tablas:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const onlyTables = allElements
                                        .filter(el => el.id !== element.id && el.type === 'table')
                                        .map(el => el.id);
                                      updateBinding('targetControlIds', onlyTables);
                                    }}
                                    className="text-[#10b981] hover:underline font-semibold cursor-pointer"
                                  >
                                    Solo Tablas
                                  </button>
                                  <span className="text-[#373a40]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const otherIds = allElements
                                        .filter(el => el.id !== element.id && el.type !== 'drilldown' && el.type !== 'filter' && el.type !== 'divider' && el.type !== 'container')
                                        .map(el => el.id);
                                      updateBinding('targetControlIds', otherIds);
                                    }}
                                    className="text-[#9ca3af] hover:text-white cursor-pointer"
                                  >
                                    Todos
                                  </button>
                                  <span className="text-[#373a40]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => updateBinding('targetControlIds', ['__none__'])}
                                    className="text-[#9ca3af] hover:text-white cursor-pointer"
                                  >
                                    Desmarcar
                                  </button>
                                </div>
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {allElements
                                  .filter(el => el.id !== element.id && el.type !== 'drilldown' && el.type !== 'filter' && el.type !== 'divider' && el.type !== 'container')
                                  .map(targetEl => {
                                    const isTargeted = (element.binding.targetControlIds || []).includes(targetEl.id);
                                    const TargetIcon = CONTROL_TYPE_INFO[targetEl.type]?.icon || Square;
                                    const isTableType = targetEl.type === 'table';
                                    return (
                                      <label
                                        key={`dd_tgt_${targetEl.id}`}
                                        className={`flex items-center justify-between p-1.5 rounded transition cursor-pointer text-xs ${
                                          isTargeted
                                            ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-white'
                                            : 'bg-[#202225] border border-transparent text-[#9ca3af] hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={isTargeted}
                                            onChange={() => {
                                              const current = element.binding.targetControlIds || [];
                                              let next: string[];
                                              if (current.includes(targetEl.id)) {
                                                next = current.filter(id => id !== targetEl.id);
                                                if (next.length === 0) next = ['__none__'];
                                              } else {
                                                next = [...current.filter(id => id !== '__none__'), targetEl.id];
                                              }
                                              updateBinding('targetControlIds', next);
                                            }}
                                            className="w-3.5 h-3.5 rounded border-[#373a40] text-[#10b981] focus:ring-[#10b981] cursor-pointer"
                                          />
                                          <TargetIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isTableType ? 'text-indigo-400' : 'text-[#9ca3af]'}`} />
                                          <span className="truncate font-medium">{targetEl.name || targetEl.binding?.template || targetEl.id}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          {isTableType && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                                              Tabla
                                            </span>
                                          )}
                                          <span className="text-[10px] text-[#9ca3af] font-mono">
                                            {targetEl.binding?.tableName || 'Sin tabla'}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Page Scope */}
                        <div className="space-y-2 pt-2 border-t border-[#2f3136]">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">
                              Ámbito de Páginas
                            </label>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1b1e] text-[#10b981] font-mono border border-[#373a40]">
                              {element.binding.filterPageScope === 'all'
                                ? 'Todas'
                                : element.binding.filterPageScope === 'selected'
                                ? `${element.binding.targetPageIds?.length || 0} páginas`
                                : 'Página actual'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateBinding('filterPageScope', 'current')}
                              className={`p-2 rounded border text-center transition cursor-pointer ${
                                !element.binding.filterPageScope || element.binding.filterPageScope === 'current'
                                  ? 'bg-[#10b981]/15 border-[#10b981] text-white font-semibold'
                                  : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              <div className="text-[11px]">Esta página</div>
                              <div className="text-[9px] text-[#9ca3af] mt-0.5">Solo local</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                updateBinding('filterPageScope', 'selected');
                                if (!element.binding.targetPageIds || element.binding.targetPageIds.length === 0) {
                                  const curPageId = pages[activePageIndex]?.id || String(activePageIndex);
                                  updateBinding('targetPageIds', [curPageId]);
                                }
                              }}
                              className={`p-2 rounded border text-center transition cursor-pointer ${
                                element.binding.filterPageScope === 'selected'
                                  ? 'bg-[#10b981]/15 border-[#10b981] text-white font-semibold'
                                  : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              <div className="text-[11px]">Varias páginas</div>
                              <div className="text-[9px] text-[#9ca3af] mt-0.5">Selección</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateBinding('filterPageScope', 'all')}
                              className={`p-2 rounded border text-center transition cursor-pointer ${
                                element.binding.filterPageScope === 'all'
                                  ? 'bg-[#10b981]/15 border-[#10b981] text-white font-semibold'
                                  : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                              }`}
                            >
                              <div className="text-[11px]">Todas</div>
                              <div className="text-[9px] text-[#9ca3af] mt-0.5">Global</div>
                            </button>
                          </div>

                          {element.binding.filterPageScope === 'selected' && (
                            <div className="space-y-1.5 mt-2 bg-[#1a1b1e] p-2.5 rounded-md border border-[#2f3136]">
                              <div className="flex items-center justify-between pb-1 border-b border-[#2f3136] text-[10px]">
                                <span className="text-[#9ca3af]">Aplica en las páginas marcadas:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allPageIds = pages.map((p, idx) => p.id || String(idx));
                                      updateBinding('targetPageIds', allPageIds);
                                    }}
                                    className="text-[#10b981] hover:underline font-semibold cursor-pointer"
                                  >
                                    Todas
                                  </button>
                                  <span className="text-[#373a40]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => updateBinding('targetPageIds', [])}
                                    className="text-[#9ca3af] hover:text-white cursor-pointer"
                                  >
                                    Ninguna
                                  </button>
                                </div>
                              </div>

                              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {pages.map((page, pIdx) => {
                                  const pId = page.id || String(pIdx);
                                  const isChecked = (element.binding.targetPageIds || []).includes(pId);
                                  return (
                                    <label
                                      key={`dd_page_${pId}`}
                                      className={`flex items-center justify-between p-1.5 rounded transition cursor-pointer text-xs ${
                                        isChecked
                                          ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-white'
                                          : 'bg-[#202225] border border-transparent text-[#9ca3af] hover:text-white'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            const cur = element.binding.targetPageIds || [];
                                            const next = isChecked
                                              ? cur.filter(x => x !== pId)
                                              : [...cur, pId];
                                            updateBinding('targetPageIds', next);
                                          }}
                                          className="w-3.5 h-3.5 rounded border-[#373a40] text-[#10b981] focus:ring-[#10b981] cursor-pointer"
                                        />
                                        <span>{page.name || `Página ${pIdx + 1}`}</span>
                                      </div>
                                      <span className="text-[10px] text-[#9ca3af] font-mono">
                                        Pág. {pIdx + 1}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleSection>
              );
            })()}

            {/* Detail Card Settings */}
            {element.type === 'detailCard' && (() => {
              const activeDetailCols = (element.binding.columns || []).filter(c => tableFields.includes(c));

              const handlePickRandom = () => {
                if (tableFields.length === 0) return;
                const pool = tableFields.filter(f => f !== element.binding.headerField && f !== element.binding.subHeaderField);
                const candidates = pool.length > 0 ? pool : tableFields;
                const shuffled = [...candidates].sort(() => 0.5 - Math.random());
                const count = Math.min(shuffled.length, Math.min(4, Math.max(2, Math.floor(Math.random() * 3) + 2)));
                updateBinding('columns', shuffled.slice(0, count));
              };

              const handleSelectAll = () => {
                updateBinding('columns', [...tableFields]);
              };

              const handleClearAll = () => {
                updateBinding('columns', []);
              };

              return (
                <CollapsibleSection
                  id="binding_detailcard"
                  title="Campos de Ficha Detalle"
                  icon={Contact}
                  accentColor="#3b82f6"
                  badge={`${activeDetailCols.length} campos`}
                  isOpen={!!openSections['binding_detailcard']}
                  onToggle={() => toggleSection('binding_detailcard')}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Campo Título Principal</label>
                        <select
                          value={element.binding.headerField || ''}
                          onChange={(e) => updateBinding('headerField', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-white"
                        >
                          <option value="">-- Automático --</option>
                          {tableFields.map((f, fIdx) => (
                            <option key={`dc_hf_${f}_${fIdx}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Campo Subtítulo</label>
                        <select
                          value={element.binding.subHeaderField || ''}
                          onChange={(e) => updateBinding('subHeaderField', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-white"
                        >
                          <option value="">-- Ninguno / Vacío --</option>
                          {tableFields.map((f, fIdx) => (
                            <option key={`dc_shf_${f}_${fIdx}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                          Campos de Información Detallada
                        </label>
                        {tableFields.length > 0 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handlePickRandom}
                              className="px-1.5 py-0.5 text-[10px] bg-[#25282c] hover:bg-[#2f3136] text-amber-300 rounded font-medium transition cursor-pointer"
                              title="Seleccionar 2 a 4 campos al azar de la tabla configurada"
                            >
                              Al azar
                            </button>
                            <button
                              type="button"
                              onClick={handleSelectAll}
                              className="px-1.5 py-0.5 text-[10px] bg-[#25282c] hover:bg-[#2f3136] text-[#9ca3af] hover:text-white rounded font-medium transition cursor-pointer"
                              title="Seleccionar todos los campos"
                            >
                              Todos
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAll}
                              className="px-1.5 py-0.5 text-[10px] bg-[#25282c] hover:bg-[#2f3136] text-[#9ca3af] hover:text-rose-300 rounded font-medium transition cursor-pointer"
                              title="Dejar en blanco (ningún campo)"
                            >
                              En blanco
                            </button>
                          </div>
                        )}
                      </div>

                      {tableFields.length > 0 ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto p-2 bg-[#1a1b1e] rounded-md border border-[#2f3136]">
                          {tableFields.map((f, fIdx) => {
                            const isCol = activeDetailCols.includes(f);

                            return (
                              <label
                                key={`dc_col_${f}_${fIdx}`}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                                  isCol ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isCol}
                                    onChange={() => {
                                      let nextCols = [...activeDetailCols];
                                      if (isCol) {
                                        nextCols = nextCols.filter(x => x !== f);
                                      } else {
                                        nextCols.push(f);
                                      }
                                      updateBinding('columns', nextCols);
                                    }}
                                    className="rounded border-[#2f3136] text-[#3b82f6] focus:ring-[#3b82f6] bg-[#141517] w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="font-mono text-xs font-medium">{f}</span>
                                </div>
                                {isCol && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-[#3b82f6]/20 text-[#60a5fa] rounded font-semibold">
                                    Visible
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#1a1b1e] rounded-md border border-[#2f3136] text-center text-xs text-[#9ca3af]">
                          {element.binding.tableName
                            ? `La tabla "${element.binding.tableName}" no tiene campos detectados.`
                            : 'Selecciona una tabla en "Fuente de Datos" para configurar los campos.'}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
              );
            })()}

            {/* Multi-Level Matrix Settings */}
            {element.type === 'matrix' && (() => {
              const currentMatrixRowFields: string[] = Array.isArray(element.binding.rowFields) && element.binding.rowFields.length > 0
                ? element.binding.rowFields
                : (element.binding.rowField ? [element.binding.rowField] : (tableFields[0] ? [tableFields[0]] : []));

              const currentMatrixColFields: string[] = Array.isArray(element.binding.colFields) && element.binding.colFields.length > 0
                ? element.binding.colFields
                : (element.binding.colField ? [element.binding.colField] : (tableFields[1] ? [tableFields[1]] : []));

              const handleSetRowField = (idx: number, val: string) => {
                const next = [...currentMatrixRowFields];
                next[idx] = val;
                updateMultipleBindings({
                  rowFields: next,
                  rowField: next[0]
                });
              };

              const handleAddRowField = () => {
                const unused = tableFields.find(f => !currentMatrixRowFields.includes(f));
                const toAdd = unused || tableFields[0] || '';
                const next = [...currentMatrixRowFields, toAdd];
                updateMultipleBindings({
                  rowFields: next,
                  rowField: next[0]
                });
              };

              const handleRemoveRowField = (idx: number) => {
                if (currentMatrixRowFields.length <= 1) return;
                const next = currentMatrixRowFields.filter((_, i) => i !== idx);
                updateMultipleBindings({
                  rowFields: next,
                  rowField: next[0]
                });
              };

              const handleMoveRowField = (idx: number, dir: 'up' | 'down') => {
                const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                if (targetIdx < 0 || targetIdx >= currentMatrixRowFields.length) return;
                const next = [...currentMatrixRowFields];
                const tmp = next[idx];
                next[idx] = next[targetIdx];
                next[targetIdx] = tmp;
                updateMultipleBindings({
                  rowFields: next,
                  rowField: next[0]
                });
              };

              const handleSetColField = (idx: number, val: string) => {
                const next = [...currentMatrixColFields];
                next[idx] = val;
                updateMultipleBindings({
                  colFields: next,
                  colField: next[0]
                });
              };

              const handleAddColField = () => {
                const unused = tableFields.find(f => !currentMatrixColFields.includes(f));
                const toAdd = unused || tableFields[0] || '';
                const next = [...currentMatrixColFields, toAdd];
                updateMultipleBindings({
                  colFields: next,
                  colField: next[0]
                });
              };

              const handleRemoveColField = (idx: number) => {
                if (currentMatrixColFields.length <= 1) return;
                const next = currentMatrixColFields.filter((_, i) => i !== idx);
                updateMultipleBindings({
                  colFields: next,
                  colField: next[0]
                });
              };

              const handleMoveColField = (idx: number, dir: 'up' | 'down') => {
                const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                if (targetIdx < 0 || targetIdx >= currentMatrixColFields.length) return;
                const next = [...currentMatrixColFields];
                const tmp = next[idx];
                next[idx] = next[targetIdx];
                next[targetIdx] = tmp;
                updateMultipleBindings({
                  colFields: next,
                  colField: next[0]
                });
              };

              return (
                <CollapsibleSection
                  id="binding_matrix"
                  title="Matriz Multidimensional (Niveles)"
                  icon={Grid3X3}
                  accentColor="#0ea5e9"
                  badge={`${currentMatrixRowFields.length}N Filas × ${currentMatrixColFields.length}N Cols`}
                  isOpen={!!openSections['binding_matrix']}
                  onToggle={() => toggleSection('binding_matrix')}
                >
                  <div className="space-y-3">
                    {/* Row levels */}
                    <div className="bg-[#141517] p-2 rounded border border-[#2f3136]/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                            Niveles en Filas (Eje Y)
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                            {currentMatrixRowFields.length} {currentMatrixRowFields.length === 1 ? 'nivel' : 'niveles'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddRowField}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 rounded transition cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Añadir Nivel</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {currentMatrixRowFields.map((field, rIdx) => (
                          <div key={`m_rf_row_${rIdx}`} className="flex items-center gap-1 bg-[#1a1b1e] p-1 rounded border border-[#2f3136]">
                            <span className="w-5 text-center text-[10px] font-mono font-bold text-[#6b7280]">
                              L{rIdx + 1}
                            </span>
                            <select
                              value={field}
                              onChange={(e) => handleSetRowField(rIdx, e.target.value)}
                              className="flex-1 px-2 py-1 bg-[#111214] border border-[#2f3136] rounded text-xs font-mono text-white"
                            >
                              <option value="">-- Seleccionar campo --</option>
                              {tableFields.map((f, fIdx) => (
                                <option key={`mat_rf_${f}_${fIdx}`} value={f}>{f}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={rIdx === 0}
                                onClick={() => handleMoveRowField(rIdx, 'up')}
                                title="Subir nivel jerárquico"
                                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={rIdx === currentMatrixRowFields.length - 1}
                                onClick={() => handleMoveRowField(rIdx, 'down')}
                                title="Bajar nivel jerárquico"
                                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={currentMatrixRowFields.length <= 1}
                                onClick={() => handleRemoveRowField(rIdx)}
                                title="Eliminar nivel"
                                className="p-1 hover:bg-rose-900/40 rounded text-[#9ca3af] hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column levels */}
                    <div className="bg-[#141517] p-2 rounded border border-[#2f3136]/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                            Niveles en Columnas (Eje X)
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                            {currentMatrixColFields.length} {currentMatrixColFields.length === 1 ? 'nivel' : 'niveles'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddColField}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 rounded transition cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Añadir Nivel</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {currentMatrixColFields.map((field, cIdx) => (
                          <div key={`m_cf_col_${cIdx}`} className="flex items-center gap-1 bg-[#1a1b1e] p-1 rounded border border-[#2f3136]">
                            <span className="w-5 text-center text-[10px] font-mono font-bold text-[#6b7280]">
                              L{cIdx + 1}
                            </span>
                            <select
                              value={field}
                              onChange={(e) => handleSetColField(cIdx, e.target.value)}
                              className="flex-1 px-2 py-1 bg-[#111214] border border-[#2f3136] rounded text-xs font-mono text-white"
                            >
                              <option value="">-- Seleccionar campo --</option>
                              {tableFields.map((f, fIdx) => (
                                <option key={`mat_cf_${f}_${fIdx}`} value={f}>{f}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={cIdx === 0}
                                onClick={() => handleMoveColField(cIdx, 'up')}
                                title="Subir nivel jerárquico"
                                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={cIdx === currentMatrixColFields.length - 1}
                                onClick={() => handleMoveColField(cIdx, 'down')}
                                title="Bajar nivel jerárquico"
                                className="p-1 hover:bg-[#2f3136] rounded text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={currentMatrixColFields.length <= 1}
                                onClick={() => handleRemoveColField(cIdx)}
                                title="Eliminar nivel"
                                className="p-1 hover:bg-rose-900/40 rounded text-[#9ca3af] hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metric & Aggregation */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Campo Métrica Valor</label>
                        <select
                          value={element.binding.valueField || ''}
                          onChange={(e) => updateBinding('valueField', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-white"
                        >
                          <option value="">-- Conteo de filas --</option>
                          {tableFields.map((f, fIdx) => (
                            <option key={`mat_vf_${f}_${fIdx}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Operación Celda</label>
                        <select
                          value={element.binding.aggregation || 'sum'}
                          onChange={(e) => updateBinding('aggregation', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white"
                        >
                          <option value="sum">Suma (SUM)</option>
                          <option value="count">Conteo (COUNT)</option>
                          <option value="avg">Promedio (AVG)</option>
                          <option value="min">Mínimo (MIN)</option>
                          <option value="max">Máximo (MAX)</option>
                        </select>
                      </div>
                    </div>

                    {/* Hierarchy & Totals Options */}
                    <div className="pt-2 border-t border-[#2f3136] space-y-1.5">
                      <span className="text-[10px] font-bold text-[#9ca3af] block uppercase tracking-wider">
                        Opciones de Jerarquía y Totales
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d1d5db] hover:text-white">
                        <input
                          type="checkbox"
                          checked={element.binding.matrixShowGrandTotals !== false}
                          onChange={(e) => updateBinding('matrixShowGrandTotals', e.target.checked)}
                          className="rounded border-[#4b5563] bg-[#1a1b1e] text-blue-600 focus:ring-0"
                        />
                        <span>Mostrar fila y columna de Total General</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d1d5db] hover:text-white">
                        <input
                          type="checkbox"
                          checked={element.binding.matrixShowSubtotals !== false}
                          onChange={(e) => updateBinding('matrixShowSubtotals', e.target.checked)}
                          className="rounded border-[#4b5563] bg-[#1a1b1e] text-blue-600 focus:ring-0"
                        />
                        <span>Calcular subtotales en agrupaciones</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d1d5db] hover:text-white">
                        <input
                          type="checkbox"
                          checked={!!element.binding.matrixDefaultCollapsed}
                          onChange={(e) => updateBinding('matrixDefaultCollapsed', e.target.checked)}
                          className="rounded border-[#4b5563] bg-[#1a1b1e] text-blue-600 focus:ring-0"
                        />
                        <span>Iniciar con niveles agrupados (colapsados)</span>
                      </label>
                    </div>
                  </div>
                </CollapsibleSection>
              );
            })()}

            {/* Registration Form Settings */}
            {element.type === 'form' && (
              <CollapsibleSection
                id="binding_form"
                title="Campos del Formulario"
                icon={ClipboardList}
                accentColor="#8b5cf6"
                badge={`${formSelectedFields.length} seleccionados`}
                isOpen={!!openSections['binding_form']}
                onToggle={() => toggleSection('binding_form')}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                          Campos para Captura de Datos
                        </label>
                        {element.binding.tableName && (
                          <span className="text-[9px] px-1 py-0.2 bg-indigo-950/60 text-indigo-300 rounded font-mono">
                            {element.binding.tableName}
                          </span>
                        )}
                      </div>
                      {formAvailableFields.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={selectAllFormFields}
                            className="text-[#8b5cf6] hover:text-[#a78bfa] font-semibold cursor-pointer transition"
                            title="Seleccionar todos los campos"
                          >
                            Todos
                          </button>
                          <span className="text-[#4b5563]">•</span>
                          <button
                            type="button"
                            onClick={deselectAllFormFields}
                            className="text-[#9ca3af] hover:text-white cursor-pointer transition"
                            title="Deseleccionar todos"
                          >
                            Ninguno
                          </button>
                          <span className="text-[#4b5563]">•</span>
                          <button
                            type="button"
                            onClick={refreshFormFields}
                            className="text-[#38bdf8] hover:text-[#7dd3fc] cursor-pointer flex items-center gap-0.5 transition"
                            title="Sincronizar campos con el esquema de la tabla"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Auto</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {formAvailableFields.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto p-2 bg-[#1a1b1e] rounded-md border border-[#2f3136]">
                        {formAvailableFields.map((f, fIdx) => {
                          const isCol = formSelectedFields.includes(f);

                          return (
                            <label
                              key={`form_col_${f}_${fIdx}`}
                              className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                                isCol ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isCol}
                                  onChange={() => toggleFormField(f)}
                                  className="rounded border-[#2f3136] text-[#8b5cf6] focus:ring-[#8b5cf6] bg-[#141517] w-3.5 h-3.5"
                                />
                                <span className="font-mono text-xs font-medium">{f}</span>
                              </div>
                              {isCol && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-[#8b5cf6]/20 text-[#c084fc] rounded font-semibold">
                                  Input Activo
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#1a1b1e] rounded-md border border-[#2f3136] text-center text-xs text-[#9ca3af]">
                        {element.binding.tableName 
                          ? `La tabla "${element.binding.tableName}" no tiene campos detectados en su esquema actual.`
                          : 'Selecciona una tabla en "Fuente de Datos" para configurar y sincronizar los campos.'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Texto Botón Guardar</label>
                      <input
                        type="text"
                        value={element.binding.prefix || 'Guardar Registro'}
                        onChange={(e) => updateBinding('prefix', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-0.5 font-bold uppercase">Título Formulario</label>
                      <input
                        type="text"
                        value={element.binding.template || 'Nuevo Registro'}
                        onChange={(e) => updateBinding('template', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Filter Control Configuration */}
            {element.type === 'filter' && (
              <CollapsibleSection
                id="binding_filter_config"
                title="Configuración del Filtro"
                icon={Filter}
                accentColor="#06b6d4"
                badge={element.binding.filterDisplayMode === 'checkbox_list' ? 'Lista de Casillas' : 'Desplegable'}
                isOpen={openSections['binding_filter_config'] !== false}
                onToggle={() => toggleSection('binding_filter_config')}
              >
                <div className="space-y-4">
                  {/* 1. Modo de Visualización */}
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-1.5 font-bold uppercase tracking-wider">
                      Tipo de Control de Filtro
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateBinding('filterDisplayMode', 'dropdown')}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                          element.binding.filterDisplayMode !== 'checkbox_list'
                            ? 'bg-[#06b6d4]/15 border-[#06b6d4] text-white shadow-xs'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:border-[#3f4147] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                          <ChevronDown className="w-3.5 h-3.5 text-[#06b6d4]" />
                          <span>Desplegable</span>
                        </div>
                        <span className="text-[10px] text-[#9ca3af] leading-tight">
                          Menú compacto de selección única
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateBinding('filterDisplayMode', 'checkbox_list')}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer ${
                          element.binding.filterDisplayMode === 'checkbox_list'
                            ? 'bg-[#06b6d4]/15 border-[#06b6d4] text-white shadow-xs'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:border-[#3f4147] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                          <CheckSquare className="w-3.5 h-3.5 text-[#06b6d4]" />
                          <span>Lista de Casillas</span>
                        </div>
                        <span className="text-[10px] text-[#9ca3af] leading-tight">
                          Selección múltiple interactiva
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Campo a Filtrar y Etiquetas */}
                  <div className="space-y-2.5 pt-2 border-t border-[#2f3136]">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">
                          Campo a Filtrar
                        </label>
                        {element.binding.tableName && (
                          <span className="text-[10px] text-[#06b6d4] font-mono">
                            {tableFields.length} campos
                          </span>
                        )}
                      </div>
                      <select
                        value={element.binding.field || ''}
                        onChange={(e) => updateBinding('field', e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs text-white cursor-pointer focus:border-[#06b6d4] focus:outline-none font-medium"
                      >
                        <option value="">-- Seleccionar campo a filtrar --</option>
                        {tableFields.map(f => (
                          <option key={`flt_field_${f}`} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      {!element.binding.tableName && (
                        <span className="text-[10px] text-amber-400/80 mt-1 block">
                          Primero selecciona una Fuente de Datos (Tabla) en la sección superior.
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-1 font-bold uppercase">
                          Título en Filtro
                        </label>
                        <input
                          type="text"
                          value={element.binding.template || ''}
                          onChange={(e) => updateBinding('template', e.target.value)}
                          placeholder={element.binding.field ? `Filtro: ${element.binding.field}` : 'Título del filtro'}
                          className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white focus:border-[#06b6d4] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-1 font-bold uppercase">
                          Texto "Todos"
                        </label>
                        <input
                          type="text"
                          value={element.binding.filterPlaceholder || ''}
                          onChange={(e) => updateBinding('filterPlaceholder', e.target.value)}
                          placeholder="Todos los valores"
                          className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white focus:border-[#06b6d4] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Panel de Gestión de Filtros Globales y Relaciones en Todo el Documento */}
                  <div className="pt-2 border-t border-[#2f3136]">
                    <GlobalFilterRelationshipManager
                      filterElement={element}
                      allDocumentElements={allDocumentElements || (allElements || []).map((el) => ({
                        element: el,
                        pageId: pages?.[activePageIndex || 0]?.id || `page_${activePageIndex || 0}`,
                        pageName: pages?.[activePageIndex || 0]?.name || `Página ${(activePageIndex || 0) + 1}`,
                        pageIndex: activePageIndex || 0,
                        isCurrentPage: true
                      }))}
                      pages={pages}
                      activePageIndex={activePageIndex}
                      onUpdateFilter={onChangeElement}
                      onSelectElement={(id, pIdx) => {
                        if (onSwitchPage && typeof pIdx === 'number') {
                          onSwitchPage(pIdx);
                        }
                        onSelectElementById?.(id, pIdx);
                      }}
                      onSwitchPage={onSwitchPage}
                      onOpenDependenciesTab={onOpenDependenciesTab}
                      dbInfo={dbInfo}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* MiniBrowser Configuration Section */}
            {element.type === 'minibrowser' && (
              <CollapsibleSection
                id="binding_minibrowser"
                title="Configuración de MiniBrowser"
                icon={Globe}
                accentColor="#0ea5e9"
                badge={element.binding.browserSourceType === 'url' ? 'URL Web' : 'Diseño DB'}
                isOpen={openSections['binding_minibrowser'] !== false}
                onToggle={() => toggleSection('binding_minibrowser')}
              >
                <div className="space-y-3.5 text-xs">
                  {/* Origen del Contenido: Diseño DB vs URL Web */}
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-1.5 font-bold uppercase tracking-wider">
                      Tipo de Origen
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateBinding('browserSourceType', 'saved_design');
                          if (!element.binding.browserUrl?.startsWith('db://')) {
                            updateBinding('browserUrl', 'db://diseño-actual');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                          element.binding.browserSourceType !== 'url'
                            ? 'bg-[#0ea5e9]/15 border-[#0ea5e9] text-white font-semibold'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                        }`}
                      >
                        <Database className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                          <div className="text-xs">Diseño en DB</div>
                          <div className="text-[9px] text-[#9ca3af]">IndexedDB local</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBinding('browserSourceType', 'url');
                          if (element.binding.browserUrl?.startsWith('db://') || !element.binding.browserUrl) {
                            updateBinding('browserUrl', 'https://example.com');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                          element.binding.browserSourceType === 'url'
                            ? 'bg-[#0ea5e9]/15 border-[#0ea5e9] text-white font-semibold'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                        }`}
                      >
                        <Globe className="w-4 h-4 text-sky-400 flex-shrink-0" />
                        <div>
                          <div className="text-xs">URL Externa</div>
                          <div className="text-[9px] text-[#9ca3af]">Página Web</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Selector de Diseños si es saved_design */}
                  {element.binding.browserSourceType !== 'url' && (
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-1 font-bold uppercase tracking-wider">
                        Diseño Guardado a Renderizar
                      </label>
                      <select
                        value={element.binding.browserUrl || 'db://diseño-actual'}
                        onChange={(e) => updateBinding('browserUrl', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white focus:outline-none focus:border-[#0ea5e9]"
                      >
                        <option value="db://diseño-actual">✨ Diseño Actual del Lienzo</option>
                        <option value="db://Plantilla Reporte Ventas">📊 Demo Reporte Ventas</option>
                        {savedDbDesigns.map((d) => (
                          <option key={d.id} value={`db://${d.name}`}>
                            📁 {d.name} ({d.elements?.length || 0} elem)
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-[#9ca3af] mt-1">
                        El iframe renderiza el diseño guardado en tiempo real con datos de Dexie IndexedDB.
                      </p>
                    </div>
                  )}

                  {/* Input de URL directa */}
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-1 font-bold uppercase tracking-wider">
                      Dirección URL / Protocolo
                    </label>
                    <input
                      type="text"
                      value={element.binding.browserUrl || ''}
                      onChange={(e) => updateBinding('browserUrl', e.target.value)}
                      placeholder="db://nombre-diseño o https://ejemplo.com"
                      className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-white font-mono focus:outline-none focus:border-[#0ea5e9]"
                    />
                  </div>

                  {/* Presets de URLs */}
                  {element.binding.browserSourceType === 'url' && (
                    <div>
                      <span className="text-[10px] text-[#9ca3af] block mb-1">Páginas de prueba compatibles:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateBinding('browserUrl', 'https://example.com')}
                          className="px-2 py-1 bg-[#1a1b1e] hover:bg-[#2a2d32] border border-[#2f3136] rounded text-[10px] text-[#38bdf8] font-mono cursor-pointer"
                        >
                          example.com
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBinding('browserUrl', 'https://es.wikipedia.org/wiki/Portal:Comunidad')}
                          className="px-2 py-1 bg-[#1a1b1e] hover:bg-[#2a2d32] border border-[#2f3136] rounded text-[10px] text-[#38bdf8] font-mono cursor-pointer"
                        >
                          wikipedia.org
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBinding('browserUrl', 'https://httpbin.org/html')}
                          className="px-2 py-1 bg-[#1a1b1e] hover:bg-[#2a2d32] border border-[#2f3136] rounded text-[10px] text-[#38bdf8] font-mono cursor-pointer"
                        >
                          httpbin.org
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Modo Interactivo por defecto */}
                  <div className="pt-2 border-t border-[#2f3136] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Interactividad en Lienzo</span>
                      <span className="text-[10px] text-[#9ca3af]">Permitir navegación directa dentro del iframe en edición</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateBinding('browserInteractive', !element.binding.browserInteractive)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                        element.binding.browserInteractive ? 'bg-[#0ea5e9] justify-end' : 'bg-[#373a40] justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  {/* Visibilidad de Barras en Modo Previsualización */}
                  <div className="pt-2.5 border-t border-[#2f3136] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">Visibilidad en Previsualización</span>
                        <span className="text-[10px] text-[#9ca3af]">Barras a mostrar en modo Previsualizar</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            updateBinding('browserShowTitleBar', true);
                            updateBinding('browserShowToolBar', true);
                            updateBinding('browserShowTabsBar', true);
                            updateBinding('browserShowFooter', true);
                          }}
                          title="Mostrar todas las barras en previsualización"
                          className="px-1.5 py-0.5 rounded bg-[#1a1b1e] hover:bg-[#2a2d32] border border-[#2f3136] text-[9px] text-[#9ca3af] hover:text-white cursor-pointer transition"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateBinding('browserShowTitleBar', false);
                            updateBinding('browserShowToolBar', false);
                            updateBinding('browserShowTabsBar', false);
                            updateBinding('browserShowFooter', false);
                          }}
                          title="Ocultar todas las barras (marco de contenido limpio sin barras)"
                          className="px-1.5 py-0.5 rounded bg-[#1a1b1e] hover:bg-[#2a2d32] border border-[#2f3136] text-[9px] text-[#9ca3af] hover:text-white cursor-pointer transition"
                        >
                          Solo Contenido
                        </button>
                      </div>
                    </div>

                    {/* Toggle Title Bar */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1b1e] border border-[#2f3136]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <AppWindow className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-white block truncate">Barra de Título (Title Bar)</span>
                          <span className="text-[9px] text-[#9ca3af] block truncate">Botones ventana macOS y título del sitio</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateBinding('browserShowTitleBar', element.binding.browserShowTitleBar === false ? true : false)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer flex-shrink-0 ${
                          element.binding.browserShowTitleBar !== false ? 'bg-[#0ea5e9] justify-end' : 'bg-[#373a40] justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {/* Toggle Tool Bar */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1b1e] border border-[#2f3136]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-white block truncate">Barra de Herramientas (Tool Bar)</span>
                          <span className="text-[9px] text-[#9ca3af] block truncate">Navegación, caja de URL y favoritos</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateBinding('browserShowToolBar', element.binding.browserShowToolBar === false ? true : false)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer flex-shrink-0 ${
                          element.binding.browserShowToolBar !== false ? 'bg-[#0ea5e9] justify-end' : 'bg-[#373a40] justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {/* Toggle Tabs Bar (Independent from Tool Bar) */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1b1e] border border-[#2f3136]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-white block truncate">Barra de Pestañas (Tabs Bar)</span>
                          <span className="text-[9px] text-[#9ca3af] block truncate">Pestañas multipágina de diseños (independiente de Tool Bar)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateBinding('browserShowTabsBar', element.binding.browserShowTabsBar === false ? true : false)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer flex-shrink-0 ${
                          element.binding.browserShowTabsBar !== false ? 'bg-[#0ea5e9] justify-end' : 'bg-[#373a40] justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {/* Toggle Footer */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1b1e] border border-[#2f3136]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <PanelBottom className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-white block truncate">Barra de Estado / Pie (Footer)</span>
                          <span className="text-[9px] text-[#9ca3af] block truncate">Estado de protocolo, ajuste y zoom</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateBinding('browserShowFooter', element.binding.browserShowFooter === false ? true : false)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer flex-shrink-0 ${
                          element.binding.browserShowFooter !== false ? 'bg-[#0ea5e9] justify-end' : 'bg-[#373a40] justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {/* Barra lateral fijada (Pinned Sidebar) */}
                    <div className="p-2 rounded-lg bg-[#1a1b1e] border border-[#2f3136] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Pin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-white block truncate">Barra Lateral Fijada</span>
                            <span className="text-[9px] text-[#9ca3af] block truncate">Fija Historial o Favoritos como barra lateral permanente</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateBinding('browserPinnedSidebar', 'none')}
                          className={`py-1 px-1.5 rounded text-[10px] font-medium transition cursor-pointer text-center ${
                            (!element.binding.browserPinnedSidebar || element.binding.browserPinnedSidebar === 'none')
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-[#25262b] text-slate-300 hover:bg-[#2c2e33]'
                          }`}
                        >
                          Ninguna
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBinding('browserPinnedSidebar', 'history')}
                          className={`py-1 px-1.5 rounded text-[10px] font-medium transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                            element.binding.browserPinnedSidebar === 'history'
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-[#25262b] text-slate-300 hover:bg-[#2c2e33]'
                          }`}
                        >
                          <History className="w-3 h-3" />
                          <span>Historial</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBinding('browserPinnedSidebar', 'bookmarks')}
                          className={`py-1 px-1.5 rounded text-[10px] font-medium transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                            element.binding.browserPinnedSidebar === 'bookmarks'
                              ? 'bg-amber-600 text-white font-semibold'
                              : 'bg-[#25262b] text-slate-300 hover:bg-[#2c2e33]'
                          }`}
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>Favoritos</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Favoritos y Marcadores guardados en el Binding */}
                  <div className="pt-2 border-t border-[#2f3136]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sitios Favoritos (Marcadores)</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {element.binding.browserBookmarks?.length || 0}
                      </span>
                    </div>
                    {element.binding.browserBookmarks && element.binding.browserBookmarks.length > 0 ? (
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {element.binding.browserBookmarks.map((bm) => (
                          <div
                            key={bm.id}
                            className="flex items-center justify-between p-1.5 rounded bg-[#1a1b1e] border border-[#2f3136] text-[11px]"
                          >
                            <button
                              type="button"
                              onClick={() => updateBinding('browserUrl', bm.url)}
                              title={`Navegar a ${bm.url}`}
                              className="flex items-center gap-1.5 min-w-0 text-left hover:text-sky-300 transition truncate cursor-pointer flex-1 mr-1"
                            >
                              <span className="text-amber-400 flex-shrink-0">★</span>
                              <span className="font-medium text-slate-200 truncate">{bm.title || bm.url}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nextBm = (element.binding.browserBookmarks || []).filter(b => b.id !== bm.id);
                                updateBinding('browserBookmarks', nextBm);
                              }}
                              title="Eliminar de favoritos"
                              className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">
                        No hay favoritos guardados aún. Puedes añadirlos pulsando el botón ★ en la barra del MiniBrowser.
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* QueryTable Configuration Section */}
            {element.type === 'queryTable' && (
              <CollapsibleSection
                id="binding_queryTable"
                title="Configuración de QueryTable"
                icon={TableProperties}
                accentColor="#06b6d4"
                badge={`${element.binding.queryParams?.length || 0} params`}
                isOpen={openSections['binding_queryTable'] !== false}
                onToggle={() => toggleSection('binding_queryTable')}
              >
                <div className="space-y-4 text-xs">
                  {/* Button to open QueryBuilderModal */}
                  <button
                    type="button"
                    onClick={() => setIsQueryBuilderOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-900/20 transition cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Abrir Diseñador Visual & SQL</span>
                  </button>

                  {/* Active Query Selector */}
                  {(element.binding.savedQueries && element.binding.savedQueries.length > 0) && (
                    <div>
                      <label className="text-[10px] text-[#9ca3af] block mb-1 font-bold uppercase tracking-wider">
                        Consulta Guardada Activa
                      </label>
                      <select
                        value={element.binding.activeQueryId || ''}
                        onChange={(e) => {
                          const sqId = e.target.value;
                          const sq = element.binding.savedQueries?.find(q => q.id === sqId);
                          if (sq) {
                            onChangeElement({
                              ...element,
                              binding: {
                                ...element.binding,
                                activeQueryId: sq.id,
                                querySql: sq.querySql,
                                queryParams: sq.params ? JSON.parse(JSON.stringify(sq.params)) : element.binding.queryParams
                              }
                            });
                          }
                        }}
                        className="w-full bg-[#1a1b1e] border border-[#2f3136] rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="">(Consulta Personalizada)</option>
                        {element.binding.savedQueries.map(sq => (
                          <option key={sq.id} value={sq.id}>
                            {sq.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* SQL Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Code2 className="w-3 h-3 text-cyan-400" />
                        <span>Consulta SQL Actual</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQueryBuilderOpen(true)}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Editar SQL
                      </button>
                    </div>
                    <pre className="p-2.5 bg-[#141517] rounded-lg border border-[#2f3136] font-mono text-[11px] text-cyan-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {element.binding.querySql || 'SELECT * FROM ventas LIMIT 50'}
                    </pre>
                  </div>

                  {/* Parameters List & Quick edit */}
                  <div className="pt-2 border-t border-[#2f3136]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-cyan-400" />
                        <span>Parámetros ({element.binding.queryParams?.length || 0})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsQueryBuilderOpen(true)}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Configurar
                      </button>
                    </div>

                    {element.binding.queryParams && element.binding.queryParams.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {element.binding.queryParams.map((param, idx) => (
                          <div
                            key={param.name || idx}
                            className="bg-[#1a1b1e] p-2 rounded border border-[#2f3136] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-cyan-300 block truncate">
                                :{param.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {param.label || param.name} ({param.type})
                              </span>
                            </div>
                            <div className="shrink-0 w-24">
                              <input
                                type={param.type === 'number' ? 'number' : 'text'}
                                value={param.currentValue !== undefined ? param.currentValue : param.defaultValue ?? ''}
                                onChange={(e) => {
                                  const updatedParams = [...(element.binding.queryParams || [])];
                                  updatedParams[idx] = {
                                    ...param,
                                    currentValue: param.type === 'number' ? Number(e.target.value) : e.target.value
                                  };
                                  updateBinding('queryParams', updatedParams);
                                }}
                                className="w-full bg-[#121315] border border-[#3f4147] rounded px-2 py-0.5 text-[11px] text-white font-mono"
                                placeholder="valor"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">
                        No hay parámetros definidos. Abre el diseñador para agregarlos.
                      </p>
                    )}
                  </div>

                  {/* Destination Table in DB */}
                  <div className="pt-2 border-t border-[#2f3136] space-y-2">
                    <span className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Database className="w-3 h-3 text-emerald-400" />
                      <span>Materializar como Tabla en BD</span>
                    </span>
                    <input
                      type="text"
                      value={element.binding.destinationTableName || ''}
                      onChange={(e) => updateBinding('destinationTableName', e.target.value)}
                      placeholder="nombre_de_la_nueva_tabla"
                      className="w-full bg-[#1a1b1e] border border-[#2f3136] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setIsQueryBuilderOpen(true)}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Guardar en Base de Datos</span>
                    </button>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* SplitPanel Configuration Section */}
            {element.type === 'splitPanel' && (
              <CollapsibleSection
                id="binding_splitPanel"
                title="Configuración de Panel Dividido"
                icon={Columns2}
                accentColor="#6366f1"
                badge={
                  element.binding.splitOrientation === 'grid4'
                    ? '4 Cuadrantes'
                    : element.binding.splitOrientation === 'horizontal'
                    ? '2 Horizontales'
                    : '2 Verticales'
                }
                isOpen={openSections['binding_splitPanel'] !== false}
                onToggle={() => toggleSection('binding_splitPanel')}
              >
                <div className="space-y-4 text-xs">
                  {/* Selector de Disposición */}
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-1.5 font-bold uppercase tracking-wider">
                      Tipo de Disposición
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateBinding('splitOrientation', 'vertical');
                        }}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition cursor-pointer ${
                          (!element.binding.splitOrientation || element.binding.splitOrientation === 'vertical')
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                        }`}
                      >
                        <Columns2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px]">2 Verticales</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBinding('splitOrientation', 'horizontal');
                        }}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition cursor-pointer ${
                          element.binding.splitOrientation === 'horizontal'
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                        }`}
                      >
                        <Rows2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px]">2 Horizontales</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBinding('splitOrientation', 'grid4');
                          if (element.binding.splitRatioH === undefined) updateBinding('splitRatioH', 0.5);
                          if (element.binding.splitRatioV === undefined) updateBinding('splitRatioV', 0.5);
                        }}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition cursor-pointer ${
                          element.binding.splitOrientation === 'grid4'
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                            : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                        }`}
                      >
                        <Grid2x2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px]">4 Cuadrantes</span>
                      </button>
                    </div>
                  </div>

                  {/* Proporción / Divisores */}
                  {element.binding.splitOrientation === 'grid4' ? (
                    <div className="space-y-2 pt-1 border-t border-[#2f3136]">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9ca3af]">División Vertical (Columnas)</span>
                          <span className="font-mono text-indigo-400 font-bold">
                            {Math.round((element.binding.splitRatioV ?? 0.5) * 100)}% / {100 - Math.round((element.binding.splitRatioV ?? 0.5) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={Math.round((element.binding.splitRatioV ?? 0.5) * 100)}
                          onChange={(e) => updateBinding('splitRatioV', parseInt(e.target.value) / 100)}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9ca3af]">División Horizontal (Filas)</span>
                          <span className="font-mono text-indigo-400 font-bold">
                            {Math.round((element.binding.splitRatioH ?? 0.5) * 100)}% / {100 - Math.round((element.binding.splitRatioH ?? 0.5) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={Math.round((element.binding.splitRatioH ?? 0.5) * 100)}
                          onChange={(e) => updateBinding('splitRatioH', parseInt(e.target.value) / 100)}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-[#2f3136]">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#9ca3af]">Proporción Divisoria</span>
                        <span className="font-mono text-indigo-400 font-bold">
                          {Math.round((element.binding.splitRatio ?? 0.5) * 100)}% / {100 - Math.round((element.binding.splitRatio ?? 0.5) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={Math.round((element.binding.splitRatio ?? 0.5) * 100)}
                        onChange={(e) => updateBinding('splitRatio', parseInt(e.target.value) / 100)}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  )}

                  {/* Restablecer proporción a 50/50 */}
                  <button
                    type="button"
                    onClick={() => {
                      updateBinding('splitRatio', 0.5);
                      updateBinding('splitRatioH', 0.5);
                      updateBinding('splitRatioV', 0.5);
                    }}
                    className="w-full py-1.5 px-2.5 rounded bg-[#1a1b1e] hover:bg-[#25272c] border border-[#2f3136] text-[#9ca3af] hover:text-white text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Centrar Divisores (50% / 50%)</span>
                  </button>

                  {/* Estado de Slots y controles anidados */}
                  <div className="pt-2 border-t border-[#2f3136]">
                    <div className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider mb-2">
                      Controles por Panel
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(element.binding.splitSlots || {}).map(([sKey, sItems]: [string, any]) => (
                        <div
                          key={sKey}
                          className="flex items-center justify-between p-1.5 rounded bg-[#1a1b1e] border border-[#2f3136] text-[11px]"
                        >
                          <span className="text-slate-300 font-mono capitalize">{sKey}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#9ca3af]">
                              {Array.isArray(sItems) ? sItems.length : 0} controles
                            </span>
                            {Array.isArray(sItems) && sItems.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const current = { ...(element.binding.splitSlots || {}) };
                                  delete current[sKey];
                                  updateBinding('splitSlots', current);
                                }}
                                title="Vaciar este panel"
                                className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                              >
                                Vaciar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* 1.3 Template & Expressions */}
            <CollapsibleSection
              id="binding_template"
              title="Plantilla de Expresión"
              icon={Wand2}
              accentColor="#6366f1"
              isOpen={!!openSections['binding_template']}
              onToggle={() => toggleSection('binding_template')}
            >
              <div className="space-y-2.5">
                {/* Field chips */}
                {tableFields.length > 0 && element.type !== 'table' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-[#9ca3af] uppercase">Insertar campos</span>
                      <span className="text-[10px] text-[#5865f2]">Clic para añadir</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-[#1a1b1e] rounded-md border border-[#2f3136]">
                      {tableFields.map((f, fIdx) => (
                        <button
                          key={`btn_ins_fld_${f}_${fIdx}`}
                          type="button"
                          onClick={() => {
                            const current = element.binding.template || '';
                            updateBinding('template', `${current}{{${f}}}`);
                          }}
                          className="px-1.5 py-0.5 bg-[#25282c] hover:bg-[#2f3136] border border-[#373a40] hover:border-[#5865f2] rounded text-[10px] font-mono text-[#e1e1e6] hover:text-white transition"
                          title={`Insertar {{${f}}}`}
                        >
                          +{f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                    {element.type === 'table' ? 'Título del Encabezado' : 'Fórmula de Texto'}
                  </label>
                  <textarea
                    rows={2}
                    value={element.binding.template || ''}
                    onChange={(e) => updateBinding('template', e.target.value)}
                    placeholder={element.type === 'table' ? 'Ej: Listado de Facturación Mensual' : 'Ej: Cliente: {{nombre}} - {{precio}}€'}
                    className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#5865f2] font-mono text-xs text-[#e1e1e6] placeholder-[#6b7280]"
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* 1.4 Filtering & Sorting */}
            <CollapsibleSection
              id="binding_filters"
              title="Filtro & Ordenación"
              icon={Filter}
              accentColor="#06b6d4"
              badge={element.binding.filterField ? `Filtro: ${element.binding.filterField}` : undefined}
              isOpen={!!openSections['binding_filters']}
              onToggle={() => toggleSection('binding_filters')}
            >
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Filtrar por campo</label>
                    <select
                      value={element.binding.filterField || ''}
                      onChange={(e) => updateBinding('filterField', e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                    >
                      <option value="">-- Sin filtro --</option>
                      {tableFields.map((f, fIdx) => (
                        <option key={`flt_fld_${f}_${fIdx}`} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Valor contiene</label>
                    <input
                      type="text"
                      value={element.binding.filterValue || ''}
                      onChange={(e) => updateBinding('filterValue', e.target.value)}
                      placeholder="Texto a buscar..."
                      className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Ordenar por</label>
                    <select
                      value={element.binding.sortField || ''}
                      onChange={(e) => updateBinding('sortField', e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                    >
                      <option value="">-- Por defecto --</option>
                      {tableFields.map((f, fIdx) => (
                        <option key={`sort_fld_${f}_${fIdx}`} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Dirección</label>
                    <select
                      value={element.binding.sortOrder || 'asc'}
                      onChange={(e) => updateBinding('sortOrder', e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                    >
                      <option value="asc">Ascendente (A-Z)</option>
                      <option value="desc">Descendente (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* 1.4b Consumer Control Filter Dependencies Section */}
            {element.type !== 'filter' && element.type !== 'divider' && element.type !== 'container' && (
              <CollapsibleSection
                id="binding_dependencies"
                title="Filtros que Controlan este Elemento"
                icon={Network}
                accentColor="#06b6d4"
                badge={
                  allDocumentElements ? (
                    <span className="text-[10px] font-mono text-[#06b6d4]">
                      {allDocumentElements.filter(item => {
                        if (item.element.type !== 'filter' && item.element.type !== 'drilldown') return false;
                        const targets = item.element.binding?.targetControlIds || [];
                        const isAll = targets.length === 0 || targets.includes('*');
                        return isAll || targets.includes(element.id);
                      }).length} filtros
                    </span>
                  ) : undefined
                }
                isOpen={openSections['binding_dependencies'] !== false}
                onToggle={() => toggleSection('binding_dependencies')}
              >
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#9ca3af]">
                      Filtros y Drill-downs que afectan los datos de este control.
                    </p>
                    {onOpenDependenciesTab && (
                      <button
                        type="button"
                        onClick={onOpenDependenciesTab}
                        className="text-[10px] text-[#06b6d4] hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2"
                      >
                        <span>Matriz</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {/* List of document filters */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                    {allDocumentElements && allDocumentElements.filter(item => item.element.type === 'filter' || item.element.type === 'drilldown').length > 0 ? (
                      allDocumentElements
                        .filter(item => item.element.type === 'filter' || item.element.type === 'drilldown')
                        .map(filterItem => {
                          const fEl = filterItem.element;
                          const fTargets = fEl.binding?.targetControlIds || [];
                          const isTargetAll = fTargets.length === 0 || fTargets.includes('*');
                          const isTargeted = isTargetAll || fTargets.includes(element.id);

                          return (
                            <div
                              key={`ctl_dep_${fEl.id}`}
                              className={`p-2 rounded border flex items-center justify-between text-xs transition ${
                                isTargeted
                                  ? 'bg-[#06b6d4]/10 border-[#06b6d4]/30 text-white'
                                  : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af]'
                              }`}
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                  <span>{fEl.name || 'Filtro'}</span>
                                  <span className="text-[9px] px-1 rounded bg-[#25282c] text-[#9ca3af] font-mono">
                                    {filterItem.pageName}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#9ca3af] font-mono mt-0.5">
                                  Campo: {fEl.binding?.field || 'Todos'} • Ámbito: {fEl.binding?.filterPageScope === 'all' ? 'Todo el doc' : fEl.binding?.filterPageScope === 'selected' ? 'Páginas sel.' : 'Esta página'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  let nextTargets: string[];
                                  if (isTargeted) {
                                    if (isTargetAll) {
                                      nextTargets = (allDocumentElements || [])
                                        .filter(i => i.element.id !== fEl.id && i.element.id !== element.id && i.element.type !== 'filter' && i.element.type !== 'divider' && i.element.type !== 'container')
                                        .map(i => i.element.id);
                                      if (nextTargets.length === 0) nextTargets = ['__none__'];
                                    } else {
                                      nextTargets = fTargets.filter(id => id !== element.id && id !== '*');
                                      if (nextTargets.length === 0) nextTargets = ['__none__'];
                                    }
                                  } else {
                                    nextTargets = [...fTargets.filter(id => id !== '__none__' && id !== '*'), element.id];
                                  }

                                  const updatedFilter: CanvasElement = {
                                    ...fEl,
                                    binding: {
                                      ...fEl.binding,
                                      targetControlIds: nextTargets
                                    }
                                  };
                                  onChangeElement(updatedFilter);
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition shrink-0 cursor-pointer ${
                                  isTargeted
                                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-900'
                                    : 'bg-[#25282c] text-[#9ca3af] hover:text-white border border-[#373a40]'
                                }`}
                              >
                                {isTargeted ? 'Vinculado ✓' : '+ Vincular'}
                              </button>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-[11px] text-[#6b7280] italic text-center py-2">
                        No hay filtros ni drill-downs en el documento.
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* 1.5 Live Evaluation Summary */}
            <CollapsibleSection
              id="binding_preview"
              title="Resumen de Evaluación"
              icon={CheckCircle2}
              accentColor="#22c55e"
              isOpen={!!openSections['binding_preview']}
              onToggle={() => toggleSection('binding_preview')}
            >
              <div className="text-xs text-white font-medium bg-[#1a1b1e] p-2.5 rounded border border-[#2f3136] break-words">
                {liveEvaluated || <span className="text-[#6b7280] italic">Sin datos evaluados en este control</span>}
              </div>
            </CollapsibleSection>
          </>
        )}

        {/* ======================================================== */}
        {/* GROUP 2: TYPOGRAPHY & CONTENT (TIPOGRAFÍA)              */}
        {/* ======================================================== */}
        {showTypography && (
          <CollapsibleSection
            id="style_typography"
            title="Tipografía & Texto"
            icon={Type}
            accentColor="#eab308"
            badge={`${element.style.fontSize || 14}px • ${element.style.fontWeight || 'normal'}`}
            isOpen={!!openSections['style_typography']}
            onToggle={() => toggleSection('style_typography')}
          >
            <div className="space-y-3">
              {/* Text Color */}
              <div>
                <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                  Color de Texto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={element.style.color || '#0f172a'}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="w-7 h-7 rounded border border-[#2f3136] cursor-pointer p-0.5 bg-[#1a1b1e]"
                  />
                  <input
                    type="text"
                    value={element.style.color || '#0f172a'}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="flex-1 px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                  />
                </div>
              </div>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#9ca3af] block mb-0.5">Tamaño Fuente (px)</label>
                  <input
                    type="number"
                    min={8}
                    max={72}
                    value={element.style.fontSize || 14}
                    onChange={(e) => updateStyle('fontSize', parseInt(e.target.value) || 14)}
                    className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9ca3af] block mb-0.5">Peso (Weight)</label>
                  <select
                    value={element.style.fontWeight || 'normal'}
                    onChange={(e) => updateStyle('fontWeight', e.target.value)}
                    className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-medium text-[#e1e1e6]"
                  >
                    <option value="normal">Normal</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semibold (600)</option>
                    <option value="bold">Bold (Negrita)</option>
                  </select>
                </div>
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                  Alineación de Texto
                </label>
                <div className="flex bg-[#1a1b1e] p-1 rounded-md border border-[#2f3136]">
                  {(['left', 'center', 'right'] as const).map(align => (
                    <button
                      key={`align_${align}`}
                      type="button"
                      onClick={() => updateStyle('textAlign', align)}
                      className={`flex-1 py-1 flex items-center justify-center rounded text-xs capitalize transition ${
                        (element.style.textAlign || 'left') === align ? 'bg-[#5865f2] text-white shadow-xs font-bold' : 'text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      {align === 'left' && <AlignLeft className="w-4 h-4" />}
                      {align === 'center' && <AlignCenter className="w-4 h-4" />}
                      {align === 'right' && <AlignRight className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* ======================================================== */}
        {/* GROUP 3: STYLING & APPEARANCE (ESTILO Y APARIENCIA)     */}
        {/* ======================================================== */}
        {showStyling && (
          <>
            {/* 3.1 Background & Fill */}
            <CollapsibleSection
              id="style_background"
              title="Fondo & Relleno"
              icon={Palette}
              accentColor="#3b82f6"
              badge={element.style.backgroundColor || 'transparent'}
              isOpen={!!openSections['style_background']}
              onToggle={() => toggleSection('style_background')}
            >
              <div>
                <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                  Color de Fondo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={element.style.backgroundColor && element.style.backgroundColor !== 'transparent' ? element.style.backgroundColor : '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="w-7 h-7 rounded border border-[#2f3136] cursor-pointer p-0.5 bg-[#1a1b1e]"
                  />
                  <input
                    type="text"
                    value={element.style.backgroundColor || ''}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    placeholder="transparent o #ffffff"
                    className="flex-1 px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                  />
                  <button
                    type="button"
                    onClick={() => updateStyle('backgroundColor', 'transparent')}
                    className="px-2 py-1 bg-[#25282c] hover:bg-[#2f3136] border border-[#373a40] rounded text-[11px] text-[#e1e1e6]"
                  >
                    Vacío
                  </button>
                </div>
              </div>
            </CollapsibleSection>

            {/* 3.2 Borders & Corners */}
            <CollapsibleSection
              id="style_borders"
              title="Bordes & Esquinas"
              icon={Square}
              accentColor="#f97316"
              badge={element.style.borderWidth ? `${element.style.borderWidth}px (${element.style.borderStyle || 'solid'})` : 'Sin borde'}
              isOpen={!!openSections['style_borders']}
              onToggle={() => toggleSection('style_borders')}
            >
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Grosor (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={element.style.borderWidth || 0}
                      onChange={(e) => {
                        const bw = parseInt(e.target.value) || 0;
                        updateStyle('borderWidth', bw);
                        if (bw > 0 && !element.style.borderStyle) {
                          updateStyle('borderStyle', 'solid');
                          updateStyle('borderColor', '#2f3136');
                        }
                      }}
                      className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Radio (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={element.style.borderRadius || 0}
                      onChange={(e) => updateStyle('borderRadius', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Estilo</label>
                    <select
                      value={element.style.borderStyle || 'none'}
                      onChange={(e) => updateStyle('borderStyle', e.target.value)}
                      className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                    >
                      <option value="none">Ninguno</option>
                      <option value="solid">Sólido</option>
                      <option value="dashed">Guiones</option>
                      <option value="dotted">Puntos</option>
                    </select>
                  </div>
                </div>

                {element.style.borderWidth && element.style.borderWidth > 0 ? (
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Color de Borde</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={element.style.borderColor || '#2f3136'}
                        onChange={(e) => updateStyle('borderColor', e.target.value)}
                        className="w-7 h-7 rounded border border-[#2f3136] cursor-pointer p-0.5 bg-[#1a1b1e]"
                      />
                      <input
                        type="text"
                        value={element.style.borderColor || '#2f3136'}
                        onChange={(e) => updateStyle('borderColor', e.target.value)}
                        className="flex-1 px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </CollapsibleSection>

            {/* 3.3 Effects, Padding & Opacity */}
            <CollapsibleSection
              id="style_effects"
              title="Efectos & Espaciado"
              icon={Sparkles}
              accentColor="#a855f7"
              badge={`Pad: ${element.style.padding ?? 8}px • Op: ${Math.round((element.style.opacity ?? 1) * 100)}%`}
              isOpen={!!openSections['style_effects']}
              onToggle={() => toggleSection('style_effects')}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Padding Interior (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={element.style.padding !== undefined ? element.style.padding : 8}
                      onChange={(e) => updateStyle('padding', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9ca3af] block mb-0.5">Sombra de Caja</label>
                    <select
                      value={element.style.shadow || 'none'}
                      onChange={(e) => updateStyle('shadow', e.target.value)}
                      className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-medium text-[#e1e1e6]"
                    >
                      <option value="none">Sin sombra</option>
                      <option value="sm">Suave (sm)</option>
                      <option value="md">Media (md)</option>
                      <option value="lg">Pronunciada (lg)</option>
                    </select>
                  </div>
                </div>

                {/* Opacity Control (0 - 100%) */}
                <div className="pt-2 border-t border-[#2f3136] space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Opacidad del Elemento</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round((element.style.opacity !== undefined ? element.style.opacity : 1) * 100)}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          updateStyle('opacity', val / 100);
                        }}
                        className="w-12 px-1.5 py-0.5 bg-[#141517] border border-[#2f3136] rounded text-right text-xs font-mono font-bold text-white focus:outline-none focus:border-[#5865f2]"
                      />
                      <span className="text-[10px] font-mono text-[#9ca3af]">%</span>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#6b7280]">0%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((element.style.opacity !== undefined ? element.style.opacity : 1) * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateStyle('opacity', val / 100);
                      }}
                      className="flex-1 h-1.5 bg-[#141517] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                    <span className="text-[10px] font-mono text-[#6b7280]">100%</span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[
                      { label: '10%', val: 0.1 },
                      { label: '25%', val: 0.25 },
                      { label: '50%', val: 0.5 },
                      { label: '75%', val: 0.75 },
                      { label: '100%', val: 1.0 }
                    ].map((preset) => {
                      const currentPct = Math.round((element.style.opacity !== undefined ? element.style.opacity : 1) * 100);
                      const isCurrent = currentPct === Math.round(preset.val * 100);
                      return (
                        <button
                          key={`op_preset_${preset.label}`}
                          type="button"
                          onClick={() => updateStyle('opacity', preset.val)}
                          className={`py-1 text-[10px] font-mono rounded border transition ${
                            isCurrent
                              ? 'bg-[#5865f2] text-white border-[#5865f2] font-bold shadow-xs'
                              : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#9ca3af] hover:text-white border-[#2f3136]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* 3.4 Box Shadow (Sombra de Caja Avanzada) */}
            <CollapsibleSection
              id="style_shadow"
              title="Sombra de Caja (Box Shadow)"
              icon={Sliders}
              accentColor="#8b5cf6"
              badge={
                element.style.shadow === 'none' || (!element.style.shadow && !element.style.shadowBlur && !element.style.shadowOffsetY)
                  ? 'Ninguna'
                  : element.style.shadow === 'sm'
                  ? 'Sutil (sm)'
                  : element.style.shadow === 'md'
                  ? 'Media (md)'
                  : element.style.shadow === 'lg'
                  ? 'Pronunciada (lg)'
                  : element.style.shadow === 'xl'
                  ? 'Flotante (xl)'
                  : element.style.shadow === 'glow'
                  ? 'Resplandor'
                  : 'Personalizada'
              }
              isOpen={!!openSections['style_shadow']}
              onToggle={() => toggleSection('style_shadow')}
            >
              <div className="space-y-3.5">
                {/* Shadow Presets */}
                <div>
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider block mb-1.5">
                    Preajustes de Sombra
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'Ninguna', ox: 0, oy: 0, blur: 0, spread: 0, color: 'rgba(0,0,0,0)' },
                      { id: 'sm', label: 'Sutil (sm)', ox: 0, oy: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.18)' },
                      { id: 'md', label: 'Media (md)', ox: 0, oy: 6, blur: 12, spread: -1, color: 'rgba(0,0,0,0.28)' },
                      { id: 'lg', label: 'Elevada (lg)', ox: 0, oy: 12, blur: 24, spread: -2, color: 'rgba(0,0,0,0.38)' },
                      { id: 'xl', label: 'Flotante (xl)', ox: 0, oy: 20, blur: 35, spread: -4, color: 'rgba(0,0,0,0.48)' },
                      { id: 'glow', label: 'Glow Azul', ox: 0, oy: 0, blur: 20, spread: 2, color: 'rgba(88,101,242,0.55)' },
                    ].map((p) => {
                      const isSelected = element.style.shadow === p.id;
                      return (
                        <button
                          key={`shadow_preset_${p.id}`}
                          type="button"
                          onClick={() => {
                            onChangeElement({
                              ...element,
                              style: {
                                ...element.style,
                                shadow: p.id as any,
                                shadowOffsetX: p.ox,
                                shadowOffsetY: p.oy,
                                shadowBlur: p.blur,
                                shadowSpread: p.spread,
                                shadowColor: p.color
                              }
                            });
                          }}
                          className={`py-1.5 px-2 text-xs font-semibold rounded border transition text-center cursor-pointer ${
                            isSelected
                              ? 'bg-[#5865f2] text-white border-[#5865f2] shadow-xs'
                              : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#9ca3af] hover:text-white border-[#2f3136]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Shadow Sliders */}
                <div className="pt-2 border-t border-[#2f3136] space-y-3">
                  <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider flex items-center justify-between">
                    <span>Ajustes Personalizados</span>
                    <span className="text-[#6b7280] font-mono text-[9px]">X Y Blur Spread</span>
                  </div>

                  {/* Offset Y / Depth Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#9ca3af] text-[11px]">Profundidad / Offset Y</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={-40}
                          max={60}
                          value={element.style.shadowOffsetY !== undefined ? element.style.shadowOffsetY : (element.style.shadow === 'lg' ? 10 : element.style.shadow === 'md' ? 4 : element.style.shadow === 'sm' ? 1 : 0)}
                          onChange={(e) => updateStyle('shadowOffsetY', parseInt(e.target.value) || 0)}
                          className="w-12 px-1.5 py-0.5 bg-[#141517] border border-[#2f3136] rounded text-right text-xs font-mono text-white focus:outline-none focus:border-[#5865f2]"
                        />
                        <span className="text-[10px] font-mono text-[#9ca3af]">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={60}
                      value={element.style.shadowOffsetY !== undefined ? element.style.shadowOffsetY : (element.style.shadow === 'lg' ? 10 : element.style.shadow === 'md' ? 4 : element.style.shadow === 'sm' ? 1 : 0)}
                      onChange={(e) => updateStyle('shadowOffsetY', parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-[#141517] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                  </div>

                  {/* Offset X Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#9ca3af] text-[11px]">Desplazamiento X</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={-40}
                          max={40}
                          value={element.style.shadowOffsetX !== undefined ? element.style.shadowOffsetX : 0}
                          onChange={(e) => updateStyle('shadowOffsetX', parseInt(e.target.value) || 0)}
                          className="w-12 px-1.5 py-0.5 bg-[#141517] border border-[#2f3136] rounded text-right text-xs font-mono text-white focus:outline-none focus:border-[#5865f2]"
                        />
                        <span className="text-[10px] font-mono text-[#9ca3af]">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      value={element.style.shadowOffsetX !== undefined ? element.style.shadowOffsetX : 0}
                      onChange={(e) => updateStyle('shadowOffsetX', parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-[#141517] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                  </div>

                  {/* Blur Radius Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#9ca3af] text-[11px]">Desenfoque (Blur)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={element.style.shadowBlur !== undefined ? element.style.shadowBlur : (element.style.shadow === 'lg' ? 24 : element.style.shadow === 'md' ? 12 : element.style.shadow === 'sm' ? 4 : element.style.shadow === 'glow' ? 20 : 0)}
                          onChange={(e) => updateStyle('shadowBlur', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 px-1.5 py-0.5 bg-[#141517] border border-[#2f3136] rounded text-right text-xs font-mono text-white focus:outline-none focus:border-[#5865f2]"
                        />
                        <span className="text-[10px] font-mono text-[#9ca3af]">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={element.style.shadowBlur !== undefined ? element.style.shadowBlur : (element.style.shadow === 'lg' ? 24 : element.style.shadow === 'md' ? 12 : element.style.shadow === 'sm' ? 4 : element.style.shadow === 'glow' ? 20 : 0)}
                      onChange={(e) => updateStyle('shadowBlur', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-1.5 bg-[#141517] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                  </div>

                  {/* Spread Radius Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#9ca3af] text-[11px]">Expansión (Spread)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={-20}
                          max={40}
                          value={element.style.shadowSpread !== undefined ? element.style.shadowSpread : 0}
                          onChange={(e) => updateStyle('shadowSpread', parseInt(e.target.value) || 0)}
                          className="w-12 px-1.5 py-0.5 bg-[#141517] border border-[#2f3136] rounded text-right text-xs font-mono text-white focus:outline-none focus:border-[#5865f2]"
                        />
                        <span className="text-[10px] font-mono text-[#9ca3af]">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={40}
                      value={element.style.shadowSpread !== undefined ? element.style.shadowSpread : 0}
                      onChange={(e) => updateStyle('shadowSpread', parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-[#141517] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                  </div>
                </div>

                {/* Shadow Color Control & Swatches */}
                <div className="pt-2 border-t border-[#2f3136] space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider block">
                    Color de la Sombra
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        element.style.shadowColor?.startsWith('#')
                          ? element.style.shadowColor
                          : '#000000'
                      }
                      onChange={(e) => updateStyle('shadowColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#373a40] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={element.style.shadowColor || 'rgba(0, 0, 0, 0.25)'}
                      onChange={(e) => updateStyle('shadowColor', e.target.value)}
                      placeholder="rgba(...) o #hex"
                      className="flex-1 px-2 py-1 bg-[#141517] border border-[#2f3136] rounded text-xs font-mono text-white focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* Quick Color Chips */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: 'Negro 25%', color: 'rgba(0, 0, 0, 0.25)', bg: '#000000' },
                      { label: 'Negro 50%', color: 'rgba(0, 0, 0, 0.5)', bg: '#000000' },
                      { label: 'Índigo', color: 'rgba(88, 101, 242, 0.5)', bg: '#5865f2' },
                      { label: 'Cyan', color: 'rgba(6, 182, 212, 0.5)', bg: '#06b6d4' },
                      { label: 'Esmeralda', color: 'rgba(16, 185, 129, 0.5)', bg: '#10b981' },
                      { label: 'Ámbar', color: 'rgba(245, 158, 11, 0.5)', bg: '#f59e0b' },
                      { label: 'Rosa', color: 'rgba(244, 63, 94, 0.5)', bg: '#f43f5e' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => updateStyle('shadowColor', chip.color)}
                        title={chip.label}
                        className="w-5 h-5 rounded-full border border-[#373a40] hover:scale-110 transition shadow-xs flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: chip.bg }}
                      />
                    ))}
                  </div>
                </div>

                {/* Shadow Live Preview Box */}
                <div className="pt-2 border-t border-[#2f3136]">
                  <div className="p-4 bg-[#141517] rounded-lg border border-[#2f3136] flex items-center justify-center">
                    <div
                      className="w-24 h-12 bg-[#202225] border border-[#2f3136] rounded-md flex items-center justify-center text-[10px] font-semibold text-[#e1e1e6] transition-all"
                      style={{
                        boxShadow: (() => {
                          const ox = element.style.shadowOffsetX !== undefined ? element.style.shadowOffsetX : (element.style.shadow === 'lg' ? 0 : element.style.shadow === 'md' ? 0 : element.style.shadow === 'sm' ? 0 : 0);
                          const oy = element.style.shadowOffsetY !== undefined ? element.style.shadowOffsetY : (element.style.shadow === 'lg' ? 10 : element.style.shadow === 'md' ? 4 : element.style.shadow === 'sm' ? 1 : 0);
                          const blur = element.style.shadowBlur !== undefined ? element.style.shadowBlur : (element.style.shadow === 'lg' ? 24 : element.style.shadow === 'md' ? 12 : element.style.shadow === 'sm' ? 4 : element.style.shadow === 'glow' ? 20 : 0);
                          const spread = element.style.shadowSpread !== undefined ? element.style.shadowSpread : 0;
                          const col = element.style.shadowColor || 'rgba(0, 0, 0, 0.35)';
                          return `${ox}px ${oy}px ${blur}px ${spread}px ${col}`;
                        })()
                      }}
                    >
                      Vista Previa
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </>
        )}

        {/* ======================================================== */}
        {/* GROUP 4: POSITION & LAYOUT (POSICIÓN Y DISPOSICIÓN)      */}
        {/* ======================================================== */}
        {showPosition && (
          <>
            {/* 4.1 Coordinates & Size */}
            <CollapsibleSection
              id="pos_coordinates"
              title="Posición & Dimensiones"
              icon={Layout}
              accentColor="#14b8a6"
              badge={`${Math.round(element.width)} × ${Math.round(element.height)} px`}
              isOpen={!!openSections['pos_coordinates']}
              onToggle={() => toggleSection('pos_coordinates')}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#9ca3af] block mb-0.5">Posición X (px)</label>
                  <input
                    type="number"
                    value={Math.round(element.x)}
                    onChange={(e) => onChangeElement({ ...element, x: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9ca3af] block mb-0.5">Posición Y (px)</label>
                  <input
                    type="number"
                    value={Math.round(element.y)}
                    onChange={(e) => onChangeElement({ ...element, y: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9ca3af] block mb-0.5">Ancho (W)</label>
                  <input
                    type="number"
                    min={40}
                    value={Math.round(element.width)}
                    onChange={(e) => onChangeElement({ ...element, width: Math.max(40, parseInt(e.target.value) || 40) })}
                    className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9ca3af] block mb-0.5">Alto (H)</label>
                  <input
                    type="number"
                    min={25}
                    value={Math.round(element.height)}
                    onChange={(e) => onChangeElement({ ...element, height: Math.max(25, parseInt(e.target.value) || 25) })}
                    className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
                  />
                </div>
              </div>

              {/* Lock Aspect Ratio Checkbox */}
              <div className="pt-2 border-t border-[#2f3136] mt-2">
                <label className="flex items-center justify-between p-2 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] rounded-md transition cursor-pointer group select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!element.lockAspectRatio}
                      onChange={(e) => onChangeElement({ ...element, lockAspectRatio: e.target.checked })}
                      className="w-4 h-4 rounded border-[#373a40] text-[#5865f2] bg-[#25282c] focus:ring-0 cursor-pointer accent-[#5865f2]"
                    />
                    <div className="flex items-center gap-1.5 text-xs text-[#e1e1e6]">
                      {element.lockAspectRatio ? (
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-[#9ca3af]" />
                      )}
                      <span className="font-semibold text-white">Bloquear Proporción de Aspecto</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    element.lockAspectRatio
                      ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                      : 'bg-[#25282c] text-[#9ca3af]'
                  }`}>
                    {element.lockAspectRatio ? 'Fijada (1:1)' : 'Libre'}
                  </span>
                </label>
                <p className="text-[10px] text-[#9ca3af] mt-1 px-1">
                  Evita la deformación al redimensionar con los manejadores de arrastre.
                </p>
              </div>
            </CollapsibleSection>

            {/* 4.2 Fit to Content (Ajustar al Contenido) */}
            <CollapsibleSection
              id="pos_fit_content"
              title="Ajustar al Contenido (Fit to Content)"
              icon={BoxSelect}
              accentColor="#06b6d4"
              badge={`${detectedChildren.length} hijos`}
              isOpen={!!openSections['pos_fit_content']}
              onToggle={() => toggleSection('pos_fit_content')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#e1e1e6]">Elementos contenidos / hijos:</span>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                    detectedChildren.length > 0
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-[#1a1b1e] text-[#9ca3af] border border-[#2f3136]'
                  }`}>
                    {detectedChildren.length} elementos
                  </span>
                </div>

                {/* Configurable Padding Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-[#9ca3af] font-semibold">Padding de ajuste (px):</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={64}
                        value={fitPadding}
                        onChange={(e) => setFitPadding(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 px-1.5 py-0.5 bg-[#141517] border border-[#2f3136] rounded text-right text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                      />
                      <span className="text-[10px] font-mono text-[#9ca3af]">px</span>
                    </div>
                  </div>

                  {/* Padding Presets */}
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 8, 16, 24, 32].map((pVal) => (
                      <button
                        key={`fit_pad_${pVal}`}
                        type="button"
                        onClick={() => {
                          setFitPadding(pVal);
                          handleFitToContent(pVal);
                        }}
                        className={`py-1 text-[10px] font-mono rounded border transition cursor-pointer ${
                          fitPadding === pVal
                            ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                            : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#9ca3af] hover:text-white border-[#2f3136]'
                        }`}
                      >
                        {pVal}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Action Button */}
                <button
                  type="button"
                  disabled={detectedChildren.length === 0}
                  onClick={() => handleFitToContent()}
                  className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BoxSelect className="w-4 h-4" />
                  <span>Ajustar Dimensiones al Contenido</span>
                </button>

                {/* Feedback message */}
                {fitFeedback && (
                  <div className="p-2 bg-cyan-950/40 border border-cyan-500/40 rounded text-center text-xs text-cyan-300 font-semibold animate-in fade-in">
                    {fitFeedback}
                  </div>
                )}

                {/* Detected Children Names Pill List */}
                {detectedChildren.length > 0 && (
                  <div className="pt-2 border-t border-[#2f3136] space-y-1">
                    <span className="text-[10px] text-[#9ca3af] block">Contenido detectado:</span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {detectedChildren.map((ch) => (
                        <span
                          key={ch.id}
                          onClick={() => onSelectElementById?.(ch.id)}
                          className="px-1.5 py-0.5 text-[9px] bg-[#141517] hover:bg-[#25282c] border border-[#2f3136] hover:border-cyan-500/40 text-[#e1e1e6] rounded font-mono truncate max-w-[120px] cursor-pointer transition"
                          title={`Click para seleccionar ${ch.name}`}
                        >
                          {ch.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* 4.2 Quick Alignment */}
            <CollapsibleSection
              id="pos_alignment"
              title="Alineación Rápida"
              icon={AlignJustify}
              accentColor="#3b82f6"
              isOpen={!!openSections['pos_alignment']}
              onToggle={() => toggleSection('pos_alignment')}
            >
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onChangeElement({ ...element, x: 20 })}
                  className="py-1 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] rounded text-center truncate text-[#e1e1e6] transition"
                >
                  Izq (X=20)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeElement({ ...element, x: Math.max(0, Math.round((canvasWidth - element.width) / 2)) })}
                  className="py-1 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] rounded text-center font-semibold text-[#5865f2] truncate transition"
                >
                  Centrar H
                </button>
                <button
                  type="button"
                  onClick={() => onChangeElement({ ...element, x: Math.max(0, canvasWidth - element.width - 20) })}
                  className="py-1 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] rounded text-center truncate text-[#e1e1e6] transition"
                >
                  Der
                </button>
                <button
                  type="button"
                  onClick={() => onChangeElement({ ...element, y: 20 })}
                  className="py-1 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] rounded text-center truncate text-[#e1e1e6] transition"
                >
                  Arriba (Y=20)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeElement({ ...element, y: Math.max(0, Math.round((canvasHeight - element.height) / 2)) })}
                  className="py-1 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] rounded text-center font-semibold text-[#5865f2] truncate transition"
                >
                  Centrar V
                </button>
                <button
                  type="button"
                  onClick={() => onChangeElement({ ...element, y: Math.max(0, canvasHeight - element.height - 20) })}
                  className="py-1 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] rounded text-center truncate text-[#e1e1e6] transition"
                >
                  Abajo
                </button>
              </div>
            </CollapsibleSection>

            {/* 4.3 Layering & Z-Index */}
            <CollapsibleSection
              id="pos_layers"
              title="Capas & Z-Index"
              icon={Layers}
              accentColor="#6366f1"
              badge={`Nivel: ${element.zIndex ?? 0}`}
              isOpen={!!openSections['pos_layers']}
              onToggle={() => toggleSection('pos_layers')}
            >
              <div className="space-y-3">
                {/* Granular Z-Index Slider & Numeric Control */}
                <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Profundidad (z-index)</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        value={element.zIndex ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          onChangeElement({ ...element, zIndex: val });
                        }}
                        className="w-16 px-2 py-0.5 bg-[#25282c] border border-[#373a40] focus:border-indigo-500 rounded text-right text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Range Slider for Granular Modification */}
                  <div className="pt-1">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(50, Math.max(0, ...allElements.map(e => e.zIndex || 0)) + 10, (element.zIndex || 0) + 10)}
                      step="1"
                      value={element.zIndex ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onChangeElement({ ...element, zIndex: isNaN(val) ? 0 : val });
                      }}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#25282c] rounded-lg"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>0 (Fondo)</span>
                      <span className="text-indigo-400 font-semibold">Nivel {element.zIndex ?? 0}</span>
                      <span>{Math.max(50, Math.max(0, ...allElements.map(e => e.zIndex || 0)) + 10, (element.zIndex || 0) + 10)} (Frente)</span>
                    </div>
                  </div>

                  {/* Granular Step Buttons */}
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[#2f3136]/60">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onChangeElement({ ...element, zIndex: Math.max(0, (element.zIndex ?? 0) - 5) })}
                        title="Disminuir z-index en 5"
                        className="px-1.5 py-0.5 bg-[#25282c] hover:bg-[#2f3136] text-[10px] font-mono text-slate-300 rounded border border-[#373a40] transition cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeElement({ ...element, zIndex: Math.max(0, (element.zIndex ?? 0) - 1) })}
                        title="Disminuir z-index en 1"
                        className="px-2 py-0.5 bg-[#25282c] hover:bg-[#2f3136] text-[10px] font-mono text-slate-300 rounded border border-[#373a40] transition cursor-pointer"
                      >
                        -1
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400">Paso granular</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onChangeElement({ ...element, zIndex: (element.zIndex ?? 0) + 1 })}
                        title="Aumentar z-index en 1"
                        className="px-2 py-0.5 bg-[#25282c] hover:bg-[#2f3136] text-[10px] font-mono text-slate-300 rounded border border-[#373a40] transition cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeElement({ ...element, zIndex: (element.zIndex ?? 0) + 5 })}
                        title="Aumentar z-index en 5"
                        className="px-1.5 py-0.5 bg-[#25282c] hover:bg-[#2f3136] text-[10px] font-mono text-slate-300 rounded border border-[#373a40] transition cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>

                {/* Layer Stacking Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onBringToFront}
                    className="py-1.5 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] hover:border-[#5865f2] rounded flex items-center justify-center gap-1.5 text-[#e1e1e6] hover:text-white font-medium transition"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Traer al Frente</span>
                  </button>
                  <button
                    type="button"
                    onClick={onSendToBack}
                    className="py-1.5 px-2 bg-[#1a1b1e] hover:bg-[#2f3136] border border-[#373a40] hover:border-[#5865f2] rounded flex items-center justify-center gap-1.5 text-[#e1e1e6] hover:text-white font-medium transition"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Enviar al Fondo</span>
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          </>
        )}

      </div>
    )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#2f3136] bg-[#202225] flex items-center justify-between gap-2">
        <button
          onClick={onDuplicateElement}
          className="flex-1 py-1.5 px-2 bg-[#25282c] hover:bg-[#2f3136] border border-[#373a40] rounded-md text-xs font-semibold text-[#e1e1e6] flex items-center justify-center gap-1.5 transition"
        >
          <Copy className="w-3.5 h-3.5 text-[#9ca3af]" />
          <span>Duplicar</span>
        </button>
        <button
          onClick={onDeleteElement}
          className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-md text-xs font-semibold text-rose-300 flex items-center justify-center gap-1.5 transition"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Eliminar</span>
        </button>
      </div>

      {isQueryBuilderOpen && element && (
        <QueryBuilderModal
          isOpen={isQueryBuilderOpen}
          onClose={() => setIsQueryBuilderOpen(false)}
          element={element}
          onUpdateElement={onChangeElement}
          dbInfo={dbInfo}
          dbRecords={dbRecords}
        />
      )}

      {isDataPreviewOpen && element && (
        <DataPreviewModal
          isOpen={isDataPreviewOpen}
          onClose={() => setIsDataPreviewOpen(false)}
          tableName={element.binding.tableName || ''}
          tableInfo={selectedTableInfo}
          records={currentTableRecords}
          fields={tableFields}
          elementName={element.name}
          elementType={element.type}
        />
      )}
    </div>
  );
};
