export type ControlType =
  | 'text'
  | 'kpi'
  | 'table'
  | 'chart'
  | 'image'
  | 'badge'
  | 'qrcode'
  | 'container'
  | 'divider'
  | 'card'
  | 'drilldown'
  | 'detailCard'
  | 'matrix'
  | 'form'
  | 'filter'
  | 'minibrowser'
  | 'queryTable'
  | 'splitPanel';

export interface ElementStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | '500' | '600' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  padding?: number;
  opacity?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'custom' | 'glow';
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowColor?: string;
}

export type TransformationAggregationFn = 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface CalculatedFormulaField {
  id: string;
  name: string; // Identifier / column key e.g. "total_con_iva"
  label: string; // Display label e.g. "Total con IVA"
  formula: string; // Formula e.g. "[precio] * 1.21" or "[cantidad] * [precio]"
  format?: 'number' | 'currency' | 'percent' | 'string';
  decimals?: number; // Defaults to 2
}

export interface TableAggregationDef {
  id: string;
  field: string; // Target field, or '*' for count
  aggregation: TransformationAggregationFn; // 'sum' | 'avg' | 'count' | 'min' | 'max'
  label?: string; // Display label e.g. "Suma de Ventas"
}

export interface DataTransformationConfig {
  enabled?: boolean;
  // Mode:
  // - 'formulas': Calculate custom formula columns per row
  // - 'aggregate': Group by field and aggregate metrics (SUM, AVG, COUNT, etc.)
  // - 'both': Compute formulas first, then group by and aggregate
  mode?: 'formulas' | 'aggregate' | 'both';

  // Group By & Aggregation settings (used by both Charts and Tables)
  groupByField?: string; // Field to group by e.g. "categoria", "estado", "cliente"
  aggregateMetricField?: string; // Target numeric field to aggregate e.g. "monto", "precio"
  aggregateFunction?: TransformationAggregationFn; // 'sum' | 'avg' | 'count' | 'min' | 'max'
  tableAggregations?: TableAggregationDef[]; // Multiple aggregations for aggregated tables

  // Calculated formula fields
  calculatedFields?: CalculatedFormulaField[];

  // Custom formula specifically for Chart Y-values (e.g. "[precio] * [cantidad]")
  chartValueFormula?: string;

  // Table summary row (totals at bottom of table)
  showSummaryRow?: boolean;
  summaryRowAggregations?: Record<string, TransformationAggregationFn>; // e.g. { total: 'sum', precio: 'avg' }
}

