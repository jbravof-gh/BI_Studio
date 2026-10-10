export type LinkWindowMode = 'editor' | 'viewer';

export interface HeaderButtonsConfig {
  branding: boolean;              // Dexie Canvas Studio logo & title
  dbSelector: boolean;            // Active DB selector dropdown in navbar
  dbManagerBtn: boolean;          // "Gestionar BD" button
  designNameInput: boolean;       // Document name editable input
  undoRedo: boolean;              // Deshacer / Rehacer buttons
  resetCanvas: boolean;           // Reset button (clean canvas)
  previewToggle: boolean;         // Previsualizar / Modo Edición button
  templateGallery: boolean;       // Plantillas button
  savedDesigns: boolean;          // Diseños BD button
  generateLayoutAi: boolean;      // Generar Layout AI button
  jsonMenu: boolean;              // Menú JSON (Importar/Exportar)
  exportModal: boolean;           // Exportar (Img/PDF) button
  exportHtmlZip: boolean;         // Exportar HTML (.zip) button
  pwaInstall: boolean;            // PWA / Instalar App button
  themeToggle: boolean;           // Dark / Light app theme toggle
  fullscreenToggle: boolean;      // Pantalla Completa button
}

export interface FooterElementsConfig {
  dimensions: boolean;            // Canvas dimensions (width × height px)
  elementsCount: boolean;         // Elements count & selection count
  pwaStatus: boolean;             // PWA Offline / Online badge
  snapshotButton: boolean;        // Tomar Instantánea + Historial de Versiones
  zoomControls: boolean;          // Zoom slider & - / + / 100% buttons
  gridControls: boolean;          // Reglas, Cuadrícula, Ajuste Rejilla (Snap), Dimensiones flotante
  themeSelector: boolean;         // Theme palette selector dropdown
  customThemeBtn: boolean;        // Tema Personalizado button
  appThemeToggle: boolean;        // Conmutador Tema UI footer
}

export interface EditorPanelsConfig {
  leftPalette: boolean;           // Show / hide left controls palette sidebar completely
  leftPaletteCollapsed: boolean;  // Start collapsed
  allowedControlTitles: string[]; // List of allowed preset control titles (e.g. 'Gráfico de Barras', 'Tarjeta KPI')
  allowedCategories: string[];    // Categories: 'charts' | 'data' | 'layout' | 'inputs'
  rightInspector: boolean;        // Show / hide right sidebar completely
  rightInspectorCollapsed: boolean;
  allowedRightTabs: ('inspector' | 'dependencies' | 'layers' | 'versions')[];
  dbManagerAllowed: boolean;      // If false, the Database Manager modal cannot be opened
}

export interface ViewerOptionsConfig {
  targetDesignName: string;       // Name of the saved design in the database to display
  autoFitToWindow: boolean;       // Fit zoom to browser window
  allowExport: boolean;           // Show export button in viewer
  allowFullscreen: boolean;       // Show fullscreen button in viewer
  allowPageNavigation: boolean;   // Allow switching pages if document has multiple pages
  allowInteractivity: boolean;    // Allow interacting with forms, drill-downs, filters
  themeOverride?: string;         // Optional theme override
}

export interface LinkWindowConfig {
  id: string;
  name: string;                   // Display title of this link / preset
  description?: string;           // Optional description
  createdAt: number;
  updatedAt: number;
  mode: LinkWindowMode;           // 'editor' | 'viewer'
  targetDatabase: string;         // Database to auto-activate upon window open (or '' for clean)
  headerButtons: HeaderButtonsConfig;
  footerElements: FooterElementsConfig;
  editorPanels: EditorPanelsConfig;
  viewerOptions: ViewerOptionsConfig;
}

export const DEFAULT_HEADER_BUTTONS: HeaderButtonsConfig = {
  branding: true,
  dbSelector: true,
  dbManagerBtn: true,
  designNameInput: true,
  undoRedo: true,
  resetCanvas: true,
  previewToggle: true,
  templateGallery: true,
  savedDesigns: true,
  generateLayoutAi: true,
  jsonMenu: true,
  exportModal: true,
  exportHtmlZip: true,
  pwaInstall: true,
  themeToggle: true,
  fullscreenToggle: true
};

export const DEFAULT_FOOTER_ELEMENTS: FooterElementsConfig = {
  dimensions: true,
  elementsCount: true,
  pwaStatus: true,
  snapshotButton: true,
  zoomControls: true,
  gridControls: true,
  themeSelector: true,
  customThemeBtn: true,
  appThemeToggle: true
};

export const ALL_CONTROL_TITLES: string[] = [
  'Gráfico de Barras',
  'Gráfico Circular (Pie)',
  'Gráfico de Líneas',
  'Series',
  'Tarjeta KPI',
  'Drill-Down',
  'Tabla de Datos (Límite Fijo)',
  'Tabla Paginada con Navegación',
  'QueryTable',
  'Matriz',
  'Ficha de Registro',
  'Ficha Detalle',
  'Caja / Tarjeta de Fondo',
  'Separador / Línea',
  'Panel 2 Verticales',
  'Panel 2 Horizontales',
  'Panel 4 Cuadrantes',
  'MiniBrowser',
  'Filtro Desplegable',
  'Filtro Lista de Casillas',
  'Formulario Registro',
  'Título Principal',
  'Campo Enlazado',
  'Etiqueta / Badge',
  'Imagen / Foto',
  'Código QR'
];

export const ALL_CATEGORIES = ['charts', 'data', 'layout', 'inputs'] as const;

export const DEFAULT_EDITOR_PANELS: EditorPanelsConfig = {
  leftPalette: true,
  leftPaletteCollapsed: false,
  allowedControlTitles: [...ALL_CONTROL_TITLES],
  allowedCategories: [...ALL_CATEGORIES],
  rightInspector: true,
  rightInspectorCollapsed: false,
  allowedRightTabs: ['inspector', 'dependencies', 'layers', 'versions'],
  dbManagerAllowed: true
};

export const DEFAULT_VIEWER_OPTIONS: ViewerOptionsConfig = {
  targetDesignName: '',
  autoFitToWindow: true,
  allowExport: true,
  allowFullscreen: true,
  allowPageNavigation: true,
  allowInteractivity: true
};
