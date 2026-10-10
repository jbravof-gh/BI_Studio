import React, { useState, useMemo } from 'react';
import { CanvasElement } from '../types';
import { evaluateMultiSeriesChartData, EvaluatedSeriesItem } from '../utils/seriesChartEvaluator';
import { Spline, Layers, Calendar, Tag, Sigma } from 'lucide-react';

interface SeriesChartViewProps {
  element: CanvasElement;
  tableData: Record<string, any>[];
  isDark?: boolean;
  containerStyle: React.CSSProperties;
  shadowClass: string;
}

export const SeriesChartView: React.FC<SeriesChartViewProps> = ({
  element,
  tableData,
  isDark = false,
  containerStyle,
  shadowClass
}) => {
  const binding = element.binding;
  const [hoveredPoint, setHoveredPoint] = useState<{
    seriesName: string;
    color: string;
    time: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const [activeSeriesHighlight, setActiveSeriesHighlight] = useState<string | null>(null);

  // Evaluate multi-series dataset
  const seriesResult = useMemo(() => {
    return evaluateMultiSeriesChartData(tableData, {
      timeField: binding.timeField || binding.labelField,
      valueField: binding.valueField,
      seriesField: binding.seriesField,
      seriesAggregation: binding.seriesAggregation || 'sum',
      timeSortOrder: binding.timeSortOrder || 'asc',
      customColors: binding.chartColors,
      limit: binding.limit || 20
    });
  }, [tableData, binding]);

  const { timePoints, series, minValue, maxValue, hasData, timeField, valueField, seriesField } = seriesResult;

  // Layout calculations for the SVG
  const width = Math.max(element.width || 400, 260);
  const height = Math.max(element.height || 220, 160);

  const padding = {
    top: 16,
    right: 20,
    bottom: 30,
    left: 44
  };

  const plotWidth = Math.max(width - padding.left - padding.right, 50);
  const plotHeight = Math.max(height - 70 - padding.top - padding.bottom, 50);

  const yRange = Math.max(maxValue - minValue, 0.0001);

  const getX = (index: number) => {
    if (timePoints.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (timePoints.length - 1)) * plotWidth;
  };

  const getY = (val: number | null) => {
    if (val === null || isNaN(val)) return null;
    const normalized = (val - minValue) / yRange;
    return padding.top + plotHeight - normalized * plotHeight;
  };

  // Helper to generate smooth SVG path
  const generatePath = (points: Array<{ x: number; y: number }>, curveType: string) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    if (curveType === 'linear') {
      return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    }

    if (curveType === 'step') {
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midX = (prev.x + curr.x) / 2;
        path += ` L ${midX} ${prev.y} L ${midX} ${curr.y} L ${curr.x} ${curr.y}`;
      }
      return path;
    }

    // Default 'monotone' / cubic bezier
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const curveType = binding.seriesCurve || 'monotone';
  const showPoints = binding.showSeriesPoints !== false;
  const showLegend = binding.showSeriesLegend !== false;

  // Y-axis tick intervals
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = minValue + (yRange * i) / count;
      const y = padding.top + plotHeight - (i / count) * plotHeight;
      ticks.push({ value: Math.round(val * 10) / 10, y });
    }
    return ticks;
  }, [minValue, yRange, padding.top, plotHeight]);

  return (
    <div style={containerStyle} className={`${shadowClass} flex flex-col justify-between overflow-hidden relative select-none`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-1.5 px-0.5 flex-shrink-0 ${
        isDark ? 'border-white/10' : 'border-slate-100'
      }`}>
        <div className="flex items-center gap-1.5 truncate">
          <Spline className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {binding.template || (binding.tableName ? `Series Temporales - ${binding.tableName}` : 'Series Temporales')}
          </span>
          {seriesField && (
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
              isDark ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              <Layers className="w-2.5 h-2.5" />
              <span>{seriesField}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200/50">
            {series.length} {series.length === 1 ? 'Serie' : 'Series'}
          </span>
        </div>
      </div>

      {/* Series Legend */}
      {showLegend && series.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none flex-shrink-0">
          {series.map(s => {
            const isHighlighted = activeSeriesHighlight === null || activeSeriesHighlight === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setActiveSeriesHighlight(s.id)}
                onMouseLeave={() => setActiveSeriesHighlight(null)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer flex-shrink-0 border ${
                  isHighlighted
                    ? isDark ? 'bg-white/10 text-white border-white/20' : 'bg-slate-100 text-slate-800 border-slate-200'
                    : 'opacity-40 text-slate-400 border-transparent'
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate max-w-[110px]">{s.name}</span>
                <span className="text-[9px] font-mono opacity-70">({s.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Chart Area */}
      <div className="flex-1 w-full relative min-h-0">
        {hasData ? (
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height - 70}`}>
            <defs>
              {series.map(s => (
                <linearGradient key={`grad_${s.id}`} id={`grad_${s.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
                </linearGradient>
              ))}
            </defs>

            {/* Y-axis gridlines & labels */}
            {yTicks.map((tick, i) => (
              <g key={`ytick_${i}`}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={padding.left + plotWidth}
                  y2={tick.y}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}
                  strokeDasharray="3,3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 6}
                  y={tick.y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill={isDark ? '#94a3b8' : '#64748b'}
                  fontFamily="monospace"
                >
                  {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}k` : tick.value}
                </text>
              </g>
            ))}

            {/* X-axis ticks & labels */}
            {timePoints.map((tp, i) => {
              const x = getX(i);
              // Show label if not crowded
              const shouldShowLabel = timePoints.length <= 8 || i % Math.ceil(timePoints.length / 8) === 0 || i === timePoints.length - 1;

              return (
                <g key={`xtick_${i}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke={isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'}
                    strokeWidth="1"
                  />
                  {shouldShowLabel && (
                    <text
                      x={x}
                      y={padding.top + plotHeight + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isDark ? '#94a3b8' : '#64748b'}
                      className="truncate"
                    >
                      {tp.length > 10 ? tp.slice(5) : tp}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Series Paths */}
            {series.map(s => {
              const isDimmed = activeSeriesHighlight !== null && activeSeriesHighlight !== s.id;
              const validPoints: Array<{ x: number; y: number; time: string; value: number }> = [];

              s.points.forEach((p, idx) => {
                const y = getY(p.value);
                if (y !== null && p.value !== null) {
                  validPoints.push({ x: getX(idx), y, time: p.time, value: p.value });
                }
              });

              if (validPoints.length === 0) return null;

              const linePath = generatePath(validPoints, curveType);

              // Area path closed to bottom
              const areaPath = validPoints.length > 1
                ? `${linePath} L ${validPoints[validPoints.length - 1].x} ${padding.top + plotHeight} L ${validPoints[0].x} ${padding.top + plotHeight} Z`
                : '';

              return (
                <g key={`series_group_${s.id}`} style={{ opacity: isDimmed ? 0.2 : 1 }} className="transition-opacity duration-150">
                  {/* Area fill */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill={`url(#grad_${s.id})`}
                      pointerEvents="none"
                    />
                  )}

                  {/* Line stroke */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={activeSeriesHighlight === s.id ? 3 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points / Markers */}
                  {showPoints && validPoints.map((pt, ptIdx) => (
                    <circle
                      key={`pt_${s.id}_${ptIdx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={activeSeriesHighlight === s.id ? 4.5 : 3}
                      fill="#ffffff"
                      stroke={s.color}
                      strokeWidth="2"
                      className="cursor-pointer hover:scale-125 transition-transform"
                      onMouseEnter={() => {
                        setHoveredPoint({
                          seriesName: s.name,
                          color: s.color,
                          time: pt.time,
                          value: pt.value,
                          x: pt.x,
                          y: pt.y
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <title>{`${s.name} (${pt.time}): ${pt.value}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 text-slate-400">
            <Spline className="w-8 h-8 opacity-40 mb-1 text-indigo-400" />
            <span className="text-xs font-medium">Sin datos para la serie temporal</span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Configura el campo de tiempo (X: <code>{timeField || 'fecha'}</code>) y serie (<code>{seriesField || 'categoria'}</code>)
            </span>
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className={`absolute pointer-events-none z-30 px-2 py-1 rounded shadow-lg text-[10px] font-sans border transform -translate-x-1/2 -translate-y-full mb-2 ${
              isDark ? 'bg-slate-900/95 text-white border-white/20' : 'bg-slate-800 text-white border-slate-700'
            }`}
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / (height - 70)) * 100}%`
            }}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredPoint.color }} />
              <span>{hoveredPoint.seriesName}</span>
            </div>
            <div className="flex justify-between gap-2 text-slate-300 font-mono mt-0.5">
              <span>{hoveredPoint.time}:</span>
              <span className="text-white font-bold">{hoveredPoint.value.toLocaleString('es-ES')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtle bottom info bar */}
      <div className={`flex items-center justify-between pt-1 border-t text-[9px] font-mono flex-shrink-0 ${
        isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'
      }`}>
        <span className="truncate">
          Eje X: <strong>{timeField}</strong> | Eje Y: <strong>{valueField}</strong>
        </span>
        {seriesField ? (
          <span className="truncate text-indigo-500 font-medium">
            Series por: <strong>{seriesField}</strong>
          </span>
        ) : (
          <span className="text-slate-400 italic">Serie única</span>
        )}
      </div>
    </div>
  );
};
