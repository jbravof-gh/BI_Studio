import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CanvasElement, CanvasDocument, CanvasPage, MiniBrowserBookmark, LibraryRoot } from '../types';
import { dexieManager } from '../services/dexieManager';
import { DEMO_CANVAS_TEMPLATE } from '../services/sampleData';
import { renderDesignToHtml } from '../utils/designHtmlRenderer';
import { dbLibraryService, normalizePath } from '../services/dbLibraryService';
import { renderLibraryTargetToHtml } from '../utils/libraryHtmlResolver';
import {
  Globe,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ArrowRight,
  ExternalLink,
  Lock,
  Database,
  MousePointer,
  Move,
  Layers,
  Sparkles,
  ChevronDown,
  Check,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  History,
  Star,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Scan,
  RotateCcw,
  FolderTree,
  Pin,
  PinOff,
  X,
  Mail
} from 'lucide-react';

interface MiniBrowserControlProps {
  element: CanvasElement;
  dbRecords: Record<string, Record<string, any>[]>;
  previewMode?: boolean;
  currentDocument?: CanvasDocument;
  onUpdateElement?: (updated: CanvasElement) => void;
  renderElement?: (subElement: CanvasElement, doc?: CanvasDocument) => React.ReactNode;
}

export const MiniBrowserControl: React.FC<MiniBrowserControlProps> = ({
  element,
  dbRecords,
  previewMode = false,
  currentDocument,
  onUpdateElement,
  renderElement
}) => {
  const binding = element.binding || {};
  const initialUrl = binding.browserUrl || 'db://diseño-actual';

  // Navigation and Browser History State
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Browser Navigation History Stack (Stores last 10 visited URLs)
  const [historyStack, setHistoryStack] = useState<string[]>([initialUrl]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState<boolean>(false);

  // Helper to sanitize any bookmarks array (protecting against undefined/null/corrupted objects)
  const sanitizeBookmarks = (list: any[]): MiniBrowserBookmark[] => {
    if (!Array.isArray(list)) return [];
    return list
      .filter(item => item && (typeof item === 'object' || typeof item === 'string'))
      .map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `bm_migrated_${idx}_${Date.now()}`,
            url: item,
            title: item,
            createdAt: Date.now()
          };
        }
        const rawUrl = typeof item.url === 'string' ? item.url : String(item.url || '');
        const rawTitle = typeof item.title === 'string' ? item.title : String(item.title || rawUrl || 'Favorito');
        return {
          id: String(item.id || `bm_${idx}_${Date.now()}`),
          url: rawUrl,
          title: rawTitle,
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now()
        };
      })
      .filter(b => Boolean(b.url && b.url.trim()));
  };

  // Favorites / Bookmarks State (Stored in element binding)
  const [showBookmarksDropdown, setShowBookmarksDropdown] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<MiniBrowserBookmark[]>(() => {
    if (binding.browserBookmarks && binding.browserBookmarks.length > 0) {
      const sanitized = sanitizeBookmarks(binding.browserBookmarks);
      if (sanitized.length > 0) return sanitized;
    }
    return [
      { id: 'bm_def_1', url: 'db://diseño-actual', title: 'Diseño Actual (Lienzo)', createdAt: Date.now() },
      { id: 'bm_def_2', url: `db://${DEMO_CANVAS_TEMPLATE.name}`, title: DEMO_CANVAS_TEMPLATE.name, createdAt: Date.now() },
      { id: 'bm_def_3', url: 'https://es.wikipedia.org/wiki/Portal:Comunidad', title: 'Wikipedia en Español', createdAt: Date.now() },
      { id: 'bm_def_4', url: 'https://example.com', title: 'Example Domain', createdAt: Date.now() }
    ];
  });

  // Pinned sidebar mode ('none' | 'history' | 'bookmarks')
  const [pinnedSidebar, setPinnedSidebar] = useState<'none' | 'history' | 'bookmarks'>(() => {
    return (binding.browserPinnedSidebar as 'none' | 'history' | 'bookmarks') || 'none';
  });

  // Keep pinned sidebar state in sync if inspector updates binding
  useEffect(() => {
    if (binding.browserPinnedSidebar !== undefined) {
      setPinnedSidebar(binding.browserPinnedSidebar || 'none');
    }
  }, [binding.browserPinnedSidebar]);

  const handleSetPinnedSidebar = (mode: 'none' | 'history' | 'bookmarks') => {
    setPinnedSidebar(mode);
    if (mode !== 'none') {
      setShowHistoryDropdown(false);
      setShowBookmarksDropdown(false);
      setShowDesignPicker(false);
    }
    if (onUpdateElement) {
      onUpdateElement({
        ...element,
        binding: {
          ...element.binding,
          browserPinnedSidebar: mode
        }
      });
    }
  };

  // Active page state for multi-page designs
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // UI and Loading State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isInteractive, setIsInteractive] = useState<boolean>(binding.browserInteractive ?? false);
  const [showDesignPicker, setShowDesignPicker] = useState<boolean>(false);
  const [savedDesigns, setSavedDesigns] = useState<CanvasDocument[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const bookmarksDropdownRef = useRef<HTMLDivElement>(null);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Zoom and Fit to Dimensions State
  const [zoomLevel, setZoomLevel] = useState<number>(binding.browserZoom ?? 1.0);
  const [isFitMode, setIsFitMode] = useState<boolean>(true);
  const [fitModeType, setFitModeType] = useState<'expand' | 'contain' | 'width'>('expand');
  const [scaleX, setScaleX] = useState<number>(1.0);
  const [scaleY, setScaleY] = useState<number>(1.0);
  const [showZoomDropdown, setShowZoomDropdown] = useState<boolean>(false);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Listen for Escape key to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Keep internal URL synchronized if inspector changes the binding URL
  useEffect(() => {
    if (binding.browserUrl && binding.browserUrl !== currentUrl) {
      setCurrentUrl(binding.browserUrl);
      setInputUrl(binding.browserUrl);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), binding.browserUrl!]);
      setHistoryIndex(prev => prev + 1);
      // Also push to history stack
      setHistoryStack(prev => {
        const filtered = prev.filter(u => u.toLowerCase() !== binding.browserUrl!.toLowerCase());
        return [binding.browserUrl!, ...filtered].slice(0, 10);
      });
    }
  }, [binding.browserUrl]);

  // Keep interactive mode synchronized if inspector changes binding.browserInteractive
  useEffect(() => {
    if (binding.browserInteractive !== undefined) {
      setIsInteractive(binding.browserInteractive);
    }
  }, [binding.browserInteractive]);

  // Keep bookmarks synchronized if inspector changes the binding bookmarks
  useEffect(() => {
    if (binding.browserBookmarks) {
      setBookmarks(binding.browserBookmarks);
    }
  }, [binding.browserBookmarks]);

  // Animated progress bar simulation during loading
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 70) return prev + 15;
          if (prev < 90) return prev + 5;
          return prev;
        });
      }, 150);
    } else {
      setLoadingProgress(100);
      const timeout = setTimeout(() => {
        setLoadingProgress(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Load saved designs from the active Dexie database
  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const activeDb = dexieManager.getActiveDbName();
        if (activeDb) {
          const list = await dexieManager.getCanvasDesigns(activeDb);
          setSavedDesigns(list);
        }
      } catch (err) {
        console.warn('Error fetching saved designs for MiniBrowser:', err);
      }
    };
    fetchDesigns();
  }, [reloadKey]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDesignPicker(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(target)) {
        setShowHistoryDropdown(false);
      }
      if (bookmarksDropdownRef.current && !bookmarksDropdownRef.current.contains(target)) {
        setShowBookmarksDropdown(false);
      }
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(target)) {
        setShowZoomDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Active database library roots
  const [libraryRoots, setLibraryRoots] = useState<LibraryRoot[]>([]);

  useEffect(() => {
    const fetchLibraryRoots = async () => {
      try {
        const activeDb = currentDocument?.targetDatabase || dexieManager.getActiveDbName();
        if (activeDb) {
          const roots = await dbLibraryService.getRootsForDb(activeDb);
          setLibraryRoots(roots);
        } else {
          setLibraryRoots([]);
        }
      } catch (err) {
        console.warn('Error fetching library roots for MiniBrowser:', err);
      }
    };
    fetchLibraryRoots();
    const unsub = dbLibraryService.subscribe((dbName) => {
      const activeDb = currentDocument?.targetDatabase || dexieManager.getActiveDbName();
      if (dbName === activeDb) {
        fetchLibraryRoots();
      }
    });
    return unsub;
  }, [currentDocument?.targetDatabase, reloadKey]);

  // Determine if current URL points to a library file/folder
  const isLibraryProtocol = useMemo(() => {
    const lower = currentUrl.toLowerCase();
    if (lower.startsWith('lib://') || lower.startsWith('library://')) return true;
    if (lower.startsWith('db://lib/') || lower.startsWith('db://library/')) return true;
    if (lower.startsWith('db://')) {
      const target = lower.replace(/^db:\/\//, '').split(/[#?\/]/)[0].trim();
      if (libraryRoots.some(r => r.name.toLowerCase() === target)) {
        return true;
      }
    }
    return false;
  }, [currentUrl, libraryRoots]);

  const libraryTarget = useMemo(() => {
    if (!isLibraryProtocol) return null;
    const lower = currentUrl.toLowerCase();
    let clean = currentUrl;
    if (lower.startsWith('lib://')) clean = currentUrl.substring(6);
    else if (lower.startsWith('library://')) clean = currentUrl.substring(10);
    else if (lower.startsWith('db://lib/')) clean = currentUrl.substring(9);
    else if (lower.startsWith('db://library/')) clean = currentUrl.substring(13);
    else if (lower.startsWith('db://')) clean = currentUrl.substring(5);

    clean = clean.trim();
    const slashIdx = clean.indexOf('/');
    let rootName = '';
    let subPath = '/';

    if (slashIdx === -1) {
      rootName = clean;
      subPath = '/';
    } else {
      rootName = clean.substring(0, slashIdx);
      subPath = clean.substring(slashIdx);
    }

    const [filePath] = subPath.split(/[?#]/);

    return {
      rootName: rootName.trim(),
      filePath: normalizePath(filePath || '/')
    };
  }, [isLibraryProtocol, currentUrl]);

  const matchingLibraryRoot = useMemo(() => {
    if (!libraryTarget) return null;
    return libraryRoots.find(r => r.name.toLowerCase() === libraryTarget.rootName.toLowerCase()) || null;
  }, [libraryTarget, libraryRoots]);

  const libraryRenderResult = useMemo(() => {
    if (!isLibraryProtocol) return null;
    if (!matchingLibraryRoot) {
      return {
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:32px;text-align:center;">
          <h3 style="color:#818cf8;margin-bottom:8px;">Raíz de Librería no encontrada</h3>
          <p style="color:#94a3b8;font-size:13px;">No existe ninguna raíz de librería con el nombre <strong>"${libraryTarget?.rootName || ''}"</strong> asociada a la base de datos actual.</p>
          <p style="color:#64748b;font-size:12px;margin-top:12px;">Abre el Gestor de Base de Datos &rarr; pestaña <strong>Library</strong> para crearla.</p>
        </body></html>`,
        title: 'Librería - No encontrada',
        contentType: 'text/html'
      };
    }

    return renderLibraryTargetToHtml(matchingLibraryRoot, libraryTarget?.filePath || '/');
  }, [isLibraryProtocol, matchingLibraryRoot, libraryTarget, reloadKey]);

  // Determine if the current URL is a database design or an external web URL
  const isDbProtocol = useMemo(() => {
    return currentUrl.toLowerCase().startsWith('db://') && !isLibraryProtocol;
  }, [currentUrl, isLibraryProtocol]);

  // Resolve matching design when in db:// mode
  const activeDesign = useMemo<CanvasDocument | null>(() => {
    if (!isDbProtocol || isLibraryProtocol) return null;

    const rawTarget = currentUrl.replace(/^db:\/\//i, '').trim();
    const baseTarget = rawTarget.split(/[#?]/)[0].trim();

    // 1. Check if user selected demo template
    if (baseTarget === 'demo-ventas' || baseTarget === 'demo' || baseTarget === DEMO_CANVAS_TEMPLATE.name) {
      return DEMO_CANVAS_TEMPLATE;
    }

    // 2. Check current canvas document
    if (baseTarget === 'diseño-actual' || baseTarget === 'diseno-actual' || baseTarget === 'actual' || !baseTarget) {
      if (currentDocument) {
        return currentDocument;
      }
    }

    // 3. Check saved designs by ID or name
    if (savedDesigns.length > 0) {
      const match = savedDesigns.find(d => 
        d.id === baseTarget || 
        d.name.toLowerCase() === baseTarget.toLowerCase() ||
        (baseTarget && d.name.toLowerCase().includes(baseTarget.toLowerCase()))
      );
      if (match) return match;
    }

    // 4. If current document has a custom name matching target
    if (currentDocument && (
      currentDocument.id === baseTarget ||
      currentDocument.name?.toLowerCase() === baseTarget.toLowerCase() ||
      (baseTarget && currentDocument.name?.toLowerCase().includes(baseTarget.toLowerCase()))
    )) {
      return currentDocument;
    }

    // 5. Fallback to demo template if available
    if (baseTarget === 'diseño-actual' || baseTarget === 'diseno-actual' || !baseTarget) {
      return DEMO_CANVAS_TEMPLATE;
    }

    // 6. Fallback: synthesize design with current tables or demo canvas
    const activeDb = dexieManager.getActiveDbName();
    return {
      id: 'current-db-fallback',
      name: baseTarget ? `Diseño (${baseTarget})` : (activeDb ? `Base: ${activeDb}` : 'Diseño Dexie'),
      width: 1000,
      height: 700,
      backgroundColor: '#ffffff',
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: activeDb || 'Tienda_Ventas_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [
        {
          id: 'kpi-preview-1',
          type: 'kpi',
          name: 'Ventas Totales',
          x: 40,
          y: 40,
          width: 220,
          height: 100,
          zIndex: 1,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#ffffff',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadow: 'sm',
            padding: 14
          },
          binding: {
            tableName: Object.keys(dbRecords)[0] || 'ventas',
            field: 'total',
            aggregation: 'sum',
            prefix: '$',
            template: 'Total Registrado'
          }
        },
        {
          id: 'tbl-preview-1',
          type: 'table',
          name: 'Registros Recientes',
          x: 40,
          y: 160,
          width: 600,
          height: 280,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#ffffff',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadow: 'sm',
            padding: 12
          },
          binding: {
            tableName: Object.keys(dbRecords)[0] || 'ventas',
            limit: 6
          }
        }
      ]
    };
  }, [isDbProtocol, currentUrl, savedDesigns, dbRecords, currentDocument]);

  // Extract pages from the active design
  const designPages = useMemo<CanvasPage[]>(() => {
    if (!activeDesign) return [];
    if (activeDesign.pages && activeDesign.pages.length > 0) {
      return activeDesign.pages;
    }
    return [
      {
        id: 'page_default_1',
        name: 'Página Principal',
        elements: activeDesign.elements || [],
        backgroundColor: activeDesign.backgroundColor,
        width: activeDesign.width,
        height: activeDesign.height
      }
    ];
  }, [activeDesign]);

  // Synchronize active page index when design changes or URL has hash
  useEffect(() => {
    if (!isDbProtocol) return;
    const rawTarget = currentUrl.replace(/^db:\/\//i, '').trim();
    const hash = rawTarget.includes('#') ? rawTarget.split('#')[1].trim() : '';

    if (hash && designPages.length > 0) {
      // Numerical hash e.g. #1, #2 or #p=2
      const numMatch = hash.match(/(?:p(?:age)?=)?(\d+)/i);
      if (numMatch) {
        const pageNum = parseInt(numMatch[1], 10);
        if (pageNum >= 1 && pageNum <= designPages.length) {
          setActivePageIndex(pageNum - 1);
          return;
        }
      }
      // Name / ID match
      const matchedIdx = designPages.findIndex(p =>
        p.id.toLowerCase() === hash.toLowerCase() ||
        p.name.toLowerCase().replace(/\s+/g, '-').includes(hash.toLowerCase())
      );
      if (matchedIdx !== -1) {
        setActivePageIndex(matchedIdx);
        return;
      }
    }

    // Default to activePageIndex of document or 0
    if (activeDesign?.activePageIndex !== undefined && activeDesign.activePageIndex >= 0 && activeDesign.activePageIndex < designPages.length) {
      setActivePageIndex(activeDesign.activePageIndex);
    } else {
      setActivePageIndex(0);
    }
  }, [activeDesign, currentUrl, isDbProtocol, designPages.length]);

  // Listen to page switch and fullscreen toggle messages from inside the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MINIBROWSER_PAGE_SWITCH') {
        const idx = event.data.pageIndex;
        if (typeof idx === 'number' && idx >= 0 && idx < designPages.length) {
          setActivePageIndex(idx);
        }
      }
      if (event.data && event.data.type === 'MINIBROWSER_TOGGLE_FULLSCREEN') {
        setIsFullscreen(prev => !prev);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [designPages.length]);

  // Handler for user clicking a page tab
  const handleSelectPage = (pageIdx: number) => {
    if (pageIdx < 0 || pageIdx >= designPages.length) return;
    setActivePageIndex(pageIdx);

    // Communicate to iframe
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'MINIBROWSER_SET_PAGE',
          pageIndex: pageIdx
        }, '*');
      } catch (err) {
        console.warn('Could not postMessage to iframe:', err);
      }
    }
  };

  // Generate HTML source doc when rendering a database design
  const srcDocContent = useMemo(() => {
    if (!isDbProtocol) return undefined;
    if (!activeDesign) {
      return `<html><body style="font-family:sans-serif;padding:24px;text-align:center;color:#64748b;"><h3>Diseño no encontrado</h3><p>No existe el diseño "${currentUrl}" en la base de datos.</p></body></html>`;
    }
    return renderDesignToHtml(activeDesign, dbRecords, {
      showBanner: false,
      bannerSubtitle: `MiniBrowser embebido • ${activeDesign.name}`,
      activePageIndex: activePageIndex,
      showPageTabs: false,
      cleanEmbed: true
    });
  }, [isDbProtocol, activeDesign, dbRecords, reloadKey, activePageIndex]);

  // Target content dimensions for zooming and fitting
  const contentWidth = useMemo(() => {
    if (isLibraryProtocol) {
      return 1200;
    }
    if (isDbProtocol) {
      const p = designPages[activePageIndex];
      return p?.width || activeDesign?.width || 1200;
    }
    return 1200;
  }, [isLibraryProtocol, isDbProtocol, designPages, activePageIndex, activeDesign]);

  const contentHeight = useMemo(() => {
    if (isLibraryProtocol) {
      return 800;
    }
    if (isDbProtocol) {
      const p = designPages[activePageIndex];
      return p?.height || activeDesign?.height || 800;
    }
    return 800;
  }, [isLibraryProtocol, isDbProtocol, designPages, activePageIndex, activeDesign]);

  // Adjust zoom to fit current MiniBrowser dimensions without scrollbars or margins
  const handleFitToWindow = useCallback((modeOverride?: 'expand' | 'contain' | 'width') => {
    if (!viewportRef.current) return;
    const mode = modeOverride || fitModeType;
    const vpW = viewportRef.current.clientWidth;
    const vpH = viewportRef.current.clientHeight;
    if (vpW <= 0 || vpH <= 0) return;

    const sW = vpW / contentWidth;
    const sH = vpH / contentHeight;

    if (mode === 'expand') {
      setScaleX(sW);
      setScaleY(sH);
      const effectiveScale = Math.round(Math.min(sW, sH) * 100) / 100;
      setZoomLevel(effectiveScale);
    } else if (mode === 'width') {
      setScaleX(sW);
      setScaleY(sW);
      setZoomLevel(Math.round(sW * 100) / 100);
    } else {
      // contain: uniform proportional fit
      const uniformScale = Math.min(sW, sH);
      setScaleX(uniformScale);
      setScaleY(uniformScale);
      setZoomLevel(Math.round(uniformScale * 100) / 100);
    }

    if (modeOverride) {
      setFitModeType(modeOverride);
    }
    setIsFitMode(true);
  }, [contentWidth, contentHeight, fitModeType]);

  // Handle ResizeObserver and initial mount to maintain fit and expand over full available space
  useEffect(() => {
    if (!isFitMode || !viewportRef.current) return;
    const targetNode = viewportRef.current;
    const observer = new ResizeObserver(() => {
      handleFitToWindow();
    });
    observer.observe(targetNode);
    const timer = setTimeout(() => {
      handleFitToWindow();
    }, 40);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [isFitMode, handleFitToWindow]);

  // Keep fit synchronized when switching pages
  useEffect(() => {
    if (isFitMode) {
      handleFitToWindow();
    }
  }, [activePageIndex, currentUrl, handleFitToWindow]);

  // Zoom In / Out / Reset
  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFitMode(false);
    setZoomLevel(prev => {
      const next = Math.min(3.0, Math.round((prev + 0.1) * 100) / 100);
      setScaleX(next);
      setScaleY(next);
      return next;
    });
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFitMode(false);
    setZoomLevel(prev => {
      const next = Math.max(0.2, Math.round((prev - 0.1) * 100) / 100);
      setScaleX(next);
      setScaleY(next);
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFitMode(false);
    setZoomLevel(1.0);
    setScaleX(1.0);
    setScaleY(1.0);
  };

  const handleSelectZoomPreset = (scale: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFitMode(false);
    setZoomLevel(scale);
    setScaleX(scale);
    setScaleY(scale);
    setShowZoomDropdown(false);
  };

  // Persist zoom to element binding if changed
  const isInitialZoomMount = useRef(true);
  useEffect(() => {
    if (isInitialZoomMount.current) {
      isInitialZoomMount.current = false;
      return;
    }
    if (onUpdateElement && element.binding?.browserZoom !== zoomLevel) {
      onUpdateElement({
        ...element,
        binding: {
          ...element.binding,
          browserZoom: zoomLevel
        }
      });
    }
  }, [zoomLevel]);

  // Helper to push a visited URL to the last-10 history stack
  const addToHistoryStack = (url: string) => {
    if (!url) return;
    setHistoryStack(prev => {
      const filtered = prev.filter(u => u.toLowerCase() !== url.toLowerCase());
      return [url, ...filtered].slice(0, 10);
    });
  };

  // Safe URL normalizer function
  const normalizeUrl = (u: any): string => {
    if (typeof u !== 'string') {
      u = u ? String(u) : '';
    }
    return u.trim().toLowerCase().replace(/\/$/, '');
  };

  // Helper to update and persist bookmarks in element binding
  const saveBookmarks = (newBookmarks: MiniBrowserBookmark[]) => {
    const sanitized = sanitizeBookmarks(newBookmarks);
    setBookmarks(sanitized);
    if (onUpdateElement) {
      onUpdateElement({
        ...element,
        binding: {
          ...element.binding,
          browserBookmarks: sanitized
        }
      });
    }
  };

  // Check if current URL is bookmarked
  const isCurrentUrlBookmarked = useMemo(() => {
    const currentNorm = normalizeUrl(currentUrl);
    return bookmarks.some(b => normalizeUrl(b?.url) === currentNorm);
  }, [bookmarks, currentUrl]);

  // Toggle favorite/bookmark for current URL or explicit target
  const handleToggleFavorite = (targetUrl?: string) => {
    const urlToBookmark = targetUrl || currentUrl;
    const targetNorm = normalizeUrl(urlToBookmark);
    const exists = bookmarks.some(b => normalizeUrl(b?.url) === targetNorm);

    if (exists) {
      const filtered = bookmarks.filter(b => normalizeUrl(b?.url) !== targetNorm);
      saveBookmarks(filtered);
    } else {
      let pageTitle = '';
      if (urlToBookmark.toLowerCase().startsWith('db://')) {
        pageTitle = activeDesign?.name || urlToBookmark.replace(/^db:\/\//i, '');
      } else {
        pageTitle = urlToBookmark.replace(/^https?:\/\//i, '').split('/')[0] || urlToBookmark;
      }
      const newBm: MiniBrowserBookmark = {
        id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        url: urlToBookmark,
        title: pageTitle || urlToBookmark,
        createdAt: Date.now()
      };
      saveBookmarks([newBm, ...bookmarks]);
    }
  };

  // Remove a specific bookmark by ID
  const handleRemoveBookmark = (bmId: string) => {
    const filtered = bookmarks.filter(b => b.id !== bmId);
    saveBookmarks(filtered);
  };

  // Start animated loading indicator
  const startLoading = () => {
    setIsLoading(true);
    setLoadingProgress(25);
  };

  // Navigate to a new URL
  const handleNavigate = (targetUrl: string) => {
    let clean = targetUrl.trim();
    if (!clean) return;

    // If typing without protocol, check if user intended db or web
    if (!clean.includes('://')) {
      if (clean.startsWith('db:') || clean.startsWith('dexie:')) {
        clean = `db://${clean.replace(/^(db:|dexie:)\/?\/?/i, '')}`;
      } else if (clean.includes('.') && !clean.includes(' ')) {
        clean = `https://${clean}`;
      } else {
        // Treat as saved design name search
        clean = `db://${clean}`;
      }
    }

    setLoadError(null);
    startLoading();
    setCurrentUrl(clean);
    setInputUrl(clean);
    addToHistoryStack(clean);

    // Update history stack
    const newHistory = [...history.slice(0, historyIndex + 1), clean];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Fallback timeout to ensure loading spinner terminates smoothly
    setTimeout(() => {
      setIsLoading(false);
    }, 1800);
  };

  // Listen for navigation requests from inside the library iframe
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MINIBROWSER_NAVIGATE' && typeof e.data.url === 'string') {
        handleNavigate(e.data.url);
      }
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  // Back button
  const handleBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevUrl = history[prevIdx];
      setHistoryIndex(prevIdx);
      setCurrentUrl(prevUrl);
      setInputUrl(prevUrl);
      setLoadError(null);
      addToHistoryStack(prevUrl);
      startLoading();
      triggerReload();
    }
  };

  // Forward button
  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextUrl = history[nextIdx];
      setHistoryIndex(nextIdx);
      setCurrentUrl(nextUrl);
      setInputUrl(nextUrl);
      setLoadError(null);
      addToHistoryStack(nextUrl);
      startLoading();
      triggerReload();
    }
  };

  // Refresh button
  const triggerReload = () => {
    startLoading();
    setReloadKey(k => k + 1);
    setTimeout(() => {
      setIsLoading(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNavigate(inputUrl);
    } else if (e.key === 'Escape') {
      setInputUrl(currentUrl);
    }
  };

  const renderBrowserWindow = (isFull: boolean) => {
    // Visibility of bars:
    // When in previewMode or editor mode, respect the user's settings for TitleBar, ToolBar, TabsBar, and Footer.
    // In full-screen mode, always keep TitleBar visible so user can easily exit.
    const showTitleBar = isFull ? true : (binding.browserShowTitleBar !== false);
    const showToolBar = binding.browserShowToolBar !== false;
    const showTabsBar = binding.browserShowTabsBar !== false;
    const showFooter = binding.browserShowFooter !== false;

    return (
    <div
      style={isFull ? {
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
      } : {
        width: '100%',
        height: '100%',
        backgroundColor: element.style.backgroundColor || '#ffffff',
        borderColor: element.style.borderColor || '#cbd5e1',
        borderWidth: element.style.borderWidth ?? 1,
        borderStyle: element.style.borderStyle || 'solid',
        borderRadius: element.style.borderRadius ?? 10,
        boxShadow: element.style.shadow && element.style.shadow !== 'none'
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
          : '0 1px 3px rgba(0,0,0,0.1)'
      }}
      className={`flex flex-col overflow-hidden select-none relative font-sans text-slate-800 ${
        isFull ? 'w-full h-full rounded-none sm:rounded-xl shadow-2xl' : ''
      }`}
    >
      {/* Browser Window Titlebar */}
      {showTitleBar && (
      <div className="h-7 bg-slate-100 border-b border-slate-200 px-2.5 flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {/* macOS Style Window Controls */}
          <button
            type="button"
            onClick={isFull ? toggleFullscreen : undefined}
            title={isFull ? "Cerrar pantalla completa (Esc)" : "Ventana"}
            className={`w-2.5 h-2.5 rounded-full bg-rose-400 border border-rose-500/50 inline-block shadow-2xs ${
              isFull ? 'cursor-pointer hover:scale-125 transition-transform' : ''
            }`}
          />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500/50 inline-block shadow-2xs" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            title={isFull ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
            className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-500/50 inline-block shadow-2xs cursor-pointer hover:scale-125 transition-transform"
          />
          <span className="text-[11px] font-semibold text-slate-600 ml-2 truncate max-w-[220px]">
            {isLibraryProtocol
              ? (libraryRenderResult?.title || `Librería: ${libraryTarget?.rootName || ''}`)
              : isDbProtocol
              ? (activeDesign?.name || 'Diseño de Base de Datos')
              : (currentUrl.replace(/^https?:\/\//i, '').split('/')[0] || 'MiniBrowser')}
          </span>
        </div>

        {/* Source Protocol Badge & Mode indicators */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {isLibraryProtocol ? (
            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono font-bold flex items-center gap-1">
              <FolderTree className="w-2.5 h-2.5" />
              <span>LIBRARY</span>
            </span>
          ) : isDbProtocol ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono font-bold flex items-center gap-1">
              <Database className="w-2.5 h-2.5" />
              <span>DB DESIGN</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-mono font-bold flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />
              <span>WEB URL</span>
            </span>
          )}

          {/* Interactive Toggle for Canvas Editor */}
          {!previewMode && !isFull && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextVal = !isInteractive;
                setIsInteractive(nextVal);
                if (onUpdateElement) {
                  onUpdateElement({
                    ...element,
                    binding: {
                      ...element.binding,
                      browserInteractive: nextVal
                    }
                  });
                }
              }}
              title={isInteractive ? 'Modo Interactivo activado: Clics van al contenido. Clic para activar modo Mover' : 'Modo Mover: Clic para interactuar con los controles'}
              className={`px-1.5 py-0.5 rounded font-medium transition cursor-pointer flex items-center gap-1 ${
                isInteractive
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {isInteractive ? <MousePointer className="w-2.5 h-2.5" /> : <Move className="w-2.5 h-2.5" />}
              <span>{isInteractive ? 'Interactuar' : 'Mover'}</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            title={isFull ? 'Salir de pantalla completa (Esc)' : 'Ver en pantalla completa'}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer flex items-center gap-1 text-[10px] ${
              isFull
                ? 'bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-2xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200/80'
            }`}
          >
            {isFull ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
            <span>{isFull ? 'Salir' : 'Pantalla Completa'}</span>
          </button>
        </div>
      </div>
      )}

      {/* Browser Main Toolbar: Back, Forward, Refresh, Loading, History, Bookmarks, URL Box, Go, Design Picker */}
      {showToolBar && (
      <div className="h-10 bg-slate-50 border-b border-slate-200 px-2 flex items-center gap-1.5 flex-shrink-0 relative">
        {/* Back Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleBack();
          }}
          disabled={historyIndex <= 0}
          title="Atrás (Página anterior)"
          className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Forward Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleForward();
          }}
          disabled={historyIndex >= history.length - 1}
          title="Adelante (Página siguiente)"
          className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerReload();
          }}
          title="Recargar página (Refresh)"
          className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 cursor-pointer transition"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Visual Loading Spinner */}
        {isLoading && (
          <div className="flex items-center text-indigo-600 px-0.5 flex-shrink-0" title="Cargando contenido...">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        )}

        {/* Browser History Stack Dropdown (Stores last 10 visited URLs) */}
        <div className="relative" ref={historyDropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (pinnedSidebar === 'history') {
                handleSetPinnedSidebar('none');
              } else {
                setShowHistoryDropdown(!showHistoryDropdown);
                setShowBookmarksDropdown(false);
                setShowDesignPicker(false);
              }
            }}
            title={pinnedSidebar === 'history' ? "Historial (Fijado como barra lateral - Clic para desanclar)" : "Historial de navegación (Últimas 10 páginas)"}
            className={`p-1 rounded transition cursor-pointer flex items-center gap-0.5 ${
              pinnedSidebar === 'history'
                ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                : showHistoryDropdown
                  ? 'bg-indigo-100 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <History className="w-4 h-4" />
            {pinnedSidebar === 'history' ? (
              <Pin className="w-2.5 h-2.5 text-indigo-200 fill-current" />
            ) : (
              <span className="text-[9px] font-mono px-1 rounded bg-slate-200 text-slate-700 font-bold hidden sm:inline">
                {historyStack.length}
              </span>
            )}
          </button>

          {showHistoryDropdown && pinnedSidebar !== 'history' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-1 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-semibold text-slate-800">Historial de Navegación</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-indigo-600 font-mono font-bold">
                    {historyStack.length}/10 máx
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPinnedSidebar('history');
                    }}
                    title="Fijar como barra lateral fija (Pin)"
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Pin className="w-3 h-3 text-indigo-600" />
                    <span>Fijar</span>
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {historyStack.map((urlItem, idx) => {
                  const isCurrent = urlItem === currentUrl;
                  const isDb = urlItem.startsWith('db://');
                  const isLib = urlItem.startsWith('lib://');
                  const displayLabel = isDb
                    ? urlItem.replace(/^db:\/\//i, '')
                    : isLib
                      ? urlItem.replace(/^lib:\/\//i, '')
                      : urlItem.replace(/^https?:\/\//i, '');
                  return (
                    <button
                      key={`hist_${idx}_${urlItem}`}
                      type="button"
                      onClick={() => {
                        setShowHistoryDropdown(false);
                        handleNavigate(urlItem);
                      }}
                      title={urlItem}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                        isCurrent
                          ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                        {urlItem.toLowerCase().endsWith('.msg') ? (
                          <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        ) : isLib ? (
                          <FolderTree className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        ) : isDb ? (
                          <Database className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 truncate">
                          <div className="truncate text-xs">{displayLabel}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{urlItem}</div>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold flex-shrink-0">
                          Actual
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1 px-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>Pila de últimas 10 visitas</span>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryStack([currentUrl]);
                  }}
                  className="text-rose-500 hover:underline cursor-pointer"
                >
                  Limpiar historial
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Favorites / Bookmarks Dropdown & Toggle Button */}
        <div className="relative flex items-center" ref={bookmarksDropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (pinnedSidebar === 'bookmarks') {
                handleSetPinnedSidebar('none');
              } else {
                setShowBookmarksDropdown(!showBookmarksDropdown);
                setShowHistoryDropdown(false);
                setShowDesignPicker(false);
              }
            }}
            title={pinnedSidebar === 'bookmarks' ? 'Favoritos (Fijado como barra lateral - Clic para desanclar)' : isCurrentUrlBookmarked ? 'Página guardada en Favoritos (Clic para ver lista)' : 'Favoritos / Marcadores (Clic para ver lista)'}
            className={`p-1 rounded transition cursor-pointer flex items-center gap-0.5 ${
              pinnedSidebar === 'bookmarks'
                ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                : isCurrentUrlBookmarked
                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                  : showBookmarksDropdown
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <Star className={`w-4 h-4 ${isCurrentUrlBookmarked || pinnedSidebar === 'bookmarks' ? 'fill-current' : ''}`} />
            {pinnedSidebar === 'bookmarks' ? (
              <Pin className="w-2.5 h-2.5 text-amber-100 fill-current" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            )}
          </button>

          {showBookmarksDropdown && pinnedSidebar !== 'bookmarks' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-1 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span className="font-semibold text-slate-800">Sitios Favoritos (Marcadores)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-600 font-mono font-bold">
                    {bookmarks.length} guardados
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPinnedSidebar('bookmarks');
                    }}
                    title="Fijar como barra lateral fija (Pin)"
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Pin className="w-3 h-3 text-amber-500" />
                    <span>Fijar</span>
                  </button>
                </div>
              </div>

              {/* Quick Action: Bookmark / Unbookmark Current Page */}
              <div className="p-1 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleFavorite();
                  }}
                  className={`w-full py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs ${
                    isCurrentUrlBookmarked
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isCurrentUrlBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
                  <span>{isCurrentUrlBookmarked ? 'Quitar página actual de Favoritos' : 'Guardar página actual en Favoritos'}</span>
                </button>
              </div>

              {/* Saved Bookmarks List */}
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-[11px] italic">
                    No hay sitios guardados en favoritos todavía.
                  </div>
                ) : (
                  bookmarks.map((bm) => {
                    const isCurrent = bm.url === currentUrl;
                    const isDb = bm.url.startsWith('db://');
                    const isLib = bm.url.startsWith('lib://');
                    return (
                      <div
                        key={bm.id}
                        className={`px-2 py-1.5 rounded flex items-center justify-between text-xs transition ${
                          isCurrent ? 'bg-amber-50/70 border border-amber-200/60' : 'hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowBookmarksDropdown(false);
                            handleNavigate(bm.url);
                          }}
                          title={`Navegar a ${bm.url}`}
                          className="flex items-center gap-1.5 min-w-0 text-left flex-1 mr-1 cursor-pointer truncate"
                        >
                          {(bm.url || '').toLowerCase().endsWith('.msg') ? (
                            <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          ) : isLib ? (
                            <FolderTree className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          ) : isDb ? (
                            <Database className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="font-semibold text-slate-800 truncate text-[11px]">{bm.title || bm.url}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{bm.url}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBookmark(bm.id);
                          }}
                          title="Eliminar de favoritos"
                          className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1 px-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Persiste en binding del elemento</span>
                <span className="font-mono text-indigo-600">{bookmarks.length} URLs</span>
              </div>
            </div>
          )}
        </div>

        {/* URL Box Input Container */}
        <div className="flex-1 flex items-center bg-white border border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 rounded-md px-2 py-0.5 transition shadow-2xs">
          {/* Protocol indicator icon */}
          {isLibraryProtocol ? (
            <FolderTree className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mr-1.5" />
          ) : isDbProtocol ? (
            <Database className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mr-1.5" />
          ) : currentUrl.startsWith('https://') ? (
            <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mr-1.5" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mr-1.5" />
          )}

          {/* Editable URL Box */}
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="URL web (https://...), diseño (db://...) o archivo librería (lib://raiz/archivo.html)"
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-mono"
          />

          {/* Quick Saved Designs Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDesignPicker(!showDesignPicker);
              }}
              title="Seleccionar diseño guardado en la base de datos"
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition cursor-pointer"
            >
              <Database className="w-3 h-3 text-indigo-500" />
              <span className="hidden sm:inline">Diseños DB</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Designs Dropdown Menu */}
            {showDesignPicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span>Diseños en IndexedDB</span>
                  <span className="text-emerald-600 font-mono font-normal">
                    {savedDesigns.length + 1} disp.
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {/* Current canvas design option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDesignPicker(false);
                      handleNavigate('db://diseño-actual');
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                      currentUrl === 'db://diseño-actual'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="truncate">Diseño Actual del Lienzo</span>
                      {currentDocument?.pages && currentDocument.pages.length > 1 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold font-mono flex-shrink-0">
                          {currentDocument.pages.length} págs
                        </span>
                      )}
                    </div>
                    {currentUrl === 'db://diseño-actual' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  {/* Demo sales template */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDesignPicker(false);
                      handleNavigate(`db://${DEMO_CANVAS_TEMPLATE.name}`);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                      currentUrl === `db://${DEMO_CANVAS_TEMPLATE.name}`
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{DEMO_CANVAS_TEMPLATE.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-semibold font-mono flex-shrink-0">
                        {DEMO_CANVAS_TEMPLATE.pages?.length || 3} págs
                      </span>
                    </div>
                    {currentUrl === `db://${DEMO_CANVAS_TEMPLATE.name}` && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  {/* Saved designs from active DB */}
                  {savedDesigns.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setShowDesignPicker(false);
                        handleNavigate(`db://${d.name}`);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                        currentUrl === `db://${d.name}`
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Database className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{d.name}</span>
                        {d.pages && d.pages.length > 1 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold font-mono flex-shrink-0">
                            {d.pages.length} págs
                          </span>
                        )}
                      </div>
                      {currentUrl === `db://${d.name}` && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}

                  {/* Library Roots section */}
                  {libraryRoots.length > 0 && (
                    <div className="pt-1.5 mt-1 border-t border-slate-100">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <FolderTree className="w-3 h-3 text-indigo-500" />
                        <span>Librería de Archivos</span>
                      </div>
                      {libraryRoots.map((r) => {
                        const isSelected = currentUrl === `lib://${r.name}` || currentUrl.startsWith(`lib://${r.name}/`);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setShowDesignPicker(false);
                              handleNavigate(`lib://${r.name}`);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FolderTree className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              <span className="truncate">lib://{r.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold font-mono flex-shrink-0">
                                {r.fileCount || 0} arch
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1 px-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>URLs rápidas:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDesignPicker(false);
                      handleNavigate('https://example.com');
                    }}
                    className="text-indigo-600 hover:underline cursor-pointer"
                  >
                    example.com
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDesignPicker(false);
                      handleNavigate('https://wikipedia.org');
                    }}
                    className="text-indigo-600 hover:underline cursor-pointer"
                  >
                    wikipedia.org
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Go Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(inputUrl);
          }}
          title="Navegar (Ir a la dirección)"
          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
        >
          <span>Go</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {/* External Link button to open in standard browser tab */}
        {!isDbProtocol && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Abrir en pestaña nueva del navegador"
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 cursor-pointer transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Fullscreen Toolbar Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          title={isFull ? 'Salir de pantalla completa (Esc)' : 'Mostrar en pantalla completa (Fullscreen)'}
          className={`p-1 rounded transition cursor-pointer flex items-center justify-center ${
            isFull
              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/80'
          }`}
        >
          {isFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Visual Loading Progress Bar on Toolbar */}
        <div className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-200/60 overflow-hidden z-20 pointer-events-none transition-opacity duration-300 ${
          isLoading || loadingProgress > 0 ? 'opacity-100' : 'opacity-0'
        }`}>
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600 transition-all duration-200 ease-out shadow-xs"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      </div>
      )}

      {/* Multi-Page Tabs Navigation Bar for DB Designs (independent from Tool Bar) */}
      {showTabsBar && isDbProtocol && !isLibraryProtocol && designPages.length >= 1 && (
        <div className="h-8 bg-slate-100 border-b border-slate-200 px-2 flex items-center justify-between text-xs flex-shrink-0 select-none">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 flex-1">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1 flex-shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Páginas:</span>
            </div>
            {designPages.map((page, idx) => {
              const isActive = idx === activePageIndex;
              const elemCount = page.elements ? page.elements.length : 0;
              return (
                <button
                  key={page.id || `minibrowser_page_${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPage(idx);
                  }}
                  title={`${page.name || `Página ${idx + 1}`} (${elemCount} elementos)`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-white text-indigo-700 font-semibold shadow-2xs border border-indigo-200 ring-1 ring-indigo-500/20'
                      : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="truncate max-w-[120px]">{page.name || `Página ${idx + 1}`}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-indigo-50 text-indigo-600 font-bold' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {elemCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Page Prev/Next and Page Counter */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-2 border-l border-slate-200 flex-shrink-0 font-mono">
            <span className="font-semibold text-slate-600">
              {activePageIndex + 1}/{designPages.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (activePageIndex > 0) handleSelectPage(activePageIndex - 1);
              }}
              disabled={activePageIndex <= 0}
              title="Página anterior"
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (activePageIndex < designPages.length - 1) handleSelectPage(activePageIndex + 1);
              }}
              disabled={activePageIndex >= designPages.length - 1}
              title="Página siguiente"
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Browser Viewport Area with Optional Fixed Pinned Sidebar */}
      <div className="flex-1 w-full h-full min-h-0 min-w-0 relative flex overflow-hidden">
        {/* Fixed Pinned Sidebar for History / Bookmarks */}
        {pinnedSidebar !== 'none' && (
          <aside className="w-64 sm:w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20 h-full shadow-xs text-xs animate-in slide-in-from-left duration-150">
            {/* Header: Switcher between History & Bookmarks, Unpin button, Close button */}
            <div className="p-2 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-1 flex-shrink-0">
              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => handleSetPinnedSidebar('history')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    pinnedSidebar === 'history'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ver Historial"
                >
                  <History className="w-3 h-3 text-indigo-600" />
                  <span>Historial</span>
                  <span className="text-[9px] px-1 rounded bg-indigo-50 text-indigo-700 font-mono font-bold">
                    {historyStack.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPinnedSidebar('bookmarks')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    pinnedSidebar === 'bookmarks'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ver Favoritos"
                >
                  <Star className={`w-3 h-3 ${pinnedSidebar === 'bookmarks' ? 'fill-amber-400 text-amber-500' : 'text-amber-500'}`} />
                  <span>Favoritos</span>
                  <span className="text-[9px] px-1 rounded bg-amber-50 text-amber-700 font-mono font-bold">
                    {bookmarks.length}
                  </span>
                </button>
              </div>

              {/* Action buttons: Unpin & Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetPinnedSidebar('none')}
                  title="Desanclar panel (volver a menú flotante)"
                  className="px-1.5 py-1 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                >
                  <PinOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desanclar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPinnedSidebar('none')}
                  title="Cerrar barra lateral"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sidebar Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
              {pinnedSidebar === 'history' && (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pb-1 border-b border-slate-100 mb-1">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Últimas 10 visitas
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryStack([currentUrl])}
                      className="text-rose-500 hover:underline cursor-pointer text-[10px]"
                    >
                      Limpiar historial
                    </button>
                  </div>

                  <div className="space-y-1">
                    {historyStack.map((urlItem, idx) => {
                      const isCurrent = urlItem === currentUrl;
                      const isDb = urlItem.startsWith('db://');
                      const isLib = urlItem.startsWith('lib://');
                      const displayLabel = isDb
                        ? urlItem.replace(/^db:\/\//i, '')
                        : isLib
                          ? urlItem.replace(/^lib:\/\//i, '')
                          : urlItem.replace(/^https?:\/\//i, '');
                      return (
                        <button
                          key={`pinned_hist_${idx}_${urlItem}`}
                          type="button"
                          onClick={() => handleNavigate(urlItem)}
                          title={urlItem}
                          className={`w-full text-left p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                            isCurrent
                              ? 'bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
                            {urlItem.toLowerCase().endsWith('.msg') ? (
                              <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            ) : isLib ? (
                              <FolderTree className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            ) : isDb ? (
                              <Database className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0 truncate">
                              <div className="truncate text-xs font-medium text-slate-800">{displayLabel}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">{urlItem}</div>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold flex-shrink-0">
                              Actual
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {pinnedSidebar === 'bookmarks' && (
                <>
                  {/* Quick Action: Bookmark / Unbookmark Current Page */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs ${
                        isCurrentUrlBookmarked
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isCurrentUrlBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
                      <span>{isCurrentUrlBookmarked ? 'Quitar página de Favoritos' : 'Guardar página en Favoritos'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {bookmarks.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-[11px] italic">
                        No hay sitios guardados en favoritos todavía.
                      </div>
                    ) : (
                      bookmarks.map((bm) => {
                        const isCurrent = bm.url === currentUrl;
                        const isDb = bm.url.startsWith('db://');
                        const isLib = bm.url.startsWith('lib://');
                        return (
                          <div
                            key={`pinned_bm_${bm.id}`}
                            className={`p-2 rounded-lg flex items-center justify-between text-xs transition ${
                              isCurrent
                                ? 'bg-amber-50/80 border border-amber-200 shadow-2xs'
                                : 'hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleNavigate(bm.url)}
                              title={`Navegar a ${bm.url}`}
                              className="flex items-center gap-2 min-w-0 text-left flex-1 mr-1.5 cursor-pointer truncate"
                            >
                              {(bm.url || '').toLowerCase().endsWith('.msg') ? (
                                <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              ) : isLib ? (
                                <FolderTree className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              ) : isDb ? (
                                <Database className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                              )}
                              <div className="truncate">
                                <div className="font-semibold text-slate-800 truncate text-[11px]">
                                  {bm.title || bm.url}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{bm.url}</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBookmark(bm.id);
                              }}
                              title="Eliminar de favoritos"
                              className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Pinned Sidebar Footer */}
            <div className="p-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 flex items-center justify-between flex-shrink-0">
              <span className="flex items-center gap-1 text-indigo-700 font-medium">
                <Pin className="w-3 h-3" />
                <span>Barra lateral fijada</span>
              </span>
              <button
                type="button"
                onClick={() => handleSetPinnedSidebar('none')}
                className="text-indigo-600 hover:underline cursor-pointer font-medium"
              >
                Desanclar
              </button>
            </div>
          </aside>
        )}

        {/* Iframe Viewport Container with Zoom and Fit support */}
        <div
          ref={viewportRef}
        style={{
          backgroundColor: isDbProtocol ? (activeDesign?.backgroundColor || '#ffffff') : '#ffffff'
        }}
        className={`flex-1 w-full h-full min-h-0 min-w-0 relative p-0 flex ${
          isFitMode && fitModeType === 'contain' ? 'items-center justify-center' : 'items-start justify-start'
        } ${isFitMode ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        {/* Pointer-events overlay when in design edit mode and interactive mode is OFF */}
        {!previewMode && !isInteractive && !isFull && (
          <div
            title="Haz clic en 'Interactuar' en la barra superior para interactuar con los enlaces y contenido del iframe"
            className="absolute inset-0 z-20 bg-transparent cursor-move"
          />
        )}

        {/* If loading web page, provide error or security notice if blocked */}
        {loadError && (
          <div className="absolute inset-0 z-30 bg-white/95 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">No se pudo cargar la dirección</h4>
            <p className="text-xs text-slate-500 max-w-sm mb-3">
              {loadError || 'Algunos sitios externos (como Google o GitHub) bloquean la visualización dentro de iframes por políticas de seguridad (X-Frame-Options / CSP).'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('db://diseño-actual')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                Cargar Diseño de Base de Datos
              </button>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Abrir en nueva pestaña
              </a>
            </div>
          </div>
        )}

        {/* Scaled viewport inner wrapper */}
        <div
          style={{
            width: (isDbProtocol && !isLibraryProtocol)
              ? (isFitMode ? '100%' : `${Math.round(contentWidth * zoomLevel)}px`)
              : (isFitMode ? '100%' : (zoomLevel === 1 ? '100%' : `${Math.round(100 * zoomLevel)}%`)),
            height: (isDbProtocol && !isLibraryProtocol)
              ? (isFitMode ? '100%' : `${Math.round(contentHeight * zoomLevel)}px`)
              : (isFitMode ? '100%' : (zoomLevel === 1 ? '100%' : `${Math.round(100 * zoomLevel)}%`)),
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: (isDbProtocol && !isLibraryProtocol) ? (activeDesign?.backgroundColor || '#ffffff') : '#ffffff',
            boxShadow: 'none'
          }}
          className={(!isDbProtocol || isLibraryProtocol) && zoomLevel === 1 ? 'w-full h-full' : ''}
        >
          <div
            style={{
              width: (isDbProtocol && !isLibraryProtocol) ? `${contentWidth}px` : (isFitMode ? '100%' : `${100 / zoomLevel}%`),
              height: (isDbProtocol && !isLibraryProtocol) ? `${contentHeight}px` : (isFitMode ? '100%' : `${100 / zoomLevel}%`),
              transform: isFitMode
                ? ((isDbProtocol && !isLibraryProtocol) ? `scale(${scaleX}, ${scaleY})` : undefined)
                : `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0
            }}
            className="w-full h-full overflow-hidden"
          >
            {/* The Core Browser Viewport: Library files / Interactive React Elements for db:// / Iframe for external web URLs */}
            {isLibraryProtocol ? (
              <iframe
                key={`iframe_lib_${reloadKey}_${currentUrl}_${isFull ? 'full' : 'inline'}`}
                ref={iframeRef}
                srcDoc={libraryRenderResult?.html}
                title={libraryRenderResult?.title || 'MiniBrowser Library Viewport'}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                scrolling="auto"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError('Error al renderizar archivo de la librería.');
                }}
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                className="w-full h-full border-0 block select-text"
              />
            ) : isDbProtocol ? (
              renderElement ? (
                <div
                  style={{
                    width: `${contentWidth}px`,
                    height: `${contentHeight}px`,
                    position: 'relative',
                    backgroundColor: (designPages[activePageIndex]?.backgroundColor) || (activeDesign?.backgroundColor) || '#ffffff',
                    overflow: 'hidden'
                  }}
                  className="w-full h-full relative select-text"
                >
                  {(designPages[activePageIndex]?.elements || [])
                    .filter(el => el.visible !== false)
                    .map(el => {
                      if (el.type === 'minibrowser') {
                        return (
                          <div
                            key={el.id}
                            style={{
                              position: 'absolute',
                              left: `${el.x}px`,
                              top: `${el.y}px`,
                              width: `${el.width}px`,
                              height: `${el.height}px`,
                              zIndex: el.zIndex || 1
                            }}
                            className="border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-3 text-center text-slate-400 select-none pointer-events-none"
                          >
                            <Globe className="w-5 h-5 mb-1 text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-500">MiniBrowser</span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[90%]">
                              {el.binding?.browserUrl || 'db://'}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                            zIndex: el.zIndex || 1,
                            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined
                          }}
                        >
                          {renderElement(el, activeDesign || currentDocument)}
                        </div>
                      );
                    })}

                  {(!designPages[activePageIndex]?.elements || designPages[activePageIndex].elements.length === 0) && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center select-none">
                      <Database className="w-10 h-10 mb-2 text-indigo-300" />
                      <span className="text-sm font-bold text-slate-600">Página sin elementos</span>
                      <span className="text-xs text-slate-400 mt-1 max-w-xs">
                        No hay elementos configurados en esta página del diseño seleccionado.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <iframe
                  key={`iframe_doc_${reloadKey}_${isFull ? 'full' : 'inline'}`}
                  ref={iframeRef}
                  srcDoc={srcDocContent}
                  title={activeDesign?.name || 'Diseño Renderizado en MiniBrowser'}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  onLoad={() => setIsLoading(false)}
                  scrolling="no"
                  style={{ width: '100%', height: '100%', border: 0, display: 'block', overflow: 'hidden' }}
                  className="w-full h-full border-0 block overflow-hidden"
                />
              )
            ) : (
              <iframe
                key={`iframe_web_${reloadKey}_${currentUrl}_${isFull ? 'full' : 'inline'}`}
                ref={iframeRef}
                src={currentUrl}
                title="MiniBrowser Web Viewport"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                scrolling={isFitMode ? 'no' : 'auto'}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError('El sitio web remoto denegó la inserción en iframe (X-Frame-Options: SAMEORIGIN).');
                }}
                style={{ width: '100%', height: '100%', border: 0, display: 'block', overflow: isFitMode ? 'hidden' : 'auto' }}
                className="w-full h-full border-0 block"
              />
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Footer status bar with Zoom and Fit Controls */}
      {showFooter && (
      <div className="h-7 sm:h-8 bg-slate-50 border-t border-slate-200 px-2 sm:px-3 flex items-center justify-between text-xs text-slate-500 flex-shrink-0 select-none z-10">
        {/* Left Status & URL info */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLibraryProtocol ? 'bg-indigo-500' : isDbProtocol ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
          <span className="truncate text-[11px] text-slate-600 font-mono hidden sm:inline max-w-[140px] md:max-w-[240px]">
            {currentUrl}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 font-mono font-medium flex-shrink-0">
            {isLibraryProtocol ? `Librería: ${libraryTarget?.rootName || 'lib'}` : isDbProtocol ? 'Dexie Store' : 'Web'}
          </span>
          {isFull && (
            <span className="text-amber-700 bg-amber-100 font-bold px-1.5 py-0.2 rounded text-[9px] border border-amber-300 flex-shrink-0">
              PANTALLA COMPLETA
            </span>
          )}
          {isDbProtocol && designPages.length > 1 && (
            <span className="text-[10px] text-indigo-600 font-medium truncate hidden md:inline">
              • Pág. {activePageIndex + 1}/{designPages.length}: {designPages[activePageIndex]?.name || ''}
            </span>
          )}
        </div>

        {/* Right Zoom & Fit Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Fit to Dimensions Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFitToWindow('expand');
            }}
            title="Ajustar y expandir el contenido al espacio disponible sin barras de desplazamiento"
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition border ${
              isFitMode
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-2xs font-semibold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Scan className="w-3 h-3 text-indigo-600" />
            <span className="hidden xs:inline sm:inline">Ajustar</span>
          </button>

          {/* Zoom Out (-) */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.2}
            title="Reducir zoom (-)"
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Percentage Dropdown */}
          <div className="relative" ref={zoomDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowZoomDropdown(prev => !prev);
              }}
              title="Opciones de zoom y escala"
              className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
            >
              <span>{Math.round(zoomLevel * 100)}%</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {showZoomDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Ajuste de Escala</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowZoomDropdown(false);
                    handleFitToWindow('expand');
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between text-xs cursor-pointer ${
                    isFitMode && fitModeType === 'expand' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>Expandir todo el espacio</span>
                  {isFitMode && fitModeType === 'expand' && <Check className="w-3 h-3 text-indigo-600" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowZoomDropdown(false);
                    handleFitToWindow('contain');
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between text-xs cursor-pointer ${
                    isFitMode && fitModeType === 'contain' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>Ajuste proporcional</span>
                  {isFitMode && fitModeType === 'contain' && <Check className="w-3 h-3 text-indigo-600" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowZoomDropdown(false);
                    handleFitToWindow('width');
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between text-xs cursor-pointer ${
                    isFitMode && fitModeType === 'width' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>Ajustar al ancho</span>
                  {isFitMode && fitModeType === 'width' && <Check className="w-3 h-3 text-indigo-600" />}
                </button>

                <div className="border-t border-slate-100 my-1" />
                <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">Porcentaje</div>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={(e) => handleSelectZoomPreset(presetVal, e)}
                    className={`w-full text-left px-2 py-1 rounded flex items-center justify-between text-xs cursor-pointer ${
                      !isFitMode && Math.abs(zoomLevel - presetVal) < 0.02
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{Math.round(presetVal * 100)}%</span>
                    {!isFitMode && Math.abs(zoomLevel - presetVal) < 0.02 && (
                      <Check className="w-3 h-3 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom In (+) */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.0}
            title="Aumentar zoom (+)"
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Reset 100% */}
          <button
            type="button"
            onClick={handleResetZoom}
            title="Restablecer al 100%"
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 cursor-pointer transition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

  if (isFullscreen) {
    return (
      <>
        {/* Canvas placeholder while in fullscreen */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: element.style.borderRadius ?? 10,
          }}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-400 bg-indigo-50/80 text-indigo-900 select-none text-center shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2 shadow-xs">
            <Maximize2 className="w-5 h-5 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-800">MiniBrowser en Pantalla Completa</p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px] truncate">{currentUrl}</p>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Restaurar al Lienzo</span>
          </button>
        </div>

        {/* Portal full screen overlay directly attached to document.body */}
        {createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-xs flex flex-col p-2 sm:p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl flex flex-col bg-white border border-slate-700">
              {renderBrowserWindow(true)}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return renderBrowserWindow(false);
};
