import Dexie, { Table } from 'dexie';
import { DatabaseExportJSON, DatabaseInfo, TableInfo, CanvasDocument, TableRelationship, ExcelLinkedSource, TableExcelLink } from '../types';
import { SAMPLE_DATABASES, DEMO_CANVAS_TEMPLATE } from './sampleData';
import { pwaService } from './pwaService';

const DB_REGISTRY_KEY = 'dexie_registered_databases_v1';
const ACTIVE_DB_KEY = 'dexie_active_database_v1';
const EXCEL_LINKS_KEY = 'dexie_excel_linked_sources_v1';
const TABLE_EXCEL_LINKS_KEY = 'dexie_table_excel_links_v1';

export interface RawStoreSchema {
  name?: string;
  keyPath?: string | string[];
  autoIncrement?: boolean;
  indexes?: Array<string | { name?: string; keyPath?: string | string[]; unique?: boolean; multiEntry?: boolean }>;
}

export interface AnalyzedDatabase {
  name: string;
  version: number;
  tables: {
    name: string;
    schema: string;
    recordCount: number;
    fields: string[];
    sampleRecord?: Record<string, any>;
    records: Record<string, any>[];
  }[];
  relationships?: TableRelationship[];
  canvasDesigns?: CanvasDocument[];
  excelLinkedSource?: ExcelLinkedSource;
}

export interface DatabaseAnalysisResult {
  databases: AnalyzedDatabase[];
  totalTables: number;
  totalRecords: number;
  isValid: boolean;
  format: 'single-db' | 'multi-db' | 'raw-stores' | 'unknown';
}

export function isValidDexieIndexName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  // Strip Dexie modifiers: ++, &, *, or compound [a+b]
  const clean = trimmed.replace(/^(\+\+|&|\*)/, '').trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    const parts = clean.slice(1, -1).split('+');
    return parts.length > 0 && parts.every(p => /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(p.trim()));
  }
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(clean);
}

export function sanitizeDexieSchema(rawSchema: string | undefined): string {
  if (!rawSchema || typeof rawSchema !== 'string') return '++id';
  const parts = rawSchema.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return '++id';

  const [primKeyPart, ...indexParts] = parts;
  let cleanPrimKey = '++id';
  if (isValidDexieIndexName(primKeyPart)) {
    cleanPrimKey = primKeyPart;
  }

  const validIndexParts = indexParts.filter(p => isValidDexieIndexName(p));
  if (validIndexParts.length > 0) {
    return `${cleanPrimKey}, ${validIndexParts.join(', ')}`;
  }
  return cleanPrimKey;
}

export function extractSafeSchemaFromRecords(records?: any[]): string {
  if (!records || records.length === 0) return '++id';
  const sample = records[0];
  if (!sample || typeof sample !== 'object') return '++id';

  const keys = Object.keys(sample);
  // Find valid JS identifiers among keys (excluding id)
  const safeIndexes = keys
    .filter(k => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) && k.toLowerCase() !== 'id')
    .slice(0, 5);

  if (safeIndexes.length > 0) {
    return `++id, ${safeIndexes.join(', ')}`;
  }
  return '++id';
}

export function sanitizeTableName(rawName: string): string {
  let clean = rawName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-\.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  if (!clean || /^[0-9]/.test(clean)) {
    clean = `tabla_${clean || 'datos'}`;
  }
  return clean;
}

export function getTableSchemaString(table: Table<any, any>): string {
  try {
    const primKey = table.schema.primKey as any;
    const isAuto = Boolean(primKey?.autoIncrement ?? primKey?.auto);
    const primKeyStr = (isAuto ? '++' : '') + (primKey?.name || 'id');
    const indexStrs = (table.schema.indexes as any[])
      .map(i => {
        let name = i.name;
        if (i.unique) name = `&${name}`;
        else if (i.multiEntry || i.multi) name = `*${name}`;
        return name;
      })
      .filter(isValidDexieIndexName);

    if (indexStrs.length > 0) {
      return `${primKeyStr}, ${indexStrs.join(', ')}`;
    }
    return primKeyStr;
  } catch {
    return '++id';
  }
}

export function parseStoreSchemaToDexie(schema: RawStoreSchema | string | undefined, records?: any[]): string {
  if (typeof schema === 'string' && schema.trim()) {
    return sanitizeDexieSchema(schema.trim());
  }

  if (schema && typeof schema === 'object') {
    const autoIncrement = Boolean(schema.autoIncrement);
    let pk = 'id';
    if (schema.keyPath) {
      if (Array.isArray(schema.keyPath)) {
        pk = `[${schema.keyPath.join('+')}]`;
      } else {
        pk = schema.keyPath;
      }
    }
    const primKey = autoIncrement ? `++${pk}` : pk;

    const indexParts: string[] = [];
    if (Array.isArray(schema.indexes)) {
      for (const idx of schema.indexes) {
        if (typeof idx === 'string' && idx.trim()) {
          const trimmed = idx.trim();
          if (isValidDexieIndexName(trimmed)) {
            indexParts.push(trimmed);
          }
        } else if (idx && typeof idx === 'object') {
          let idxName = idx.name || (Array.isArray(idx.keyPath) ? `[${idx.keyPath.join('+')}]` : idx.keyPath);
          if (idxName && isValidDexieIndexName(idxName)) {
            if (idx.unique) idxName = `&${idxName}`;
            else if (idx.multiEntry) idxName = `*${idxName}`;
            indexParts.push(idxName);
          }
        }
      }
    }

    if (indexParts.length > 0) {
      return sanitizeDexieSchema(`${primKey}, ${indexParts.join(', ')}`);
    }
    return sanitizeDexieSchema(primKey);
  }

  // Generate fallback safely from records
  return extractSafeSchemaFromRecords(records);
}

