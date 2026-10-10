import React from 'react';
import { CanvasDocument } from '../types';
import { 
  BarChart2, 
  Table2, 
  Type, 
  Sparkles, 
  CreditCard, 
  QrCode, 
  Tag, 
  Layers 
} from 'lucide-react';

interface CanvasThumbnailProps {
  document: CanvasDocument;
  className?: string;
  showBadge?: boolean;
  aspectRatio?: string;
}

export const CanvasThumbnail: React.FC<CanvasThumbnailProps> = ({
  document: doc,
  className = '',
  showBadge = false
}) => {
  const docWidth = Math.max(100, doc.width || 1200);
  const docHeight = Math.max(100, doc.height || 800);
  const visibleElements = (doc.elements || []).filter(el => el.visible !== false);

  // If a pre-rendered base64 image thumbnail is available on the document, we can display it with high performance!
  if (doc.thumbnail && doc.thumbnail.startsWith('data:image/')) {
    return (
      <div 
        className={`relative overflow-hidden rounded border border-[#373a40] bg-[#141517] flex items-center justify-center ${className}`}
        style={{ aspectRatio: `${docWidth} / ${docHeight}` }}
      >
        <img
          src={doc.thumbnail}
          alt={doc.name}
          className="w-full h-full object-cover rounded pointer-events-none"
          loading="lazy"
        />
        {showBadge && (
          <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-[9px] font-mono text-[#9ca3af] px-1 py-0.5 rounded flex items-center gap-1 border border-white/10">
            <Layers className="w-2.5 h-2.5 text-[#5865f2]" />
            <span>{visibleElements.length}</span>
          </div>
        )}
      </div>
    );
  }

  // Vector / Responsive DOM Micro-Renderer: perfectly renders elements scaled proportionally
  return (
    <div
      className={`relative overflow-hidden rounded border border-[#373a40] shadow-xs select-none ${className}`}
      style={{
        aspectRatio: `${docWidth} / ${docHeight}`,
        backgroundColor: doc.backgroundColor || '#1e1f22'
      }}
    >
      {/* Subtle grid pattern background */}
      {doc.showGrid && (
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 0.5px, transparent 0.5px)',
            backgroundSize: '12px 12px'
          }}
        />
      )}

      {/* Render miniature element representations */}
      {visibleElements.map((el, idx) => {
        const leftPct = (el.x / docWidth) * 100;
        const topPct = (el.y / docHeight) * 100;
        const widthPct = (el.width / docWidth) * 100;
        const heightPct = (el.height / docHeight) * 100;

        const elBg = el.style?.backgroundColor || getMiniElementBg(el.type);
        const elBorder = el.style?.borderColor || 'transparent';
        const elRadius = el.style?.borderRadius ? Math.min(el.style.borderRadius / 3, 4) : 2;

        return (
          <div
            key={`thumb_el_${el.id || idx}`}
            className="absolute flex items-center justify-center overflow-hidden pointer-events-none transition-all"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: `${Math.max(1, widthPct)}%`,
              height: `${Math.max(1, heightPct)}%`,
              backgroundColor: elBg,
              borderColor: elBorder,
              borderWidth: el.style?.borderWidth ? 1 : 0,
              borderRadius: `${elRadius}px`,
              opacity: el.style?.opacity !== undefined ? el.style.opacity : 1,
              zIndex: el.zIndex || 1
            }}
          >
            {/* Visual Icon / Indicator based on widget type for micro preview */}
            {widthPct > 5 && heightPct > 4 && (
              <div className="opacity-70 scale-75">
                {el.type === 'chart' && <BarChart2 className="w-2.5 h-2.5 text-cyan-400" />}
                {el.type === 'table' && <Table2 className="w-2.5 h-2.5 text-indigo-400" />}
                {el.type === 'kpi' && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                {el.type === 'text' && <Type className="w-2 h-2 text-slate-300" />}
                {el.type === 'badge' && <Tag className="w-2 h-2 text-emerald-400" />}
                {el.type === 'card' && <CreditCard className="w-2.5 h-2.5 text-slate-400" />}
                {el.type === 'qrcode' && <QrCode className="w-2 h-2 text-white" />}
              </div>
            )}
          </div>
        );
      })}

      {/* Optional element count badge */}
      {showBadge && (
        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-[9px] font-mono text-[#9ca3af] px-1 py-0.5 rounded flex items-center gap-1 border border-white/10">
          <Layers className="w-2.5 h-2.5 text-[#5865f2]" />
          <span>{visibleElements.length}</span>
        </div>
      )}
    </div>
  );
};

function getMiniElementBg(type: string): string {
  switch (type) {
    case 'card':
    case 'container':
    case 'detailCard':
      return '#26292e';
    case 'kpi':
      return '#1e293b';
    case 'chart':
      return '#0f172a';
    case 'table':
    case 'matrix':
      return '#181a1d';
    case 'badge':
      return '#3b82f6';
    case 'divider':
      return '#475569';
    case 'qrcode':
      return '#ffffff';
    default:
      return '#2f3136';
  }
}
