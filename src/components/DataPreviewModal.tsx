import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  Download,
  Table as TableIcon,
  Code2,
  ListFilter,
  FileSpreadsheet,
  Layers,
  Database,
  Info,
  Hash,
  Type,
  Calendar,
  ToggleLeft
} from 'lucide-react';
import { TableInfo } from '../types';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  tableInfo?: TableInfo;
  records: Record<string, any>[];
  fields: string[];
  elementName?: string;
  elementType?: 'table' | 'chart' | string;
}

export const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  isOpen,
  onClose,
  tableName,
  tableInfo,
  records = [],
  fields = [],
  elementName,
  elementType
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'json' | 'schema'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [rowLimit, setRowLimit] = useState<number>(25);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Compute effective columns: fields prop or keys from first records
  const columns = useMemo(() => {
    if (fields && fields.length > 0) return fields;
    if (tableInfo?.fields && tableInfo.fields.length > 0) return tableInfo.fields;
    if (records.length > 0 && records[0]) return Object.keys(records[0]);
    return [];
  }, [fields, tableInfo, records]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((rec) => {
      if (!rec || typeof rec !== 'object') return false;
      return Object.values(rec).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [records, searchQuery]);

  // Slice records for preview limit
  const visibleRecords = useMemo(() => {
    if (rowLimit <= 0) return filteredRecords;
    return filteredRecords.slice(0, rowLimit);
  }, [filteredRecords, rowLimit]);

  // Inferred schema information for the 'schema' tab
  const schemaAnalysis = useMemo(() => {
    if (columns.length === 0) return [];
    return columns.map((col) => {
      let nonNullCount = 0;
      const typeCounts: Record<string, number> = {};
      const sampleVals: any[] = [];

      for (const rec of records) {
        if (!rec) continue;
        const val = rec[col];
        if (val !== undefined && val !== null && val !== '') {
          nonNullCount++;
          const t = typeof val;
          let inferredType: string = t;
          if (t === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(val)) inferredType = 'fecha';
            else inferredType = 'texto';
          } else if (t === 'number') {
            inferredType = 'número';
          } else if (t === 'boolean') {
            inferredType = 'booleano';
          } else if (t === 'object') {
            inferredType = Array.isArray(val) ? 'lista' : 'objeto';
          }
          typeCounts[inferredType] = (typeCounts[inferredType] || 0) + 1;

          if (sampleVals.length < 3 && !sampleVals.includes(val)) {
            sampleVals.push(val);
          }
        }
      }

      // Dominant type
      let dominantType = 'desconocido';
      let maxCount = -1;
      for (const [type, count] of Object.entries(typeCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantType = type;
        }
      }

      return {
        column: col,
        dominantType,
        fillRate: records.length > 0 ? Math.round((nonNullCount / records.length) * 100) : 0,
        nonNullCount,
        sampleVals
      };
    });
  }, [columns, records]);

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    try {
      const dataToCopy = visibleRecords;
      navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (e) {
      console.error('Failed to copy JSON', e);
    }
  };

  // Download CSV sample
  const handleExportCsv = () => {
    try {
      if (columns.length === 0 || visibleRecords.length === 0) return;
      const header = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
      const rows = visibleRecords.map((rec) =>
        columns
          .map((col) => {
            const val = rec[col];
            if (val === null || val === undefined) return '""';
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      const csvContent = '\uFEFF' + [header, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${tableName || 'muestra_datos'}_preview.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    } catch (e) {
      console.error('Failed to export CSV', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-[#181a1d] border border-[#2f3136] shadow-2xl rounded-xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl h-[85vh] max-h-[780px]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#202225] border-b border-[#2f3136] flex items-center justify-between gap-3 select-none flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white truncate">
                  Vista Previa de Datos Crudos
                </h3>
                {tableName && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {tableName}
                  </span>
                )}
                {elementType && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#25282c] text-[#9ca3af] border border-[#2f3136]">
                    Control: {elementType === 'table' ? 'Tabla' : elementType === 'chart' ? 'Gráfico' : elementType}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9ca3af] mt-0.5 truncate">
                {tableName
                  ? `${records.length} registros cargados • ${columns.length} campos detectados`
                  : 'Sin tabla vinculada a este control'}
                {elementName ? ` • Elemento: "${elementName}"` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ModalFullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={() => setIsFullscreen(!isFullscreen)}
              buttonSize="sm"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#25282c] transition cursor-pointer"
              title="Cerrar vista previa (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Tabs Strip */}
        <div className="px-4 py-2 bg-[#1a1b1e] border-b border-[#2f3136] flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#141517] p-1 rounded-lg border border-[#2f3136]">
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                {visibleRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON Crudo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'schema'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Estructura ({columns.length})</span>
            </button>
          </div>

          {/* Search & Limit Controls */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-md">
            {activeTab === 'grid' && (
              <div className="relative flex-1 min-w-[140px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar muestra..."
                  className="w-full pl-8 pr-7 py-1 text-xs bg-[#141517] border border-[#2f3136] rounded-md text-white placeholder-[#6b7280] focus:outline-none focus:border-blue-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {activeTab === 'grid' && (
              <div className="flex items-center gap-1 text-xs text-[#9ca3af]">
                <span className="text-[11px] font-medium hidden sm:inline">Filas:</span>
                <select
                  value={rowLimit}
                  onChange={(e) => setRowLimit(Number(e.target.value))}
                  className="px-2 py-1 bg-[#141517] border border-[#2f3136] rounded text-xs font-mono text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="0">Todas ({records.length})</option>
                </select>
              </div>
            )}

            {/* Export / Copy Buttons */}
            {activeTab === 'json' ? (
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-white rounded border border-[#373a40] text-xs font-medium transition cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={records.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-white rounded border border-[#373a40] text-xs font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Descargar muestra actual en formato CSV"
              >
                {copiedCsv ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Descargado</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Descargar CSV</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-auto bg-[#141517]">
          {!tableName ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#9ca3af]">
              <div className="w-12 h-12 rounded-full bg-[#1a1b1e] border border-[#2f3136] flex items-center justify-center mb-3 text-amber-400">
                <Info className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Sin Tabla Vinculada</h4>
              <p className="text-xs max-w-sm text-[#9ca3af]">
                Este elemento no está conectado a ninguna tabla de la base de datos.
                Selecciona una tabla en la sección &quot;Fuente de Datos&quot; del inspector para visualizar sus datos crudos.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#9ca3af]">
              <div className="w-12 h-12 rounded-full bg-[#1a1b1e] border border-[#2f3136] flex items-center justify-center mb-3 text-[#5865f2]">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                La tabla &quot;{tableName}&quot; está vacía
              </h4>
              <p className="text-xs max-w-sm text-[#9ca3af]">
                Actualmente no hay registros almacenados en esta tabla. Puedes insertar o importar registros desde el Gestor de Base de Datos (Base de Datos en la barra superior).
              </p>
            </div>
          ) : activeTab === 'grid' ? (
            /* Grid View */
            <div className="w-full h-full overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#1e2024] sticky top-0 z-10 border-b border-[#2f3136] shadow-xs">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-mono font-bold text-[#6b7280] uppercase w-12 text-center border-r border-[#2f3136]/60 bg-[#1e2024]">
                      #
                    </th>
                    {columns.map((col, idx) => (
                      <th
                        key={`th_col_${col}_${idx}`}
                        className="px-3 py-2 font-mono text-[11px] font-bold text-[#e1e1e6] whitespace-nowrap border-r border-[#2f3136]/60 last:border-r-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-blue-400 font-semibold">{col}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24272c] font-mono">
                  {visibleRecords.length > 0 ? (
                    visibleRecords.map((record, rIdx) => (
                      <tr
                        key={`tr_rec_${rIdx}`}
                        className="hover:bg-[#1f2227] transition-colors"
                      >
                        <td className="px-3 py-1.5 text-center text-[10px] text-[#6b7280] border-r border-[#24272c] select-none bg-[#181a1d]/50">
                          {rIdx + 1}
                        </td>
                        {columns.map((col, cIdx) => {
                          const val = record[col];
                          return (
                            <td
                              key={`td_rec_${rIdx}_${col}_${cIdx}`}
                              className="px-3 py-1.5 text-slate-200 text-xs border-r border-[#24272c] last:border-r-0 max-w-[260px] truncate"
                              title={val !== undefined && val !== null ? String(val) : ''}
                            >
                              {val === null ? (
                                <span className="text-[10px] italic text-[#6b7280]">null</span>
                              ) : val === undefined ? (
                                <span className="text-[10px] italic text-[#6b7280]">-</span>
                              ) : typeof val === 'boolean' ? (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    val
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {val ? 'TRUE' : 'FALSE'}
                                </span>
                              ) : typeof val === 'number' ? (
                                <span className="text-amber-300 font-semibold">
                                  {val.toLocaleString('es-ES')}
                                </span>
                              ) : typeof val === 'object' ? (
                                <span className="text-purple-300 text-[11px] truncate block">
                                  {JSON.stringify(val)}
                                </span>
                              ) : (
                                <span className="text-slate-200">{String(val)}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="text-center py-10 text-xs text-[#9ca3af] italic"
                      >
                        No se encontraron registros que coincidan con &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'json' ? (
            /* JSON View */
            <div className="p-4 h-full overflow-auto font-mono text-xs">
              <pre className="text-emerald-400 leading-relaxed bg-[#111215] p-4 rounded-lg border border-[#2f3136] overflow-x-auto selection:bg-blue-600 selection:text-white">
                {JSON.stringify(visibleRecords, null, 2)}
              </pre>
            </div>
          ) : (
            /* Schema / Structure View */
            <div className="p-4 h-full overflow-auto">
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="text-xs text-[#9ca3af] flex items-center justify-between">
                  <span>Esquema y distribución de tipos inferidos:</span>
                  <span className="font-mono text-blue-400">{columns.length} campos totales</span>
                </div>
                <div className="bg-[#181a1d] border border-[#2f3136] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#202225] text-[10px] font-mono text-[#9ca3af] uppercase border-b border-[#2f3136]">
                      <tr>
                        <th className="px-3 py-2">Campo</th>
                        <th className="px-3 py-2">Tipo Inferido</th>
                        <th className="px-3 py-2">Tasa de Relleno</th>
                        <th className="px-3 py-2">Muestras de Valores</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24272c] font-mono">
                      {schemaAnalysis.map((item, idx) => (
                        <tr key={`schema_row_${item.column}_${idx}`} className="hover:bg-[#1f2227]">
                          <td className="px-3 py-2 text-white font-bold flex items-center gap-1.5">
                            {item.dominantType === 'número' ? (
                              <Hash className="w-3.5 h-3.5 text-amber-400" />
                            ) : item.dominantType === 'fecha' ? (
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            ) : item.dominantType === 'booleano' ? (
                              <ToggleLeft className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <Type className="w-3.5 h-3.5 text-blue-400" />
                            )}
                            <span>{item.column}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#25282c] text-[#e1e1e6] border border-[#373a40]">
                              {item.dominantType}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-[#25282c] overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${item.fillRate}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-[#9ca3af]">
                                {item.fillRate}% ({item.nonNullCount}/{records.length})
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[#9ca3af] text-[11px] truncate max-w-xs">
                            {item.sampleVals.length > 0
                              ? item.sampleVals.map((s, sIdx) => (
                                  <span
                                    key={`samp_${idx}_${sIdx}`}
                                    className="inline-block px-1.5 py-0.2 bg-[#141517] rounded mr-1 text-slate-300 border border-[#2f3136]"
                                  >
                                    {String(s)}
                                  </span>
                                ))
                              : <span className="italic text-[#6b7280]">vacío</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#1e2024] border-t border-[#2f3136] flex items-center justify-between text-xs text-[#9ca3af] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              {tableName
                ? `Mostrando ${visibleRecords.length} de ${filteredRecords.length} registros ${
                    searchQuery ? `(filtrados de ${records.length})` : ''
                  }`
                : 'Sin datos disponibles'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#25282c] hover:bg-[#2f3136] text-white rounded border border-[#373a40] text-xs font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
