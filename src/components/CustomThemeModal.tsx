import React, { useState, useEffect, useMemo } from 'react';
import { CanvasDocument, CanvasElement, ElementStyle } from '../types';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';
import {
  Palette,
  Paintbrush,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  Save,
  Trash2,
  Layers,
  Square,
  Sun,
  Moon,
  ChevronRight,
  HelpCircle,
  X
} from 'lucide-react';

export interface CustomThemeConfig {
  id?: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius: number;
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'glow';
  opacity: number;
  canvasBackgroundColor: string;
}

export interface CustomThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasDoc: CanvasDocument;
  selectedElementIds: string[];
  onChangeCanvasDoc: (updated: CanvasDocument) => void;
  onApplyToSelected?: (styleUpdates: Partial<ElementStyle>, targetIds?: string[]) => void;
}

const STORAGE_KEY = 'canvas_designer_custom_themes_v1';

const DEFAULT_THEME_RECIPES: CustomThemeConfig[] = [
  {
    id: 'recipe_obsidian',
    name: 'Obsidian Pro',
    backgroundColor: '#1e293b',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
    borderColor: '#334155',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 8,
    shadow: 'md',
    opacity: 1,
    canvasBackgroundColor: '#0f172a'
  },
  {
    id: 'recipe_emerald',
    name: 'Emerald Fintech',
    backgroundColor: '#065f46',
    textColor: '#ecfdf5',
    accentColor: '#10b981',
    borderColor: '#047857',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 8,
    shadow: 'md',
    opacity: 1,
    canvasBackgroundColor: '#064e3b'
  },
  {
    id: 'recipe_cyber',
    name: 'Cyberpunk Neon',
    backgroundColor: '#1e1145',
    textColor: '#fdf4ff',
    accentColor: '#f43f5e',
    borderColor: '#06b6d4',
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: 12,
    shadow: 'glow',
    opacity: 1,
    canvasBackgroundColor: '#12072b'
  },
  {
    id: 'recipe_clean_light',
    name: 'Pure Minimal Light',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    accentColor: '#3b82f6',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 8,
    shadow: 'sm',
    opacity: 1,
    canvasBackgroundColor: '#f8fafc'
  },
  {
    id: 'recipe_warm_solar',
    name: 'Warm Pergamino',
    backgroundColor: '#eee8d5',
    textColor: '#073642',
    accentColor: '#b58900',
    borderColor: '#93a1a1',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 10,
    shadow: 'sm',
    opacity: 1,
    canvasBackgroundColor: '#fdf6e3'
  },
  {
    id: 'recipe_indigo_modern',
    name: 'Indigo Studio',
    backgroundColor: '#1e1b4b',
    textColor: '#e0e7ff',
    accentColor: '#6366f1',
    borderColor: '#4338ca',
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderRadius: 12,
    shadow: 'lg',
    opacity: 1,
    canvasBackgroundColor: '#0f0e26'
  }
];

const PRESET_COLORS = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#94a3b8', '#64748b', '#334155', '#1e293b', '#0f172a', '#000000',
  '#3b82f6', '#2563eb', '#1d4ed8', '#38bdf8', '#06b6d4', '#10b981', '#059669', '#34d399', '#f59e0b', '#d97706',
  '#ef4444', '#dc2626', '#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1', '#4f46e5', '#1e1b4b', '#12072b'
];

