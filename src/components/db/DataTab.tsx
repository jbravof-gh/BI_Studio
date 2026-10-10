import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DatabaseInfo, TableInfo, TableExcelLink } from '../../types';
import { dexieManager } from '../../services/dexieManager';
import { SAMPLE_DATABASES } from '../../services/sampleData';
import { AddExcelTableModal } from './AddExcelTableModal';
import {
  Database,
  Table as TableIcon,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  Link as LinkIcon,
  Unlink,
  Clock,
  RefreshCw,
  Info,
  Loader2,
  Sliders
} from 'lucide-react';

interface DataTabProps {
  databases: string[];
  selectedDb: string;
  activeDbName: string;
  onSelectDatabase: (name: string) => void;
  onSetActiveDatabase?: (name: string) => void;
  onDbChanged: () => void;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
  onGenerateLayout?: (tableName: string) => void;
}

export const DataTab: React.FC<DataTabProps> = ({
  databases,
  selectedDb,
  activeDbName,
  onSelectDatabase,
  onSetActiveDatabase,
  onDbChanged,
  onNotification,
  onGenerateLayout
}) => {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [activeTable, setActiveTable] = useState<string>('');
  const [tableRecords, setTableRecords] = useState<Record<string, any>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // New DB form
  const [showNewDbForm, setShowNewDbForm] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newTableName, setNewTableName] = useState('articulos');
  const [newTableSchema, setNewTableSchema] = useState('++id, titulo, precio, categoria');

  // New Record form
  const [showNewRecordForm, setShowNewRecordForm] = useState(false);
  const [recordJsonInput, setRecordJsonInput] = useState('');

  // Edit Record state
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);

  // Deletion confirmation modals (replaces native window.confirm which is blocked in iframes)
  const [dbToDelete, setDbToDelete] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [isDeletingDb, setIsDeletingDb] = useState<boolean>(false);

  // Pagination & Display Configuration
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Excel Table Addition & Link State
  const [showAddExcelModal, setShowAddExcelModal] = useState(false);
  const [activeTableLink, setActiveTableLink] = useState<TableExcelLink | null>(null);
  const [isRefreshingTable, setIsRefreshingTable] = useState(false);
  const [linkVersion, setLinkVersion] = useState(0);
  const refreshFileInputRef = useRef<HTMLInputElement>(null);

  // Table Deletion State
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeletingTable, setIsDeletingTable] = useState(false);

  // Requisito 4: LIMIT configurable por defecto de 100 registros modificable
  const [recordLimit, setRecordLimit] = useState<number>(100);
  const [isLoadingAllRecords, setIsLoadingAllRecords] = useState<boolean>(false);
  const currentLoadingTargetRef = useRef<{ db: string; table: string }>({ db: '', table: '' });

  useEffect(() => {
    if (selectedDb) {
      loadDbDetails(selectedDb);
    } else {
      setDbInfo(null);
      setActiveTable('');
      setTableRecords([]);
    }
  }, [selectedDb]);

  useEffect(() => {
    if (selectedDb && activeTable) {
      loadTableData(selectedDb, activeTable, recordLimit);
    } else {
      setTableRecords([]);
    }
  }, [selectedDb, activeTable, recordLimit]);

  useEffect(() => {
    if (selectedDb && activeTable) {
      const link = dexieManager.getTableExcelLink(selectedDb, activeTable);
      setActiveTableLink(link);
    } else {
      setActiveTableLink(null);
    }
  }, [selectedDb, activeTable, linkVersion]);

  // Periodic Auto-Refresh Effect for Linked Tables
  useEffect(() => {
    if (!selectedDb || !activeTable || !activeTableLink || !activeTableLink.isLinked) return;
    const intervalMinutes = activeTableLink.autoRefreshIntervalMinutes || 0;
    if (intervalMinutes <= 0) return;

    const intervalMs = intervalMinutes * 60 * 1000;
    const timer = setInterval(async () => {
      const cachedFile = dexieManager.tableFileCache.get(`${selectedDb}_${activeTable}`);
      if (cachedFile) {
        try {
          const arrayBuffer = await cachedFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const targetSheet = activeTableLink.sheetName && workbook.Sheets[activeTableLink.sheetName]
            ? activeTableLink.sheetName
            : workbook.SheetNames[0];

          const worksheet = workbook.Sheets[targetSheet];
          if (worksheet) {
            const rawRecords = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
            if (rawRecords.length > 0) {
              const sanitizedRecords = rawRecords.map((r, idx) => {
                const clean: Record<string, any> = {};
                for (const [k, v] of Object.entries(r)) {
                  const cleanK = String(k).trim();
                  if (cleanK) clean[cleanK] = v;
                }
                if (clean.id === undefined && clean.ID === undefined && clean.Id === undefined) {
                  clean.id = idx + 1;
                }
                return clean;
              });

              await dexieManager.refreshTableFromExcel(selectedDb, activeTable, sanitizedRecords, {
                fileName: cachedFile.name,
                fileSize: cachedFile.size,
                lastModified: cachedFile.lastModified
              });

              loadTableData(selectedDb, activeTable);
              loadDbDetails(selectedDb);
              setLinkVersion(v => v + 1);
              onNotification({
                type: 'success',
                text: `Auto-refresco periódico: tabla "${activeTable}" sincronizada con ${cachedFile.name} (${sanitizedRecords.length} filas).`
              });
            }
          }
        } catch (err) {
          console.warn('Error in periodic table auto-refresh:', err);
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [selectedDb, activeTable, activeTableLink, linkVersion]);

  const loadDbDetails = async (name: string) => {
    setLoading(true);
    try {
      const info = await dexieManager.getDatabaseInfo(name);
      setDbInfo(info);
      // Requisito 3: Al seleccionar una base de datos se mostraran en la parte superior las tablas disponibles
      // con badge de numero de registros. La parte central permanece vacia todavia (no auto-seleccionar tabla).
      setActiveTable('');
      setTableRecords([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (dbName: string, tableName: string, limitOverride?: number) => {
    if (!dbName || !tableName) {
      setTableRecords([]);
      return;
    }

    currentLoadingTargetRef.current = { db: dbName, table: tableName };
    const targetRef = currentLoadingTargetRef.current;
    const effectiveLimit = limitOverride !== undefined ? limitOverride : recordLimit;

    setLoading(true);
    try {
      // Requisito 4: Al seleccionar una tabla, se muestra una tabla fisica con los registros con un LIMIT por defecto de 100 registros modificable
      const options = effectiveLimit > 0 ? { limit: effectiveLimit } : undefined;
      const records = await dexieManager.getTableRecords(dbName, tableName, options);
      if (currentLoadingTargetRef.current.db !== targetRef.db || currentLoadingTargetRef.current.table !== targetRef.table) {
        return;
      }
      setTableRecords(records);
    } catch (e) {
      console.error(e);
    } finally {
      if (currentLoadingTargetRef.current.db === targetRef.db && currentLoadingTargetRef.current.table === targetRef.table) {
        setLoading(false);
      }
    }
  };

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;

    try {
      await dexieManager.createDatabaseWithTables(newDbName.trim(), [
        {
          name: newTableName.trim() || 'items',
          schema: newTableSchema.trim() || '++id, nombre',
          records: [
            { id: 1, nombre: 'Primer Elemento Ejemplo', categoria: 'General', precio: 100 }
          ]
        }
      ]);
      onNotification({ type: 'success', text: `Base de datos "${newDbName}" creada exitosamente.` });
      setShowNewDbForm(false);
      setNewDbName('');
      onSelectDatabase(newDbName.trim());
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al crear base de datos' });
    }
  };

  const handleDeleteDatabase = (dbName: string) => {
    setDbToDelete(dbName);
  };

  const handleConfirmDeleteDb = async () => {
    if (!dbToDelete) return;
    const targetDb = dbToDelete;
    setIsDeletingDb(true);
    try {
      await dexieManager.deleteDatabase(targetDb);
      onNotification({ type: 'success', text: `Base de datos "${targetDb}" eliminada permanentemente.` });

      // Determine next database to select
      const remainingDbs = databases.filter(d => d !== targetDb);
      if (selectedDb === targetDb) {
        const nextDb = remainingDbs[0] || '';
        if (nextDb) {
          onSelectDatabase(nextDb);
        } else {
          setDbInfo(null);
          setActiveTable('');
          setTableRecords([]);
        }
      }
      setDbToDelete(null);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al eliminar base de datos' });
    } finally {
      setIsDeletingDb(false);
    }
  };

  const handleAddSampleDatabase = async (sampleIndex: number) => {
    const sample = SAMPLE_DATABASES[sampleIndex];
    if (!sample) return;
    try {
      const res = await dexieManager.importDatabaseJSON(sample);
      onNotification({ type: 'success', text: `Cargada base de datos: ${sample.databaseName}` });
      onSelectDatabase(sample.databaseName);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message });
    }
  };

  const handleSaveNewRecord = async () => {
    try {
      const parsed = JSON.parse(recordJsonInput);
      await dexieManager.addRecord(selectedDb, activeTable, parsed);
      onNotification({ type: 'success', text: 'Registro añadido con éxito.' });
      setShowNewRecordForm(false);
      setRecordJsonInput('');
      loadTableData(selectedDb, activeTable);
      loadDbDetails(selectedDb);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: 'JSON inválido: ' + err.message });
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    try {
      const primaryKeyField = currentTable?.schema ? currentTable.schema.split(',')[0].replace('++', '').trim() : 'id';
      const recordKey = editingRecord[primaryKeyField] ?? editingRecord.id ?? editingRecord.key;
      await dexieManager.updateRecord(selectedDb, activeTable, recordKey, editingRecord);
      onNotification({ type: 'success', text: 'Registro actualizado con éxito.' });
      setEditingRecord(null);
      loadTableData(selectedDb, activeTable);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message });
    }
  };

  const handleDeleteRecord = (id: any) => {
    setRecordToDelete(id);
  };

  const handleConfirmDeleteRecord = async () => {
    if (recordToDelete === null || recordToDelete === undefined) return;
    const id = recordToDelete;
    try {
      await dexieManager.deleteRecord(selectedDb, activeTable, id);
      onNotification({ type: 'success', text: 'Registro eliminado con éxito.' });
      setRecordToDelete(null);
      loadTableData(selectedDb, activeTable);
      loadDbDetails(selectedDb);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al eliminar el registro.' });
    }
  };

  // Refresh Active Table from Excel
  const handleTriggerRefreshTable = () => {
    if (refreshFileInputRef.current) {
      refreshFileInputRef.current.click();
    }
  };

  const handleProcessRefreshFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDb || !activeTable) return;

    setIsRefreshingTable(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const link = dexieManager.getTableExcelLink(selectedDb, activeTable);
      const targetSheetName = link?.sheetName && workbook.Sheets[link.sheetName]
        ? link.sheetName
        : workbook.SheetNames[0];

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        throw new Error(`No se encontró la hoja "${targetSheetName}" en el archivo.`);
      }

      const rawRecords = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawRecords.length === 0) {
        throw new Error(`La hoja "${targetSheetName}" está vacía.`);
      }

      const sanitizedRecords = rawRecords.map((r, idx) => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          const cleanK = String(k).trim();
          if (cleanK) clean[cleanK] = v;
        }
        if (clean.id === undefined && clean.ID === undefined && clean.Id === undefined) {
          clean.id = idx + 1;
        }
        return clean;
      });

      const res = await dexieManager.refreshTableFromExcel(selectedDb, activeTable, sanitizedRecords, {
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified
      });

      if (res.success) {
        // Cache in memory for session
        dexieManager.tableFileCache.set(`${selectedDb}_${activeTable}`, file);

        // Update link
        dexieManager.saveTableExcelLink({
          databaseName: selectedDb,
          tableName: activeTable,
          fileName: file.name,
          sheetName: targetSheetName,
          fileSize: file.size,
          lastModified: file.lastModified,
          lastSyncedAt: new Date().toISOString(),
          rowCount: sanitizedRecords.length,
          isLinked: true,
          autoRefreshIntervalMinutes: link?.autoRefreshIntervalMinutes ?? 5
        });

        await loadTableData(selectedDb, activeTable);
        await loadDbDetails(selectedDb);
        setLinkVersion(v => v + 1);
        onDbChanged();
        onNotification({ type: 'success', text: res.message });
      } else {
        onNotification({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: `Error al refrescar tabla: ${err.message || err}` });
    } finally {
      setIsRefreshingTable(false);
      e.target.value = '';
    }
  };

  const handleUnlinkTable = () => {
    if (!selectedDb || !activeTable) return;
    dexieManager.deleteTableExcelLink(selectedDb, activeTable);
    setLinkVersion(v => v + 1);
    onNotification({
      type: 'success',
      text: `Tabla "${activeTable}" desvinculada del archivo Excel.`
    });
  };

  const handleChangeAutoRefreshInterval = (minutes: number) => {
    if (!selectedDb || !activeTable || !activeTableLink) return;
    const updated: TableExcelLink = {
      ...activeTableLink,
      autoRefreshIntervalMinutes: minutes
    };
    dexieManager.saveTableExcelLink(updated);
    setLinkVersion(v => v + 1);
    onNotification({
      type: 'success',
      text: minutes === 0
        ? `Auto-refresco desactivado para la tabla "${activeTable}".`
        : `Auto-refresco configurado cada ${minutes} min para la tabla "${activeTable}".`
    });
  };

  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete || !selectedDb) return;
    setIsDeletingTable(true);
    try {
      const res = await dexieManager.deleteTable(selectedDb, tableToDelete);
      if (res.success) {
        onNotification({ type: 'success', text: res.message });
        await loadDbDetails(selectedDb);
        onDbChanged();
      } else {
        onNotification({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      onNotification({ type: 'error', text: e.message || 'Error al eliminar tabla' });
    } finally {
      setIsDeletingTable(false);
      setTableToDelete(null);
    }
  };

  const currentTable = dbInfo?.tables.find(t => t.name === activeTable);

  // Stable list of columns derived from schema and records
  const tableColumns = useMemo(() => {
    if (!tableRecords || tableRecords.length === 0) {
      if (currentTable?.schema) {
        return currentTable.schema
          .split(',')
          .map(s => s.replace('++', '').replace('&', '').replace('*', '').trim())
          .filter(Boolean);
      }
      return [];
    }
    const keysSet = new Set<string>();
    if (currentTable?.schema) {
      const schemaFields = currentTable.schema
        .split(',')
        .map(s => s.replace('++', '').replace('&', '').replace('*', '').trim())
        .filter(Boolean);
      schemaFields.forEach(f => keysSet.add(f));
    }
    tableRecords.forEach(r => {
      if (r && typeof r === 'object') {
        Object.keys(r).forEach(k => keysSet.add(k));
      }
    });
    return Array.from(keysSet);
  }, [tableRecords, currentTable]);

  // Filter records based on search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return tableRecords;
    const term = searchTerm.toLowerCase();
    return tableRecords.filter(r =>
      Object.values(r).some(val =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [tableRecords, searchTerm]);

  // Sort records if column sort is set
  const sortedRecords = useMemo(() => {
    if (!sortColumn) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Numeric comparison (numbers or parseable numeric strings)
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && String(valA).trim() !== '' && String(valB).trim() !== '') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Date comparison
      const dateA = Date.parse(String(valA));
      const dateB = Date.parse(String(valB));
      if (!isNaN(dateA) && !isNaN(dateB) && String(valA).length > 6 && String(valB).length > 6 && (String(valA).includes('-') || String(valA).includes('/'))) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
        : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredRecords, sortColumn, sortDirection]);

  // Pagination bounds and slice
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Reset to page 1 when switching table, DB, or searching
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [activeTable, selectedDb, searchTerm]);

  // Ensure current page does not exceed totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
      setJumpPageInput('');
    }
  };

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#202225] text-[#e1e1e6]">
      {/* Left Sidebar: Databases List */}
      <div className="w-64 border-r border-[#2f3136] bg-[#1a1b1e] flex flex-col p-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
            Bases de Datos ({databases.length})
          </span>
          <button
            onClick={() => setShowNewDbForm(!showNewDbForm)}
            className="p-1 text-[#5865f2] hover:bg-[#2f3136] rounded"
            title="Crear nueva base de datos"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* New DB Inline Form */}
        {showNewDbForm && (
          <form onSubmit={handleCreateDatabase} className="p-2.5 bg-[#25282c] rounded-lg border border-[#5865f2]/40 shadow-sm space-y-2 text-xs">
            <div className="font-semibold text-[#5865f2]">Nueva Base de Datos</div>
            <input
              type="text"
              placeholder="Nombre BD (ej: Facturacion_DB)"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
              required
            />
            <input
              type="text"
              placeholder="Tabla inicial (ej: facturas)"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
            />
            <input
              type="text"
              placeholder="Esquema: ++id, num, total, cliente"
              value={newTableSchema}
              onChange={(e) => setNewTableSchema(e.target.value)}
              className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs font-mono text-[#e1e1e6]"
            />
            <div className="flex gap-1 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowNewDbForm(false)}
                className="px-2 py-1 bg-[#1a1b1e] hover:bg-[#2f3136] text-[#9ca3af] rounded text-[11px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-2 py-1 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold rounded text-[11px]"
              >
                Crear
              </button>
            </div>
          </form>
        )}

        {/* Databases list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {databases.map((name, dbIdx) => {
            const isSelected = name === selectedDb;
            const isActive = name === activeDbName;
            return (
              <div
                key={`db_mgr_item_${name}_${dbIdx}`}
                onClick={() => onSelectDatabase(name)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-[#5865f2]/15 border-[#5865f2] ring-1 ring-[#5865f2] font-semibold text-white'
                    : 'bg-[#202225] hover:bg-[#25282c] border-[#2f3136] text-[#e1e1e6]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-[#9ca3af]'}`} />
                  <div className="truncate">
                    <div className="text-xs truncate">{name}</div>
                    {isActive && (
                      <div className="text-[10px] text-emerald-400 font-medium">● Activa en Editor</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isActive && (
                    <button
                      onClick={() => {
                        onSelectDatabase(name);
                        onDbChanged();
                      }}
                      title="Usar como activa en el Canvas"
                      className="p-1 text-[#9ca3af] hover:text-emerald-400 rounded hover:bg-[#2f3136] text-[10px] uppercase font-bold"
                    >
                      Usar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDatabase(name)}
                    title="Eliminar base de datos"
                    className="p-1 text-[#9ca3af] hover:text-rose-400 rounded hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demo DB Quick Load */}
        <div className="p-2.5 bg-[#202225] rounded-lg border border-[#2f3136] text-xs space-y-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#9ca3af] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ejemplos Disponibles</span>
          </div>
          <button
            onClick={() => handleAddSampleDatabase(0)}
            className="w-full text-left px-2 py-1 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] rounded text-[11px] text-[#e1e1e6] hover:text-[#5865f2] transition flex items-center justify-between"
          >
            <span>Tienda Ventas</span>
            <span className="text-[10px] text-[#9ca3af]">3 tablas</span>
          </button>
          <button
            onClick={() => handleAddSampleDatabase(1)}
            className="w-full text-left px-2 py-1 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] rounded text-[11px] text-[#e1e1e6] hover:text-[#5865f2] transition flex items-center justify-between"
          >
            <span>Recursos Humanos</span>
            <span className="text-[10px] text-[#9ca3af]">2 tablas</span>
          </button>
          <button
            onClick={() => handleAddSampleDatabase(2)}
            className="w-full text-left px-2 py-1 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] rounded text-[11px] text-[#e1e1e6] hover:text-[#5865f2] transition flex items-center justify-between"
          >
            <span>FlexLayoutDB</span>
            <span className="text-[10px] text-[#9ca3af]">1 tabla</span>
          </button>
        </div>
      </div>

      {/* Right Main Area: Tables & Records Inspector */}
      <div className="flex-1 flex flex-col bg-[#202225] overflow-hidden">
        {!selectedDb ? (
          /* Requisito 2: La parte central del modal estara vacia hasta que se seleccione una base de datos */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#202225] select-none">
            <div className="w-16 h-16 rounded-2xl bg-[#25282c] border border-[#2f3136] flex items-center justify-center mb-4 text-[#9ca3af] shadow-inner">
              <Database className="w-8 h-8 opacity-40 text-[#5865f2]" />
            </div>
            <h4 className="text-base font-bold text-white mb-1.5">
              Ninguna base de datos seleccionada
            </h4>
            <p className="text-xs text-[#9ca3af] max-w-sm leading-relaxed">
              Selecciona una base de datos en la barra izquierda para ver sus tablas disponibles y explorar sus datos.
            </p>
          </div>
        ) : (
          <>
            {/* Database Banner & Table Tabs */}
            <div className="p-3 border-b border-[#2f3136] bg-[#202225]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    BD: {selectedDb}
                  </h4>
                  {selectedDb !== activeDbName ? (
                    <button
                      onClick={() => {
                        if (onSetActiveDatabase) {
                          onSetActiveDatabase(selectedDb);
                        } else {
                          onSelectDatabase(selectedDb);
                          onDbChanged();
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Establecer como Activa para el Canvas</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Base de Datos Activa en Canvas</span>
                    </span>
                  )}

                  {selectedDb && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDatabase(selectedDb)}
                      className="px-2 py-0.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title={`Eliminar permanentemente la base de datos "${selectedDb}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Borrar BD</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onGenerateLayout && activeTable && (
                    <button
                      onClick={() => onGenerateLayout(activeTable)}
                      className="px-2.5 py-1 bg-gradient-to-r from-[#5865f2]/25 via-[#8b5cf6]/25 to-[#38bdf8]/25 hover:from-[#5865f2]/35 hover:to-[#38bdf8]/35 text-white border border-[#5865f2]/50 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      title="Generar propuesta de layout de dashboard automáticamente con Gemini API para esta tabla"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse" />
                      <span>Generar Layout</span>
                    </button>
                  )}

                  {activeTable && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#9ca3af]" />
                      <input
                        type="text"
                        placeholder="Buscar registros..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs w-44 text-[#e1e1e6] focus:outline-none focus:border-[#5865f2]"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAddExcelModal(true)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Añadir una nueva tabla desde un archivo Excel (.xlsx, .xls, .csv)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>+ Tabla desde Excel</span>
                  </button>

                  {activeTable && (
                    <button
                      onClick={() => {
                        const templateSample = currentTable?.sampleRecord
                          ? JSON.stringify({ ...currentTable.sampleRecord, id: undefined }, null, 2)
                          : JSON.stringify({ nombre: 'Nuevo registro', valor: 100 }, null, 2);
                        setRecordJsonInput(templateSample);
                        setShowNewRecordForm(true);
                      }}
                      className="px-2.5 py-1 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Registro</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table Tabs with Badge of Record Count (Requisito 3) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {dbInfo?.tables && dbInfo.tables.length > 0 ? (
                  dbInfo.tables.map((tbl, tblIdx) => {
                    const isTableLinked = Boolean(dexieManager.getTableExcelLink(selectedDb, tbl.name)?.isLinked);
                    const isActive = activeTable === tbl.name;
                    return (
                      <div key={`tbl_tab_wrapper_${tbl.name}_${tblIdx}`} className="flex items-center group">
                        <button
                          onClick={() => {
                            setActiveTable(tbl.name);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            isActive
                              ? 'bg-[#5865f2] text-white shadow-xs'
                              : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#e1e1e6] border border-[#2f3136]'
                          }`}
                        >
                          {isTableLinked ? (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <TableIcon className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                          )}
                          <span>{tbl.name}</span>
                          {/* Badge con el numero de registros (Requisito 3) */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-tight shadow-xs ${
                            isActive
                              ? 'bg-black/40 text-white border border-white/20'
                              : 'bg-[#25282c] text-sky-300 border border-sky-500/30'
                          }`}>
                            {tbl.recordCount.toLocaleString()}
                          </span>
                        </button>
                        {isActive && dbInfo?.tables.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTableToDelete(tbl.name);
                            }}
                            className="p-1 text-[#9ca3af] hover:text-rose-400 rounded hover:bg-rose-500/15 transition cursor-pointer ml-0.5"
                            title={`Eliminar tabla "${tbl.name}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-[#9ca3af] italic py-1">
                    Esta base de datos no tiene tablas creadas todavía.
                  </span>
                )}

                {/* Quick Button to Add Table from Excel right next to tabs */}
                <button
                  type="button"
                  onClick={() => setShowAddExcelModal(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer shrink-0 ml-1"
                  title="Añadir nueva tabla desde archivo Excel (.xlsx, .xls, .csv)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Nueva Tabla Excel</span>
                </button>
              </div>
            </div>

            {/* Requisito 3: La parte central permanece vacia todavia hasta que se seleccione una tabla */}
            {!activeTable ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#202225] select-none">
                <div className="w-16 h-16 rounded-2xl bg-[#25282c] border border-[#2f3136] flex items-center justify-center mb-3 text-[#9ca3af] shadow-inner">
                  <TableIcon className="w-8 h-8 opacity-40 text-sky-400" />
                </div>
                <h4 className="text-base font-bold text-white mb-1.5">
                  Ninguna tabla seleccionada
                </h4>
                <p className="text-xs text-[#9ca3af] max-w-sm leading-relaxed">
                  Selecciona una tabla en la barra superior para cargar y visualizar sus registros físicos.
                </p>
                {dbInfo && dbInfo.tables.length === 0 && (
                  <button
                    onClick={() => setShowAddExcelModal(true)}
                    className="mt-4 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Crear o Importar Primera Tabla</span>
                  </button>
                )}
              </div>
            ) : (
              <>
        {activeTableLink && activeTableLink.isLinked && (
          <div className="px-4 py-2 bg-emerald-950/30 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <LinkIcon className="w-3 h-3 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">
                    Tabla vinculada a Excel: <span className="font-mono text-emerald-300 font-semibold">{activeTableLink.fileName}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono">
                    Hoja: {activeTableLink.sheetName}
                  </span>
                </div>
                <div className="text-[11px] text-[#9ca3af] flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Último refresco: {new Date(activeTableLink.lastSyncedAt).toLocaleTimeString()} ({activeTableLink.rowCount} filas)</span>
                  {activeTableLink.autoRefreshIntervalMinutes && activeTableLink.autoRefreshIntervalMinutes > 0 ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Auto-refresco cada {activeTableLink.autoRefreshIntervalMinutes} min
                    </span>
                  ) : (
                    <span className="text-[#9ca3af]">Refresco manual</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Interval Selector */}
              <div className="flex items-center gap-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-lg px-2 py-1 text-xs">
                <label htmlFor="intervalSelect" className="text-[10px] text-[#9ca3af] uppercase font-bold">Auto:</label>
                <select
                  id="intervalSelect"
                  value={activeTableLink.autoRefreshIntervalMinutes || 0}
                  onChange={(e) => handleChangeAutoRefreshInterval(Number(e.target.value))}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                  title="Configurar intervalo de auto-refresco periódico"
                >
                  <option value={0} className="bg-[#202225] text-white">Manual</option>
                  <option value={1} className="bg-[#202225] text-white">Cada 1 min</option>
                  <option value={5} className="bg-[#202225] text-white">Cada 5 min</option>
                  <option value={15} className="bg-[#202225] text-white">Cada 15 min</option>
                  <option value={30} className="bg-[#202225] text-white">Cada 30 min</option>
                </select>
              </div>

              {/* Refresh Table Button */}
              <button
                type="button"
                onClick={handleTriggerRefreshTable}
                disabled={isRefreshingTable}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Sincronizar y refrescar los registros de esta tabla cargando el archivo Excel actualizado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTable ? 'animate-spin' : ''}`} />
                <span>Refrescar Tabla</span>
              </button>

              {/* Unlink Button */}
              <button
                type="button"
                onClick={handleUnlinkTable}
                className="p-1.5 text-[#9ca3af] hover:text-rose-300 hover:bg-[#25282c] border border-transparent hover:border-[#373a40] rounded-lg text-xs transition cursor-pointer"
                title="Desvincular esta tabla del archivo Excel (permanecerá como tabla local)"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Table Subheader: Pagination Info, Navigation Shortcuts & Page Size Selector */}
        <div className="px-4 py-2 bg-[#1a1b1e]/90 border-b border-[#2f3136] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Summary and Range */}
          <div className="flex items-center gap-2 text-[#9ca3af]">
            <div className="flex items-center gap-1.5 font-medium text-[#e1e1e6]">
              <Layers className="w-3.5 h-3.5 text-[#5865f2]" />
              <span>
                Mostrando <span className="text-white font-bold">{totalRecords === 0 ? 0 : startIndex + 1} - {endIndex}</span> de <span className="text-white font-bold">{totalRecords}</span> registros
              </span>
            </div>
            {isLoadingAllRecords && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5865f2]/15 text-[#38bdf8] border border-[#5865f2]/30 flex items-center gap-1 font-medium animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-[#5865f2]" />
                <span>Cargando total ({currentTable?.recordCount ?? '...'} registros)...</span>
              </span>
            )}
            {currentTable && currentTable.recordCount > totalRecords && !isLoadingAllRecords && (
              <button
                type="button"
                onClick={async () => {
                  if (!selectedDb || !activeTable) return;
                  setIsLoadingAllRecords(true);
                  try {
                    const full = await dexieManager.getTableRecords(selectedDb, activeTable);
                    setTableRecords(full);
                  } finally {
                    setIsLoadingAllRecords(false);
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#5865f2]/20 hover:bg-[#5865f2]/30 text-[#38bdf8] border border-[#5865f2]/40 flex items-center gap-1 transition cursor-pointer"
                title={`Cargar los ${currentTable.recordCount} registros completos de la base de datos`}
              >
                <span>Cargar total ({currentTable.recordCount} registros)</span>
              </button>
            )}
            {filteredRecords.length !== tableRecords.length && (
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded font-mono">
                (filtrados de {tableRecords.length})
              </span>
            )}
            {sortColumn && (
              <button
                onClick={() => { setSortColumn(null); setSortDirection('asc'); }}
                className="text-[10px] px-1.5 py-0.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] border border-[#2f3136] rounded flex items-center gap-1 transition cursor-pointer"
                title="Quitar ordenación"
              >
                <span>Orden: <strong>{sortColumn}</strong> ({sortDirection.toUpperCase()})</span>
                <X className="w-2.5 h-2.5 text-rose-400" />
              </button>
            )}
            {!activeTableLink && activeTable && (
              <button
                type="button"
                onClick={handleTriggerRefreshTable}
                className="text-[11px] text-[#9ca3af] hover:text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#25282c] border border-transparent hover:border-[#2f3136] transition cursor-pointer"
                title="Vincular esta tabla existente a un archivo Excel y refrescar sus registros"
              >
                <LinkIcon className="w-3 h-3 text-emerald-400" />
                <span>Vincular a Excel</span>
              </button>
            )}
          </div>

          {/* Right: LIMIT Selector, Page Size Selector & Quick Page Switcher */}
          <div className="flex items-center gap-3">
            {/* Requisito 4: LIMIT por defecto de 100 registros que sera modificable */}
            <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
              <label htmlFor="recordLimitSelect" className="text-[11px] whitespace-nowrap text-[#9ca3af] font-semibold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-[#5865f2]" />
                <span>LIMIT:</span>
              </label>
              <select
                id="recordLimitSelect"
                value={recordLimit}
                onChange={(e) => {
                  const newLim = Number(e.target.value);
                  setRecordLimit(newLim);
                  loadTableData(selectedDb, activeTable, newLim);
                  setCurrentPage(1);
                }}
                className="bg-[#202225] hover:bg-[#25282c] text-[#e1e1e6] border border-[#2f3136] rounded-md px-2 py-1 text-xs focus:border-[#5865f2] focus:outline-none cursor-pointer transition font-medium"
                title="Modificar límite de registros leídos desde IndexedDB (LIMIT)"
              >
                <option value={25}>25 registros</option>
                <option value={50}>50 registros</option>
                <option value={100}>100 registros (por defecto)</option>
                <option value={250}>250 registros</option>
                <option value={500}>500 registros</option>
                <option value={1000}>1,000 registros</option>
                <option value={5000}>5,000 registros</option>
                <option value={0}>Sin límite (Todos)</option>
              </select>
            </div>

            {/* Page size dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
              <label htmlFor="pageSizeSelectTop" className="text-[11px] whitespace-nowrap text-[#9ca3af]">
                Por página:
              </label>
              <select
                id="pageSizeSelectTop"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#202225] hover:bg-[#25282c] text-[#e1e1e6] border border-[#2f3136] rounded-md px-2 py-1 text-xs focus:border-[#5865f2] focus:outline-none cursor-pointer transition font-medium"
              >
                <option value={5}>5 registros</option>
                <option value={10}>10 registros</option>
                <option value={20}>20 registros</option>
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value={250}>250 registros</option>
                <option value={500}>500 registros</option>
              </select>
            </div>

            {/* Compact Navigation Bar */}
            <div className="flex items-center gap-1 bg-[#202225] p-0.5 rounded-lg border border-[#2f3136]">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded text-[#9ca3af] hover:text-white hover:bg-[#25282c] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Primera página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-[#9ca3af] hover:text-white hover:bg-[#25282c] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono font-medium text-[#e1e1e6]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-[#9ca3af] hover:text-white hover:bg-[#25282c] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-[#9ca3af] hover:text-white hover:bg-[#25282c] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Table Records Data Grid */}
        <div className="flex-1 overflow-auto p-4 flex flex-col justify-between">
          <div>
            {showNewRecordForm && (
              <div className="mb-4 p-3 bg-[#25282c] border border-[#5865f2]/40 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-white">
                  <span>Añadir Registro a "{activeTable}" (JSON)</span>
                  <button onClick={() => setShowNewRecordForm(false)} className="text-[#9ca3af] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={recordJsonInput}
                  onChange={(e) => setRecordJsonInput(e.target.value)}
                  className="w-full p-2 bg-[#1a1b1e] border border-[#2f3136] rounded font-mono text-xs text-[#e1e1e6]"
                  placeholder='{"nombre": "Ejemplo", "precio": 50}'
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewRecordForm(false)}
                    className="px-3 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-[#9ca3af] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNewRecord}
                    className="px-3 py-1 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold rounded"
                  >
                    Guardar en Dexie
                  </button>
                </div>
              </div>
            )}

            {/* Edit Record Modal / Box */}
            {editingRecord && (
              <div className="mb-4 p-3 bg-[#25282c] border border-amber-500/40 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-amber-300">
                  <span>Editar Registro #{editingRecord.id}</span>
                  <button onClick={() => setEditingRecord(null)} className="text-[#9ca3af] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(editingRecord).map(key => {
                    if (key === 'id') return null;
                    return (
                      <div key={`edit_fld_${key}`}>
                        <label className="text-[10px] text-[#9ca3af] font-semibold block mb-0.5">{key}</label>
                        <input
                          type="text"
                          value={editingRecord[key] ?? ''}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            [key]: isNaN(Number(e.target.value)) || e.target.value === '' ? e.target.value : Number(e.target.value)
                          })}
                          className="w-full px-2 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-xs text-[#e1e1e6]"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="px-3 py-1 bg-[#1a1b1e] border border-[#2f3136] rounded text-[#9ca3af] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateRecord}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            )}

            {/* Records Table */}
            {paginatedRecords.length > 0 ? (
              <div className="border border-[#2f3136] rounded-lg overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1a1b1e] text-[#9ca3af] font-semibold">
                      <th className="p-2.5 border-b border-[#2f3136] uppercase font-bold text-[10px] tracking-wider text-[#9ca3af] w-12 text-center select-none">
                        #
                      </th>
                      {tableColumns.map((col, colIdx) => {
                        const isSorted = sortColumn === col;
                        return (
                          <th
                            key={`th_${col}_${colIdx}`}
                            onClick={() => handleSort(col)}
                            className={`p-2.5 border-b border-[#2f3136] uppercase font-bold text-[10px] tracking-wider cursor-pointer transition select-none group ${
                              isSorted ? 'bg-[#5865f2]/20 text-[#38bdf8] border-b-2 border-b-[#5865f2]' : 'hover:text-white hover:bg-[#25282c]'
                            }`}
                            title={
                              isSorted
                                ? `Ordenado por ${col}: ${sortDirection === 'asc' ? 'Ascendente (clic para descendente)' : 'Descendente (clic para quitar orden)'}`
                                : `Ordenar por ${col}`
                            }
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="truncate">{col}</span>
                              <span className="shrink-0 flex items-center">
                                {isSorted ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="w-3 h-3 text-[#5865f2] animate-in fade-in duration-150" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 text-[#5865f2] animate-in fade-in duration-150" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-[#9ca3af] opacity-40 group-hover:opacity-100 transition" />
                                )}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-2.5 border-b border-[#2f3136] text-right select-none w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2f3136] bg-[#202225]">
                    {paginatedRecords.map((row, idx) => {
                      const primaryKeyField = currentTable?.schema ? currentTable.schema.split(',')[0].replace('++', '').trim() : 'id';
                      const rowPk = row[primaryKeyField] !== undefined ? String(row[primaryKeyField]) : (row.id ?? row.key ?? idx);
                      const globalRowNumber = startIndex + idx + 1;
                      return (
                        <tr key={`row_${rowPk}_${idx}`} className="hover:bg-[#25282c] transition">
                          <td className="p-2.5 text-[#9ca3af] font-mono text-[10px] text-center w-12 border-r border-[#2f3136]/40 bg-[#1e2023]">
                            {globalRowNumber}
                          </td>
                          {tableColumns.map((col, cIdx) => (
                            <td 
                              key={`cell_${col}_${cIdx}`} 
                              className={`p-2.5 font-mono text-[11px] max-w-[200px] truncate ${
                                sortColumn === col ? 'bg-[#5865f2]/5 text-white font-medium' : 'text-[#e1e1e6]'
                              }`}
                            >
                              {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                            </td>
                          ))}
                          <td className="p-2.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => setEditingRecord(row)}
                              className="p-1 text-[#9ca3af] hover:text-[#5865f2] rounded hover:bg-[#1a1b1e] cursor-pointer"
                              title="Editar registro"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rowPk)}
                              className="p-1 text-[#9ca3af] hover:text-rose-400 rounded hover:bg-rose-500/20 cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-[#9ca3af] italic bg-[#1a1b1e]/50 border border-[#2f3136] rounded-lg">
                No hay registros encontrados en la tabla "{activeTable}".
              </div>
            )}
          </div>

          {/* Full Bottom Pagination Navigation Toolbar */}
          {totalRecords > 0 && (
            <div className="mt-4 p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
              {/* Page and range info */}
              <div className="text-xs text-[#9ca3af] flex items-center gap-2">
                <span>
                  Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages}</span>
                </span>
                <span className="text-[#4b5563]">•</span>
                <span>
                  Registros <span className="text-white font-medium">{startIndex + 1}-{endIndex}</span> de <span className="text-white font-medium">{totalRecords}</span>
                </span>
              </div>

              {/* Center: Numeric Page Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-[#202225] hover:bg-[#25282c] text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-md border border-[#2f3136] flex items-center gap-1 transition cursor-pointer text-xs"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Primera</span>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-[#202225] hover:bg-[#25282c] text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-md border border-[#2f3136] flex items-center gap-1 transition cursor-pointer text-xs"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers().map((p, pIdx) => {
                    if (p === '...') {
                      return (
                        <span key={`p_ellipsis_${pIdx}`} className="px-1.5 text-[#9ca3af] font-mono select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === currentPage;
                    return (
                      <button
                        key={`p_num_${p}`}
                        onClick={() => setCurrentPage(Number(p))}
                        className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#5865f2] text-white shadow-xs font-bold'
                            : 'bg-[#202225] hover:bg-[#25282c] text-[#e1e1e6] border border-[#2f3136]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 bg-[#202225] hover:bg-[#25282c] text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-md border border-[#2f3136] flex items-center gap-1 transition cursor-pointer text-xs"
                  title="Página siguiente"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 bg-[#202225] hover:bg-[#25282c] text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-md border border-[#2f3136] flex items-center gap-1 transition cursor-pointer text-xs"
                  title="Última página"
                >
                  <span className="hidden sm:inline">Última</span>
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: Direct Page Jump & Bottom Size Selector */}
              <div className="flex items-center gap-2">
                <form onSubmit={handleJumpToPage} className="flex items-center gap-1">
                  <span className="text-[11px] text-[#9ca3af]">Ir a:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={String(currentPage)}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    className="w-12 px-2 py-1 bg-[#202225] border border-[#2f3136] rounded-md text-xs text-center text-white focus:outline-none focus:border-[#5865f2]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-[#202225] hover:bg-[#25282c] text-white border border-[#2f3136] hover:border-[#5865f2] rounded-md text-xs font-medium transition cursor-pointer"
                  >
                    Ir
                  </button>
                </form>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#202225] hover:bg-[#25282c] text-[#e1e1e6] border border-[#2f3136] rounded-md px-2 py-1 text-xs focus:border-[#5865f2] focus:outline-none cursor-pointer transition font-medium"
                  title="Cambiar cantidad de registros por página"
                >
                  <option value={5}>5 / pág</option>
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                  <option value={250}>250 / pág</option>
                  <option value={500}>500 / pág</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Schema Info */}
        <div className="p-2.5 bg-[#1a1b1e] border-t border-[#2f3136] text-[11px] text-[#9ca3af] flex items-center justify-between">
          <div>
            Esquema de <span className="font-mono font-semibold text-white">{activeTable}</span>: <span className="font-mono text-[#5865f2]">{currentTable?.schema}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong></span>
            <span className="text-[#4b5563]">|</span>
            <span>Total: <strong className="text-white">{totalRecords}</strong> registros</span>
          </div>
        </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal: Delete Database */}
      {dbToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#202225] border border-rose-500/40 rounded-xl shadow-2xl max-w-md w-full p-5 text-[#e1e1e6] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">¿Eliminar base de datos?</h4>
                <p className="text-xs text-[#9ca3af] mt-1.5 leading-relaxed">
                  Esta acción eliminará de forma permanente la base de datos{' '}
                  <strong className="text-rose-300 font-mono">"{dbToDelete}"</strong>{' '}
                  de IndexedDB, incluyendo todas sus tablas y registros asociados.
                </p>
                <div className="mt-2.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                  ⚠️ Los datos no podrán recuperarse salvo que cuentes con un archivo de copia de seguridad exportado.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2f3136]">
              <button
                type="button"
                disabled={isDeletingDb}
                onClick={() => setDbToDelete(null)}
                className="px-3.5 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingDb}
                onClick={handleConfirmDeleteDb}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
              >
                {isDeletingDb ? (
                  <span>Eliminando...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Permanentemente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Record */}
      {recordToDelete !== null && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#202225] border border-rose-500/40 rounded-xl shadow-2xl max-w-sm w-full p-4 text-[#e1e1e6] space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirmar eliminación de registro</span>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              ¿Estás seguro de que deseas eliminar el registro con identificador{' '}
              <strong className="text-white font-mono">{String(recordToDelete)}</strong>{' '}
              de la tabla <strong className="text-white font-mono">{activeTable}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2f3136]">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Table */}
      {tableToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#202225] border border-rose-500/40 rounded-xl shadow-2xl max-w-sm w-full p-4 text-[#e1e1e6] space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirmar eliminación de tabla</span>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la tabla{' '}
              <strong className="text-white font-mono">"{tableToDelete}"</strong> y todos sus registros de la base de datos{' '}
              <strong className="text-white font-mono">"{selectedDb}"</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2f3136]">
              <button
                type="button"
                disabled={isDeletingTable}
                onClick={() => setTableToDelete(null)}
                className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingTable}
                onClick={handleConfirmDeleteTable}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
              >
                {isDeletingTable ? (
                  <span>Eliminando...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Tabla</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Refreshing Active Table from Excel */}
      <input
        type="file"
        ref={refreshFileInputRef}
        accept=".xlsx, .xls, .csv"
        onChange={handleProcessRefreshFile}
        className="hidden"
      />

      {/* Add New Table from Excel Modal */}
      <AddExcelTableModal
        isOpen={showAddExcelModal}
        onClose={() => setShowAddExcelModal(false)}
        selectedDb={selectedDb}
        existingTables={dbInfo?.tables.map(t => t.name) || []}
        onTableCreated={(newTbl) => {
          setActiveTable(newTbl);
          loadDbDetails(selectedDb);
          loadTableData(selectedDb, newTbl);
          setLinkVersion(v => v + 1);
          onDbChanged();
        }}
        onNotification={onNotification}
      />
    </div>
  );
};