export interface ElementDataBinding {
  tableName?: string;
  field?: string;
  template?: string; // e.g. "Factura #{{id}} - {{cliente}}"
  recordIndex?: number; // 0-based index or -1 for dynamic/first
  aggregation?: 'none' | 'count' | 'sum' | 'avg' | 'min' | 'max';
  filterField?: string;
  filterValue?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  // Data Transformation Step (Formulas & Aggregations)
  dataTransformation?: DataTransformationConfig;
  // Table pagination and row limit properties
  paginationMode?: 'limit' | 'paginated'; // 'limit' for fixed row count, 'paginated' for interactive navigation controls
  pageSize?: number; // Records per page when in paginated mode (e.g., 5, 10, 15, 20)
  showPaginationControls?: boolean; // Whether to display navigation controls in table footer (default true)
  paginationStyle?: 'full' | 'compact' | 'simple'; // Visual style of pagination buttons and info
  // Specific widget bindings
  columns?: string[]; // for table
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'series';
  labelField?: string;
  valueField?: string;
  chartColors?: string[];
  // Time & Multi-Series chart configuration
  timeField?: string; // Campo de tiempo en el eje X
  seriesField?: string; // Campo de la tabla que divide en múltiples series por cada valor distinto
  seriesAggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'; // Agregación de valores en cada punto
  showSeriesLegend?: boolean; // Mostrar leyenda de series
  showSeriesPoints?: boolean; // Mostrar puntos o marcadores en cada punto de la serie
  seriesCurve?: 'monotone' | 'linear' | 'step'; // Tipo de interpolación de línea
  timeSortOrder?: 'asc' | 'desc'; // Orden cronológico en el eje X
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  prefix?: string;
  suffix?: string;
  // External widgets bindings
  drillLevels?: string[]; // For drill-down navigation (e.g. ['categoria', 'subcategoria', 'producto'])
  drillFilterEnabled?: boolean; // When true (default), navigating drill levels filters targeted controls/tables
  drillPath?: DrillStep[]; // Initial or persisted drill path steps
  rowField?: string; // For matrix row dimension
  colField?: string; // For matrix column dimension
  rowFields?: string[]; // Multi-level hierarchy row fields (e.g. ['categoria', 'subcategoria'])
  colFields?: string[]; // Multi-level hierarchy column fields (e.g. ['anio', 'trimestre'])
  matrixShowSubtotals?: boolean; // Whether to display subtotal rows/columns for parent levels
  matrixShowGrandTotals?: boolean; // Whether to display grand totals
  matrixDefaultCollapsed?: boolean; // Initial grouping state: true = collapsed, false = expanded
  headerField?: string; // For detailCard title
  subHeaderField?: string; // For detailCard subtitle
  bodyField?: string; // For detailCard main body text
  footerField?: string; // For detailCard footer note
  formFields?: string[]; // For registration form inputs
  // Interactive canvas filter bindings
  filterDisplayMode?: 'dropdown' | 'checkbox_list'; // Display as dropdown or checkbox list
  targetControlIds?: string[]; // Array of element IDs to filter (empty or ['*'] for all compatible controls)
  filterPageScope?: 'current' | 'selected' | 'all'; // Page scope: current page, selected pages, or all pages
  targetPageIds?: string[]; // Array of page IDs/indices when scope is 'selected'
  filterSelectedValues?: string[]; // Currently selected active values in the filter
  filterPlaceholder?: string; // Custom placeholder or label for "All"
  // MiniBrowser external widget bindings
  browserUrl?: string; // Current URL or saved design address (e.g. 'db://Mi Diseño' or 'https://...')
  browserSourceType?: 'url' | 'saved_design'; // Target source type: web URL or database design
  savedDesignId?: string; // Unique ID of the saved design in Dexie database
  browserInteractive?: boolean; // Default interactive mode (pointer-events enabled on iframe)
  browserBookmarks?: MiniBrowserBookmark[]; // Internal list of favorites/bookmarks stored in element binding
  browserPinnedSidebar?: 'none' | 'history' | 'bookmarks'; // Fixed sidebar display mode (pinned History or Favorites)
  browserShowTitleBar?: boolean; // Show/hide title bar in preview mode (default: true)
  browserShowToolBar?: boolean; // Show/hide navigation tool bar in preview mode (default: true)
  browserShowTabsBar?: boolean; // Show/hide multi-page tabs navigation bar in preview mode (default: true)
  browserShowFooter?: boolean; // Show/hide status / zoom footer in preview mode (default: true)
  // QueryTable widget bindings
  querySql?: string; // SQL or structured query text
  queryParams?: QueryParamDefinition[]; // Defined query parameters
  savedQueries?: SavedQueryDefinition[]; // Collection of saved named queries
  activeQueryId?: string; // ID of the currently selected saved query
  destinationTableName?: string; // Target table name when saving query results to the database
  autoRunQuery?: boolean; // Whether to re-execute query automatically on param or data changes
  lastExecutedAt?: string; // Timestamp of last execution
  lastExecutionRowsCount?: number; // Number of rows returned by last execution
  lastExecutionDurationMs?: number; // Execution time in ms
  lastQueryError?: string; // Error message if query failed

  // SplitPanel resizable multi-panel container bindings
  splitOrientation?: 'vertical' | 'horizontal' | 'grid4';
  splitRatio?: number; // 0.1 to 0.9 (defaults to 0.5) for vertical or horizontal 2-panel split
  splitRatioH?: number; // 0.1 to 0.9 for grid4 horizontal split
  splitRatioV?: number; // 0.1 to 0.9 for grid4 vertical split
  splitSlots?: Record<string, any[]>; // Collection of dropped items per panel slot (e.g. 'panel-1', 'panel-2')
}

export interface QueryParamDefinition {
  name: string; // Identifier e.g. "minTotal"
  type: 'string' | 'number' | 'boolean' | 'date';
  label?: string; // Human friendly label
  defaultValue: any;
  currentValue?: any;
  description?: string;
}