export function normalizeDatabaseJSON(raw: any): DatabaseExportJSON {
  const databaseName = raw.databaseName || raw.name || raw.dbName || 'Nueva_BD';
  const version = typeof raw.version === 'number' && raw.version > 0 ? raw.version : 1;
  const rawStores = raw.stores || raw.tables || raw.tablesData || raw.data || [];

  const tables: { name: string; schema: string; records: Record<string, any>[] }[] = [];

  if (Array.isArray(rawStores)) {
    for (const store of rawStores) {
      if (!store) continue;
      const tableName = store.schema?.name || store.name || store.tableName || 'tabla';
      const records = Array.isArray(store.data)
        ? store.data
        : (Array.isArray(store.records) ? store.records : (Array.isArray(store.rows) ? store.rows : []));
      const schema = parseStoreSchemaToDexie(store.schema, records);

      tables.push({
        name: tableName,
        schema,
        records
      });
    }
  }

  return {
    databaseName,
    version,
    tables,
    relationships: Array.isArray(raw.relationships) ? raw.relationships : [],
    canvasDesigns: raw.canvasDesigns || [],
    excelLinkedSource: raw.excelLinkedSource
  };
}

class DexieManagerService {
  private activeDbName: string = '';
  private dbInstances: Map<string, Dexie> = new Map();
  public fileHandles: Map<string, any> = new Map(); // Store FileSystemFileHandle if browser permits
  public tableFileCache: Map<string, File> = new Map();
  private deletedDatabases: Set<string> = new Set();

  constructor() {
    this.activeDbName = '';
  }

  public getActiveDbName(): string {
    return this.activeDbName;
  }

  public setActiveDbName(name: string): void {
    this.activeDbName = name;
    localStorage.setItem(ACTIVE_DB_KEY, name);
  }

