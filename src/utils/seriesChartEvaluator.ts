import { DataTransformationConfig } from '../types';

export interface EvaluatedSeriesPoint {
  time: string;
  rawTime: any;
  value: number;
}

export interface EvaluatedSeriesItem {
  id: string;
  name: string;
  color: string;
  points: Array<{ time: string; value: number | null }>;
  total: number;
  average: number;
  count: number;
}

export interface EvaluatedMultiSeriesResult {
  timePoints: string[];
  series: EvaluatedSeriesItem[];
  distinctSeriesValues: string[];
  minValue: number;
  maxValue: number;
  timeField: string;
  valueField: string;
  seriesField: string;
  hasData: boolean;
}

const DEFAULT_SERIES_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink / Rose
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#e11d48'  // Rose Red
];

/**
 * Parses any date/timestamp or time string to a sortable timestamp and friendly label
 */
export function parseTimeValue(val: any): { timestamp: number; display: string } {
  if (val === null || val === undefined || val === '') {
    return { timestamp: 0, display: '(Sin fecha)' };
  }

  // Already a Date object
  if (val instanceof Date) {
    return { timestamp: val.getTime(), display: val.toISOString().slice(0, 10) };
  }

  const str = String(val).trim();

  // Try parsing ISO or standard date formats
  const parsed = Date.parse(str);
  if (!isNaN(parsed) && (str.includes('-') || str.includes('/') || str.length >= 8)) {
    return { timestamp: parsed, display: str };
  }

  // Pure number (could be year, month, or sequence)
  const num = Number(str);
  if (!isNaN(num)) {
    return { timestamp: num, display: str };
  }

  // Fallback to string sorting
  return { timestamp: 0, display: str };
}

/**
 * Formats and splits raw table records into multi-series temporal data points.
 * - Eje X: campo de tiempo (timeField || labelField)
 * - Eje Y: valor numérico (valueField)
 * - Series: una serie por cada valor distinto de seriesField
 */
