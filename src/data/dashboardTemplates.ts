import { CanvasDocument } from '../types';

export interface DashboardTemplate {
  id: string;
  name: string;
  category: 'Ventas' | 'Finanzas' | 'Recursos Humanos' | 'Operaciones' | 'Clientes' | 'Minimalista';
  description: string;
  targetDatabase: string;
  themeId?: string;
  tags: string[];
  highlights: string[];
  color: string;
  document: CanvasDocument;
}

export interface RawDashboardTemplate extends Omit<DashboardTemplate, 'document'> {
  document: Omit<CanvasDocument, 'elements'> & { elements?: CanvasDocument['elements'] };
}

const RAW_DASHBOARD_TEMPLATES: RawDashboardTemplate[] = [
  {
    id: 'template_sales_overview',
    name: 'Resumen Comercial y Ventas',
    category: 'Ventas',
    description: 'Tablero comercial completo con métricas de facturación, volumen de transacciones, gráfico de precios por producto, tabla paginada y filtro interactivo.',
    targetDatabase: 'Tienda_Ventas_DB',
    themeId: 'light',
    tags: ['Ventas', 'KPI', 'Gráfico', 'Filtro', 'Comercio'],
    highlights: ['4 Tarjetas KPI', 'Filtro por Categoría', 'Gráfico de Barras', 'Tabla de Transacciones'],
    color: '#3b82f6',
    document: {
      id: 'doc_tpl_sales_overview',
      name: 'Resumen Comercial y Ventas',
      width: 960,
      height: 680,
      backgroundColor: '#f8fafc',
      themeId: 'light',
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: 'Tienda_Ventas_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activePageIndex: 0,
      pageTabsPosition: 'bottom',
      showPageTabs: true,
      pages: [
        {
          id: 'page_tpl_sales_1',
          name: 'Dashboard Ventas',
          backgroundColor: '#f8fafc',
          width: 960,
          height: 680,
          elements: [
            {
              id: 'el_header_container',
              type: 'container',
              name: 'Encabezado Fondo',
              x: 30,
              y: 20,
              width: 900,
              height: 75,
              zIndex: 1,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#0f172a',
                borderRadius: 12,
                padding: 16,
                shadow: 'md'
              },
              binding: {}
            },
            {
              id: 'el_header_title',
              type: 'text',
              name: 'Título Dashboard',
              x: 50,
              y: 32,
              width: 480,
              height: 30,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'left'
              },
              binding: {
                template: '📊 Reporte Comercial de Ventas'
              }
            },
            {
              id: 'el_header_subtitle',
              type: 'text',
              name: 'Subtítulo',
              x: 50,
              y: 62,
              width: 480,
              height: 20,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#94a3b8',
                fontSize: 12,
                fontWeight: 'normal',
                textAlign: 'left'
              },
              binding: {
                template: 'Monitorización de ingresos y pedidos en tiempo real'
              }
            },
            {
              id: 'el_header_filter',
              type: 'filter',
              name: 'Filtro de Categoría',
              x: 580,
              y: 35,
              width: 200,
              height: 44,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#334155'
              },
              binding: {
                tableName: 'productos',
                field: 'categoria',
                filterDisplayMode: 'dropdown',
                template: 'Filtrar por Categoría',
                filterPlaceholder: 'Todas las categorías',
                filterPageScope: 'current'
              }
            },
            {
              id: 'el_header_badge',
              type: 'badge',
              name: 'Badge En Vivo',
              x: 795,
              y: 40,
              width: 115,
              height: 32,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 'bold',
                textAlign: 'center'
              },
              binding: {
                template: '● EN VIVO',
                badgeVariant: 'success'
              }
            },
            // KPIs Row
            {
              id: 'el_kpi_revenue',
              type: 'kpi',
              name: 'KPI Facturación',
              x: 30,
              y: 110,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'ventas',
                field: 'total',
                aggregation: 'sum',
                prefix: '€ ',
                suffix: '',
                template: 'Facturación Total'
              }
            },
            {
              id: 'el_kpi_orders',
              type: 'kpi',
              name: 'KPI Pedidos',
              x: 260,
              y: 110,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'ventas',
                field: 'id',
                aggregation: 'count',
                suffix: ' pedidos',
                template: 'Total Transacciones'
              }
            },
            {
              id: 'el_kpi_avg_ticket',
              type: 'kpi',
              name: 'KPI Ticket Promedio',
              x: 490,
              y: 110,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'ventas',
                field: 'total',
                aggregation: 'avg',
                prefix: '€ ',
                template: 'Ticket Medio'
              }
            },
            {
              id: 'el_kpi_catalog',
              type: 'kpi',
              name: 'KPI Catálogo',
              x: 720,
              y: 110,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'productos',
                field: 'id',
                aggregation: 'count',
                suffix: ' SKUs',
                template: 'Catálogo Activo'
              }
            },
            // Chart
            {
              id: 'el_sales_chart',
              type: 'chart',
              name: 'Gráfico Precios Productos',
              x: 30,
              y: 220,
              width: 440,
              height: 250,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 16,
                shadow: 'sm'
              },
              binding: {
                tableName: 'productos',
                chartType: 'bar',
                labelField: 'nombre',
                valueField: 'precio',
                template: 'Precios del Catálogo (€)',
                chartColors: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
              }
            },
            // Detail Card or Second Chart
            {
              id: 'el_top_client_card',
              type: 'detailCard',
              name: 'Ficha Cliente Destacado',
              x: 490,
              y: 220,
              width: 440,
              height: 250,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 16,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                recordIndex: 0,
                headerField: 'nombre',
                subHeaderField: 'email',
                bodyField: 'categoria',
                footerField: 'saldo',
                template: 'Cliente Destacado (Top Saldo)'
              }
            },
            // Table
            {
              id: 'el_recent_orders_table',
              type: 'table',
              name: 'Tabla Transacciones Recientes',
              x: 30,
              y: 485,
              width: 900,
              height: 175,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 12,
                shadow: 'sm'
              },
              binding: {
                tableName: 'ventas',
                columns: ['id', 'fecha', 'clienteId', 'total', 'estado', 'metodoPago'],
                paginationMode: 'paginated',
                pageSize: 4,
                showPaginationControls: true,
                template: 'Registro de Ventas Recientes'
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'template_executive_finance',
    name: 'Panel Ejecutivo y Finanzas',
    category: 'Finanzas',
    description: 'Visión financiera de alto nivel con margen operativo, saldo consolidado, evolución de ingresos, matriz pivot y estilo oscuro corporativo.',
    targetDatabase: 'Tienda_Ventas_DB',
    themeId: 'midnight',
    tags: ['Finanzas', 'Ejecutivo', 'EBITDA', 'Matriz', 'Dark'],
    highlights: ['Modo Midnight', '4 Métricas Financieras', 'Gráfico de Área', 'Matriz Pivot'],
    color: '#8b5cf6',
    document: {
      id: 'doc_tpl_executive_finance',
      name: 'Panel Ejecutivo y Finanzas',
      width: 960,
      height: 680,
      backgroundColor: '#0f172a',
      themeId: 'midnight',
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: 'Tienda_Ventas_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activePageIndex: 0,
      pageTabsPosition: 'bottom',
      showPageTabs: true,
      pages: [
        {
          id: 'page_tpl_fin_1',
          name: 'Resumen Ejecutivo',
          backgroundColor: '#0f172a',
          width: 960,
          height: 680,
          elements: [
            {
              id: 'el_fin_header',
              type: 'container',
              name: 'Header Finanzas',
              x: 30,
              y: 20,
              width: 900,
              height: 70,
              zIndex: 1,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 16
              },
              binding: {}
            },
            {
              id: 'el_fin_title',
              type: 'text',
              name: 'Título Finanzas',
              x: 50,
              y: 32,
              width: 500,
              height: 28,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#f8fafc',
                fontSize: 20,
                fontWeight: 'bold'
              },
              binding: {
                template: '💎 Resumen Ejecutivo & Control Financiero'
              }
            },
            {
              id: 'el_fin_sub',
              type: 'text',
              name: 'Subtítulo Finanzas',
              x: 50,
              y: 60,
              width: 450,
              height: 18,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#94a3b8',
                fontSize: 11
              },
              binding: {
                template: 'Estados de tesorería y balances consolidados'
              }
            },
            {
              id: 'el_fin_badge',
              type: 'badge',
              name: 'Badge Auditado',
              x: 770,
              y: 38,
              width: 140,
              height: 32,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 'bold',
                textAlign: 'center'
              },
              binding: {
                template: 'AUDITADO Q3 2026'
              }
            },
            // KPIs
            {
              id: 'el_fin_kpi_1',
              type: 'kpi',
              name: 'KPI Saldo Total',
              x: 30,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 14,
                color: '#ffffff'
              },
              binding: {
                tableName: 'clientes',
                field: 'saldo',
                aggregation: 'sum',
                prefix: '€ ',
                template: 'Cartera de Clientes'
              }
            },
            {
              id: 'el_fin_kpi_2',
              type: 'kpi',
              name: 'KPI Facturado',
              x: 260,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 14
              },
              binding: {
                tableName: 'ventas',
                field: 'total',
                aggregation: 'sum',
                prefix: '€ ',
                template: 'Ingresos Operativos'
              }
            },
            {
              id: 'el_fin_kpi_3',
              type: 'kpi',
              name: 'KPI Clientes VIP',
              x: 490,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 14
              },
              binding: {
                tableName: 'clientes',
                field: 'id',
                aggregation: 'count',
                suffix: ' cuentas',
                template: 'Cuentas Activas'
              }
            },
            {
              id: 'el_fin_kpi_4',
              type: 'kpi',
              name: 'KPI Saldo Promedio',
              x: 720,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 14
              },
              binding: {
                tableName: 'clientes',
                field: 'saldo',
                aggregation: 'avg',
                prefix: '€ ',
                template: 'Saldo Medio'
              }
            },
            // Charts & Pivot
            {
              id: 'el_fin_chart_line',
              type: 'chart',
              name: 'Gráfico Evolución Ventas',
              x: 30,
              y: 215,
              width: 440,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 14
              },
              binding: {
                tableName: 'ventas',
                chartType: 'line',
                labelField: 'fecha',
                valueField: 'total',
                template: 'Tendencia Temporal de Ventas (€)',
                chartColors: ['#a855f7', '#38bdf8', '#34d399']
              }
            },
            {
              id: 'el_fin_matrix',
              type: 'matrix',
              name: 'Matriz Saldos por Categoría',
              x: 490,
              y: 215,
              width: 440,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 12
              },
              binding: {
                tableName: 'clientes',
                rowField: 'categoria',
                colField: 'ciudad',
                valueField: 'saldo',
                aggregation: 'sum',
                template: 'Matriz Pivot: Saldo por Categoría y Ciudad'
              }
            },
            // Table
            {
              id: 'el_fin_table',
              type: 'table',
              name: 'Tabla Clientes Balance',
              x: 30,
              y: 465,
              width: 900,
              height: 190,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 12
              },
              binding: {
                tableName: 'clientes',
                columns: ['id', 'nombre', 'email', 'ciudad', 'categoria', 'saldo'],
                paginationMode: 'paginated',
                pageSize: 4,
                showPaginationControls: true,
                template: 'Detalle de Cartera y Balances de Clientes'
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'template_hr_analytics',
    name: 'Recursos Humanos y Rendimiento',
    category: 'Recursos Humanos',
    description: 'Gestión integral del personal, directores de departamento, presupuestos de área, evaluación de desempeño y directorio de empleados.',
    targetDatabase: 'Recursos_Humanos_DB',
    themeId: 'nord',
    tags: ['RRHH', 'Empleados', 'Salarios', 'Departamentos', 'Nord'],
    highlights: ['Tema Nord', 'Filtro por Departamento', 'Gráfico Presupuesto', 'Directorio de Nómina'],
    color: '#06b6d4',
    document: {
      id: 'doc_tpl_hr_analytics',
      name: 'Recursos Humanos y Rendimiento',
      width: 960,
      height: 680,
      backgroundColor: '#2e3440',
      themeId: 'nord',
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: 'Recursos_Humanos_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activePageIndex: 0,
      pageTabsPosition: 'bottom',
      showPageTabs: true,
      pages: [
        {
          id: 'page_tpl_hr_1',
          name: 'Panel de RRHH',
          backgroundColor: '#2e3440',
          width: 960,
          height: 680,
          elements: [
            {
              id: 'el_hr_header',
              type: 'container',
              name: 'Header RRHH',
              x: 30,
              y: 20,
              width: 900,
              height: 70,
              zIndex: 1,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 16
              },
              binding: {}
            },
            {
              id: 'el_hr_title',
              type: 'text',
              name: 'Título RRHH',
              x: 50,
              y: 32,
              width: 450,
              height: 28,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#eceff4',
                fontSize: 20,
                fontWeight: 'bold'
              },
              binding: {
                template: '👥 Recursos Humanos & Gestión de Talento'
              }
            },
            {
              id: 'el_hr_filter',
              type: 'filter',
              name: 'Filtro Departamento',
              x: 580,
              y: 33,
              width: 200,
              height: 44,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#434c5e',
                color: '#eceff4',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#4c566a'
              },
              binding: {
                tableName: 'empleados',
                field: 'departamento',
                filterDisplayMode: 'dropdown',
                template: 'Filtrar Departamento',
                filterPlaceholder: 'Todos los departamentos'
              }
            },
            {
              id: 'el_hr_badge',
              type: 'badge',
              name: 'Badge Plantilla',
              x: 795,
              y: 38,
              width: 120,
              height: 32,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#88c0d0',
                color: '#2e3440',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 'bold',
                textAlign: 'center'
              },
              binding: {
                template: 'ACTIVOS 2026'
              }
            },
            // KPIs
            {
              id: 'el_hr_kpi_1',
              type: 'kpi',
              name: 'KPI Plantilla Total',
              x: 30,
              y: 105,
              width: 280,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 14,
                color: '#eceff4'
              },
              binding: {
                tableName: 'empleados',
                field: 'id',
                aggregation: 'count',
                suffix: ' profesionales',
                template: 'Plantilla Total'
              }
            },
            {
              id: 'el_hr_kpi_2',
              type: 'kpi',
              name: 'KPI Salario Medio',
              x: 340,
              y: 105,
              width: 280,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 14,
                color: '#eceff4'
              },
              binding: {
                tableName: 'empleados',
                field: 'salario',
                aggregation: 'avg',
                prefix: '€ ',
                suffix: ' /año',
                template: 'Salario Promedio Anual'
              }
            },
            {
              id: 'el_hr_kpi_3',
              type: 'kpi',
              name: 'KPI Presupuesto Deptos',
              x: 650,
              y: 105,
              width: 280,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 14,
                color: '#eceff4'
              },
              binding: {
                tableName: 'departamentos',
                field: 'presupuesto',
                aggregation: 'sum',
                prefix: '€ ',
                template: 'Presupuesto Total Áreas'
              }
            },
            // Chart & Card
            {
              id: 'el_hr_chart',
              type: 'chart',
              name: 'Gráfico Presupuestos',
              x: 30,
              y: 215,
              width: 440,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 14
              },
              binding: {
                tableName: 'departamentos',
                chartType: 'bar',
                labelField: 'nombre',
                valueField: 'presupuesto',
                template: 'Presupuesto por Departamento (€)',
                chartColors: ['#88c0d0', '#81a1c1', '#5e81ac', '#a3be8c']
              }
            },
            {
              id: 'el_hr_card',
              type: 'detailCard',
              name: 'Ficha Empleado Destacado',
              x: 490,
              y: 215,
              width: 440,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 14
              },
              binding: {
                tableName: 'empleados',
                recordIndex: 0,
                headerField: 'nombre',
                subHeaderField: 'puesto',
                bodyField: 'departamento',
                footerField: 'salario',
                template: 'Colaborador Destacado'
              }
            },
            // Table
            {
              id: 'el_hr_table',
              type: 'table',
              name: 'Directorio Empleados',
              x: 30,
              y: 465,
              width: 900,
              height: 190,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#3b4252',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#4c566a',
                padding: 12
              },
              binding: {
                tableName: 'empleados',
                columns: ['id', 'nombre', 'puesto', 'departamento', 'salario', 'desempeno'],
                paginationMode: 'paginated',
                pageSize: 4,
                showPaginationControls: true,
                template: 'Directorio de Personal y Nóminas'
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'template_inventory_hub',
    name: 'Control de Inventario y Almacén',
    category: 'Operaciones',
    description: 'Gestión de existencias en almacén, niveles críticos de reposición, valor monetario de stock y auditoría de catálogo.',
    targetDatabase: 'Tienda_Ventas_DB',
    themeId: 'emerald',
    tags: ['Inventario', 'Almacén', 'Stock', 'Logística', 'Emerald'],
    highlights: ['Tema Emerald', 'Monitoreo de Stock', 'Gráfico de Existencias', 'Auditoría de SKUs'],
    color: '#10b981',
    document: {
      id: 'doc_tpl_inventory_hub',
      name: 'Control de Inventario y Almacén',
      width: 960,
      height: 680,
      backgroundColor: '#064e3b',
      themeId: 'emerald',
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: 'Tienda_Ventas_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activePageIndex: 0,
      pageTabsPosition: 'bottom',
      showPageTabs: true,
      pages: [
        {
          id: 'page_tpl_inv_1',
          name: 'Almacén Central',
          backgroundColor: '#064e3b',
          width: 960,
          height: 680,
          elements: [
            {
              id: 'el_inv_header',
              type: 'container',
              name: 'Header Inventario',
              x: 30,
              y: 20,
              width: 900,
              height: 70,
              zIndex: 1,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 16
              },
              binding: {}
            },
            {
              id: 'el_inv_title',
              type: 'text',
              name: 'Título Inventario',
              x: 50,
              y: 32,
              width: 450,
              height: 28,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#ecfdf5',
                fontSize: 20,
                fontWeight: 'bold'
              },
              binding: {
                template: '📦 Control Logístico & Inventario en Almacén'
              }
            },
            {
              id: 'el_inv_badge',
              type: 'badge',
              name: 'Badge Almacén',
              x: 775,
              y: 38,
              width: 135,
              height: 32,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 'bold',
                textAlign: 'center'
              },
              binding: {
                template: '● ALMACÉN OK'
              }
            },
            // KPIs
            {
              id: 'el_inv_kpi_1',
              type: 'kpi',
              name: 'KPI Total SKUs',
              x: 30,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 14,
                color: '#ecfdf5'
              },
              binding: {
                tableName: 'productos',
                field: 'id',
                aggregation: 'count',
                suffix: ' SKUs',
                template: 'Referencias en Catálogo'
              }
            },
            {
              id: 'el_inv_kpi_2',
              type: 'kpi',
              name: 'KPI Total Unidades',
              x: 260,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 14,
                color: '#ecfdf5'
              },
              binding: {
                tableName: 'productos',
                field: 'stock',
                aggregation: 'sum',
                suffix: ' unidades',
                template: 'Existencias Físicas'
              }
            },
            {
              id: 'el_inv_kpi_3',
              type: 'kpi',
              name: 'KPI Precio Promedio',
              x: 490,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 14,
                color: '#ecfdf5'
              },
              binding: {
                tableName: 'productos',
                field: 'precio',
                aggregation: 'avg',
                prefix: '€ ',
                template: 'Valor Medio por SKU'
              }
            },
            {
              id: 'el_inv_kpi_4',
              type: 'kpi',
              name: 'KPI Stock Promedio',
              x: 720,
              y: 105,
              width: 210,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 14,
                color: '#ecfdf5'
              },
              binding: {
                tableName: 'productos',
                field: 'stock',
                aggregation: 'avg',
                suffix: ' uds/SKU',
                template: 'Stock Promedio'
              }
            },
            // Charts
            {
              id: 'el_inv_chart',
              type: 'chart',
              name: 'Gráfico Stock por Producto',
              x: 30,
              y: 215,
              width: 530,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 14
              },
              binding: {
                tableName: 'productos',
                chartType: 'bar',
                labelField: 'nombre',
                valueField: 'stock',
                template: 'Niveles de Stock por Producto (Uds)',
                chartColors: ['#34d399', '#10b981', '#059669', '#047857']
              }
            },
            {
              id: 'el_inv_item_card',
              type: 'detailCard',
              name: 'Ficha Producto Clave',
              x: 580,
              y: 215,
              width: 350,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 14
              },
              binding: {
                tableName: 'productos',
                recordIndex: 0,
                headerField: 'nombre',
                subHeaderField: 'categoria',
                bodyField: 'stock',
                footerField: 'precio',
                template: 'Producto Más Valioso'
              }
            },
            // Table
            {
              id: 'el_inv_table',
              type: 'table',
              name: 'Tabla Existencias Almacén',
              x: 30,
              y: 465,
              width: 900,
              height: 190,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#065f46',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#047857',
                padding: 12
              },
              binding: {
                tableName: 'productos',
                columns: ['id', 'nombre', 'categoria', 'precio', 'stock', 'calificacion'],
                paginationMode: 'paginated',
                pageSize: 4,
                showPaginationControls: true,
                template: 'Auditoría Completa de Stock y Precios'
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'template_crm_customers',
    name: 'Gestión de Clientes y CRM',
    category: 'Clientes',
    description: 'Segmentación de cartera, clientes VIP, estados de saldo por ciudad, ficha personalizada y selector interactivo de categoría.',
    targetDatabase: 'Tienda_Ventas_DB',
    themeId: 'light',
    tags: ['CRM', 'Clientes', 'VIP', 'Fidelización', 'Cartera'],
    highlights: ['Segmentación VIP', 'Filtro por Categoría', 'Ficha Detalle CRM', 'Tabla de Saldos'],
    color: '#f59e0b',
    document: {
      id: 'doc_tpl_crm_customers',
      name: 'Gestión de Clientes y CRM',
      width: 960,
      height: 680,
      backgroundColor: '#fffbeb',
      themeId: 'light',
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: 'Tienda_Ventas_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activePageIndex: 0,
      pageTabsPosition: 'bottom',
      showPageTabs: true,
      pages: [
        {
          id: 'page_tpl_crm_1',
          name: 'Clientes VIP',
          backgroundColor: '#fffbeb',
          width: 960,
          height: 680,
          elements: [
            {
              id: 'el_crm_header',
              type: 'container',
              name: 'Header CRM',
              x: 30,
              y: 20,
              width: 900,
              height: 70,
              zIndex: 1,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#78350f',
                borderRadius: 12,
                padding: 16
              },
              binding: {}
            },
            {
              id: 'el_crm_title',
              type: 'text',
              name: 'Título CRM',
              x: 50,
              y: 32,
              width: 450,
              height: 28,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#fef3c7',
                fontSize: 20,
                fontWeight: 'bold'
              },
              binding: {
                template: '⭐ Cartera de Clientes & Relación VIP'
              }
            },
            {
              id: 'el_crm_filter',
              type: 'filter',
              name: 'Filtro Categoría CRM',
              x: 560,
              y: 33,
              width: 220,
              height: 44,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#92400e',
                color: '#ffffff',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#b45309'
              },
              binding: {
                tableName: 'clientes',
                field: 'categoria',
                filterDisplayMode: 'dropdown',
                template: 'Segmento de Cliente',
                filterPlaceholder: 'Todos los segmentos'
              }
            },
            {
              id: 'el_crm_badge',
              type: 'badge',
              name: 'Badge Fidelización',
              x: 795,
              y: 38,
              width: 120,
              height: 32,
              zIndex: 3,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#f59e0b',
                color: '#78350f',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 'bold',
                textAlign: 'center'
              },
              binding: {
                template: 'FIDELIZACIÓN'
              }
            },
            // KPIs
            {
              id: 'el_crm_kpi_1',
              type: 'kpi',
              name: 'KPI Clientes Activos',
              x: 30,
              y: 105,
              width: 280,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                field: 'id',
                aggregation: 'count',
                suffix: ' clientes',
                template: 'Base de Clientes'
              }
            },
            {
              id: 'el_crm_kpi_2',
              type: 'kpi',
              name: 'KPI Saldo Consolidado',
              x: 340,
              y: 105,
              width: 280,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                field: 'saldo',
                aggregation: 'sum',
                prefix: '€ ',
                template: 'Saldo Acumulado'
              }
            },
            {
              id: 'el_crm_kpi_3',
              type: 'kpi',
              name: 'KPI Saldo Promedio',
              x: 650,
              y: 105,
              width: 280,
              height: 95,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                field: 'saldo',
                aggregation: 'avg',
                prefix: '€ ',
                template: 'Valor Medio / Cliente'
              }
            },
            // Chart & Card
            {
              id: 'el_crm_chart',
              type: 'chart',
              name: 'Gráfico Saldos por Cliente',
              x: 30,
              y: 215,
              width: 440,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                chartType: 'bar',
                labelField: 'nombre',
                valueField: 'saldo',
                template: 'Saldo Disponible por Cliente (€)',
                chartColors: ['#f59e0b', '#d97706', '#b45309', '#78350f']
              }
            },
            {
              id: 'el_crm_card',
              type: 'detailCard',
              name: 'Ficha Cliente Preferente',
              x: 490,
              y: 215,
              width: 440,
              height: 235,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                padding: 14,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                recordIndex: 2,
                headerField: 'nombre',
                subHeaderField: 'email',
                bodyField: 'ciudad',
                footerField: 'saldo',
                template: 'Cliente Platino Destacado'
              }
            },
            // Table
            {
              id: 'el_crm_table',
              type: 'table',
              name: 'Directorio CRM',
              x: 30,
              y: 465,
              width: 900,
              height: 190,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                padding: 12,
                shadow: 'sm'
              },
              binding: {
                tableName: 'clientes',
                columns: ['id', 'nombre', 'email', 'ciudad', 'categoria', 'saldo'],
                paginationMode: 'paginated',
                pageSize: 4,
                showPaginationControls: true,
                template: 'Listado de Clientes y Fidelización'
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'template_clean_minimal',
    name: 'Dashboard Minimalista Monocromático',
    category: 'Minimalista',
    description: 'Diseño limpio con tipografía cuidada, generoso espacio negativo, micro-KPIs elegantes, gráfico sin distracciones y tabla simplificada.',
    targetDatabase: 'Tienda_Ventas_DB',
    themeId: 'light',
    tags: ['Minimalista', 'Monocromo', 'Clean', 'Moderno', 'Tipografía'],
    highlights: ['Espacio Negativo', 'Micro-KPIs', 'Gráfico de Líneas Limpio', 'Tabla Compacta'],
    color: '#64748b',
    document: {
      id: 'doc_tpl_clean_minimal',
      name: 'Dashboard Minimalista Monocromático',
      width: 960,
      height: 680,
      backgroundColor: '#ffffff',
      themeId: 'light',
      gridSize: 20,
      showGrid: false,
      snapToGrid: true,
      targetDatabase: 'Tienda_Ventas_DB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activePageIndex: 0,
      pageTabsPosition: 'bottom',
      showPageTabs: false,
      pages: [
        {
          id: 'page_tpl_min_1',
          name: 'Página Principal',
          backgroundColor: '#ffffff',
          width: 960,
          height: 680,
          elements: [
            {
              id: 'el_min_title',
              type: 'text',
              name: 'Título Minimal',
              x: 40,
              y: 35,
              width: 600,
              height: 36,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#0f172a',
                fontSize: 24,
                fontWeight: 'bold'
              },
              binding: {
                template: 'Actividad Comercial'
              }
            },
            {
              id: 'el_min_subtitle',
              type: 'text',
              name: 'Subtítulo Minimal',
              x: 40,
              y: 72,
              width: 500,
              height: 20,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                color: '#64748b',
                fontSize: 13
              },
              binding: {
                template: 'Métricas de rendimiento e histórico de operaciones'
              }
            },
            {
              id: 'el_min_divider',
              type: 'divider',
              name: 'Separador Superior',
              x: 40,
              y: 102,
              width: 880,
              height: 2,
              zIndex: 1,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#e2e8f0'
              },
              binding: {}
            },
            // KPIs
            {
              id: 'el_min_kpi_1',
              type: 'kpi',
              name: 'KPI Volumen',
              x: 40,
              y: 125,
              width: 270,
              height: 90,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 16
              },
              binding: {
                tableName: 'ventas',
                field: 'total',
                aggregation: 'sum',
                prefix: '€ ',
                template: 'Ingresos Totales'
              }
            },
            {
              id: 'el_min_kpi_2',
              type: 'kpi',
              name: 'KPI Pedidos',
              x: 345,
              y: 125,
              width: 270,
              height: 90,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 16
              },
              binding: {
                tableName: 'ventas',
                field: 'id',
                aggregation: 'count',
                suffix: ' pedidos',
                template: 'Operaciones'
              }
            },
            {
              id: 'el_min_kpi_3',
              type: 'kpi',
              name: 'KPI Clientes',
              x: 650,
              y: 125,
              width: 270,
              height: 90,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 16
              },
              binding: {
                tableName: 'clientes',
                field: 'id',
                aggregation: 'count',
                suffix: ' clientes',
                template: 'Usuarios Activos'
              }
            },
            // Line Chart Minimal
            {
              id: 'el_min_chart',
              type: 'chart',
              name: 'Gráfico Línea Ventas',
              x: 40,
              y: 235,
              width: 880,
              height: 200,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 16
              },
              binding: {
                tableName: 'ventas',
                chartType: 'line',
                labelField: 'fecha',
                valueField: 'total',
                template: 'Evolución de Ventas',
                chartColors: ['#0f172a']
              }
            },
            // Table Minimal
            {
              id: 'el_min_table',
              type: 'table',
              name: 'Tabla Transacciones',
              x: 40,
              y: 455,
              width: 880,
              height: 195,
              zIndex: 2,
              visible: true,
              locked: false,
              style: {
                backgroundColor: '#ffffff',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 12
              },
              binding: {
                tableName: 'ventas',
                columns: ['id', 'fecha', 'total', 'estado', 'metodoPago'],
                paginationMode: 'paginated',
                pageSize: 4,
                showPaginationControls: true,
                template: 'Últimas Operaciones'
              }
            }
          ]
        }
      ]
    }
  }
];

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = RAW_DASHBOARD_TEMPLATES.map(tpl => {
  const rootElements = (tpl.document.elements && tpl.document.elements.length > 0)
    ? tpl.document.elements
    : (tpl.document.pages?.[0]?.elements || []);

  return {
    ...tpl,
    document: {
      ...tpl.document,
      elements: rootElements
    }
  };
});
