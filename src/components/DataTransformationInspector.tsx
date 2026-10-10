import React, { useState, useMemo } from 'react';
import { 
  CanvasElement, 
  CalculatedFormulaField, 
  TableAggregationDef, 
  TransformationAggregationFn,
  DataTransformationConfig
} from '../types';
import { 
  FORMULA_PRESETS, 
  validateFormulaExpression, 
  evaluateFormula, 
  formatTransformedValue 
} from '../utils/dataTransformation';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  HelpCircle,
  Sigma,
  Table as TableIcon,
  BarChart2,
  Percent,
  Hash,
  RotateCcw,
  ArrowRight
} from 'lucide-react';

interface DataTransformationInspectorProps {
  element: CanvasElement;
  tableFields: string[];
  rawRecords: Record<string, any>[];
  onChangeElement: (updated: CanvasElement) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DataTransformationInspector: React.FC<DataTransformationInspectorProps> = ({
  element,
  tableFields,
  rawRecords,
  onChangeElement,
  isOpen,
  onToggle
}) => {
  const isChart = element.type === 'chart';
  const isTable = element.type === 'table';

  const config: DataTransformationConfig = element.binding.dataTransformation || {
    enabled: false,
    mode: isChart ? 'aggregate' : 'formulas',
    calculatedFields: [],
    tableAggregations: []
  };

  const isEnabled = Boolean(config.enabled);

  // Form state for creating/editing a calculated field
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldFormula, setNewFieldFormula] = useState('');
  const [newFieldFormat, setNewFieldFormat] = useState<'number' | 'currency' | 'percent' | 'string'>('number');
  const [newFieldDecimals, setNewFieldDecimals] = useState<number>(2);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Form state for adding an aggregation to a table
  const [newAggField, setNewAggField] = useState<string>(tableFields[0] || '*');
  const [newAggFn, setNewAggFn] = useState<TransformationAggregationFn>('sum');
  const [newAggLabel, setNewAggLabel] = useState<string>('');

  // Sample record for live validation preview
  const sampleRecord = rawRecords[0] || {};

  // Live formula validation for field builder
  const formulaValidation = useMemo(() => {
    if (!newFieldFormula.trim()) return null;
    return validateFormulaExpression(newFieldFormula, sampleRecord);
  }, [newFieldFormula, sampleRecord]);

  // Live formula validation for chart value formula
  const chartFormulaValidation = useMemo(() => {
    if (!config.chartValueFormula || !config.chartValueFormula.trim()) return null;
    return validateFormulaExpression(config.chartValueFormula, sampleRecord);
  }, [config.chartValueFormula, sampleRecord]);

