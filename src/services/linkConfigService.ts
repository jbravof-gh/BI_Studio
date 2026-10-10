import Dexie, { Table } from 'dexie';
import {
  LinkWindowConfig,
  DEFAULT_HEADER_BUTTONS,
  DEFAULT_FOOTER_ELEMENTS,
  DEFAULT_EDITOR_PANELS,
  DEFAULT_VIEWER_OPTIONS,
  ALL_CONTROL_TITLES
} from '../types/linkTypes';

class LinkConfigDatabase extends Dexie {
  links!: Table<LinkWindowConfig, string>;

  constructor() {
    super('DexieCanvasLinksDB');
    this.version(1).stores({
      links: 'id, name, mode, targetDatabase, createdAt, updatedAt'
    });
  }
}

export const linkDb = new LinkConfigDatabase();

const LOCAL_STORAGE_BACKUP_KEY = 'dexie_canvas_links_backup_v1';

// Pre-defined quick launch templates / presets
export const PRESET_LINK_TEMPLATES: Omit<LinkWindowConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Visor Kiosco / Cuadro de Mando',
    description: 'Abre un diseño guardado directamente en pantalla interactiva de solo lectura o presentación, ocultando todas las herramientas de edición.',
    mode: 'viewer',
    targetDatabase: '',
    headerButtons: {
      ...DEFAULT_HEADER_BUTTONS,
      dbSelector: false,
      dbManagerBtn: false,
      designNameInput: false,
      undoRedo: false,
      resetCanvas: false,
      templateGallery: false,
      savedDesigns: false,
      generateLayoutAi: false,
      jsonMenu: false,
      pwaInstall: false
    },
    footerElements: {
      ...DEFAULT_FOOTER_ELEMENTS,
      snapshotButton: false,
      gridControls: false,
      customThemeBtn: false
    },
    editorPanels: {
      ...DEFAULT_EDITOR_PANELS,
      leftPalette: false,
      rightInspector: false,
      dbManagerAllowed: false
    },
    viewerOptions: {
      targetDesignName: '',
      autoFitToWindow: true,
      allowExport: true,
      allowFullscreen: true,
      allowPageNavigation: true,
      allowInteractivity: true
    }
  },
  {
    name: 'Editor Minimalista de Gráficos y KPI',
    description: 'Ventana de edición enfocada exclusivamente en visualizaciones: gráficos de barras, circulares, líneas, series y tarjetas KPI.',
    mode: 'editor',
    targetDatabase: '',
    headerButtons: {
      ...DEFAULT_HEADER_BUTTONS,
      templateGallery: false,
      generateLayoutAi: false,
      pwaInstall: false,
      dbManagerBtn: false
    },
    footerElements: {
      ...DEFAULT_FOOTER_ELEMENTS,
      pwaStatus: false
    },
    editorPanels: {
      ...DEFAULT_EDITOR_PANELS,
      allowedControlTitles: [
        'Gráfico de Barras',
        'Gráfico Circular (Pie)',
        'Gráfico de Líneas',
        'Series',
        'Tarjeta KPI',
        'Drill-Down',
        'Caja / Tarjeta de Fondo',
        'Título Principal',
        'Etiqueta / Badge'
      ],
      allowedCategories: ['charts', 'layout'],
      dbManagerAllowed: false
    },
    viewerOptions: { ...DEFAULT_VIEWER_OPTIONS }
  },
  {
    name: 'Editor de Tablas, Matriz y Consultas',
    description: 'Espacio de trabajo especializado en manipulación de datos tabulares: tablas fijas, tablas paginadas, QueryTable, matrices y filtros.',
    mode: 'editor',
    targetDatabase: '',
    headerButtons: {
      ...DEFAULT_HEADER_BUTTONS,
      generateLayoutAi: false,
      templateGallery: false
    },
    footerElements: {
      ...DEFAULT_FOOTER_ELEMENTS
    },
    editorPanels: {
      ...DEFAULT_EDITOR_PANELS,
      allowedControlTitles: [
        'Tabla de Datos (Límite Fijo)',
        'Tabla Paginada con Navegación',
        'QueryTable',
        'Matriz',
        'Ficha de Registro',
        'Ficha Detalle',
        'Filtro Desplegable',
        'Filtro Lista de Casillas',
        'Caja / Tarjeta de Fondo',
        'Título Principal'
      ],
      allowedCategories: ['data', 'inputs', 'layout'],
      dbManagerAllowed: true
    },
    viewerOptions: { ...DEFAULT_VIEWER_OPTIONS }
  },
  {
    name: 'Terminal de Formularios y Fichas',
    description: 'Para captura ágil de datos y gestión de fichas individuales de clientes, inventario o pedidos, con interfaz depurada.',
    mode: 'editor',
    targetDatabase: '',
    headerButtons: {
      ...DEFAULT_HEADER_BUTTONS,
      dbSelector: false,
      dbManagerBtn: false,
      templateGallery: false,
      generateLayoutAi: false,
      jsonMenu: false
    },
    footerElements: {
      ...DEFAULT_FOOTER_ELEMENTS,
      gridControls: false,
      customThemeBtn: false
    },
    editorPanels: {
      ...DEFAULT_EDITOR_PANELS,
      allowedControlTitles: [
        'Formulario Registro',
        'Ficha de Registro',
        'Ficha Detalle',
        'Filtro Desplegable',
        'Filtro Lista de Casillas',
        'Caja / Tarjeta de Fondo',
        'Título Principal',
        'Etiqueta / Badge'
      ],
      allowedCategories: ['inputs', 'data', 'layout'],
      dbManagerAllowed: false
    },
    viewerOptions: { ...DEFAULT_VIEWER_OPTIONS }
  },
  {
    name: 'Editor Completo con Gestor de BD Protegido',
    description: 'Ofrece todas las capacidades del Canvas Studio pero oculta y deshabilita el acceso al Gestor de Bases de Datos para proteger la estructura.',
    mode: 'editor',
    targetDatabase: '',
    headerButtons: {
      ...DEFAULT_HEADER_BUTTONS,
      dbManagerBtn: false
    },
    footerElements: {
      ...DEFAULT_FOOTER_ELEMENTS
    },
    editorPanels: {
      ...DEFAULT_EDITOR_PANELS,
      dbManagerAllowed: false
    },
    viewerOptions: { ...DEFAULT_VIEWER_OPTIONS }
  }
];

