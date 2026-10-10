import { CanvasElement, DataTransformationConfig } from '../types';
import { evaluateFormula, calculateAggregationValue } from './dataTransformation';

export function evaluateTemplate(template: string, record: Record<string, any> | undefined): string {
  if (!template) return '';
  if (!record) {
    // Return template with curly braces replaced or preview placeholders
    return template.replace(/\{\{([^}]+)\}\}/g, '[$1]');
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const val = record[trimmedKey];
    if (val !== undefined && val !== null) {
      if (typeof val === 'number') {
        return val.toLocaleString('es-ES');
      }
      return String(val);
    }
    return match;
  });
}

export function calculateAggregation(
  records: Record<string, any>[],
  field?: string,
  aggregation?: 'none' | 'count' | 'sum' | 'avg' | 'min' | 'max'
): { value: number | string; formatted: string } {
  if (!records || records.length === 0) {
    return { value: 0, formatted: '0' };
  }

  if (aggregation === 'count' || !field) {
    return { value: records.length, formatted: records.length.toLocaleString('es-ES') };
  }

  const numbers = records
    .map(r => Number(r[field]))
    .filter(n => !isNaN(n) && isFinite(n));

  if (numbers.length === 0) {
    return { value: 0, formatted: '-' };
  }

  switch (aggregation) {
    case 'sum': {
      const sum = numbers.reduce((acc, curr) => acc + curr, 0);
      return { value: sum, formatted: sum.toLocaleString('es-ES', { maximumFractionDigits: 2 }) };
    }
    case 'avg': {
      const avg = numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
      return { value: avg, formatted: avg.toLocaleString('es-ES', { maximumFractionDigits: 2 }) };
    }
    case 'min': {
      const min = Math.min(...numbers);
      return { value: min, formatted: min.toLocaleString('es-ES', { maximumFractionDigits: 2 }) };
    }
    case 'max': {
      const max = Math.max(...numbers);
      return { value: max, formatted: max.toLocaleString('es-ES', { maximumFractionDigits: 2 }) };
    }
    default: {
      const firstVal = records[0]?.[field];
      return {
        value: firstVal ?? '',
        formatted: typeof firstVal === 'number' ? firstVal.toLocaleString('es-ES') : String(firstVal ?? '')
      };
    }
  }
}

export function formatChartData(
  records: Record<string, any>[],
  labelField?: string,
  valueField?: string,
  transformationConfig?: DataTransformationConfig
): Array<{ label: string; value: number; raw: any }> {
  if (!records || records.length === 0) return [];

  const lField = labelField || Object.keys(records[0] || {})[0] || 'label';
  const vField = valueField || Object.keys(records[0] || {})[1] || 'value';

  // Check if data transformation is active
  if (transformationConfig && transformationConfig.enabled) {
    let processedRecords = records;

    // Step 1: Calculate any derived formula fields
    if (transformationConfig.calculatedFields && transformationConfig.calculatedFields.length > 0) {
      processedRecords = processedRecords.map(r => {
        const enriched = { ...r };
        transformationConfig.calculatedFields?.forEach(cf => {
          if (cf.name && cf.formula) {
            enriched[cf.name] = evaluateFormula(cf.formula, enriched);
          }
        });
        return enriched;
      });
    }

    // Step 2: Custom chart value formula (e.g. "[precio] * [cantidad]")
    if (transformationConfig.chartValueFormula && transformationConfig.chartValueFormula.trim() !== '') {
      processedRecords = processedRecords.map(r => ({
        ...r,
        _chartFormulaValue: evaluateFormula(transformationConfig.chartValueFormula!, r)
      }));
    }

    const effectiveValueField = (transformationConfig.chartValueFormula && transformationConfig.chartValueFormula.trim() !== '')
      ? '_chartFormulaValue'
      : (transformationConfig.aggregateMetricField || vField);

    const effectiveGroupField = transformationConfig.groupByField || lField;

    // Step 3: Aggregation / Group By (SUM, AVG, COUNT, MIN, MAX)
    const aggFn = transformationConfig.aggregateFunction;
    const shouldAggregate = aggFn && aggFn !== 'none';

    if (shouldAggregate) {
      const groups = new Map<string, Record<string, any>[]>();
      processedRecords.forEach(r => {
        const key = String(r[effectiveGroupField] ?? '(Sin valor)');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      });

      const aggregatedItems: Array<{ label: string; value: number; raw: any }> = [];
      groups.forEach((groupRecs, groupKey) => {
        const aggVal = calculateAggregationValue(groupRecs, effectiveValueField, aggFn);
        aggregatedItems.push({
          label: groupKey,
          value: Math.round(aggVal * 100) / 100,
          raw: groupRecs[0]
        });
      });

      return aggregatedItems;
    }

    // No aggregation, but custom formula on values
    return processedRecords.map((r, idx) => {
      const rawVal = r[effectiveValueField];
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal)) || (idx + 1) * 10;
      return {
        label: String(r[effectiveGroupField] ?? `Item ${idx + 1}`),
        value: numVal,
        raw: r
      };
    });
  }

  // Standard raw data mapping without transformation
  return records.map((r, idx) => {
    const rawVal = r[vField];
    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal)) || (idx + 1) * 10;
    return {
      label: String(r[lField] ?? `Item ${idx + 1}`),
      value: numVal,
      raw: r
    };
  });
}

