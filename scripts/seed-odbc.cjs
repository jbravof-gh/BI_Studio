const fs = require('fs');
const odbc = require('odbc');

async function setup() {
  const dbFile = '/var/lib/odbc_sample.db';
  const connStr = 'DRIVER=SQLite3;Database=' + dbFile + ';';
  const conn = await odbc.connect(connStr);
  
  await conn.query('CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, nombre TEXT, empresa TEXT, email TEXT, ciudad TEXT, telefono TEXT, fecha_alta TEXT);');
  await conn.query('DELETE FROM clientes;');
  await conn.query("INSERT INTO clientes (id, nombre, empresa, email, ciudad, telefono, fecha_alta) VALUES " +
    "(1, 'Carlos Mendoza', 'Logística Global', 'carlos@logistica.es', 'Madrid', '+34 912 345 678', '2025-01-15'), " +
    "(2, 'Beatriz Silva', 'TecnoIberia SL', 'bsilva@tecnoiberia.com', 'Barcelona', '+34 933 112 233', '2025-02-10'), " +
    "(3, 'Javier Ramos', 'Innova Retail', 'j.ramos@innovaretail.es', 'Valencia', '+34 963 889 900', '2025-03-01'), " +
    "(4, 'Elena Torres', 'BioSalud Pharma', 'elena@biosalud.es', 'Sevilla', '+34 954 667 788', '2025-03-12'), " +
    "(5, 'Marcos Ruiz', 'Construcciones Cantabria', 'mruiz@cantabriaconst.com', 'Santander', '+34 942 556 677', '2025-04-05');");

  await conn.query('CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY, sku TEXT, descripcion TEXT, categoria TEXT, precio REAL, stock INTEGER);');
  await conn.query('DELETE FROM productos;');
  await conn.query("INSERT INTO productos (id, sku, descripcion, categoria, precio, stock) VALUES " +
    "(1, 'PRD-101', 'Monitor UltraWide 34\" IPS', 'Monitores', 449.99, 24), " +
    "(2, 'PRD-102', 'Teclado Mecánico RGB Pro', 'Periféricos', 129.50, 68), " +
    "(3, 'PRD-103', 'Ratón Ergonómico Inalámbrico', 'Periféricos', 79.90, 115), " +
    "(4, 'PRD-104', 'Auriculares Cancelación Ruido', 'Audio', 199.00, 42), " +
    "(5, 'PRD-105', 'Hub Thunderbolt 4 10-en-1', 'Accesorios', 159.00, 31); ");

  await conn.query('CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY, numero_pedido TEXT, cliente_id INTEGER, fecha TEXT, total REAL, estado TEXT);');
  await conn.query('DELETE FROM pedidos;');
  await conn.query("INSERT INTO pedidos (id, numero_pedido, cliente_id, fecha, total, estado) VALUES " +
    "(1001, 'PED-2025-001', 1, '2025-05-01', 1249.50, 'Entregado'), " +
    "(1002, 'PED-2025-002', 2, '2025-05-03', 449.99, 'Enviado'), " +
    "(1003, 'PED-2025-003', 3, '2025-05-04', 387.80, 'Procesando'), " +
    "(1004, 'PED-2025-004', 1, '2025-05-06', 759.00, 'Entregado'), " +
    "(1005, 'PED-2025-005', 4, '2025-05-07', 2150.00, 'Completado'); ");

  await conn.close();
  console.log('Sample database created successfully!');

  const odbcIni = [
    '[ODBC Data Sources]',
    'Empresa_SQLite_DSN = Base de Datos Empresarial Local (ODBC SQLite)',
    '',
    '[Empresa_SQLite_DSN]',
    'Description = Base de Datos Empresarial Local (Clientes, Productos y Pedidos)',
    'Driver = SQLite3',
    'Database = /var/lib/odbc_sample.db',
    'Timeout = 5000',
    ''
  ].join('\n');
  
  fs.writeFileSync('/etc/odbc.ini', odbcIni, 'utf8');
  console.log('/etc/odbc.ini configured!');
}

setup().catch(console.error);
