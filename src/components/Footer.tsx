import React, { useState, useRef, useEffect } from 'react';
import { CanvasDocument, CanvasSnapshot } from '../types';
import { FooterElementsConfig } from '../types/linkTypes';
import { ThemeSelector } from './ThemeSelector';
import { CustomThemeModal } from './CustomThemeModal';
import { applyThemeToDocument } from '../utils/themePresets';
import { AppThemeToggle } from './AppThemeToggle';
import { usePwa } from '../hooks/usePwa';
import { snapshotService } from '../services/snapshotService';
import {
  ZoomIn,
  ZoomOut,
  Ruler,
  Grid,
  Magnet,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Paintbrush,
  Wifi,
  WifiOff,
  Smartphone,
  Camera,
  Check,
  History,
  ArrowLeftRight
} from 'lucide-react';

interface FooterProps {
  canvasDoc: CanvasDocument;
  onChangeCanvasDoc: (updated: CanvasDocument) => void;
  onApplyTheme?: (themeId: string, updateExistingElements: boolean) => void;
  highContrastMode?: boolean;
  onToggleHighContrastMode?: (enabled: boolean) => void;
  zoom: number;
  onChangeZoom: (newZoom: number) => void;
  onOpenResetModal?: () => void;
  onOpenPwaModal?: () => void;
  previewMode?: boolean;
  onTogglePreviewMode?: () => void;
  selectedCount?: number;
  selectedElementIds?: string[];
  activeDbName?: string;
  onOpenVersionHistory?: () => void;
  onSnapshotTaken?: (snapshot: CanvasSnapshot) => void;
  footerElementsConfig?: FooterElementsConfig;
}

