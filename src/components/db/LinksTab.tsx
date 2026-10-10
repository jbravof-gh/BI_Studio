import React, { useState, useEffect, useMemo } from 'react';
import {
  LinkWindowConfig,
  LinkWindowMode,
  HeaderButtonsConfig,
  FooterElementsConfig,
  EditorPanelsConfig,
  ViewerOptionsConfig,
  ALL_CONTROL_TITLES,
  ALL_CATEGORIES,
  DEFAULT_HEADER_BUTTONS,
  DEFAULT_FOOTER_ELEMENTS,
  DEFAULT_EDITOR_PANELS,
  DEFAULT_VIEWER_OPTIONS
} from '../../types/linkTypes';
import { linkConfigService, PRESET_LINK_TEMPLATES } from '../../services/linkConfigService';
import { dexieManager } from '../../services/dexieManager';
import { CanvasDocument } from '../../types';
import {
  Link2,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  Check,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Database,
  Layers,
  LayoutTemplate,
  Download,
  Maximize2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Square,
  BarChart3,
  Table as TableIcon,
  Filter,
  Type,
  Maximize,
  HelpCircle,
  FileCode,
  Smartphone,
  Undo2,
  RotateCcw,
  Palette,
  ZoomIn,
  Grid,
  Ruler,
  Camera,
  History,
  QrCode,
  Layout,
  Tag
} from 'lucide-react';

interface LinksTabProps {
  databases: string[];
  selectedDb: string;
  activeDbName: string;
  onNotification?: (msg: { type: 'success' | 'error'; text: string }) => void;
}

type SubTab = 'configurator' | 'library' | 'presets' | 'tester';