export const CustomThemeModal: React.FC<CustomThemeModalProps> = ({
  isOpen,
  onClose,
  canvasDoc,
  selectedElementIds,
  onChangeCanvasDoc,
  onApplyToSelected
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Get initial values from first selected element if available, or sensible defaults
  const firstSelectedElement = useMemo(() => {
    if (selectedElementIds.length > 0) {
      return canvasDoc.elements.find(el => selectedElementIds.includes(el.id));
    }
    return null;
  }, [selectedElementIds, canvasDoc.elements]);

  const [themeState, setThemeState] = useState<CustomThemeConfig>(() => ({
    name: 'Mi Tema Personalizado',
    backgroundColor: firstSelectedElement?.style?.backgroundColor || '#1e293b',
    textColor: firstSelectedElement?.style?.color || '#f8fafc',
    accentColor: '#38bdf8',
    borderColor: firstSelectedElement?.style?.borderColor || '#334155',
    borderWidth: firstSelectedElement?.style?.borderWidth !== undefined ? firstSelectedElement.style.borderWidth : 1,
    borderStyle: firstSelectedElement?.style?.borderStyle || 'solid',
    borderRadius: firstSelectedElement?.style?.borderRadius !== undefined ? firstSelectedElement.style.borderRadius : 8,
    shadow: firstSelectedElement?.style?.shadow || 'md',
    opacity: firstSelectedElement?.style?.opacity !== undefined ? firstSelectedElement.style.opacity : 1,
    canvasBackgroundColor: canvasDoc.backgroundColor || '#0f172a'
  }));

  const [livePreview, setLivePreview] = useState<boolean>(true);
  const [targetScope, setTargetScope] = useState<'selected' | 'all' | 'canvas'>(
    selectedElementIds.length > 0 ? 'selected' : 'all'
  );
  const [savedThemes, setSavedThemes] = useState<CustomThemeConfig[]>([]);
  const [newThemeName, setNewThemeName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize targetScope when selected elements change
  useEffect(() => {
    if (selectedElementIds.length > 0) {
      setTargetScope('selected');
    }
  }, [selectedElementIds.length]);

  // Load saved custom themes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedThemes(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read saved custom themes from localStorage', e);
    }
  }, []);

  // Update themeState when element selection changes and user opens the modal
  useEffect(() => {
    if (isOpen && firstSelectedElement?.style) {
      const st = firstSelectedElement.style;
      setThemeState(prev => ({
        ...prev,
        backgroundColor: st.backgroundColor || prev.backgroundColor,
        textColor: st.color || prev.textColor,
        borderColor: st.borderColor || prev.borderColor,
        borderWidth: st.borderWidth !== undefined ? st.borderWidth : prev.borderWidth,
        borderStyle: st.borderStyle || prev.borderStyle,
        borderRadius: st.borderRadius !== undefined ? st.borderRadius : prev.borderRadius,
        shadow: st.shadow || prev.shadow,
        opacity: st.opacity !== undefined ? st.opacity : prev.opacity,
        canvasBackgroundColor: canvasDoc.backgroundColor || prev.canvasBackgroundColor
      }));
    }
  }, [isOpen, firstSelectedElement]);

  // Save custom themes list
  const persistCustomThemes = (themes: CustomThemeConfig[]) => {
    setSavedThemes(themes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
    } catch (e) {
      console.error('Error saving themes to localStorage', e);
    }
  };

  // Helper to construct style update payload from current themeState
  const getStylePayload = (config: CustomThemeConfig): Partial<ElementStyle> => {
    return {
      backgroundColor: config.backgroundColor,
      color: config.textColor,
      borderColor: config.borderColor,
      borderWidth: config.borderWidth,
      borderStyle: config.borderStyle,
      borderRadius: config.borderRadius,
      shadow: config.shadow,
      opacity: config.opacity
    };
  };

  // Dynamically apply styles to targets
  const applyTheme = (
    config: CustomThemeConfig,
    scope: 'selected' | 'all' | 'canvas' = targetScope
  ) => {
    const styleUpdates = getStylePayload(config);

    if (scope === 'canvas') {
      onChangeCanvasDoc({
        ...canvasDoc,
        backgroundColor: config.canvasBackgroundColor
      });
      return;
    }

    if (scope === 'selected') {
      const targetIds = selectedElementIds.length > 0
        ? selectedElementIds
        : (canvasDoc.elements.length > 0 ? [canvasDoc.elements[0].id] : []);

      if (targetIds.length === 0) return;

      const updatedElements = canvasDoc.elements.map(el => {
        if (targetIds.includes(el.id)) {
          const updatedStyle: ElementStyle = {
            ...el.style,
            ...styleUpdates
          };
          const updatedBinding = { ...el.binding };
          if (el.type === 'chart' && config.accentColor) {
            updatedBinding.chartColors = [
              config.accentColor,
              '#34d399',
              '#fbbf24',
              '#f87171',
              '#a78bfa'
            ];
          }
          return {
            ...el,
            style: updatedStyle,
            binding: updatedBinding
          };
        }
        return el;
      });

      onChangeCanvasDoc({
        ...canvasDoc,
        elements: updatedElements
      });
      return;
    }

    // scope === 'all'
    const updatedElements = canvasDoc.elements.map(el => {
      const updatedStyle: ElementStyle = {
        ...el.style,
        ...styleUpdates
      };
      const updatedBinding = { ...el.binding };
      if (el.type === 'chart' && config.accentColor) {
        updatedBinding.chartColors = [
          config.accentColor,
          '#34d399',
          '#fbbf24',
          '#f87171',
          '#a78bfa'
        ];
      }
      return {
        ...el,
        style: updatedStyle,
        binding: updatedBinding
      };
    });

    onChangeCanvasDoc({
      ...canvasDoc,
      backgroundColor: config.canvasBackgroundColor,
      elements: updatedElements
    });
  };

  // Handle live modification of any property
  const handlePropertyChange = <K extends keyof CustomThemeConfig>(
    key: K,
    value: CustomThemeConfig[K]
  ) => {
    const updated = { ...themeState, [key]: value };
    setThemeState(updated);

    if (livePreview) {
      applyTheme(updated, targetScope);
    }
  };

  // Load a recipe or saved theme
  const handleLoadTheme = (theme: CustomThemeConfig) => {
    setThemeState(theme);
    if (livePreview) {
      applyTheme(theme, targetScope);
    }
  };

  // Save current state as new custom preset
  const handleSaveAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = newThemeName.trim() || `Tema ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newPreset: CustomThemeConfig = {
      ...themeState,
      id: `custom_theme_${Date.now()}`,
      name: nameToSave
    };

    const nextList = [newPreset, ...savedThemes];
    persistCustomThemes(nextList);
    setNewThemeName('');
    setSaveSuccessMsg(`¡Tema "${nameToSave}" guardado correctamente!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Delete saved custom preset
  const handleDeletePreset = (id?: string) => {
    if (!id) return;
    const nextList = savedThemes.filter(t => t.id !== id);
    persistCustomThemes(nextList);
  };

  if (!isOpen) return null;

  const selectedCount = selectedElementIds.length;
  const totalElementsCount = canvasDoc.elements.length;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs transition-all duration-200 animate-in fade-in duration-150 select-none ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div
        className={`bg-[#202225] border border-[#2f3136] shadow-2xl overflow-hidden flex flex-col text-xs text-[#e1e1e6] transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-4xl max-h-[92vh] rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-[#1a1b1e] border-b border-[#2f3136] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/30">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Personalizador de Tema y Estilos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/30">
                  Custom Theme
                </span>
              </div>
              <p className="text-[11px] text-[#9ca3af]">
                Define colores, bordes y estilos personalizados con aplicación dinámica en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live preview switch */}
            <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#25282c] border border-[#373a40] text-[11px] font-medium text-[#cbd5e1] cursor-pointer hover:border-[#5865f2] transition">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(e) => setLivePreview(e.target.checked)}
                className="rounded border-[#373a40] text-[#5865f2] focus:ring-0 bg-[#1a1b1e] cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Sparkles className={`w-3 h-3 ${livePreview ? 'text-[#38bdf8]' : 'text-[#9ca3af]'}`} />
                <span>Aplicar en tiempo real</span>
              </span>
            </label>

            <ModalFullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={() => setIsFullscreen(prev => !prev)}
            />

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#25282c] hover:bg-[#373a40] text-[#9ca3af] hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target Scope Switcher Banner */}
        <div className="px-5 py-2.5 bg-[#25282c]/80 border-b border-[#2f3136] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#9ca3af]">Destino de aplicación:</span>
            <div className="flex items-center bg-[#1a1b1e] p-0.5 rounded-lg border border-[#2f3136]">
              <button
                type="button"
                onClick={() => {
                  setTargetScope('selected');
                  if (livePreview) applyTheme(themeState, 'selected');
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  targetScope === 'selected'
                    ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                    : 'text-[#9ca3af] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {selectedCount > 0
                    ? `Elementos Seleccionados (${selectedCount})`
                    : 'Elementos Seleccionados (0)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetScope('all');
                  if (livePreview) applyTheme(themeState, 'all');
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  targetScope === 'all'
                    ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                    : 'text-[#9ca3af] hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Todos los Elementos ({totalElementsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetScope('canvas');
                  if (livePreview) applyTheme(themeState, 'canvas');
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  targetScope === 'canvas'
                    ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                    : 'text-[#9ca3af] hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Solo Fondo del Lienzo</span>
              </button>
            </div>
          </div>

          {selectedCount === 0 && targetScope === 'selected' && (
            <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Sin selección activa: los cambios se aplicarán al primer elemento o elige "Todos".</span>
            </span>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Custom Theme Color & Border Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. SECCIÓN: COLORES */}
            <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#38bdf8]" />
                  <h4 className="font-bold text-white text-xs">Paleta de Colores Personalizada</h4>
                </div>
                <span className="text-[10px] text-[#9ca3af]">Fondo, Texto y Acento</span>
              </div>

              {/* Color pickers grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Background color */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Fondo de Elemento / Tarjeta
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeState.backgroundColor.startsWith('#') ? themeState.backgroundColor : '#1e293b'}
                      onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#373a40] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeState.backgroundColor}
                      onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-[#141517] border border-[#373a40] rounded font-mono text-xs text-white focus:border-[#5865f2] focus:outline-none"
                      placeholder="#1e293b"
                    />
                  </div>
                </div>

                {/* Text color */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Color de Texto Principal
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeState.textColor.startsWith('#') ? themeState.textColor : '#f8fafc'}
                      onChange={(e) => handlePropertyChange('textColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#373a40] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeState.textColor}
                      onChange={(e) => handlePropertyChange('textColor', e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-[#141517] border border-[#373a40] rounded font-mono text-xs text-white focus:border-[#5865f2] focus:outline-none"
                      placeholder="#f8fafc"
                    />
                  </div>
                </div>

                {/* Primary accent color */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Color de Acento (KPI / Gráficos)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeState.accentColor.startsWith('#') ? themeState.accentColor : '#38bdf8'}
                      onChange={(e) => handlePropertyChange('accentColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#373a40] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeState.accentColor}
                      onChange={(e) => handlePropertyChange('accentColor', e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-[#141517] border border-[#373a40] rounded font-mono text-xs text-white focus:border-[#5865f2] focus:outline-none"
                      placeholder="#38bdf8"
                    />
                  </div>
                </div>

                {/* Canvas background color */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Fondo General del Lienzo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeState.canvasBackgroundColor.startsWith('#') ? themeState.canvasBackgroundColor : '#0f172a'}
                      onChange={(e) => handlePropertyChange('canvasBackgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#373a40] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeState.canvasBackgroundColor}
                      onChange={(e) => handlePropertyChange('canvasBackgroundColor', e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-[#141517] border border-[#373a40] rounded font-mono text-xs text-white focus:border-[#5865f2] focus:outline-none"
                      placeholder="#0f172a"
                    />
                  </div>
                </div>
              </div>

              {/* Quick color swatches palette */}
              <div>
                <label className="text-[10px] font-semibold text-[#9ca3af] block mb-1.5">
                  Muestras Rápidas de Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color, idx) => (
                    <button
                      key={`swatch_quick_${idx}`}
                      type="button"
                      onClick={() => handlePropertyChange('backgroundColor', color)}
                      style={{ backgroundColor: color }}
                      className="w-5 h-5 rounded-md border border-[#373a40] hover:scale-115 transition-transform cursor-pointer shadow-2xs"
                      title={`Aplicar fondo: ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 2. SECCIÓN: BORDES Y ESQUINAS */}
            <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#8b5cf6]" />
                  <h4 className="font-bold text-white text-xs">Bordes, Sombras y Geometría</h4>
                </div>
                <span className="text-[10px] text-[#9ca3af]">Grosor, Estilo y Radio</span>
              </div>

              {/* Border Color and Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Border color */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Color del Borde
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeState.borderColor.startsWith('#') ? themeState.borderColor : '#334155'}
                      onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#373a40] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeState.borderColor}
                      onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-[#141517] border border-[#373a40] rounded font-mono text-xs text-white focus:border-[#5865f2] focus:outline-none"
                      placeholder="#334155"
                    />
                  </div>
                </div>

                {/* Border style */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Estilo de Borde
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['none', 'solid', 'dashed', 'dotted'] as const).map((styleOpt) => (
                      <button
                        key={`bstyle_${styleOpt}`}
                        type="button"
                        onClick={() => handlePropertyChange('borderStyle', styleOpt)}
                        className={`py-1.5 px-1 text-[10px] rounded font-medium capitalize transition cursor-pointer border ${
                          themeState.borderStyle === styleOpt
                            ? 'bg-[#5865f2] text-white border-[#5865f2] font-semibold'
                            : 'bg-[#141517] hover:bg-[#25282c] text-[#9ca3af] border-[#2f3136]'
                        }`}
                      >
                        {styleOpt === 'none' ? 'Ninguno' : styleOpt === 'solid' ? 'Sólido' : styleOpt === 'dashed' ? 'Guiones' : 'Puntos'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Border Width and Radius Sliders / Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Border width */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-[#9ca3af]">Grosor de Borde</span>
                    <span className="font-mono text-white font-bold">{themeState.borderWidth} px</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4, 6].map((w) => (
                      <button
                        key={`bwidth_${w}`}
                        type="button"
                        onClick={() => handlePropertyChange('borderWidth', w)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono transition cursor-pointer border ${
                          themeState.borderWidth === w
                            ? 'bg-[#5865f2] text-white border-[#5865f2] font-bold'
                            : 'bg-[#141517] hover:bg-[#25282c] text-[#9ca3af] border-[#2f3136]'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border radius */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-[#9ca3af]">Radio de Esquinas</span>
                    <span className="font-mono text-white font-bold">{themeState.borderRadius} px</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 4, 8, 12, 16, 24].map((r) => (
                      <button
                        key={`bradius_${r}`}
                        type="button"
                        onClick={() => handlePropertyChange('borderRadius', r)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono transition cursor-pointer border ${
                          themeState.borderRadius === r
                            ? 'bg-[#5865f2] text-white border-[#5865f2] font-bold'
                            : 'bg-[#141517] hover:bg-[#25282c] text-[#9ca3af] border-[#2f3136]'
                        }`}
                      >
                        {r}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shadow and Opacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Shadow */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#9ca3af] block">
                    Sombra / Elevación
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['none', 'sm', 'md', 'lg', 'glow'] as const).map((s) => (
                      <button
                        key={`shadow_${s}`}
                        type="button"
                        onClick={() => handlePropertyChange('shadow', s)}
                        className={`py-1 text-[10px] rounded font-medium uppercase transition cursor-pointer border ${
                          themeState.shadow === s
                            ? 'bg-[#5865f2] text-white border-[#5865f2] font-bold'
                            : 'bg-[#141517] hover:bg-[#25282c] text-[#9ca3af] border-[#2f3136]'
                        }`}
                      >
                        {s === 'none' ? 'No' : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <div className="bg-[#202225] p-2.5 rounded-lg border border-[#2f3136] space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-[#9ca3af]">Opacidad</span>
                    <span className="font-mono text-white font-bold">{Math.round(themeState.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={themeState.opacity}
                    onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#141517] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Card Preview & Saved Themes (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* Live Visual Card Preview */}
            <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-2">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <Sparkles className="w-4 h-4 text-[#f59e0b]" />
                  <span>Vista Previa del Estilo</span>
                </div>
                <span className="text-[10px] text-[#9ca3af] font-mono">
                  {themeState.borderWidth}px • {themeState.borderRadius}px
                </span>
              </div>

              {/* Sample canvas container box */}
              <div
                style={{ backgroundColor: themeState.canvasBackgroundColor }}
                className="p-4 rounded-xl border border-[#2f3136] transition-colors duration-200"
              >
                {/* Sample custom styled card */}
                <div
                  style={{
                    backgroundColor: themeState.backgroundColor,
                    color: themeState.textColor,
                    borderColor: themeState.borderColor,
                    borderWidth: `${themeState.borderWidth}px`,
                    borderStyle: themeState.borderStyle,
                    borderRadius: `${themeState.borderRadius}px`,
                    opacity: themeState.opacity,
                    boxShadow:
                      themeState.shadow === 'glow'
                        ? `0 0 15px ${themeState.accentColor}40`
                        : themeState.shadow === 'xl'
                        ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                        : themeState.shadow === 'lg'
                        ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                        : themeState.shadow === 'md'
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                        : 'none'
                  }}
                  className="p-3.5 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Muestra de Componente</span>
                    <span
                      style={{
                        backgroundColor: `${themeState.accentColor}25`,
                        color: themeState.accentColor,
                        borderColor: `${themeState.accentColor}40`
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border"
                    >
                      KPI Acento
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold tracking-tight">$48,250</span>
                    <span style={{ color: themeState.accentColor }} className="text-[10px] font-semibold">
                      +14.5% vs anterior
                    </span>
                  </div>

                  {/* Mini visual bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] opacity-75">
                      <span>Progreso de objetivo</span>
                      <span>82%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                      <div
                        style={{ backgroundColor: themeState.accentColor }}
                        className="h-full w-[82%] rounded-full transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ready-to-use Aesthetic Theme Recipes */}
            <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-xl p-4 space-y-2.5 flex-1">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-2">
                <span className="font-bold text-white text-xs">Recetas de Estilo Listas</span>
                <span className="text-[10px] text-[#9ca3af] font-mono">{DEFAULT_THEME_RECIPES.length} plantillas</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2f3136] pr-1">
                {DEFAULT_THEME_RECIPES.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleLoadTheme(recipe)}
                    className="p-2 rounded-lg bg-[#202225] hover:bg-[#25282c] border border-[#2f3136] hover:border-[#5865f2] transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center -space-x-1 flex-shrink-0">
                        <span
                          style={{ backgroundColor: recipe.backgroundColor }}
                          className="w-3.5 h-3.5 rounded-full border border-[#2f3136]"
                        />
                        <span
                          style={{ backgroundColor: recipe.accentColor }}
                          className="w-3.5 h-3.5 rounded-full border border-[#2f3136]"
                        />
                        <span
                          style={{ backgroundColor: recipe.borderColor }}
                          className="w-3.5 h-3.5 rounded-full border border-[#2f3136]"
                        />
                      </div>
                      <span className="font-semibold text-xs text-white truncate">{recipe.name}</span>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af]" />
                  </div>
                ))}
              </div>

              {/* Saved Custom Themes Section */}
              {savedThemes.length > 0 && (
                <div className="pt-2 border-t border-[#2f3136] space-y-1.5">
                  <span className="font-bold text-[11px] text-[#9ca3af] block">Tus Temas Guardados</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {savedThemes.map((saved) => (
                      <div
                        key={saved.id}
                        className="p-1.5 rounded-md bg-[#141517] border border-[#2f3136] flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => handleLoadTheme(saved)}
                          className="flex-1 text-left font-medium text-xs text-white hover:text-[#5865f2] truncate cursor-pointer"
                        >
                          {saved.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(saved.id)}
                          className="p-1 text-[#9ca3af] hover:text-red-400 rounded transition cursor-pointer"
                          title="Eliminar tema guardado"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save current custom theme form */}
              <form onSubmit={handleSaveAsPreset} className="pt-2 border-t border-[#2f3136] flex items-center gap-1.5">
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Nombre de tu tema..."
                  className="flex-1 px-2.5 py-1 bg-[#141517] border border-[#2f3136] rounded text-xs text-white focus:border-[#5865f2] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#25282c] hover:bg-[#373a40] text-white border border-[#373a40] rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Save className="w-3 h-3 text-[#5865f2]" />
                  <span>Guardar</span>
                </button>
              </form>

              {saveSuccessMsg && (
                <div className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-300 text-[10px] font-medium animate-fade-in flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-5 py-3 bg-[#1a1b1e] border-t border-[#2f3136] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-[#9ca3af] text-[11px]">
            <span className="font-semibold text-white">Objetivo:</span>
            <span>
              {targetScope === 'selected'
                ? `${selectedCount} elemento(s) seleccionado(s)`
                : targetScope === 'all'
                ? `Todos los ${totalElementsCount} elementos`
                : 'Fondo del lienzo'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const cleanState: CustomThemeConfig = {
                  name: 'Por defecto',
                  backgroundColor: '#ffffff',
                  textColor: '#0f172a',
                  accentColor: '#3b82f6',
                  borderColor: '#e2e8f0',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderRadius: 8,
                  shadow: 'sm',
                  opacity: 1,
                  canvasBackgroundColor: '#f8fafc'
                };
                setThemeState(cleanState);
                if (livePreview) applyTheme(cleanState, targetScope);
              }}
              className="px-3 py-1.5 bg-[#25282c] hover:bg-[#373a40] text-[#9ca3af] hover:text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                applyTheme(themeState, targetScope);
                onClose();
              }}
              className="px-4 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-white rounded-lg text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar y Cerrar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
