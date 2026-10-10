import React, { useState, useEffect, useMemo } from 'react';
import { usePwa } from '../hooks/usePwa';
import { pwaService, CacheEntryItem, ManifestConfig, DEFAULT_MANIFEST_CONFIG } from '../services/pwaService';
import { dexieManager } from '../services/dexieManager';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';
import {
  Download,
  CheckCircle2,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Zap,
  HardDrive,
  Share,
  PlusSquare,
  Sparkles,
  RefreshCw,
  Database,
  FileText,
  Code,
  Palette,
  Trash2,
  Plus,
  Search,
  Sliders,
  Eye,
  RotateCcw,
  Check,
  Globe,
  X
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = 'install' | 'cache' | 'manifest';

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isInstalled, canInstall, isOnline, hasUpdate, isStoragePersistent, storageUsageMb, installPwa, updateApp } = usePwa();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('install');
  const [activeGuideTab, setActiveGuideTab] = useState<'desktop' | 'ios' | 'android'>('desktop');
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  // Cache Management States
  const [cacheEntries, setCacheEntries] = useState<CacheEntryItem[]>([]);
  const [cacheTotalBytes, setCacheTotalBytes] = useState<number>(0);
  const [isLoadingCache, setIsLoadingCache] = useState<boolean>(false);
  const [cacheSearch, setCacheSearch] = useState<string>('');
  const [cacheCategoryFilter, setCacheCategoryFilter] = useState<string>('all');
  const [customCacheUrlInput, setCustomCacheUrlInput] = useState<string>('');
  const [cacheActionMessage, setCacheActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manifest Management States
  const [manifestConfig, setManifestConfig] = useState<ManifestConfig>(DEFAULT_MANIFEST_CONFIG);
  const [manifestSaveMsg, setManifestSaveMsg] = useState<string | null>(null);

  // Color preset palettes for Manifest
  const THEME_COLOR_PRESETS = [
    { label: 'Discord / Indigo', value: '#5865f2' },
    { label: 'Emerald Green', value: '#10b981' },
    { label: 'Sky Blue', value: '#0ea5e9' },
    { label: 'Purple / Violet', value: '#8b5cf6' },
    { label: 'Amber / Orange', value: '#f59e0b' },
    { label: 'Rose / Red', value: '#f43f5e' },
    { label: 'Dark Slate', value: '#202225' },
    { label: 'Deep Black', value: '#111216' }
  ];

  const BG_COLOR_PRESETS = [
    { label: 'Dark Studio', value: '#111216' },
    { label: 'Dark Gray', value: '#18191c' },
    { label: 'Medium Gray', value: '#202225' },
    { label: 'Pure Black', value: '#000000' },
    { label: 'Light Clean', value: '#f8fafc' },
    { label: 'Pure White', value: '#ffffff' }
  ];

  const AVAILABLE_CATEGORIES = [
    'productivity',
    'utilities',
    'business',
    'developer',
    'design',
    'education'
  ];

  // Load cache entries and manifest on mount or tab change
  const loadCacheData = async () => {
    setIsLoadingCache(true);
    try {
      const data = await pwaService.getAllCacheEntries();
      setCacheEntries(data.entries);
      setCacheTotalBytes(data.totalBytes);
    } catch (err) {
      console.warn('Error loading cache entries:', err);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const loadManifestData = () => {
    const config = pwaService.getManifestConfig();
    setManifestConfig(config);
  };

  useEffect(() => {
    if (isOpen) {
      loadCacheData();
      loadManifestData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeMainTab === 'cache') {
      loadCacheData();
    }
  }, [activeMainTab]);

  /* ----------------------------------------------------
     INSTALLATION HANDLERS
  ---------------------------------------------------- */
  const handleInstallClick = async () => {
    setInstallStatus('Iniciando instalación...');
    const result = await installPwa();
    if (result === 'accepted') {
      setInstallStatus('¡Instalación completada con éxito!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else if (result === 'dismissed') {
      setInstallStatus('Instalación pospuesta.');
    } else {
      setInstallStatus('Sigue las instrucciones de tu navegador a continuación.');
    }
  };

  const handleForceCacheAll = async () => {
    setIsLoadingCache(true);
    setCacheActionMessage(null);
    try {
      pwaService.prewarmAllPagesAndRoutes();
      await dexieManager.cacheAllDatabasesForOffline();
      await pwaService.requestStoragePersistence();
      await loadCacheData();
      setCacheActionMessage({
        type: 'success',
        text: '¡Todas las páginas, scripts, estilos y bases de datos han sido cacheadas con Cache-First!'
      });
    } catch (err: any) {
      console.warn('Error force caching:', err);
      setCacheActionMessage({
        type: 'success',
        text: 'Caché sincronizado en Service Worker e IndexedDB.'
      });
    } finally {
      setIsLoadingCache(false);
    }
  };

  /* ----------------------------------------------------
     CACHE CONTROL HANDLERS
  ---------------------------------------------------- */
  const handleToggleCacheItem = async (item: CacheEntryItem) => {
    const newStatus = !item.isActive;
    await pwaService.toggleCacheItem(item, newStatus);
    setCacheEntries(prev =>
      prev.map(entry => (entry.id === item.id ? { ...entry, isActive: newStatus } : entry))
    );
    setCacheActionMessage({
      type: 'success',
      text: newStatus
        ? `Elemento activado y cacheado: ${item.relativeUrl}`
        : `Elemento desactivado de la caché: ${item.relativeUrl}`
    });
    setTimeout(() => setCacheActionMessage(null), 3500);
  };

  const handleDeleteCacheItem = async (item: CacheEntryItem) => {
    await pwaService.deleteCacheEntry(item.cacheName, item.url);
    await pwaService.toggleCacheItem(item, false);
    await loadCacheData();
    setCacheActionMessage({
      type: 'success',
      text: `Eliminado de la caché: ${item.relativeUrl}`
    });
    setTimeout(() => setCacheActionMessage(null), 3000);
  };

  const handleAddCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCacheUrlInput.trim()) return;
    const url = customCacheUrlInput.trim();
    setIsLoadingCache(true);
    const success = await pwaService.addCustomCacheUrl(url);
    if (success) {
      setCustomCacheUrlInput('');
      await loadCacheData();
      setCacheActionMessage({
        type: 'success',
        text: `URL agregada exitosamente a la caché: ${url}`
      });
    } else {
      setCacheActionMessage({
        type: 'error',
        text: `No se pudo obtener ni cachear la URL: ${url}`
      });
    }
    setIsLoadingCache(false);
    setTimeout(() => setCacheActionMessage(null), 4000);
  };

  const handleClearAllCache = async () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la caché del Service Worker? La app volverá a consultar los recursos por red al reiniciar.')) {
      setIsLoadingCache(true);
      await pwaService.clearAllCache();
      await loadCacheData();
      setCacheActionMessage({
        type: 'success',
        text: 'Caché del Service Worker vaciada con éxito.'
      });
      setIsLoadingCache(false);
      setTimeout(() => setCacheActionMessage(null), 3500);
    }
  };

  /* ----------------------------------------------------
     MANIFEST CONTROL HANDLERS
  ---------------------------------------------------- */
  const handleSaveManifest = () => {
    const success = pwaService.saveManifestConfig(manifestConfig);
    if (success) {
      setManifestSaveMsg('¡Manifiesto guardado y aplicado dinámicamente al navegador!');
      setTimeout(() => setManifestSaveMsg(null), 3500);
    }
  };

  const handleResetManifest = () => {
    if (window.confirm('¿Restablecer el manifiesto a sus valores predeterminados de fábrica?')) {
      const defaults = pwaService.resetManifestConfig();
      setManifestConfig(defaults);
      setManifestSaveMsg('Manifiesto restablecido a los valores predeterminados.');
      setTimeout(() => setManifestSaveMsg(null), 3500);
    }
  };

  const handleDownloadManifest = () => {
    pwaService.downloadManifestJson(manifestConfig);
  };

  const handleToggleCategory = (cat: string) => {
    setManifestConfig(prev => {
      const exists = prev.categories.includes(cat);
      const nextCategories = exists
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories: nextCategories };
    });
  };

  /* ----------------------------------------------------
     FILTERED CACHE ENTRIES
  ---------------------------------------------------- */
  const filteredCacheEntries = useMemo(() => {
    return cacheEntries.filter(entry => {
      const matchSearch =
        entry.relativeUrl.toLowerCase().includes(cacheSearch.toLowerCase()) ||
        entry.cacheName.toLowerCase().includes(cacheSearch.toLowerCase()) ||
        (entry.contentType && entry.contentType.toLowerCase().includes(cacheSearch.toLowerCase()));

      const matchCategory =
        cacheCategoryFilter === 'all' || entry.category === cacheCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [cacheEntries, cacheSearch, cacheCategoryFilter]);

  const activeEntriesCount = cacheEntries.filter(e => e.isActive).length;
  const disabledEntriesCount = cacheEntries.filter(e => !e.isActive).length;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getCategoryIcon = (category: CacheEntryItem['category']) => {
    switch (category) {
      case 'page':
        return <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />;
      case 'script':
        return <Code className="w-3.5 h-3.5 text-amber-400" />;
      case 'style':
        return <Palette className="w-3.5 h-3.5 text-pink-400" />;
      case 'icon':
        return <Eye className="w-3.5 h-3.5 text-emerald-400" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-[#5865f2]" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-[#9ca3af]" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs transition-all duration-200 animate-in fade-in duration-200 ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div className={`bg-[#18191c] border border-[#2f3136] shadow-2xl overflow-hidden flex flex-col text-[#e1e1e6] transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-2xl max-h-[92vh] rounded-2xl'
      }`}>
        {/* Header with gradient branding & Close */}
        <div className="px-6 py-3.5 border-b border-[#2f3136] bg-[#202225] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5865f2] via-[#7c3aed] to-[#38bdf8] flex items-center justify-center text-white shadow-md font-bold text-sm flex-shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Centro de Control PWA & Offline
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono">
                  Cache-First v2
                </span>
              </h2>
              <p className="text-[11px] text-[#9ca3af]">
                Gestión de instalación, almacenamiento de caché y configuración del manifiesto Web
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModalFullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={() => setIsFullscreen(prev => !prev)}
            />
            <button
              onClick={onClose}
              className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#2f3136] transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="px-6 bg-[#1e2023] border-b border-[#2f3136] flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveMainTab('install')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'install'
                ? 'border-[#5865f2] text-white'
                : 'border-transparent text-[#9ca3af] hover:text-[#e1e1e6]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalación & Estado</span>
          </button>

          <button
            onClick={() => setActiveMainTab('cache')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'cache'
                ? 'border-[#38bdf8] text-white'
                : 'border-transparent text-[#9ca3af] hover:text-[#e1e1e6]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Explorador de Caché</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#2b2d31] rounded-full text-[#38bdf8]">
              {cacheEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('manifest')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'manifest'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-[#9ca3af] hover:text-[#e1e1e6]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editor de Manifiesto</span>
            <span
              className="w-2 h-2 rounded-full border border-white/30"
              style={{ backgroundColor: manifestConfig.theme_color || '#5865f2' }}
            />
          </button>
        </div>

        {/* Tab 1: Installation & General Status */}
        {activeMainTab === 'install' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#202225] border border-[#2f3136]">
                {isOnline ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="text-xs">
                      <div className="font-semibold text-white flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Conectado</span>
                      </div>
                      <div className="text-[11px] text-[#9ca3af]">Cache-First activo</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="text-xs">
                      <div className="font-semibold text-white flex items-center gap-1">
                        <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                        <span>Modo Offline</span>
                      </div>
                      <div className="text-[11px] text-[#9ca3af]">100% funcional local</div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#202225] border border-[#2f3136]">
                {isInstalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="text-xs">
                      <div className="font-semibold text-white">PWA Nativa</div>
                      <div className="text-[11px] text-emerald-400">Modo Autónomo</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#5865f2] flex-shrink-0" />
                    <div className="text-xs">
                      <div className="font-semibold text-white">Instalable</div>
                      <div className="text-[11px] text-[#9ca3af]">Escritorio / Móvil</div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#202225] border border-[#2f3136] col-span-2 sm:col-span-1">
                <HardDrive className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-white">
                    {isStoragePersistent ? 'Almacenamiento Seguro' : 'IndexedDB Local'}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]">
                    {storageUsageMb > 0 ? `${storageUsageMb} MB en uso` : 'Persistencia activa'}
                  </div>
                </div>
              </div>
            </div>

            {/* Cache-First & Offline Engine Card */}
            <div className="p-3.5 bg-[#202225] border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>
                    Estrategia de Caché:{' '}
                    <strong className="text-emerald-400">Cache-First Instantáneo</strong>
                  </span>
                </div>
                <button
                  onClick={handleForceCacheAll}
                  disabled={isLoadingCache}
                  className="px-2.5 py-1 bg-[#2b2d31] hover:bg-[#35373c] text-xs text-[#38bdf8] hover:text-white rounded-lg border border-[#373a40] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Sincronizar y verificar la caché local de todas las páginas y tablas"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCache ? 'animate-spin' : ''}`} />
                  <span>{isLoadingCache ? 'Cacheando...' : 'Recachear Todo'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                Todas las páginas, scripts de interfaz, iconos y bases de datos Dexie se sirven directamente desde la memoria caché ultrarrápida del dispositivo (0ms de latencia) y se revalidan en segundo plano sin bloquear tu trabajo.
              </p>
              {cacheActionMessage && (
                <div
                  className={`text-[11px] p-2 rounded-lg animate-in fade-in flex items-center gap-1.5 ${
                    cacheActionMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/30 text-red-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{cacheActionMessage.text}</span>
                </div>
              )}
            </div>

            {/* Update Available Banner */}
            {hasUpdate && (
              <div className="p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Nueva versión de Dexie Canvas Studio disponible.</span>
                </div>
                <button
                  onClick={updateApp}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  Actualizar
                </button>
              </div>
            )}

            {/* Direct Install Button */}
            {canInstall && !isInstalled && (
              <div className="p-4 bg-gradient-to-r from-[#5865f2]/20 via-[#7c3aed]/20 to-[#38bdf8]/20 border border-[#5865f2]/50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#38bdf8]" />
                    <span>Instalación Automática con 1 Clic</span>
                  </div>
                  <div className="text-xs text-[#9ca3af]">
                    Tu navegador soporta la instalación directa en este dispositivo
                  </div>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#5865f2] to-[#4752c4] hover:from-[#4752c4] hover:to-[#3c45a5] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Ahora</span>
                </button>
              </div>
            )}

            {installStatus && (
              <div className="text-xs text-center text-[#38bdf8] font-medium animate-in fade-in">
                {installStatus}
              </div>
            )}

            {/* Platform Guides */}
            <div className="space-y-2.5 pt-1 border-t border-[#2f3136]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Guía de Instalación por Plataforma:</span>
                <div className="flex bg-[#202225] p-0.5 rounded-lg border border-[#2f3136] text-xs">
                  <button
                    onClick={() => setActiveGuideTab('desktop')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1.5 ${
                      activeGuideTab === 'desktop'
                        ? 'bg-[#5865f2] text-white'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span>PC / Mac</span>
                  </button>
                  <button
                    onClick={() => setActiveGuideTab('ios')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1.5 ${
                      activeGuideTab === 'ios'
                        ? 'bg-[#5865f2] text-white'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>iOS / Safari</span>
                  </button>
                  <button
                    onClick={() => setActiveGuideTab('android')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1.5 ${
                      activeGuideTab === 'android'
                        ? 'bg-[#5865f2] text-white'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Android</span>
                  </button>
                </div>
              </div>

              {/* Guide Details */}
              <div className="p-3 bg-[#202225] border border-[#2f3136] rounded-xl text-xs space-y-2 text-[#e1e1e6]">
                {activeGuideTab === 'desktop' && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-[#5865f2]" />
                      <span>En Chrome, Edge, Brave u Opera (Windows / macOS / Linux):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[#9ca3af] text-[11px] pl-1">
                      <li>
                        Haz clic en el icono de instalación{' '}
                        <span className="text-white font-semibold">⊕</span> en la barra de
                        direcciones del navegador.
                      </li>
                      <li>
                        O abre el menú <span className="text-white font-semibold">(⋮)</span> y
                        selecciona <span className="text-white font-semibold">"Instalar Dexie Canvas Studio..."</span>.
                      </li>
                      <li>La app se ejecutará como ventana independiente con acceso directo en tu escritorio.</li>
                    </ol>
                  </div>
                )}

                {activeGuideTab === 'ios' && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>En iPhone y iPad (Safari):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[#9ca3af] text-[11px] pl-1">
                      <li>
                        Pulsa el botón de <span className="text-white font-semibold">Compartir</span>{' '}
                        <Share className="inline w-3 h-3 text-[#38bdf8]" /> en Safari.
                      </li>
                      <li>
                        Toca <span className="text-white font-semibold">"Añadir a la pantalla de inicio"</span>{' '}
                        <PlusSquare className="inline w-3 h-3 text-white" />.
                      </li>
                      <li>Confirma pulsando <span className="text-white font-semibold">"Añadir"</span> arriba a la derecha.</li>
                    </ol>
                  </div>
                )}

                {activeGuideTab === 'android' && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>En teléfonos y tablets Android (Chrome / Samsung Internet):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[#9ca3af] text-[11px] pl-1">
                      <li>Pulsa el botón de menú <span className="text-white font-semibold">(⋮)</span> arriba a la derecha.</li>
                      <li>Selecciona <span className="text-white font-semibold">"Instalar aplicación"</span> o <span className="text-white font-semibold">"Añadir a pantalla de inicio"</span>.</li>
                      <li>Confirma para tener la aplicación integrada en tu dispositivo.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cache Explorer & Control */}
        {activeMainTab === 'cache' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 flex flex-col">
            {/* Top Summary Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-[#202225] border border-[#2f3136] rounded-xl text-center">
                <div className="text-[10px] text-[#9ca3af] uppercase font-mono">Total Elementos</div>
                <div className="text-sm font-bold text-white mt-0.5">{cacheEntries.length}</div>
              </div>
              <div className="p-2.5 bg-[#202225] border border-emerald-500/30 rounded-xl text-center">
                <div className="text-[10px] text-emerald-400 uppercase font-mono">Activos en Caché</div>
                <div className="text-sm font-bold text-emerald-300 mt-0.5">{activeEntriesCount}</div>
              </div>
              <div className="p-2.5 bg-[#202225] border border-amber-500/30 rounded-xl text-center">
                <div className="text-[10px] text-amber-400 uppercase font-mono">Desactivados</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">{disabledEntriesCount}</div>
              </div>
              <div className="p-2.5 bg-[#202225] border border-[#38bdf8]/30 rounded-xl text-center">
                <div className="text-[10px] text-[#38bdf8] uppercase font-mono">Tamaño Estimado</div>
                <div className="text-sm font-bold text-white mt-0.5">{formatBytes(cacheTotalBytes)}</div>
              </div>
            </div>

            {/* Notification alert */}
            {cacheActionMessage && (
              <div
                className={`text-xs p-2.5 rounded-xl border flex items-center justify-between gap-2 animate-in fade-in ${
                  cacheActionMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{cacheActionMessage.text}</span>
                </div>
                <button
                  onClick={() => setCacheActionMessage(null)}
                  className="p-1 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar archivo, ruta o script en caché..."
                  value={cacheSearch}
                  onChange={e => setCacheSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#38bdf8] rounded-xl text-xs text-white placeholder-[#9ca3af] outline-none"
                />
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'page', label: 'Páginas' },
                  { id: 'script', label: 'Scripts' },
                  { id: 'style', label: 'Estilos' },
                  { id: 'icon', label: 'Iconos' },
                  { id: 'database', label: 'Bases de Datos' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCacheCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                      cacheCategoryFilter === cat.id
                        ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
                        : 'bg-[#202225] border-[#2f3136] text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Cache URL Form */}
            <form onSubmit={handleAddCustomUrl} className="flex gap-2">
              <input
                type="text"
                placeholder="Añadir URL personalizada a la caché (ej: /favicon.svg, /manifest.json)..."
                value={customCacheUrlInput}
                onChange={e => setCustomCacheUrlInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs text-white placeholder-[#9ca3af] outline-none font-mono"
              />
              <button
                type="submit"
                disabled={isLoadingCache || !customCacheUrlInput.trim()}
                className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </form>

            {/* Cache Items List */}
            <div className="border border-[#2f3136] rounded-xl overflow-hidden bg-[#202225] flex-1 flex flex-col min-h-[220px]">
              <div className="px-3 py-2 bg-[#1a1b1e] border-b border-[#2f3136] flex items-center justify-between text-[11px] font-semibold text-[#9ca3af]">
                <span>Recurso / Endpoint ({filteredCacheEntries.length})</span>
                <div className="flex items-center gap-4">
                  <span>Tamaño</span>
                  <span>Estado Caché</span>
                  <span>Acción</span>
                </div>
              </div>

              <div className="divide-y divide-[#2f3136] overflow-y-auto max-h-[260px] flex-1">
                {isLoadingCache ? (
                  <div className="p-8 text-center text-xs text-[#9ca3af] flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 text-[#38bdf8] animate-spin" />
                    <span>Leyendo y sincronizando elementos de la caché...</span>
                  </div>
                ) : filteredCacheEntries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#9ca3af]">
                    No se encontraron elementos de caché con los filtros actuales.
                  </div>
                ) : (
                  filteredCacheEntries.map(item => (
                    <div
                      key={item.id}
                      className={`px-3 py-2 flex items-center justify-between gap-3 text-xs transition ${
                        item.isActive ? 'hover:bg-[#25282c]' : 'bg-[#18191c]/80 opacity-60'
                      }`}
                    >
                      {/* Left: icon, url, cache name */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-1.5 bg-[#18191c] rounded-lg border border-[#2f3136] flex-shrink-0">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`font-mono text-[11px] truncate ${
                              item.isActive ? 'text-white' : 'text-[#9ca3af] line-through'
                            }`}
                            title={item.url}
                          >
                            {item.relativeUrl}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#9ca3af] mt-0.5">
                            <span className="text-[#38bdf8]">{item.cacheName}</span>
                            {item.contentType && (
                              <span className="truncate max-w-[120px] text-[#6b7280]">
                                {item.contentType.split(';')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: size, active switch toggle, delete */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] font-mono text-[#9ca3af] w-14 text-right">
                          {formatBytes(item.sizeBytes || 0)}
                        </span>

                        {/* Interactive Toggle Switch: Activar/Desactivar */}
                        <button
                          type="button"
                          onClick={() => handleToggleCacheItem(item)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.isActive ? 'bg-emerald-500' : 'bg-[#373a40]'
                          }`}
                          title={item.isActive ? 'Desactivar de la caché' : 'Activar y cachear'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              item.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteCacheItem(item)}
                          className="p-1 text-[#9ca3af] hover:text-red-400 rounded transition cursor-pointer"
                          title="Eliminar de la caché"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2f3136]">
              <div className="flex items-center gap-2">
                <button
                  onClick={loadCacheData}
                  className="px-2.5 py-1.5 bg-[#202225] hover:bg-[#2b2d31] text-xs text-[#9ca3af] hover:text-white rounded-lg border border-[#2f3136] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refrescar Lista</span>
                </button>
                <button
                  onClick={handleForceCacheAll}
                  className="px-2.5 py-1.5 bg-[#202225] hover:bg-[#2b2d31] text-xs text-emerald-400 hover:text-emerald-300 rounded-lg border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  <span>Activar y Recachear Todo</span>
                </button>
              </div>

              <button
                onClick={handleClearAllCache}
                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 rounded-lg border border-red-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Vaciar Toda la Caché</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Manifest Editor */}
        {activeMainTab === 'manifest' && (
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {manifestSaveMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{manifestSaveMsg}</span>
              </div>
            )}

            {/* Live Interactive Preview of Manifest */}
            <div className="p-4 rounded-xl border border-[#2f3136] bg-[#202225] space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#38bdf8]" />
                <span>Vista Previa de la App PWA en Dispositivo</span>
              </div>

              <div
                className="p-4 rounded-xl border flex items-center gap-4 transition shadow-inner"
                style={{
                  backgroundColor: manifestConfig.background_color || '#111216',
                  borderColor: manifestConfig.theme_color || '#5865f2'
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: manifestConfig.theme_color || '#5865f2' }}
                >
                  <Download className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">
                    {manifestConfig.name || 'Dexie Canvas Studio'}
                  </div>
                  <div className="text-xs text-[#9ca3af] truncate">
                    {manifestConfig.short_name || 'Dexie Studio'} • Modo: {manifestConfig.display}
                  </div>
                  <div className="text-[11px] text-[#6b7280] line-clamp-1 mt-0.5">
                    {manifestConfig.description}
                  </div>
                </div>
                <div className="flex flex-col items-end text-[10px] font-mono text-[#9ca3af]">
                  <span
                    className="px-2 py-0.5 rounded-full text-white font-semibold"
                    style={{ backgroundColor: manifestConfig.theme_color }}
                  >
                    {manifestConfig.theme_color}
                  </span>
                  <span className="mt-1">BG: {manifestConfig.background_color}</span>
                </div>
              </div>
            </div>

            {/* General App Identity Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                  Nombre de la Aplicación (name)
                </label>
                <input
                  type="text"
                  value={manifestConfig.name}
                  onChange={e => setManifestConfig({ ...manifestConfig, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs text-white outline-none"
                  placeholder="Ej: Dexie Canvas Studio"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                  Nombre Corto en Pantalla (short_name)
                </label>
                <input
                  type="text"
                  value={manifestConfig.short_name}
                  onChange={e =>
                    setManifestConfig({ ...manifestConfig, short_name: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs text-white outline-none"
                  placeholder="Ej: Dexie Studio"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                Descripción (description)
              </label>
              <textarea
                value={manifestConfig.description}
                onChange={e =>
                  setManifestConfig({ ...manifestConfig, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs text-white outline-none resize-none"
                placeholder="Descripción para la instalación y tiendas PWA..."
              />
            </div>

            {/* Color Pickers: Theme Color & Background Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#202225] border border-[#2f3136] rounded-xl">
              {/* Theme Color */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Color del Tema (theme_color)</span>
                  </label>
                  <span className="font-mono text-xs text-[#9ca3af]">
                    {manifestConfig.theme_color}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={manifestConfig.theme_color}
                    onChange={e =>
                      setManifestConfig({ ...manifestConfig, theme_color: e.target.value })
                    }
                    className="w-8 h-8 rounded-lg border border-[#373a40] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={manifestConfig.theme_color}
                    onChange={e =>
                      setManifestConfig({ ...manifestConfig, theme_color: e.target.value })
                    }
                    className="flex-1 px-2.5 py-1 bg-[#18191c] border border-[#2f3136] rounded-lg text-xs font-mono text-white"
                  />
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {THEME_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setManifestConfig({ ...manifestConfig, theme_color: preset.value })
                      }
                      className="w-5 h-5 rounded-full border border-white/20 transition transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: preset.value }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Color de Fondo Splash (background_color)</span>
                  </label>
                  <span className="font-mono text-xs text-[#9ca3af]">
                    {manifestConfig.background_color}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={manifestConfig.background_color}
                    onChange={e =>
                      setManifestConfig({ ...manifestConfig, background_color: e.target.value })
                    }
                    className="w-8 h-8 rounded-lg border border-[#373a40] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={manifestConfig.background_color}
                    onChange={e =>
                      setManifestConfig({ ...manifestConfig, background_color: e.target.value })
                    }
                    className="flex-1 px-2.5 py-1 bg-[#18191c] border border-[#2f3136] rounded-lg text-xs font-mono text-white"
                  />
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {BG_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setManifestConfig({ ...manifestConfig, background_color: preset.value })
                      }
                      className="w-5 h-5 rounded-full border border-white/20 transition transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: preset.value }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Display & Orientation Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                  Modo de Visualización (display)
                </label>
                <select
                  value={manifestConfig.display}
                  onChange={e =>
                    setManifestConfig({
                      ...manifestConfig,
                      display: e.target.value as ManifestConfig['display']
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs text-white outline-none cursor-pointer"
                >
                  <option value="standalone">standalone (Ventana de app independiente - Recomendado)</option>
                  <option value="fullscreen">fullscreen (Pantalla completa sin barra de navegación)</option>
                  <option value="minimal-ui">minimal-ui (Controles de navegación mínimos)</option>
                  <option value="browser">browser (Pestaña normal de navegador)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                  Orientación de Pantalla (orientation)
                </label>
                <select
                  value={manifestConfig.orientation}
                  onChange={e =>
                    setManifestConfig({
                      ...manifestConfig,
                      orientation: e.target.value as ManifestConfig['orientation']
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs text-white outline-none cursor-pointer"
                >
                  <option value="any">any (Cualquier orientación / Automática)</option>
                  <option value="portrait">portrait (Vertical fija)</option>
                  <option value="landscape">landscape (Horizontal fija para dashboards)</option>
                  <option value="natural">natural (Orientación nativa del dispositivo)</option>
                </select>
              </div>
            </div>

            {/* Start URL & Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                  URL de Inicio (start_url)
                </label>
                <input
                  type="text"
                  value={manifestConfig.start_url}
                  onChange={e =>
                    setManifestConfig({ ...manifestConfig, start_url: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs font-mono text-white outline-none"
                  placeholder="/"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e1e1e6] mb-1">
                  Ámbito de la App (scope)
                </label>
                <input
                  type="text"
                  value={manifestConfig.scope}
                  onChange={e => setManifestConfig({ ...manifestConfig, scope: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] focus:border-[#5865f2] rounded-xl text-xs font-mono text-white outline-none"
                  placeholder="/"
                />
              </div>
            </div>

            {/* Categories Multi-Select */}
            <div>
              <label className="block text-xs font-semibold text-[#e1e1e6] mb-1.5">
                Categorías de la Aplicación (categories)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_CATEGORIES.map(cat => {
                  const isSelected = manifestConfig.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#5865f2]/20 border-[#5865f2] text-white'
                          : 'bg-[#202225] border-[#2f3136] text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#5865f2]" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manifest Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2f3136]">
              <button
                type="button"
                onClick={handleResetManifest}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#2b2d31] text-xs text-[#9ca3af] hover:text-white rounded-xl border border-[#2f3136] transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Valores</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadManifest}
                  className="px-3 py-1.5 bg-[#202225] hover:bg-[#2b2d31] text-xs text-[#38bdf8] hover:text-white rounded-xl border border-[#38bdf8]/40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar manifest.json</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveManifest}
                  className="px-4 py-1.5 bg-gradient-to-r from-[#5865f2] to-[#4752c4] hover:from-[#4752c4] hover:to-[#3c45a5] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar y Aplicar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info & close */}
        <div className="px-6 py-3 border-t border-[#2f3136] bg-[#202225] flex justify-between items-center text-xs flex-shrink-0">
          <div className="text-[#9ca3af] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Dexie PWA Engine • Cache-First & Offline Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2f3136] hover:bg-[#373a40] text-white rounded-lg font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
