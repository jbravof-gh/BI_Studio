import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CanvasElement,
  QueryParamDefinition,
  SavedQueryDefinition,
  TableInfo,
  DatabaseInfo
} from '../types';
import {
  StructuredQuery,
  StructuredQueryCondition,
  buildSqlFromStructured,
  parseSqlToStructured,
  extractParametersFromSql,
  executeQuery,
  QueryExecutionResult,
  castParamValue,
  getSampleQueriesForDatabase
} from '../utils/queryEngine';
import { dexieManager } from '../services/dexieManager';
import {
  X,
  Play,
  Save,
  Plus,
  Trash2,
  Database,
  Code2,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  AlertCircle,
  Clock,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  CheckCircle2,
  Copy,
  RotateCcw,
  BookOpen,
  TableProperties,
  Search,
  Filter
} from 'lucide-react';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';

interface QueryBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  element: CanvasElement;
  onUpdateElement: (updated: CanvasElement) => void;
  dbInfo: DatabaseInfo | null;
  dbRecords: Record<string, Record<string, any>[]>;
  onTableCreated?: (newTableName: string) => void;
}

export const QueryBuilderModal: React.FC<QueryBuilderModalProps> = ({
  isOpen,
  onClose,
  element,
  onUpdateElement,
  dbInfo,
  dbRecords,
  onTableCreated
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const binding = element.binding || {};

  // Active Tab
  const [activeTab, setActiveTab] = useState<'visual' | 'sql' | 'params' | 'saved' | 'export'>('visual');

  // Working SQL & Parameters
  const [workingSql, setWorkingSql] = useState<string>(() => {
    return binding.querySql || 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50';
  });

  const [workingParams, setWorkingParams] = useState<QueryParamDefinition[]>(() => {
    return binding.queryParams && binding.queryParams.length > 0
      ? JSON.parse(JSON.stringify(binding.queryParams))
      : [
          {
            name: 'minTotal',
            type: 'number',
            label: 'Total Mínimo',
            defaultValue: 50,
            currentValue: 50,
            description: 'Filtra registros con valor mayor o igual'
          }
        ];
  });

  const [savedQueries, setSavedQueries] = useState<SavedQueryDefinition[]>(() => {
    if (binding.savedQueries && binding.savedQueries.length > 0) {
      return JSON.parse(JSON.stringify(binding.savedQueries));
    }
    return getSampleQueriesForDatabase(dbInfo?.tables || []);
  });

  // Save Query Form State
  const [newQueryName, setNewQueryName] = useState<string>('');
  const [newQueryDesc, setNewQueryDesc] = useState<string>('');

  // Structured query state for visual designer
  const [structured, setStructured] = useState<StructuredQuery>(() => {
    const parsed = parseSqlToStructured(workingSql);
    if (parsed) return parsed;
    const defaultTable = dbInfo?.tables[0]?.name || 'ventas';
    return {
      sourceTable: defaultTable,
      selectedColumns: ['*'],
      whereConditions: [],
      whereLogic: 'AND',
      orderDirection: 'asc',
      limit: 50
    };
  });

  // Test execution result
  const [testResult, setTestResult] = useState<QueryExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Export to new DB Table state
  const [exportTableName, setExportTableName] = useState<string>(() => {
    return binding.destinationTableName || 'tabla_consulta_' + Math.floor(Math.random() * 1000);
  });
  const [exportStatus, setExportStatus] = useState<{ loading: boolean; message?: string; error?: string } | null>(null);

  // Available tables from dbInfo or dbRecords
  const availableTables = useMemo<TableInfo[]>(() => {
    if (dbInfo && dbInfo.tables && dbInfo.tables.length > 0) {
      return dbInfo.tables;
    }
    return Object.keys(dbRecords).map(name => ({
      name,
      schema: '++id',
      recordCount: dbRecords[name]?.length || 0,
      fields: dbRecords[name]?.[0] ? Object.keys(dbRecords[name][0]) : ['id']
    }));
  }, [dbInfo, dbRecords]);

  // Selected table info
  const currentTableInfo = useMemo(() => {
    return availableTables.find(t => t.name === structured.sourceTable) || availableTables[0];
  }, [availableTables, structured.sourceTable]);

  // Available fields of current table
  const tableFields = useMemo(() => {
    return currentTableInfo?.fields || [];
  }, [currentTableInfo]);

  // Column search filter for visual designer
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Filtered fields based on search input
  const filteredFields = useMemo(() => {
    if (!columnSearch.trim()) return tableFields;
    const q = columnSearch.toLowerCase().trim();
    return tableFields.filter(f => f.toLowerCase().includes(q));
  }, [tableFields, columnSearch]);

  // Sync workingSql when structured query changes in visual mode
  const handleStructuredChange = (updated: StructuredQuery) => {
    setStructured(updated);
    const sql = buildSqlFromStructured(updated);
    setWorkingSql(sql);
  };

  // Run test query
  const handleRunTest = () => {
    setIsExecuting(true);
    setTimeout(() => {
      const res = executeQuery(workingSql, workingParams, dbRecords);
      setTestResult(res);
      setIsExecuting(false);
    }, 50);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initial test run when modal opens
  useEffect(() => {
    if (isOpen) {
      setWorkingSql(binding.querySql || 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50');
      setWorkingParams(
        binding.queryParams && binding.queryParams.length > 0
          ? JSON.parse(JSON.stringify(binding.queryParams))
          : [
              {
                name: 'minTotal',
                type: 'number',
                label: 'Total Mínimo',
                defaultValue: 50,
                currentValue: 50,
                description: 'Filtra registros'
              }
            ]
      );
      // Run test
      setTimeout(() => {
        const sqlToRun = binding.querySql || 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50';
        const res = executeQuery(sqlToRun, binding.queryParams || [], dbRecords);
        setTestResult(res);
      }, 100);
    }
  }, [isOpen]);

  // Auto-detect parameters from SQL
  const handleAutoDetectParams = () => {
    const extracted = extractParametersFromSql(workingSql);
    const newParams = [...workingParams];

    for (const name of extracted) {
      if (!newParams.some(p => p.name === name)) {
        // Guess type
        const isNum = /total|precio|monto|saldo|cantidad|id|limit|num/i.test(name);
        const isDate = /fecha|date|dia|mes|ano/i.test(name);
        const isBool = /activo|es_|habilitado/i.test(name);

        newParams.push({
          name,
          type: isNum ? 'number' : isDate ? 'date' : isBool ? 'boolean' : 'string',
          label: name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          defaultValue: isNum ? 10 : '',
          currentValue: isNum ? 10 : '',
          description: `Parámetro detectado en la consulta SQL`
        });
      }
    }

    setWorkingParams(newParams);
  };

  // Save current query to library
  const handleSaveCurrentQuery = () => {
    if (!newQueryName.trim()) return;
    const newSq: SavedQueryDefinition = {
      id: `sq_${Date.now()}`,
      name: newQueryName.trim(),
      querySql: workingSql,
      description: newQueryDesc.trim() || 'Consulta personalizada',
      params: JSON.parse(JSON.stringify(workingParams)),
      updatedAt: new Date().toISOString()
    };
    const updated = [newSq, ...savedQueries];
    setSavedQueries(updated);
    setNewQueryName('');
    setNewQueryDesc('');
    setActiveTab('saved');
  };

  // Load a saved query
  const handleLoadSavedQuery = (sq: SavedQueryDefinition) => {
    setWorkingSql(sq.querySql);
    if (sq.params && sq.params.length > 0) {
      setWorkingParams(JSON.parse(JSON.stringify(sq.params)));
    }
    const parsed = parseSqlToStructured(sq.querySql);
    if (parsed) setStructured(parsed);
    // Run test
    setTimeout(() => {
      const res = executeQuery(sq.querySql, sq.params || [], dbRecords);
      setTestResult(res);
    }, 50);
  };

  // Delete a saved query
  const handleDeleteSavedQuery = (id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  };

  // Apply changes and close modal
  const handleApply = () => {
    const res = executeQuery(workingSql, workingParams, dbRecords);

    onUpdateElement({
      ...element,
      binding: {
        ...binding,
        querySql: workingSql,
        queryParams: workingParams,
        savedQueries: savedQueries,
        destinationTableName: exportTableName,
        columns: res.columns,
        lastExecutedAt: new Date().toLocaleTimeString(),
        lastExecutionRowsCount: res.rowCount,
        lastExecutionDurationMs: res.durationMs,
        lastQueryError: res.error
      }
    });

    onClose();
  };

  // Export current result to a new database table
  const handleExportToNewTable = async () => {
    if (!exportTableName.trim()) {
      setExportStatus({ loading: false, error: 'Por favor ingresa un nombre para la nueva tabla.' });
      return;
    }

    // Execute first to ensure we have rows
    const res = executeQuery(workingSql, workingParams, dbRecords);
    if (!res.success) {
      setExportStatus({ loading: false, error: `Error en la consulta: ${res.error}` });
      return;
    }

    if (res.rows.length === 0) {
      setExportStatus({ loading: false, error: 'La consulta no produjo ningún registro para guardar.' });
      return;
    }

    setExportStatus({ loading: true });

    try {
      const dbName = dbInfo?.name || dexieManager.getActiveDbName() || 'empresa_demo_v1';
      const result = await dexieManager.saveTableFromRecords(dbName, exportTableName, res.rows);

      if (result.success) {
        setExportStatus({
          loading: false,
          message: `¡Éxito! Nueva tabla "${result.tableName}" creada con ${res.rows.length} registros en la base de datos.`
        });
        if (onTableCreated) {
          onTableCreated(result.tableName);
        }
      } else {
        setExportStatus({ loading: false, error: result.message });
      }
    } catch (err: any) {
      setExportStatus({ loading: false, error: err.message || 'Error al guardar la tabla.' });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xs transition-all duration-200 animate-in fade-in select-none ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`bg-[#1e1f23] border border-[#2f3136] flex flex-col shadow-2xl overflow-hidden text-slate-200 transition-all duration-200 ${
          isFullscreen
            ? 'w-screen h-screen rounded-none border-none max-h-none'
            : 'w-full max-w-[1240px] h-[90vh] rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#2f3136] flex items-center justify-between bg-[#18191c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#06b6d4] to-[#3b82f6] flex items-center justify-center shadow-md shadow-cyan-500/20 text-white shrink-0">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Diseñador y Gestor de QueryTable</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                  SQL & Parámetros
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Diseña consultas SQL estructuradas contra tus tablas, gestiona parámetros y genera nuevas tablas en la base de datos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModalFullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={() => setIsFullscreen(prev => !prev)}
            />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Cerrar modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#2f3136] bg-[#141517] px-6 gap-2 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('visual')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'visual'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Diseñador Visual</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'sql'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Editor SQL</span>
          </button>

          <button
            onClick={() => setActiveTab('params')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'params'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Parámetros ({workingParams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'saved'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Consultas Guardadas ({savedQueries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 flex items-center gap-2 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Crear Tabla en BD</span>
          </button>

          <div className="ml-auto flex items-center gap-2 py-2">
            <button
              onClick={handleRunTest}
              disabled={isExecuting}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 text-cyan-400 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Ejecutando...' : 'Ejecutar Consulta'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: VISUAL DESIGNER */}
          {activeTab === 'visual' && (
            <div className="space-y-6">
              {/* Section 1: Query Core Settings (FROM, ORDER BY, LIMIT) */}
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 sm:p-5 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* Source Table Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Tabla de Origen (FROM)</span>
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {currentTableInfo?.recordCount ?? 0} filas
                      </span>
                    </label>
                    <select
                      value={structured.sourceTable}
                      onChange={(e) => {
                        const newTbl = e.target.value;
                        handleStructuredChange({
                          ...structured,
                          sourceTable: newTbl,
                          selectedColumns: ['*'],
                          whereConditions: [],
                          orderByField: undefined
                        });
                      }}
                      className="w-full bg-[#141517] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition cursor-pointer"
                    >
                      {availableTables.map(t => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.recordCount} filas)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400">
                      Tabla principal sobre la que se ejecutará la consulta.
                    </p>
                  </div>

                  {/* Sort & Direction */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ordenar Por (ORDER BY)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={structured.orderByField || ''}
                        onChange={(e) => {
                          handleStructuredChange({
                            ...structured,
                            orderByField: e.target.value || undefined
                          });
                        }}
                        className="flex-1 bg-[#141517] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition cursor-pointer"
                      >
                        <option value="">(Sin orden específico)</option>
                        {tableFields.map(f => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          handleStructuredChange({
                            ...structured,
                            orderDirection: structured.orderDirection === 'asc' ? 'desc' : 'asc'
                          });
                        }}
                        title="Alternar entre orden Ascendente o Descendente"
                        className="px-3 py-2 rounded-lg bg-[#25272b] hover:bg-[#2e3036] text-xs font-bold font-mono text-cyan-400 border border-[#3f4147] hover:border-cyan-500/50 transition cursor-pointer shadow-xs"
                      >
                        {structured.orderDirection?.toUpperCase() || 'ASC'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dirección y columna de ordenación para los resultados.
                    </p>
                  </div>

                  {/* Limit */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Límite de Filas (LIMIT)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {[25, 50, 100, 500].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleStructuredChange({ ...structured, limit: val })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                              structured.limit === val
                                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                                : 'text-slate-400 hover:text-slate-200 bg-[#25272b]'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={structured.limit || 50}
                      onChange={(e) => {
                        handleStructuredChange({
                          ...structured,
                          limit: parseInt(e.target.value, 10) || 50
                        });
                      }}
                      className="w-full bg-[#141517] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      Cantidad máxima de registros devueltos por la consulta.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Columns Selection (SELECT) */}
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <TableProperties className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Columnas Proyectadas (SELECT)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-mono">
                      {structured.selectedColumns.includes('*')
                        ? 'Todas (*)'
                        : `${structured.selectedColumns.length} de ${tableFields.length}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search column input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        placeholder="Buscar columna..."
                        className="pl-8 pr-2.5 py-1 bg-[#141517] border border-[#3f4147] rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 w-36 sm:w-44 transition"
                      />
                      {columnSearch && (
                        <button
                          type="button"
                          onClick={() => setColumnSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStructuredChange({ ...structured, selectedColumns: ['*'] })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        structured.selectedColumns.includes('*')
                          ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                          : 'bg-[#25272b] hover:bg-[#2f3136] text-slate-300 border border-[#3f4147]'
                      }`}
                    >
                      Todas (*)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStructuredChange({ ...structured, selectedColumns: [...tableFields] })}
                      className="px-2.5 py-1 rounded-lg text-xs bg-[#25272b] hover:bg-[#2f3136] text-slate-300 border border-[#3f4147] transition cursor-pointer"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStructuredChange({ ...structured, selectedColumns: [tableFields[0] || 'id'] })}
                      className="px-2.5 py-1 rounded-lg text-xs bg-[#25272b] hover:bg-[#2f3136] text-slate-400 hover:text-slate-200 border border-[#3f4147] transition cursor-pointer"
                    >
                      Deseleccionar
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                  {filteredFields.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 w-full">
                      No se encontraron columnas que coincidan con &quot;{columnSearch}&quot;.
                    </div>
                  ) : (
                    filteredFields.map(f => {
                      const isSelected = structured.selectedColumns.includes('*') || structured.selectedColumns.includes(f);
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            let nextCols: string[];
                            if (structured.selectedColumns.includes('*')) {
                              // If all are selected, uncheck this one
                              nextCols = tableFields.filter(x => x !== f);
                              if (nextCols.length === 0) nextCols = ['*'];
                            } else if (isSelected) {
                              nextCols = structured.selectedColumns.filter(c => c !== f);
                              if (nextCols.length === 0) nextCols = ['*'];
                            } else {
                              nextCols = [...structured.selectedColumns, f];
                              if (nextCols.length === tableFields.length) {
                                nextCols = ['*'];
                              }
                            }
                            handleStructuredChange({ ...structured, selectedColumns: nextCols });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 font-semibold shadow-xs'
                              : 'bg-[#1e1f23] border border-[#35373c] text-slate-400 hover:text-slate-200 hover:border-[#4f525a]'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded border border-slate-600 inline-block shrink-0" />
                          )}
                          <span>{f}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Section 3: Relational JOIN (Optional) */}
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cruce con Otra Tabla (JOIN Opcional)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Combina datos relacionales entre dos tablas
                    </span>
                  </div>

                  {structured.joinTable ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleStructuredChange({
                          ...structured,
                          joinTable: undefined,
                          joinSourceField: undefined,
                          joinTargetField: undefined
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar Cruce</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const candidateTable = availableTables.find(t => t.name !== structured.sourceTable);
                        if (candidateTable) {
                          handleStructuredChange({
                            ...structured,
                            joinTable: candidateTable.name,
                            joinType: 'left',
                            joinSourceField: tableFields[0] || 'id',
                            joinTargetField: candidateTable.fields[0] || 'id'
                          });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-xs text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Activar Cruce (JOIN)</span>
                    </button>
                  )}
                </div>

                {!structured.joinTable ? (
                  <p className="text-xs text-slate-500 italic py-1">
                    Sin cruce activo. La consulta se ejecutará únicamente contra la tabla &quot;{structured.sourceTable}&quot;.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end pt-1 bg-[#141517] p-3.5 rounded-xl border border-[#2f3136]">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Tipo de Cruce:</label>
                      <select
                        value={structured.joinType || 'left'}
                        onChange={(e) => {
                          handleStructuredChange({
                            ...structured,
                            joinType: e.target.value as any
                          });
                        }}
                        className="w-full bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition cursor-pointer"
                      >
                        <option value="left">LEFT JOIN (Todas las filas)</option>
                        <option value="inner">INNER JOIN (Coincidencias)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Tabla a Cruzar:</label>
                      <select
                        value={structured.joinTable || ''}
                        onChange={(e) => {
                          const tgt = e.target.value;
                          const tgtInfo = availableTables.find(t => t.name === tgt);
                          handleStructuredChange({
                            ...structured,
                            joinTable: tgt || undefined,
                            joinSourceField: structured.sourceTable === 'ventas' ? 'cliente_id' : tableFields[0] || 'id',
                            joinTargetField: tgtInfo?.fields.includes('id') ? 'id' : tgtInfo?.fields[0] || 'id'
                          });
                        }}
                        className="w-full bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition cursor-pointer"
                      >
                        {availableTables.filter(t => t.name !== structured.sourceTable).map(t => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.recordCount} filas)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium truncate">
                        Campo Origen ({structured.sourceTable}):
                      </label>
                      <select
                        value={structured.joinSourceField || ''}
                        onChange={(e) => {
                          handleStructuredChange({
                            ...structured,
                            joinSourceField: e.target.value
                          });
                        }}
                        className="w-full bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition cursor-pointer font-mono"
                      >
                        {tableFields.map(f => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium truncate">
                        Campo Destino ({structured.joinTable}):
                      </label>
                      <select
                        value={structured.joinTargetField || ''}
                        onChange={(e) => {
                          handleStructuredChange({
                            ...structured,
                            joinTargetField: e.target.value
                          });
                        }}
                        className="w-full bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition cursor-pointer font-mono"
                      >
                        {(availableTables.find(t => t.name === structured.joinTable)?.fields || ['id']).map(f => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Filter Conditions (WHERE) */}
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Condiciones de Filtro (WHERE)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Filtra filas o enlaza dinámicamente con parámetros usando :nombre
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const firstParam = workingParams[0]?.name ? `:${workingParams[0].name}` : '10';
                      const newCond: StructuredQueryCondition = {
                        field: tableFields[1] || tableFields[0] || 'id',
                        operator: '>=',
                        value: firstParam
                      };
                      handleStructuredChange({
                        ...structured,
                        whereConditions: [...(structured.whereConditions || []), newCond]
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs flex items-center gap-1.5 font-medium transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Condición</span>
                  </button>
                </div>

                {(!structured.whereConditions || structured.whereConditions.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Sin filtros WHERE configurados. Se incluirán todos los registros de la tabla hasta el límite establecido.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {structured.whereConditions.map((cond, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2.5 bg-[#141517] p-3 rounded-xl border border-[#2f3136]">
                        <span className="text-xs font-mono font-bold text-cyan-400 min-w-[50px]">
                          {idx === 0 ? 'DONDE' : structured.whereLogic || 'Y'}
                        </span>

                        {/* Field */}
                        <select
                          value={cond.field}
                          onChange={(e) => {
                            const updatedConds = [...structured.whereConditions];
                            updatedConds[idx] = { ...cond, field: e.target.value };
                            handleStructuredChange({ ...structured, whereConditions: updatedConds });
                          }}
                          className="bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                        >
                          {tableFields.map(f => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>

                        {/* Operator */}
                        <select
                          value={cond.operator}
                          onChange={(e) => {
                            const updatedConds = [...structured.whereConditions];
                            updatedConds[idx] = { ...cond, operator: e.target.value as any };
                            handleStructuredChange({ ...structured, whereConditions: updatedConds });
                          }}
                          className="bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer font-mono font-semibold"
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<">&lt;</option>
                          <option value="<=">&lt;=</option>
                          <option value="LIKE">LIKE (contiene)</option>
                          <option value="IN">IN (lista)</option>
                        </select>

                        {/* Value or Parameter */}
                        <div className="flex-1 min-w-[140px] relative">
                          <input
                            type="text"
                            value={cond.value}
                            onChange={(e) => {
                              const updatedConds = [...structured.whereConditions];
                              updatedConds[idx] = { ...cond, value: e.target.value };
                              handleStructuredChange({ ...structured, whereConditions: updatedConds });
                            }}
                            placeholder="Ej: :minTotal o 100"
                            className="w-full bg-[#1e1f23] border border-[#3f4147] hover:border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500 transition"
                          />
                        </div>

                        {/* Quick Parameter Suggestion Chips */}
                        {workingParams.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {workingParams.map(p => (
                              <button
                                key={p.name}
                                type="button"
                                title={`Asignar parámetro :${p.name}`}
                                onClick={() => {
                                  const updatedConds = [...structured.whereConditions];
                                  updatedConds[idx] = { ...cond, value: `:${p.name}` };
                                  handleStructuredChange({ ...structured, whereConditions: updatedConds });
                                }}
                                className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 rounded-md text-[11px] font-mono border border-cyan-500/30 transition cursor-pointer"
                              >
                                :{p.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const updatedConds = structured.whereConditions.filter((_, i) => i !== idx);
                            handleStructuredChange({ ...structured, whereConditions: updatedConds });
                          }}
                          title="Eliminar condición"
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: Generated SQL Preview */}
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Consulta SQL Generada en Vivo:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(workingSql);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#25272b] hover:bg-[#2f3136] text-slate-300 hover:text-white flex items-center gap-1 text-xs border border-[#3f4147] transition cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar SQL</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sql')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition cursor-pointer"
                    >
                      <span>Abrir en Editor SQL</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <pre className="bg-[#111214] p-3.5 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap border border-black/60 shadow-inner">
                  {workingSql}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: ADVANCED SQL EDITOR */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Escribe o pega libremente tu consulta SQL estándar. Soporta <span className="font-mono text-cyan-300">:parametro</span> o <span className="font-mono text-cyan-300">@parametro</span> para valores dinámicos.
                </p>
                <button
                  type="button"
                  onClick={handleAutoDetectParams}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Detectar Parámetros (:param)</span>
                </button>
              </div>

              {/* Helper Quick Insert Chips */}
              <div className="space-y-2 bg-[#18191c] p-3 rounded-xl border border-[#2f3136]">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Inserción rápida:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                  {/* Tables */}
                  {availableTables.map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setWorkingSql(prev => prev + ` FROM ${t.name}`)}
                      className="px-2 py-0.5 rounded bg-[#27292d] hover:bg-[#32353a] text-amber-300 border border-amber-500/20 text-[11px]"
                    >
                      FROM {t.name}
                    </button>
                  ))}
                  {/* Params */}
                  {workingParams.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setWorkingSql(prev => prev + ` :${p.name}`)}
                      className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px]"
                    >
                      :{p.name}
                    </button>
                  ))}
                  {/* Keywords */}
                  {['WHERE', 'AND', 'ORDER BY', 'LIMIT 50', 'LEFT JOIN'].map(kw => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setWorkingSql(prev => prev + ` ${kw} `)}
                      className="px-2 py-0.5 rounded bg-[#27292d] hover:bg-[#32353a] text-slate-300 border border-[#3f4147] text-[11px]"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>

              {/* SQL Text Area */}
              <div className="relative rounded-xl overflow-hidden border border-[#3f4147] focus-within:border-cyan-500 bg-[#0f1012]">
                <textarea
                  rows={8}
                  value={workingSql}
                  onChange={(e) => setWorkingSql(e.target.value)}
                  className="w-full bg-transparent p-4 text-xs font-mono text-cyan-300 outline-none resize-y leading-relaxed"
                  placeholder="SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 50"
                  spellCheck={false}
                />
              </div>

              {/* Save as named query box */}
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Guardar esta Consulta en la Biblioteca</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newQueryName}
                    onChange={(e) => setNewQueryName(e.target.value)}
                    placeholder="Nombre de la consulta (ej. Ventas Destacadas)"
                    className="bg-[#1e1f23] border border-[#3f4147] rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newQueryDesc}
                      onChange={(e) => setNewQueryDesc(e.target.value)}
                      placeholder="Descripción breve (opcional)"
                      className="flex-1 bg-[#1e1f23] border border-[#3f4147] rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCurrentQuery}
                      disabled={!newQueryName.trim()}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 transition shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARAMETERS MANAGER */}
          {activeTab === 'params' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Parámetros de Consulta</h3>
                  <p className="text-xs text-slate-400">
                    Define variables dinámicas que se sustituyen en el SQL como <span className="font-mono text-cyan-300">:nombreParametro</span>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAutoDetectParams}
                    className="px-3 py-1.5 rounded-lg bg-[#27292d] hover:bg-[#35373c] text-slate-200 border border-[#3f4147] text-xs flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Detectar desde SQL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idNum = workingParams.length + 1;
                      setWorkingParams([
                        ...workingParams,
                        {
                          name: `param_${idNum}`,
                          type: 'string',
                          label: `Parámetro ${idNum}`,
                          defaultValue: '',
                          currentValue: '',
                          description: ''
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Parámetro</span>
                  </button>
                </div>
              </div>

              {workingParams.length === 0 ? (
                <div className="text-center py-8 bg-[#18191c] rounded-xl border border-dashed border-[#2f3136]">
                  <Hash className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No hay parámetros configurados aún.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Crea un parámetro o usa "Detectar desde SQL" para importar los encontrados en la consulta.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workingParams.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 space-y-3 transition hover:border-[#3f4147]"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        {/* Name */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Nombre en SQL (:nombre)
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-cyan-400 font-mono font-bold">:</span>
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => {
                                const clean = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                const updated = [...workingParams];
                                updated[pIdx] = { ...p, name: clean };
                                setWorkingParams(updated);
                              }}
                              className="w-full bg-[#1e1f23] border border-[#3f4147] rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                              placeholder="nombreParametro"
                            />
                          </div>
                        </div>

                        {/* Label */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Etiqueta Amigable
                          </span>
                          <input
                            type="text"
                            value={p.label || ''}
                            onChange={(e) => {
                              const updated = [...workingParams];
                              updated[pIdx] = { ...p, label: e.target.value };
                              setWorkingParams(updated);
                            }}
                            className="w-full bg-[#1e1f23] border border-[#3f4147] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            placeholder="Ej. Importe Mínimo"
                          />
                        </div>

                        {/* Type */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Tipo de Dato
                          </span>
                          <select
                            value={p.type}
                            onChange={(e) => {
                              const updated = [...workingParams];
                              updated[pIdx] = { ...p, type: e.target.value as any };
                              setWorkingParams(updated);
                            }}
                            className="w-full bg-[#1e1f23] border border-[#3f4147] rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="string">Texto (string)</option>
                            <option value="number">Numérico (number)</option>
                            <option value="date">Fecha (date)</option>
                            <option value="boolean">Booleano (boolean)</option>
                          </select>
                        </div>

                        {/* Delete */}
                        <div className="flex justify-end pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setWorkingParams(workingParams.filter((_, i) => i !== pIdx));
                            }}
                            className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>

                      {/* Default and Current value */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#2a2c30]">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                            Valor por Defecto
                          </span>
                          <input
                            type={p.type === 'number' ? 'number' : p.type === 'date' ? 'date' : 'text'}
                            value={p.defaultValue ?? ''}
                            onChange={(e) => {
                              const updated = [...workingParams];
                              updated[pIdx] = { ...p, defaultValue: e.target.value };
                              setWorkingParams(updated);
                            }}
                            className="w-full bg-[#1e1f23] border border-[#3f4147] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                            placeholder="Valor inicial"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                            Valor de Prueba Actual
                          </span>
                          <input
                            type={p.type === 'number' ? 'number' : p.type === 'date' ? 'date' : 'text'}
                            value={p.currentValue ?? p.defaultValue ?? ''}
                            onChange={(e) => {
                              const updated = [...workingParams];
                              updated[pIdx] = { ...p, currentValue: e.target.value };
                              setWorkingParams(updated);
                            }}
                            className="w-full bg-[#1e1f23] border border-[#3f4147] rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                            placeholder="Valor para probar la query"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED QUERIES LIBRARY */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Biblioteca de Consultas Guardadas</h3>
                  <p className="text-xs text-slate-400">
                    Carga consultas preconfiguradas o gestiona tus plantillas favoritas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedQueries.map(sq => (
                  <div
                    key={sq.id}
                    className="bg-[#18191c] border border-[#2f3136] rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-cyan-500/50 transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition">
                          {sq.name}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                          {sq.params?.length || 0} params
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {sq.description || 'Consulta SQL parametrizada'}
                      </p>
                      <pre className="mt-2 text-[11px] font-mono bg-[#121315] p-2.5 rounded-lg text-slate-300 line-clamp-3 overflow-hidden border border-black/40">
                        {sq.querySql}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2f3136]">
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedQuery(sq.id)}
                        className="text-xs text-slate-400 hover:text-rose-400 p-1 transition"
                        title="Eliminar de la biblioteca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSavedQuery(sq)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Cargar esta Consulta</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CREATE TABLE IN DATABASE */}
          {activeTab === 'export' && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-[#18191c] border border-[#2f3136] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Generar Nueva Tabla en la Base de Datos</h3>
                    <p className="text-xs text-slate-400">
                      Ejecuta la consulta actual y materializa el resultado como una nueva tabla física en Dexie.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Nombre de la Nueva Tabla:
                  </label>
                  <input
                    type="text"
                    value={exportTableName}
                    onChange={(e) => setExportTableName(e.target.value)}
                    placeholder="Ej. ventas_destacadas_2026"
                    className="w-full bg-[#1e1f23] border border-[#3f4147] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Se guardará en la base de datos actual ({dbInfo?.name || 'activa'}) y estará disponible para cualquier control del reporte.
                  </p>
                </div>

                {exportStatus && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      exportStatus.error
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                        : exportStatus.message
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {exportStatus.error ? (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    ) : exportStatus.message ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />
                    )}
                    <span>{exportStatus.error || exportStatus.message || 'Generando tabla en la base de datos...'}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportToNewTable}
                  disabled={exportStatus?.loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>{exportStatus?.loading ? 'Guardando en BD...' : 'Ejecutar y Guardar como Nueva Tabla en BD'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Test Execution Results Strip */}
          {testResult && (
            <div className="border border-[#2f3136] bg-[#141517] rounded-xl overflow-hidden shadow-md">
              <div className="px-4 py-3 bg-[#18191c] border-b border-[#2f3136] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Resultado de la Consulta:</span>
                  </span>
                  {testResult.success ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold font-mono">
                      {testResult.rowCount} filas devueltas ({testResult.durationMs} ms)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold font-mono">
                      Error de Ejecución
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {testResult.columns.length} columnas: <span className="text-slate-300">{testResult.columns.join(', ')}</span>
                </div>
              </div>

              {testResult.error ? (
                <div className="p-4 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5 border-t border-rose-500/20">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-mono">{testResult.error}</span>
                </div>
              ) : testResult.rows.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  La consulta se ejecutó con éxito pero no devolvió ninguna fila con los filtros/parámetros actuales.
                </div>
              ) : (
                <div className="max-h-72 sm:max-h-80 md:max-h-96 overflow-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1e2024] text-slate-200 sticky top-0 border-b border-[#2f3136] shadow-xs z-10">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-mono text-slate-500 text-center w-10">
                          #
                        </th>
                        {testResult.columns.map(col => (
                          <th key={col} className="px-3.5 py-2 font-mono font-semibold text-[11px] text-cyan-300 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24262b]">
                      {testResult.rows.slice(0, 50).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#1a1c20] transition">
                          <td className="px-3 py-1.5 text-slate-500 font-mono text-[10px] text-center select-none">
                            {rIdx + 1}
                          </td>
                          {testResult.columns.map(col => (
                            <td key={col} className="px-3.5 py-1.5 text-slate-200 font-mono text-[11px] truncate max-w-[240px]">
                              {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {testResult.rows.length > 50 && (
                    <div className="p-2.5 text-center text-[11px] text-slate-400 bg-[#16171a] border-t border-[#2f3136]">
                      Mostrando las primeras 50 filas de un total de <strong className="text-white font-mono">{testResult.rowCount}</strong> filas obtenidas.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#2f3136] bg-[#18191c] flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div>
              <span className="font-mono text-cyan-400">:parámetros</span> activos: <strong className="text-white font-mono">{workingParams.length}</strong>
            </div>
            <span className="text-[#3a3c42]">|</span>
            <div className="hidden sm:block">
              Tabla destino: <strong className="text-slate-300 font-mono">{exportTableName || 'Ninguna'}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#282a2e] hover:bg-[#32343a] text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar al QueryTable</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