/**
 * Picks default hierarchical drill-down levels strictly from the existing fields in the table.
 * Prioritizes categorical, grouping, and text fields, avoiding pure IDs.
 * NEVER invents fields that are not present in tableFields.
 */
export function getDefaultDrillLevels(tableFields: string[]): string[] {
  if (!tableFields || tableFields.length === 0) return [];

  const categoricalKeywords = [
    'categoria', 'category', 'tipo', 'type', 'estado', 'status', 'ciudad', 'city',
    'pais', 'country', 'departamento', 'department', 'seccion', 'section', 'marca',
    'brand', 'nombre', 'name', 'cliente', 'producto', 'usuario', 'canal', 'zona',
    'region', 'provincia', 'rol', 'role', 'genero', 'mes', 'sucursal', 'area'
  ];

  // Filter out pure id fields unless there are no other fields
  const nonIdFields = tableFields.filter(f => !/^(id|_id|id_[a-z0-9]+|[a-z0-9]+_id)$/i.test(f));
  const pool = nonIdFields.length > 0 ? nonIdFields : tableFields;

  // Group by priority: fields containing categorical keywords
  const prioritized = pool.filter(f =>
    categoricalKeywords.some(kw => f.toLowerCase().includes(kw))
  );

  const remaining = pool.filter(f => !prioritized.includes(f));
  const ordered = [...prioritized, ...remaining];

  // Return up to 2 distinct levels strictly from existing fields
  return ordered.slice(0, Math.min(2, ordered.length));
}

/**
 * Sanitizes drill-down levels so they strictly exist within the table's current fields.
 * If current levels are undefined or none of them match existing fields, returns defaults from table.
 */
export function sanitizeDrillLevels(currentLevels: string[] | undefined, tableFields: string[]): string[] {
  if (!tableFields || tableFields.length === 0) return [];

  // Filter currentLevels strictly to fields present in tableFields
  const valid = (currentLevels || []).filter(f => tableFields.includes(f));

  if (valid.length > 0) {
    return valid;
  }

  // If none of the configured levels exist in tableFields, establish defaults ONLY from tableFields
  return getDefaultDrillLevels(tableFields);
}

/**
 * Picks a sensible default numeric metric field for drill-down aggregation strictly from table fields.
 */
export function getDefaultDrillMetricField(tableFields: string[]): string {
  if (!tableFields || tableFields.length === 0) return '';

  const metricKeywords = [
    'precio', 'total', 'saldo', 'stock', 'cantidad', 'monto', 'valor',
    'importe', 'salario', 'costo', 'price', 'amount', 'sales', 'revenue',
    'subtotal', 'qty', 'units', 'sueldo', 'gasto'
  ];

  const matched = tableFields.find(f =>
    !/^(id|_id)$/i.test(f) && metricKeywords.some(kw => f.toLowerCase().includes(kw))
  );

  return matched || '';
}
