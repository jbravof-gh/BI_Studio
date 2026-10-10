import { DatabaseExportJSON, CanvasDocument } from '../types';

export const SAMPLE_DATABASES: DatabaseExportJSON[] = [
  {
    databaseName: 'Tienda_Ventas_DB',
    version: 1,
    tables: [
      {
        name: 'productos',
        schema: '++id, nombre, categoria, precio, stock, calificacion, imagen',
        records: [
          { id: 1, nombre: 'Laptop Pro Max 16"', categoria: 'Computación', precio: 1499.99, stock: 45, calificacion: 4.8, imagen: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80' },
          { id: 2, nombre: 'Monitor 4K Ultrawide 34"', categoria: 'Pantallas', precio: 649.50, stock: 28, calificacion: 4.7, imagen: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&q=80' },
          { id: 3, nombre: 'Teclado Mecánico RGB', categoria: 'Accesorios', precio: 129.00, stock: 120, calificacion: 4.9, imagen: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&q=80' },
          { id: 4, nombre: 'Ratón Ergonómico Inalámbrico', categoria: 'Accesorios', precio: 79.99, stock: 85, calificacion: 4.6, imagen: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&q=80' },
          { id: 5, nombre: 'Auriculares Noise Cancelling', categoria: 'Audio', precio: 289.00, stock: 62, calificacion: 4.9, imagen: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80' },
          { id: 6, nombre: 'Silla Ergonómica Office', categoria: 'Mobiliario', precio: 349.00, stock: 19, calificacion: 4.5, imagen: 'https://images.unsplash.com/photo-1580481077197-28d82eb1118a?w=300&q=80' },
          { id: 7, nombre: 'Webcam 4K Ultra Studio', categoria: 'Streaming', precio: 159.00, stock: 40, calificacion: 4.4, imagen: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=300&q=80' }
        ]
      },
      {
        name: 'clientes',
        schema: '++id, nombre, email, ciudad, categoria, saldo',
        records: [
          { id: 1, nombre: 'Elena Rodriguez', email: 'elena.rodriguez@empresa.com', ciudad: 'Madrid', categoria: 'VIP Gold', saldo: 4520.00 },
          { id: 2, nombre: 'Carlos Mendoza', email: 'carlos.mendoza@tech.es', ciudad: 'Barcelona', categoria: 'Premium', saldo: 2850.50 },
          { id: 3, nombre: 'Lucía Fernández', email: 'lucia.f@designlab.org', ciudad: 'Valencia', categoria: 'VIP Platinum', saldo: 7900.00 },
          { id: 4, nombre: 'Mateo Morales', email: 'mateo.m@startup.io', ciudad: 'Sevilla', categoria: 'Estándar', saldo: 950.25 },
          { id: 5, nombre: 'Sofía Navarro', email: 'sofia.n@agencia.com', ciudad: 'Bilbao', categoria: 'Premium', saldo: 3410.00 }
        ]
      },
      {
        name: 'ventas',
        schema: '++id, fecha, clienteId, total, estado, articulos, metodoPago',
        records: [
          { id: 101, fecha: '2026-08-01', clienteId: 1, total: 1628.99, estado: 'Completado', articulos: 2, metodoPago: 'Tarjeta' },
          { id: 102, fecha: '2026-08-05', clienteId: 2, total: 649.50, estado: 'Completado', articulos: 1, metodoPago: 'Transferencia' },
          { id: 103, fecha: '2026-08-10', clienteId: 3, total: 2437.99, estado: 'Completado', articulos: 4, metodoPago: 'Tarjeta' },
          { id: 104, fecha: '2026-08-14', clienteId: 1, total: 349.00, estado: 'Procesando', articulos: 1, metodoPago: 'Bizum' },
          { id: 105, fecha: '2026-08-19', clienteId: 4, total: 208.99, estado: 'Completado', articulos: 2, metodoPago: 'Tarjeta' },
          { id: 106, fecha: '2026-08-22', clienteId: 5, total: 1107.00, estado: 'Enviado', articulos: 3, metodoPago: 'PayPal' }
        ]
      }
    ]
  },
  {
    databaseName: 'Recursos_Humanos_DB',
    version: 1,
    tables: [
      {
        name: 'empleados',
        schema: '++id, nombre, puesto, departamento, salario, fechaIngreso, desempeno',
        records: [
          { id: 1, nombre: 'Alejandro Sanz', puesto: 'Lead Developer', departamento: 'Ingeniería', salario: 55000, fechaIngreso: '2022-03-15', desempeno: 'Excelente' },
          { id: 2, nombre: 'Beatriz Gómez', puesto: 'Product Designer', departamento: 'Diseño', salario: 44000, fechaIngreso: '2023-01-10', desempeno: 'Sobresaliente' },
          { id: 3, nombre: 'David Castillo', puesto: 'Scrum Master', departamento: 'Gestión', salario: 48000, fechaIngreso: '2021-11-01', desempeno: 'Excelente' },
          { id: 4, nombre: 'Paula Ramos', puesto: 'DevOps Engineer', departamento: 'Ingeniería', salario: 52000, fechaIngreso: '2022-07-20', desempeno: 'Bueno' },
          { id: 5, nombre: 'Marcos Gil', puesto: 'Marketing Lead', departamento: 'Marketing', salario: 42000, fechaIngreso: '2023-05-18', desempeno: 'Excelente' }
        ]
      },
      {
        name: 'departamentos',
        schema: '++id, nombre, presupuesto, proyectosActivos, lider',
        records: [
          { id: 1, nombre: 'Ingeniería', presupuesto: 350000, proyectosActivos: 6, lider: 'Alejandro Sanz' },
          { id: 2, nombre: 'Diseño', presupuesto: 120000, proyectosActivos: 4, lider: 'Beatriz Gómez' },
          { id: 3, nombre: 'Marketing', presupuesto: 180000, proyectosActivos: 5, lider: 'Marcos Gil' },
          { id: 4, nombre: 'Gestión', presupuesto: 95000, proyectosActivos: 3, lider: 'David Castillo' }
        ]
      }
    ]
  },
  {
    databaseName: 'FlexLayoutDB',
    version: 160,
    tables: [
      {
        name: 'settings',
        schema: 'key',
        records: [
          {
            key: 'config',
            showHeader: true,
            showFooter: true,
            showNav: true,
            navCollapsed: false,
            showAside: false,
            sidebarWidth: 393,
            asideWidth: 290,
            theme: 'light',
            primaryColor: 'rose',
            appName: 'DataBase master',
            textSize: 'large',
            paddingSize: 'regular',
            preferredExportFormat: 'pdf',
            lastOpenedStore: 'databaseList',
            lastOpenedDb: 'FlexLayoutDB'
          }
        ]
      }
    ]
  }
];

export const DEMO_CANVAS_TEMPLATE: CanvasDocument = {
  id: 'template_resumen_ventas',
  name: 'Dashboard Resumen de Ventas',
  width: 960,
  height: 680,
  backgroundColor: '#f8fafc',
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
      id: 'page_dashboard_general',
      name: 'Dashboard General',
      backgroundColor: '#f8fafc',
      width: 960,
      height: 680,
      elements: [
        {
          id: 'el_header_bg',
          type: 'container',
          name: 'Encabezado Fondo',
          x: 30,
          y: 25,
          width: 900,
          height: 80,
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
          id: 'el_title',
          type: 'text',
          name: 'Título Principal',
          x: 55,
          y: 40,
          width: 500,
          height: 34,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            color: '#f8fafc',
            fontSize: 22,
            fontWeight: 'bold',
            textAlign: 'left'
          },
          binding: {
            template: '📊 Reporte Comercial - {{Tienda_Ventas_DB}}'
          }
        },
        {
          id: 'el_subtitle',
          type: 'text',
          name: 'Subtítulo',
          x: 55,
          y: 74,
          width: 500,
          height: 22,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            color: '#94a3b8',
            fontSize: 13,
            fontWeight: 'normal',
            textAlign: 'left'
          },
          binding: {
            template: 'Generado en tiempo real desde IndexedDB Dexie'
          }
        },
        {
          id: 'el_badge_status',
          type: 'badge',
          name: 'Badge Estado',
          x: 770,
          y: 48,
          width: 135,
          height: 34,
          zIndex: 3,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#10b981',
            color: '#ffffff',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: '600',
            textAlign: 'center'
          },
          binding: {
            template: '● BD Sincronizada',
            badgeVariant: 'success'
          }
        },
        {
          id: 'el_kpi_total_sales',
          type: 'kpi',
          name: 'KPI Total Ventas',
          x: 30,
          y: 125,
          width: 280,
          height: 110,
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
            tableName: 'ventas',
            field: 'total',
            aggregation: 'sum',
            prefix: '€ ',
            suffix: ' EUR',
            template: 'Volumen Facturado'
          }
        },
        {
          id: 'el_kpi_orders_count',
          type: 'kpi',
          name: 'KPI Num Pedidos',
          x: 340,
          y: 125,
          width: 280,
          height: 110,
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
            tableName: 'ventas',
            field: 'id',
            aggregation: 'count',
            suffix: ' pedidos',
            template: 'Total Transacciones'
          }
        },
        {
          id: 'el_kpi_products_count',
          type: 'kpi',
          name: 'KPI Productos',
          x: 650,
          y: 125,
          width: 280,
          height: 110,
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
            field: 'id',
            aggregation: 'count',
            suffix: ' referencias',
            template: 'Catálogo Activo'
          }
        },
        {
          id: 'el_chart_products',
          type: 'chart',
          name: 'Gráfico Precios Productos',
          x: 30,
          y: 255,
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
            template: 'Comparativa de Precios por Producto',
            limit: 5
          }
        },
        {
          id: 'el_table_clients',
          type: 'table',
          name: 'Tabla Clientes Principales',
          x: 490,
          y: 255,
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
            padding: 12,
            shadow: 'sm',
            fontSize: 12
          },
          binding: {
            tableName: 'clientes',
            columns: ['nombre', 'ciudad', 'categoria', 'saldo'],
            limit: 4,
            template: 'Directorio de Clientes VIP'
          }
        },
        {
          id: 'el_card_featured_product',
          type: 'card',
          name: 'Ficha Producto Destacado',
          x: 30,
          y: 520,
          width: 600,
          height: 130,
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
            recordIndex: 0,
            template: '⭐ Producto Estrella: {{nombre}} | Cat: {{categoria}} | Precio: €{{precio}} | Stock: {{stock}} uds | Nota: {{calificacion}}★'
          }
        },
        {
          id: 'el_qrcode_demo',
          type: 'qrcode',
          name: 'Código QR Verificación',
          x: 650,
          y: 520,
          width: 280,
          height: 130,
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
            template: 'https://indexeddb-canvas.app/report/101',
            prefix: 'Escanee para validar:'
          }
        }
      ]
    },
    {
      id: 'page_ventas_detalle',
      name: 'Ventas y Transacciones',
      backgroundColor: '#f8fafc',
      width: 960,
      height: 680,
      elements: [
        {
          id: 'el_ventas_header',
          type: 'container',
          name: 'Encabezado Ventas',
          x: 30,
          y: 25,
          width: 900,
          height: 75,
          zIndex: 1,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#1e293b',
            borderRadius: 12,
            padding: 16,
            shadow: 'md'
          },
          binding: {}
        },
        {
          id: 'el_ventas_title',
          type: 'text',
          name: 'Título Ventas',
          x: 55,
          y: 42,
          width: 600,
          height: 32,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            color: '#f8fafc',
            fontSize: 20,
            fontWeight: 'bold',
            textAlign: 'left'
          },
          binding: {
            template: '💳 Historial de Transacciones y Liquidaciones'
          }
        },
        {
          id: 'el_table_ventas_full',
          type: 'table',
          name: 'Tabla Transacciones Completas',
          x: 30,
          y: 120,
          width: 900,
          height: 520,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 16,
            shadow: 'sm',
            fontSize: 13
          },
          binding: {
            tableName: 'ventas',
            columns: ['id', 'fecha', 'clienteId', 'total', 'estado', 'articulos', 'metodoPago'],
            limit: 10,
            template: 'Registro Completo de Ventas'
          }
        }
      ]
    },
    {
      id: 'page_clientes_directorio',
      name: 'Directorio de Clientes',
      backgroundColor: '#f8fafc',
      width: 960,
      height: 680,
      elements: [
        {
          id: 'el_clientes_header',
          type: 'container',
          name: 'Encabezado Clientes',
          x: 30,
          y: 25,
          width: 900,
          height: 75,
          zIndex: 1,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#0c4a6e',
            borderRadius: 12,
            padding: 16,
            shadow: 'md'
          },
          binding: {}
        },
        {
          id: 'el_clientes_title',
          type: 'text',
          name: 'Título Clientes',
          x: 55,
          y: 42,
          width: 600,
          height: 32,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            color: '#f0f9ff',
            fontSize: 20,
            fontWeight: 'bold',
            textAlign: 'left'
          },
          binding: {
            template: '👥 Base de Datos y Segmentación de Clientes VIP'
          }
        },
        {
          id: 'el_table_clientes_all',
          type: 'table',
          name: 'Tabla Clientes Total',
          x: 30,
          y: 120,
          width: 580,
          height: 520,
          zIndex: 2,
          visible: true,
          locked: false,
          style: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 16,
            shadow: 'sm',
            fontSize: 13
          },
          binding: {
            tableName: 'clientes',
            columns: ['nombre', 'email', 'ciudad', 'categoria', 'saldo'],
            limit: 10,
            template: 'Cartera de Clientes'
          }
        },
        {
          id: 'el_kpi_client_vip',
          type: 'kpi',
          name: 'KPI Clientes Activos',
          x: 630,
          y: 120,
          width: 300,
          height: 120,
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
            field: 'id',
            aggregation: 'count',
            suffix: ' cuentas',
            template: 'Total Clientes Registrados'
          }
        },
        {
          id: 'el_chart_saldo_clientes',
          type: 'chart',
          name: 'Gráfico Saldo Clientes',
          x: 630,
          y: 260,
          width: 300,
          height: 380,
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
            chartType: 'bar',
            labelField: 'nombre',
            valueField: 'saldo',
            template: 'Saldo por Cliente (€)',
            limit: 5
          }
        }
      ]
    }
  ],
  elements: [
    {
      id: 'el_header_bg',
      type: 'container',
      name: 'Encabezado Fondo',
      x: 30,
      y: 25,
      width: 900,
      height: 80,
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
      id: 'el_title',
      type: 'text',
      name: 'Título Principal',
      x: 55,
      y: 40,
      width: 500,
      height: 34,
      zIndex: 2,
      visible: true,
      locked: false,
      style: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      binding: {
        template: '📊 Reporte Comercial - {{Tienda_Ventas_DB}}'
      }
    },
    {
      id: 'el_subtitle',
      type: 'text',
      name: 'Subtítulo',
      x: 55,
      y: 74,
      width: 500,
      height: 22,
      zIndex: 2,
      visible: true,
      locked: false,
      style: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: 'normal',
        textAlign: 'left'
      },
      binding: {
        template: 'Generado en tiempo real desde IndexedDB Dexie'
      }
    },
    {
      id: 'el_badge_status',
      type: 'badge',
      name: 'Badge Estado',
      x: 770,
      y: 48,
      width: 135,
      height: 34,
      zIndex: 3,
      visible: true,
      locked: false,
      style: {
        backgroundColor: '#10b981',
        color: '#ffffff',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center'
      },
      binding: {
        template: '● BD Sincronizada',
        badgeVariant: 'success'
      }
    },
    {
      id: 'el_kpi_total_sales',
      type: 'kpi',
      name: 'KPI Total Ventas',
      x: 30,
      y: 125,
      width: 280,
      height: 110,
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
        tableName: 'ventas',
        field: 'total',
        aggregation: 'sum',
        prefix: '€ ',
        suffix: ' EUR',
        template: 'Volumen Facturado'
      }
    },
    {
      id: 'el_kpi_orders_count',
      type: 'kpi',
      name: 'KPI Num Pedidos',
      x: 340,
      y: 125,
      width: 280,
      height: 110,
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
        tableName: 'ventas',
        field: 'id',
        aggregation: 'count',
        suffix: ' pedidos',
        template: 'Total Transacciones'
      }
    },
    {
      id: 'el_kpi_products_count',
      type: 'kpi',
      name: 'KPI Productos',
      x: 650,
      y: 125,
      width: 280,
      height: 110,
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
        field: 'id',
        aggregation: 'count',
        suffix: ' referencias',
        template: 'Catálogo Activo'
      }
    },
    {
      id: 'el_chart_products',
      type: 'chart',
      name: 'Gráfico Precios Productos',
      x: 30,
      y: 255,
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
        template: 'Comparativa de Precios por Producto',
        limit: 5
      }
    },
    {
      id: 'el_table_clients',
      type: 'table',
      name: 'Tabla Clientes Principales',
      x: 490,
      y: 255,
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
        padding: 12,
        shadow: 'sm',
        fontSize: 12
      },
      binding: {
        tableName: 'clientes',
        columns: ['nombre', 'ciudad', 'categoria', 'saldo'],
        limit: 4,
        template: 'Directorio de Clientes VIP'
      }
    },
    {
      id: 'el_card_featured_product',
      type: 'card',
      name: 'Ficha Producto Destacado',
      x: 30,
      y: 520,
      width: 600,
      height: 130,
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
        recordIndex: 0,
        template: '⭐ Producto Estrella: {{nombre}} | Cat: {{categoria}} | Precio: €{{precio}} | Stock: {{stock}} uds | Nota: {{calificacion}}★'
      }
    },
    {
      id: 'el_qrcode_demo',
      type: 'qrcode',
      name: 'Código QR Verificación',
      x: 650,
      y: 520,
      width: 280,
      height: 130,
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
        template: 'https://indexeddb-canvas.app/report/101',
        prefix: 'Escanee para validar:'
      }
    }
  ]
};

