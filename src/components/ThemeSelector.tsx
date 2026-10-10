import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, Moon, Sun, Layers, HelpCircle, ChevronDown, Paintbrush, Eye, ShieldCheck } from 'lucide-react';
import { THEME_PALETTES, ThemePalette, getThemeById, findThemeByBackground, isColorDark } from '../utils/themePresets';

interface ThemeSelectorProps {
  currentThemeId?: string;
  canvasBackgroundColor?: string;
  highContrastMode?: boolean;
  onApplyTheme: (themeId: string, updateExistingElements: boolean) => void;
  onToggleHighContrastMode?: (enabled: boolean) => void;
  onCustomBackgroundChange?: (color: string) => void;
  onOpenCustomTheme?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentThemeId,
  canvasBackgroundColor,
  highContrastMode = false,
  onApplyTheme,
  onToggleHighContrastMode,
  onCustomBackgroundChange,
  onOpenCustomTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Dark' | 'Light' | 'High Contrast'>('All');
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Identify active theme either by explicit ID or by matching canvas background
  const activeTheme: ThemePalette = currentThemeId
    ? getThemeById(currentThemeId)
    : findThemeByBackground(canvasBackgroundColor);

  const isCurrentThemeHighContrast = activeTheme.isHighContrast || activeTheme.category === 'High Contrast' || highContrastMode;

  // Update coords when toggled open
  const handleToggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 336 : 400;
      const estimatedHeight = 490;
      let left = rect.left;
      if (typeof window !== 'undefined') {
        if (left + menuWidth > window.innerWidth - 12) {
          left = window.innerWidth - menuWidth - 12;
        }
        if (left < 12) left = 12;
      }

      let top = rect.bottom + 6;
      if (typeof window !== 'undefined' && rect.bottom + estimatedHeight > window.innerHeight - 10) {
        // Open upwards above trigger
        top = Math.max(10, rect.top - estimatedHeight - 6);
      }
      setMenuCoords({ top, left });
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTheme = (themeId: string) => {
    const selected = getThemeById(themeId);
    onApplyTheme(themeId, updateExisting);
    if (selected.isHighContrast && onToggleHighContrastMode) {
      onToggleHighContrastMode(true);
    }
    setIsOpen(false);
  };