  // Update transformation config helper
  const updateConfig = (updates: Partial<DataTransformationConfig>) => {
    const nextConfig: DataTransformationConfig = {
      ...config,
      ...updates
    };

    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        dataTransformation: nextConfig
      }
    });
  };

  const handleToggleEnabled = (checked: boolean) => {
    const nextConfig: DataTransformationConfig = {
      ...config,
      enabled: checked
    };

    // If enabling for the first time on a chart, set smart defaults
    if (checked && isChart) {
      if (!nextConfig.groupByField) {
        nextConfig.groupByField = element.binding.labelField || tableFields[0] || '';
      }
      if (!nextConfig.aggregateMetricField) {
        nextConfig.aggregateMetricField = element.binding.valueField || tableFields[1] || '';
      }
      if (!nextConfig.aggregateFunction) {
        nextConfig.aggregateFunction = 'sum';
      }
      nextConfig.mode = 'aggregate';
    }

    // If enabling for the first time on a table, set default mode
    if (checked && isTable && !nextConfig.mode) {
      nextConfig.mode = 'formulas';
      if (!nextConfig.groupByField) {
        nextConfig.groupByField = tableFields[0] || '';
      }
    }

    updateConfig(nextConfig);
  };

  // Insert token or field into formula
  const insertIntoFormula = (text: string) => {
    setNewFieldFormula(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      // If ends with an operator, just append
      if (/[+\-*/%(,]$/.test(trimmed)) {
        return `${prev} ${text}`;
      }
      return `${prev} + ${text}`;
    });
  };

  // Apply a formula preset
  const applyPreset = (preset: typeof FORMULA_PRESETS[0]) => {
    const firstField = tableFields.find(f => !/id/i.test(f)) || tableFields[0] || 'valor';
    const secondField = tableFields.find(f => f !== firstField && !/id/i.test(f)) || tableFields[1] || 'cantidad';
    
    let rendered = preset.template.replace(/{field}/g, firstField);
    rendered = rendered.replace(/{field2}/g, secondField);
    setNewFieldFormula(rendered);

    if (!newFieldName) {
      setNewFieldName(preset.id);
    }
    if (!newFieldLabel) {
      setNewFieldLabel(preset.name);
    }
    if (preset.category === 'impuestos') {
      setNewFieldFormat('currency');
    }
  };

  // Save calculated field
  const handleSaveCalculatedField = () => {
    if (!newFieldName.trim() || !newFieldFormula.trim()) return;

    const fieldKey = newFieldName.trim().replace(/\s+/g, '_').toLowerCase();
    const fieldObj: CalculatedFormulaField = {
      id: editingFieldId || `cf_${Date.now()}`,
      name: fieldKey,
      label: newFieldLabel.trim() || newFieldName.trim(),
      formula: newFieldFormula.trim(),
      format: newFieldFormat,
      decimals: newFieldDecimals
    };

    const currentList = config.calculatedFields || [];
    let updatedList: CalculatedFormulaField[];

    if (editingFieldId) {
      updatedList = currentList.map(item => item.id === editingFieldId ? fieldObj : item);
    } else {
      updatedList = [...currentList, fieldObj];
    }

    // Auto add to table visible columns if table
    let updatedColumns = element.binding.columns;
    if (isTable && updatedColumns && !updatedColumns.includes(fieldKey)) {
      updatedColumns = [...updatedColumns, fieldKey];
    }

    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        columns: updatedColumns,
        dataTransformation: {
          ...config,
          calculatedFields: updatedList
        }
      }
    });

    // Reset form
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldFormula('');
    setEditingFieldId(null);
  };

  const handleEditField = (field: CalculatedFormulaField) => {
    setEditingFieldId(field.id);
    setNewFieldName(field.name);
    setNewFieldLabel(field.label);
    setNewFieldFormula(field.formula);
    setNewFieldFormat(field.format || 'number');
    setNewFieldDecimals(field.decimals !== undefined ? field.decimals : 2);
  };

  const handleDeleteField = (id: string) => {
    const updated = (config.calculatedFields || []).filter(f => f.id !== id);
    updateConfig({ calculatedFields: updated });
  };

  // Add table aggregation
  const handleAddTableAggregation = () => {
    if (!newAggField) return;

    const fnName = newAggFn.toUpperCase();
    const defLabel = newAggLabel.trim() || `${fnName} (${newAggField})`;
    const newAgg: TableAggregationDef = {
      id: `agg_${Date.now()}`,
      field: newAggField,
      aggregation: newAggFn,
      label: defLabel
    };

    const currentAggs = config.tableAggregations || [];
    updateConfig({
      tableAggregations: [...currentAggs, newAgg]
    });

    setNewAggLabel('');
  };

  const handleDeleteTableAggregation = (id: string) => {
    const updated = (config.tableAggregations || []).filter(a => a.id !== id);
    updateConfig({ tableAggregations: updated });
  };

  // Badge label for the collapsible header
  const getBadge = () => {
    if (!isEnabled) return 'Desactivado';
    if (isChart) {
      if (config.aggregateFunction && config.aggregateFunction !== 'none') {
        return `${config.aggregateFunction.toUpperCase()} (${config.groupByField || 'Agrupado'})`;
      }
      if (config.chartValueFormula) return 'Fórmula Valor';
      return 'Activo';
    }
    if (isTable) {
      const mode = config.mode || 'formulas';
      if (mode === 'aggregate') return `Group By (${config.groupByField || 'Tabla'})`;
      if (mode === 'both') return `Fórmulas & Group By`;
      const numFields = config.calculatedFields?.length || 0;
      return numFields > 0 ? `${numFields} Campo${numFields > 1 ? 's' : ''}` : 'Fórmulas';
    }
    return 'Activo';
  };

  return (
    <div id={`inspector_section_data_transformation`} className="border border-[#2f3136] bg-[#25282c] rounded-lg overflow-hidden transition-all duration-200 shadow-xs">
      {/* Section Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2.5 bg-[#25282c] hover:bg-[#2a2d32] flex items-center justify-between transition cursor-pointer select-none text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#f59e0b25', color: '#f59e0b' }}
          >
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
            Paso de Transformación (Fórmulas & Agregación)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono truncate max-w-[140px] ${
            isEnabled
              ? 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 font-semibold'
              : 'bg-[#1a1b1e] text-[#9ca3af] border-[#373a40]'
          }`}>
            {getBadge()}
          </span>
          <div className="text-[#9ca3af] transition-transform duration-200">
            {isOpen ? <ChevronDown className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#2f3136] bg-[#202225]/60 space-y-3.5">
          {/* Main Enable / Disable Toggle Card */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            isEnabled 
              ? 'bg-[#f59e0b]/10 border-[#f59e0b]/40' 
              : 'bg-[#1a1b1e] border-[#2f3136]'
          }`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Sparkles className={`w-4 h-4 flex-shrink-0 ${isEnabled ? 'text-[#f59e0b]' : 'text-[#9ca3af]'}`} />
                <div>
                  <div className="text-xs font-bold text-white">
                    {isEnabled ? 'Transformación de Datos Activada' : 'Habilitar Transformación de Datos'}
                  </div>
                  <div className="text-[10px] text-[#9ca3af]">
                    Aplica fórmulas matemáticas, columnas derivadas o agrupaciones SUM/AVG/COUNT directamente en este {isChart ? 'gráfico' : 'tabla'}.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-[#2f3136] text-[#f59e0b] focus:ring-[#f59e0b] bg-[#141517] cursor-pointer"
              />
            </label>
          </div>

          {isEnabled && (
            <>
              {/* ======================================================== */}
              {/* TABLE CONFIGURATION                                     */}
              {/* ======================================================== */}
              {isTable && (
                <div className="space-y-3">
                  {/* Mode Selector */}
                  <div>
                    <label className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-wider block mb-1.5">
                      Modo de Transformación para la Tabla
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-[#1a1b1e] rounded-lg border border-[#2f3136]">
                      <button
                        type="button"
                        onClick={() => updateConfig({ mode: 'formulas' })}
                        className={`p-1.5 rounded text-center transition cursor-pointer ${
                          (config.mode || 'formulas') === 'formulas'
                            ? 'bg-[#f59e0b] text-white shadow-xs font-bold'
                            : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
                        }`}
                      >
                        <div className="text-[11px]">Fórmulas</div>
                        <div className="text-[8px] opacity-80">Por fila</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateConfig({ mode: 'aggregate' })}
                        className={`p-1.5 rounded text-center transition cursor-pointer ${
                          config.mode === 'aggregate'
                            ? 'bg-[#f59e0b] text-white shadow-xs font-bold'
                            : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
                        }`}
                      >
                        <div className="text-[11px]">Group By</div>
                        <div className="text-[8px] opacity-80">Agrupar & SUM</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateConfig({ mode: 'both' })}
                        className={`p-1.5 rounded text-center transition cursor-pointer ${
                          config.mode === 'both'
                            ? 'bg-[#f59e0b] text-white shadow-xs font-bold'
                            : 'text-[#9ca3af] hover:text-white hover:bg-[#25282c]'
                        }`}
                      >
                        <div className="text-[11px]">Combinado</div>
                        <div className="text-[8px] opacity-80">Fórmulas + Group</div>
                      </button>
                    </div>
                  </div>

                  {/* GROUP BY / AGGREGATIONS CONFIGURATION (for mode aggregate or both) */}
                  {(config.mode === 'aggregate' || config.mode === 'both') && (
                    <div className="p-2.5 bg-[#1a1b1e] rounded-lg border border-[#2f3136] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-1.5">
                          <Sigma className="w-3.5 h-3.5" />
                          Agrupación de Filas (Group By)
                        </span>
                      </div>

                      {/* Group By Field */}
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-1">
                          Agrupar registros por:
                        </label>
                        <select
                          value={config.groupByField || ''}
                          onChange={(e) => updateConfig({ groupByField: e.target.value })}
                          className="w-full px-2 py-1.5 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white font-mono"
                        >
                          <option value="">-- Seleccionar campo de agrupación --</option>
                          {tableFields.map((f) => (
                            <option key={`tbl_grp_${f}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      {/* Active Table Aggregations List */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#9ca3af] block">
                          Columnas agregadas calculadas:
                        </label>
                        
                        {(config.tableAggregations || []).length > 0 ? (
                          <div className="space-y-1">
                            {config.tableAggregations?.map((agg) => (
                              <div
                                key={agg.id}
                                className="flex items-center justify-between p-1.5 bg-[#25282c] rounded border border-[#2f3136] text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] px-1.5 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] font-mono font-bold rounded">
                                    {agg.aggregation.toUpperCase()}
                                  </span>
                                  <span className="font-medium text-white truncate">
                                    {agg.label || agg.field}
                                  </span>
                                  <span className="text-[10px] text-[#9ca3af] font-mono">
                                    ({agg.field})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTableAggregation(agg.id)}
                                  className="text-[#9ca3af] hover:text-rose-400 p-1 transition"
                                  title="Eliminar agregación"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#9ca3af] italic bg-[#25282c] p-2 rounded text-center">
                            Añade métricas como SUM(monto), AVG(precio) o COUNT(*) para la tabla agrupada.
                          </div>
                        )}

                        {/* Add Aggregation Form */}
                        <div className="pt-2 border-t border-[#25282c] space-y-2">
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[9px] text-[#9ca3af] block mb-0.5">Operación</label>
                              <select
                                value={newAggFn}
                                onChange={(e) => setNewAggFn(e.target.value as TransformationAggregationFn)}
                                className="w-full px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white"
                              >
                                <option value="sum">SUM (Suma)</option>
                                <option value="avg">AVG (Promedio)</option>
                                <option value="count">COUNT (Conteo)</option>
                                <option value="min">MIN (Mínimo)</option>
                                <option value="max">MAX (Máximo)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-[#9ca3af] block mb-0.5">Campo objetivo</label>
                              <select
                                value={newAggField}
                                onChange={(e) => setNewAggField(e.target.value)}
                                className="w-full px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white font-mono"
                              >
                                {newAggFn === 'count' && <option value="*">* (Todos los registros)</option>}
                                {tableFields.map((f) => (
                                  <option key={`new_agg_${f}`} value={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Etiqueta columna (ej: Ventas Totales)"
                              value={newAggLabel}
                              onChange={(e) => setNewAggLabel(e.target.value)}
                              className="flex-1 px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white placeholder-[#6b7280]"
                            />
                            <button
                              type="button"
                              onClick={handleAddTableAggregation}
                              className="px-2.5 py-1 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Añadir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORMULAS & CALCULATED FIELDS BUILDER (for mode formulas or both) */}
                  {(config.mode === 'formulas' || config.mode === 'both' || !config.mode) && (
                    <div className="p-2.5 bg-[#1a1b1e] rounded-lg border border-[#2f3136] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5" />
                          Campos Calculados & Fórmulas
                        </span>
                        {editingFieldId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFieldId(null);
                              setNewFieldName('');
                              setNewFieldLabel('');
                              setNewFieldFormula('');
                            }}
                            className="text-[9px] text-[#9ca3af] hover:text-white flex items-center gap-0.5 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Cancelar edición
                          </button>
                        )}
                      </div>

                      {/* Existing Calculated Fields List */}
                      {(config.calculatedFields || []).length > 0 && (
                        <div className="space-y-1">
                          {config.calculatedFields?.map((f) => (
                            <div
                              key={f.id}
                              className={`p-2 rounded border transition flex items-center justify-between ${
                                editingFieldId === f.id
                                  ? 'bg-[#f59e0b]/20 border-[#f59e0b]'
                                  : 'bg-[#25282c] border-[#2f3136]'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white truncate">
                                    {f.label}
                                  </span>
                                  <span className="text-[9px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 px-1 py-0.2 rounded border border-[#f59e0b]/20">
                                    {f.name}
                                  </span>
                                  {f.format && f.format !== 'number' && (
                                    <span className="text-[9px] text-[#9ca3af]">
                                      [{f.format}]
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-[#9ca3af] truncate mt-0.5">
                                  = {f.formula}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditField(f)}
                                  className="text-[#9ca3af] hover:text-white p-1 transition"
                                  title="Editar fórmula"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteField(f.id)}
                                  className="text-[#9ca3af] hover:text-rose-400 p-1 transition"
                                  title="Eliminar campo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formula Builder Form */}
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[9px] text-[#9ca3af] block mb-0.5">Identificador</label>
                            <input
                              type="text"
                              placeholder="total_con_iva"
                              value={newFieldName}
                              onChange={(e) => setNewFieldName(e.target.value)}
                              className="w-full px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs font-mono text-white placeholder-[#6b7280]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-[#9ca3af] block mb-0.5">Etiqueta visible</label>
                            <input
                              type="text"
                              placeholder="Total con IVA"
                              value={newFieldLabel}
                              onChange={(e) => setNewFieldLabel(e.target.value)}
                              className="w-full px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white placeholder-[#6b7280]"
                            />
                          </div>
                        </div>

                        {/* Quick Formula Presets Dropdown */}
                        <div>
                          <label className="text-[9px] text-[#9ca3af] block mb-1">
                            Plantillas rápidas de fórmulas:
                          </label>
                          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                            {FORMULA_PRESETS.slice(0, 5).map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="text-[9px] px-2 py-0.5 bg-[#25282c] hover:bg-[#373a40] text-slate-300 hover:text-white rounded border border-[#2f3136] whitespace-nowrap transition cursor-pointer"
                                title={preset.description}
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Formula Input */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[9px] text-[#9ca3af]">Expresión / Fórmula</label>
                            <span className="text-[9px] text-[#9ca3af]">Usa [campo] o números</span>
                          </div>
                          <input
                            type="text"
                            placeholder="ej: [precio] * 1.21 o [precio] * [cantidad]"
                            value={newFieldFormula}
                            onChange={(e) => setNewFieldFormula(e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#25282c] border border-[#2f3136] rounded text-xs font-mono text-white placeholder-[#6b7280]"
                          />
                        </div>

                        {/* Clickable Field Chips & Operator Keys */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] text-[#9ca3af] mr-1">Insertar:</span>
                            {tableFields.slice(0, 8).map((f) => (
                              <button
                                key={`chip_${f}`}
                                type="button"
                                onClick={() => insertIntoFormula(`[${f}]`)}
                                className="px-1.5 py-0.5 bg-[#202225] hover:bg-[#5865f2]/20 hover:text-[#5865f2] border border-[#2f3136] hover:border-[#5865f2] text-white text-[9px] font-mono rounded transition cursor-pointer"
                              >
                                [{f}]
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-1">
                            {['+', '-', '*', '/', '(', ')', '%', 'ROUND('].map((op) => (
                              <button
                                key={`op_${op}`}
                                type="button"
                                onClick={() => insertIntoFormula(op)}
                                className="px-2 py-0.5 bg-[#25282c] hover:bg-[#373a40] text-slate-200 rounded text-[10px] font-mono font-bold transition cursor-pointer border border-[#2f3136]"
                              >
                                {op}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Format & Decimals */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <div>
                            <label className="text-[9px] text-[#9ca3af] block mb-0.5">Formato</label>
                            <select
                              value={newFieldFormat}
                              onChange={(e) => setNewFieldFormat(e.target.value as any)}
                              className="w-full px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white"
                            >
                              <option value="number">Número estándar</option>
                              <option value="currency">Moneda (€)</option>
                              <option value="percent">Porcentaje (%)</option>
                              <option value="string">Texto</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-[#9ca3af] block mb-0.5">Decimales</label>
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={newFieldDecimals}
                              onChange={(e) => setNewFieldDecimals(parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white"
                            />
                          </div>
                        </div>

                        {/* Live Validation & Preview */}
                        {formulaValidation && (
                          <div className={`p-1.5 rounded border text-[10px] flex items-center justify-between ${
                            formulaValidation.valid
                              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                              : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              {formulaValidation.valid ? (
                                <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                              )}
                              <span>
                                {formulaValidation.valid
                                  ? `Válida. Muestra: ${formatTransformedValue(formulaValidation.sampleResult, newFieldFormat, newFieldDecimals)}`
                                  : (formulaValidation.error || 'Sintaxis no válida')}
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSaveCalculatedField}
                          disabled={!newFieldName.trim() || !newFieldFormula.trim()}
                          className={`w-full py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            newFieldName.trim() && newFieldFormula.trim()
                              ? 'bg-[#f59e0b] hover:bg-[#d97706] text-white cursor-pointer'
                              : 'bg-[#25282c] text-[#9ca3af] cursor-not-allowed border border-[#2f3136]'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {editingFieldId ? 'Guardar Cambios' : 'Añadir Campo Calculado'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Footer Row (Totals) */}
                  <div className="p-2.5 bg-[#1a1b1e] rounded-lg border border-[#2f3136]">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Sigma className="w-4 h-4 text-[#f59e0b]" />
                        <div>
                          <div className="text-xs font-semibold text-white">Fila de Totales al final</div>
                          <div className="text-[9px] text-[#9ca3af]">Añade una fila con la suma automática de columnas numéricas</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(config.showSummaryRow)}
                        onChange={(e) => updateConfig({ showSummaryRow: e.target.checked })}
                        className="w-4 h-4 rounded border-[#2f3136] text-[#f59e0b] focus:ring-[#f59e0b] bg-[#141517] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* CHART CONFIGURATION                                      */}
              {/* ======================================================== */}
              {isChart && (
                <div className="space-y-3">
                  {/* Aggregation Settings for Chart */}
                  <div className="p-2.5 bg-[#1a1b1e] rounded-lg border border-[#2f3136] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-1.5">
                        <Sigma className="w-3.5 h-3.5" />
                        Agregación Automática para Gráfico
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Group By Field */}
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5">
                          Agrupar por (Eje X)
                        </label>
                        <select
                          value={config.groupByField || element.binding.labelField || ''}
                          onChange={(e) => updateConfig({ groupByField: e.target.value })}
                          className="w-full px-2 py-1.5 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white font-mono"
                        >
                          <option value="">-- Automático ({element.binding.labelField || 'Eje X'}) --</option>
                          {tableFields.map((f) => (
                            <option key={`ch_grp_${f}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      {/* Aggregation Function */}
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5">
                          Función de Agregación
                        </label>
                        <select
                          value={config.aggregateFunction || 'sum'}
                          onChange={(e) => updateConfig({ aggregateFunction: e.target.value as TransformationAggregationFn })}
                          className="w-full px-2 py-1.5 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white font-semibold"
                        >
                          <option value="sum">SUM (Suma total)</option>
                          <option value="avg">AVG (Promedio)</option>
                          <option value="count">COUNT (Conteo de registros)</option>
                          <option value="min">MIN (Valor mínimo)</option>
                          <option value="max">MAX (Valor máximo)</option>
                          <option value="none">Sin agregación (Filas individuales)</option>
                        </select>
                      </div>
                    </div>

                    {/* Target Metric Field for Aggregation */}
                    {config.aggregateFunction !== 'count' && config.aggregateFunction !== 'none' && (
                      <div>
                        <label className="text-[10px] text-[#9ca3af] block mb-0.5">
                          Campo métrico a agregar (Eje Y)
                        </label>
                        <select
                          value={config.aggregateMetricField || element.binding.valueField || ''}
                          onChange={(e) => updateConfig({ aggregateMetricField: e.target.value })}
                          className="w-full px-2 py-1.5 bg-[#25282c] border border-[#2f3136] rounded text-xs text-white font-mono"
                        >
                          <option value="">-- Usar campo Eje Y ({element.binding.valueField || 'Valor'}) --</option>
                          {tableFields.map((f) => (
                            <option key={`ch_met_${f}`} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Custom Formula for Chart Y-Value */}
                  <div className="p-2.5 bg-[#1a1b1e] rounded-lg border border-[#2f3136] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5" />
                        Fórmula de Valor Personalizada (Opcional)
                      </label>
                      {config.chartValueFormula && (
                        <button
                          type="button"
                          onClick={() => updateConfig({ chartValueFormula: '' })}
                          className="text-[9px] text-[#9ca3af] hover:text-rose-400"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="ej: [precio] * [cantidad] o [monto] * 1.21"
                      value={config.chartValueFormula || ''}
                      onChange={(e) => updateConfig({ chartValueFormula: e.target.value })}
                      className="w-full px-2 py-1.5 bg-[#25282c] border border-[#2f3136] rounded text-xs font-mono text-white placeholder-[#6b7280]"
                    />

                    {/* Chips for Chart Value Formula */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[9px] text-[#9ca3af]">Campos:</span>
                      {tableFields.slice(0, 6).map((f) => (
                        <button
                          key={`ch_fchip_${f}`}
                          type="button"
                          onClick={() => {
                            const cur = config.chartValueFormula || '';
                            const next = cur ? `${cur} * [${f}]` : `[${f}]`;
                            updateConfig({ chartValueFormula: next });
                          }}
                          className="px-1.5 py-0.5 bg-[#202225] hover:bg-[#5865f2]/20 text-white hover:text-[#5865f2] border border-[#2f3136] text-[9px] font-mono rounded transition cursor-pointer"
                        >
                          [{f}]
                        </button>
                      ))}
                    </div>

                    {chartFormulaValidation && (
                      <div className={`p-1.5 rounded border text-[10px] flex items-center gap-1.5 ${
                        chartFormulaValidation.valid
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                      }`}>
                        {chartFormulaValidation.valid ? (
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                        )}
                        <span>
                          {chartFormulaValidation.valid
                            ? `Fórmula válida. Muestra: ${chartFormulaValidation.sampleResult}`
                            : (chartFormulaValidation.error || 'Sintaxis errónea')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
