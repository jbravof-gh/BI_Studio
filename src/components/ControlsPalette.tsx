import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ControlType, CanvasElement } from '../types';
import { 
  Type, 
  Heading1, 
  TrendingUp, 
  Table as TableIcon, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Image as ImageIcon, 
  QrCode, 
  Tag, 
  Square, 
  Minus, 
  Layers,
  Sparkles,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  GitFork,
  Contact,
  Grid3X3,
  ClipboardList,
  Star,
  Filter,
  CheckSquare,
  Globe,
  TableProperties,
  Database,
  ChevronDown,
  ChevronRight,
  Spline,
  Plus,
  Info,
  Settings2,
  X,
  SlidersHorizontal,
  Columns2,
  Rows2,
  Grid2x2
} from 'lucide-react';

export type TabCategoryId = 'all' | 'charts' | 'data' | 'layout' | 'inputs' | 'favorites';

export interface ControlConfigHighlight {
  label: string;
  value: string;
}

export interface PresetControl {
  type: ControlType;
  title: string;
  tabCategory: 'charts' | 'data' | 'layout' | 'inputs';
  categoryTitle: string;
  description: string;
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultProps: Partial<CanvasElement>;
  configHighlights: ControlConfigHighlight[];
}

export const PRESET_CONTROLS: PresetControl[] = [
  // ==========================================
  // CATEGORÍA: CHARTS (GRÁFICOS)
  // ==========================================
  {
    type: 'chart',
    title: 'Gráfico de Barras',
    tabCategory: 'charts',
    categoryTitle: 'Gráficos & Visualización',
    description: 'Comparativa de datos por categoría o producto en barras horizontales o verticales.',
    purpose: 'Ideal para contrastar valores numéricos discretos entre diferentes dimensiones o categorías (ventas por producto, ingresos por sucursal).',
    icon: BarChart3,
    defaultProps: {
      type: 'chart',
      name: 'Gráfico de Barras',
      width: 360,
      height: 220,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadow: 'sm'
      },
      binding: {
        chartType: 'bar',
        template: 'Resumen por Categoría',
        limit: 5
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '360 × 220 px' },
      { label: 'Tipo Gráfico', value: 'Barras (Bar Chart)' },
      { label: 'Límite Inicial', value: '5 categorías' },
      { label: 'Ejes', value: 'Eje X (etiquetas) · Eje Y (métricas)' },
      { label: 'Estilo', value: 'Borde 12px · Sombra suave' }
    ]
  },
  {
    type: 'chart',
    title: 'Gráfico Circular (Pie)',
    tabCategory: 'charts',
    categoryTitle: 'Gráficos & Visualización',
    description: 'Distribución porcentual y proporcional de métricas respecto a un total.',
    purpose: 'Muestra visualmente la cuota de mercado, distribución presupuestaria o desglose de estados donde la suma representa el 100%.',
    icon: PieChart,
    defaultProps: {
      type: 'chart',
      name: 'Gráfico Circular',
      width: 320,
      height: 200,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadow: 'sm'
      },
      binding: {
        chartType: 'pie',
        template: 'Distribución',
        limit: 4
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '320 × 200 px' },
      { label: 'Tipo Gráfico', value: 'Circular (Pie / Donut)' },
      { label: 'Límite Segmentos', value: '4 sectores principales' },
      { label: 'Etiquetas', value: 'Porcentajes relativos' },
      { label: 'Estilo', value: 'Tarjeta redondeada blanca' }
    ]
  },
  {
    type: 'chart',
    title: 'Gráfico de Líneas',
    tabCategory: 'charts',
    categoryTitle: 'Gráficos & Visualización',
    description: 'Tendencias continuas o evolución cronológica de magnitudes a lo largo del tiempo.',
    purpose: 'Excelente para identificar patrones de crecimiento, variaciones estacionales o trayectorias de métricas acumulativas.',
    icon: LineChart,
    defaultProps: {
      type: 'chart',
      name: 'Gráfico de Líneas',
      width: 360,
      height: 200,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadow: 'sm'
      },
      binding: {
        chartType: 'line',
        template: 'Evolución Histórica',
        limit: 6
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '360 × 200 px' },
      { label: 'Tipo Gráfico', value: 'Línea de evolución' },
      { label: 'Límite Puntos', value: '6 puntos temporales' },
      { label: 'Interconexión', value: 'Línea continua con nodos' },
      { label: 'Estilo', value: 'Fondo blanco · Borde #e2e8f0' }
    ]
  },
  {
    type: 'chart',
    title: 'Series',
    tabCategory: 'charts',
    categoryTitle: 'Gráficos & Visualización',
    description: 'Series temporales en el eje X, métrica en Y y división en series por valores únicos de un campo.',
    purpose: 'Visualiza simultáneamente múltiples líneas de tendencia temporal comparando sub-categorías (ej. ventas por mes divididas por método de pago).',
    icon: Spline,
    defaultProps: {
      type: 'chart',
      name: 'Series',
      width: 440,
      height: 240,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadow: 'sm'
      },
      binding: {
        chartType: 'series',
        template: 'Series Temporales',
        timeField: 'fecha',
        valueField: 'total',
        seriesField: 'metodoPago',
        seriesAggregation: 'sum',
        showSeriesLegend: true,
        showSeriesPoints: true,
        seriesCurve: 'monotone',
        timeSortOrder: 'asc',
        limit: 15
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '440 × 240 px' },
      { label: 'Modo Eje X', value: 'Temporal (fecha / timestamp)' },
      { label: 'Modo Eje Y', value: 'Numérico (total / monto / cantidad)' },
      { label: 'Multi-Serie', value: 'Dinámica por valores de campo' },
      { label: 'Agregación', value: 'SUM (Suma acumulada)' },
      { label: 'Curvatura', value: 'Bézier Suave (Monotone)' }
    ]
  },

  // ==========================================
  // CATEGORÍA: DATA (DATOS & TABLAS)
  // ==========================================
  {
    type: 'kpi',
    title: 'Tarjeta KPI',
    tabCategory: 'data',
    categoryTitle: 'Métricas & Tablas',
    description: 'Métrica agregada destacada con cálculo numérico (Suma, Promedio, Conteo).',
    purpose: 'Resalta cifras clave de negocio de forma rápida e intuitiva al inicio de informes y dashboards para lectura ejecutiva instantánea.',
    icon: TrendingUp,
    defaultProps: {
      type: 'kpi',
      name: 'Tarjeta Métrica KPI',
      width: 240,
      height: 100,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        shadow: 'sm'
      },
      binding: {
        aggregation: 'count',
        template: 'Total Registros',
        prefix: '',
        suffix: ' uds'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '240 × 100 px' },
      { label: 'Agregación', value: 'COUNT (Total de registros)' },
      { label: 'Sufijo Unidades', value: '" uds"' },
      { label: 'Formato', value: 'Número en negrita + Título' },
      { label: 'Estilo', value: 'Borde 12px · Sombra suave' }
    ]
  },
  {
    type: 'table',
    title: 'Tabla de Datos (Límite Fijo)',
    tabCategory: 'data',
    categoryTitle: 'Métricas & Tablas',
    description: 'Muestra las primeras N filas fijas de una tabla en cuadrícula organizada.',
    purpose: 'Adecuada para resúmenes de "últimas 5 transacciones", "top 10 productos" o listados rápidos que no requieren paginación extensa.',
    icon: TableIcon,
    defaultProps: {
      type: 'table',
      name: 'Tabla de Registros',
      width: 440,
      height: 220,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        shadow: 'sm',
        fontSize: 12
      },
      binding: {
        paginationMode: 'limit',
        limit: 6,
        template: 'Listado Fijo'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '440 × 220 px' },
      { label: 'Paginación', value: 'Límite fijo (6 filas)' },
      { label: 'Encabezados', value: 'Automáticos por tabla enlazada' },
      { label: 'Tipografía', value: '12px compacta y legible' },
      { label: 'Estilo', value: 'Filas con contraste alterno' }
    ]
  },
  {
    type: 'table',
    title: 'Tabla Paginada con Navegación',
    tabCategory: 'data',
    categoryTitle: 'Métricas & Tablas',
    description: 'Barra de navegación interactiva con límite de registros por página y botones de avance.',
    purpose: 'Permite explorar conjuntos medianos o grandes de registros con controles de página siguiente/anterior, conteo de páginas y selector de tamaño.',
    icon: Layers,
    defaultProps: {
      type: 'table',
      name: 'Tabla Paginada',
      width: 460,
      height: 250,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        shadow: 'sm',
        fontSize: 12
      },
      binding: {
        paginationMode: 'paginated',
        pageSize: 5,
        showPaginationControls: true,
        paginationStyle: 'full',
        template: 'Listado Paginado'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '460 × 250 px' },
      { label: 'Paginación', value: 'Modo Completo (Full)' },
      { label: 'Tamaño Página', value: '5 filas por página' },
      { label: 'Controles', value: 'Botones [ < ] [ > ] y números' },
      { label: 'Pie de Tabla', value: 'Indicador "Página X de Y"' }
    ]
  },
  {
    type: 'queryTable',
    title: 'QueryTable',
    tabCategory: 'data',
    categoryTitle: 'Métricas & Tablas',
    description: 'Diseña, guarda y ejecuta queries SQL con parámetros y genera una nueva tabla en BD.',
    purpose: 'Para consultas avanzadas en base de datos con filtros condicionales SQL (ej. WHERE total >= :minTotal) y guardado reutilizable.',
    icon: TableProperties,
    defaultProps: {
      type: 'queryTable',
      name: 'QueryTable',
      width: 580,
      height: 340,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 0,
        shadow: 'sm'
      },
      binding: {
        template: 'Consulta con Parámetros',
        querySql: 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50',
        queryParams: [
          {
            name: 'minTotal',
            type: 'number',
            label: 'Total Mínimo',
            defaultValue: 50,
            currentValue: 50,
            description: 'Filtra registros con total mayor o igual'
          }
        ],
        savedQueries: [
          {
            id: 'sq_ventas_altas',
            name: 'Ventas Mayores a Umbral',
            querySql: 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50',
            description: 'Ventas que superan el valor mínimo configurado',
            params: [
              { name: 'minTotal', type: 'number', label: 'Total Mínimo', defaultValue: 50, currentValue: 50 }
            ]
          }
        ],
        autoRunQuery: true,
        destinationTableName: 'tabla_consulta_ventas'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '580 × 340 px' },
      { label: 'Motor SQL', value: 'Consultas SQLite / Dexie' },
      { label: 'Parámetros', value: 'Dinámicos con inputs (:param)' },
      { label: 'Auto-Run', value: 'Ejecución reactiva activada' },
      { label: 'Exportación', value: 'Crea tabla resultante en BD' }
    ]
  },
  {
    type: 'matrix',
    title: 'Matriz',
    tabCategory: 'data',
    categoryTitle: 'Externos',
    description: 'Tabla cruzada bidimensional (Filas vs Columnas) con totales y mapa térmico.',
    purpose: 'Cruza dos dimensiones categóricas distintas con una métrica numérica agregada, similar a una tabla dinámica de hoja de cálculo.',
    icon: Grid3X3,
    defaultProps: {
      type: 'matrix',
      name: 'Matriz Bidimensional',
      width: 440,
      height: 240,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        shadow: 'sm',
        fontSize: 12
      },
      binding: {
        template: 'Matriz Comparativa',
        aggregation: 'sum',
        rowField: 'categoria',
        colField: 'ciudad',
        valueField: 'precio'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '440 × 240 px' },
      { label: 'Filas (Eje Y)', value: 'categoria' },
      { label: 'Columnas (Eje X)', value: 'ciudad' },
      { label: 'Métrica en Celdas', value: 'precio' },
      { label: 'Agregación', value: 'SUM (Suma de intersección)' }
    ]
  },
  {
    type: 'drilldown',
    title: 'Drill-Down',
    tabCategory: 'data',
    categoryTitle: 'Externos',
    description: 'Navegación jerárquica y desglose multinivel por campos con breadcrumbs interactivos.',
    purpose: 'Permite profundizar desde una vista global (ej. Región) hacia sub-niveles (ej. País → Ciudad → Tienda) con un solo clic.',
    icon: GitFork,
    defaultProps: {
      type: 'drilldown',
      name: 'Explorador Drill-Down',
      width: 380,
      height: 260,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadow: 'sm'
      },
      binding: {
        template: 'Desglose Jerárquico',
        aggregation: 'sum'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '380 × 260 px' },
      { label: 'Navegación', value: 'Breadcrumbs interactivos' },
      { label: 'Profundidad', value: 'Multinivel jerárquico' },
      { label: 'Agregación', value: 'Suma de niveles (SUM)' },
      { label: 'Estilo', value: 'Tarjeta con barra de migas' }
    ]
  },

  // ==========================================
  // CATEGORÍA: LAYOUT (DISEÑO & ESTRUCTURA)
  // ==========================================
  {
    type: 'container',
    title: 'Caja / Tarjeta de Fondo',
    tabCategory: 'layout',
    categoryTitle: 'Contenedores & Estructura',
    description: 'Bloque contenedor para agrupar y enmarcar elementos visuales relacionados.',
    purpose: 'Crea orden visual agrupando tarjetas, métricas o bloques en un fondo blanco o con sombra para estructurar el lienzo limpiamente.',
    icon: Square,
    defaultProps: {
      type: 'container',
      name: 'Contenedor Fondo',
      width: 400,
      height: 200,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadow: 'sm'
      },
      binding: {}
    },
    configHighlights: [
      { label: 'Dimensiones', value: '400 × 200 px' },
      { label: 'Fondo', value: '#ffffff (Blanco puro)' },
      { label: 'Borde', value: '1px sólido #e2e8f0' },
      { label: 'Esquinas', value: 'Radio 12px' },
      { label: 'Sombra', value: 'Sombra ligera (sm)' }
    ]
  },
  {
    type: 'divider',
    title: 'Separador / Línea',
    tabCategory: 'layout',
    categoryTitle: 'Contenedores & Estructura',
    description: 'Línea divisoria horizontal decorativa para separar secciones temáticas.',
    purpose: 'Organiza visualmente distintas áreas del informe sin sobrecargar la composición visual.',
    icon: Minus,
    defaultProps: {
      type: 'divider',
      name: 'Separador',
      width: 300,
      height: 20,
      style: {
        borderColor: '#cbd5e1'
      },
      binding: {}
    },
    configHighlights: [
      { label: 'Dimensiones', value: '300 × 20 px' },
      { label: 'Color Línea', value: '#cbd5e1 (Gris neutro)' },
      { label: 'Grosor', value: '1 px' },
      { label: 'Orientación', value: 'Horizontal centrada' }
    ]
  },
  {
    type: 'splitPanel',
    title: 'Panel 2 Verticales',
    tabCategory: 'layout',
    categoryTitle: 'Contenedores & Estructura',
    description: 'Panel con 2 paneles verticales redimensionables a través de la barra divisora con soporte drag & drop.',
    purpose: 'Divide el espacio en dos columnas ajustables en tiempo real arrastrando la barra divisoria. Puedes arrastrar y soltar cualquier control a cada panel por separado.',
    icon: Columns2,
    defaultProps: {
      type: 'splitPanel',
      name: 'Panel 2 Verticales',
      width: 580,
      height: 320,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        shadow: 'sm'
      },
      binding: {
        template: 'splitPanel',
        splitOrientation: 'vertical',
        splitRatio: 0.5,
        splitSlots: {
          'panel-1': [],
          'panel-2': []
        }
      }
    },
    configHighlights: [
      { label: 'Estructura', value: '2 paneles verticales (Columnas)' },
      { label: 'Divisor', value: 'Barra interactiva (arrastrar o doble clic)' },
      { label: 'Drag & Drop', value: 'Arrastra cualquier control a cada panel' },
      { label: 'Dimensiones', value: '580 × 320 px' }
    ]
  },
  {
    type: 'splitPanel',
    title: 'Panel 2 Horizontales',
    tabCategory: 'layout',
    categoryTitle: 'Contenedores & Estructura',
    description: 'Panel con 2 paneles horizontales redimensionables a través de la barra divisora con soporte drag & drop.',
    purpose: 'Divide el espacio en dos filas ajustables (superior e inferior) mediante una barra divisora interactiva. Permite arrastrar controles a cada panel de forma independiente.',
    icon: Rows2,
    defaultProps: {
      type: 'splitPanel',
      name: 'Panel 2 Horizontales',
      width: 500,
      height: 360,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        shadow: 'sm'
      },
      binding: {
        template: 'splitPanel',
        splitOrientation: 'horizontal',
        splitRatio: 0.5,
        splitSlots: {
          'panel-1': [],
          'panel-2': []
        }
      }
    },
    configHighlights: [
      { label: 'Estructura', value: '2 paneles horizontales (Filas)' },
      { label: 'Divisor', value: 'Barra horizontal interactiva' },
      { label: 'Drag & Drop', value: 'Arrastra cualquier control a cada panel' },
      { label: 'Dimensiones', value: '500 × 360 px' }
    ]
  },
  {
    type: 'splitPanel',
    title: 'Panel 4 Cuadrantes',
    tabCategory: 'layout',
    categoryTitle: 'Contenedores & Estructura',
    description: 'Panel con 4 cuadrantes redimensionables a través de las barras divisoras y cruz central interactiva.',
    purpose: 'Crea una cuadrícula de 4 sub-paneles con divisores horizontales, verticales y centro multidireccional. Puedes arrastrar y soltar controles en cada uno de los 4 paneles.',
    icon: Grid2x2,
    defaultProps: {
      type: 'splitPanel',
      name: 'Panel 4 Cuadrantes',
      width: 620,
      height: 420,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        shadow: 'sm'
      },
      binding: {
        template: 'splitPanel',
        splitOrientation: 'grid4',
        splitRatioH: 0.5,
        splitRatioV: 0.5,
        splitSlots: {
          'panel-1': [],
          'panel-2': [],
          'panel-3': [],
          'panel-4': []
        }
      }
    },
    configHighlights: [
      { label: 'Estructura', value: '4 paneles (Cuadrantes 2×2)' },
      { label: 'Divisores', value: 'Barras H & V + Cruz central de arrastre' },
      { label: 'Drag & Drop', value: 'Soporta arrastre en cada cuadrante' },
      { label: 'Dimensiones', value: '620 × 420 px' }
    ]
  },
  {
    type: 'card',
    title: 'Ficha de Registro',
    tabCategory: 'layout',
    categoryTitle: 'Métricas & Tablas',
    description: 'Detalle formateado con plantilla de campos {{campo}} de un registro individual.',
    purpose: 'Presenta el resumen de un solo registro o elemento seleccionado en formato de tarjeta limpia y multilínea.',
    icon: Square,
    defaultProps: {
      type: 'card',
      name: 'Ficha Detalle',
      width: 320,
      height: 120,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadow: 'sm'
      },
      binding: {
        template: 'ID #{{id}}: {{nombre}}\nDetalle: {{categoria}} | Saldo: €{{saldo}}'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '320 × 120 px' },
      { label: 'Formato', value: 'Plantilla de texto multilínea' },
      { label: 'Variables', value: '{{id}}, {{nombre}}, {{saldo}}' },
      { label: 'Estilo', value: 'Padding 14px · Borde redondeado' }
    ]
  },
  {
    type: 'detailCard',
    title: 'Ficha Detalle',
    tabCategory: 'layout',
    categoryTitle: 'Externos',
    description: 'Tarjeta técnica completa con avatar, badges y pares clave-valor estructurados.',
    purpose: 'Diseñada para perfiles de usuario, fichas de producto o expedientes con cabecera gráfica y lista de atributos detallados.',
    icon: Contact,
    defaultProps: {
      type: 'detailCard',
      name: 'Ficha Detalle',
      width: 360,
      height: 250,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        shadow: 'sm'
      },
      binding: {
        template: 'Ficha Detalle',
        headerField: '',
        subHeaderField: '',
        columns: []
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '360 × 250 px' },
      { label: 'Componentes', value: 'Avatar + Cabecera + Atributos' },
      { label: 'Organización', value: 'Cuadrícula de 2 columnas' },
      { label: 'Estilo', value: 'Borde 12px · Padding 16px' }
    ]
  },
  {
    type: 'minibrowser',
    title: 'MiniBrowser',
    tabCategory: 'layout',
    categoryTitle: 'Externos',
    description: 'Navegador embebido con barra de herramientas (Go, Back, Forward, Refresh, URL).',
    purpose: 'Permite previsualizar otros diseños guardados en la base de datos o páginas web auxiliares dentro de una ventana de navegador estilizada.',
    icon: Globe,
    defaultProps: {
      type: 'minibrowser',
      name: 'MiniBrowser',
      width: 520,
      height: 360,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        padding: 0,
        shadow: 'md'
      },
      binding: {
        template: 'MiniBrowser',
        browserUrl: 'db://diseño-actual',
        browserSourceType: 'saved_design',
        browserInteractive: false,
        browserShowTitleBar: true,
        browserShowToolBar: true,
        browserShowTabsBar: true,
        browserShowFooter: true
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '520 × 360 px' },
      { label: 'Toolbar', value: 'Botones navegación + Input URL' },
      { label: 'Origen por Defecto', value: 'db://diseño-actual' },
      { label: 'Interactividad', value: 'Modo seguro opcional' }
    ]
  },

  // ==========================================
  // CATEGORÍA: INPUTS (ENTRADAS, FILTROS & TEXTO)
  // ==========================================
  {
    type: 'filter',
    title: 'Filtro Desplegable',
    tabCategory: 'inputs',
    categoryTitle: 'Filtros Interactivos',
    description: 'Menú desplegable para filtrar controles del lienzo por cualquier campo.',
    purpose: 'Añade interactividad permitiendo al usuario seleccionar un valor (ej. Estado o País) y actualizar automáticamente los gráficos y tablas enlazados.',
    icon: Filter,
    defaultProps: {
      type: 'filter',
      name: 'Filtro Desplegable',
      width: 260,
      height: 85,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        shadow: 'sm'
      },
      binding: {
        filterDisplayMode: 'dropdown',
        filterPageScope: 'current',
        targetControlIds: [],
        filterPlaceholder: 'Todos los valores',
        template: 'Filtrar por Selección'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '260 × 85 px' },
      { label: 'Modo', value: 'Desplegable (Dropdown)' },
      { label: 'Ámbito', value: 'Página actual' },
      { label: 'Placeholder', value: '"Todos los valores"' },
      { label: 'Sincronización', value: 'Filtro global reactivo' }
    ]
  },
  {
    type: 'filter',
    title: 'Filtro Lista de Casillas',
    tabCategory: 'inputs',
    categoryTitle: 'Filtros Interactivos',
    description: 'Lista de casillas (checkboxes) para selección múltiple visible directamente en el lienzo.',
    purpose: 'Excelente para filtros donde se quieren ver todas las opciones disponibles a la vez y permitir seleccionar varias simultáneamente.',
    icon: CheckSquare,
    defaultProps: {
      type: 'filter',
      name: 'Filtro Casillas',
      width: 260,
      height: 200,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        shadow: 'sm'
      },
      binding: {
        filterDisplayMode: 'checkbox_list',
        filterPageScope: 'current',
        targetControlIds: [],
        filterPlaceholder: 'Todos',
        template: 'Selección Múltiple'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '260 × 200 px' },
      { label: 'Modo', value: 'Lista de Casillas (Checkboxes)' },
      { label: 'Selección', value: 'Múltiple simultánea' },
      { label: 'Desplazamiento', value: 'Scroll interior si excede altura' }
    ]
  },
  {
    type: 'form',
    title: 'Formulario Registro',
    tabCategory: 'inputs',
    categoryTitle: 'Externos',
    description: 'Formulario interactivo de captura y validación con botón guardar directamente en base de datos.',
    purpose: 'Convierte el dashboard en una aplicación funcional de entrada de datos, permitiendo añadir nuevos registros a las tablas del sistema.',
    icon: ClipboardList,
    defaultProps: {
      type: 'form',
      name: 'Formulario Registro',
      width: 360,
      height: 310,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        shadow: 'sm'
      },
      binding: {
        template: 'Nuevo Registro',
        prefix: 'Guardar Registro',
        columns: []
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '360 × 310 px' },
      { label: 'Botón de Acción', value: '"Guardar Registro"' },
      { label: 'Validación', value: 'Verificación de tipos de datos' },
      { label: 'Persistencia', value: 'Inserción directa en tabla' }
    ]
  },
  {
    type: 'text',
    title: 'Título Principal',
    tabCategory: 'inputs',
    categoryTitle: 'Texto & Títulos',
    description: 'Texto de gran tamaño para encabezados, títulos de página o nombres de reporte.',
    purpose: 'Establece la jerarquía visual principal de la página, proporcionando contexto inmediato sobre el contenido del reporte.',
    icon: Heading1,
    defaultProps: {
      type: 'text',
      name: 'Título',
      width: 380,
      height: 45,
      style: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a'
      },
      binding: {
        template: 'Título del Reporte'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '380 × 45 px' },
      { label: 'Tamaño Fuente', value: '22 px (Bold)' },
      { label: 'Color Texto', value: '#0f172a (Pizarra)' },
      { label: 'Texto Inicial', value: '"Título del Reporte"' }
    ]
  },
  {
    type: 'text',
    title: 'Campo Enlazado',
    tabCategory: 'inputs',
    categoryTitle: 'Texto & Títulos',
    description: 'Muestra valor dinámico de una tabla con sintaxis {{campo}} intercalada en el texto.',
    purpose: 'Permite crear textos compuestos dinámicos como "Bienvenido, {{nombre}}" o etiquetas que cambian según los datos cargados.',
    icon: Type,
    defaultProps: {
      type: 'text',
      name: 'Campo Dinámico',
      width: 260,
      height: 35,
      style: {
        fontSize: 14,
        color: '#334155'
      },
      binding: {
        template: 'Cliente: {{nombre}} ({{ciudad}})'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '260 × 35 px' },
      { label: 'Tamaño Fuente', value: '14 px (Regular)' },
      { label: 'Interpolación', value: '{{nombre}}, {{ciudad}}' },
      { label: 'Color', value: '#334155' }
    ]
  },
  {
    type: 'badge',
    title: 'Etiqueta / Badge',
    tabCategory: 'inputs',
    categoryTitle: 'Elementos Multimedia & Formatos',
    description: 'Píldora de estado con variantes cromáticas de éxito, advertencia o información.',
    purpose: 'Comunica estados categóricos rápidos de manera visual (ej. "Activo", "Pendiente", "Error", "Vip") en un formato compacto.',
    icon: Tag,
    defaultProps: {
      type: 'badge',
      name: 'Badge de Estado',
      width: 140,
      height: 36,
      style: {
        borderRadius: 9999,
        textAlign: 'center'
      },
      binding: {
        template: 'Activo',
        badgeVariant: 'success'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '140 × 36 px' },
      { label: 'Variante Inicial', value: 'Éxito (Verde / Success)' },
      { label: 'Borde', value: 'Píldora completa (9999px)' },
      { label: 'Alineación', value: 'Centro' }
    ]
  },
  {
    type: 'image',
    title: 'Imagen / Foto',
    tabCategory: 'inputs',
    categoryTitle: 'Elementos Multimedia & Formatos',
    description: 'Imagen estática o enlazada a campo URL de base de datos con ajuste proporcional.',
    purpose: 'Incorpora logotipos de empresa, avatares de cliente o fotografías de productos enlazadas dinámicamente a la tabla activa.',
    icon: ImageIcon,
    defaultProps: {
      type: 'image',
      name: 'Imagen',
      width: 220,
      height: 160,
      style: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadow: 'sm'
      },
      binding: {
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
        imageFit: 'cover'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '220 × 160 px' },
      { label: 'Ajuste Visual', value: 'Cover (Rellenar contenedor)' },
      { label: 'Esquinas', value: 'Radio 10px' },
      { label: 'Enlace Dinámico', value: 'URL estática o campo BD' }
    ]
  },
  {
    type: 'qrcode',
    title: 'Código QR',
    tabCategory: 'inputs',
    categoryTitle: 'Elementos Multimedia & Formatos',
    description: 'Generador de QR dinámico a partir de texto, URL o ID de registro.',
    purpose: 'Permite generar códigos escaneables en facturas, recibos o credenciales físicas que apuntan al enlace o ID del registro.',
    icon: QrCode,
    defaultProps: {
      type: 'qrcode',
      name: 'Código QR',
      width: 180,
      height: 130,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 10,
        shadow: 'sm'
      },
      binding: {
        template: 'https://ejemplo.com/item/{{id}}',
        prefix: 'Escanear verificación'
      }
    },
    configHighlights: [
      { label: 'Dimensiones', value: '180 × 130 px' },
      { label: 'Plantilla QR', value: 'https://ejemplo.com/item/{{id}}' },
      { label: 'Pie Auxiliar', value: '"Escanear verificación"' },
      { label: 'Resolución', value: 'Vectorial SVG de alto contraste' }
    ]
  }
];