  const handleToggleHighContrast = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    if (onToggleHighContrastMode) {
      onToggleHighContrastMode(enabled);
    }
    if (enabled) {
      // If turning on, switch to matching high-contrast theme
      const isDark = isColorDark(canvasBackgroundColor || activeTheme.canvasBackground);
      const targetHcTheme = isDark ? 'high-contrast-dark' : 'high-contrast-light';
      onApplyTheme(targetHcTheme, updateExisting);
    } else {
      // If turning off and on high contrast theme, return to standard
      if (activeTheme.isHighContrast) {
        const fallbackTheme = activeTheme.id === 'high-contrast-dark' ? 'midnight' : 'light';
        onApplyTheme(fallbackTheme, updateExisting);
      }
    }
  };

  const filteredThemes = THEME_PALETTES.filter(theme => {
    if (categoryFilter === 'All') return true;
    return theme.category === categoryFilter;
  });

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      {/* Navbar Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition cursor-pointer select-none ${
          isOpen
            ? 'bg-[#5865f2] text-white border-[#5865f2] shadow-sm'
            : isCurrentThemeHighContrast
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#e1e1e6] border-[#2f3136]'
        }`}
        title="Seleccionar tema visual del lienzo, paleta de colores y modo de alto contraste"
      >
        <Palette className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : isCurrentThemeHighContrast ? 'text-amber-400' : 'text-[#5865f2]'}`} />
        
        {/* Active Theme Mini Preview */}
        <div className="flex items-center gap-1.5">
          <span className="truncate max-w-[90px]">{activeTheme.name}</span>
          <div className="flex items-center -space-x-1">
            {activeTheme.previewColors.slice(0, 3).map((c, i) => (
              <span
                key={`dot_${activeTheme.id}_${i}`}
                className="w-2.5 h-2.5 rounded-full border border-[#2f3136] shadow-2xs"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {isCurrentThemeHighContrast && (
            <span className="text-[9px] px-1 py-0.2 bg-amber-400 text-black font-bold rounded">
              HC
            </span>
          )}
        </div>

        <ChevronDown className={`w-3 h-3 text-[#9ca3af] transition-transform ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {/* Floating Theme Selector Dropdown Menu */}
      {isOpen && menuCoords && (
        <div
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`
          }}
          className="w-84 sm:w-100 bg-[#202225] border border-[#2f3136] rounded-xl shadow-2xl z-[9999] overflow-hidden text-xs text-[#e1e1e6] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#1a1b1e] border-b border-[#2f3136] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#5865f2]/20 text-[#5865f2]">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-white block">Paletas de Tema & Accesibilidad</span>
                <span className="text-[10px] text-[#9ca3af]">Aplica fondo, contraste y armonía de color al lienzo</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#9ca3af] hover:text-white p-1 rounded hover:bg-[#25282c] transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* High Contrast Mode Accessibility Switch Bar */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 via-[#25282c] to-amber-500/10 border-b border-[#2f3136] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${highContrastMode || isCurrentThemeHighContrast ? 'bg-amber-500 text-black' : 'bg-[#1a1b1e] text-[#9ca3af] border border-[#2f3136]'}`}>
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-[11px]">Modo de Contraste Alto</span>
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[9px] font-mono font-bold border border-amber-500/30">
                    WCAG AAA
                  </span>
                </div>
                <span className="text-[10px] text-[#9ca3af] block leading-tight">
                  Maximiza la legibilidad visual y bordes del editor
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highContrastMode || isCurrentThemeHighContrast}
                onChange={handleToggleHighContrast}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1a1b1e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 border border-[#373a40]"></div>
            </label>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-1.5 bg-[#1a1b1e]/60 border-b border-[#2f3136] flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            {(['All', 'Dark', 'Light', 'High Contrast'] as const).map((cat) => (
              <button
                key={`cat_filter_${cat}`}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer flex-shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[#5865f2] text-white shadow-xs'
                    : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136]'
                }`}
              >
                {cat === 'All' ? 'Todos' : cat === 'Dark' ? 'Oscuros' : cat === 'Light' ? 'Claros' : 'Alto Contraste'}
              </button>
            ))}
          </div>

          {/* Option: Update existing elements */}
          <div className="px-3.5 py-1.5 bg-[#25282c]/40 border-b border-[#2f3136] flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] text-[#cbd5e1] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="rounded border-[#373a40] text-[#5865f2] focus:ring-0 focus:ring-offset-0 bg-[#1a1b1e] cursor-pointer"
              />
              <span>Actualizar elementos existentes en lienzo</span>
            </label>
            <span className="text-[10px] text-[#9ca3af] font-mono">
              {updateExisting ? 'Global' : 'Solo fondo'}
            </span>
          </div>

          {/* Themes List / Grid */}
          <div className="p-2.5 max-h-72 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-[#2f3136]">
            {filteredThemes.map((theme) => {
              const isSelected = activeTheme.id === theme.id;
              const isHC = theme.isHighContrast;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? isHC
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400/40'
                        : 'bg-[#5865f2]/15 border-[#5865f2] text-white shadow-xs'
                      : isHC
                      ? 'bg-[#1a1b1e] hover:bg-[#25282c] border-amber-500/30 text-[#e1e1e6] hover:border-amber-400/60'
                      : 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136] text-[#e1e1e6] hover:border-[#373a40]'
                  }`}
                >
                  {/* Left info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-white group-hover:text-white truncate">
                        {theme.name}
                      </span>
                      {isHC ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase flex items-center gap-1 bg-amber-500 text-black">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>WCAG AAA</span>
                        </span>
                      ) : (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase flex items-center gap-1 ${
                            theme.category === 'Dark'
                              ? 'bg-[#2f3136] text-[#939db8] border border-[#373a40]'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}
                        >
                          {theme.category === 'Dark' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                          <span>{theme.category}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#9ca3af] line-clamp-1 leading-tight">
                      {theme.description}
                    </p>
                  </div>

                  {/* Swatch palette bars */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className={`flex items-center gap-0.5 p-1 rounded-md border ${isHC ? 'bg-black border-amber-400/40' : 'bg-[#0f1012] border-[#2f3136]'}`}>
                      {theme.previewColors.map((color, idx) => (
                        <div
                          key={`swatch_${theme.id}_${idx}`}
                          style={{ backgroundColor: color }}
                          className={`w-3.5 h-6 rounded-xs first:rounded-l last:rounded-r shadow-2xs ${isHC ? 'border border-white/20' : ''}`}
                          title={color}
                        />
                      ))}
                    </div>

                    {/* Active check icon */}
                    <div className="w-5 flex justify-center">
                      {isSelected && (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isHC ? 'bg-amber-400 text-black' : 'bg-[#5865f2] text-white'}`}>
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Theme Action Row */}
          {onOpenCustomTheme && (
            <div className="px-2.5 py-1.5 bg-[#18191c] border-t border-[#2f3136]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomTheme();
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-[#5865f2]/15 hover:bg-[#5865f2]/25 border border-[#5865f2]/40 text-[#5865f2] hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Personalizar Colores y Bordes (Custom Theme)</span>
              </button>
            </div>
          )}

          {/* Footer note */}
          <div className="px-3.5 py-2 bg-[#1a1b1e] border-t border-[#2f3136] flex items-center justify-between text-[10px] text-[#9ca3af]">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#5865f2]" />
              <span>Los nuevos controles usarán la paleta activa</span>
            </div>
            <span className="font-mono">{THEME_PALETTES.length} temas</span>
          </div>
        </div>
      )}
    </div>
  );
};

