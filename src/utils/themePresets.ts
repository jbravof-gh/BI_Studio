import { CanvasDocument, CanvasElement, ControlType, ElementStyle } from '../types';

export interface ThemePalette {
  id: string;
  name: string;
  category: 'Dark' | 'Light' | 'High Contrast';
  isHighContrast?: boolean;
  description: string;
  canvasBackground: string;
  previewColors: string[]; // 4-5 key hex swatches
  elementDefaults: {
    textPrimary: string;
    textSecondary: string;
    cardBg: string;
    cardBorder: string;
    accentPrimary: string;
    accentSecondary: string;
    chartColors: string[];
    tableHeaderBg: string;
    tableHeaderText: string;
    tableRowAltBg: string;
    kpiBadgeBg: string;
    kpiBadgeText: string;
    dividerColor: string;
  };
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'Dark',
    description: 'Modo oscuro profundo estilo Obsidian con acentos cyan y menta',
    canvasBackground: '#0f172a',
    previewColors: ['#0f172a', '#1e293b', '#38bdf8', '#34d399', '#f8fafc'],
    elementDefaults: {
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      cardBg: '#1e293b',
      cardBorder: '#334155',
      accentPrimary: '#38bdf8',
      accentSecondary: '#34d399',
      chartColors: ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'],
      tableHeaderBg: '#334155',
      tableHeaderText: '#f8fafc',
      tableRowAltBg: '#1e293b',
      kpiBadgeBg: 'rgba(56, 189, 248, 0.15)',
      kpiBadgeText: '#38bdf8',
      dividerColor: '#334155'
    }
  },
  {
    id: 'light',
    name: 'Light Slate',
    category: 'Light',
    description: 'Paleta limpia de alta claridad con acentos azul y esmeralda',
    canvasBackground: '#ffffff',
    previewColors: ['#ffffff', '#f8fafc', '#3b82f6', '#10b981', '#0f172a'],
    elementDefaults: {
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      accentPrimary: '#3b82f6',
      accentSecondary: '#10b981',
      chartColors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
      tableHeaderBg: '#f1f5f9',
      tableHeaderText: '#334155',
      tableRowAltBg: '#f8fafc',
      kpiBadgeBg: 'rgba(59, 130, 246, 0.12)',
      kpiBadgeText: '#2563eb',
      dividerColor: '#e2e8f0'
    }
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    category: 'Dark',
    description: 'Paleta solarized de ingeniería de alta legibilidad y contraste óptico',
    canvasBackground: '#002b36',
    previewColors: ['#002b36', '#073642', '#268bd2', '#2aa198', '#93a1a1'],
    elementDefaults: {
      textPrimary: '#fdf6e3',
      textSecondary: '#93a1a1',
      cardBg: '#073642',
      cardBorder: '#586e75',
      accentPrimary: '#268bd2',
      accentSecondary: '#2aa198',
      chartColors: ['#268bd2', '#2aa198', '#b58900', '#cb4b16', '#d33682', '#6c71c4'],
      tableHeaderBg: '#073642',
      tableHeaderText: '#eee8d5',
      tableRowAltBg: '#002b36',
      kpiBadgeBg: 'rgba(38, 139, 210, 0.2)',
      kpiBadgeText: '#268bd2',
      dividerColor: '#586e75'
    }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    category: 'Light',
    description: 'Tono cálido pergamino solarized descansado para la vista',
    canvasBackground: '#fdf6e3',
    previewColors: ['#fdf6e3', '#eee8d5', '#b58900', '#2aa198', '#073642'],
    elementDefaults: {
      textPrimary: '#073642',
      textSecondary: '#657b83',
      cardBg: '#eee8d5',
      cardBorder: '#93a1a1',
      accentPrimary: '#b58900',
      accentSecondary: '#2aa198',
      chartColors: ['#b58900', '#2aa198', '#268bd2', '#cb4b16', '#6c71c4', '#859900'],
      tableHeaderBg: '#eee8d5',
      tableHeaderText: '#073642',
      tableRowAltBg: '#fdf6e3',
      kpiBadgeBg: 'rgba(181, 137, 0, 0.18)',
      kpiBadgeText: '#b58900',
      dividerColor: '#93a1a1'
    }
  },
  {
    id: 'nord',
    name: 'Nordic Frost',
    category: 'Dark',
    description: 'Estética ártica escandinava con tonos azul escarcha y verde aurora',
    canvasBackground: '#2e3440',
    previewColors: ['#2e3440', '#3b4252', '#88c0d0', '#a3be8c', '#eceff4'],
    elementDefaults: {
      textPrimary: '#eceff4',
      textSecondary: '#d8dee9',
      cardBg: '#3b4252',
      cardBorder: '#4c566a',
      accentPrimary: '#88c0d0',
      accentSecondary: '#a3be8c',
      chartColors: ['#88c0d0', '#81a1c1', '#a3be8c', '#ebcb8b', '#bf616a', '#b48ead'],
      tableHeaderBg: '#434c5e',
      tableHeaderText: '#eceff4',
      tableRowAltBg: '#3b4252',
      kpiBadgeBg: 'rgba(136, 192, 208, 0.2)',
      kpiBadgeText: '#88c0d0',
      dividerColor: '#4c566a'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    category: 'Dark',
    description: 'Estilo botánico y fintech en verde esmeralda profundo con oro',
    canvasBackground: '#064e3b',
    previewColors: ['#064e3b', '#065f46', '#10b981', '#34d399', '#ecfdf5'],
    elementDefaults: {
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
      cardBg: '#065f46',
      cardBorder: '#047857',
      accentPrimary: '#10b981',
      accentSecondary: '#34d399',
      chartColors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#38bdf8', '#a78bfa'],
      tableHeaderBg: '#047857',
      tableHeaderText: '#ecfdf5',
      tableRowAltBg: '#065f46',
      kpiBadgeBg: 'rgba(16, 185, 129, 0.25)',
      kpiBadgeText: '#6ee7b7',
      dividerColor: '#047857'
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'Dark',
    description: 'Contraste synthwave futurista con tonos magenta neón y cian brillante',
    canvasBackground: '#12072b',
    previewColors: ['#12072b', '#1e1145', '#f43f5e', '#06b6d4', '#fdf4ff'],
    elementDefaults: {
      textPrimary: '#fdf4ff',
      textSecondary: '#e879f9',
      cardBg: '#1e1145',
      cardBorder: '#701a75',
      accentPrimary: '#f43f5e',
      accentSecondary: '#06b6d4',
      chartColors: ['#f43f5e', '#06b6d4', '#a855f7', '#facc15', '#4ade80', '#fb923c'],
      tableHeaderBg: '#2e1065',
      tableHeaderText: '#fae8ff',
      tableRowAltBg: '#1e1145',
      kpiBadgeBg: 'rgba(244, 63, 94, 0.22)',
      kpiBadgeText: '#f43f5e',
      dividerColor: '#701a75'
    }
  },
  {
    id: 'high-contrast-dark',
    name: 'Alto Contraste Oscuro',
    category: 'High Contrast',
    isHighContrast: true,
    description: 'Accesibilidad visual máxima: negro puro #000000, bordes blancos nítidos y texto ultra-legible',
    canvasBackground: '#000000',
    previewColors: ['#000000', '#0a0a0a', '#ffffff', '#ffff00', '#00ffff'],
    elementDefaults: {
      textPrimary: '#ffffff',
      textSecondary: '#ffff00',
      cardBg: '#0a0a0a',
      cardBorder: '#ffffff',
      accentPrimary: '#ffff00',
      accentSecondary: '#00ffff',
      chartColors: ['#ffff00', '#00ffff', '#ff3366', '#33ff33', '#ff9900', '#ffffff'],
      tableHeaderBg: '#1f1f1f',
      tableHeaderText: '#ffffff',
      tableRowAltBg: '#000000',
      kpiBadgeBg: '#ffff00',
      kpiBadgeText: '#000000',
      dividerColor: '#ffffff'
    }
  },
  {
    id: 'high-contrast-light',
    name: 'Alto Contraste Claro',
    category: 'High Contrast',
    isHighContrast: true,
    description: 'Accesibilidad visual máxima: blanco puro #ffffff, bordes negros gruesos y tipografía de alto contraste',
    canvasBackground: '#ffffff',
    previewColors: ['#ffffff', '#f4f4f5', '#000000', '#0000cc', '#cc0000'],
    elementDefaults: {
      textPrimary: '#000000',
      textSecondary: '#18181b',
      cardBg: '#ffffff',
      cardBorder: '#000000',
      accentPrimary: '#0000cc',
      accentSecondary: '#cc0000',
      chartColors: ['#0000cc', '#cc0000', '#008800', '#ff6600', '#660099', '#000000'],
      tableHeaderBg: '#e4e4e7',
      tableHeaderText: '#000000',
      tableRowAltBg: '#fafafa',
      kpiBadgeBg: '#000000',
      kpiBadgeText: '#ffffff',
      dividerColor: '#000000'
    }
  }
];

export const getThemeById = (themeId?: string): ThemePalette => {
  if (!themeId) return THEME_PALETTES[1]; // Default to light if none specified
  return THEME_PALETTES.find(t => t.id === themeId) || THEME_PALETTES[1];
};

export const findThemeByBackground = (bgHex?: string): ThemePalette => {
  if (!bgHex) return THEME_PALETTES[1];
  const normalized = bgHex.toLowerCase().trim();
  const match = THEME_PALETTES.find(t => t.canvasBackground.toLowerCase() === normalized);
  return match || THEME_PALETTES[1];
};

/**
 * Determines if a color (hex or rgb) is considered dark for contrast calculations
 */
export const isColorDark = (colorStr?: string): boolean => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'none') return false;
  const hex = colorStr.trim().toLowerCase();
  if (hex.startsWith('#')) {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
  }
  if (hex.startsWith('rgb')) {
    const parts = hex.match(/\d+/g);
    if (parts && parts.length >= 3) {
      const r = parseInt(parts[0], 10);
      const g = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 128;
    }
  }
  return false;
};