export interface TabCategoryDef {
  id: TabCategoryId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeStyle: string;
  description: string;
}

export const TAB_CATEGORIES: TabCategoryDef[] = [
  { 
    id: 'all', 
    label: 'Todos', 
    shortLabel: 'Todos',
    icon: Layers, 
    accentColor: '#6366f1', 
    badgeStyle: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30',
    description: 'Catálogo completo de todos los controles disponibles' 
  },
  { 
    id: 'charts', 
    label: 'Gráficos', 
    shortLabel: 'Charts',
    icon: BarChart3, 
    accentColor: '#8b5cf6', 
    badgeStyle: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
    description: 'Gráficos de barras, líneas, circular y series temporales' 
  },
  { 
    id: 'data', 
    label: 'Datos', 
    shortLabel: 'Data',
    icon: Database, 
    accentColor: '#10b981', 
    badgeStyle: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    description: 'Tablas fijas y paginadas, tarjetas KPI, matrices y queries SQL' 
  },
  { 
    id: 'layout', 
    label: 'Diseño', 
    shortLabel: 'Layout',
    icon: Square, 
    accentColor: '#f59e0b', 
    badgeStyle: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    description: 'Cajas contenedoras, separadores, fichas de detalle y navegadores' 
  },
  { 
    id: 'inputs', 
    label: 'Entradas', 
    shortLabel: 'Inputs',
    icon: ClipboardList, 
    accentColor: '#0284c7', 
    badgeStyle: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
    description: 'Filtros desplegables y casillas, formularios, títulos y etiquetas' 
  },
  { 
    id: 'favorites', 
    label: 'Favoritos', 
    shortLabel: '★ Favs',
    icon: Star, 
    accentColor: '#eab308', 
    badgeStyle: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    description: 'Tus controles preferidos para acceso rápido' 
  }
];

