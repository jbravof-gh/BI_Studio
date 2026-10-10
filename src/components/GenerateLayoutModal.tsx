import React, { useState, useEffect } from 'react';
import { CanvasDocument, CanvasElement, DatabaseInfo, TableInfo } from '../types';
import { dexieManager } from '../services/dexieManager';
import { THEME_PALETTES } from '../utils/themePresets';
import {
  Sparkles,
  Database,
  Table as TableIcon,
  Layers,
  Wand2,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  LayoutDashboard,
  CheckCircle2,
  Sliders,
  ChevronRight,
  TrendingUp,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';

interface GenerateLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDbName: string;
  dbInfo: DatabaseInfo | null;
  canvasDoc: CanvasDocument;
  initialTableName?: string;
  onApplyLayout: (newElements: CanvasElement[], options: { replaceExisting: boolean; dashboardTitle?: string; themeId?: string }) => void;
  onSelectDatabase?: (dbName: string) => void;
}

export const GenerateLayoutModal: React.FC<GenerateLayoutModalProps> = ({
  isOpen,
  onClose,
  activeDbName,
  dbInfo,
  canvasDoc,
  initialTableName,
  onApplyLayout,
  onSelectDatabase
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>(canvasDoc.themeId || 'midnight');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    dashboardTitle: string;
    description: string;
    elements: CanvasElement[];
    source?: string;
  } | null>(null);

  // Set initial table when opened or when dbInfo changes
  useEffect(() => {
    if (isOpen) {
      if (initialTableName && dbInfo?.tables.some(t => t.name === initialTableName)) {
        setSelectedTable(initialTableName);
      } else if (dbInfo?.tables && dbInfo.tables.length > 0) {
        setSelectedTable(dbInfo.tables[0].name);
      } else {
        setSelectedTable('');
      }
      setGeneratedResult(null);
      setError(null);
      setWarningNotice(null);
    }
  }, [isOpen, initialTableName, dbInfo]);

  if (!isOpen) return null;

  const currentTableInfo: TableInfo | undefined = dbInfo?.tables.find(t => t.name === selectedTable);

  const handleGenerate = async () => {
    if (!selectedTable || !currentTableInfo) {
      setError('Por favor selecciona una tabla de la base de datos.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setWarningNotice(null);

    try {
      // 1. Fetch real sample records from Dexie to send realistic schema context
      const records = await dexieManager.getTableRecords(activeDbName, selectedTable);
      const sample = records && records.length > 0 ? records[0] : (currentTableInfo.sampleRecord || {});

      // 2. Call server-side Gemini API route
      const response = await fetch('/api/generate-layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: selectedTable,
          schema: currentTableInfo.schema,
          fields: currentTableInfo.fields || Object.keys(sample || {}),
          sampleRecord: sample,
          canvasWidth: canvasDoc.width || 1200,
          canvasHeight: canvasDoc.height || 800,
          themeId: selectedTheme,
          promptGuidelines: customInstructions.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.layout) {
        throw new Error(data.warning || 'No se pudo generar la propuesta de layout.');
      }

      if (data.warning) {
        setWarningNotice(data.warning);
      }

      setGeneratedResult({
        dashboardTitle: data.layout.dashboardTitle || `Dashboard de ${selectedTable}`,
        description: data.layout.description || 'Layout estructurado para análisis de datos.',
        elements: data.layout.elements || [],
        source: data.source || 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.error('Error generating layout:', err);
      setError(err.message || 'Ocurrió un error al contactar la API de Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmApply = () => {
    if (!generatedResult || generatedResult.elements.length === 0) return;

    onApplyLayout(generatedResult.elements, {
      replaceExisting,
      dashboardTitle: generatedResult.dashboardTitle,
      themeId: selectedTheme,
    });
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center transition-all duration-200 ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div className={`bg-[#202225] shadow-2xl flex flex-col overflow-hidden border border-[#2f3136] text-[#e1e1e6] transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none max-h-none' : 'w-full max-w-4xl max-h-[90vh] rounded-2xl'
      }`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#5865f2] to-[#8b5cf6] text-white shadow-md shadow-[#5865f2]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Generar Layout con IA</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#5865f2]/20 border border-[#5865f2]/40 text-[10px] font-mono font-bold text-[#38bdf8]">
                    Gemini 3.8
                  </span>
                </h3>
              </div>
              <p className="text-xs text-[#9ca3af]">
                Propone un layout completo de dashboard (KPIs, gráficos, tablas y métricas) adaptado al esquema de datos.
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
              className="p-2 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#2f3136] transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Data Source & Table Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Table Selector Box */}
            <div className="p-4 bg-[#1a1b1e] border border-[#2f3136] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <TableIcon className="w-4 h-4 text-[#5865f2]" />
                  <span>Tabla de Datos Seleccionada</span>
                </label>
                <span className="text-[11px] text-[#9ca3af] font-mono">
                  BD: <strong className="text-emerald-400">{activeDbName || 'Sin BD'}</strong>
                </span>
              </div>

              {!dbInfo || dbInfo.tables.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No hay tablas en la base de datos activa. Crea o carga una tabla primero.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedTable}
                    onChange={(e) => {
                      setSelectedTable(e.target.value);
                      setGeneratedResult(null);
                    }}
                    className="w-full px-3 py-2 bg-[#25282c] border border-[#2f3136] rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-[#5865f2] cursor-pointer"
                  >
                    {dbInfo.tables.map((tbl) => (
                      <option key={`opt_tbl_${tbl.name}`} value={tbl.name}>
                        {tbl.name} ({tbl.recordCount} registros)
                      </option>
                    ))}
                  </select>

                  {/* Table Fields Pill Badges */}
                  {currentTableInfo && (
                    <div className="pt-2 border-t border-[#2f3136] space-y-1.5">
                      <div className="text-[11px] text-[#9ca3af] flex items-center justify-between">
                        <span>Campos disponibles en esquema:</span>
                        <span className="font-mono text-white text-[10px]">{currentTableInfo.fields.length} campos</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {currentTableInfo.fields.map((f, idx) => (
                          <span
                            key={`fld_${f}_${idx}`}
                            className="px-2 py-0.5 bg-[#25282c] border border-[#373a40] rounded text-[10px] font-mono text-[#cbd5e1]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme & Palette Selection */}
            <div className="p-4 bg-[#1a1b1e] border border-[#2f3136] rounded-xl space-y-3">
              <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-[#8b5cf6]" />
                <span>Paleta de Color y Tema</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {THEME_PALETTES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={`theme_opt_${theme.id}`}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#5865f2]/20 border-[#5865f2] ring-1 ring-[#5865f2] text-white'
                          : 'bg-[#25282c] hover:bg-[#2f3136] border-[#2f3136] text-[#9ca3af]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{theme.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#38bdf8]" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {theme.previewColors.slice(0, 4).map((c, cIdx) => (
                          <span
                            key={`swatch_${theme.id}_${cIdx}`}
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Optional Prompt Customization */}
          <div className="p-4 bg-[#1a1b1e] border border-[#2f3136] rounded-xl space-y-2">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span>Instrucciones Específicas de Diseño (Opcional)</span>
              </span>
              <span className="text-[10px] text-[#9ca3af] font-normal">Gemini AI Prompt Refinement</span>
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ej: Destacar métricas financieras en la fila superior y gráficos de barras por categoría..."
              className="w-full px-3 py-2 bg-[#25282c] border border-[#2f3136] rounded-lg text-xs text-[#e1e1e6] placeholder-[#6b7280] focus:outline-none focus:border-[#5865f2]"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action to Trigger Generation */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
              <input
                type="checkbox"
                id="chk-replace-canvas"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 rounded bg-[#25282c] border-[#2f3136] text-[#5865f2] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="chk-replace-canvas" className="cursor-pointer select-none">
                Reemplazar elementos existentes del Canvas (o desmarca para añadir a los actuales)
              </label>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !selectedTable}
              className="px-5 py-2.5 bg-gradient-to-r from-[#5865f2] via-[#6366f1] to-[#8b5cf6] hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#5865f2]/25 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Diseñando Dashboard con Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Proponer Dashboard con Gemini API</span>
                </>
              )}
            </button>
          </div>

          {/* Warning Notice if AI was busy and schema engine was used */}
          {warningNotice && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{warningNotice}</span>
            </div>
          )}

          {/* Generated Result Preview Section */}
          {generatedResult && (
            <div className="p-4 bg-[#18191c] border border-emerald-500/40 rounded-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {generatedResult.dashboardTitle}
                    </h4>
                    <p className="text-xs text-[#9ca3af]">
                      {generatedResult.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#5865f2]/15 border border-[#5865f2]/30 text-[#38bdf8] text-[11px] font-mono font-semibold">
                    {generatedResult.source?.startsWith('gemini') ? `✨ ${generatedResult.source}` : '⚡ Motor Adaptativo'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                    {generatedResult.elements.length} Componentes
                  </span>
                </div>
              </div>

              {/* Elements Breakdown List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {generatedResult.elements.map((el, idx) => {
                  const Icon =
                    el.type === 'kpi'
                      ? TrendingUp
                      : el.type === 'chart'
                      ? BarChart3
                      : el.type === 'table'
                      ? FileSpreadsheet
                      : LayoutDashboard;

                  return (
                    <div
                      key={`preview_el_${el.id}_${idx}`}
                      className="p-2.5 bg-[#202225] border border-[#2f3136] rounded-lg text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-[#38bdf8] shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-white truncate">{el.name}</div>
                          <div className="text-[10px] text-[#9ca3af] font-mono">
                            Tipo: {el.type} | ({el.width}x{el.height}px)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Apply Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleConfirmApply}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Diseño al Canvas</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