/**
 * Transforms an existing element's styling to match a target theme palette
 */
export const applyThemeToElement = (element: CanvasElement, theme: ThemePalette): CanvasElement => {
  const defaults = theme.elementDefaults;
  const isDarkTheme = theme.category === 'Dark';

  const updatedStyle: ElementStyle = {
    ...element.style
  };

  if (theme.isHighContrast) {
    updatedStyle.borderWidth = Math.max(2, updatedStyle.borderWidth || 2);
  }

  const updatedBinding = {
    ...element.binding
  };

  switch (element.type) {
    case 'text':
      // Update text color
      updatedStyle.color = defaults.textPrimary;
      break;

    case 'kpi':
    case 'card':
    case 'detailCard':
    case 'form':
    case 'drilldown':
    case 'matrix':
    case 'minibrowser':
      // Update container background & border
      updatedStyle.backgroundColor = defaults.cardBg;
      updatedStyle.borderColor = defaults.cardBorder;
      if (updatedStyle.color) {
        updatedStyle.color = defaults.textPrimary;
      }
      break;

    case 'table':
      updatedStyle.backgroundColor = defaults.cardBg;
      updatedStyle.borderColor = defaults.cardBorder;
      break;

    case 'chart':
      updatedStyle.backgroundColor = defaults.cardBg;
      updatedStyle.borderColor = defaults.cardBorder;
      // Also update chart color sequence if present
      updatedBinding.chartColors = [...defaults.chartColors];
      break;

    case 'container':
      // If container had a background, adapt it to the card/container bg of theme
      if (updatedStyle.backgroundColor && updatedStyle.backgroundColor !== 'transparent') {
        updatedStyle.backgroundColor = defaults.cardBg;
      }
      if (updatedStyle.borderColor) {
        updatedStyle.borderColor = defaults.cardBorder;
      }
      break;

    case 'divider':
      updatedStyle.borderColor = defaults.dividerColor;
      break;

    case 'qrcode':
      updatedStyle.backgroundColor = defaults.cardBg;
      updatedStyle.borderColor = defaults.cardBorder;
      break;

    case 'badge':
      // Keep badge variant or style
      break;

    default:
      if (updatedStyle.backgroundColor && updatedStyle.backgroundColor !== 'transparent') {
        updatedStyle.backgroundColor = defaults.cardBg;
      }
      if (updatedStyle.borderColor) {
        updatedStyle.borderColor = defaults.cardBorder;
      }
      break;
  }

  return {
    ...element,
    style: updatedStyle,
    binding: updatedBinding
  };
};