interface ControlsPaletteProps {
  onAddControl: (control: Partial<CanvasElement>, dropCoord?: { x: number; y: number }) => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  onExpand?: () => void;
  onOpenGenerateLayout?: () => void;
  allowedControlTitles?: string[];
  allowedCategories?: string[];
}

// -------------------------------------------------------------
// Interactive Tooltip Portal Component
// -------------------------------------------------------------
interface TooltipPortalProps {
  item: PresetControl;
  rect: DOMRect;
  isFav: boolean;
  onToggleFavorite: (title: string, e?: React.MouseEvent) => void;
  onAdd: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const ControlInteractiveTooltip: React.FC<TooltipPortalProps> = ({
  item,
  rect,
  isFav,
  onToggleFavorite,
  onAdd,
  onMouseEnter,
  onMouseLeave
}) => {
  const Icon = item.icon;
  
  // Find tab definition
  const tabDef = TAB_CATEGORIES.find(t => t.id === item.tabCategory);
  
  // Calculate smart fixed coordinates
  const tooltipWidth = 330;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Place on right side of rect, or left if not enough space
  let left = rect.right + 12;
  if (left + tooltipWidth > viewportWidth - 16) {
    left = Math.max(16, rect.left - tooltipWidth - 12);
  }

  // Vertical placement clamped to viewport
  const estimatedHeight = 390;
  let top = rect.top - 16;
  if (top + estimatedHeight > viewportHeight - 16) {
    top = Math.max(16, viewportHeight - estimatedHeight - 16);
  }
  if (top < 16) {
    top = 16;
  }

  return createPortal(
    <div
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${tooltipWidth}px`,
        zIndex: 99999
      }}
      className="bg-white dark:bg-[#1a1b1e] border-2 border-indigo-400/80 dark:border-indigo-500/50 text-slate-800 dark:text-white rounded-xl shadow-2xl p-3.5 flex flex-col gap-2.5 transition-all duration-150 animate-in fade-in zoom-in-95 select-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-[#2f3136] pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: tabDef?.accentColor || '#6366f1' }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
              {item.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-slate-100 dark:bg-[#25282c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#373a40]">
                type: {item.type}
              </span>
              <span 
                className="text-[9px] px-1.5 py-0.2 rounded font-medium border"
                style={{ 
                  backgroundColor: `${tabDef?.accentColor || '#6366f1'}15`,
                  color: tabDef?.accentColor || '#6366f1',
                  borderColor: `${tabDef?.accentColor || '#6366f1'}35`
                }}
              >
                {tabDef?.label || item.tabCategory}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => onToggleFavorite(item.title, e)}
          className={`p-1.5 rounded-lg border transition cursor-pointer flex-shrink-0 ${
            isFav 
              ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-300' 
              : 'bg-slate-100 dark:bg-[#25282c] border-slate-200 dark:border-[#373a40] text-slate-400 hover:text-amber-500'
          }`}
          title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
        </button>
      </div>

      {/* Purpose / Description */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Info className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
          <span>Propósito y Utilidad</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#202225] p-2 rounded-lg border border-slate-100 dark:border-[#2a2c30]">
          {item.purpose || item.description}
        </p>
      </div>

      {/* Default Configuration */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <Settings2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            <span>Configuración por Defecto</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">valores iniciales</span>
        </div>

        <div className="bg-slate-50 dark:bg-[#202225] rounded-lg p-2 border border-slate-100 dark:border-[#2a2c30] flex flex-col gap-1.5 max-h-36 overflow-y-auto">
          {item.configHighlights.map((cfg, cIdx) => (
            <div key={cIdx} className="flex items-center justify-between text-[10px] leading-tight">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{cfg.label}:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono text-[9.5px] bg-white dark:bg-[#1a1b1e] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2f3136] max-w-[190px] truncate text-right">
                {cfg.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Interactive Actions */}
      <div className="pt-1 border-t border-slate-200 dark:border-[#2f3136] flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAdd()}
          className="flex-1 py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir al Lienzo</span>
        </button>
        <span className="text-[9.5px] text-slate-400 dark:text-slate-500 italic shrink-0">
          o arrastrar
        </span>
      </div>
    </div>,
    document.body
  );
};

export const ControlsPalette: React.FC<ControlsPaletteProps> = ({ 
  onAddControl, 
  onCollapse,
  isCollapsed = false,
  onExpand,
  onOpenGenerateLayout,
  allowedControlTitles,
  allowedCategories
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controls available based on link permissions / constraints
  const availableControls = useMemo(() => {
    return PRESET_CONTROLS.filter(item => {
      if (allowedControlTitles && allowedControlTitles.length > 0) {
        if (!allowedControlTitles.includes(item.title)) return false;
      }
      if (allowedCategories && allowedCategories.length > 0) {
        if (!allowedCategories.includes(item.tabCategory)) return false;
      }
      return true;
    });
  }, [allowedControlTitles, allowedCategories]);

  // Active category tab state
  const [activeTab, setActiveTab] = useState<TabCategoryId>(() => {
    try {
      const saved = localStorage.getItem('designer_controls_active_tab_v2');
      if (saved && ['all', 'charts', 'data', 'layout', 'inputs', 'favorites'].includes(saved)) {
        return saved as TabCategoryId;
      }
    } catch {
      // ignore
    }
    return 'all';
  });

  // Persist active tab selection
  const handleSelectTab = (tabId: TabCategoryId) => {
    setActiveTab(tabId);
    try {
      localStorage.setItem('designer_controls_active_tab_v2', tabId);
    } catch {
      // ignore
    }
  };

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('designer_controls_favorites_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read control favorites from localStorage', e);
    }
    return ['Tarjeta KPI', 'Tabla Paginada con Navegación', 'Título Principal', 'Gráfico de Barras', 'Series'];
  });

  useEffect(() => {
    try {
      localStorage.setItem('designer_controls_favorites_v1', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Could not persist control favorites', e);
    }
  }, [favorites]);

  const toggleFavorite = (title: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setFavorites(prev => {
      if (prev.includes(title)) {
        return prev.filter(t => t !== title);
      } else {
        return [...prev, title];
      }
    });
  };

  const isFavorited = (title: string) => favorites.includes(title);

  // Tooltip hover interactive state
  const [hoveredItem, setHoveredItem] = useState<{ item: PresetControl; rect: DOMRect } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInsideTooltipRef = useRef<boolean>(false);

  const handleItemMouseEnter = (item: PresetControl, e: React.MouseEvent<HTMLElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem({ item, rect });
    }, 120); // Responsive slight delay to avoid flicker
  };

  const handleItemMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isInsideTooltipRef.current) {
        setHoveredItem(null);
      }
    }, 160);
  };

  const handleTooltipMouseEnter = () => {
    isInsideTooltipRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    isInsideTooltipRef.current = false;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 120);
  };

  const handleDragStart = (e: React.DragEvent, preset: PresetControl) => {
    const payload = {
      ...preset.defaultProps,
      type: preset.type
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
    // close tooltip on drag
    setHoveredItem(null);
  };

  // Filter items according to search term and active tab
  const searchLower = searchTerm.trim().toLowerCase();

  const filteredItems = availableControls.filter(item => {
    // Search matching
    const matchesSearch = searchLower === '' || 
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.purpose.toLowerCase().includes(searchLower) ||
      item.type.toLowerCase().includes(searchLower) ||
      item.categoryTitle.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Tab matching
    if (activeTab === 'all') return true;
    if (activeTab === 'favorites') return isFavorited(item.title);
    return item.tabCategory === activeTab;
  });

  // Calculate counts for each tab
  const tabCounts: Record<TabCategoryId, number> = {
    all: availableControls.length,
    charts: availableControls.filter(i => i.tabCategory === 'charts').length,
    data: availableControls.filter(i => i.tabCategory === 'data').length,
    layout: availableControls.filter(i => i.tabCategory === 'layout').length,
    inputs: availableControls.filter(i => i.tabCategory === 'inputs').length,
    favorites: availableControls.filter(i => isFavorited(i.title)).length
  };

  // Visible category tabs filtered by allowedCategories
  const visibleTabCategories = useMemo(() => {
    return TAB_CATEGORIES.filter(tab => {
      if (tab.id === 'all') return true;
      if (tab.id === 'favorites') return tabCounts.favorites > 0;
      if (allowedCategories && allowedCategories.length > 0) {
        return allowedCategories.includes(tab.id);
      }
      return true;
    });
  }, [allowedCategories, tabCounts.favorites]);

  // Sub-group items by original categoryTitle when in "all" or specific view
  const groupedCategories = Array.from(
    new Set(filteredItems.map(item => item.categoryTitle))
  ).map(catTitle => ({
    title: catTitle,
    items: filteredItems.filter(item => item.categoryTitle === catTitle)
  }));

  // =========================================================================
  // RENDER: COLLAPSED MODE
  // =========================================================================
  if (isCollapsed) {
    const collapsedFavorites = availableControls.filter(item => isFavorited(item.title));

    return (
      <div className="w-14 bg-white dark:bg-[#202225] border-r border-slate-200 dark:border-[#2f3136] flex flex-col h-full select-none text-slate-800 dark:text-[#e1e1e6] flex-shrink-0 z-20 items-center">
        {/* Expand Header Button */}
        <div className="w-full p-2 border-b border-slate-200 dark:border-[#2f3136] flex flex-col items-center">
          <button
            onClick={onExpand}
            className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-[#9ca3af] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#25282c] rounded-lg transition border border-transparent hover:border-slate-200 dark:hover:border-[#2f3136] cursor-pointer"
            title="Expandir panel de controles"
          >
            <PanelLeftOpen className="w-4 h-4 text-[#5865f2]" />
          </button>
        </div>

        {/* Scrollable List of Control Icons */}
        <div className="flex-1 w-full overflow-y-auto py-2.5 px-1.5 flex flex-col items-center gap-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-[#2f3136] scrollbar-track-transparent">
          {/* Collapsed Favorites Group */}
          {collapsedFavorites.length > 0 && (
            <div className="w-full flex flex-col items-center gap-1.5 pb-1 mb-1 border-b border-amber-400/40 dark:border-amber-500/20">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse my-0.5" title="Favoritos fijados" />
              {collapsedFavorites.map((item, fIdx) => {
                const Icon = item.icon;
                return (
                  <div key={`col_fav_${fIdx}`} className="relative flex items-center justify-center w-full">
                    <button
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => onAddControl({ ...item.defaultProps, type: item.type })}
                      onMouseEnter={(e) => handleItemMouseEnter(item, e)}
                      onMouseLeave={handleItemMouseLeave}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-[#2a2618] hover:bg-amber-100 dark:hover:bg-[#38321a] text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 border border-amber-300 dark:border-amber-500/40 hover:border-amber-500 dark:hover:border-amber-400 shadow-xs cursor-grab active:cursor-grabbing transition"
                      aria-label={`Favorito: ${item.title}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* All Controls List in collapsed mode */}
          {PRESET_CONTROLS.map((item, itemIdx) => {
            const Icon = item.icon;
            const isFav = isFavorited(item.title);
            const tabDef = TAB_CATEGORIES.find(t => t.id === item.tabCategory);
            return (
              <div key={itemIdx} className="relative flex items-center justify-center w-full">
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => onAddControl({ ...item.defaultProps, type: item.type })}
                  onMouseEnter={(e) => handleItemMouseEnter(item, e)}
                  onMouseLeave={handleItemMouseLeave}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border shadow-xs cursor-grab active:cursor-grabbing transition ${
                    isFav 
                      ? 'bg-amber-50 dark:bg-[#2a2618] hover:bg-amber-100 dark:hover:bg-[#38321a] text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-500/30' 
                      : 'bg-white dark:bg-[#25282c] hover:bg-indigo-50 dark:hover:bg-[#2f3136] text-slate-600 dark:text-[#9ca3af] hover:text-indigo-600 dark:hover:text-[#5865f2] border-slate-200 dark:border-[#2f3136] hover:border-indigo-400 dark:hover:border-[#5865f2]/50'
                  }`}
                  aria-label={item.title}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer indicator */}
        <div className="p-2 border-t border-slate-200 dark:border-[#2f3136] w-full flex justify-center">
          <button
            onClick={onExpand}
            className="text-[10px] text-slate-500 dark:text-[#9ca3af] hover:text-slate-900 dark:hover:text-white font-mono transition cursor-pointer"
            title="Expandir catálogo completo"
          >
            {PRESET_CONTROLS.length}
          </button>
        </div>

        {/* Floating Portal Tooltip */}
        {hoveredItem && (
          <ControlInteractiveTooltip
            item={hoveredItem.item}
            rect={hoveredItem.rect}
            isFav={isFavorited(hoveredItem.item.title)}
            onToggleFavorite={toggleFavorite}
            onAdd={() => {
              onAddControl({ ...hoveredItem.item.defaultProps, type: hoveredItem.item.type });
              setHoveredItem(null);
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: EXPANDED PALETTE WITH TABBED CATEGORIES
  // =========================================================================
  const activeTabDef = TAB_CATEGORIES.find(t => t.id === activeTab) || TAB_CATEGORIES[0];

  return (
    <div className="w-full bg-slate-50/60 dark:bg-[#202225] flex flex-col h-full select-none text-slate-800 dark:text-[#e1e1e6]">
      {/* 1. Header & Search Bar */}
      <div className="p-3 border-b border-slate-200 dark:border-[#2f3136] bg-white dark:bg-[#202225] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#5865f2]" />
            <span>Controles</span>
          </div>
          <div className="flex items-center gap-1.5">
            {favorites.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectTab('favorites')}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'favorites'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30'
                }`}
                title="Ver favoritos"
              >
                <Star className="w-3 h-3 fill-current" />
                <span>{favorites.length}</span>
              </button>
            )}
            <span className="text-[10px] text-slate-500 dark:text-[#9ca3af] font-mono">
              {filteredItems.length} items
            </span>
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="p-1 text-slate-500 dark:text-[#9ca3af] hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#25282c] rounded transition cursor-pointer"
                title="Colapsar panel de controles"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search input with clear button */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar control por nombre o propósito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-7 pr-7 py-1.5 bg-slate-50 dark:bg-[#1a1b1e] border border-slate-200 dark:border-[#2f3136] rounded-md focus:outline-none focus:border-[#5865f2] focus:ring-1 focus:ring-[#5865f2] text-slate-900 dark:text-[#e1e1e6] placeholder-slate-400 dark:placeholder-[#6b7280]"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <SlidersHorizontal className="w-3 h-3" />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded cursor-pointer"
              title="Borrar búsqueda"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Optional AI Layout Button */}
        {onOpenGenerateLayout && (
          <button
            onClick={onOpenGenerateLayout}
            className="mt-2 w-full p-1.5 rounded-lg bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-sky-50/80 dark:from-[#5865f2]/20 dark:via-[#8b5cf6]/20 dark:to-[#38bdf8]/20 hover:from-indigo-100 dark:hover:from-[#5865f2]/30 hover:to-sky-100 dark:hover:to-[#38bdf8]/30 border border-indigo-200 dark:border-[#5865f2]/40 text-left flex items-center justify-between gap-2 group transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#5865f2] text-white">
                <Sparkles className="w-3 h-3 animate-pulse" />
              </div>
              <div className="text-[11px] font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-[#38bdf8] transition flex items-center gap-1.5">
                <span>Generar Layout con IA</span>
                <span className="text-[8.5px] px-1 bg-indigo-100 dark:bg-[#5865f2]/30 rounded text-indigo-700 dark:text-[#38bdf8] font-mono">Gemini</span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* 2. TABBED CATEGORIES NAVIGATION BAR */}
      <div className="px-2.5 pt-2 pb-1.5 border-b border-slate-200 dark:border-[#2f3136] bg-slate-100/70 dark:bg-[#1a1b1e] flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {visibleTabCategories.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-white dark:bg-[#25282c] text-indigo-600 dark:text-white border border-slate-200 dark:border-[#373a40] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 border border-transparent'
                }`}
                title={`${tab.label}: ${tab.description}`}
              >
                <Icon 
                  className="w-3.5 h-3.5" 
                  style={{ color: isActive ? tab.accentColor : undefined }} 
                />
                <span>{tab.label}</span>
                <span 
                  className={`text-[9.5px] px-1 py-0.2 rounded-full font-mono font-medium ${
                    isActive 
                      ? 'bg-indigo-50 dark:bg-[#18191c] text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-[#2f3136]' 
                      : 'bg-slate-200/80 dark:bg-[#25282c] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Context Subtitle */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 px-0.5">
          <div className="flex items-center gap-1 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeTabDef.label}:
            </span>
            <span className="truncate">{activeTabDef.description}</span>
          </div>
          {searchTerm && (
            <span className="text-indigo-600 dark:text-indigo-400 font-mono shrink-0">
              Filtrando "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* 3. Controls List (Filtered by selected Tab) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-[#2f3136] bg-white dark:bg-[#202225]">
            <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              No se encontraron controles
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              {activeTab === 'favorites' 
                ? 'No tienes ningún control marcado como favorito en este momento.'
                : `No hay coincidencias en la pestaña "${activeTabDef.label}".`}
            </p>
            {activeTab !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelectTab('all')}
                className="px-2.5 py-1 text-xs bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 font-medium transition cursor-pointer"
              >
                Ver todos los controles
              </button>
            )}
          </div>
        ) : (
          groupedCategories.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {/* Group sub-header when in "all" view or when multiple categories exist */}
              {(activeTab === 'all' || groupedCategories.length > 1) && (
                <div className="flex items-center justify-between px-1 pt-1 text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>{group.title}</span>
                  <span className="text-[9px] font-mono text-slate-400 font-normal">
                    {group.items.length} {group.items.length === 1 ? 'control' : 'controles'}
                  </span>
                </div>
              )}

              {/* Items in this group */}
              <div className="grid grid-cols-1 gap-1.5">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isFav = isFavorited(item.title);
                  const tabDef = TAB_CATEGORIES.find(t => t.id === item.tabCategory);

                  return (
                    <div
                      key={iIdx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => onAddControl({ ...item.defaultProps, type: item.type })}
                      onMouseEnter={(e) => handleItemMouseEnter(item, e)}
                      onMouseLeave={handleItemMouseLeave}
                      className={`p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all flex items-start gap-2.5 group shadow-xs relative border select-none ${
                        isFav 
                          ? 'bg-amber-50/40 dark:bg-[#25282c] hover:bg-amber-50/70 dark:hover:bg-[#2a2c30] border-amber-300/80 dark:border-amber-500/25 hover:border-amber-400'
                          : 'bg-white dark:bg-[#202225] hover:bg-slate-50 dark:hover:bg-[#25282c] border-slate-200 dark:border-[#2f3136] hover:border-indigo-400 dark:hover:border-[#5865f2]'
                      }`}
                    >
                      {/* Icon */}
                      <div 
                        className={`p-1.5 rounded-md border shadow-2xs flex-shrink-0 transition ${
                          isFav 
                            ? 'bg-amber-50 dark:bg-[#1a1b1e] text-amber-600 dark:text-amber-400 border-amber-300/80 dark:border-amber-500/30' 
                            : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-600 dark:text-[#9ca3af] group-hover:text-indigo-600 dark:group-hover:text-[#5865f2] border-slate-200 dark:border-[#2f3136] group-hover:border-indigo-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${
                            isFav
                              ? 'text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-200'
                              : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-white'
                          }`}>
                            {item.title}
                          </span>
                          <span 
                            className="text-[8.5px] px-1 py-0.2 rounded font-mono font-medium border"
                            style={{ 
                              backgroundColor: `${tabDef?.accentColor || '#6366f1'}15`,
                              color: tabDef?.accentColor || '#6366f1',
                              borderColor: `${tabDef?.accentColor || '#6366f1'}35`
                            }}
                          >
                            {tabDef?.shortLabel || item.tabCategory}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2 mt-0.5">
                          {item.description}
                        </div>

                        {/* Dimensions & Config Badge */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#1a1b1e] px-1 py-0.2 rounded border border-slate-200 dark:border-[#2f3136]">
                            {item.defaultProps.width}×{item.defaultProps.height}px
                          </span>
                          <span className="text-[9px] text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                            <Plus className="w-2.5 h-2.5" /> Clic para añadir
                          </span>
                        </div>
                      </div>

                      {/* Star Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.title, e)}
                        className={`absolute right-2 top-2.5 p-1 rounded-md transition cursor-pointer ${
                          isFav 
                            ? 'text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-[#1a1b1e]' 
                            : 'text-slate-300 dark:text-[#6b7280] hover:text-amber-500 dark:hover:text-amber-300 opacity-40 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-[#1a1b1e]'
                        }`}
                        title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Tip footer */}
      <div className="p-2.5 bg-slate-100/90 dark:bg-[#1a1b1e] border-t border-slate-200 dark:border-[#2f3136] text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-[#5865f2] flex-shrink-0" />
          <span>Pasa el cursor para ver propósito y valores.</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300/90 font-medium">
          <Star className="w-3 h-3 fill-amber-400 text-amber-500 dark:text-amber-400" />
          <span>Fija favoritos</span>
        </div>
      </div>

      {/* 5. Floating Interactive Tooltip Portal */}
      {hoveredItem && (
        <ControlInteractiveTooltip
          item={hoveredItem.item}
          rect={hoveredItem.rect}
          isFav={isFavorited(hoveredItem.item.title)}
          onToggleFavorite={toggleFavorite}
          onAdd={() => {
            onAddControl({ ...hoveredItem.item.defaultProps, type: hoveredItem.item.type });
            setHoveredItem(null);
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </div>
  );
};
