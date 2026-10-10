import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { dexieManager, sanitizeTableName } from '../../services/dexieManager';
import {
  FileSpreadsheet,
  Upload,
  X,
  Check,
  AlertTriangle,
  Link as LinkIcon,
  Clock,
  RefreshCw,
  Table as TableIcon,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

interface AddExcelTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDb: string;
  existingTables: string[];
  onTableCreated: (tableName: string) => void;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

interface ParsedSheet {
  sheetName: string;
  records: Record<string, any>[];
  fields: string[];
  rowCount: number;
}

export const AddExcelTableModal: React.FC<AddExcelTableModalProps> = ({
  isOpen,
  onClose,
  selectedDb,
  existingTables,
  onTableCreated,
  onNotification
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [tableNameInput, setTableNameInput] = useState<string>('');
  const [isLinked, setIsLinked] = useState<boolean>(true);
  const [autoRefreshIntervalMinutes, setAutoRefreshIntervalMinutes] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheets: ParsedSheet[] = [];

      for (const name of workbook.SheetNames) {
        const worksheet = workbook.Sheets[name];
        const raw = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        if (raw.length > 0) {
          // Normalize column names
          const sanitizedRecords = raw.map((row, idx) => {
            const cleanRow: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
              const cleanKey = String(k).trim();
              if (cleanKey) {
                cleanRow[cleanKey] = v;
              }
            }
            if (cleanRow.id === undefined && cleanRow.ID === undefined && cleanRow.Id === undefined) {
              cleanRow.id = idx + 1;
            }
            return cleanRow;
          });

          const fields = Object.keys(sanitizedRecords[0] || {});

          sheets.push({
            sheetName: name,
            records: sanitizedRecords,
            fields,
            rowCount: sanitizedRecords.length
          });
        }
      }

      if (sheets.length === 0) {
        onNotification({
          type: 'error',
          text: 'El archivo no contiene filas legibles en ninguna hoja de cálculo.'
        });
        setParsedSheets([]);
        return;
      }

      setParsedSheets(sheets);
      setSelectedSheetIndex(0);

      // Default table name based on sheet or file name
      const initialSheetName = sheets[0].sheetName;
      let defaultTableName = sanitizeTableName(initialSheetName);
      if (defaultTableName === 'sheet1' || defaultTableName === 'hoja1') {
        const fileBase = selectedFile.name.replace(/\.[^/.]+$/, '');
        defaultTableName = sanitizeTableName(fileBase);
      }
      setTableNameInput(defaultTableName);

      onNotification({
        type: 'success',
        text: `Archivo Excel analizado: ${sheets.length} hoja(s) con un total de ${sheets.reduce((acc, s) => acc + s.rowCount, 0)} filas.`
      });
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      onNotification({
        type: 'error',
        text: `Error al leer el archivo Excel: ${err.message || err}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSheetChange = (index: number) => {
    setSelectedSheetIndex(index);
    const targetSheet = parsedSheets[index];
    if (targetSheet) {
      let defaultTableName = sanitizeTableName(targetSheet.sheetName);
      if (defaultTableName === 'sheet1' || defaultTableName === 'hoja1') {
        const fileBase = fileName.replace(/\.[^/.]+$/, '');
        defaultTableName = sanitizeTableName(fileBase);
      }
      setTableNameInput(defaultTableName);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleCreate = async () => {
    if (!selectedDb) {
      onNotification({ type: 'error', text: 'Selecciona una base de datos de destino.' });
      return;
    }
    const cleanTableName = sanitizeTableName(tableNameInput);
    if (!cleanTableName) {
      onNotification({ type: 'error', text: 'Ingresa un nombre válido para la tabla.' });
      return;
    }

    const currentSheet = parsedSheets[selectedSheetIndex];
    if (!currentSheet || currentSheet.records.length === 0) {
      onNotification({ type: 'error', text: 'La hoja seleccionada no tiene datos.' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await dexieManager.addTableFromExcel(
        selectedDb,
        cleanTableName,
        currentSheet.records,
        {
          fileName,
          sheetName: currentSheet.sheetName,
          fileSize,
          lastModified: file?.lastModified,
          isLinked,
          autoRefreshIntervalMinutes: isLinked ? autoRefreshIntervalMinutes : 0
        }
      );

      if (res.success) {
        // Cache file object in memory for active session refresh
        if (file) {
          dexieManager.tableFileCache.set(`${selectedDb}_${cleanTableName}`, file);
        }

        onNotification({
          type: 'success',
          text: res.message
        });
        onTableCreated(res.tableName);
        onClose();
      } else {
        onNotification({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      onNotification({ type: 'error', text: e.message || 'Error al crear tabla desde Excel' });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSheet = parsedSheets[selectedSheetIndex];
  const tableAlreadyExists = existingTables.includes(sanitizeTableName(tableNameInput));

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#202225] border border-[#2f3136] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col text-[#e1e1e6] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Nueva Tabla desde Excel</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                  BD: {selectedDb}
                </span>
              </h3>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                Carga un archivo .xlsx, .xls o .csv para generar una nueva tabla en IndexedDB con soporte de enlace y refresco.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#2f3136] transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4.5 flex-1">
          {/* File Upload / Drag & Drop Area */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-7 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                dragActive
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-[#373a40] hover:border-emerald-500/50 bg-[#1a1b1e]/60 hover:bg-[#1a1b1e]'
              }`}
            >
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-full mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white">
                Arrastra tu archivo Excel aquí o haz clic para seleccionarlo
              </div>
              <p className="text-xs text-[#9ca3af] mt-1">
                Formatos soportados: <span className="text-emerald-300 font-mono font-semibold">.xlsx</span>, <span className="text-emerald-300 font-mono font-semibold">.xls</span>, <span className="text-emerald-300 font-mono font-semibold">.csv</span>
              </p>
              <span className="mt-3 px-3 py-1 bg-[#25282c] border border-[#2f3136] rounded-lg text-xs font-semibold text-[#cbd5e1]">
                Examinar Archivo
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-[#1a1b1e] border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">{fileName}</div>
                  <div className="text-[11px] text-[#9ca3af] mt-0.5 flex items-center gap-2">
                    <span>{(fileSize / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="text-emerald-400">{parsedSheets.length} hoja(s) detectadas</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] border border-[#373a40] rounded-lg text-xs transition cursor-pointer"
              >
                Cambiar archivo
              </button>
            </div>
          )}

          {/* Sheet Selector and Table Config */}
          {parsedSheets.length > 0 && (
            <div className="space-y-4">
              {/* Sheet Selector (if multiple) */}
              {parsedSheets.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-[#cbd5e1] block mb-1.5">
                    Seleccionar Hoja de Cálculo del archivo Excel:
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {parsedSheets.map((sheet, idx) => (
                      <button
                        key={`sheet_tab_${idx}`}
                        type="button"
                        onClick={() => handleSheetChange(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                          selectedSheetIndex === idx
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-[#1a1b1e] hover:bg-[#25282c] text-[#cbd5e1] border border-[#2f3136]'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{sheet.sheetName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                          {sheet.rowCount}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Name Input */}
              <div className="p-3.5 bg-[#1a1b1e] border border-[#2f3136] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="newTableNameInput" className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Nombre de la nueva tabla en la Base de Datos</span>
                  </label>
                  <span className="text-[11px] text-[#9ca3af] font-mono">
                    Hoja origen: <strong>{currentSheet?.sheetName}</strong> ({currentSheet?.rowCount} filas)
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="newTableNameInput"
                    type="text"
                    value={tableNameInput}
                    onChange={(e) => setTableNameInput(e.target.value)}
                    placeholder="ej: pedidos_2026"
                    className="w-full px-3 py-1.5 bg-[#202225] border border-[#2f3136] rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {tableAlreadyExists && (
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Ya existe una tabla llamada «{sanitizeTableName(tableNameInput)}». Al crearla se actualizarán sus registros y esquema.</span>
                  </div>
                )}
              </div>

              {/* Linking and Auto-Refresh Options (KEY USER REQUIREMENT) */}
              <div className="p-4 bg-[#1a1b1e] border border-emerald-500/30 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Vincular tabla a este archivo Excel</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-xs text-[#9ca3af] mt-0.5 leading-relaxed">
                        Permite refrescar la tabla posteriormente para recargar los datos actualizados del archivo Excel de origen sin perder la estructura.
                      </p>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={(e) => setIsLinked(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[#2f3136] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Auto-Refresh frequency selector if linked */}
                {isLinked && (
                  <div className="pt-2 border-t border-[#2f3136]/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#cbd5e1] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Frecuencia de Auto-Refresco:</span>
                      </span>
                      <span className="text-[11px] text-[#9ca3af]">
                        {autoRefreshIntervalMinutes === 0
                          ? 'Manual (mediante botón Refrescar)'
                          : `Automático cada ${autoRefreshIntervalMinutes} min`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { label: 'Manual', val: 0 },
                        { label: 'Cada 1 min', val: 1 },
                        { label: 'Cada 5 min', val: 5 },
                        { label: 'Cada 15 min', val: 15 },
                        { label: 'Cada 30 min', val: 30 }
                      ].map((item) => (
                        <button
                          key={`freq_${item.val}`}
                          type="button"
                          onClick={() => setAutoRefreshIntervalMinutes(item.val)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                            autoRefreshIntervalMinutes === item.val
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500 font-bold'
                              : 'bg-[#202225] hover:bg-[#25282c] text-[#cbd5e1] border border-[#2f3136]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] bg-[#202225] p-2 rounded-lg border border-[#2f3136]">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        En la pestaña DATA aparecerá un botón directo para <strong>Refrescar Tabla</strong> con 1 clic en cualquier momento.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Preview Table */}
              {currentSheet && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                    <span className="font-semibold text-[#cbd5e1]">
                      Vista previa de datos ({currentSheet.fields.length} columnas, {currentSheet.rowCount} filas):
                    </span>
                    <span className="text-[10px] font-mono">Mostrando primeras {Math.min(5, currentSheet.rowCount)} filas</span>
                  </div>

                  <div className="border border-[#2f3136] rounded-xl overflow-x-auto max-h-48 bg-[#1a1b1e]">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#25282c] text-[#cbd5e1] border-b border-[#2f3136]">
                          <th className="p-2 text-[10px] uppercase font-bold text-[#9ca3af] w-10 text-center">#</th>
                          {currentSheet.fields.map((f, fIdx) => (
                            <th key={`prev_th_${f}_${fIdx}`} className="p-2 text-[10px] uppercase font-bold text-white whitespace-nowrap">
                              {f}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2f3136]/50">
                        {currentSheet.records.slice(0, 5).map((row, rIdx) => (
                          <tr key={`prev_tr_${rIdx}`} className="hover:bg-[#25282c]/40">
                            <td className="p-2 text-[#9ca3af] text-[10px] text-center">{rIdx + 1}</td>
                            {currentSheet.fields.map((f, fIdx) => (
                              <td key={`prev_td_${rIdx}_${fIdx}`} className="p-2 text-[11px] text-[#e1e1e6] whitespace-nowrap max-w-[150px] truncate">
                                {typeof row[f] === 'object' ? JSON.stringify(row[f]) : String(row[f] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 border-t border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-xl text-xs font-medium transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!file || parsedSheets.length === 0 || isProcessing || !tableNameInput.trim()}
            onClick={handleCreate}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/25 transition cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  Crear Tabla ({currentSheet?.rowCount || 0} registros)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
