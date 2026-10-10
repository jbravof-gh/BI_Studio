import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CanvasDocument, CanvasElement, DatabaseInfo, ElementStyle, DrillStep } from './types';
import { useHistory } from './hooks/useHistory';
import { dexieManager } from './services/dexieManager';
import { DEMO_CANVAS_TEMPLATE, createEmptyCanvasDocument } from './services/sampleData';
import { exportCanvasDocumentJSON } from './utils/imageExporter';
import { applyThemeToDocument, getThemeById, findThemeByBackground, getThemeDefaultControlProps } from './utils/themePresets';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ControlsPalette } from './components/ControlsPalette';
import { CanvasEditor } from './components/CanvasEditor';
import { ElementInspector } from './components/ElementInspector';
import { LayersPanel } from './components/LayersPanel';
import { DbManagerModal } from './components/DbManagerModal';
import { SavedDesignsModal } from './components/SavedDesignsModal';
import { ExportModal } from './components/ExportModal';
import { HtmlExportModal } from './components/HtmlExportModal';
import { PreviewModal } from './components/PreviewModal';
import { ResetCanvasModal } from './components/ResetCanvasModal';
import { TemplateGalleryModal } from './components/TemplateGalleryModal';
import { GenerateLayoutModal } from './components/GenerateLayoutModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { PwaStatusBanner } from './components/PwaStatusBanner';
import { CanvasContextMenu, ContextMenuState } from './components/CanvasContextMenu';
import { autoArrangeGridLayout } from './utils/gridLayoutArranger';
import { PageNavigationToolbar, PageTabStrip, FloatingPageControls } from './components/PageNavigation';
import {
  switchActivePage,
  addNewPage,
  duplicatePage,
  deletePage,
  renamePage,
  reorderPages,
  setPageTabsPosition,
  setPageTabsVisibility,
  setPageColor
} from './utils/pageUtils';
import {
  getDefaultDrillLevels,
  sanitizeDrillLevels,
  getDefaultDrillMetricField
} from './utils/dataBindingEvaluator';
import { DependenciesPanel, DocumentElementWithPage } from './components/DependenciesPanel';
import { VersionHistoryPanel } from './components/VersionHistoryPanel';
import { snapshotService } from './services/snapshotService';
import { linkConfigService } from './services/linkConfigService';
import { LinkWindowConfig } from './types/linkTypes';

import { Sliders, Layers, PanelLeftOpen, PanelRightOpen, PanelRightClose, Sparkles, Network, FileArchive, X, History, Link2 } from 'lucide-react';

