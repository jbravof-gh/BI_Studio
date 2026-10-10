import React, { useMemo } from 'react';
import { CanvasElement } from '../types';
import { Ruler } from 'lucide-react';

interface RulerOverlayProps {
  width: number;
  height: number;
  zoom: number;
  selectedElement?: CanvasElement | null;
  selectedElements?: CanvasElement[];
  cursorPos: { x: number; y: number } | null;
  onAddGuide?: (type: 'horizontal' | 'vertical', position: number) => void;
  onToggleRulers?: () => void;
}

export const RulerOverlay: React.FC<RulerOverlayProps> = ({
  width,
  height,
  zoom,
  selectedElement,
  selectedElements = [],
  cursorPos,
  onAddGuide,
  onToggleRulers
}) => {
  // Determine dynamic step intervals based on current zoom level
  const { majorStep, minorStep, subMinorStep } = useMemo(() => {
    if (zoom >= 2.0) {
      return { majorStep: 50, minorStep: 25, subMinorStep: 5 };
    } else if (zoom >= 1.25) {
      return { majorStep: 50, minorStep: 25, subMinorStep: 10 };
    } else if (zoom >= 0.75) {
      return { majorStep: 100, minorStep: 50, subMinorStep: 10 };
    } else if (zoom >= 0.4) {
      return { majorStep: 200, minorStep: 100, subMinorStep: 20 };
    } else {
      return { majorStep: 500, minorStep: 250, subMinorStep: 50 };
    }
  }, [zoom]);

  // Compute selected bounding box (single or multi-selection)
  const selectionBounds = useMemo(() => {
    const targets = selectedElements.length > 0
      ? selectedElements
      : (selectedElement ? [selectedElement] : []);
    
    if (targets.length === 0) return null;

    const minX = Math.min(...targets.map(el => el.x));
    const minY = Math.min(...targets.map(el => el.y));
    const maxX = Math.max(...targets.map(el => el.x + el.width));
    const maxY = Math.max(...targets.map(el => el.y + el.height));

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      count: targets.length
    };
  }, [selectedElement, selectedElements]);

  // Generate ticks for Horizontal Ruler
  const horizontalTicks = useMemo(() => {
    const ticks = [];
    const count = Math.ceil(width / subMinorStep);
    for (let i = 0; i <= count; i++) {
      const pos = i * subMinorStep;
      if (pos > width) break;
      const isMajor = pos % majorStep === 0;
      const isMinor = !isMajor && (pos % minorStep === 0);
      ticks.push({ pos, isMajor, isMinor });
    }
    return ticks;
  }, [width, majorStep, minorStep, subMinorStep]);

  // Generate ticks for Vertical Ruler
  const verticalTicks = useMemo(() => {
    const ticks = [];
    const count = Math.ceil(height / subMinorStep);
    for (let i = 0; i <= count; i++) {
      const pos = i * subMinorStep;
      if (pos > height) break;
      const isMajor = pos % majorStep === 0;
      const isMinor = !isMajor && (pos % minorStep === 0);
      ticks.push({ pos, isMajor, isMinor });
    }
    return ticks;
  }, [height, majorStep, minorStep, subMinorStep]);

  const handleHorizontalClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onAddGuide) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    onAddGuide('vertical', Math.round(clickX));
  };

  const handleVerticalClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onAddGuide) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = (e.clientY - rect.top) / zoom;
    onAddGuide('horizontal', Math.round(clickY));
  };

  return (
    <>
      {/* Top-Left Corner Origin Indicator & Toggle */}
      <div
        style={{
          width: '24px',
          height: '24px',
          left: '-24px',
          top: '-24px'
        }}
        onClick={onToggleRulers}
        title="Reglas activas (px) - Clic para alternar"
        className="absolute bg-[#18191c] border-r border-b border-[#2f3136] z-30 flex items-center justify-center cursor-pointer hover:bg-[#25282c] transition group"
      >
        <span className="text-[9px] font-mono font-bold text-[#818cf8] group-hover:hidden">px</span>
        <Ruler className="w-3 h-3 text-[#5865f2] hidden group-hover:block" />
      </div>

      {/* Horizontal Ruler (Top) */}
      <div
        style={{
          width: `${width}px`,
          height: '24px',
          left: '0px',
          top: '-24px'
        }}
        className="absolute z-30 bg-[#18191c] border-b border-[#2f3136] select-none pointer-events-auto"
      >
        <svg
          width={width}
          height={24}
          viewBox={`0 0 ${width} 24`}
          onClick={handleHorizontalClick}
          className="w-full h-full block cursor-crosshair"
          title="Regla horizontal (clic para añadir guía vertical)"
        >
          {/* Ticks */}
          {horizontalTicks.map(({ pos, isMajor, isMinor }) => {
            const tickHeight = isMajor ? 12 : isMinor ? 8 : 4;
            const y1 = 24 - tickHeight;
            return (
              <g key={`h_tick_${pos}`}>
                <line
                  x1={pos}
                  y1={y1}
                  x2={pos}
                  y2={24}
                  stroke={isMajor ? '#9ca3af' : isMinor ? '#4b5563' : '#374151'}
                  strokeWidth={isMajor ? 1.2 : 1}
                  shapeRendering="crispEdges"
                />
                {isMajor && (
                  <text
                    x={pos + 3}
                    y={10}
                    fill="#9ca3af"
                    fontSize="8.5"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="500"
                  >
                    {pos}
                  </text>
                )}
              </g>
            );
          })}

          {/* Selection Span Highlight (X to X+Width) */}
          {selectionBounds && (
            <g>
              {/* Highlight bar */}
              <rect
                x={selectionBounds.x}
                y={15}
                width={selectionBounds.width}
                height={9}
                fill="#5865f2"
                fillOpacity="0.35"
              />
              {/* Left bound tick */}
              <line
                x1={selectionBounds.x}
                y1={0}
                x2={selectionBounds.x}
                y2={24}
                stroke="#818cf8"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
              {/* Right bound tick */}
              <line
                x1={selectionBounds.x + selectionBounds.width}
                y1={0}
                x2={selectionBounds.x + selectionBounds.width}
                y2={24}
                stroke="#818cf8"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
              {/* Width Dimension Badge if space permits */}
              {selectionBounds.width >= 40 && (
                <text
                  x={selectionBounds.x + selectionBounds.width / 2}
                  y={10}
                  fill="#c7d2fe"
                  fontSize="8"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(selectionBounds.width)}px
                </text>
              )}
            </g>
          )}

          {/* Real-time Cursor Indicator Tracker */}
          {cursorPos && cursorPos.x >= 0 && cursorPos.x <= width && (
            <g>
              <line
                x1={cursorPos.x}
                y1={0}
                x2={cursorPos.x}
                y2={24}
                stroke="#06b6d4"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
              {/* Coordinates Pill */}
              <rect
                x={Math.max(0, Math.min(width - 32, cursorPos.x - 16))}
                y={1}
                width={32}
                height={11}
                rx={2}
                fill="#0e7490"
              />
              <text
                x={Math.max(16, Math.min(width - 16, cursorPos.x))}
                y={9.5}
                fill="#ffffff"
                fontSize="7.5"
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {Math.round(cursorPos.x)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Vertical Ruler (Left) */}
      <div
        style={{
          width: '24px',
          height: `${height}px`,
          left: '-24px',
          top: '0px'
        }}
        className="absolute z-30 bg-[#18191c] border-r border-[#2f3136] select-none pointer-events-auto"
      >
        <svg
          width={24}
          height={height}
          viewBox={`0 0 24 ${height}`}
          onClick={handleVerticalClick}
          className="w-full h-full block cursor-crosshair"
          title="Regla vertical (clic para añadir guía horizontal)"
        >
          {/* Ticks */}
          {verticalTicks.map(({ pos, isMajor, isMinor }) => {
            const tickWidth = isMajor ? 12 : isMinor ? 8 : 4;
            const x1 = 24 - tickWidth;
            return (
              <g key={`v_tick_${pos}`}>
                <line
                  x1={x1}
                  y1={pos}
                  x2={24}
                  y2={pos}
                  stroke={isMajor ? '#9ca3af' : isMinor ? '#4b5563' : '#374151'}
                  strokeWidth={isMajor ? 1.2 : 1}
                  shapeRendering="crispEdges"
                />
                {isMajor && (
                  <text
                    x={10}
                    y={pos + 3}
                    transform={`rotate(-90 10 ${pos + 3})`}
                    fill="#9ca3af"
                    fontSize="8.5"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {pos}
                  </text>
                )}
              </g>
            );
          })}

          {/* Selection Span Highlight (Y to Y+Height) */}
          {selectionBounds && (
            <g>
              {/* Highlight bar */}
              <rect
                x={15}
                y={selectionBounds.y}
                width={9}
                height={selectionBounds.height}
                fill="#5865f2"
                fillOpacity="0.35"
              />
              {/* Top bound tick */}
              <line
                x1={0}
                y1={selectionBounds.y}
                x2={24}
                y2={selectionBounds.y}
                stroke="#818cf8"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
              {/* Bottom bound tick */}
              <line
                x1={0}
                y1={selectionBounds.y + selectionBounds.height}
                x2={24}
                y2={selectionBounds.y + selectionBounds.height}
                stroke="#818cf8"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
              {/* Height Dimension Badge if space permits */}
              {selectionBounds.height >= 40 && (
                <text
                  x={10}
                  y={selectionBounds.y + selectionBounds.height / 2}
                  transform={`rotate(-90 10 ${selectionBounds.y + selectionBounds.height / 2})`}
                  fill="#c7d2fe"
                  fontSize="8"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(selectionBounds.height)}px
                </text>
              )}
            </g>
          )}

          {/* Real-time Cursor Indicator Tracker */}
          {cursorPos && cursorPos.y >= 0 && cursorPos.y <= height && (
            <g>
              <line
                x1={0}
                y1={cursorPos.y}
                x2={24}
                y2={cursorPos.y}
                stroke="#06b6d4"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
              {/* Coordinates Pill */}
              <rect
                x={1}
                y={Math.max(0, Math.min(height - 18, cursorPos.y - 9))}
                width={22}
                height={18}
                rx={2}
                fill="#0e7490"
              />
              <text
                x={12}
                y={Math.max(9, Math.min(height - 9, cursorPos.y + 3))}
                transform={`rotate(-90 12 ${Math.max(9, Math.min(height - 9, cursorPos.y + 3))})`}
                fill="#ffffff"
                fontSize="7.5"
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {Math.round(cursorPos.y)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </>
  );
};