export function evaluateMultiSeriesChartData(
  records: Record<string, any>[],
  options: {
    timeField?: string;
    valueField?: string;
    seriesField?: string;
    seriesAggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    timeSortOrder?: 'asc' | 'desc';
    customColors?: string[];
    limit?: number;
  }
): EvaluatedMultiSeriesResult {
  if (!records || records.length === 0) {
    return {
      timePoints: [],
      series: [],
      distinctSeriesValues: [],
      minValue: 0,
      maxValue: 100,
      timeField: options.timeField || 'fecha',
      valueField: options.valueField || 'total',
      seriesField: options.seriesField || 'categoria',
      hasData: false
    };
  }

  const sampleRow = records[0] || {};
  const allKeys = Object.keys(sampleRow);

  // 1. Determine effective timeField (Eje X)
  let timeField = options.timeField || '';
  if (!timeField || !allKeys.includes(timeField)) {
    // Smart heuristic for date / time column
    const timeMatch = allKeys.find(k => {
      const lower = k.toLowerCase();
      return (
        lower.includes('fecha') ||
        lower.includes('date') ||
        lower.includes('time') ||
        lower.includes('timestamp') ||
        lower.includes('created') ||
        lower.includes('dia') ||
        lower.includes('mes') ||
        lower.includes('year') ||
        lower.includes('anio')
      );
    });
    timeField = timeMatch || allKeys[0] || 'fecha';
  }

  // 2. Determine effective valueField (Eje Y)
  let valueField = options.valueField || '';
  if (!valueField || !allKeys.includes(valueField)) {
    // Smart heuristic for numeric metric column
    const numMatch = allKeys.find(k => {
      if (k === timeField) return false;
      const lower = k.toLowerCase();
      return (
        lower.includes('total') ||
        lower.includes('precio') ||
        lower.includes('salario') ||
        lower.includes('monto') ||
        lower.includes('cantidad') ||
        lower.includes('valor') ||
        lower.includes('costo') ||
        lower.includes('amount') ||
        lower.includes('price') ||
        lower.includes('ventas') ||
        typeof sampleRow[k] === 'number'
      );
    });
    valueField = numMatch || allKeys.find(k => k !== timeField) || allKeys[1] || 'total';
  }

  // 3. Determine effective seriesField (Campo agrupador por valores distintos)
  let seriesField = options.seriesField || '';
  if (!seriesField && allKeys.length > 2) {
    // Find candidate categorical column
    const catMatch = allKeys.find(k => {
      if (k === timeField || k === valueField) return false;
      const lower = k.toLowerCase();
      return (
        lower.includes('categoria') ||
        lower.includes('tipo') ||
        lower.includes('estado') ||
        lower.includes('metodo') ||
        lower.includes('departamento') ||
        lower.includes('canal') ||
        lower.includes('region') ||
        lower.includes('ciudad') ||
        lower.includes('sucursal')
      );
    });
    if (catMatch) {
      seriesField = catMatch;
    }
  }

  const aggregation = options.seriesAggregation || 'sum';
  const sortOrder = options.timeSortOrder || 'asc';
  const colors = options.customColors && options.customColors.length > 0
    ? options.customColors
    : DEFAULT_SERIES_COLORS;

  // 4. Extract all distinct series values
  const seriesValuesSet = new Set<string>();
  records.forEach(r => {
    if (seriesField && r[seriesField] !== undefined && r[seriesField] !== null) {
      const valStr = String(r[seriesField]).trim();
      if (valStr !== '') seriesValuesSet.add(valStr);
    }
  });

  // If no seriesField or no distinct values found, use a default "General" series
  const distinctSeriesValues = seriesValuesSet.size > 0
    ? Array.from(seriesValuesSet)
    : ['General'];

  // 5. Extract and sort unique time points (Eje X)
  const timeMap = new Map<string, { display: string; timestamp: number }>();
  records.forEach(r => {
    const rawTime = r[timeField];
    const parsed = parseTimeValue(rawTime);
    if (!timeMap.has(parsed.display)) {
      timeMap.set(parsed.display, parsed);
    }
  });

  let sortedTimePoints = Array.from(timeMap.values());
  sortedTimePoints.sort((a, b) => {
    if (a.timestamp !== 0 && b.timestamp !== 0) {
      return sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    }
    return sortOrder === 'asc'
      ? a.display.localeCompare(b.display, undefined, { numeric: true })
      : b.display.localeCompare(a.display, undefined, { numeric: true });
  });

  // Apply limit if specified (e.g. up to 20 time points)
  if (options.limit && options.limit > 0 && sortedTimePoints.length > options.limit) {
    sortedTimePoints = sortedTimePoints.slice(0, options.limit);
  }

  const timePointLabels = sortedTimePoints.map(t => t.display);

  // 6. Build matrix: [timePoint][seriesValue] -> values array
  const matrix = new Map<string, Map<string, number[]>>();
  timePointLabels.forEach(t => {
    const seriesMap = new Map<string, number[]>();
    distinctSeriesValues.forEach(s => seriesMap.set(s, []));
    matrix.set(t, seriesMap);
  });

  records.forEach(r => {
    const rawTime = r[timeField];
    const parsed = parseTimeValue(rawTime);
    const timeKey = parsed.display;
    if (!matrix.has(timeKey)) return;

    let sKey = 'General';
    if (seriesField && r[seriesField] !== undefined && r[seriesField] !== null) {
      sKey = String(r[seriesField]).trim();
    }

    const seriesMap = matrix.get(timeKey);
    if (seriesMap && seriesMap.has(sKey)) {
      const rawVal = r[valueField];
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
      if (!isNaN(numVal)) {
        seriesMap.get(sKey)!.push(numVal);
      }
    }
  });

  // 7. Aggregate values per (timePoint, seriesValue)
  function aggregateList(vals: number[], fn: string): number | null {
    if (!vals || vals.length === 0) return null;
    if (fn === 'count') return vals.length;
    if (fn === 'min') return Math.min(...vals);
    if (fn === 'max') return Math.max(...vals);
    if (fn === 'avg') {
      const sum = vals.reduce((acc, c) => acc + c, 0);
      return Math.round((sum / vals.length) * 100) / 100;
    }
    // Default sum
    const sum = vals.reduce((acc, c) => acc + c, 0);
    return Math.round(sum * 100) / 100;
  }

  let globalMin = Number.POSITIVE_INFINITY;
  let globalMax = Number.NEGATIVE_INFINITY;

  const seriesItems: EvaluatedSeriesItem[] = distinctSeriesValues.map((sName, sIdx) => {
    const color = colors[sIdx % colors.length];
    let sTotal = 0;
    let sCount = 0;

    const points = timePointLabels.map(tLabel => {
      const vals = matrix.get(tLabel)?.get(sName) || [];
      const agg = aggregateList(vals, aggregation);
      if (agg !== null) {
        if (agg < globalMin) globalMin = agg;
        if (agg > globalMax) globalMax = agg;
        sTotal += agg;
        sCount += 1;
      }
      return { time: tLabel, value: agg };
    });

    return {
      id: `series_${sIdx}_${sName}`,
      name: sName,
      color,
      points,
      total: Math.round(sTotal * 100) / 100,
      average: sCount > 0 ? Math.round((sTotal / sCount) * 100) / 100 : 0,
      count: sCount
    };
  });

  if (globalMin === Number.POSITIVE_INFINITY) globalMin = 0;
  if (globalMax === Number.NEGATIVE_INFINITY) globalMax = 100;
  if (globalMin === globalMax) {
    globalMin = 0;
    globalMax = Math.max(globalMax, 10);
  }

  return {
    timePoints: timePointLabels,
    series: seriesItems,
    distinctSeriesValues,
    minValue: globalMin,
    maxValue: globalMax,
    timeField,
    valueField,
    seriesField,
    hasData: timePointLabels.length > 0 && seriesItems.some(s => s.count > 0)
  };
}