export default function App() {
  // 1. History Management for Canvas Document
  const {
    state: canvasDoc,
    set: setCanvasDoc,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory
  } = useHistory(createEmptyCanvasDocument('Nuevo Diseño'));

  // 2. State
  const [activeDbName, setActiveDbName] = useState<string>('');
  const [databasesList, setDatabasesList] = useState<string[]>([]);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [dbRecords, setDbRecords] = useState<Record<string, Record<string, any>[]>>({});

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [copiedStyle, setCopiedStyle] = useState<ElementStyle | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'inspector' | 'dependencies' | 'layers' | 'versions'>('inspector');
  const [snapshotCount, setSnapshotCount] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [activeDrillPaths, setActiveDrillPaths] = useState<Record<string, DrillStep[]>>({});
  const [activeLinkConfig, setActiveLinkConfig] = useState<LinkWindowConfig | null>(null);

  useEffect(() => {
    const updateSnapshotCount = async () => {
      const cnt = await snapshotService.getSnapshotCount(activeDbName);
      setSnapshotCount(cnt);
    };
    updateSnapshotCount();

    const handleSnapshotUpdated = () => {
      updateSnapshotCount();
    };
    window.addEventListener('canvas-snapshot-updated', handleSnapshotUpdated);
    return () => {
      window.removeEventListener('canvas-snapshot-updated', handleSnapshotUpdated);
    };
  }, [activeDbName]);

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: selectedValues
    }));
  };

  const handleDrillPathChange = (drillId: string, path: DrillStep[]) => {
    setActiveDrillPaths(prev => ({
      ...prev,
      [drillId]: path
    }));
  };

  // Cross-page filter elements lookup
  const allFilterElements = useMemo(() => {
    if (canvasDoc.pages && canvasDoc.pages.length > 0) {
      const list: CanvasElement[] = [];
      const seenIds = new Set<string>();
      canvasDoc.pages.forEach(p => {
        p.elements?.forEach(el => {
          if (el.type === 'filter' && !seenIds.has(el.id)) {
            seenIds.add(el.id);
            list.push(el);
          }
        });
      });
      // Also check active elements in case of state sync lag
      canvasDoc.elements.forEach(el => {
        if (el.type === 'filter' && !seenIds.has(el.id)) {
          seenIds.add(el.id);
          list.push(el);
        }
      });
      return list;
    }
    return canvasDoc.elements.filter(el => el.type === 'filter');
  }, [canvasDoc.pages, canvasDoc.elements]);

  // Cross-page drill-down elements lookup
  const allDrillElements = useMemo(() => {
    if (canvasDoc.pages && canvasDoc.pages.length > 0) {
      const list: CanvasElement[] = [];
      const seenIds = new Set<string>();
      canvasDoc.pages.forEach(p => {
        p.elements?.forEach(el => {
          if (el.type === 'drilldown' && !seenIds.has(el.id)) {
            seenIds.add(el.id);
            list.push(el);
          }
        });
      });
      // Also check active elements in case of state sync lag
      canvasDoc.elements.forEach(el => {
        if (el.type === 'drilldown' && !seenIds.has(el.id)) {
          seenIds.add(el.id);
          list.push(el);
        }
      });
      return list;
    }
    return canvasDoc.elements.filter(el => el.type === 'drilldown');
  }, [canvasDoc.pages, canvasDoc.elements]);

  // Map each filter & drilldown element ID to the page ID it belongs to
  const filterElPageMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (canvasDoc.pages && canvasDoc.pages.length > 0) {
      canvasDoc.pages.forEach((p, idx) => {
        const pId = p.id || String(idx);
        p.elements?.forEach(el => {
          if (el.type === 'filter' || el.type === 'drilldown') {
            map[el.id] = pId;
          }
        });
      });
    }
    const curPageId = canvasDoc.pages?.[canvasDoc.activePageIndex || 0]?.id || String(canvasDoc.activePageIndex || 0);
    canvasDoc.elements.forEach(el => {
      if ((el.type === 'filter' || el.type === 'drilldown') && !map[el.id]) {
        map[el.id] = curPageId;
      }
    });
    return map;
  }, [canvasDoc.pages, canvasDoc.elements, canvasDoc.activePageIndex]);

  // Comprehensive document elements with page context
  const allDocumentElements = useMemo<DocumentElementWithPage[]>(() => {
    const pages = canvasDoc.pages;
    const activeIdx = canvasDoc.activePageIndex ?? 0;

    if (!pages || pages.length === 0) {
      return (canvasDoc.elements || []).map(el => ({
        element: el,
        pageId: 'page_0',
        pageName: 'Página 1',
        pageIndex: 0,
        isCurrentPage: true
      }));
    }

    const result: DocumentElementWithPage[] = [];
    pages.forEach((page, pIdx) => {
      const pageElements = pIdx === activeIdx ? canvasDoc.elements : (page.elements || []);
      pageElements.forEach(el => {
        result.push({
          element: el,
          pageId: page.id || `page_${pIdx}`,
          pageName: page.name || `Página ${pIdx + 1}`,
          pageIndex: pIdx,
          isCurrentPage: pIdx === activeIdx
        });
      });
    });

    return result;
  }, [canvasDoc.pages, canvasDoc.activePageIndex, canvasDoc.elements]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    element: null
  });

  // Sidebar resizable & collapsible states
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(280);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(320);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(false);

  // Drag resizing for Left Sidebar
  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 200), 480);
      setLeftSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag resizing for Right Sidebar
  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 260), 540);
      setRightSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Modals
  const [isDbManagerOpen, setIsDbManagerOpen] = useState<boolean>(false);
  const [isSavedDesignsOpen, setIsSavedDesignsOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isHtmlExportOpen, setIsHtmlExportOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isGenerateLayoutOpen, setIsGenerateLayoutOpen] = useState<boolean>(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState<boolean>(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [generateLayoutInitialTable, setGenerateLayoutInitialTable] = useState<string>('');

  const handleOpenGenerateLayout = (tableName?: string) => {
    setGenerateLayoutInitialTable(tableName || '');
    setIsGenerateLayoutOpen(true);
  };

  const handleApplyGeneratedLayout = (
    newElements: CanvasElement[],
    options: { replaceExisting: boolean; dashboardTitle?: string; themeId?: string }
  ) => {
    if (!newElements || newElements.length === 0) return;

    let updatedDoc: CanvasDocument;

    if (options.replaceExisting) {
      updatedDoc = {
        ...canvasDoc,
        name: options.dashboardTitle || canvasDoc.name,
        targetDatabase: activeDbName || canvasDoc.targetDatabase,
        elements: newElements,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Append without replacing
      const maxZ = canvasDoc.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const elementsToAdd = newElements.map((el, idx) => ({
        ...el,
        id: `el_gen_${Date.now()}_${idx}`,
        zIndex: maxZ + idx + 1
      }));
      updatedDoc = {
        ...canvasDoc,
        elements: [...canvasDoc.elements, ...elementsToAdd],
        updatedAt: new Date().toISOString()
      };
    }

    if (options.themeId) {
      updatedDoc = applyThemeToDocument(updatedDoc, options.themeId, true);
    }

    setCanvasDoc(updatedDoc);
    if (newElements[0]) {
      setSelectedElementId(newElements[0].id);
      setSelectedElementIds([newElements[0].id]);
    }
  };

  const handleLoadTemplate = (templateDoc: CanvasDocument, targetDb?: string) => {
    // If a target database is specified and exists, switch active database
    if (targetDb && databasesList.includes(targetDb) && targetDb !== activeDbName) {
      handleSelectDatabase(targetDb);
    }
    
    // Clear any active cross-filters
    setActiveFilters({});
    setActiveDrillPaths({});

    // Reset history to load the template directly, replacing existing canvas
    resetHistory(templateDoc);

    // Select the first element of the template
    const firstEl = templateDoc.elements?.[0] || templateDoc.pages?.[0]?.elements?.[0];
    if (firstEl) {
      setSelectedElementId(firstEl.id);
      setSelectedElementIds([firstEl.id]);
    } else {
      setSelectedElementId(null);
      setSelectedElementIds([]);
    }
  };

  // 3. Initialize Dexie DBs and Load Data
  const refreshDatabaseState = useCallback(async (targetDb?: string) => {
    // 1.- Al iniciar la aplicacion no se carga ninguna base de datos que no sea necesaria para el arranque mostrando un canvas vacio
    const dbs = await dexieManager.listDatabases();
    const uniqueDbs = Array.from(new Set(dbs.map(d => String(d || '').trim()).filter(Boolean)));
    setDatabasesList(uniqueDbs);

    // If explicitly set to empty string or no database is selected, clear active database without fetching tables or records
    if (targetDb === '') {
      setActiveDbName('');
      dexieManager.setActiveDbName('');
      setDbInfo(null);
      setDbRecords({});
      return;
    }

    const currentName = targetDb !== undefined ? targetDb : dexieManager.getActiveDbName();
    if (!currentName) {
      setActiveDbName('');
      setDbInfo(null);
      setDbRecords({});
      return;
    }

    const active = dbs.includes(currentName) ? currentName : '';
    setActiveDbName(active);
    dexieManager.setActiveDbName(active);

    if (active) {
      const info = await dexieManager.getDatabaseInfo(active);
      setDbInfo(info);

      // Fetch records for each table progressively to prevent UI freezing and memory bottlenecks
      if (info?.tables && info.tables.length > 0) {
        // Step 1: Rapid initial fetch (500 records per table) so UI, canvas widgets and selectors render instantly
        const initialMap: Record<string, Record<string, any>[]> = {};
        for (const t of info.tables) {
          initialMap[t.name] = await dexieManager.getTableRecords(active, t.name, { limit: 500 });
        }
        setDbRecords(initialMap);

        // Step 2: Background asynchronous queue for tables that have more than 500 records to load the FULL dataset
        const tablesWithMore = info.tables.filter(t => t.recordCount > 500);
        if (tablesWithMore.length > 0) {
          // Yield to main thread via setTimeout/queueMicrotask so initial UI render finishes smoothly
          setTimeout(async () => {
            for (const t of tablesWithMore) {
              try {
                const fullRecords = await dexieManager.getTableRecords(active, t.name);
                setDbRecords(prev => ({
                  ...prev,
                  [t.name]: fullRecords
                }));
                // Small breath between tables to prevent blocking the event loop
                await new Promise(res => setTimeout(res, 20));
              } catch (err) {
                console.warn(`Background loader for table ${t.name} failed:`, err);
              }
            }
          }, 60);
        }
      } else {
        setDbRecords({});
      }
    } else {
      setDbInfo(null);
      setDbRecords({});
    }
  }, []);

  useEffect(() => {
    // Al iniciar la aplicacion verifica si se abre mediante un enlace personalizado (LinkWindowConfig)
    const initApp = async () => {
      try {
        const linkCfg = await linkConfigService.parseFromCurrentLocation();
        if (linkCfg) {
          setActiveLinkConfig(linkCfg);

          // 1. Activar la base de datos solicitada si está configurada
          if (linkCfg.targetDatabase) {
            dexieManager.setActiveDbName(linkCfg.targetDatabase);
            setActiveDbName(linkCfg.targetDatabase);
            await refreshDatabaseState(linkCfg.targetDatabase);
          } else {
            await refreshDatabaseState('');
          }

          // 2. Comportamiento según el modo
          if (linkCfg.mode === 'viewer') {
            setPreviewMode(true);
            // Cargar diseño guardado especificado
            if (linkCfg.targetDatabase && linkCfg.viewerOptions?.targetDesignName) {
              try {
                const designs = await dexieManager.getCanvasDesigns(linkCfg.targetDatabase);
                const found = designs.find(
                  d => d.name === linkCfg.viewerOptions.targetDesignName || d.id === linkCfg.viewerOptions.targetDesignName
                );
                if (found) {
                  resetHistory(found);
                }
              } catch (err) {
                console.warn('No se pudo cargar el diseño guardado para el visor:', err);
              }
            }

            // Aplicar tema override si fue especificado
            if (linkCfg.viewerOptions?.themeOverride) {
              setCanvasDoc(prev => applyThemeToDocument(prev, linkCfg.viewerOptions.themeOverride!, true));
            }
          } else {
            // Modo edición
            if (linkCfg.editorPanels?.leftPaletteCollapsed) {
              setIsLeftSidebarCollapsed(true);
            }
            if (linkCfg.editorPanels?.rightInspectorCollapsed) {
              setIsRightSidebarCollapsed(true);
            }
            if (linkCfg.editorPanels?.allowedRightTabs && linkCfg.editorPanels.allowedRightTabs.length > 0) {
              setRightPanelTab(linkCfg.editorPanels.allowedRightTabs[0]);
            }
          }
        } else {
          // Sin enlace configurado: inicia con lienzo vacío
          await refreshDatabaseState('');
        }
      } catch (e) {
        console.error('Error al inicializar enlace personalizado:', e);
        await refreshDatabaseState('');
      }
    };

    initApp();
  }, [refreshDatabaseState]);

  // Handle live record inserted from Form control
  const handleRecordInserted = async (tableName: string, _newRecord: Record<string, any>) => {
    const active = dexieManager.getActiveDbName();
    if (active) {
      const updatedRecords = await dexieManager.getTableRecords(active, tableName);
      setDbRecords(prev => ({
        ...prev,
        [tableName]: updatedRecords
      }));
    }
  };

  // When active DB changes
  const handleSelectDatabase = (name: string) => {
    dexieManager.setActiveDbName(name);
    setActiveDbName(name);
    setCanvasDoc(current => ({
      ...current,
      targetDatabase: name
    }));
    refreshDatabaseState(name);
  };

  // Reset Canvas to Clean Start (empty elements, no database selected, fresh ID)
  const handleConfirmReset = () => {
    const emptyDoc = createEmptyCanvasDocument('Nuevo Diseño');
    resetHistory(emptyDoc);
    setSelectedElementId(null);
    setSelectedElementIds([]);
    setActiveDbName('');
    dexieManager.setActiveDbName('');
    setDbInfo(null);
    setDbRecords({});
    setPreviewMode(false);
  };

  // Selected element helper (search current page first, then across all document pages)
  const selectedElement = canvasDoc.elements.find(el => el.id === selectedElementId) ||
    allDocumentElements.find(item => item.element.id === selectedElementId)?.element ||
    null;

  // Selection handlers
  const handleSelectElement = (id: string | null, isMultiSelect?: boolean) => {
    if (id === null) {
      setSelectedElementId(null);
      setSelectedElementIds([]);
      return;
    }

    if (isMultiSelect) {
      setSelectedElementIds(prev => {
        if (prev.includes(id)) {
          const next = prev.filter(x => x !== id);
          setSelectedElementId(next.length > 0 ? next[next.length - 1] : null);
          return next;
        } else {
          const next = [...prev, id];
          setSelectedElementId(id);
          return next;
        }
      });
    } else {
      setSelectedElementId(id);
      setSelectedElementIds([id]);
    }
  };

  const handleSelectMultipleElements = (ids: string[]) => {
    setSelectedElementIds(ids);
    setSelectedElementId(ids.length > 0 ? ids[ids.length - 1] : null);
  };

  // 4. Element Operations
  const handleAddControl = (preset: Partial<CanvasElement>, dropCoord?: { x: number; y: number }) => {
    const maxZ = canvasDoc.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
    const newId = `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const firstTable = dbInfo?.tables[0]?.name;
    const defaultBinding = { ...preset.binding };
    if (!defaultBinding.tableName && firstTable) {
      defaultBinding.tableName = firstTable;
    }

    const boundTable = defaultBinding.tableName;
    const tableFields = dbInfo?.tables.find(t => t.name === boundTable)?.fields || [];
    const elemType = preset.type || 'text';

    // Auto-populate table columns if table control has none
    if (elemType === 'table' && (!defaultBinding.columns || defaultBinding.columns.length === 0) && tableFields.length > 0) {
      defaultBinding.columns = tableFields.slice(0, 4);
    }

    // Auto-populate chart fields if chart control has none
    if (elemType === 'chart') {
      if (!defaultBinding.labelField && tableFields.length > 0) defaultBinding.labelField = tableFields[0];
      if (!defaultBinding.valueField && tableFields.length > 1) defaultBinding.valueField = tableFields[1];
    }

    // Auto-populate filter fields if filter control has none
    if (elemType === 'filter') {
      if (!defaultBinding.field && tableFields.length > 0) {
        const catField = tableFields.find(f => ['categoria', 'tipo', 'estado', 'ciudad', 'pais', 'departamento', 'marca', 'status', 'category', 'name', 'nombre'].some(k => f.toLowerCase().includes(k)));
        defaultBinding.field = catField || tableFields[0];
      }
      if (!defaultBinding.template) {
        defaultBinding.template = defaultBinding.field ? `Filtro: ${defaultBinding.field}` : 'Filtro';
      }
      if (!defaultBinding.filterPlaceholder) {
        defaultBinding.filterPlaceholder = 'Todos los valores';
      }
      if (!defaultBinding.filterDisplayMode) {
        defaultBinding.filterDisplayMode = preset.binding?.filterDisplayMode || 'dropdown';
      }
      if (!defaultBinding.filterPageScope) {
        defaultBinding.filterPageScope = 'current';
      }
    }

    // Auto-populate drill-down hierarchy fields ONLY from existing table fields
    if (elemType === 'drilldown') {
      defaultBinding.drillLevels = sanitizeDrillLevels(defaultBinding.drillLevels, tableFields);
      if (!defaultBinding.valueField || !tableFields.includes(defaultBinding.valueField)) {
        defaultBinding.valueField = getDefaultDrillMetricField(tableFields);
      }
      if (!defaultBinding.template) {
        defaultBinding.template = 'Desglose Jerárquico';
      }
    }

    // Auto-populate detailCard fields strictly from available table fields
    if (elemType === 'detailCard') {
      if (tableFields.length > 0) {
        // Assign primary header field if none or not in tableFields
        if (!defaultBinding.headerField || !tableFields.includes(defaultBinding.headerField)) {
          const candidate = tableFields.find(f => ['nombre', 'name', 'titulo', 'title', 'cliente', 'empleado', 'producto', 'id', 'descripcion', 'codigo'].some(k => f.toLowerCase().includes(k))) || tableFields[0];
          defaultBinding.headerField = candidate;
        }
        // Assign subtitle field if none or not in tableFields
        if (!defaultBinding.subHeaderField || !tableFields.includes(defaultBinding.subHeaderField)) {
          const remaining = tableFields.filter(f => f !== defaultBinding.headerField);
          const candidateSub = remaining.find(f => ['tipo', 'type', 'categoria', 'category', 'estado', 'status', 'cargo', 'role', 'departamento', 'division', 'ciudad'].some(k => f.toLowerCase().includes(k))) || remaining[0];
          defaultBinding.subHeaderField = candidateSub || '';
        }

        // Configure detailed information fields (columns)
        // If preset already has columns that exist in the bound table, keep them;
        // otherwise, pick 2-4 random fields from available table fields (excluding header/subHeader when possible)
        const validPresetCols = (defaultBinding.columns || []).filter(c => tableFields.includes(c));
        if (validPresetCols.length > 0) {
          defaultBinding.columns = validPresetCols;
        } else {
          const availableForDetails = tableFields.filter(f => f !== defaultBinding.headerField && f !== defaultBinding.subHeaderField);
          const pool = availableForDetails.length > 0 ? availableForDetails : tableFields;
          const shuffled = [...pool].sort(() => 0.5 - Math.random());
          const pickCount = Math.min(shuffled.length, Math.min(4, Math.max(2, Math.floor(Math.random() * 3) + 2)));
          defaultBinding.columns = shuffled.slice(0, pickCount);
        }
      } else {
        defaultBinding.headerField = '';
        defaultBinding.subHeaderField = '';
        defaultBinding.columns = [];
      }
    }

    // Retrieve active theme defaults for new element
    const activeTheme = canvasDoc.themeId
      ? getThemeById(canvasDoc.themeId)
      : findThemeByBackground(canvasDoc.backgroundColor);

    const themeOverrides = getThemeDefaultControlProps(elemType, activeTheme);

    const newElement: CanvasElement = {
      id: newId,
      type: elemType,
      name: preset.name || 'Nuevo Elemento',
      x: dropCoord ? dropCoord.x : Math.max(30, Math.round(canvasDoc.width / 2 - (preset.width || 200) / 2)),
      y: dropCoord ? dropCoord.y : Math.max(30, Math.round(canvasDoc.height / 2 - (preset.height || 100) / 2)),
      width: preset.width || 240,
      height: preset.height || 100,
      zIndex: maxZ + 1,
      visible: true,
      locked: false,
      style: {
        backgroundColor: activeTheme.elementDefaults.cardBg,
        borderColor: activeTheme.elementDefaults.cardBorder,
        borderRadius: 8,
        padding: 10,
        ...themeOverrides.style,
        ...preset.style
      },
      binding: {
        ...defaultBinding,
        ...(themeOverrides.binding || {})
      }
    };

    setCanvasDoc(current => ({
      ...current,
      elements: [...current.elements, newElement]
    }));

    setSelectedElementId(newId);
    setSelectedElementIds([newId]);
    setRightPanelTab('inspector');
  };

  const handleUpdateElement = (updated: CanvasElement) => {
    setCanvasDoc(current => {
      const oldEl = current.elements.find(el => el.id === updated.id);

      if (oldEl) {
        let nextElements = current.elements;

        // 1. If this is a group container and its position or size changed:
        if (updated.isGroup || (updated.type === 'container' && updated.childrenIds && updated.childrenIds.length > 0)) {
          const deltaX = updated.x - oldEl.x;
          const deltaY = updated.y - oldEl.y;
          const childIds = updated.childrenIds || [];

          // If moved, shift all children
          if (deltaX !== 0 || deltaY !== 0) {
            nextElements = current.elements.map(el => {
              if (el.id === updated.id) return updated;
              if (childIds.includes(el.id) || el.groupId === updated.id) {
                return {
                  ...el,
                  x: Math.max(0, el.x + deltaX),
                  y: Math.max(0, el.y + deltaY)
                };
              }
              return el;
            });
          } else {
            nextElements = current.elements.map(el => (el.id === updated.id ? updated : el));
          }
        } else if (updated.groupId) {
          // 2. If this is a child inside a group and its position/size changed, update group container bounds
          const groupContainer = current.elements.find(el => el.id === updated.groupId);
          if (groupContainer) {
            const updatedChildren = current.elements.map(el => (el.id === updated.id ? updated : el));
            const groupChildren = updatedChildren.filter(el => el.groupId === updated.groupId);
            if (groupChildren.length > 0) {
              const minX = Math.min(...groupChildren.map(c => c.x));
              const minY = Math.min(...groupChildren.map(c => c.y));
              const maxX = Math.max(...groupChildren.map(c => c.x + c.width));
              const maxY = Math.max(...groupChildren.map(c => c.y + c.height));

              nextElements = updatedChildren.map(el => {
                if (el.id === updated.groupId) {
                  return {
                    ...el,
                    x: minX,
                    y: minY,
                    width: Math.max(40, maxX - minX),
                    height: Math.max(20, maxY - minY)
                  };
                }
                return el;
              });
            } else {
              nextElements = updatedChildren;
            }
          } else {
            nextElements = current.elements.map(el => (el.id === updated.id ? updated : el));
          }
        } else {
          // Standard single element update
          nextElements = current.elements.map(el => (el.id === updated.id ? updated : el));
        }

        // Also sync active page in pages array if pages are configured
        let updatedPages = current.pages;
        if (current.pages && current.pages.length > 0) {
          const activeIdx = current.activePageIndex ?? 0;
          updatedPages = current.pages.map((p, idx) =>
            idx === activeIdx ? { ...p, elements: nextElements } : p
          );
        }

        return {
          ...current,
          elements: nextElements,
          pages: updatedPages
        };
      }

      // If element is on another page in current.pages
      if (current.pages && current.pages.length > 0) {
        const pageIdx = current.pages.findIndex(p => p.elements?.some(e => e.id === updated.id));
        if (pageIdx !== -1) {
          return {
            ...current,
            pages: current.pages.map((p, idx) => {
              if (idx === pageIdx) {
                return {
                  ...p,
                  elements: (p.elements || []).map(e => e.id === updated.id ? updated : e)
                };
              }
              return p;
            })
          };
        }
      }

      return current;
    });
  };

  // Group multiple selected elements into a single draggable container
  const handleGroupElements = useCallback(() => {
    const targetIds = selectedElementIds.length >= 2 ? selectedElementIds : [];
    if (targetIds.length < 2) return;

    const itemsToGroup = canvasDoc.elements.filter(el => targetIds.includes(el.id));
    if (itemsToGroup.length < 2) return;

    const minX = Math.min(...itemsToGroup.map(el => el.x));
    const minY = Math.min(...itemsToGroup.map(el => el.y));
    const maxX = Math.max(...itemsToGroup.map(el => el.x + el.width));
    const maxY = Math.max(...itemsToGroup.map(el => el.y + el.height));
    const minZ = Math.min(...itemsToGroup.map(el => el.zIndex || 1));

    const groupId = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const groupContainer: CanvasElement = {
      id: groupId,
      type: 'container',
      name: `Grupo (${itemsToGroup.length} elementos)`,
      isGroup: true,
      childrenIds: itemsToGroup.map(el => el.id),
      x: minX,
      y: minY,
      width: Math.max(80, maxX - minX),
      height: Math.max(40, maxY - minY),
      zIndex: Math.max(1, minZ - 1),
      visible: true,
      locked: false,
      style: {
        backgroundColor: 'rgba(99, 102, 241, 0.04)',
        borderColor: '#6366f1',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8
      },
      binding: {}
    };

    setCanvasDoc(current => {
      const updatedElements = current.elements.map(el => {
        if (targetIds.includes(el.id)) {
          return { ...el, groupId };
        }
        return el;
      });

      return {
        ...current,
        elements: [...updatedElements, groupContainer]
      };
    });

    setSelectedElementId(groupId);
    setSelectedElementIds([groupId]);
    setRightPanelTab('inspector');
  }, [selectedElementIds, canvasDoc.elements, setCanvasDoc]);

  // Ungroup bundled elements
  const handleUngroupElements = useCallback((targetGroupId?: string) => {
    let groupIdToUngroup = targetGroupId;
    if (!groupIdToUngroup) {
      if (selectedElement?.isGroup) {
        groupIdToUngroup = selectedElement.id;
      } else if (selectedElement?.groupId) {
        groupIdToUngroup = selectedElement.groupId;
      }
    }

    if (!groupIdToUngroup) return;

    const groupContainer = canvasDoc.elements.find(el => el.id === groupIdToUngroup);
    const childIds = groupContainer?.childrenIds || canvasDoc.elements.filter(el => el.groupId === groupIdToUngroup).map(el => el.id);

    setCanvasDoc(current => ({
      ...current,
      elements: current.elements
        .filter(el => el.id !== groupIdToUngroup)
        .map(el => {
          if (el.groupId === groupIdToUngroup) {
            const { groupId: _, ...rest } = el;
            return rest as CanvasElement;
          }
          return el;
        })
    }));

    if (childIds.length > 0) {
      setSelectedElementIds(childIds);
      setSelectedElementId(childIds[0]);
    } else {
      setSelectedElementId(null);
      setSelectedElementIds([]);
    }
  }, [selectedElement, canvasDoc.elements, setCanvasDoc]);

  // Alignment helpers for multiple selected elements
  const handleAlignElements = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV') => {
    const targetIds = selectedElementIds.length >= 2 ? selectedElementIds : [];
    if (targetIds.length < 2) return;

    setCanvasDoc(current => {
      const items = current.elements.filter(el => targetIds.includes(el.id));
      if (items.length < 2) return current;

      const minX = Math.min(...items.map(el => el.x));
      const maxX = Math.max(...items.map(el => el.x + el.width));
      const minY = Math.min(...items.map(el => el.y));
      const maxY = Math.max(...items.map(el => el.y + el.height));
      const midX = minX + (maxX - minX) / 2;
      const midY = minY + (maxY - minY) / 2;

      // Distribute calculation
      const sortedByX = [...items].sort((a, b) => a.x - b.x);
      const totalWidths = sortedByX.reduce((acc, el) => acc + el.width, 0);
      const totalSpaceX = (maxX - minX) - totalWidths;
      const stepX = sortedByX.length > 1 ? totalSpaceX / (sortedByX.length - 1) : 0;

      return {
        ...current,
        elements: current.elements.map(el => {
          if (!targetIds.includes(el.id) || el.locked) return el;

          switch (type) {
            case 'left':
              return { ...el, x: minX };
            case 'center':
              return { ...el, x: Math.round(midX - el.width / 2) };
            case 'right':
              return { ...el, x: maxX - el.width };
            case 'top':
              return { ...el, y: minY };
            case 'middle':
              return { ...el, y: Math.round(midY - el.height / 2) };
            case 'bottom':
              return { ...el, y: maxY - el.height };
            case 'distributeH': {
              const idx = sortedByX.findIndex(item => item.id === el.id);
              if (idx === 0) return el;
              let posX = minX;
              for (let i = 0; i < idx; i++) {
                posX += sortedByX[i].width + stepX;
              }
              return { ...el, x: Math.round(posX) };
            }
            default:
              return el;
          }
        })
      };
    });
  };

  const handleDeleteElement = (id: string) => {
    const target = canvasDoc.elements.find(el => el.id === id);
    setCanvasDoc(current => {
      // If deleting a group container, remove container and children or clear children's groupId
      if (target?.isGroup) {
        return {
          ...current,
          elements: current.elements.filter(el => el.id !== id && el.groupId !== id)
        };
      }
      // If deleting a child in group, remove it from group.childrenIds
      return {
        ...current,
        elements: current.elements
          .filter(el => el.id !== id)
          .map(el => {
            if (el.isGroup && el.childrenIds && el.childrenIds.includes(id)) {
              return {
                ...el,
                childrenIds: el.childrenIds.filter(cid => cid !== id)
              };
            }
            return el;
          })
      };
    });

    setSelectedElementId(null);
    setSelectedElementIds(prev => prev.filter(eid => eid !== id));
  };

  const handleDeleteMultipleElements = (ids: string[]) => {
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.filter(el => !ids.includes(el.id) && !ids.includes(el.groupId || ''))
    }));
    setSelectedElementId(null);
    setSelectedElementIds([]);
  };

  const handleDuplicateElement = useCallback((id: string) => {
    const target = canvasDoc.elements.find(el => el.id === id);
    if (!target) return;

    const maxZ = canvasDoc.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);

    // If duplicating a group container
    if (target.isGroup || (target.type === 'container' && target.childrenIds && target.childrenIds.length > 0)) {
      const newGroupId = `group_${Date.now()}`;
      const childElements = canvasDoc.elements.filter(el => (target.childrenIds || []).includes(el.id) || el.groupId === target.id);
      
      const newChildIds: string[] = [];
      const duplicatedChildren: CanvasElement[] = childElements.map((child, idx) => {
        const newChildId = `el_${Date.now()}_${idx}`;
        newChildIds.push(newChildId);
        return {
          ...child,
          id: newChildId,
          name: `${child.name} (Copia)`,
          x: Math.min(canvasDoc.width - child.width, child.x + 20),
          y: Math.min(canvasDoc.height - child.height, child.y + 20),
          groupId: newGroupId,
          zIndex: maxZ + idx + 2
        };
      });

      const duplicatedGroup: CanvasElement = {
        ...target,
        id: newGroupId,
        name: `${target.name} (Copia)`,
        x: Math.min(canvasDoc.width - target.width, target.x + 20),
        y: Math.min(canvasDoc.height - target.height, target.y + 20),
        childrenIds: newChildIds,
        zIndex: maxZ + 1
      };

      setCanvasDoc(current => ({
        ...current,
        elements: [...current.elements, ...duplicatedChildren, duplicatedGroup]
      }));

      setSelectedElementId(newGroupId);
      setSelectedElementIds([newGroupId]);
      return;
    }

    // Standard single element duplicate
    const duplicated: CanvasElement = {
      ...target,
      id: `el_${Date.now()}`,
      name: `${target.name} (Copia)`,
      x: Math.min(canvasDoc.width - target.width, target.x + 20),
      y: Math.min(canvasDoc.height - target.height, target.y + 20),
      zIndex: maxZ + 1,
      groupId: undefined
    };

    setCanvasDoc(current => ({
      ...current,
      elements: [...current.elements, duplicated]
    }));
    setSelectedElementId(duplicated.id);
    setSelectedElementIds([duplicated.id]);
  }, [canvasDoc.elements, canvasDoc.width, canvasDoc.height, setCanvasDoc]);

  const handleBringToFront = (id: string) => {
    const maxZ = canvasDoc.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => el.id === id ? { ...el, zIndex: maxZ + 1 } : el)
    }));
  };

  const handleSendToBack = (id: string) => {
    const minZ = canvasDoc.elements.reduce((min, el) => Math.min(min, el.zIndex || 0), 1);
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => el.id === id ? { ...el, zIndex: Math.max(1, minZ - 1) } : el)
    }));
  };

  const handleBringForward = (id: string) => {
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => el.id === id ? { ...el, zIndex: (el.zIndex || 1) + 1 } : el)
    }));
  };

  const handleSendBackward = (id: string) => {
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => el.id === id ? { ...el, zIndex: Math.max(1, (el.zIndex || 1) - 1) } : el)
    }));
  };

  const handleCenterElement = (id: string) => {
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => {
        if (el.id !== id) return el;
        return {
          ...el,
          x: Math.max(0, Math.round((current.width - el.width) / 2)),
          y: Math.max(0, Math.round((current.height - el.height) / 2))
        };
      })
    }));
  };

  const handleToggleVisibility = (id: string) => {
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => el.id === id ? { ...el, visible: el.visible === false ? true : false } : el)
    }));
  };

  const handleToggleLockElement = (id: string) => {
    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => el.id === id ? { ...el, locked: !el.locked } : el)
    }));
  };

  const handleToggleLockAll = useCallback(() => {
    setCanvasDoc(current => {
      if (current.elements.length === 0) return current;
      const allLocked = current.elements.every(el => el.locked);
      const targetState = !allLocked;
      return {
        ...current,
        elements: current.elements.map(el => ({ ...el, locked: targetState }))
      };
    });
  }, [setCanvasDoc]);

  const handleAutoArrange = useCallback((scope: 'all' | 'selected' = 'all') => {
    const isSelection = scope === 'selected' && selectedElementIds.length >= 2;
    const result = autoArrangeGridLayout(canvasDoc.elements, canvasDoc.width, canvasDoc.height, {
      scope: isSelection ? 'selected' : 'all',
      selectedIds: selectedElementIds,
      gridStep: 20,
      margin: 32,
      gap: 20
    });

    if (result.changedCount > 0 || result.requiredHeight > canvasDoc.height) {
      setCanvasDoc(current => ({
        ...current,
        elements: result.elements,
        height: Math.max(current.height, result.requiredHeight)
      }));
    }
  }, [canvasDoc.elements, canvasDoc.width, canvasDoc.height, selectedElementIds, setCanvasDoc]);

  const handleContextMenuElement = (e: React.MouseEvent, element: CanvasElement) => {
    e.preventDefault();
    if (!selectedElementIds.includes(element.id)) {
      setSelectedElementId(element.id);
      setSelectedElementIds([element.id]);
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      element
    });
  };

  const handleContextMenuCanvas = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      element: null
    });
  };

  const handleReorderLayers = (reordered: CanvasElement[]) => {
    setCanvasDoc(current => ({
      ...current,
      elements: reordered
    }));
  };

  const handleCopyStyle = useCallback((elementId?: string) => {
    const idToCopy = elementId || selectedElementId;
    if (!idToCopy) return;
    const target = canvasDoc.elements.find(el => el.id === idToCopy);
    if (!target || !target.style) return;
    setCopiedStyle({ ...target.style });
  }, [canvasDoc.elements, selectedElementId]);

  const handlePasteStyle = useCallback((targetId?: string) => {
    if (!copiedStyle) return;
    const idsToPaste = targetId 
      ? [targetId] 
      : (selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []));
    
    if (idsToPaste.length === 0) return;

    setCanvasDoc(current => ({
      ...current,
      elements: current.elements.map(el => {
        if (idsToPaste.includes(el.id)) {
          return {
            ...el,
            style: {
              ...el.style,
              ...copiedStyle
            }
          };
        }
        return el;
      })
    }));
  }, [copiedStyle, selectedElementId, selectedElementIds]);

  const handleBatchUpdateElements = useCallback((updatedList: CanvasElement[]) => {
    setCanvasDoc(current => ({
      ...current,
      elements: updatedList
    }));
  }, []);

  // 4.1. Multi-Page Handlers
  const handleSwitchPage = useCallback((pageIndex: number) => {
    setCanvasDoc(current => {
      const updated = switchActivePage(current, pageIndex);
      setSelectedElementId(updated.elements[0]?.id || null);
      setSelectedElementIds(updated.elements[0]?.id ? [updated.elements[0].id] : []);
      return updated;
    });
  }, [setCanvasDoc]);

  const handleAddPage = useCallback((customName?: string) => {
    setCanvasDoc(current => {
      const updated = addNewPage(current, customName);
      setSelectedElementId(null);
      setSelectedElementIds([]);
      return updated;
    });
  }, [setCanvasDoc]);

  const handleDuplicatePage = useCallback((pageIndex: number) => {
    setCanvasDoc(current => {
      const updated = duplicatePage(current, pageIndex);
      setSelectedElementId(updated.elements[0]?.id || null);
      setSelectedElementIds(updated.elements[0]?.id ? [updated.elements[0].id] : []);
      return updated;
    });
  }, [setCanvasDoc]);

  const handleDeletePage = useCallback((pageIndex: number) => {
    setCanvasDoc(current => {
      const updated = deletePage(current, pageIndex);
      setSelectedElementId(updated.elements[0]?.id || null);
      setSelectedElementIds(updated.elements[0]?.id ? [updated.elements[0].id] : []);
      return updated;
    });
  }, [setCanvasDoc]);

  const handleRenamePage = useCallback((pageIndex: number, newName: string) => {
    setCanvasDoc(current => renamePage(current, pageIndex, newName));
  }, [setCanvasDoc]);

  const handleReorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setCanvasDoc(current => reorderPages(current, fromIndex, toIndex));
  }, [setCanvasDoc]);

  const handleChangeTabsPosition = useCallback((position: 'bottom' | 'left') => {
    setCanvasDoc(current => setPageTabsPosition(current, position));
  }, [setCanvasDoc]);

  const handleToggleTabsVisibility = useCallback((show?: boolean) => {
    setCanvasDoc(current => setPageTabsVisibility(current, show));
  }, [setCanvasDoc]);

  const handleSetPageColor = useCallback((pageIndex: number, color?: string) => {
    setCanvasDoc(current => setPageColor(current, pageIndex, color));
  }, [setCanvasDoc]);

  // Keyboard navigation, multi-selection, grouping & delete shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      // Copy Style shortcut: Ctrl+Alt+C or Cmd+Alt+C
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopyStyle();
        return;
      }

      // Paste Style shortcut: Ctrl+Alt+V or Cmd+Alt+V
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePasteStyle();
        return;
      }

      // Page navigation hotkeys: Alt + Left / Alt + Right
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const activeIdx = canvasDoc.activePageIndex || 0;
        if (activeIdx > 0) {
          handleSwitchPage(activeIdx - 1);
        }
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const activeIdx = canvasDoc.activePageIndex || 0;
        const totalPages = canvasDoc.pages?.length || 1;
        if (activeIdx < totalPages - 1) {
          handleSwitchPage(activeIdx + 1);
        }
        return;
      }

      // Group shortcut: Ctrl+G or Cmd+G
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        handleGroupElements();
        return;
      }

      // Ungroup shortcut: Ctrl+Shift+G or Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        handleUngroupElements();
        return;
      }

      // Select All shortcut: Ctrl+A or Cmd+A
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = canvasDoc.elements.map(el => el.id);
        setSelectedElementIds(allIds);
        setSelectedElementId(allIds[0] || null);
        return;
      }

      // Duplicate shortcut: Ctrl+D or Cmd+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && selectedElementId) {
        e.preventDefault();
        handleDuplicateElement(selectedElementId);
        return;
      }

      if (!selectedElementId && selectedElementIds.length === 0) return;

      const activeIds = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (activeIds.length > 1) {
          handleDeleteMultipleElements(activeIds);
        } else if (selectedElementId) {
          handleDeleteElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setSelectedElementIds([]);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setCanvasDoc(current => ({
          ...current,
          elements: current.elements.map(el => {
            if (!activeIds.includes(el.id) || el.locked) return el;
            let nx = el.x;
            let ny = el.y;
            if (e.key === 'ArrowUp') ny -= step;
            if (e.key === 'ArrowDown') ny += step;
            if (e.key === 'ArrowLeft') nx -= step;
            if (e.key === 'ArrowRight') nx += step;
            return { ...el, x: Math.max(0, nx), y: Math.max(0, ny) };
          })
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementId,
    selectedElementIds,
    canvasDoc.elements,
    canvasDoc.activePageIndex,
    canvasDoc.pages,
    handleGroupElements,
    handleUngroupElements,
    handleDuplicateElement,
    handleCopyStyle,
    handlePasteStyle,
    handleSwitchPage
  ]);

  // 5. JSON Import & Export
  const handleExportCanvasJson = () => {
    exportCanvasDocumentJSON(canvasDoc);
  };

  const handleImportCanvasJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed: CanvasDocument = JSON.parse(evt.target?.result as string);
        if (parsed && parsed.elements && Array.isArray(parsed.elements)) {
          resetHistory(parsed);
          setSelectedElementId(parsed.elements[0]?.id || null);
          setSelectedElementIds(parsed.elements[0]?.id ? [parsed.elements[0].id] : []);
          alert('Diseño de Canvas importado correctamente.');
        } else {
          alert('El archivo no tiene la estructura de un diseño de canvas válido.');
        }
      } catch (err: any) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Theme Change Handler
  const handleApplyTheme = useCallback((themeId: string, updateExistingElements: boolean = true) => {
    setCanvasDoc(current => applyThemeToDocument(current, themeId, updateExistingElements));
  }, [setCanvasDoc]);

  const handleToggleHighContrastMode = useCallback((enabled: boolean) => {
    setCanvasDoc(current => ({
      ...current,
      highContrastMode: enabled
    }));
  }, [setCanvasDoc]);

  return (
    <div className={`flex flex-col h-screen w-screen bg-[#1a1b1e] overflow-hidden font-sans text-[#e1e1e6] ${canvasDoc.highContrastMode ? 'high-contrast-mode' : ''}`}>
      {/* Active Link Configuration Indicator Banner */}
      {activeLinkConfig && (
        <div className="bg-[#1e1f38] border-b border-indigo-500/30 px-3.5 py-1.5 flex items-center justify-between text-xs text-indigo-200 z-30 select-none shadow-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white tracking-wide">{activeLinkConfig.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-semibold">
              {activeLinkConfig.mode === 'viewer' ? 'Modo Visor' : 'Modo Edición Filtrada'}
            </span>
            {activeLinkConfig.targetDatabase && (
              <span className="text-[11px] text-indigo-300/90 hidden sm:inline">
                BD: <strong className="text-emerald-400">{activeLinkConfig.targetDatabase}</strong>
              </span>
            )}
            {activeLinkConfig.mode === 'editor' && (
              <span className="text-[11px] text-indigo-300/80 hidden md:inline">
                • {activeLinkConfig.editorPanels.allowedControlTitles.length} controles disponibles
                {!activeLinkConfig.editorPanels.dbManagerAllowed && ' • Gestor BD protegido'}
              </span>
            )}
            {activeLinkConfig.mode === 'viewer' && activeLinkConfig.viewerOptions?.targetDesignName && (
              <span className="text-[11px] text-indigo-300/90 hidden sm:inline">
                • Diseño: <strong className="text-white">{activeLinkConfig.viewerOptions.targetDesignName}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.location.href = window.location.pathname;
              }}
              className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-semibold transition cursor-pointer"
              title="Volver al entorno completo de Dexie Canvas Studio"
            >
              Restablecer entorno completo
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        canvasDoc={canvasDoc}
        onChangeCanvasDoc={(updated) => setCanvasDoc(updated)}
        activeDbName={activeDbName}
        databasesList={databasesList}
        dbInfo={dbInfo}
        onSelectDatabase={handleSelectDatabase}
        onOpenDbManager={() => {
          if (activeLinkConfig && activeLinkConfig.editorPanels.dbManagerAllowed === false) {
            return;
          }
          setIsDbManagerOpen(true);
        }}
        onOpenSavedDesigns={() => setIsSavedDesignsOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHtmlExport={() => setIsHtmlExportOpen(true)}
        onOpenGenerateLayout={() => handleOpenGenerateLayout()}
        onOpenTemplateGallery={() => setIsTemplateGalleryOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onExportJson={handleExportCanvasJson}
        onImportJson={handleImportCanvasJson}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        previewMode={previewMode}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onTogglePreviewMode={() => setPreviewMode(!previewMode)}
        headerButtonsConfig={activeLinkConfig?.headerButtons}
      />

      {/* PWA Connection & Update Status Banner */}
      <PwaStatusBanner />

      {/* Page Navigation Toolbar with Independent Controls, Picker, Actions & Tab Settings */}
      <PageNavigationToolbar
        document={canvasDoc}
        onSwitchPage={handleSwitchPage}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
        onChangeTabsPosition={handleChangeTabsPosition}
        onToggleTabsVisibility={handleToggleTabsVisibility}
        previewMode={previewMode}
      />

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Predefined Controls Palette (Resizable & Collapsible) */}
        {!previewMode && activeLinkConfig?.editorPanels.leftPalette !== false && (
          isLeftSidebarCollapsed ? (
            <ControlsPalette
              isCollapsed={true}
              onAddControl={handleAddControl}
              onExpand={() => setIsLeftSidebarCollapsed(false)}
              onOpenGenerateLayout={() => handleOpenGenerateLayout()}
              allowedControlTitles={activeLinkConfig?.editorPanels.allowedControlTitles}
              allowedCategories={activeLinkConfig?.editorPanels.allowedCategories}
            />
          ) : (
            <div
              style={{ width: leftSidebarWidth }}
              className="flex-shrink-0 flex flex-col relative h-full bg-white dark:bg-[#202225] border-r border-slate-200 dark:border-[#2f3136] z-10 select-none overflow-hidden"
            >
              <ControlsPalette
                isCollapsed={false}
                onAddControl={handleAddControl}
                onCollapse={() => setIsLeftSidebarCollapsed(true)}
                onOpenGenerateLayout={() => handleOpenGenerateLayout()}
                allowedControlTitles={activeLinkConfig?.editorPanels.allowedControlTitles}
                allowedCategories={activeLinkConfig?.editorPanels.allowedCategories}
              />
              {/* Resize Handle */}
              <div
                onMouseDown={handleLeftResizeStart}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#5865f2] active:bg-[#5865f2] transition-colors z-20"
                title="Arrastrar para redimensionar barra de controles"
              />
            </div>
          )
        )}

        {/* Left Tab Strip (when position is 'left' and tabs are not hidden) */}
        {canvasDoc.pageTabsPosition === 'left' && canvasDoc.showPageTabs !== false && (
          <PageTabStrip
            document={canvasDoc}
            position="left"
            onSwitchPage={handleSwitchPage}
            onAddPage={handleAddPage}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            onReorderPages={handleReorderPages}
            onToggleTabsVisibility={handleToggleTabsVisibility}
            onUpdatePageColor={handleSetPageColor}
            previewMode={previewMode}
          />
        )}

        {/* Center: Canvas Workspace & Bottom Tab Strip */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          <div className="flex-1 relative overflow-hidden flex">
            <CanvasEditor
              document={canvasDoc}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              dbRecords={dbRecords}
              zoom={zoom}
              previewMode={previewMode}
              onRecordInserted={handleRecordInserted}
              allFilterElements={allFilterElements}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              allDrillElements={allDrillElements}
              activeDrillPaths={activeDrillPaths}
              onDrillPathChange={handleDrillPathChange}
              currentPageId={canvasDoc.pages?.[canvasDoc.activePageIndex || 0]?.id || String(canvasDoc.activePageIndex || 0)}
              currentPageIndex={canvasDoc.activePageIndex || 0}
              filterElPageMap={filterElPageMap}
              onSelectElement={handleSelectElement}
              onSelectMultipleElements={handleSelectMultipleElements}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDeleteMultipleElements={handleDeleteMultipleElements}
              onDuplicateElement={handleDuplicateElement}
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
              onGroupElements={handleGroupElements}
              onUngroupElement={handleUngroupElements}
              onAlignElements={handleAlignElements}
              onAddElement={handleAddControl}
              onContextMenuElement={handleContextMenuElement}
              onContextMenuCanvas={handleContextMenuCanvas}
            />

            {/* Independent Floating Page Navigation Overlay Controls */}
            <FloatingPageControls
              document={canvasDoc}
              onSwitchPage={handleSwitchPage}
              onToggleTabsVisibility={handleToggleTabsVisibility}
            />

            {/* Floating Action Badge & Export Button when Preview Mode is Active */}
            {previewMode && (
              <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-white/95 dark:bg-[#202225]/95 backdrop-blur-md border border-slate-200 dark:border-[#2f3136] shadow-xl p-1.5 rounded-xl text-xs select-none animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-1.5 px-2 py-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Vista Previa</span>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-[#2f3136]" />
                <button
                  onClick={() => setIsHtmlExportOpen(true)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Exportar canvas actual a paquete web HTML interactivo en archivo ZIP"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Exportar HTML (.zip)</span>
                </button>
                <button
                  onClick={() => setPreviewMode(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2f3136] rounded-lg transition cursor-pointer"
                  title="Volver al modo edición"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Tab Strip (when position is 'bottom' and tabs are not hidden) */}
          {(canvasDoc.pageTabsPosition || 'bottom') === 'bottom' && canvasDoc.showPageTabs !== false && (
            <PageTabStrip
              document={canvasDoc}
              position="bottom"
              onSwitchPage={handleSwitchPage}
              onAddPage={handleAddPage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              onRenamePage={handleRenamePage}
              onReorderPages={handleReorderPages}
              onToggleTabsVisibility={handleToggleTabsVisibility}
              onUpdatePageColor={handleSetPageColor}
              previewMode={previewMode}
            />
          )}
        </div>

        {/* Right Sidebar: Element Inspector & Layers System Tabs (Resizable & Collapsible) */}
        {!previewMode && activeLinkConfig?.editorPanels.rightInspector !== false && (
          isRightSidebarCollapsed ? (
            <div className="w-10 bg-white dark:bg-[#202225] border-l border-slate-200 dark:border-[#2f3136] flex flex-col items-center py-3 select-none z-10 flex-shrink-0 h-full justify-between">
              <button
                onClick={() => setIsRightSidebarCollapsed(false)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#25282c] rounded-lg transition cursor-pointer"
                title="Expandir Inspector y Capas"
              >
                <PanelRightOpen className="w-4 h-4 text-[#5865f2]" />
              </button>
              <div
                onClick={() => setIsRightSidebarCollapsed(false)}
                className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-[#9ca3af] dark:hover:text-white uppercase tracking-wider cursor-pointer py-4"
                style={{ writingMode: 'vertical-rl' }}
                title="Expandir Inspector y Capas"
              >
                <Sliders className="w-3.5 h-3.5 text-[#5865f2] mb-1" />
                <span>Inspector & Capas</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-[#2f3136]" />
            </div>
          ) : (
            <div
              style={{ width: rightSidebarWidth }}
              className="flex-shrink-0 flex flex-col relative h-full bg-white dark:bg-[#202225] border-l border-slate-200 dark:border-[#2f3136] z-10 select-none overflow-hidden"
            >
              {/* Resize Handle on Left Edge */}
              <div
                onMouseDown={handleRightResizeStart}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#5865f2] active:bg-[#5865f2] transition-colors z-20"
                title="Arrastrar para redimensionar panel derecho"
              />

              {/* Tab switch header */}
              <div className="flex items-center border-b border-slate-200 dark:border-[#2f3136] bg-slate-50 dark:bg-[#202225] text-xs font-semibold">
                {(!activeLinkConfig || activeLinkConfig.editorPanels.allowedRightTabs?.includes('inspector')) && (
                  <button
                    onClick={() => setRightPanelTab('inspector')}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      rightPanelTab === 'inspector'
                        ? 'bg-white dark:bg-[#1a1b1e] text-[#5865f2] border-b-2 border-[#5865f2] font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#25282c]'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Inspector</span>
                  </button>
                )}

                {(!activeLinkConfig || activeLinkConfig.editorPanels.allowedRightTabs?.includes('dependencies')) && (
                  <button
                    onClick={() => setRightPanelTab('dependencies')}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      rightPanelTab === 'dependencies'
                        ? 'bg-white dark:bg-[#1a1b1e] text-[#06b6d4] border-b-2 border-[#06b6d4] font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#25282c]'
                    }`}
                    title="Pestaña de Dependencias y Filtros Globales"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Dependencias</span>
                  </button>
                )}

                {(!activeLinkConfig || activeLinkConfig.editorPanels.allowedRightTabs?.includes('layers')) && (
                  <button
                    onClick={() => setRightPanelTab('layers')}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      rightPanelTab === 'layers'
                        ? 'bg-white dark:bg-[#1a1b1e] text-[#5865f2] border-b-2 border-[#5865f2] font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#25282c]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Capas ({canvasDoc.elements.length})</span>
                  </button>
                )}

                {(!activeLinkConfig || activeLinkConfig.editorPanels.allowedRightTabs?.includes('versions')) && (
                  <button
                    onClick={() => setRightPanelTab('versions')}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      rightPanelTab === 'versions'
                        ? 'bg-white dark:bg-[#1a1b1e] text-emerald-500 border-b-2 border-emerald-500 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#25282c]'
                    }`}
                    title="Historial de Versiones e Instantáneas en IndexedDB"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Versiones</span>
                    {snapshotCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                        {snapshotCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setIsRightSidebarCollapsed(true)}
                  className="px-2.5 py-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-white dark:hover:bg-[#25282c] border-l border-slate-200 dark:border-[#2f3136] transition cursor-pointer"
                  title="Colapsar panel derecho"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {rightPanelTab === 'inspector' ? (
                  <ElementInspector
                    element={selectedElement}
                    allElements={canvasDoc.elements}
                    allDocumentElements={allDocumentElements}
                    dbInfo={dbInfo}
                    dbRecords={dbRecords}
                    canvasWidth={canvasDoc.width}
                    canvasHeight={canvasDoc.height}
                    onChangeElement={handleUpdateElement}
                    onDeleteElement={() => selectedElementId && handleDeleteElement(selectedElementId)}
                    onDuplicateElement={() => selectedElementId && handleDuplicateElement(selectedElementId)}
                    onBringToFront={() => selectedElementId && handleBringToFront(selectedElementId)}
                    onSendToBack={() => selectedElementId && handleSendToBack(selectedElementId)}
                    onUngroupElement={handleUngroupElements}
                    onSelectElementById={(id, pageIdx) => {
                      if (typeof pageIdx === 'number' && pageIdx !== canvasDoc.activePageIndex) {
                        handleSwitchPage(pageIdx);
                      }
                      handleSelectElement(id, false);
                    }}
                    onOpenDependenciesTab={() => setRightPanelTab('dependencies')}
                    onSwitchPage={handleSwitchPage}
                    onCopyStyle={handleCopyStyle}
                    onPasteStyle={handlePasteStyle}
                    hasCopiedStyle={!!copiedStyle}
                    pages={canvasDoc.pages}
                    activePageIndex={canvasDoc.activePageIndex}
                  />
                ) : rightPanelTab === 'dependencies' ? (
                  <DependenciesPanel
                    selectedElement={selectedElement}
                    allDocumentElements={allDocumentElements}
                    pages={canvasDoc.pages}
                    activePageIndex={canvasDoc.activePageIndex}
                    onUpdateElement={handleUpdateElement}
                    onSelectElement={(id, pageIdx) => {
                      if (typeof pageIdx === 'number' && pageIdx !== canvasDoc.activePageIndex) {
                        handleSwitchPage(pageIdx);
                      }
                      handleSelectElement(id, false);
                    }}
                    onSwitchPage={handleSwitchPage}
                    dbInfo={dbInfo}
                  />
                ) : rightPanelTab === 'layers' ? (
                  <LayersPanel
                    elements={canvasDoc.elements}
                    selectedElementId={selectedElementId}
                    selectedElementIds={selectedElementIds}
                    onSelectElement={handleSelectElement}
                    onUpdateElement={handleUpdateElement}
                    onBatchUpdateElements={handleBatchUpdateElements}
                    onReorderElements={handleReorderLayers}
                    onDeleteElement={handleDeleteElement}
                    onDuplicateElement={handleDuplicateElement}
                    onGroupElements={handleGroupElements}
                    onUngroupElement={handleUngroupElements}
                    onToggleLockAll={handleToggleLockAll}
                  />
                ) : (
                  <VersionHistoryPanel
                    currentDocument={canvasDoc}
                    activeDbName={activeDbName}
                    onRestoreSnapshot={(restored) => {
                      resetHistory(restored);
                      const firstEl = restored.elements?.[0] || restored.pages?.[0]?.elements?.[0];
                      setSelectedElementId(firstEl?.id || null);
                      setSelectedElementIds(firstEl?.id ? [firstEl.id] : []);
                    }}
                    onTakeSnapshot={async () => {
                      return await snapshotService.takeSnapshot(canvasDoc, activeDbName);
                    }}
                  />
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Bottom Footer Bar */}
      <Footer
        canvasDoc={canvasDoc}
        onChangeCanvasDoc={(updated) => setCanvasDoc(updated)}
        onApplyTheme={handleApplyTheme}
        highContrastMode={canvasDoc.highContrastMode}
        onToggleHighContrastMode={handleToggleHighContrastMode}
        zoom={zoom}
        onChangeZoom={setZoom}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        previewMode={previewMode}
        onTogglePreviewMode={() => setPreviewMode(!previewMode)}
        selectedCount={selectedElementIds.length}
        selectedElementIds={selectedElementIds}
        activeDbName={activeDbName}
        onOpenVersionHistory={() => {
          setIsRightSidebarCollapsed(false);
          setRightPanelTab('versions');
        }}
        onSnapshotTaken={() => {
          setSnapshotCount((prev) => prev + 1);
        }}
        footerElementsConfig={activeLinkConfig?.footerElements}
      />

      {/* Database Manager Modal */}
      <DbManagerModal
        isOpen={isDbManagerOpen && (activeLinkConfig?.editorPanels.dbManagerAllowed !== false)}
        onClose={() => setIsDbManagerOpen(false)}
        activeDbName={activeDbName}
        onSelectDatabase={handleSelectDatabase}
        onDbChanged={() => refreshDatabaseState(activeDbName)}
        onOpenGenerateLayout={(tblName) => {
          setIsDbManagerOpen(false);
          handleOpenGenerateLayout(tblName);
        }}
      />

      {/* Gemini AI Layout Generator Modal */}
      <GenerateLayoutModal
        isOpen={isGenerateLayoutOpen}
        onClose={() => setIsGenerateLayoutOpen(false)}
        activeDbName={activeDbName}
        dbInfo={dbInfo}
        canvasDoc={canvasDoc}
        initialTableName={generateLayoutInitialTable}
        onApplyLayout={handleApplyGeneratedLayout}
        onSelectDatabase={handleSelectDatabase}
      />

      {/* Saved Designs (Dexie IndexedDB) Modal */}
      <SavedDesignsModal
        isOpen={isSavedDesignsOpen}
        onClose={() => setIsSavedDesignsOpen(false)}
        activeDbName={activeDbName}
        currentDocument={canvasDoc}
        onLoadDesign={(design) => {
          resetHistory(design);
          setSelectedElementId(design.elements[0]?.id || null);
          setSelectedElementIds(design.elements[0]?.id ? [design.elements[0].id] : []);
        }}
      />

      {/* Export to Image / PDF Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        canvasDoc={canvasDoc}
        dbRecords={dbRecords}
        onOpenHtmlExport={() => {
          setIsExportModalOpen(false);
          setIsHtmlExportOpen(true);
        }}
        canvasDocName={canvasDoc.name}
        canvasBackgroundColor={canvasDoc.backgroundColor}
        canvasWidth={canvasDoc.width}
        canvasHeight={canvasDoc.height}
      />

      {/* Export Canvas to HTML ZIP Package Modal */}
      {isHtmlExportOpen && (
        <HtmlExportModal
          isOpen={isHtmlExportOpen}
          onClose={() => setIsHtmlExportOpen(false)}
          document={canvasDoc}
          dbRecords={dbRecords}
        />
      )}

      {/* Full-Screen Live Data Preview Modal */}
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={canvasDoc}
        dbRecords={dbRecords}
        onRecordInserted={handleRecordInserted}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHtmlExport={() => setIsHtmlExportOpen(true)}
      />

      {/* Reset Canvas (Clean Start) Confirmation & Save Modal */}
      <ResetCanvasModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        currentDocument={canvasDoc}
        activeDbName={activeDbName}
        databasesList={databasesList}
        onConfirmReset={handleConfirmReset}
        onOpenTemplateGallery={() => setIsTemplateGalleryOpen(true)}
      />

      {/* Pre-Built Dashboard Templates Gallery Modal */}
      <TemplateGalleryModal
        isOpen={isTemplateGalleryOpen}
        onClose={() => setIsTemplateGalleryOpen(false)}
        currentDocument={canvasDoc}
        activeDbName={activeDbName}
        databasesList={databasesList}
        onLoadTemplate={handleLoadTemplate}
      />

      {/* PWA Installation & Offline Capabilities Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

      {/* Right-Click Quick Actions Context Menu */}
      <CanvasContextMenu
        menuState={contextMenu}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        onDelete={handleDeleteElement}
        onDuplicate={handleDuplicateElement}
        onToggleLock={handleToggleLockElement}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onToggleVisibility={handleToggleVisibility}
        onCenterElement={handleCenterElement}
        onCopyStyle={handleCopyStyle}
        onPasteStyle={handlePasteStyle}
        hasCopiedStyle={!!copiedStyle}
        selectedCount={selectedElementIds.length}
        onGroup={handleGroupElements}
        onUngroup={handleUngroupElements}
        onAutoArrange={handleAutoArrange}
        onOpenInspector={(id) => {
          setSelectedElementId(id);
          setSelectedElementIds([id]);
          setRightPanelTab('inspector');
          setIsRightSidebarCollapsed(false);
        }}
        onAddQuickElement={(type, x, y) => {
          handleAddControl({ type: type as any }, { x, y });
        }}
        onResetZoom={() => setZoom(1)}
        onToggleGrid={() => setCanvasDoc(c => ({ ...c, showGrid: !c.showGrid }))}
        onToggleSnap={() => setCanvasDoc(c => ({ ...c, snapToGrid: !c.snapToGrid }))}
        showGrid={canvasDoc.showGrid}
        snapToGrid={canvasDoc.snapToGrid}
      />
    </div>
  );
}
