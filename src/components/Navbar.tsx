import React, { useState, useEffect, useRef } from 'react';
import { CanvasDocument, DatabaseInfo } from '../types';
import { HeaderButtonsConfig } from '../types/linkTypes';
import { usePwa } from '../hooks/usePwa';
import { AppThemeToggle } from './AppThemeToggle';
import { 
  Database, 
  Undo2, 
  Redo2, 
  FolderOpen, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  ChevronDown, 
  FileCode, 
  Maximize2, 
  Minimize2,
  Sparkles,
  Smartphone,
  Wifi,
  WifiOff,
  LayoutTemplate,
  RotateCcw,
  Eye,
  FileArchive
} from 'lucide-react';

interface NavbarProps {
  canvasDoc: CanvasDocument;
  onChangeCanvasDoc: (updated: CanvasDocument) => void;
  activeDbName: string;
  databasesList: string[];
  dbInfo: DatabaseInfo | null;
  onSelectDatabase: (name: string) => void;
  onOpenDbManager: () => void;
  onOpenSavedDesigns: () => void;
  onOpenExportModal: () => void;
  onOpenHtmlExport?: () => void;
  onOpenGenerateLayout?: () => void;
  onOpenTemplateGallery?: () => void;
  onOpenPwaModal?: () => void;
  onOpenResetModal?: () => void;
  onTogglePreviewMode?: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  previewMode?: boolean;
  headerButtonsConfig?: HeaderButtonsConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  canvasDoc,
  onChangeCanvasDoc,
  activeDbName,
  databasesList,
  dbInfo,
  onSelectDatabase,
  onOpenDbManager,
  onOpenSavedDesigns,
  onOpenExportModal,
  onOpenHtmlExport,
  onOpenGenerateLayout,
  onOpenTemplateGallery,
  onOpenPwaModal,
  onOpenResetModal,
  onTogglePreviewMode,
  onExportJson,
  onImportJson,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  previewMode = false,
  headerButtonsConfig
}) => {
  const { isInstalled, canInstall, isOnline } = usePwa();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuCoords, setExportMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle to show/hide text of buttons with icons in the header
  const [showButtonLabels, setShowButtonLabels] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dexie_studio_navbar_show_labels');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {}
    return true;
  });

  const toggleButtonLabels = () => {
    setShowButtonLabels(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dexie_studio_navbar_show_labels', String(next));
      } catch (e) {}
      return next;
    });
  };

  const getLabelClass = (extraClass: string = '') => {
    if (showButtonLabels) {
      return `inline-block whitespace-nowrap ${extraClass}`;
    }
    return `hidden group-hover:inline-block whitespace-nowrap animate-in fade-in duration-150 ${extraClass}`;
  };

  const toggleExportMenu = () => {
    if (!showExportMenu && exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect();
      const width = 192;
      let left = rect.right - width;
      if (typeof window !== 'undefined') {
        if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
        if (left < 12) left = 12;
      }
      setExportMenuCoords({ top: rect.bottom + 6, left });
    }
    setShowExportMenu(!showExportMenu);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && exportBtnRef.current && !exportBtnRef.current.contains(e.target as Node)) {
        const menu = document.getElementById('export-json-floating-menu');
        if (menu && !menu.contains(e.target as Node)) {
          setShowExportMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Error al cambiar modo de pantalla completa:', err);
    }
  };

  return (
    <header className="h-14 bg-[#202225] border-b border-[#2f3136] select-none z-20 shadow-md relative text-[#e1e1e6] flex items-center justify-between w-full overflow-hidden">
      {/* 1. Left Branding (Fixed & Always Visible unless disabled) */}
      {headerButtonsConfig?.branding !== false && (
        <div className="flex items-center gap-2.5 flex-shrink-0 pl-3.5 pr-3 py-2 border-r border-[#2f3136] bg-[#202225] z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#5865f2] to-[#4752c4] flex items-center justify-center text-white shadow-sm font-bold text-xs tracking-wider flex-shrink-0">
            DC
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-white leading-tight flex items-center gap-1.5 whitespace-nowrap">
              <span>Dexie Canvas Studio</span>
              <button
                type="button"
                onClick={toggleButtonLabels}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer select-none flex items-center gap-1 group/badge ${
                  showButtonLabels
                    ? 'bg-[#2f3136] hover:bg-[#373a40] text-[#939db8] hover:text-white border-[#373a40]'
                    : 'bg-[#5865f2]/25 hover:bg-[#5865f2]/40 text-[#a5b4fc] hover:text-white border-[#5865f2]/50 shadow-xs ring-1 ring-[#5865f2]/30'
                }`}
                title={
                  showButtonLabels
                    ? 'v1.0 • Clic para ocultar texto de los botones del header (Modo compacto: se revelan al pasar el cursor)'
                    : 'v1.0 • Clic para mostrar texto fijo en los botones del header (Modo expandido)'
                }
                aria-label={
                  showButtonLabels
                    ? 'Ocultar texto de botones del header (Modo compacto)'
                    : 'Mostrar texto de botones del header (Modo expandido)'
                }
                aria-pressed={showButtonLabels}
              >
                <span>v1.0</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    showButtonLabels ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'
                  }`}
                />
              </button>
            </h1>
            <div className="text-[10px] text-[#9ca3af] whitespace-nowrap">IndexedDB Visual Report Builder</div>
          </div>
        </div>
      )}

      {/* 2. Toolbar Izquierda: Selector BD, Nombre de diseño y a la derecha del todo Reset + Previsualizar */}
      <div className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden flex items-center gap-2.5 px-3 border-r border-[#2f3136] scrollbar-thin scrollbar-thumb-[#2f3136] scrollbar-track-transparent">
        {/* Database Selector Pill */}
        {(headerButtonsConfig?.dbSelector !== false || headerButtonsConfig?.dbManagerBtn !== false) && (
          <div className="flex items-center gap-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-1 flex-shrink-0">
            {headerButtonsConfig?.dbSelector !== false && (
              <>
                <Database className="w-3.5 h-3.5 text-[#5865f2] ml-1 flex-shrink-0" />
                <select
                  value={activeDbName}
                  onChange={(e) => onSelectDatabase(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#e1e1e6] focus:outline-none cursor-pointer max-w-[130px] truncate"
                  title="Base de datos activa"
                >
                  <option value="" className="bg-[#202225] text-[#9ca3af]">-- Sin BD (Clean) --</option>
                  {Array.from(new Set(databasesList)).map((name, idx) => (
                    <option key={`nav_db_${name}_${idx}`} value={name} className="bg-[#202225] text-[#e1e1e6]">{name}</option>
                  ))}
                </select>
              </>
            )}

            {headerButtonsConfig?.dbManagerBtn !== false && (
              <button
                onClick={onOpenDbManager}
                className="px-2 py-0.5 bg-[#25282c] hover:bg-[#2f3136] border border-[#373a40] rounded text-[10px] font-semibold text-[#e1e1e6] transition flex-shrink-0 cursor-pointer"
                title="Abrir gestor de bases de datos y tablas"
              >
                Gestionar BD
              </button>
            )}
          </div>
        )}

        {/* Canvas Document Name */}
        {headerButtonsConfig?.designNameInput !== false && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="text"
              value={canvasDoc.name}
              onChange={(e) => onChangeCanvasDoc({ ...canvasDoc, name: e.target.value })}
              className="text-xs font-semibold text-[#e1e1e6] bg-transparent hover:bg-[#25282c] focus:bg-[#1a1b1e] px-2 py-1 rounded border border-transparent focus:border-[#5865f2] focus:outline-none transition max-w-[140px] truncate"
              title="Nombre del diseño"
            />
          </div>
        )}

        {/* Movidos del footer: Botones Reset y Previsualizar a la derecha del todo de esta toolbar */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {headerButtonsConfig?.resetCanvas !== false && onOpenResetModal && (
            <button
              onClick={onOpenResetModal}
              className="group px-2.5 py-1.5 bg-[#25282c] hover:bg-red-500/15 hover:border-red-500/30 text-[#9ca3af] hover:text-red-400 border border-[#2f3136] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer"
              title="Reiniciar lienzo (Clean Start: vaciar diseño y deseleccionar BD)"
            >
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              <span className={getLabelClass()}>Reset</span>
            </button>
          )}

          {headerButtonsConfig?.previewToggle !== false && onTogglePreviewMode && (
            <button
              onClick={onTogglePreviewMode}
              className={`group px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer border ${
                previewMode
                  ? 'bg-[#5865f2] text-white shadow-sm border-[#5865f2]'
                  : 'bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border-[#2f3136]'
              }`}
              title={previewMode ? 'Volver al modo edición' : 'Modo previsualización interactiva'}
            >
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              <span className={getLabelClass()}>{previewMode ? 'Modo Edición' : 'Previsualizar'}</span>
            </button>
          )}

          {headerButtonsConfig?.exportHtmlZip !== false && previewMode && onOpenHtmlExport && (
            <button
              onClick={onOpenHtmlExport}
              className="group px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-500/50 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition flex-shrink-0 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
              title="Exportar canvas actual a paquete web HTML interactivo en archivo ZIP"
            >
              <FileArchive className="w-3.5 h-3.5 flex-shrink-0" />
              <span className={getLabelClass()}>Exportar HTML (.zip)</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Toolbar Central: Controles de deshacer y rehacer */}
      {headerButtonsConfig?.undoRedo !== false && (
        <div className="flex-shrink-0 h-full flex items-center justify-center px-3 border-r border-[#2f3136] bg-[#202225] z-10">
          <div className="flex items-center bg-[#1a1b1e] p-0.5 rounded-lg border border-[#2f3136]">
            <button
              onClick={onUndo}
              disabled={!canUndo || previewMode}
              className="p-1.5 text-[#9ca3af] hover:text-white disabled:opacity-25 rounded hover:bg-[#25282c] transition cursor-pointer"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo || previewMode}
              className="p-1.5 text-[#9ca3af] hover:text-white disabled:opacity-25 rounded hover:bg-[#25282c] transition cursor-pointer"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Toolbar Derecha: Acciones, exportaciones y herramientas (scrollable horizontalmente si es necesario) */}
      <div className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden flex items-center gap-2.5 px-3 scrollbar-thin scrollbar-thumb-[#2f3136] scrollbar-track-transparent">
        {/* Template Gallery Button */}
        {headerButtonsConfig?.templateGallery !== false && onOpenTemplateGallery && (
          <button
            onClick={onOpenTemplateGallery}
            className="group px-2.5 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#2f3136] hover:border-[#38bdf8]/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer"
            title="Explorar galería de plantillas prediseñadas de dashboards para cargar en el lienzo"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#38bdf8] group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className={getLabelClass()}>Plantillas</span>
          </button>
        )}

        {/* Saved Designs (Dexie) */}
        {headerButtonsConfig?.savedDesigns !== false && (
          <button
            onClick={onOpenSavedDesigns}
            className="group px-2.5 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#2f3136] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer"
            title="Guardar o cargar diseños en la base de datos IndexedDB activa"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#5865f2] flex-shrink-0" />
            <span className={getLabelClass()}>Diseños BD</span>
          </button>
        )}

        {/* Generate Layout AI Button */}
        {headerButtonsConfig?.generateLayoutAi !== false && onOpenGenerateLayout && (
          <button
            onClick={onOpenGenerateLayout}
            className="group px-2.5 py-1.5 bg-gradient-to-r from-[#5865f2]/20 via-[#8b5cf6]/20 to-[#38bdf8]/20 hover:from-[#5865f2]/30 hover:to-[#38bdf8]/30 text-white border border-[#5865f2]/50 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition flex-shrink-0 cursor-pointer"
            title="Generar propuesta de layout de dashboard automáticamente con Gemini API según el esquema de la tabla"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse flex-shrink-0" />
            <span className={`${getLabelClass()} bg-gradient-to-r from-white via-[#e0e7ff] to-[#38bdf8] bg-clip-text text-transparent`}>
              Generar Layout
            </span>
          </button>
        )}

        {/* JSON Layout Import / Export Dropdown */}
        {headerButtonsConfig?.jsonMenu !== false && (
          <div className="relative flex-shrink-0">
            <button
              ref={exportBtnRef}
              onClick={toggleExportMenu}
              className="group px-2.5 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#2f3136] rounded-lg text-xs font-semibold flex items-center gap-1 transition flex-shrink-0 cursor-pointer"
              title="Importar o exportar diseño en JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-[#9ca3af] flex-shrink-0" />
              <span className={getLabelClass()}>JSON</span>
              <ChevronDown className="w-3 h-3 text-[#9ca3af] flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Multi-Format Image and PDF Export Button */}
        {headerButtonsConfig?.exportModal !== false && (
          <button
            onClick={onOpenExportModal}
            className="group px-3 py-1.5 bg-gradient-to-r from-[#5865f2] to-[#4752c4] hover:from-[#4752c4] hover:to-[#3c45a5] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition flex-shrink-0 cursor-pointer"
            title="Exportar diseño como imagen (PNG, JPEG, SVG) o documento PDF"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            <span className={getLabelClass()}>Exportar (Img/PDF)</span>
          </button>
        )}

        {/* PWA App Install / Status Button */}
        {headerButtonsConfig?.pwaInstall !== false && onOpenPwaModal && (
          <button
            onClick={onOpenPwaModal}
            className={`group px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer border ${
              !isOnline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : canInstall && !isInstalled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 animate-pulse'
                : 'bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border-[#2f3136]'
            }`}
            title="Funcionalidad PWA (App offline, instalación en escritorio/móvil y sincronización)"
          >
            {!isOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            ) : isInstalled ? (
              <Smartphone className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            )}
            <span className={getLabelClass()}>
              {!isOnline ? 'Offline' : isInstalled ? 'PWA' : 'Instalar App'}
            </span>
          </button>
        )}
      </div>

      {/* 5. Right: Theme Toggle & Fullscreen Button */}
      {(headerButtonsConfig?.themeToggle !== false || headerButtonsConfig?.fullscreenToggle !== false) && (
        <div className="flex items-center flex-shrink-0 pl-3 pr-3.5 py-2 border-l border-[#2f3136] bg-[#202225] z-10 gap-2">
          {headerButtonsConfig?.themeToggle !== false && (
            <AppThemeToggle variant="navbar" showButtonLabels={showButtonLabels} />
          )}
          {headerButtonsConfig?.fullscreenToggle !== false && (
            <button
              onClick={toggleFullscreen}
              className="group px-2.5 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] hover:text-white border border-[#2f3136] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 shadow-xs cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa (F11 / Esc)' : 'Pantalla completa (F11)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#5865f2] flex-shrink-0" />
                  <span className={`${getLabelClass()} font-medium`}>Ventana</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#9ca3af] flex-shrink-0" />
                  <span className={`${getLabelClass()} font-medium`}>Pantalla completa</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Floating JSON Layout Import / Export Dropdown */}
      {showExportMenu && exportMenuCoords && (
        <div
          id="export-json-floating-menu"
          style={{
            position: 'fixed',
            top: `${exportMenuCoords.top}px`,
            left: `${exportMenuCoords.left}px`
          }}
          className="bg-[#202225] border border-[#2f3136] rounded-xl shadow-2xl py-1.5 z-[9999] text-xs w-48 space-y-0.5 text-[#e1e1e6] animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => {
              onExportJson();
              setShowExportMenu(false);
            }}
            className="w-full text-left px-3 py-2 hover:bg-[#2f3136] text-[#e1e1e6] hover:text-white flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5865f2]" />
            <span>Exportar Diseño JSON</span>
          </button>
          {onOpenHtmlExport && (
            <button
              onClick={() => {
                onOpenHtmlExport();
                setShowExportMenu(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#2f3136] text-[#e1e1e6] hover:text-white flex items-center gap-2 transition cursor-pointer text-emerald-400 font-semibold"
            >
              <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar HTML (.zip)</span>
            </button>
          )}
          <label className="w-full text-left px-3 py-2 hover:bg-[#2f3136] text-[#e1e1e6] hover:text-white flex items-center gap-2 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-[#5865f2]" />
            <span>Importar Diseño JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                onImportJson(e);
                setShowExportMenu(false);
              }}
              className="hidden"
            />
          </label>
        </div>
      )}
    </header>
  );
};