export const Footer: React.FC<FooterProps> = ({
  canvasDoc,
  onChangeCanvasDoc,
  onApplyTheme,
  highContrastMode,
  onToggleHighContrastMode,
  zoom,
  onChangeZoom,
  onOpenResetModal,
  onOpenPwaModal,
  previewMode = false,
  onTogglePreviewMode,
  selectedCount = 0,
  selectedElementIds = [],
  activeDbName = '',
  onOpenVersionHistory,
  onSnapshotTaken,
  footerElementsConfig
}) => {
  const { isOnline, isInstalled, canInstall } = usePwa();
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);
  const [isCustomThemeOpen, setIsCustomThemeOpen] = useState(false);
  const [canvasSettingsCoords, setCanvasSettingsCoords] = useState<{ bottom: number; left: number } | null>(null);
  const canvasSettingsBtnRef = useRef<HTMLButtonElement>(null);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const handleTakeSnapshot = async () => {
    if (isTakingSnapshot) return;
    setIsTakingSnapshot(true);
    try {
      const snap = await snapshotService.takeSnapshot(canvasDoc, activeDbName || 'default');
      setSnapshotSuccess(true);
      if (onSnapshotTaken) {
        onSnapshotTaken(snap);
      }
      setTimeout(() => {
        setSnapshotSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Error taking snapshot from Footer:', err);
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const handleApplyTheme = (themeId: string, updateExistingElements: boolean) => {
    if (onApplyTheme) {
      onApplyTheme(themeId, updateExistingElements);
    } else {
      const updated = applyThemeToDocument(canvasDoc, themeId, updateExistingElements);
      onChangeCanvasDoc(updated);
    }
  };

  const toggleCanvasSettings = () => {
    if (!showCanvasSettings && canvasSettingsBtnRef.current) {
      const rect = canvasSettingsBtnRef.current.getBoundingClientRect();
      const width = 320;
      let left = rect.left + rect.width / 2 - width / 2;
      if (typeof window !== 'undefined') {
        if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
        if (left < 12) left = 12;
      }
      // Open anchored 8px above the footer button
      const bottom = typeof window !== 'undefined' ? Math.max(48, window.innerHeight - rect.top + 8) : 48;
      setCanvasSettingsCoords({ bottom, left });
    }
    setShowCanvasSettings(!showCanvasSettings);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showCanvasSettings &&
        canvasSettingsBtnRef.current &&
        !canvasSettingsBtnRef.current.contains(e.target as Node)
      ) {
        const panel = document.getElementById('footer-canvas-settings-floating-panel');
        if (panel && !panel.contains(e.target as Node)) {
          setShowCanvasSettings(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCanvasSettings]);

  return (
    <footer className="h-11 bg-[#202225] border-t border-[#2f3136] select-none z-20 shadow-lg relative text-[#e1e1e6] flex items-center justify-between px-3 flex-shrink-0">
      {/* Left Info: Status / Document Dimensions / PWA Offline Indicator */}
      <div className="flex items-center gap-2.5 text-xs text-[#9ca3af] flex-shrink-0">
        {footerElementsConfig?.dimensions !== false && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#1a1b1e] px-2 py-1 rounded border border-[#2f3136]">
            <span className="text-[#5865f2] font-semibold">{canvasDoc.width} × {canvasDoc.height} px</span>
          </div>
        )}

        {footerElementsConfig?.elementsCount !== false && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[#5865f2]" />
            <span>{canvasDoc.elements.length} {canvasDoc.elements.length === 1 ? 'elemento' : 'elementos'}</span>
            {selectedCount > 0 && (
              <span className="text-[#5865f2] font-medium">({selectedCount} seleccionado{selectedCount > 1 ? 's' : ''})</span>
            )}
          </div>
        )}

        {/* PWA / Offline Status Pill */}
        {footerElementsConfig?.pwaStatus !== false && onOpenPwaModal && (
          <button
            type="button"
            onClick={onOpenPwaModal}
            className={`hidden md:flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border transition cursor-pointer ${
              !isOnline
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : isInstalled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-[#1a1b1e] text-[#9ca3af] border-[#2f3136] hover:text-white hover:border-[#373a40]'
            }`}
            title="Estado PWA y persistencia local IndexedDB"
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>Offline</span>
              </>
            ) : isInstalled ? (
              <>
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>PWA Nativa</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>PWA Ready</span>
              </>
            )}
          </button>
        )}

        {/* Take Snapshot Feature in Footer (Saves thumbnail & state to IndexedDB) */}
        {footerElementsConfig?.snapshotButton !== false && (
          <div className="flex items-center gap-1 bg-[#1a1b1e] p-0.5 rounded-lg border border-[#2f3136] flex-shrink-0">
            <button
              type="button"
              onClick={handleTakeSnapshot}
              disabled={isTakingSnapshot}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                snapshotSuccess
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isTakingSnapshot
                  ? 'bg-emerald-600/30 text-emerald-300 cursor-wait'
                  : 'text-[#e1e1e6] hover:bg-[#25282c] hover:text-emerald-400'
              }`}
              title="Tomar instantánea del lienzo y guardar miniatura en IndexedDB"
            >
              {snapshotSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline font-bold">¡Guardada!</span>
                  <span className="sm:hidden font-bold">✓</span>
                </>
              ) : isTakingSnapshot ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Capturando...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Tomar Instantánea</span>
                  <span className="sm:hidden">Instantánea</span>
                </>
              )}
            </button>
            {onOpenVersionHistory && (
              <button
                type="button"
                onClick={onOpenVersionHistory}
                className="p-1 text-[#9ca3af] hover:text-emerald-400 hover:bg-[#25282c] rounded transition cursor-pointer"
                title="Abrir panel de Historial de Versiones"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center/Right: The controls moved from header */}
      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
        {/* 1. Zoom Slider & Precision Tool */}
        {footerElementsConfig?.zoomControls !== false && (
          <div className="flex items-center gap-1 bg-[#1a1b1e] px-1.5 py-1 rounded-lg border border-[#2f3136] flex-shrink-0">
            <button
              type="button"
              onClick={() => onChangeZoom(Math.max(0.25, Number((zoom - 0.1).toFixed(2))))}
              className="p-1 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition cursor-pointer"
              title="Reducir Zoom (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Range Slider */}
            <div className="flex items-center px-1">
              <input
                type="range"
                min="25"
                max="300"
                step="5"
                value={Math.round(zoom * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeZoom(Number((val / 100).toFixed(2)));
                }}
                className="w-16 sm:w-24 h-1.5 bg-[#2f3136] rounded-lg appearance-none cursor-pointer accent-[#5865f2] focus:outline-none transition-all hover:bg-[#373a40]"
                title={`Zoom: ${Math.round(zoom * 100)}%`}
              />
            </div>

            <button
              type="button"
              onClick={() => onChangeZoom(Math.min(3.0, Number((zoom + 0.1).toFixed(2))))}
              className="p-1 text-[#9ca3af] hover:text-white rounded hover:bg-[#25282c] transition cursor-pointer"
              title="Aumentar Zoom (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span
              className="text-xs font-mono font-semibold px-1.5 text-[#e1e1e6] min-w-[42px] text-center select-none"
              title="Nivel de zoom actual"
            >
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => onChangeZoom(1)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                Math.round(zoom * 100) === 100
                  ? 'bg-[#5865f2]/20 text-[#38bdf8] border border-[#5865f2]/30'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
              }`}
              title="Restablecer zoom al 100%"
            >
              100%
            </button>
          </div>
        )}

        {/* 2. Grid, Snap, Ruler & Canvas Settings Toggles */}
        {footerElementsConfig?.gridControls !== false && (
          <div className="flex items-center bg-[#1a1b1e] p-0.5 rounded-lg border border-[#2f3136] flex-shrink-0">
            <button
              onClick={() => onChangeCanvasDoc({ ...canvasDoc, showRulers: canvasDoc.showRulers === false ? true : false })}
              className={`p-1.5 rounded transition cursor-pointer ${
                canvasDoc.showRulers !== false
                  ? 'bg-[#5865f2] text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
              }`}
              title={canvasDoc.showRulers !== false ? 'Ocultar reglas (Rulers)' : 'Mostrar reglas (Rulers)'}
            >
              <Ruler className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeCanvasDoc({ ...canvasDoc, showGrid: !canvasDoc.showGrid })}
              className={`p-1.5 rounded transition cursor-pointer ${
                canvasDoc.showGrid
                  ? 'bg-[#5865f2] text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
              }`}
              title={canvasDoc.showGrid ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula'}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeCanvasDoc({ ...canvasDoc, snapToGrid: !canvasDoc.snapToGrid })}
              className={`p-1.5 rounded transition cursor-pointer ${
                canvasDoc.snapToGrid
                  ? 'bg-[#5865f2] text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
              }`}
              title={canvasDoc.snapToGrid ? 'Desactivar ajuste a rejilla' : 'Ajustar a rejilla (Snap)'}
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>
            <button
              ref={canvasSettingsBtnRef}
              onClick={toggleCanvasSettings}
              className={`p-1.5 rounded transition cursor-pointer ${
                showCanvasSettings
                  ? 'bg-[#5865f2] text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
              }`}
              title="Configuración de dimensiones del lienzo"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. Theme Palette Selector & Custom Theme Section */}
        {(footerElementsConfig?.themeSelector !== false || footerElementsConfig?.customThemeBtn !== false) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {footerElementsConfig?.themeSelector !== false && (
              <ThemeSelector
                currentThemeId={canvasDoc.themeId}
                canvasBackgroundColor={canvasDoc.backgroundColor}
                highContrastMode={highContrastMode || canvasDoc.highContrastMode}
                onApplyTheme={handleApplyTheme}
                onToggleHighContrastMode={onToggleHighContrastMode}
                onCustomBackgroundChange={(color) => onChangeCanvasDoc({ ...canvasDoc, backgroundColor: color })}
                onOpenCustomTheme={() => setIsCustomThemeOpen(true)}
              />
            )}

            {footerElementsConfig?.customThemeBtn !== false && (
              <button
                type="button"
                onClick={() => setIsCustomThemeOpen(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer flex-shrink-0 ${
                  isCustomThemeOpen
                    ? 'bg-[#5865f2] text-white border-[#5865f2] shadow-xs'
                    : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#e1e1e6] border-[#2f3136] hover:border-[#373a40]'
                }`}
                title="Personalizar tema: colores, bordes y estilos dinámicos para elementos seleccionados"
              >
                <Paintbrush className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span className="hidden sm:inline">Tema Personalizado</span>
                {selectedCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#5865f2]/30 text-[#38bdf8] text-[10px] font-mono rounded-full font-bold">
                    {selectedCount} sel
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* 4. Application UI Theme Toggle (Light / Dark / System) */}
        {footerElementsConfig?.appThemeToggle !== false && (
          <AppThemeToggle variant="footer" showLabel={true} />
        )}
      </div>

      {/* Floating Canvas Dimensions & Layout Settings Panel */}
      {showCanvasSettings && canvasSettingsCoords && (
        <div
          id="footer-canvas-settings-floating-panel"
          style={{
            position: 'fixed',
            bottom: `${canvasSettingsCoords.bottom}px`,
            left: `${canvasSettingsCoords.left}px`
          }}
          className="bg-[#202225] border border-[#2f3136] rounded-xl shadow-2xl p-3.5 z-[9999] text-xs w-80 space-y-3 text-[#e1e1e6] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="font-bold text-white flex justify-between items-center border-b border-[#2f3136] pb-2">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#5865f2]" />
              <span>Dimensiones y Fondo del Lienzo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1b1e] border border-[#2f3136] text-[#9ca3af]">
                {canvasDoc.width > canvasDoc.height ? 'Horizontal' : canvasDoc.width < canvasDoc.height ? 'Vertical' : 'Cuadrado'}
              </span>
              <button
                onClick={() => setShowCanvasSettings(false)}
                className="text-[#9ca3af] hover:text-white cursor-pointer px-1 text-sm leading-none"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Width & Height Inputs with Orientation Switcher */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Tamaño en Píxeles</span>
              <button
                type="button"
                onClick={() => {
                  onChangeCanvasDoc({
                    ...canvasDoc,
                    width: canvasDoc.height,
                    height: canvasDoc.width
                  });
                }}
                className="text-[10px] text-[#38bdf8] hover:text-white flex items-center gap-1 transition cursor-pointer px-1 py-0.5 rounded hover:bg-[#25282c]"
                title="Intercambiar ancho y alto"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Invertir Orientación</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#9ca3af] block mb-0.5">Ancho (px)</label>
                <input
                  type="number"
                  min={300}
                  max={3840}
                  step={10}
                  value={canvasDoc.width}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      onChangeCanvasDoc({ ...canvasDoc, width: val });
                    }
                  }}
                  className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-[#e1e1e6] font-mono text-xs focus:border-[#5865f2] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#9ca3af] block mb-0.5">Alto (px)</label>
                <input
                  type="number"
                  min={300}
                  max={3840}
                  step={10}
                  value={canvasDoc.height}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      onChangeCanvasDoc({ ...canvasDoc, height: val });
                    }
                  }}
                  className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-[#e1e1e6] font-mono text-xs focus:border-[#5865f2] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Layout Presets */}
          <div>
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider block mb-1.5">
              Plantillas de Disposición / Layout
            </span>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {[
                { name: 'Dashboard', w: 960, h: 680, desc: '960×680' },
                { name: 'HD 16:9', w: 1280, h: 720, desc: '1280×720' },
                { name: 'Full HD', w: 1920, h: 1080, desc: '1920×1080' },
                { name: 'A4 Vert', w: 794, h: 1123, desc: '794×1123' },
                { name: 'A4 Horiz', w: 1123, h: 794, desc: '1123×794' },
                { name: 'Carta Vert', w: 816, h: 1056, desc: '816×1056' },
                { name: 'Carta Horiz', w: 1056, h: 816, desc: '1056×816' },
                { name: 'Cuadrado', w: 800, h: 800, desc: '800×800' }
              ].map((preset) => {
                const isActive = canvasDoc.width === preset.w && canvasDoc.height === preset.h;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      onChangeCanvasDoc({ ...canvasDoc, width: preset.w, height: preset.h });
                    }}
                    className={`p-1.5 rounded text-left transition cursor-pointer flex flex-col justify-between border ${
                      isActive
                        ? 'bg-[#5865f2]/20 border-[#5865f2] text-white font-semibold'
                        : 'bg-[#25282c] hover:bg-[#2f3136] border-[#373a40] text-[#e1e1e6]'
                    }`}
                  >
                    <span className="leading-tight truncate">{preset.name}</span>
                    <span className="text-[9px] font-mono opacity-70 leading-tight">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Color */}
          <div className="pt-1.5 border-t border-[#2f3136]">
            <label className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider block mb-1.5">
              Color de Fondo del Lienzo
            </label>
            
            {/* Quick palette swatches */}
            <div className="flex items-center gap-1.5 mb-2">
              {[
                { color: '#ffffff', name: 'Blanco' },
                { color: '#f8fafc', name: 'Gris Claro' },
                { color: '#f1f5f9', name: 'Slate Suave' },
                { color: '#fffbeb', name: 'Crema' },
                { color: '#0f172a', name: 'Slate Oscuro' },
                { color: '#1e293b', name: 'Navy Oscuro' },
                { color: '#2e3440', name: 'Nord' },
                { color: '#064e3b', name: 'Esmeralda' }
              ].map((swatch) => {
                const isSelected = (canvasDoc.backgroundColor || '#ffffff').toLowerCase() === swatch.color.toLowerCase();
                return (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => onChangeCanvasDoc({ ...canvasDoc, backgroundColor: swatch.color })}
                    className={`w-6 h-6 rounded-md border transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'border-[#5865f2] ring-2 ring-[#5865f2]/50 scale-110'
                        : 'border-[#373a40] hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.name}
                  >
                    {isSelected && (
                      <Check className={`w-3 h-3 ${['#ffffff', '#f8fafc', '#f1f5f9', '#fffbeb'].includes(swatch.color) ? 'text-gray-900' : 'text-white'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Native picker + Hex input */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={canvasDoc.backgroundColor || '#ffffff'}
                onChange={(e) => onChangeCanvasDoc({ ...canvasDoc, backgroundColor: e.target.value })}
                className="w-8 h-8 rounded border border-[#2f3136] cursor-pointer bg-[#1a1b1e] p-0.5"
                title="Selector de color personalizado"
              />
              <input
                type="text"
                value={canvasDoc.backgroundColor || '#ffffff'}
                onChange={(e) => onChangeCanvasDoc({ ...canvasDoc, backgroundColor: e.target.value })}
                className="flex-1 px-2.5 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded font-mono text-xs text-[#e1e1e6] focus:border-[#5865f2] focus:outline-none"
                placeholder="#ffffff"
              />
              <button
                type="button"
                onClick={() => onChangeCanvasDoc({ ...canvasDoc, backgroundColor: '#ffffff' })}
                className="px-2 py-1 bg-[#25282c] hover:bg-[#2f3136] border border-[#373a40] rounded text-[10px] text-[#9ca3af] hover:text-white transition cursor-pointer"
                title="Restablecer a fondo blanco"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Theme & Border Dynamic Studio Modal */}
      <CustomThemeModal
        isOpen={isCustomThemeOpen}
        onClose={() => setIsCustomThemeOpen(false)}
        canvasDoc={canvasDoc}
        selectedElementIds={selectedElementIds}
        onChangeCanvasDoc={onChangeCanvasDoc}
      />
    </footer>
  );
};
