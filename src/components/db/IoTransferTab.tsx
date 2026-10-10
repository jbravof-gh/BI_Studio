import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DatabaseInfo, TableRelationship, ExcelLinkedSource, DatabaseExportJSON } from '../../types';
import { dexieManager, AnalyzedDatabase, DatabaseAnalysisResult } from '../../services/dexieManager';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Layers,
  ArrowRight,
  Database,
  Table as TableIcon,
  Link as LinkIcon,
  Check,
  X,
  Sparkles,
  Info,
  Clock,
  HardDrive
} from 'lucide-react';

interface IoTransferTabProps {
  databases: string[];
  selectedDb: string;
  onSelectDatabase: (name: string) => void;
  onDbChanged: () => void;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const IoTransferTab: React.FC<IoTransferTabProps> = ({
  databases,
  selectedDb,
  onSelectDatabase,
  onDbChanged,
  onNotification
}) => {
  const [subTab, setSubTab] = useState<'json' | 'excel'>('json');

  // --- JSON State ---
  const [exportTargetDb, setExportTargetDb] = useState<string>(selectedDb || databases[0] || '');
  const [exportDbInfo, setExportDbInfo] = useState<DatabaseInfo | null>(null);
  const [exportSelectedTables, setExportSelectedTables] = useState<string[]>([]);
  const [exportIncludeRelationships, setExportIncludeRelationships] = useState(true);
  const [exportIncludeDesigns, setExportIncludeDesigns] = useState(true);

  // JSON Import Analyzer
  const [analyzedResult, setAnalyzedResult] = useState<DatabaseAnalysisResult | null>(null);
  const [analyzedRawContent, setAnalyzedRawContent] = useState<string>('');
  const [importSelectedDbIndex, setImportSelectedDbIndex] = useState<number>(0);
  const [targetDbNameInput, setTargetDbNameInput] = useState<string>('');
  const [importSelectedTables, setImportSelectedTables] = useState<string[]>([]);
  const [importRelationships, setImportRelationships] = useState(true);
  const [importDesigns, setImportDesigns] = useState(true);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge' | 'create_new'>('create_new');
  const [isImporting, setIsImporting] = useState(false);

  // --- Excel State ---
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [excelParsedSheets, setExcelParsedSheets] = useState<{ sheetName: string; records: Record<string, any>[] }[]>([]);
  const [excelSelectedSheets, setExcelSelectedSheets] = useState<string[]>([]);
  const [excelDbName, setExcelDbName] = useState<string>('');
  const [excelImportType, setExcelImportType] = useState<'copy' | 'link'>('link');
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  // Linked Excel databases
  const [linkedSources, setLinkedSources] = useState<ExcelLinkedSource[]>([]);
  const [syncingDbName, setSyncingDbName] = useState<string | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const excelSyncInputRef = useRef<HTMLInputElement>(null);
  const [currentSyncTargetDb, setCurrentSyncTargetDb] = useState<string | null>(null);

  useEffect(() => {
    if (exportTargetDb) {
      loadExportDbInfo(exportTargetDb);
    }
  }, [exportTargetDb]);

  useEffect(() => {
    loadLinkedSources();
  }, [databases]);

  const loadLinkedSources = () => {
    const list: ExcelLinkedSource[] = [];
    for (const db of databases) {
      const src = dexieManager.getExcelLinkedSource(db);
      if (src) list.push(src);
    }
    setLinkedSources(list);
  };

  const loadExportDbInfo = async (dbName: string) => {
    const info = await dexieManager.getDatabaseInfo(dbName);
    setExportDbInfo(info);
    if (info) {
      setExportSelectedTables(info.tables.map(t => t.name));
    }
  };

  // --- JSON Export Handler ---
  const handleExecuteExport = async () => {
    if (!exportTargetDb) {
      onNotification({ type: 'error', text: 'Selecciona una base de datos para exportar.' });
      return;
    }

    try {
      const exported = await dexieManager.exportDatabaseSelectiveJSON(exportTargetDb, {
        tableNames: exportSelectedTables,
        includeRelationships: exportIncludeRelationships,
        includeDesigns: exportIncludeDesigns
      });

      const jsonStr = JSON.stringify(exported, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportTargetDb}_export_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      onNotification({
        type: 'success',
        text: `Exportación generada exitosamente (${exportSelectedTables.length} tablas).`
      });
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al exportar base de datos.' });
    }
  };

  // --- JSON File Analysis Handler ---
  const handleAnalyzeJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        setAnalyzedRawContent(text);
        const parsed = JSON.parse(text);
        const analysis = dexieManager.analyzeDatabaseJSON(parsed);

        if (!analysis.isValid || analysis.databases.length === 0) {
          onNotification({
            type: 'error',
            text: 'El archivo JSON no tiene un formato válido de base de datos o tablas.'
          });
          setAnalyzedResult(null);
          return;
        }

        setAnalyzedResult(analysis);
        setImportSelectedDbIndex(0);
        const firstDb = analysis.databases[0];
        setTargetDbNameInput(firstDb.name || 'Nueva_BD_Importada');
        setImportSelectedTables(firstDb.tables.map(t => t.name));
        onNotification({
          type: 'success',
          text: `Análisis completado: ${analysis.databases.length} BD(s), ${analysis.totalTables} tabla(s) detectadas.`
        });
      } catch (err: any) {
        onNotification({ type: 'error', text: 'Error al procesar JSON: ' + err.message });
        setAnalyzedResult(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectAnalyzedDb = (idx: number) => {
    if (!analyzedResult || !analyzedResult.databases[idx]) return;
    setImportSelectedDbIndex(idx);
    const db = analyzedResult.databases[idx];
    setTargetDbNameInput(db.name);
    setImportSelectedTables(db.tables.map(t => t.name));
  };

  const handleExecuteImport = async () => {
    if (!analyzedResult || !analyzedResult.databases[importSelectedDbIndex]) {
      onNotification({ type: 'error', text: 'No hay base de datos analizada para importar.' });
      return;
    }

    const currentAnalyzed = analyzedResult.databases[importSelectedDbIndex];
    if (!targetDbNameInput.trim()) {
      onNotification({ type: 'error', text: 'Ingresa un nombre para la base de datos destino.' });
      return;
    }

    if (importSelectedTables.length === 0) {
      onNotification({ type: 'error', text: 'Selecciona al menos una tabla para importar.' });
      return;
    }

    setIsImporting(true);
    try {
      const res = await dexieManager.importSelectiveDatabaseJSON(currentAnalyzed, {
        targetDbName: targetDbNameInput.trim(),
        selectedTableNames: importSelectedTables,
        importRelationships,
        importDesigns,
        mode: importMode
      });

      if (res.success) {
        onNotification({ type: 'success', text: res.message });
        onSelectDatabase(res.databaseName);
        onDbChanged();
        loadLinkedSources();
        setAnalyzedResult(null);
      } else {
        onNotification({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      onNotification({ type: 'error', text: e.message || 'Error al ejecutar la importación.' });
    } finally {
      setIsImporting(false);
    }
  };

  // --- Excel File Parser Handler ---
  const handleSelectExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setExcelFileName(file.name);
    const sanitizedDbName = file.name.replace(/\.[^/.]+$/, '').replace(/[\s\-\.]+/g, '_') + '_DB';
    setExcelDbName(sanitizedDbName);
    setIsProcessingExcel(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const parsed: { sheetName: string; records: Record<string, any>[] }[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        if (rawJson.length > 0) {
          parsed.push({
            sheetName: name,
            records: rawJson
          });
        }
      }

      if (parsed.length === 0) {
        onNotification({
          type: 'error',
          text: 'El archivo Excel no contiene hojas con filas de datos legibles.'
        });
        setExcelParsedSheets([]);
        return;
      }

      setExcelParsedSheets(parsed);
      setExcelSelectedSheets(parsed.map(p => p.sheetName));
      onNotification({
        type: 'success',
        text: `Excel analizado: ${parsed.length} hoja(s) encontradas (${parsed.reduce((a, b) => a + b.records.length, 0)} filas).`
      });
    } catch (err: any) {
      onNotification({ type: 'error', text: 'Error al leer archivo Excel: ' + err.message });
    } finally {
      setIsProcessingExcel(false);
      e.target.value = '';
    }
  };

  const handleCreateDatabaseFromExcel = async () => {
    if (!excelDbName.trim()) {
      onNotification({ type: 'error', text: 'El nombre de la base de datos es obligatorio.' });
      return;
    }

    const sheetsToImport = excelParsedSheets.filter(s => excelSelectedSheets.includes(s.sheetName));
    if (sheetsToImport.length === 0) {
      onNotification({ type: 'error', text: 'Selecciona al menos una hoja para crear las tablas.' });
      return;
    }

    setIsProcessingExcel(true);
    try {
      const res = await dexieManager.createDatabaseFromExcel(
        excelDbName.trim(),
        sheetsToImport,
        excelFile
          ? {
              fileName: excelFileName,
              fileSize: excelFile.size,
              lastModified: excelFile.lastModified,
              isLinked: excelImportType === 'link'
            }
          : undefined
      );

      if (res.success) {
        onNotification({ type: 'success', text: res.message });
        onSelectDatabase(res.databaseName);
        onDbChanged();
        loadLinkedSources();
        setExcelFile(null);
        setExcelParsedSheets([]);
      } else {
        onNotification({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al procesar base de datos Excel.' });
    } finally {
      setIsProcessingExcel(false);
    }
  };

  // --- Excel Refresh / Sync Handler ---
  const handleTriggerSync = (dbName: string) => {
    setCurrentSyncTargetDb(dbName);
    if (excelSyncInputRef.current) {
      excelSyncInputRef.current.click();
    }
  };

  const handleProcessSyncFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetDb = currentSyncTargetDb;
    if (!file || !targetDb) return;

    setSyncingDbName(targetDb);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const parsed: { sheetName: string; records: Record<string, any>[] }[] = [];

      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        if (rawJson.length > 0) {
          parsed.push({ sheetName: name, records: rawJson });
        }
      }

      const res = await dexieManager.refreshDatabaseFromExcel(targetDb, parsed, {
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified
      });

      if (res.success) {
        onNotification({ type: 'success', text: res.message });
        onDbChanged();
        loadLinkedSources();
      } else {
        onNotification({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: 'Error al sincronizar Excel: ' + err.message });
    } finally {
      setSyncingDbName(null);
      setCurrentSyncTargetDb(null);
      e.target.value = '';
    }
  };

  const handleUnlinkSource = (dbName: string) => {
    dexieManager.deleteExcelLinkedSource(dbName);
    loadLinkedSources();
    onNotification({ type: 'success', text: `Base de datos "${dbName}" desvinculada de archivo Excel.` });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e2024] overflow-hidden text-[#e1e1e6]">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={jsonFileInputRef}
        accept=".json"
        onChange={handleAnalyzeJsonFile}
        className="hidden"
      />
      <input
        type="file"
        ref={excelFileInputRef}
        accept=".xlsx, .xls, .csv"
        onChange={handleSelectExcelFile}
        className="hidden"
      />
      <input
        type="file"
        ref={excelSyncInputRef}
        accept=".xlsx, .xls, .csv"
        onChange={handleProcessSyncFile}
        className="hidden"
      />

      {/* Subtabs Header */}
      <div className="px-6 py-3 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('json')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'json'
                ? 'bg-[#5865f2] text-white shadow-xs'
                : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Transferencia JSON (Import / Export)</span>
          </button>

          <button
            onClick={() => setSubTab('excel')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'excel'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Spreadsheet (Import / Link & Refresh)</span>
            {linkedSources.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-300 font-mono">
                {linkedSources.length} vinculadas
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-[#9ca3af] flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-[#5865f2]" />
          <span>BD Seleccionada: <strong className="text-white">{selectedDb}</strong></span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {subTab === 'json' ? (
          /* ================= JSON SUBTAB ================= */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left: Export Database Form */}
            <div className="bg-[#25282c] border border-[#2f3136] rounded-xl p-5 flex flex-col space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#5865f2]/20 text-[#5865f2]">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Exportar Base de Datos</h4>
                    <p className="text-xs text-[#9ca3af]">Genera un archivo JSON con selección personalizada</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                    Base de Datos a Exportar:
                  </label>
                  <select
                    value={exportTargetDb}
                    onChange={(e) => setExportTargetDb(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-xs text-white focus:outline-none focus:border-[#5865f2]"
                  >
                    {databases.map((d, i) => (
                      <option key={`export_db_opt_${d}_${i}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {exportDbInfo && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#9ca3af]">
                        Tablas a incluir ({exportSelectedTables.length}/{exportDbInfo.tables.length}):
                      </label>
                      <button
                        onClick={() => {
                          if (exportSelectedTables.length === exportDbInfo.tables.length) {
                            setExportSelectedTables([]);
                          } else {
                            setExportSelectedTables(exportDbInfo.tables.map(t => t.name));
                          }
                        }}
                        className="text-[11px] text-[#5865f2] hover:underline"
                      >
                        {exportSelectedTables.length === exportDbInfo.tables.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                      </button>
                    </div>

                    <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-2.5 max-h-44 overflow-y-auto space-y-1.5">
                      {exportDbInfo.tables.map((t, idx) => {
                        const isChecked = exportSelectedTables.includes(t.name);
                        return (
                          <label
                            key={`tbl_exp_chk_${t.name}_${idx}`}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                              isChecked ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setExportSelectedTables(exportSelectedTables.filter(name => name !== t.name));
                                  } else {
                                    setExportSelectedTables([...exportSelectedTables, t.name]);
                                  }
                                }}
                                className="rounded text-[#5865f2] focus:ring-0"
                              />
                              <span className="text-xs font-mono font-medium">{t.name}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2024] text-[#9ca3af]">
                              {t.recordCount} registros
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional export options */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 bg-[#1a1b1e] border border-[#2f3136] rounded-lg cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={exportIncludeRelationships}
                      onChange={(e) => setExportIncludeRelationships(e.target.checked)}
                      className="rounded text-[#5865f2]"
                    />
                    <span>Incluir Relaciones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#1a1b1e] border border-[#2f3136] rounded-lg cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={exportIncludeDesigns}
                      onChange={(e) => setExportIncludeDesigns(e.target.checked)}
                      className="rounded text-[#5865f2]"
                    />
                    <span>Incluir Diseños Canvas</span>
                  </label>
                </div>

                <button
                  onClick={handleExecuteExport}
                  disabled={exportSelectedTables.length === 0}
                  className="w-full py-2.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo JSON de Base de Datos</span>
                </button>
              </div>
            </div>

            {/* Right: Import JSON Analyzer & Selector */}
            <div className="bg-[#25282c] border border-[#2f3136] rounded-xl p-5 flex flex-col space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Importar y Analizar JSON</h4>
                    <p className="text-xs text-[#9ca3af]">Inspecciona el archivo antes de incorporar tablas</p>
                  </div>
                </div>

                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Examinar Archivo</span>
                </button>
              </div>

              {!analyzedResult ? (
                /* Dropzone / Empty Analyzer state */
                <div
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#373a40] hover:border-[#5865f2] rounded-xl p-8 text-center cursor-pointer transition bg-[#1a1b1e]/50 min-h-[260px]"
                >
                  <FileJson className="w-12 h-12 text-[#5865f2]/70 mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">
                    Arrastra o haz clic para cargar un archivo JSON
                  </p>
                  <p className="text-xs text-[#9ca3af] max-w-sm">
                    Analizaremos la estructura, esquemas y tablas disponibles para que elijas exactamente qué importar.
                  </p>
                </div>
              ) : (
                /* Analyzed Result & Selection Panel */
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Multi-DB selector if file contains multiple */}
                    {analyzedResult.databases.length > 1 && (
                      <div>
                        <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                          Bases de Datos detectadas ({analyzedResult.databases.length}):
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {analyzedResult.databases.map((db, idx) => (
                            <button
                              key={`analyzed_db_btn_${idx}`}
                              onClick={() => handleSelectAnalyzedDb(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                                importSelectedDbIndex === idx
                                  ? 'bg-[#5865f2] text-white border-[#5865f2]'
                                  : 'bg-[#1a1b1e] text-[#9ca3af] border-[#2f3136] hover:text-white'
                              }`}
                            >
                              {db.name} ({db.tables.length} tablas)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target DB Name Input */}
                    <div>
                      <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                        Nombre de la BD Destino:
                      </label>
                      <input
                        type="text"
                        value={targetDbNameInput}
                        onChange={(e) => setTargetDbNameInput(e.target.value)}
                        placeholder="Nombre BD local"
                        className="w-full px-3 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-xs text-white focus:outline-none focus:border-[#5865f2]"
                      />
                    </div>

                    {/* Tables to import checklist */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#9ca3af]">
                          Tablas a Importar:
                        </label>
                        <span className="text-[11px] text-emerald-400">
                          {importSelectedTables.length} seleccionada(s)
                        </span>
                      </div>

                      <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                        {analyzedResult.databases[importSelectedDbIndex]?.tables.map((t, idx) => {
                          const isChecked = importSelectedTables.includes(t.name);
                          return (
                            <label
                              key={`imp_tbl_chk_${t.name}_${idx}`}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition ${
                                isChecked ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setImportSelectedTables(importSelectedTables.filter(n => n !== t.name));
                                    } else {
                                      setImportSelectedTables([...importSelectedTables, t.name]);
                                    }
                                  }}
                                  className="rounded text-[#5865f2]"
                                />
                                <span className="font-mono">{t.name}</span>
                              </div>
                              <span className="text-[10px] text-[#9ca3af]">
                                {t.recordCount} filas ({t.fields.length} cols)
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mode selection */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-semibold text-[#9ca3af]">Modo:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'create_new'}
                          onChange={() => setImportMode('create_new')}
                        />
                        <span>Crear / Reemplazar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'overwrite'}
                          onChange={() => setImportMode('overwrite')}
                        />
                        <span>Limpiar BD previa</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setAnalyzedResult(null)}
                      className="px-3 py-2 bg-[#1a1b1e] hover:bg-[#2f3136] text-[#9ca3af] hover:text-white rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || importSelectedTables.length === 0}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isImporting ? 'Importando...' : 'Ejecutar Importación de Tablas'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= EXCEL SUBTAB ================= */
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Create Database From Excel Form */}
              <div className="bg-[#25282c] border border-[#2f3136] rounded-xl p-5 flex flex-col space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#2f3136] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Crear Base de Datos desde Excel</h4>
                      <p className="text-xs text-[#9ca3af]">Importa copias o vincula archivos locales con refresco</p>
                    </div>
                  </div>

                  <button
                    onClick={() => excelFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Seleccionar Excel</span>
                  </button>
                </div>

                {!excelParsedSheets.length ? (
                  /* Dropzone for Excel */
                  <div
                    onClick={() => excelFileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#373a40] hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition bg-[#1a1b1e]/50 min-h-[260px]"
                  >
                    <FileSpreadsheet className="w-12 h-12 text-emerald-400/80 mb-3" />
                    <p className="text-sm font-semibold text-white mb-1">
                      Carga un archivo .xlsx, .xls o .csv
                    </p>
                    <p className="text-xs text-[#9ca3af] max-w-sm">
                      Cada hoja del Excel se convertirá automáticamente en una tabla IndexedDB con índices optimizados.
                    </p>
                  </div>
                ) : (
                  /* Excel Inspector & Creation Configuration */
                  <div className="space-y-4">
                    <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-white truncate">{excelFileName}</span>
                      </div>
                      <button
                        onClick={() => {
                          setExcelFile(null);
                          setExcelParsedSheets([]);
                        }}
                        className="text-[#9ca3af] hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                        Nombre de la Base de Datos a crear:
                      </label>
                      <input
                        type="text"
                        value={excelDbName}
                        onChange={(e) => setExcelDbName(e.target.value)}
                        placeholder="Nombre BD"
                        className="w-full px-3 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                      />
                    </div>

                    {/* Mode Choice: Copy vs Link */}
                    <div>
                      <label className="text-xs font-semibold text-[#9ca3af] block mb-1.5">
                        Tipo de Integración:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition ${
                            excelImportType === 'link'
                              ? 'bg-emerald-500/15 border-emerald-500 text-white'
                              : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="excelImportType"
                            checked={excelImportType === 'link'}
                            onChange={() => setExcelImportType('link')}
                            className="mt-0.5 text-emerald-500"
                          />
                          <div>
                            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" /> Vincular con archivo local
                            </div>
                            <div className="text-[10px] text-[#9ca3af] mt-0.5">
                              Guarda la ruta y metadatos para poder refrescar con un clic cuando modifiques el Excel.
                            </div>
                          </div>
                        </label>

                        <label
                          className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition ${
                            excelImportType === 'copy'
                              ? 'bg-emerald-500/15 border-emerald-500 text-white'
                              : 'bg-[#1a1b1e] border-[#2f3136] text-[#9ca3af] hover:text-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="excelImportType"
                            checked={excelImportType === 'copy'}
                            onChange={() => setExcelImportType('copy')}
                            className="mt-0.5 text-emerald-500"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">Importar copia estática</div>
                            <div className="text-[10px] text-[#9ca3af] mt-0.5">
                              Crea tablas independientes desconectadas del archivo original.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Sheets Checklist */}
                    <div>
                      <label className="text-xs font-semibold text-[#9ca3af] block mb-1">
                        Hojas de cálculo a convertir en tablas ({excelSelectedSheets.length}/{excelParsedSheets.length}):
                      </label>
                      <div className="bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                        {excelParsedSheets.map((sheet, idx) => {
                          const isChecked = excelSelectedSheets.includes(sheet.sheetName);
                          return (
                            <label
                              key={`sheet_chk_${sheet.sheetName}_${idx}`}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition ${
                                isChecked ? 'bg-[#25282c] text-white' : 'hover:bg-[#202225] text-[#9ca3af]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setExcelSelectedSheets(excelSelectedSheets.filter(s => s !== sheet.sheetName));
                                    } else {
                                      setExcelSelectedSheets([...excelSelectedSheets, sheet.sheetName]);
                                    }
                                  }}
                                  className="rounded text-emerald-500"
                                />
                                <span className="font-mono font-medium">{sheet.sheetName}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2024] text-emerald-400">
                                {sheet.records.length} filas
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={handleCreateDatabaseFromExcel}
                      disabled={isProcessingExcel || excelSelectedSheets.length === 0}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isProcessingExcel ? 'Creando Base de Datos...' : 'Crear Base de Datos desde Excel'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Linked Excel Databases & Sync Hub */}
              <div className="bg-[#25282c] border border-[#2f3136] rounded-xl p-5 flex flex-col space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#2f3136] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Bases de Datos Vinculadas a Excel</h4>
                      <p className="text-xs text-[#9ca3af]">Refresca tus tablas incorporando cambios del archivo local</p>
                    </div>
                  </div>
                </div>

                {linkedSources.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#2f3136] rounded-xl p-8 text-center bg-[#1a1b1e]/40">
                    <LinkIcon className="w-10 h-10 text-[#9ca3af]/50 mb-2" />
                    <p className="text-xs font-semibold text-white mb-1">
                      No hay bases de datos vinculadas a archivos Excel actualmente
                    </p>
                    <p className="text-[11px] text-[#9ca3af] max-w-xs">
                      Al crear una base de datos con la opción "Vincular con archivo local", aparecerá aquí para poder sincronizar cambios futuros en un solo clic.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px]">
                    {linkedSources.map((source, idx) => {
                      const isSyncing = syncingDbName === source.databaseName;
                      return (
                        <div
                          key={`linked_src_${source.databaseName}_${idx}`}
                          className="p-4 bg-[#1a1b1e] border border-[#2f3136] rounded-xl space-y-3 hover:border-emerald-500/40 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-emerald-400" />
                                <span className="font-bold text-white text-xs">{source.databaseName}</span>
                                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">
                                  Vinculada
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#9ca3af]">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Archivo: <strong className="text-white">{source.fileName}</strong></span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleTriggerSync(source.databaseName)}
                              disabled={isSyncing}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                              <span>{isSyncing ? 'Refrescando...' : 'Refrescar Datos'}</span>
                            </button>
                          </div>

                          {/* Mapping summary & sync date */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#25282c] p-2.5 rounded-lg border border-[#2f3136]">
                            <div>
                              <span className="text-[#9ca3af] block">Tablas generadas:</span>
                              <span className="font-semibold text-white">
                                {source.tablesMapping?.map(t => `${t.tableName} (${t.rowCount})`).join(', ') || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#9ca3af] block">Última sincronización:</span>
                              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(source.lastSyncedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUnlinkSource(source.databaseName)}
                              className="text-[11px] text-[#9ca3af] hover:text-rose-400 hover:underline"
                            >
                              Desvincular archivo
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
