import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CanvasElement,
  DatabaseInfo,
  QueryParamDefinition,
  SavedQueryDefinition
} from '../types';
import { executeQuery, QueryExecutionResult } from '../utils/queryEngine';
import { QueryBuilderModal } from './QueryBuilderModal';
import {
  Database,
  Play,
  Sliders,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  TableProperties,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';

interface QueryTableControlProps {
  element: CanvasElement;
  dbRecords: Record<string, Record<string, any>[]>;
  dbInfo: DatabaseInfo | null;
  onUpdateElement?: (updated: CanvasElement) => void;
  isInteractive?: boolean;
  onTableCreated?: (newTableName: string) => void;
}

export const QueryTableControl: React.FC<QueryTableControlProps> = ({
  element,
  dbRecords,
  dbInfo,
  onUpdateElement,
  isInteractive = true,
  onTableCreated
}) => {
  const binding = element.binding || {};
  const style = element.style || {};

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localParams, setLocalParams] = useState<QueryParamDefinition[]>(() => {
    return binding.queryParams && binding.queryParams.length > 0
      ? JSON.parse(JSON.stringify(binding.queryParams))
      : [];
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExecuting, setIsExecuting] = useState(false);

  // Sync local params if element.binding.queryParams changes externally
  useEffect(() => {
    if (binding.queryParams) {
      setLocalParams(JSON.parse(JSON.stringify(binding.queryParams)));
    }
  }, [binding.queryParams]);

  // Execute query against current SQL and parameters
  const queryResult = useMemo<QueryExecutionResult>(() => {
    const rawSql = binding.querySql || 'SELECT * FROM ventas LIMIT 50';
    return executeQuery(rawSql, localParams, dbRecords);
  }, [binding.querySql, localParams, dbRecords]);

  // Handle parameter input changes
  const handleParamChange = useCallback(
    (paramName: string, newValue: any) => {
      const updatedParams = localParams.map(p => {
        if (p.name === paramName) {
          return { ...p, currentValue: newValue };
        }
        return p;
      });

      setLocalParams(updatedParams);
      setCurrentPage(1);

      if (onUpdateElement) {
        onUpdateElement({
          ...element,
          binding: {
            ...binding,
            queryParams: updatedParams
          }
        });
      }
    },
    [localParams, onUpdateElement, element, binding]
  );

  // Switch to another saved query
  const handleSelectSavedQuery = (sqId: string) => {
    const saved = binding.savedQueries?.find(q => q.id === sqId);
    if (!saved) return;

    const newParams = saved.params && saved.params.length > 0
      ? JSON.parse(JSON.stringify(saved.params))
      : localParams;

    setLocalParams(newParams);
    setCurrentPage(1);

    if (onUpdateElement) {
      onUpdateElement({
        ...element,
        binding: {
          ...binding,
          querySql: saved.querySql,
          queryParams: newParams,
          activeQueryId: saved.id
        }
      });
    }
  };

  // Manual re-execution trigger
  const handleManualRun = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setCurrentPage(1);
    }, 150);
  };

  // Filtered and sorted rows for table view
  const processedRows = useMemo(() => {
    let rows = [...(queryResult.rows || [])];

    // Search filter across all columns
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      rows = rows.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortColumn) {
      rows.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return rows;
  }, [queryResult.rows, searchFilter, sortColumn, sortDirection]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));

  // Toggle sort direction
  const handleToggleSort = (col: string) => {
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

  const savedQueries = binding.savedQueries || [];
  const currentSavedQuery = savedQueries.find(q => q.id === binding.activeQueryId);

  return (
    <div
      id={`querytable-${element.id}`}
      className="w-full h-full flex flex-col rounded-xl overflow-hidden shadow-sm border select-none transition-all duration-150"
      style={{
        backgroundColor: style.backgroundColor || '#ffffff',
        borderColor: style.borderColor || '#e2e8f0',
        color: style.color || '#1e293b'
      }}
    >
      {/* Top Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
            <TableProperties className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs text-slate-800 truncate">
            {element.name || 'QueryTable'}
          </span>

          {/* Saved Query Selector Dropdown */}
          {savedQueries.length > 0 && (
            <select
              value={binding.activeQueryId || ''}
              onChange={(e) => handleSelectSavedQuery(e.target.value)}
              className="bg-white border border-slate-200 text-[11px] rounded-md px-2 py-1 text-slate-700 outline-none hover:border-cyan-400 max-w-[150px] truncate"
              title="Cambiar entre consultas guardadas"
            >
              <option value="">(Consulta actual)</option>
              {savedQueries.map(sq => (
                <option key={sq.id} value={sq.id}>
                  {sq.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Re-run button */}
          <button
            type="button"
            onClick={handleManualRun}
            disabled={isExecuting}
            title="Ejecutar consulta"
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition"
          >
            <Play className={`w-3 h-3 ${isExecuting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">Ejecutar</span>
          </button>

          {/* Design Query Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Diseñar o editar query SQL"
            className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-semibold flex items-center gap-1 transition"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Diseñar Query</span>
          </button>

          {/* Quick Create Table in DB button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Guardar resultado como nueva tabla en la Base de Datos"
            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition"
          >
            <Database className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">+ Tabla BD</span>
          </button>
        </div>
      </div>

      {/* Dynamic Query Parameters Bar */}
      {localParams.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-600" />
            <span>Parámetros:</span>
          </span>

          {localParams.map(param => (
            <div
              key={param.name}
              className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs text-[11px]"
            >
              <label
                htmlFor={`param-${element.id}-${param.name}`}
                className="font-medium text-slate-600"
              >
                {param.label || param.name}:
              </label>

              {param.type === 'boolean' ? (
                <input
                  id={`param-${element.id}-${param.name}`}
                  type="checkbox"
                  checked={
                    param.currentValue !== undefined
                      ? Boolean(param.currentValue)
                      : Boolean(param.defaultValue)
                  }
                  onChange={(e) => handleParamChange(param.name, e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
              ) : param.type === 'number' ? (
                <input
                  id={`param-${element.id}-${param.name}`}
                  type="number"
                  value={param.currentValue !== undefined ? param.currentValue : param.defaultValue ?? ''}
                  onChange={(e) => handleParamChange(param.name, Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono text-[11px] outline-none focus:border-cyan-500"
                />
              ) : param.type === 'date' ? (
                <input
                  id={`param-${element.id}-${param.name}`}
                  type="date"
                  value={param.currentValue !== undefined ? param.currentValue : param.defaultValue ?? ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono text-[11px] outline-none focus:border-cyan-500"
                />
              ) : (
                <input
                  id={`param-${element.id}-${param.name}`}
                  type="text"
                  value={param.currentValue !== undefined ? param.currentValue : param.defaultValue ?? ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  placeholder="valor"
                  className="w-24 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono text-[11px] outline-none focus:border-cyan-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats & Search Strip */}
      <div className="px-3 py-1.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          {queryResult.success ? (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              {queryResult.rowCount} filas ({queryResult.durationMs} ms)
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span>Error en consulta</span>
            </span>
          )}

          {currentSavedQuery && (
            <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[160px]">
              Query: {currentSavedQuery.name}
            </span>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar en resultados..."
            className="pl-7 pr-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-700 placeholder-slate-400 outline-none focus:border-cyan-500 w-36 sm:w-48"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto bg-white min-h-0">
        {queryResult.error ? (
          <div className="p-4 flex flex-col items-center justify-center text-center h-full text-xs text-rose-600 space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-500" />
            <p className="font-semibold">{queryResult.error}</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition"
            >
              Abrir Diseñador para corregir
            </button>
          </div>
        ) : queryResult.columns.length === 0 || processedRows.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center h-full text-xs text-slate-400 space-y-2">
            <TableProperties className="w-8 h-8 text-slate-300" />
            <p className="font-medium text-slate-600">No se encontraron registros para la consulta.</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Prueba cambiando los parámetros o haz clic en "Diseñar Query" para ajustar los filtros.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs text-slate-600 font-semibold border-b border-slate-200 z-10">
              <tr>
                {queryResult.columns.map(col => {
                  const isSorted = sortColumn === col;
                  return (
                    <th
                      key={col}
                      onClick={() => handleToggleSort(col)}
                      className="px-3 py-2 cursor-pointer hover:bg-slate-100/80 transition text-[11px] whitespace-nowrap select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>{col}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-cyan-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-cyan-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-cyan-50/30 transition">
                  {queryResult.columns.map(col => {
                    const val = row[col];
                    const isNum = typeof val === 'number';
                    const isDate = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val);

                    return (
                      <td
                        key={col}
                        className={`px-3 py-1.5 text-slate-700 font-mono text-[11px] truncate max-w-[220px] ${
                          isNum ? 'text-right font-medium' : ''
                        }`}
                      >
                        {val !== undefined && val !== null ? (
                          isNum ? (
                            val.toLocaleString('es-ES')
                          ) : (
                            String(val)
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {processedRows.length > pageSize && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1 text-[11px]">
            <span>Filas por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] text-slate-700 outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span>
              Página {currentPage} de {totalPages} ({processedRows.length} filas)
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Query Builder Modal */}
      {isModalOpen && (
        <QueryBuilderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          element={element}
          onUpdateElement={(upd) => {
            if (onUpdateElement) onUpdateElement(upd);
          }}
          dbInfo={dbInfo}
          dbRecords={dbRecords}
          onTableCreated={onTableCreated}
        />
      )}
    </div>
  );
};