export interface SavedQueryDefinition {
  id: string;
  name: string;
  querySql: string;
  description?: string;
  params?: QueryParamDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MiniBrowserBookmark {
  id: string;
  url: string;
  title: string;
  createdAt?: number;
}

export interface DrillStep {
  field: string;
  value: string;
}

export interface CanvasElement {
  id: string;
  type: ControlType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  style: ElementStyle;
  binding: ElementDataBinding;
  groupId?: string;
  isGroup?: boolean;
  childrenIds?: string[];
  lockAspectRatio?: boolean;
  colorTag?: string; // Preset color tag e.g. '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'
}

export interface CanvasPage {
  id: string;
  name: string;
  elements: CanvasElement[];
  backgroundColor?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
  tabColor?: string; // Custom label / tag color for the page tab (e.g. #ef4444, #10b981)
  colorTag?: string;
}

export interface DocumentElementWithPage {
  element: CanvasElement;
  pageId: string;
  pageName: string;
  pageIndex: number;
  isCurrentPage: boolean;
}

export interface CanvasDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  themeId?: string; // Predefined palette ID: 'light' | 'midnight' | 'solarized-dark' | 'solarized-light' | 'nord' | 'emerald' | 'cyberpunk' | 'high-contrast-dark' | 'high-contrast-light'
  highContrastMode?: boolean; // High Contrast Accessibility mode
  elements: CanvasElement[]; // Active page elements or fallback
  pages?: CanvasPage[]; // Multi-page support: list of pages / sheets
  activePageIndex?: number; // Currently selected page index (0-based)
  pageTabsPosition?: 'bottom' | 'left'; // Position of page tab labels: 'bottom' or 'left'
  showPageTabs?: boolean; // Toggle visibility of page tabs / sheet labels (true by default)
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  showRulers?: boolean;
  targetDatabase: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export interface TableInfo {
  name: string;
  schema: string;
  recordCount: number;
  sampleRecord?: Record<string, any>;
  fields: string[];
}

export interface DatabaseInfo {
  name: string;
  version: number;
  tables: TableInfo[];
  designsCount: number;
}

export interface TableRelationship {
  id: string;
  name: string; // e.g. "pedidos_a_clientes"
  sourceTable: string; // e.g. "pedidos"
  sourceField: string; // e.g. "cliente_id"
  targetTable: string; // e.g. "clientes"
  targetField: string; // e.g. "id"
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' | 'lookup';
  description?: string;
  createdAt: string;
}

export interface TableExcelLink {
  tableName: string;
  databaseName: string;
  fileName: string;
  sheetName: string;
  fileSize?: number;
  lastModified?: number;
  lastSyncedAt: string;
  rowCount: number;
  isLinked: boolean;
  autoRefreshIntervalMinutes?: number; // 0 = manual, 1, 5, 15, 30, etc.
}

export interface ExcelLinkedSource {
  databaseName: string;
  fileName: string;
  fileSize?: number;
  lastModified?: number;
  lastSyncedAt: string;
  sheetNames: string[];
  tablesMapping: { sheetName: string; tableName: string; rowCount: number }[];
  isLinked: boolean; // true if linked with local refresh support
}

export interface DatabaseExportJSON {
  databaseName: string;
  version?: number;
  tables: {
    name: string;
    schema: string;
    records: Record<string, any>[];
  }[];
  relationships?: TableRelationship[];
  canvasDesigns?: CanvasDocument[];
  excelLinkedSource?: ExcelLinkedSource;
}

export interface CanvasSnapshot {
  id: string;
  docId: string;
  docName: string;
  dbName: string;
  timestamp: number;
  createdAt: string;
  thumbnail: string;
  elementCount: number;
  dimensions: {
    width: number;
    height: number;
  };
  document: CanvasDocument;
  note?: string;
}

export type LibrarySyncMode = 'static' | 'linked';
export type LibraryRefreshMode = 'manual' | 'scheduled';

export interface LibraryFileNode {
  id: string;
  name: string;
  path: string; // e.g. "/index.html" or "/css/style.css"
  type: 'file' | 'folder';
  size: number;
  mimeType: string;
  lastModified: number;
  content?: string; // UTF-8 text or data: URL
  syncMode?: LibrarySyncMode;
  refreshMode?: LibraryRefreshMode;
  refreshIntervalSeconds?: number;
  lastRefreshed?: number;
  children?: LibraryFileNode[];
}

export interface LibraryRoot {
  id: string;
  dbName: string; // Name of the existing database this root is associated with
  name: string;   // Root name / alias e.g. "web", "assets", "docs", "public"
  description?: string;
  syncMode: LibrarySyncMode;
  refreshMode: LibraryRefreshMode;
  refreshIntervalSeconds?: number;
  lastRefreshed?: number;
  createdAt: number;
  updatedAt: number;
  fileCount?: number;
  totalSizeBytes?: number;
  sourceType?: 'manual' | 'uploaded-folder' | 'uploaded-files' | 'fs-access-linked';
  sourceFolderName?: string;
  tree: LibraryFileNode; // Root folder node representing "/"
}

export * from './types/linkTypes';