export const linkConfigService = {
  /**
   * Retrieves all saved Link configurations.
   * If database is empty, seeds with default presets.
   */
  async getLinks(): Promise<LinkWindowConfig[]> {
    try {
      const records = await linkDb.links.toArray();
      if (records && records.length > 0) {
        return records.sort((a, b) => b.updatedAt - a.updatedAt);
      }

      // Check localStorage backup
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
        if (local) {
          const parsed = JSON.parse(local) as LinkWindowConfig[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            await linkDb.links.bulkPut(parsed);
            return parsed;
          }
        }
      } catch (e) {}

      // Seed with default presets
      const seeded = PRESET_LINK_TEMPLATES.map((tpl, idx) => ({
        ...tpl,
        id: `link_preset_${idx + 1}_${Date.now()}`,
        createdAt: Date.now() - (idx * 60000),
        updatedAt: Date.now() - (idx * 60000)
      }));

      await linkDb.links.bulkPut(seeded);
      this.syncLocalStorage(seeded);
      return seeded;
    } catch (err) {
      console.error('Error loading links from Dexie:', err);
      // Fallback from localStorage
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
        if (local) return JSON.parse(local);
      } catch (e) {}
      return [];
    }
  },

  async getLinkById(id: string): Promise<LinkWindowConfig | null> {
    if (!id) return null;
    try {
      const link = await linkDb.links.get(id);
      if (link) return link;
    } catch (e) {}

    // Fallback from localStorage
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (local) {
        const list = JSON.parse(local) as LinkWindowConfig[];
        const found = list.find(l => l.id === id);
        if (found) return found;
      }
    } catch (e) {}
    return null;
  },

  async saveLink(config: LinkWindowConfig): Promise<void> {
    const toSave: LinkWindowConfig = {
      ...config,
      id: config.id || `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: Date.now(),
      createdAt: config.createdAt || Date.now()
    };

    await linkDb.links.put(toSave);
    const all = await linkDb.links.toArray();
    this.syncLocalStorage(all);
  },

  async deleteLink(id: string): Promise<void> {
    await linkDb.links.delete(id);
    const all = await linkDb.links.toArray();
    this.syncLocalStorage(all);
  },

  syncLocalStorage(all: LinkWindowConfig[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(all));
    } catch (e) {}
  },

  createBlankConfig(targetDb: string = ''): LinkWindowConfig {
    return {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Nuevo Enlace Personalizado',
      description: 'Enlace configurado para abrir la aplicación con controles personalizados',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: 'editor',
      targetDatabase: targetDb,
      headerButtons: { ...DEFAULT_HEADER_BUTTONS },
      footerElements: { ...DEFAULT_FOOTER_ELEMENTS },
      editorPanels: {
        ...DEFAULT_EDITOR_PANELS,
        allowedControlTitles: [...ALL_CONTROL_TITLES]
      },
      viewerOptions: { ...DEFAULT_VIEWER_OPTIONS }
    };
  },

  /**
   * Compresses LinkWindowConfig into a safe URL base64 string
   */
  encodeConfig(config: LinkWindowConfig): string {
    try {
      const json = JSON.stringify(config);
      // UTF-8 safe base64 encoding
      const bytes = new TextEncoder().encode(json);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      return btoa(bin);
    } catch (e) {
      console.error('Error encoding link config:', e);
      return '';
    }
  },

  /**
   * Decompresses base64 string into LinkWindowConfig
   */
  decodeConfig(encodedStr: string): LinkWindowConfig | null {
    try {
      const bin = atob(encodedStr);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(json) as LinkWindowConfig;
      if (parsed && (parsed.mode === 'editor' || parsed.mode === 'viewer')) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed decoding link config from URL:', e);
    }
    return null;
  },

  /**
   * Generates a link URL.
   * - 'short': Uses ?linkId=...
   * - 'standalone': Uses ?linkConfig=... (self-contained, works anywhere)
   */
  generateUrl(config: LinkWindowConfig, format: 'short' | 'standalone' = 'standalone'): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const baseUrl = `${origin}${pathname}`;

    if (format === 'short') {
      const params = new URLSearchParams();
      params.set('linkId', config.id);
      if (config.targetDatabase) {
        params.set('db', config.targetDatabase);
      }
      if (config.mode === 'viewer' && config.viewerOptions?.targetDesignName) {
        params.set('design', config.viewerOptions.targetDesignName);
      }
      return `${baseUrl}?${params.toString()}`;
    }

    // Standalone format
    const b64 = this.encodeConfig(config);
    const params = new URLSearchParams();
    params.set('linkConfig', b64);
    if (config.targetDatabase) {
      params.set('db', config.targetDatabase);
    }
    return `${baseUrl}?${params.toString()}`;
  },

  /**
   * Opens the link in a new browser window/tab
   */
  openInNewWindow(config: LinkWindowConfig, format: 'short' | 'standalone' = 'standalone'): Window | null {
    const url = this.generateUrl(config, format);
    return window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Parses active config from current window.location
   */
  async parseFromCurrentLocation(): Promise<LinkWindowConfig | null> {
    if (typeof window === 'undefined') return null;
    const searchParams = new URLSearchParams(window.location.search);

    // 1. Check standalone linkConfig base64
    const configParam = searchParams.get('linkConfig');
    if (configParam) {
      const decoded = this.decodeConfig(configParam);
      if (decoded) {
        // If explicit db parameter was passed in URL, honor it
        const dbParam = searchParams.get('db');
        if (dbParam) decoded.targetDatabase = dbParam;
        const designParam = searchParams.get('design');
        if (designParam && decoded.viewerOptions) decoded.viewerOptions.targetDesignName = designParam;
        return decoded;
      }
    }

    // 2. Check linkId parameter from database
    const linkId = searchParams.get('linkId');
    if (linkId) {
      const fromDb = await this.getLinkById(linkId);
      if (fromDb) {
        const dbParam = searchParams.get('db');
        if (dbParam) fromDb.targetDatabase = dbParam;
        const designParam = searchParams.get('design');
        if (designParam && fromDb.viewerOptions) fromDb.viewerOptions.targetDesignName = designParam;
        return fromDb;
      }
    }

    // 3. Simple URL mode query (e.g. ?mode=viewer&db=MyDb&design=Sales)
    const mode = searchParams.get('mode');
    if (mode === 'viewer') {
      const db = searchParams.get('db') || '';
      const design = searchParams.get('design') || '';
      return {
        id: 'url_adhoc_viewer',
        name: `Visor: ${design || db || 'Diseño'}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: 'viewer',
        targetDatabase: db,
        headerButtons: {
          ...DEFAULT_HEADER_BUTTONS,
          dbSelector: false,
          dbManagerBtn: false,
          designNameInput: false,
          undoRedo: false,
          resetCanvas: false,
          templateGallery: false,
          savedDesigns: false,
          generateLayoutAi: false,
          jsonMenu: false,
          pwaInstall: false
        },
        footerElements: {
          ...DEFAULT_FOOTER_ELEMENTS,
          snapshotButton: false,
          gridControls: false,
          customThemeBtn: false
        },
        editorPanels: {
          ...DEFAULT_EDITOR_PANELS,
          leftPalette: false,
          rightInspector: false,
          dbManagerAllowed: false
        },
        viewerOptions: {
          targetDesignName: design,
          autoFitToWindow: true,
          allowExport: true,
          allowFullscreen: true,
          allowPageNavigation: true,
          allowInteractivity: true
        }
      };
    }

    return null;
  }
};