  private getKnownDatabases(): string[] {
    try {
      const stored = localStorage.getItem(DB_REGISTRY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map(n => String(n || '').trim()).filter(Boolean)));
        }
      }
    } catch (e) {
      console.error('Error reading DB registry', e);
    }
    return ['Tienda_Ventas_DB', 'Recursos_Humanos_DB', 'FlexLayoutDB'];
  }

  private saveKnownDatabases(dbs: string[]): void {
    const unique = Array.from(new Set(dbs.map(d => String(d || '').trim()).filter(Boolean)));
    localStorage.setItem(DB_REGISTRY_KEY, JSON.stringify(unique));
  }

  // --- Excel Linked Sources Registry ---

  public getExcelLinkedSource(dbName: string): ExcelLinkedSource | null {
    try {
      const raw = localStorage.getItem(`${EXCEL_LINKS_KEY}_${dbName}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading excel linked source:', e);
    }
    return null;
  }

  public saveExcelLinkedSource(source: ExcelLinkedSource): void {
    try {
      localStorage.setItem(`${EXCEL_LINKS_KEY}_${source.databaseName}`, JSON.stringify(source));
    } catch (e) {
      console.warn('Error saving excel linked source:', e);
    }
  }

  public deleteExcelLinkedSource(dbName: string): void {
    try {
      localStorage.removeItem(`${EXCEL_LINKS_KEY}_${dbName}`);
      this.fileHandles.delete(dbName);
    } catch (e) {
      console.warn('Error deleting excel linked source:', e);
    }
  }

  // --- Table-Level Excel Links ---

  public getTableExcelLink(dbName: string, tableName: string): TableExcelLink | null {
    try {
      const cleanTable = sanitizeTableName(tableName);
      const raw = localStorage.getItem(`${TABLE_EXCEL_LINKS_KEY}_${dbName}_${cleanTable}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading table excel link:', e);
    }
    return null;
  }

  public saveTableExcelLink(link: TableExcelLink): void {
    try {
      const cleanTable = sanitizeTableName(link.tableName);
      localStorage.setItem(
        `${TABLE_EXCEL_LINKS_KEY}_${link.databaseName}_${cleanTable}`,
        JSON.stringify({ ...link, tableName: cleanTable })
      );
    } catch (e) {
      console.warn('Error saving table excel link:', e);
    }
  }

  public deleteTableExcelLink(dbName: string, tableName: string): void {
    try {
      const cleanTable = sanitizeTableName(tableName);
      localStorage.removeItem(`${TABLE_EXCEL_LINKS_KEY}_${dbName}_${cleanTable}`);
      this.fileHandles.delete(`${dbName}_${cleanTable}`);
    } catch (e) {
      console.warn('Error deleting table excel link:', e);
    }
  }

  public listTableExcelLinks(dbName: string): TableExcelLink[] {
    try {
      const prefix = `${TABLE_EXCEL_LINKS_KEY}_${dbName}_`;
      const links: TableExcelLink[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            links.push(JSON.parse(raw));
          }
        }
      }
      return links;
    } catch (e) {
      console.warn('Error listing table excel links:', e);
      return [];
    }
  }

  public async initDefaultDatabasesIfEmpty(): Promise<void> {
    const list = await this.listDatabases();
    for (const sample of SAMPLE_DATABASES) {
      if (!list.includes(sample.databaseName)) {
        await this.importDatabaseJSON(sample);
      }
    }
    if (this.activeDbName && !list.includes(this.activeDbName)) {
      this.setActiveDbName('');
    }
    // Also save the demo canvas template
    try {
      const designs = await this.getCanvasDesigns('Tienda_Ventas_DB');
      if (designs.length === 0) {
        await this.saveCanvasDesign('Tienda_Ventas_DB', DEMO_CANVAS_TEMPLATE);
      }
      // Add default sample relationship for Tienda_Ventas_DB
      const rels = await this.getRelationships('Tienda_Ventas_DB');
      if (rels.length === 0) {
        await this.saveRelationship('Tienda_Ventas_DB', {
          id: 'rel_pedidos_clientes_demo',
          name: 'pedidos_a_clientes',
          sourceTable: 'pedidos',
          sourceField: 'cliente',
          targetTable: 'clientes',
          targetField: 'nombre',
          type: 'many-to-one',
          description: 'Relaciona el nombre de cliente en pedidos con la ficha de clientes',
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Could not save demo template or sample rels:', e);
    }

    // Cache all databases and schemas to Service Worker Cache for instant offline access
    this.cacheAllDatabasesForOffline().catch(() => {});
  }

  public async syncDatabaseSnapshotToPwaCache(dbName: string): Promise<void> {
    try {
      const snapshot = await this.exportDatabaseJSON(dbName);
      pwaService.cacheDatabaseSnapshot(dbName, snapshot);
    } catch (err) {
      console.warn('Error caching DB snapshot to PWA:', err);
    }
  }

  public async cacheAllDatabasesForOffline(): Promise<void> {
    try {
      const dbs = await this.listDatabases();
      for (const dbName of dbs) {
        await this.syncDatabaseSnapshotToPwaCache(dbName);
      }
    } catch (err) {
      console.warn('Error pre-caching databases for offline:', err);
    }
  }

  public async listDatabases(): Promise<string[]> {
    let names: string[] = [];
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        names = dbs
          .map(d => String(d.name || '').trim())
          .filter((n): n is string => Boolean(n));
      } catch (e) {
        console.warn('indexedDB.databases() not available or error:', e);
      }
    }
    const known = this.getKnownDatabases();
    const combined = Array.from(new Set([...names, ...known])).filter(d => !this.deletedDatabases.has(d));
    this.saveKnownDatabases(combined);
    return combined;
  }

  public async getDatabaseInfo(dbName: string, retryCount = 0): Promise<DatabaseInfo | null> {
    try {
      const db = await this.getDbInstance(dbName);
      if (!db.isOpen()) {
        await db.open();
      }
      const tables: TableInfo[] = [];

      for (const table of db.tables) {
        if (table.name === '_canvas_designs' || table.name === '_table_relationships') continue;

        try {
          const count = await table.count();
          const sampleRecord = (await table.limit(1).toArray())[0];
          const fields = sampleRecord ? Object.keys(sampleRecord) : [];

          // Try extracting schema safely
          const schema = getTableSchemaString(table);

          tables.push({
            name: table.name,
            schema: schema || '++id',
            recordCount: count,
            sampleRecord,
            fields
          });
        } catch (tblErr) {
          console.warn(`Error inspecting table ${table.name} in DB ${dbName}:`, tblErr);
        }
      }

      let designsCount = 0;
      if (db.tables.some(t => t.name === '_canvas_designs')) {
        try {
          designsCount = await db.table('_canvas_designs').count();
        } catch {}
      }

      return {
        name: dbName,
        version: db.verno,
        tables,
        designsCount
      };
    } catch (e) {
      if (retryCount === 0) {
        // Clear cached instance and retry once
        this.dbInstances.delete(dbName);
        return this.getDatabaseInfo(dbName, 1);
      }
      console.error(`Error getting info for DB ${dbName}:`, e);
      return null;
    }
  }

  public async getDbInstance(dbName: string, schemaOverride?: Record<string, string>): Promise<Dexie> {
    if (this.dbInstances.has(dbName) && !schemaOverride) {
      const existing = this.dbInstances.get(dbName)!;
      try {
        if (existing.isOpen()) {
          return existing;
        }
        await existing.open();
        if (existing.isOpen()) {
          return existing;
        }
      } catch {
        try { existing.close(); } catch {}
        this.dbInstances.delete(dbName);
      }
    }

    const db = new Dexie(dbName);

    if (schemaOverride) {
      db.version(1).stores({
        ...schemaOverride,
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      });
      try {
        await db.open();
      } catch (err) {
        console.warn(`Error opening DB ${dbName} with schema override:`, err);
      }
    } else {
      // Try opening existing schema dynamically
      try {
        await db.open();
      } catch {
        // If not open or needs schema, check if it's one of sample DBs or fallback
        const sample = SAMPLE_DATABASES.find(s => s.databaseName === dbName);
        if (sample) {
          const stores: Record<string, string> = {
            _canvas_designs: 'id, name, updatedAt',
            _table_relationships: 'id, name, sourceTable, targetTable'
          };
          for (const tbl of sample.tables) {
            stores[tbl.name] = tbl.schema;
          }
          try { db.close(); } catch {}
          const newDb = new Dexie(dbName);
          newDb.version(sample.version || 1).stores(stores);
          await newDb.open();

          // Check if records need to be populated
          try {
            for (const tbl of sample.tables) {
              if (tbl.records && tbl.records.length > 0) {
                const count = await newDb.table(tbl.name).count();
                if (count === 0) {
                  await newDb.table(tbl.name).bulkPut(tbl.records);
                }
              }
            }
          } catch (seedErr) {
            console.warn(`Error seeding sample DB ${dbName}:`, seedErr);
          }

          this.dbInstances.set(dbName, newDb);
          return newDb;
        } else {
          try {
            db.close();
            const fallbackDb = new Dexie(dbName);
            fallbackDb.version(1).stores({
              _canvas_designs: 'id, name, updatedAt',
              _table_relationships: 'id, name, sourceTable, targetTable'
            });
            await fallbackDb.open();
            this.dbInstances.set(dbName, fallbackDb);
            return fallbackDb;
          } catch (fallbackErr) {
            console.warn(`Could not open fallback DB for ${dbName}:`, fallbackErr);
          }
        }
      }
    }

    this.dbInstances.set(dbName, db);
    return db;
  }

  // --- JSON File Analysis & Selective Import/Export ---

  public analyzeDatabaseJSON(data: any): DatabaseAnalysisResult {
    const result: DatabaseAnalysisResult = {
      databases: [],
      totalTables: 0,
      totalRecords: 0,
      isValid: false,
      format: 'unknown'
    };

    if (!data) return result;

    let itemsToProcess: any[] = [];

    if (Array.isArray(data)) {
      result.format = 'multi-db';
      itemsToProcess = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.databases)) {
      result.format = 'multi-db';
      itemsToProcess = data.databases;
    } else if (data && typeof data === 'object') {
      result.format = 'single-db';
      itemsToProcess = [data];
    }

    for (const rawItem of itemsToProcess) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const normalized = normalizeDatabaseJSON(rawItem);
      const tablesAnalyzed = normalized.tables.map(t => {
        const sampleRecord = t.records[0] || {};
        const fields = Object.keys(sampleRecord);
        return {
          name: t.name,
          schema: t.schema,
          recordCount: t.records.length,
          fields,
          sampleRecord,
          records: t.records
        };
      });

      const totalRecs = tablesAnalyzed.reduce((acc, t) => acc + t.recordCount, 0);
      result.totalTables += tablesAnalyzed.length;
      result.totalRecords += totalRecs;

      result.databases.push({
        name: normalized.databaseName,
        version: normalized.version || 1,
        tables: tablesAnalyzed,
        relationships: normalized.relationships,
        canvasDesigns: normalized.canvasDesigns,
        excelLinkedSource: normalized.excelLinkedSource
      });
    }

    result.isValid = result.databases.length > 0 && result.totalTables > 0;
    return result;
  }

  public async importSelectiveDatabaseJSON(
    analyzedDb: AnalyzedDatabase,
    options: {
      targetDbName: string;
      selectedTableNames: string[];
      importRelationships?: boolean;
      importDesigns?: boolean;
      mode?: 'overwrite' | 'merge' | 'create_new';
    }
  ): Promise<{ success: boolean; message: string; databaseName: string }> {
    try {
      const targetDbName = options.targetDbName.trim();
      if (!targetDbName) throw new Error('El nombre de la base de datos es obligatorio.');

      const tablesToImport = analyzedDb.tables.filter(t => options.selectedTableNames.includes(t.name));
      if (tablesToImport.length === 0) {
        throw new Error('Selecciona al menos una tabla para importar.');
      }

      // Close previous instance if open
      if (this.dbInstances.has(targetDbName)) {
        const oldDb = this.dbInstances.get(targetDbName);
        if (oldDb?.isOpen()) oldDb.close();
        this.dbInstances.delete(targetDbName);
      }

      if (options.mode === 'overwrite') {
        await Dexie.delete(targetDbName);
      }

      const stores: Record<string, string> = {
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      };

      for (const table of tablesToImport) {
        stores[table.name] = table.schema || '++id';
      }

      const db = new Dexie(targetDbName);
      db.version(analyzedDb.version || 1).stores(stores);
      await db.open();

      for (const table of tablesToImport) {
        if (table.records && table.records.length > 0) {
          await db.table(table.name).bulkPut(table.records);
        }
      }

      // Import relationships if requested
      if (options.importRelationships && analyzedDb.relationships && analyzedDb.relationships.length > 0) {
        await db.table('_table_relationships').bulkPut(analyzedDb.relationships);
      }

      // Import canvas designs if requested
      if (options.importDesigns && analyzedDb.canvasDesigns && analyzedDb.canvasDesigns.length > 0) {
        await db.table('_canvas_designs').bulkPut(analyzedDb.canvasDesigns);
      }

      this.dbInstances.set(targetDbName, db);

      const known = this.getKnownDatabases();
      if (!known.includes(targetDbName)) {
        this.saveKnownDatabases([...known, targetDbName]);
      }
      this.setActiveDbName(targetDbName);

      if (analyzedDb.excelLinkedSource) {
        this.saveExcelLinkedSource({
          ...analyzedDb.excelLinkedSource,
          databaseName: targetDbName
        });
      }

      // Auto-cache snapshot to Service Worker cache
      this.syncDatabaseSnapshotToPwaCache(targetDbName).catch(() => {});

      return {
        success: true,
        databaseName: targetDbName,
        message: `Importada base de datos "${targetDbName}" (${tablesToImport.length} tablas, ${tablesToImport.reduce((acc, t) => acc + t.recordCount, 0)} registros).`
      };
    } catch (error: any) {
      console.error('Error in importSelectiveDatabaseJSON:', error);
      return {
        success: false,
        databaseName: options.targetDbName,
        message: error.message || 'Error al importar datos'
      };
    }
  }

  public async exportDatabaseSelectiveJSON(
    dbName: string,
    options?: {
      tableNames?: string[];
      includeRelationships?: boolean;
      includeDesigns?: boolean;
    }
  ): Promise<DatabaseExportJSON> {
    const db = await this.getDbInstance(dbName);
    const tablesData: { name: string; schema: string; records: Record<string, any>[] }[] = [];
    let canvasDesigns: CanvasDocument[] = [];
    let relationships: TableRelationship[] = [];

    const selectedTables = options?.tableNames;

    for (const table of db.tables) {
      if (table.name === '_canvas_designs') {
        if (options?.includeDesigns !== false) {
          canvasDesigns = await table.toArray();
        }
        continue;
      }
      if (table.name === '_table_relationships') {
        if (options?.includeRelationships !== false) {
          relationships = await table.toArray();
        }
        continue;
      }

      if (selectedTables && !selectedTables.includes(table.name)) {
        continue;
      }

      const records = await table.toArray();
      const schema = getTableSchemaString(table);
      tablesData.push({
        name: table.name,
        schema: schema || '++id',
        records
      });
    }

    const excelSource = this.getExcelLinkedSource(dbName);

    return {
      databaseName: dbName,
      version: db.verno,
      tables: tablesData,
      relationships,
      canvasDesigns,
      excelLinkedSource: excelSource || undefined
    };
  }

  // --- Excel Database Generation & Refresh ---

  public async createDatabaseFromExcel(
    dbName: string,
    workbookData: { sheetName: string; records: Record<string, any>[] }[],
    linkedInfo?: { fileName: string; fileSize?: number; lastModified?: number; isLinked: boolean }
  ): Promise<{ success: boolean; message: string; databaseName: string }> {
    try {
      const cleanDbName = dbName.trim();
      if (!cleanDbName) throw new Error('El nombre de la base de datos es obligatorio.');

      const validSheets = workbookData.filter(s => s.records && s.records.length > 0);
      if (validSheets.length === 0) {
        throw new Error('El archivo Excel no contiene filas con datos válidos.');
      }

      // Close previous instance if open
      if (this.dbInstances.has(cleanDbName)) {
        const oldDb = this.dbInstances.get(cleanDbName);
        if (oldDb?.isOpen()) oldDb.close();
        this.dbInstances.delete(cleanDbName);
      }

      const stores: Record<string, string> = {
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      };

      const tablesMapping: { sheetName: string; tableName: string; rowCount: number }[] = [];

      for (const sheet of validSheets) {
        const tableName = sanitizeTableName(sheet.sheetName);
        const schema = extractSafeSchemaFromRecords(sheet.records);

        stores[tableName] = schema;
        tablesMapping.push({
          sheetName: sheet.sheetName,
          tableName,
          rowCount: sheet.records.length
        });
      }

      const db = new Dexie(cleanDbName);
      db.version(1).stores(stores);
      await db.open();

      for (const sheet of validSheets) {
        const tableName = sanitizeTableName(sheet.sheetName);

        // Prepare records ensuring valid ids if needed
        const preparedRecords = sheet.records.map((r, idx) => {
          if (r.id === undefined || r.id === null || r.id === '') {
            return { id: idx + 1, ...r };
          }
          return r;
        });

        await db.table(tableName).bulkPut(preparedRecords);
      }

      this.dbInstances.set(cleanDbName, db);

      const known = this.getKnownDatabases();
      if (!known.includes(cleanDbName)) {
        this.saveKnownDatabases([...known, cleanDbName]);
      }
      this.setActiveDbName(cleanDbName);

      // Save Excel linked source metadata
      if (linkedInfo) {
        const sourceData: ExcelLinkedSource = {
          databaseName: cleanDbName,
          fileName: linkedInfo.fileName,
          fileSize: linkedInfo.fileSize,
          lastModified: linkedInfo.lastModified,
          lastSyncedAt: new Date().toISOString(),
          sheetNames: validSheets.map(s => s.sheetName),
          tablesMapping,
          isLinked: linkedInfo.isLinked
        };
        this.saveExcelLinkedSource(sourceData);
      }

      // Auto-cache snapshot to Service Worker cache
      this.syncDatabaseSnapshotToPwaCache(cleanDbName).catch(() => {});

      return {
        success: true,
        databaseName: cleanDbName,
        message: `Base de datos "${cleanDbName}" creada exitosamente desde Excel con ${validSheets.length} tabla(s).`
      };
    } catch (e: any) {
      console.error('Error creating database from Excel:', e);
      return {
        success: false,
        databaseName: dbName,
        message: e.message || 'Error al procesar el archivo Excel.'
      };
    }
  }

  public async refreshDatabaseFromExcel(
    dbName: string,
    workbookData: { sheetName: string; records: Record<string, any>[] }[],
    fileMeta?: { fileName?: string; fileSize?: number; lastModified?: number }
  ): Promise<{ success: boolean; message: string; rowsUpdated: number }> {
    try {
      const db = await this.getDbInstance(dbName);
      let totalRows = 0;
      const tablesMapping: { sheetName: string; tableName: string; rowCount: number }[] = [];

      for (const sheet of workbookData) {
        const tableName = sanitizeTableName(sheet.sheetName);

        if (db.tables.some(t => t.name === tableName)) {
          await db.table(tableName).clear();
          const prepared = sheet.records.map((r, idx) => ({ id: (r.id !== undefined && r.id !== null && r.id !== '') ? r.id : idx + 1, ...r }));
          await db.table(tableName).bulkPut(prepared);
          totalRows += prepared.length;
          tablesMapping.push({
            sheetName: sheet.sheetName,
            tableName,
            rowCount: prepared.length
          });
        }
      }

      // Update linked source metadata
      const existing = this.getExcelLinkedSource(dbName);
      if (existing) {
        this.saveExcelLinkedSource({
          ...existing,
          fileName: fileMeta?.fileName || existing.fileName,
          fileSize: fileMeta?.fileSize || existing.fileSize,
          lastModified: fileMeta?.lastModified || existing.lastModified,
          lastSyncedAt: new Date().toISOString(),
          tablesMapping: tablesMapping.length > 0 ? tablesMapping : existing.tablesMapping
        });
      }

      return {
        success: true,
        message: `Sincronización completada. ${totalRows} registros actualizados en "${dbName}".`,
        rowsUpdated: totalRows
      };
    } catch (e: any) {
      console.error('Error refreshing DB from Excel:', e);
      return {
        success: false,
        message: e.message || 'Error al refrescar la base de datos.',
        rowsUpdated: 0
      };
    }
  }

  public async addTableFromExcel(
    dbName: string,
    rawTableName: string,
    records: Record<string, any>[],
    linkInfo?: {
      fileName: string;
      sheetName: string;
      fileSize?: number;
      lastModified?: number;
      isLinked: boolean;
      autoRefreshIntervalMinutes?: number;
    }
  ): Promise<{ success: boolean; message: string; tableName: string }> {
    try {
      const cleanTableName = sanitizeTableName(rawTableName);
      if (!cleanTableName) {
        throw new Error('Nombre de tabla inválido');
      }

      // Check if DB exists
      const known = this.getKnownDatabases();
      if (!known.includes(dbName)) {
        await this.createDatabaseWithTables(dbName, [
          {
            name: cleanTableName,
            schema: extractSafeSchemaFromRecords(records),
            records
          }
        ]);
      } else {
        const res = await this.saveTableFromRecords(dbName, cleanTableName, records);
        if (!res.success) {
          throw new Error(res.message);
        }
      }

      // If linking is requested, save table link metadata
      if (linkInfo && linkInfo.isLinked) {
        this.saveTableExcelLink({
          databaseName: dbName,
          tableName: cleanTableName,
          fileName: linkInfo.fileName,
          sheetName: linkInfo.sheetName,
          fileSize: linkInfo.fileSize,
          lastModified: linkInfo.lastModified,
          lastSyncedAt: new Date().toISOString(),
          rowCount: records.length,
          isLinked: true,
          autoRefreshIntervalMinutes: linkInfo.autoRefreshIntervalMinutes ?? 0
        });
      }

      return {
        success: true,
        message: `Tabla "${cleanTableName}" añadida exitosamente desde Excel (${records.length} registros)${linkInfo?.isLinked ? ' y vinculada para sincronización' : ''}.`,
        tableName: cleanTableName
      };
    } catch (e: any) {
      console.error('Error adding table from Excel:', e);
      return {
        success: false,
        message: e.message || 'Error al añadir la tabla desde Excel',
        tableName: rawTableName
      };
    }
  }

  public async refreshTableFromExcel(
    dbName: string,
    tableName: string,
    records: Record<string, any>[],
    fileMeta?: { fileName?: string; fileSize?: number; lastModified?: number }
  ): Promise<{ success: boolean; message: string; rowsUpdated: number }> {
    try {
      const cleanTableName = sanitizeTableName(tableName);
      const db = await this.getDbInstance(dbName);

      if (!db.tables.some(t => t.name === cleanTableName)) {
        const res = await this.saveTableFromRecords(dbName, cleanTableName, records);
        if (!res.success) throw new Error(res.message);
      } else {
        await db.table(cleanTableName).clear();
        const prepared = records.map((r, idx) => ({
          id: (r.id !== undefined && r.id !== null && r.id !== '') ? r.id : idx + 1,
          ...r
        }));
        await db.table(cleanTableName).bulkPut(prepared);
      }

      // Update link metadata if exists
      const existingLink = this.getTableExcelLink(dbName, cleanTableName);
      if (existingLink) {
        this.saveTableExcelLink({
          ...existingLink,
          fileName: fileMeta?.fileName || existingLink.fileName,
          fileSize: fileMeta?.fileSize || existingLink.fileSize,
          lastModified: fileMeta?.lastModified || existingLink.lastModified,
          lastSyncedAt: new Date().toISOString(),
          rowCount: records.length
        });
      }

      this.syncDatabaseSnapshotToPwaCache(dbName).catch(() => {});

      return {
        success: true,
        message: `Tabla "${cleanTableName}" refrescada con éxito. ${records.length} registros actualizados.`,
        rowsUpdated: records.length
      };
    } catch (err: any) {
      console.error('Error refreshing table from Excel:', err);
      return {
        success: false,
        message: err.message || 'Error al refrescar la tabla desde Excel.',
        rowsUpdated: 0
      };
    }
  }

  // --- Table Relationships Management ---

  public async getRelationships(dbName: string): Promise<TableRelationship[]> {
    try {
      const db = await this.getDbInstance(dbName);
      if (!db.tables.some(t => t.name === '_table_relationships')) {
        // Upgrade DB schema dynamically to include _table_relationships
        const currentStores: Record<string, string> = {
          _canvas_designs: 'id, name, updatedAt',
          _table_relationships: 'id, name, sourceTable, targetTable'
        };
        for (const t of db.tables) {
          currentStores[t.name] = getTableSchemaString(t);
        }
        db.close();
        const upgradedDb = new Dexie(dbName);
        upgradedDb.version(db.verno + 1).stores(currentStores);
        await upgradedDb.open();
        this.dbInstances.set(dbName, upgradedDb);
        return [];
      }
      return await db.table('_table_relationships').toArray();
    } catch (e) {
      console.warn('Error fetching relationships:', e);
      return [];
    }
  }

  public async saveRelationship(dbName: string, rel: TableRelationship): Promise<void> {
    const db = await this.getDbInstance(dbName);
    if (!db.tables.some(t => t.name === '_table_relationships')) {
      const currentStores: Record<string, string> = {
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      };
      for (const t of db.tables) {
        currentStores[t.name] = getTableSchemaString(t);
      }
      db.close();
      const upgradedDb = new Dexie(dbName);
      upgradedDb.version(db.verno + 1).stores(currentStores);
      await upgradedDb.open();
      this.dbInstances.set(dbName, upgradedDb);
      await upgradedDb.table('_table_relationships').put(rel);
      return;
    }
    await db.table('_table_relationships').put(rel);
  }

  public async deleteRelationship(dbName: string, relId: string): Promise<void> {
    const db = await this.getDbInstance(dbName);
    if (db.tables.some(t => t.name === '_table_relationships')) {
      await db.table('_table_relationships').delete(relId);
    }
  }

  // --- Legacy Compatibility wrappers ---

  public async importDatabaseJSON(data: any): Promise<{ success: boolean; message: string; databaseName?: string }> {
    const analysis = this.analyzeDatabaseJSON(data);
    if (!analysis.isValid || analysis.databases.length === 0) {
      return { success: false, message: 'El archivo JSON no contiene una estructura de base de datos válida.' };
    }

    let lastDb = '';
    for (const db of analysis.databases) {
      const res = await this.importSelectiveDatabaseJSON(db, {
        targetDbName: db.name,
        selectedTableNames: db.tables.map(t => t.name),
        importRelationships: true,
        importDesigns: true,
        mode: 'overwrite'
      });
      if (res.success) {
        lastDb = res.databaseName;
      }
    }

    return {
      success: true,
      message: `${analysis.databases.length} base(s) de datos importada(s) con éxito.`,
      databaseName: lastDb
    };
  }

  public async exportDatabaseJSON(dbName: string): Promise<DatabaseExportJSON> {
    return this.exportDatabaseSelectiveJSON(dbName, {
      includeRelationships: true,
      includeDesigns: true
    });
  }

  public async deleteDatabase(dbName: string): Promise<void> {
    const cleanDbName = String(dbName || '').trim();
    if (!cleanDbName) return;

    // 1. Mark as deleted so listDatabases will immediately exclude it
    this.deletedDatabases.add(cleanDbName);

    // 2. Close and remove any cached instance
    if (this.dbInstances.has(cleanDbName)) {
      const db = this.dbInstances.get(cleanDbName);
      try {
        if (db?.isOpen()) db.close();
      } catch (e) {
        console.warn(`Error closing Dexie instance for ${cleanDbName}:`, e);
      }
      this.dbInstances.delete(cleanDbName);
    }

    // 3. Delete database in Dexie & IndexedDB
    try {
      await Dexie.delete(cleanDbName);
    } catch (e) {
      console.warn(`Dexie.delete failed for ${cleanDbName}, attempting native indexedDB.deleteDatabase:`, e);
      if (typeof indexedDB !== 'undefined') {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(cleanDbName);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
    }

    // 4. Clean up registry, Excel links, and active DB name
    this.deleteExcelLinkedSource(cleanDbName);
    const known = this.getKnownDatabases().filter(d => d !== cleanDbName);
    this.saveKnownDatabases(known);
    if (this.activeDbName === cleanDbName) {
      const remaining = known[0] || '';
      this.setActiveDbName(remaining);
    }
  }

  public async createDatabaseWithTables(
    dbName: string,
    tables: { name: string; schema: string; records?: Record<string, any>[] }[]
  ): Promise<void> {
    const stores: Record<string, string> = {
      _canvas_designs: 'id, name, updatedAt',
      _table_relationships: 'id, name, sourceTable, targetTable'
    };
    for (const t of tables) {
      const cleanName = sanitizeTableName(t.name);
      stores[cleanName] = sanitizeDexieSchema(t.schema || '++id');
    }

    const db = new Dexie(dbName);
    db.version(1).stores(stores);
    await db.open();

    for (const t of tables) {
      const cleanName = sanitizeTableName(t.name);
      if (t.records && t.records.length > 0) {
        await db.table(cleanName).bulkPut(t.records);
      }
    }

    this.dbInstances.set(dbName, db);
    this.deletedDatabases.delete(dbName);
    const known = this.getKnownDatabases();
    if (!known.includes(dbName)) {
      this.saveKnownDatabases([...known, dbName]);
    }
    this.setActiveDbName(dbName);
    this.syncDatabaseSnapshotToPwaCache(dbName).catch(() => {});
  }

  public async saveTableFromRecords(
    dbName: string,
    rawTableName: string,
    records: Record<string, any>[]
  ): Promise<{ success: boolean; message: string; tableName: string }> {
    try {
      const cleanTableName = sanitizeTableName(rawTableName);
      if (!cleanTableName) {
        throw new Error('El nombre de la tabla no es válido.');
      }

      // 1. Get existing database info
      const dbInfo = await this.getDatabaseInfo(dbName);
      const existingTables: { name: string; schema: string; records: Record<string, any>[] }[] = [];

      if (dbInfo && dbInfo.tables) {
        for (const t of dbInfo.tables) {
          if (t.name === cleanTableName) continue; // Will be replaced with fresh query records
          const recs = await this.getTableRecords(dbName, t.name);
          existingTables.push({
            name: t.name,
            schema: t.schema || '++id',
            records: recs
          });
        }
      }

      // Add the new table
      const newSchema = extractSafeSchemaFromRecords(records);
      existingTables.push({
        name: cleanTableName,
        schema: newSchema,
        records: records || []
      });

      // Preserve canvas designs and relationships
      const canvasDesigns = await this.getCanvasDesigns(dbName);
      const relationships = await this.getRelationships(dbName);

      // Close previous db
      if (this.dbInstances.has(dbName)) {
        const oldDb = this.dbInstances.get(dbName);
        if (oldDb?.isOpen()) oldDb.close();
        this.dbInstances.delete(dbName);
      }

      await Dexie.delete(dbName);

      const stores: Record<string, string> = {
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      };

      for (const t of existingTables) {
        stores[t.name] = t.schema || '++id';
      }

      const nextVersion = (dbInfo?.version || 1) + 1;
      const newDb = new Dexie(dbName);
      newDb.version(nextVersion).stores(stores);
      await newDb.open();

      for (const t of existingTables) {
        if (t.records && t.records.length > 0) {
          await newDb.table(t.name).bulkPut(t.records);
        }
      }

      if (canvasDesigns && canvasDesigns.length > 0) {
        await newDb.table('_canvas_designs').bulkPut(canvasDesigns);
      }
      if (relationships && relationships.length > 0) {
        await newDb.table('_table_relationships').bulkPut(relationships);
      }

      this.dbInstances.set(dbName, newDb);
      this.syncDatabaseSnapshotToPwaCache(dbName).catch(() => {});

      return {
        success: true,
        message: `Tabla "${cleanTableName}" creada exitosamente con ${records.length} registros.`,
        tableName: cleanTableName
      };
    } catch (err: any) {
      console.error('Error in saveTableFromRecords:', err);
      return {
        success: false,
        message: err.message || 'Error al guardar la tabla en la base de datos.',
        tableName: rawTableName
      };
    }
  }

  public async deleteTable(dbName: string, tableName: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanTableName = sanitizeTableName(tableName);
      const dbInfo = await this.getDatabaseInfo(dbName);
      if (!dbInfo) throw new Error('Base de datos no encontrada');

      const remainingTables: { name: string; schema: string; records: Record<string, any>[] }[] = [];
      for (const t of dbInfo.tables) {
        if (t.name === cleanTableName) continue;
        const recs = await this.getTableRecords(dbName, t.name);
        remainingTables.push({
          name: t.name,
          schema: t.schema || '++id',
          records: recs
        });
      }

      const canvasDesigns = await this.getCanvasDesigns(dbName);
      const relationships = await this.getRelationships(dbName);

      if (this.dbInstances.has(dbName)) {
        const oldDb = this.dbInstances.get(dbName);
        if (oldDb?.isOpen()) oldDb.close();
        this.dbInstances.delete(dbName);
      }

      await Dexie.delete(dbName);

      const stores: Record<string, string> = {
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      };

      for (const t of remainingTables) {
        stores[t.name] = t.schema || '++id';
      }

      const nextVersion = (dbInfo?.version || 1) + 1;
      const newDb = new Dexie(dbName);
      newDb.version(nextVersion).stores(stores);
      await newDb.open();

      for (const t of remainingTables) {
        if (t.records && t.records.length > 0) {
          await newDb.table(t.name).bulkPut(t.records);
        }
      }

      if (canvasDesigns && canvasDesigns.length > 0) {
        await newDb.table('_canvas_designs').bulkPut(canvasDesigns);
      }
      if (relationships && relationships.length > 0) {
        await newDb.table('_table_relationships').bulkPut(relationships);
      }

      this.dbInstances.set(dbName, newDb);
      this.deleteTableExcelLink(dbName, cleanTableName);
      this.syncDatabaseSnapshotToPwaCache(dbName).catch(() => {});

      return {
        success: true,
        message: `Tabla "${cleanTableName}" eliminada con éxito.`
      };
    } catch (err: any) {
      console.error('Error in deleteTable:', err);
      return {
        success: false,
        message: err.message || 'Error al eliminar la tabla'
      };
    }
  }

  public async getTableRecords(
    dbName: string,
    tableName: string,
    options?: {
      filterField?: string;
      filterValue?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<Record<string, any>[]> {
    try {
      const db = await this.getDbInstance(dbName);
      if (!db.tables.some(t => t.name === tableName)) {
        return [];
      }
      const table = db.table(tableName);

      const hasFilter = Boolean(options?.filterField && options.filterValue !== undefined && options.filterValue !== '');
      const hasSort = Boolean(options?.sortField);
      const limit = options?.limit;
      const offset = options?.offset || 0;

      // Fast-path: When no filter and no sort, use native Dexie cursor limit/offset without loading the full table
      if (!hasFilter && !hasSort) {
        let coll = table.toCollection();
        if (offset > 0) coll = coll.offset(offset);
        if (limit && limit > 0) coll = coll.limit(limit);
        return await coll.toArray();
      }

      // Fast-path with filter only: filter as stream, stop once limit is reached
      if (hasFilter && !hasSort) {
        const valStr = String(options!.filterValue).toLowerCase();
        const field = options!.filterField!;
        let coll = table.filter(r => String(r[field] ?? '').toLowerCase().includes(valStr));
        if (offset > 0) coll = coll.offset(offset);
        if (limit && limit > 0) coll = coll.limit(limit);
        return await coll.toArray();
      }

      // With sort or complex combination: fetch full table if limit not given, or bounded limit
      let records: Record<string, any>[] = (limit && limit > 0)
        ? await table.limit(Math.max(limit * 5, 500)).toArray()
        : await table.toArray();

      if (hasFilter) {
        const valStr = String(options!.filterValue).toLowerCase();
        const field = options!.filterField!;
        records = records.filter(r =>
          String(r[field] ?? '')
            .toLowerCase()
            .includes(valStr)
        );
      }

      if (hasSort) {
        const field = options!.sortField!;
        const isDesc = options?.sortOrder === 'desc';
        records.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          if (typeof valA === 'number' && typeof valB === 'number') {
            return isDesc ? valB - valA : valA - valB;
          }
          return isDesc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
        });
      }

      if (offset > 0) {
        records = records.slice(offset);
      }

      if (limit && limit > 0) {
        records = records.slice(0, limit);
      }

      return records;
    } catch (e) {
      console.error(`Error querying table ${tableName} on ${dbName}:`, e);
      return [];
    }
  }

  public async addRecord(dbName: string, tableName: string, record: Record<string, any>): Promise<any> {
    const db = await this.getDbInstance(dbName);
    return await db.table(tableName).add(record);
  }

  public async updateRecord(dbName: string, tableName: string, id: any, changes: Record<string, any>): Promise<any> {
    const db = await this.getDbInstance(dbName);
    return await db.table(tableName).update(id, changes);
  }

  public async deleteRecord(dbName: string, tableName: string, id: any): Promise<void> {
    const db = await this.getDbInstance(dbName);
    await db.table(tableName).delete(id);
  }

  // --- Canvas Document persistence inside active DB ---

  public async saveCanvasDesign(dbName: string, canvas: CanvasDocument): Promise<void> {
    const db = await this.getDbInstance(dbName);
    if (!db.tables.some(t => t.name === '_canvas_designs')) {
      const currentStores: Record<string, string> = {
        _canvas_designs: 'id, name, updatedAt',
        _table_relationships: 'id, name, sourceTable, targetTable'
      };
      for (const t of db.tables) {
        currentStores[t.name] = t.schema.indexes.map(i => i.name).join(', ') || t.schema.primKey.name;
      }
      db.close();
      const upgradedDb = new Dexie(dbName);
      upgradedDb.version(db.verno + 1).stores(currentStores);
      await upgradedDb.open();
      this.dbInstances.set(dbName, upgradedDb);
      await upgradedDb.table('_canvas_designs').put(canvas);
      return;
    }
    await db.table('_canvas_designs').put(canvas);
  }

  public async getCanvasDesigns(dbName: string): Promise<CanvasDocument[]> {
    try {
      const db = await this.getDbInstance(dbName);
      if (!db.tables.some(t => t.name === '_canvas_designs')) {
        return [];
      }
      return await db.table('_canvas_designs').toArray();
    } catch (e) {
      console.warn('Error fetching canvas designs:', e);
      return [];
    }
  }

  public async deleteCanvasDesign(dbName: string, designId: string): Promise<void> {
    const db = await this.getDbInstance(dbName);
    if (db.tables.some(t => t.name === '_canvas_designs')) {
      await db.table('_canvas_designs').delete(designId);
    }
  }
}

export const dexieManager = new DexieManagerService();