export const createEmptyCanvasDocument = (name = 'Nuevo Diseño'): CanvasDocument => {
  const initialPageId = `page_${Date.now()}_1`;
  return {
    id: `doc_${Date.now()}`,
    name: name,
    width: 960,
    height: 680,
    backgroundColor: '#ffffff',
    elements: [],
    activePageIndex: 0,
    pageTabsPosition: 'bottom',
    showPageTabs: true,
    pages: [
      {
        id: initialPageId,
        name: 'Página 1',
        elements: [],
        backgroundColor: '#ffffff',
        width: 960,
        height: 680
      }
    ],
    gridSize: 10,
    showGrid: true,
    snapToGrid: true,
    targetDatabase: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const EMPTY_CANVAS_TEMPLATE: CanvasDocument = {
  id: 'doc_empty_clean',
  name: 'Nuevo Diseño',
  width: 960,
  height: 680,
  backgroundColor: '#ffffff',
  elements: [],
  activePageIndex: 0,
  pageTabsPosition: 'bottom',
  showPageTabs: true,
  pages: [
    {
      id: 'page_empty_1',
      name: 'Página 1',
      elements: [],
      backgroundColor: '#ffffff',
      width: 960,
      height: 680
    }
  ],
  gridSize: 10,
  showGrid: true,
  snapToGrid: true,
  targetDatabase: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