export const LinksTab: React.FC<LinksTabProps> = ({
  databases,
  selectedDb,
  activeDbName,
  onNotification
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('configurator');
  const [savedLinks, setSavedLinks] = useState<LinkWindowConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saved designs in current selected database
  const [availableDesigns, setAvailableDesigns] = useState<CanvasDocument[]>([]);

  // Current active draft config being edited in the configurator
  const [currentConfig, setCurrentConfig] = useState<LinkWindowConfig>(() =>
    linkConfigService.createBlankConfig(selectedDb || activeDbName || '')
  );

  // URL format preference
  const [urlFormat, setUrlFormat] = useState<'standalone' | 'short'>('standalone');

  // Control search filter in configurator
  const [controlSearch, setControlSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Search in library
  const [librarySearch, setLibrarySearch] = useState('');

  // Load saved links on mount
  useEffect(() => {
    loadLinks();
  }, []);

  // Update targetDatabase when selectedDb changes if draft config hasn't been modified heavily
  useEffect(() => {
    if (selectedDb) {
      loadDesignsForDb(selectedDb);
    }
  }, [selectedDb]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const list = await linkConfigService.getLinks();
      setSavedLinks(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDesignsForDb = async (dbName: string) => {
    if (!dbName) {
      setAvailableDesigns([]);
      return;
    }
    try {
      const designs = await dexieManager.getCanvasDesigns(dbName);
      setAvailableDesigns(designs);
    } catch (e) {
      setAvailableDesigns([]);
    }
  };

  const handleCopyUrl = async (config: LinkWindowConfig, idKey: string) => {
    const url = linkConfigService.generateUrl(config, urlFormat);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(idKey);
      setTimeout(() => setCopiedId(null), 2500);
      onNotification?.({
        type: 'success',
        text: '¡Enlace copiado al portapapeles! Puedes compartirlo o pegarlo en una nueva ventana.'
      });
    } catch (err) {
      onNotification?.({
        type: 'error',
        text: 'No se pudo copiar el enlace automáticamente.'
      });
    }
  };

  const handleOpenNewWindow = (config: LinkWindowConfig) => {
    linkConfigService.openInNewWindow(config, urlFormat);
  };

  const handleSaveCurrentConfig = async () => {
    if (!currentConfig.name.trim()) {
      onNotification?.({
        type: 'error',
        text: 'Por favor, introduce un nombre para el enlace.'
      });
      return;
    }

    try {
      await linkConfigService.saveLink(currentConfig);
      await loadLinks();
      onNotification?.({
        type: 'success',
        text: `Enlace "${currentConfig.name}" guardado correctamente en la biblioteca.`
      });
      setActiveSubTab('library');
    } catch (err: any) {
      onNotification?.({
        type: 'error',
        text: `Error al guardar enlace: ${err.message}`
      });
    }
  };

  const handleDeleteLink = async (id: string, name: string) => {
    try {
      await linkConfigService.deleteLink(id);
      await loadLinks();
      onNotification?.({
        type: 'success',
        text: `Enlace "${name}" eliminado.`
      });
    } catch (err: any) {
      onNotification?.({
        type: 'error',
        text: `Error al eliminar enlace: ${err.message}`
      });
    }
  };

  const handleLoadIntoConfigurator = (config: LinkWindowConfig) => {
    setCurrentConfig(JSON.parse(JSON.stringify(config)));
    if (config.targetDatabase) {
      loadDesignsForDb(config.targetDatabase);
    }
    setActiveSubTab('configurator');
    onNotification?.({
      type: 'success',
      text: `Configuración "${config.name}" cargada en el editor.`
    });
  };

  const handleLoadPreset = (preset: typeof PRESET_LINK_TEMPLATES[0]) => {
    const fresh: LinkWindowConfig = {
      ...JSON.parse(JSON.stringify(preset)),
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetDatabase: selectedDb || activeDbName || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setCurrentConfig(fresh);
    if (fresh.targetDatabase) {
      loadDesignsForDb(fresh.targetDatabase);
    }
    setActiveSubTab('configurator');
    onNotification?.({
      type: 'success',
      text: `Plantilla "${preset.name}" cargada. Puedes personalizarla y guardar tu propio enlace.`
    });
  };

  // Helper toggle functions
  const toggleHeaderButton = (key: keyof HeaderButtonsConfig) => {
    setCurrentConfig(prev => ({
      ...prev,
      headerButtons: {
        ...prev.headerButtons,
        [key]: !prev.headerButtons[key]
      }
    }));
  };

  const toggleFooterElement = (key: keyof FooterElementsConfig) => {
    setCurrentConfig(prev => ({
      ...prev,
      footerElements: {
        ...prev.footerElements,
        [key]: !prev.footerElements[key]
      }
    }));
  };

  const toggleControlType = (title: string) => {
    setCurrentConfig(prev => {
      const current = prev.editorPanels.allowedControlTitles || [];
      const exists = current.includes(title);
      const next = exists ? current.filter(t => t !== title) : [...current, title];
      return {
        ...prev,
        editorPanels: {
          ...prev.editorPanels,
          allowedControlTitles: next
        }
      };
    });
  };

  const selectAllControls = (select: boolean) => {
    setCurrentConfig(prev => ({
      ...prev,
      editorPanels: {
        ...prev.editorPanels,
        allowedControlTitles: select ? [...ALL_CONTROL_TITLES] : []
      }
    }));
  };

  const selectAllHeaderButtons = (select: boolean) => {
    setCurrentConfig(prev => {
      const updated = { ...prev.headerButtons };
      (Object.keys(updated) as (keyof HeaderButtonsConfig)[]).forEach(k => {
        updated[k] = select;
      });
      return { ...prev, headerButtons: updated };
    });
  };

  const selectAllFooterElements = (select: boolean) => {
    setCurrentConfig(prev => {
      const updated = { ...prev.footerElements };
      (Object.keys(updated) as (keyof FooterElementsConfig)[]).forEach(k => {
        updated[k] = select;
      });
      return { ...prev, footerElements: updated };
    });
  };

  // Filtered controls in editor
  const filteredControls = useMemo(() => {
    return ALL_CONTROL_TITLES.filter(title => {
      if (controlSearch.trim()) {
        if (!title.toLowerCase().includes(controlSearch.toLowerCase().trim())) {
          return false;
        }
      }
      return true;
    });
  }, [controlSearch]);

  // Grouped controls for clean display
  const controlGroups = useMemo(() => {
    return [
      {
        id: 'charts',
        title: 'Gráficos & Métricas (Charts)',
        icon: BarChart3,
        items: [
          'Gráfico de Barras',
          'Gráfico Circular (Pie)',
          'Gráfico de Líneas',
          'Series',
          'Tarjeta KPI',
          'Drill-Down'
        ]
      },
      {
        id: 'data',
        title: 'Tablas & Datos (Data)',
        icon: TableIcon,
        items: [
          'Tabla de Datos (Límite Fijo)',
          'Tabla Paginada con Navegación',
          'QueryTable',
          'Matriz',
          'Ficha de Registro',
          'Ficha Detalle'
        ]
      },
      {
        id: 'layout',
        title: 'Layout & Estructura (Paneles)',
        icon: Layout,
        items: [
          'Caja / Tarjeta de Fondo',
          'Separador / Línea',
          'Panel 2 Verticales',
          'Panel 2 Horizontales',
          'Panel 4 Cuadrantes',
          'MiniBrowser'
        ]
      },
      {
        id: 'inputs',
        title: 'Entradas & Filtros (Inputs)',
        icon: Filter,
        items: [
          'Filtro Desplegable',
          'Filtro Lista de Casillas',
          'Formulario Registro'
        ]
      },
      {
        id: 'content',
        title: 'Texto & Contenido (Content)',
        icon: Type,
        items: [
          'Título Principal',
          'Campo Enlazado',
          'Etiqueta / Badge',
          'Imagen / Foto',
          'Código QR'
        ]
      }
    ];
  }, []);

  const generatedPreviewUrl = useMemo(() => {
    return linkConfigService.generateUrl(currentConfig, urlFormat);
  }, [currentConfig, urlFormat]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#e1e1e6] overflow-hidden">
      {/* Top Banner & Sub-Tabs Navigation */}
      <div className="px-5 py-3 border-b border-[#2f3136] bg-[#1a1b1e] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Gestor de Enlaces & Ventanas Personalizadas</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                Links Modulares
              </span>
            </h2>
            <p className="text-[11px] text-[#9ca3af]">
              Genera enlaces para abrir ventanas emergentes con controles, botones y permisos filtrados a medida.
            </p>
          </div>
        </div>

        {/* Sub-Tab buttons */}
        <div className="flex items-center gap-1 bg-[#25282c] p-1 rounded-xl border border-[#2f3136]">
          <button
            type="button"
            onClick={() => setActiveSubTab('configurator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'configurator'
                ? 'bg-[#5865f2] text-white shadow-sm'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#2f3136]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configurador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('library')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'library'
                ? 'bg-[#5865f2] text-white shadow-sm'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#2f3136]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Enlaces Guardados ({savedLinks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'presets'
                ? 'bg-[#5865f2] text-white shadow-sm'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#2f3136]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Plantillas Rápidas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tester')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'tester'
                ? 'bg-[#5865f2] text-white shadow-sm'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#2f3136]'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Probar URL</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* SUBTAB 1: CONFIGURADOR DE ENLACES                                        */}
        {/* ========================================================================= */}
        {activeSubTab === 'configurator' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Top Quick Actions Bar */}
            <div className="bg-[#25282c] border border-[#2f3136] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  {currentConfig.mode === 'editor' ? '🎨' : '👁️'}
                </div>
                <div>
                  <div className="text-xs text-[#9ca3af]">Configurando Enlace:</div>
                  <div className="text-sm font-bold text-white">
                    {currentConfig.name || 'Sin título'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(currentConfig, 'config_top')}
                  className="px-3 py-1.5 bg-[#1a1b1e] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#373a40] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {copiedId === 'config_top' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'config_top' ? '¡Copiado!' : 'Copiar URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNewWindow(currentConfig)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/25"
                  title="Abrir ventana ahora con esta configuración"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Ventana</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentConfig}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar en Biblioteca</span>
                </button>
              </div>
            </div>

            {/* General Settings: Title, Description, Mode & Database */}
            <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2f3136] pb-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>1. Parámetros Principales del Enlace</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                    Nombre del Enlace / Preset *
                  </label>
                  <input
                    type="text"
                    value={currentConfig.name}
                    onChange={(e) => setCurrentConfig({ ...currentConfig, name: e.target.value })}
                    placeholder="Ej. Kiosco Ventas, Editor Ligero..."
                    className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-xl text-xs text-white placeholder-[#64748b] focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                    Base de Datos a Activar al Abrir
                  </label>
                  <select
                    value={currentConfig.targetDatabase}
                    onChange={(e) => {
                      const dbName = e.target.value;
                      setCurrentConfig({ ...currentConfig, targetDatabase: dbName });
                      loadDesignsForDb(dbName);
                    }}
                    className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer transition"
                  >
                    <option value="">-- Sin Base de Datos (Inicio Limpio) --</option>
                    {databases.map(db => (
                      <option key={`target_db_${db}`} value={db}>
                        📁 {db}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                    Descripción / Propósito (Opcional)
                  </label>
                  <input
                    type="text"
                    value={currentConfig.description || ''}
                    onChange={(e) => setCurrentConfig({ ...currentConfig, description: e.target.value })}
                    placeholder="Ej. Permite crear reportes limitados a tablas y gráficos sin acceso a configuración de esquema."
                    className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-xl text-xs text-white placeholder-[#64748b] focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-[#9ca3af] block mb-2">
                  Tipo de Ventana (Modo de la Aplicación) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCurrentConfig({ ...currentConfig, mode: 'editor' })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                      currentConfig.mode === 'editor'
                        ? 'bg-indigo-500/10 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-[#1a1b1e] border-[#2f3136] hover:border-[#373a40]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${currentConfig.mode === 'editor' ? 'bg-indigo-500 text-white' : 'bg-[#25282c] text-[#9ca3af]'}`}>
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">Modo Edición Personalizado</h4>
                        {currentConfig.mode === 'editor' && <Check className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-[#9ca3af] mt-1">
                        Abre el lienzo de diseño mostrando únicamente los controles, paneles, botones del header y elementos del footer seleccionados.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setCurrentConfig({ ...currentConfig, mode: 'viewer' })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                      currentConfig.mode === 'viewer'
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-[#1a1b1e] border-[#2f3136] hover:border-[#373a40]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${currentConfig.mode === 'viewer' ? 'bg-emerald-500 text-white' : 'bg-[#25282c] text-[#9ca3af]'}`}>
                      <Eye className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">Modo Visor de Diseño Guardado</h4>
                        {currentConfig.mode === 'viewer' && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-[#9ca3af] mt-1">
                        Abre directamente uno de los cuadros de mando o diseños guardados en la base de datos en pantalla de presentación o interactiva.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* IF MODE === 'viewer': CONFIGURACIÓN DE VISOR DE DISEÑO             */}
            {/* =================================================================== */}
            {currentConfig.mode === 'viewer' && (
              <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-[#2f3136] pb-2">
                  <Eye className="w-4 h-4" />
                  <span>2. Selección de Diseño Guardado y Opciones del Visor</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-white block mb-1">
                      Diseño Guardado en la Base de Datos ({currentConfig.targetDatabase || 'Ninguna seleccionada'}) *
                    </label>
                    {availableDesigns.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#1a1b1e] border border-dashed border-[#2f3136] text-center text-xs text-[#9ca3af]">
                        {currentConfig.targetDatabase
                          ? `No hay diseños guardados en la base de datos "${currentConfig.targetDatabase}". Guarda un diseño en el lienzo o selecciona otra base de datos.`
                          : 'Selecciona una base de datos arriba para cargar sus diseños disponibles.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                        {availableDesigns.map(design => {
                          const isSelected = currentConfig.viewerOptions.targetDesignName === design.name;
                          return (
                            <div
                              key={`design_pick_${design.id || design.name}`}
                              onClick={() =>
                                setCurrentConfig({
                                  ...currentConfig,
                                  viewerOptions: {
                                    ...currentConfig.viewerOptions,
                                    targetDesignName: design.name
                                  }
                                })
                              }
                              className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-xs'
                                  : 'bg-[#1a1b1e] border-[#2f3136] text-[#cbd5e1] hover:border-[#373a40]'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">{design.name}</div>
                                <div className="text-[10px] text-[#9ca3af]">
                                  {design.elements?.length || 0} elemento(s) • {design.width}x{design.height}px
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                              ) : (
                                <Square className="w-4 h-4 text-[#64748b] shrink-0 ml-2" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Viewer Toggles */}
                  <div className="pt-2 border-t border-[#2f3136]">
                    <div className="text-xs font-semibold text-white mb-2">Comportamiento del Visor</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                        <input
                          type="checkbox"
                          checked={currentConfig.viewerOptions.autoFitToWindow}
                          onChange={(e) =>
                            setCurrentConfig({
                              ...currentConfig,
                              viewerOptions: {
                                ...currentConfig.viewerOptions,
                                autoFitToWindow: e.target.checked
                              }
                            })
                          }
                          className="rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                        />
                        <span className="text-[#cbd5e1] text-xs font-medium">Ajustar a la ventana</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                        <input
                          type="checkbox"
                          checked={currentConfig.viewerOptions.allowFullscreen}
                          onChange={(e) =>
                            setCurrentConfig({
                              ...currentConfig,
                              viewerOptions: {
                                ...currentConfig.viewerOptions,
                                allowFullscreen: e.target.checked
                              }
                            })
                          }
                          className="rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                        />
                        <span className="text-[#cbd5e1] text-xs font-medium">Pantalla completa</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                        <input
                          type="checkbox"
                          checked={currentConfig.viewerOptions.allowPageNavigation}
                          onChange={(e) =>
                            setCurrentConfig({
                              ...currentConfig,
                              viewerOptions: {
                                ...currentConfig.viewerOptions,
                                allowPageNavigation: e.target.checked
                              }
                            })
                          }
                          className="rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                        />
                        <span className="text-[#cbd5e1] text-xs font-medium">Navegación de páginas</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                        <input
                          type="checkbox"
                          checked={currentConfig.viewerOptions.allowExport}
                          onChange={(e) =>
                            setCurrentConfig({
                              ...currentConfig,
                              viewerOptions: {
                                ...currentConfig.viewerOptions,
                                allowExport: e.target.checked
                              }
                            })
                          }
                          className="rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                        />
                        <span className="text-[#cbd5e1] text-xs font-medium">Permitir exportación</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* IF MODE === 'editor': CONFIGURACIÓN COMPLETA DE CONTROLES Y PANELES */}
            {/* =================================================================== */}
            {currentConfig.mode === 'editor' && (
              <>
                {/* 2. Database Security & Access Control */}
                <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-[#2f3136] pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>2. Seguridad y Acceso al Gestor de Base de Datos</span>
                    </div>
                    <span className="text-[10px] text-[#9ca3af] font-normal lowercase">
                      Control de permisos
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      onClick={() =>
                        setCurrentConfig(prev => ({
                          ...prev,
                          editorPanels: {
                            ...prev.editorPanels,
                            dbManagerAllowed: !prev.editorPanels.dbManagerAllowed
                          },
                          headerButtons: {
                            ...prev.headerButtons,
                            dbManagerBtn: !prev.editorPanels.dbManagerAllowed
                          }
                        }))
                      }
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        currentConfig.editorPanels.dbManagerAllowed
                          ? 'bg-emerald-500/10 border-emerald-500/60'
                          : 'bg-rose-500/10 border-rose-500/60'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${currentConfig.editorPanels.dbManagerAllowed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {currentConfig.editorPanels.dbManagerAllowed ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>Gestor de BD Disponible</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            currentConfig.editorPanels.dbManagerAllowed
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {currentConfig.editorPanels.dbManagerAllowed ? 'Habilitado' : 'Bloqueado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9ca3af] mt-1">
                          {currentConfig.editorPanels.dbManagerAllowed
                            ? 'Los usuarios de la nueva ventana podrán abrir el Gestor de Bases de Datos.'
                            : 'El Gestor de Bases de Datos quedará completamente oculto e inaccesible en la nueva ventana.'}
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => toggleHeaderButton('dbSelector')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        currentConfig.headerButtons.dbSelector
                          ? 'bg-indigo-500/10 border-indigo-500/60'
                          : 'bg-[#1a1b1e] border-[#2f3136]'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${currentConfig.headerButtons.dbSelector ? 'bg-indigo-500 text-white' : 'bg-[#25282c] text-[#9ca3af]'}`}>
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>Selector de BD en Header</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            currentConfig.headerButtons.dbSelector
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-[#25282c] text-[#9ca3af]'
                          }`}>
                            {currentConfig.headerButtons.dbSelector ? 'Visible' : 'Oculto'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9ca3af] mt-1">
                          {currentConfig.headerButtons.dbSelector
                            ? 'Permite conmutar entre bases de datos disponibles desde el menú superior.'
                            : 'Bloquea el selector superior para fijar la base de datos seleccionada sin posibilidad de cambio.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Controls Palette Available in Left Sidebar */}
                <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f3136] pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          3. Controles Disponibles en el Panel Izquierdo
                        </h3>
                        <p className="text-[11px] text-[#9ca3af]">
                          Selecciona qué componentes podrá arrastrar o añadir el usuario al lienzo en la nueva ventana.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 font-mono font-semibold">
                        {(currentConfig.editorPanels.allowedControlTitles || []).length} / {ALL_CONTROL_TITLES.length} activos
                      </span>
                      <button
                        type="button"
                        onClick={() => selectAllControls(true)}
                        className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAllControls(false)}
                        className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  {/* Search box for controls */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={controlSearch}
                      onChange={(e) => setControlSearch(e.target.value)}
                      placeholder="Buscar control por nombre (ej. Gráfico, Tabla, Formulario, QR)..."
                      className="w-full pl-9 pr-3 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-xl text-xs text-white placeholder-[#64748b] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Grouped control categories */}
                  <div className="space-y-4">
                    {controlGroups.map(group => {
                      const GroupIcon = group.icon;
                      const activeInGroup = group.items.filter(item =>
                        (currentConfig.editorPanels.allowedControlTitles || []).includes(item)
                      ).length;

                      const toggleGroup = () => {
                        const allActive = activeInGroup === group.items.length;
                        setCurrentConfig(prev => {
                          const current = new Set(prev.editorPanels.allowedControlTitles || []);
                          if (allActive) {
                            group.items.forEach(it => current.delete(it));
                          } else {
                            group.items.forEach(it => current.add(it));
                          }
                          return {
                            ...prev,
                            editorPanels: {
                              ...prev.editorPanels,
                              allowedControlTitles: Array.from(current)
                            }
                          };
                        });
                      };

                      return (
                        <div key={group.id} className="bg-[#1a1b1e] rounded-xl border border-[#2f3136] p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GroupIcon className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-bold text-white">{group.title}</span>
                              <span className="text-[10px] text-[#9ca3af] font-mono">
                                ({activeInGroup}/{group.items.length})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={toggleGroup}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                            >
                              {activeInGroup === group.items.length ? 'Deseleccionar grupo' : 'Activar grupo'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {group.items.map(title => {
                              const isChecked = (currentConfig.editorPanels.allowedControlTitles || []).includes(title);
                              return (
                                <label
                                  key={`ctl_chk_${title}`}
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition ${
                                    isChecked
                                      ? 'bg-indigo-500/10 border-indigo-500/40 text-white font-medium'
                                      : 'bg-[#202225] border-transparent text-[#9ca3af] hover:text-[#e1e1e6] hover:bg-[#25282c]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleControlType(title)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                                  />
                                  <span className="truncate">{title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Navbar / Header Buttons Available */}
                <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f3136] pb-3">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          4. Botones Disponibles en el Header (Navbar)
                        </h3>
                        <p className="text-[11px] text-[#9ca3af]">
                          Selecciona las herramientas y botones visibles en la barra superior de la nueva ventana.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllHeaderButtons(true)}
                        className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAllHeaderButtons(false)}
                        className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {[
                      { key: 'branding', label: 'Logo & Branding', icon: Tag, desc: 'Identificador DC y título' },
                      { key: 'dbSelector', label: 'Selector de Base de Datos', icon: Database, desc: 'Desplegable de BD activa' },
                      { key: 'dbManagerBtn', label: 'Botón Gestionar BD', icon: Shield, desc: 'Abrir modal Gestor de Bases' },
                      { key: 'designNameInput', label: 'Nombre del Diseño', icon: Type, desc: 'Campo de texto editable' },
                      { key: 'undoRedo', label: 'Deshacer / Rehacer', icon: Undo2, desc: 'Historial de cambios' },
                      { key: 'resetCanvas', label: 'Botón Reset Lienzo', icon: RotateCcw, desc: 'Limpiar diseño actual' },
                      { key: 'previewToggle', label: 'Botón Previsualizar', icon: Eye, desc: 'Alternar modo interactivo' },
                      { key: 'templateGallery', label: 'Plantillas Pre-diseñadas', icon: LayoutTemplate, desc: 'Galería de dashboards' },
                      { key: 'savedDesigns', label: 'Diseños Guardados BD', icon: Layers, desc: 'Abrir modal Diseños Dexie' },
                      { key: 'generateLayoutAi', label: 'Generar Layout AI', icon: Sparkles, desc: 'Asistente de diseño Gemini' },
                      { key: 'jsonMenu', label: 'Menú JSON (Import/Export)', icon: FileCode, desc: 'Importar / Exportar JSON' },
                      { key: 'exportModal', label: 'Exportar Imagen/PDF', icon: Download, desc: 'Modal PNG, JPG, PDF' },
                      { key: 'exportHtmlZip', label: 'Exportar HTML ZIP', icon: Download, desc: 'Paquete interactivo offline' },
                      { key: 'pwaInstall', label: 'Botón PWA / Instalar', icon: Smartphone, desc: 'Instalación PWA y estado' },
                      { key: 'themeToggle', label: 'Conmutador Tema UI', icon: Palette, desc: 'Claro / Oscuro' },
                      { key: 'fullscreenToggle', label: 'Pantalla Completa', icon: Maximize, desc: 'F11 / Pantalla completa' }
                    ].map(btn => {
                      const isChecked = currentConfig.headerButtons[btn.key as keyof HeaderButtonsConfig];
                      const IconComponent = btn.icon;
                      return (
                        <label
                          key={`hdr_${btn.key}`}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                              : 'bg-[#1a1b1e] border-transparent text-[#9ca3af] hover:text-[#e1e1e6] hover:bg-[#25282c]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleHeaderButton(btn.key as keyof HeaderButtonsConfig)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <IconComponent className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="truncate">{btn.label}</span>
                            </div>
                            <div className="text-[10px] text-[#9ca3af] truncate mt-0.5">{btn.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Footer Elements Available */}
                <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f3136] pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          5. Elementos Disponibles en el Footer (Barra Inferior)
                        </h3>
                        <p className="text-[11px] text-[#9ca3af]">
                          Configura las métricas, herramientas de rejilla, zoom y temas mostrados en el pie de página.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllFooterElements(true)}
                        className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAllFooterElements(false)}
                        className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {[
                      { key: 'dimensions', label: 'Dimensiones del Lienzo', icon: Ruler, desc: 'Ancho × Alto px (ej. 1200×800)' },
                      { key: 'elementsCount', label: 'Contador de Elementos', icon: Layers, desc: 'Total y seleccionados' },
                      { key: 'pwaStatus', label: 'Insignia PWA / Offline', icon: Smartphone, desc: 'Estado de conexión PWA' },
                      { key: 'snapshotButton', label: 'Instantánea & Versiones', icon: Camera, desc: 'Guardar versión rápida en BD' },
                      { key: 'zoomControls', label: 'Controles de Zoom', icon: ZoomIn, desc: 'Slider, botones -/+ y reset 100%' },
                      { key: 'gridControls', label: 'Herramientas de Rejilla', icon: Grid, desc: 'Reglas, Grid, Snap y Dimensiones' },
                      { key: 'themeSelector', label: 'Selector de Tema Dashboard', icon: Palette, desc: 'Paleta de colores del lienzo' },
                      { key: 'customThemeBtn', label: 'Botón Tema Personalizado', icon: Sparkles, desc: 'Ajuste de bordes y colores' },
                      { key: 'appThemeToggle', label: 'Tema de la Aplicación', icon: Palette, desc: 'Conmutador Dark / Light' }
                    ].map(elem => {
                      const isChecked = currentConfig.footerElements[elem.key as keyof FooterElementsConfig];
                      const IconComponent = elem.icon;
                      return (
                        <label
                          key={`ftr_${elem.key}`}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                              : 'bg-[#1a1b1e] border-transparent text-[#9ca3af] hover:text-[#e1e1e6] hover:bg-[#25282c]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFooterElement(elem.key as keyof FooterElementsConfig)}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <IconComponent className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{elem.label}</span>
                            </div>
                            <div className="text-[10px] text-[#9ca3af] truncate mt-0.5">{elem.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Sidebar Panels Behavior */}
                <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2f3136] pb-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                    <span>6. Comportamiento de los Paneles Laterales</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                      <input
                        type="checkbox"
                        checked={currentConfig.editorPanels.leftPalette}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            editorPanels: {
                              ...currentConfig.editorPanels,
                              leftPalette: e.target.checked
                            }
                          })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                      />
                      <span className="text-[#cbd5e1] text-xs font-medium">Panel Izquierdo Visible</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                      <input
                        type="checkbox"
                        checked={currentConfig.editorPanels.leftPaletteCollapsed}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            editorPanels: {
                              ...currentConfig.editorPanels,
                              leftPaletteCollapsed: e.target.checked
                            }
                          })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                      />
                      <span className="text-[#cbd5e1] text-xs font-medium">Izquierdo Iniciar Contraído</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                      <input
                        type="checkbox"
                        checked={currentConfig.editorPanels.rightInspector}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            editorPanels: {
                              ...currentConfig.editorPanels,
                              rightInspector: e.target.checked
                            }
                          })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                      />
                      <span className="text-[#cbd5e1] text-xs font-medium">Panel Derecho (Inspector)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-xs cursor-pointer hover:bg-[#25282c] transition">
                      <input
                        type="checkbox"
                        checked={currentConfig.editorPanels.rightInspectorCollapsed}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            editorPanels: {
                              ...currentConfig.editorPanels,
                              rightInspectorCollapsed: e.target.checked
                            }
                          })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                      />
                      <span className="text-[#cbd5e1] text-xs font-medium">Derecho Iniciar Contraído</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Bottom Floating Save / Open Bar */}
            <div className="sticky bottom-0 bg-[#1a1b1e]/95 backdrop-blur-md border border-[#2f3136] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl z-20">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9ca3af]">Formato URL:</span>
                <button
                  type="button"
                  onClick={() => setUrlFormat(urlFormat === 'standalone' ? 'short' : 'standalone')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#25282c] hover:bg-[#2f3136] text-indigo-300 border border-[#373a40] transition cursor-pointer"
                >
                  {urlFormat === 'standalone' ? '🔗 URL Autónoma (Recomendada)' : '🔖 URL Corta (ID)'}
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(currentConfig, 'config_bottom')}
                  className="px-3.5 py-2 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#373a40] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedId === 'config_bottom' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'config_bottom' ? '¡Copiado!' : 'Copiar URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNewWindow(currentConfig)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir en Nueva Ventana</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Enlace</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: BIBLIOTECA DE ENLACES GUARDADOS                                */}
        {/* ========================================================================= */}
        {activeSubTab === 'library' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Buscar enlaces guardados por nombre o base de datos..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-xl text-xs text-white placeholder-[#64748b] focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentConfig(linkConfigService.createBlankConfig(selectedDb || activeDbName || ''));
                  setActiveSubTab('configurator');
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Enlace</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#9ca3af] flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Cargando enlaces...</span>
              </div>
            ) : savedLinks.length === 0 ? (
              <div className="p-12 text-center bg-[#202225] border border-dashed border-[#2f3136] rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <Link2 className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white">No hay enlaces guardados</div>
                <p className="text-xs text-[#9ca3af] max-w-md mx-auto">
                  Crea un enlace personalizado en el configurador o carga una de las plantillas rápidas para abrir ventanas restringidas.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('presets')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ver Plantillas Rápidas</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedLinks
                  .filter(l => {
                    if (!librarySearch.trim()) return true;
                    const q = librarySearch.toLowerCase().trim();
                    return (
                      l.name.toLowerCase().includes(q) ||
                      (l.description || '').toLowerCase().includes(q) ||
                      (l.targetDatabase || '').toLowerCase().includes(q)
                    );
                  })
                  .map(link => {
                    const isEditor = link.mode === 'editor';
                    const activeControlCount = (link.editorPanels.allowedControlTitles || []).length;
                    const isCopied = copiedId === link.id;

                    return (
                      <div
                        key={link.id}
                        className="bg-[#202225] border border-[#2f3136] hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{isEditor ? '🎨' : '👁️'}</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">{link.name}</h4>
                                <div className="text-[10px] text-[#9ca3af] flex items-center gap-1.5 mt-0.5">
                                  <span className={`px-1.5 py-0.2 rounded font-mono font-semibold text-[9px] ${
                                    isEditor
                                      ? 'bg-indigo-500/20 text-indigo-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}>
                                    {isEditor ? 'Modo Edición' : 'Modo Visor'}
                                  </span>
                                  {link.targetDatabase && (
                                    <span className="px-1.5 py-0.2 rounded bg-[#1a1b1e] border border-[#2f3136] text-[9px] text-[#cbd5e1] font-mono">
                                      BD: {link.targetDatabase}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteLink(link.id, link.name)}
                              className="p-1.5 text-[#64748b] hover:text-rose-400 hover:bg-[#25282c] rounded-lg transition cursor-pointer"
                              title="Eliminar enlace"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {link.description && (
                            <p className="text-[11px] text-[#9ca3af] line-clamp-2">
                              {link.description}
                            </p>
                          )}

                          {/* Quick Summary Pill Bar */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-[#9ca3af]">
                            {isEditor ? (
                              <>
                                <span className="px-2 py-0.5 rounded bg-[#1a1b1e] border border-[#2f3136]">
                                  {activeControlCount} controles activos
                                </span>
                                <span className={`px-2 py-0.5 rounded border ${
                                  link.editorPanels.dbManagerAllowed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                }`}>
                                  {link.editorPanels.dbManagerAllowed ? 'Gestor BD: Sí' : 'Gestor BD: Bloqueado'}
                                </span>
                              </>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                Diseño: {link.viewerOptions?.targetDesignName || '(Sin fijar)'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions Bottom Bar */}
                        <div className="pt-2 border-t border-[#2f3136] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadIntoConfigurator(link)}
                            className="px-2.5 py-1 bg-[#1a1b1e] hover:bg-[#25282c] text-xs text-[#cbd5e1] hover:text-white rounded-lg border border-[#2f3136] transition cursor-pointer"
                          >
                            Editar
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyUrl(link, link.id)}
                              className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-xs text-[#e1e1e6] rounded-lg border border-[#373a40] flex items-center gap-1 transition cursor-pointer"
                              title="Copiar URL al portapapeles"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenNewWindow(link)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                              title="Abrir enlace en una nueva ventana"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Abrir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: PLANTILLAS RÁPIDAS (PRESETS)                                    */}
        {/* ========================================================================= */}
        {activeSubTab === 'presets' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Plantillas Pre-configuradas para Casos de Uso Comunes</span>
              </h3>
              <p className="text-[11px] text-[#9ca3af] mt-1">
                Haz clic en cualquier plantilla para cargarla inmediatamente en el configurador o abrirla en una nueva ventana.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_LINK_TEMPLATES.map((preset, idx) => {
                const isViewer = preset.mode === 'viewer';
                return (
                  <div
                    key={`preset_card_${idx}`}
                    className="bg-[#202225] border border-[#2f3136] hover:border-indigo-500/50 rounded-2xl p-4.5 flex flex-col justify-between gap-3.5 transition shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2.5 rounded-xl ${isViewer ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                          {isViewer ? <Eye className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{preset.name}</h4>
                          <span className={`px-2 py-0.2 rounded font-mono text-[9px] font-bold ${
                            isViewer ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {isViewer ? 'Modo Visor Kiosco' : 'Modo Edición Filtrado'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#9ca3af]">
                        {preset.description}
                      </p>

                      <div className="p-2.5 rounded-xl bg-[#1a1b1e] border border-[#2f3136] text-[10px] space-y-1">
                        <div className="text-[#cbd5e1] font-semibold">Configuración incluida:</div>
                        <div className="text-[#9ca3af]">
                          • Gestor de Bases de Datos: {preset.editorPanels.dbManagerAllowed ? 'Permitido' : 'Bloqueado / Oculto'}
                        </div>
                        {preset.mode === 'editor' && (
                          <div className="text-[#9ca3af]">
                            • Controles permitidos: {preset.editorPanels.allowedControlTitles.length} tipos específicos
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#2f3136] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(preset)}
                        className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-xs text-white rounded-xl border border-[#373a40] transition cursor-pointer flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Cargar en Configurador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const tempConfig: LinkWindowConfig = {
                            ...preset,
                            id: `quick_${Date.now()}`,
                            targetDatabase: selectedDb || activeDbName || '',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                          };
                          handleOpenNewWindow(tempConfig);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Directo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 4: PROBADOR & URL                                                  */}
        {/* ========================================================================= */}
        {activeSubTab === 'tester' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="bg-[#202225] border border-[#2f3136] rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2f3136] pb-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>Probador y Generador de URLs para Nuevas Ventanas</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#9ca3af]">
                    URL generada para la ventana actual:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUrlFormat('standalone')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                        urlFormat === 'standalone'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#1a1b1e] text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      Autónoma (Portátil)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrlFormat('short')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                        urlFormat === 'short'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#1a1b1e] text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      Corta (ID BD)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-xl font-mono text-[11px] text-[#cbd5e1] break-all select-all leading-relaxed">
                  {generatedPreviewUrl}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(currentConfig, 'tester')}
                    className="px-4 py-2 bg-[#25282c] hover:bg-[#2f3136] text-white border border-[#373a40] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedId === 'tester' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedId === 'tester' ? '¡URL Copiada al Portapapeles!' : 'Copiar URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenNewWindow(currentConfig)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/25"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir en Nueva Ventana Ahora</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnostic Information */}
            <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-2xl p-4.5 space-y-2 text-xs text-[#9ca3af]">
              <div className="text-white font-bold flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>¿Cómo funcionan las ventanas personalizadas?</span>
              </div>
              <p>
                • <strong>URL Autónoma:</strong> Contiene todas las directivas de control y permisos codificadas en el propio enlace. Se puede abrir en cualquier pestaña, ventana o navegador sin depender del estado previo de la sesión.
              </p>
              <p>
                • <strong>Modo Visor:</strong> Inicia la aplicación en modo de presentación a pantalla limpia, con el cuadro de mando activo y sin barras de herramientas de edición.
              </p>
              <p>
                • <strong>Modo Edición Filtrado:</strong> Oculta los controles o botones desactivados de modo que el usuario trabaje en un entorno enfocado exclusivamente en las tareas permitidas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