/**
 * Applies a theme to a CanvasDocument: sets themeId, backgroundColor, and optionally
 * adapts all existing elements to the theme palette.
 */
export const applyThemeToDocument = (
  doc: CanvasDocument,
  themeId: string,
  updateExistingElements: boolean = true
): CanvasDocument => {
  const theme = getThemeById(themeId);
  const updatedElements = updateExistingElements
    ? doc.elements.map(el => applyThemeToElement(el, theme))
    : doc.elements;

  // Also update pages elements if multi-page structure is present
  const updatedPages = doc.pages
    ? doc.pages.map(page => ({
        ...page,
        backgroundColor: theme.canvasBackground,
        elements: updateExistingElements
          ? page.elements.map(el => applyThemeToElement(el, theme))
          : page.elements
      }))
    : undefined;

  return {
    ...doc,
    themeId: theme.id,
    backgroundColor: theme.canvasBackground,
    highContrastMode: theme.isHighContrast ? true : doc.highContrastMode,
    elements: updatedElements,
    pages: updatedPages,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Returns default preset styles for a new control based on the active theme
 */
export const getThemeDefaultControlProps = (
  type: ControlType,
  theme: ThemePalette
): { style?: Partial<ElementStyle>; binding?: Partial<CanvasElement['binding']> } => {
  const defaults = theme.elementDefaults;

  switch (type) {
    case 'text':
      return {
        style: {
          color: defaults.textPrimary
        }
      };

    case 'kpi':
    case 'card':
    case 'container':
    case 'drilldown':
    case 'detailCard':
    case 'matrix':
    case 'form':
    case 'minibrowser':
      return {
        style: {
          backgroundColor: defaults.cardBg,
          borderColor: defaults.cardBorder,
          color: defaults.textPrimary
        }
      };

    case 'table':
      return {
        style: {
          backgroundColor: defaults.cardBg,
          borderColor: defaults.cardBorder
        }
      };

    case 'chart':
      return {
        style: {
          backgroundColor: defaults.cardBg,
          borderColor: defaults.cardBorder
        },
        binding: {
          chartColors: [...defaults.chartColors]
        }
      };

    case 'divider':
      return {
        style: {
          borderColor: defaults.dividerColor
        }
      };

    case 'qrcode':
      return {
        style: {
          backgroundColor: defaults.cardBg,
          borderColor: defaults.cardBorder
        }
      };

    default:
      return {};
  }
};
