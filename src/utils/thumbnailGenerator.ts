import { CanvasDocument, CanvasElement } from '../types';

/**
 * Generates a lightweight PNG/JPEG base64 thumbnail of a CanvasDocument using HTML5 Offscreen/DOM Canvas
 * @param doc The CanvasDocument to render
 * @param maxWidth Max width of the generated thumbnail (default: 320px)
 * @returns Promise<string> Base64 data URL
 */
export async function generateCanvasThumbnail(
  doc: CanvasDocument,
  maxWidth: number = 320
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const docWidth = Math.max(100, doc.width || 1200);
      const docHeight = Math.max(100, doc.height || 800);
      const scale = maxWidth / docWidth;
      const thumbWidth = Math.round(maxWidth);
      const thumbHeight = Math.round(docHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('');
        return;
      }

      // 1. Render Background
      ctx.fillStyle = doc.backgroundColor || '#1e1f22';
      ctx.fillRect(0, 0, thumbWidth, thumbHeight);

      // 2. Render subtle grid if enabled
      if (doc.showGrid && doc.gridSize) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const scaledGrid = Math.max(4, doc.gridSize * scale);
        for (let x = 0; x < thumbWidth; x += scaledGrid) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, thumbHeight);
          ctx.stroke();
        }
        for (let y = 0; y < thumbHeight; y += scaledGrid) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(thumbWidth, y);
          ctx.stroke();
        }
      }

      // Sort elements by zIndex
      const sortedElements = [...(doc.elements || [])].filter(el => el.visible !== false).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // 3. Render each element
      for (const el of sortedElements) {
        const x = el.x * scale;
        const y = el.y * scale;
        const w = el.width * scale;
        const h = el.height * scale;

        if (w <= 0 || h <= 0) continue;

        ctx.save();
        ctx.globalAlpha = el.style?.opacity !== undefined ? el.style.opacity : 1;

        // Apply element background
        const bg = el.style?.backgroundColor || getFallbackBg(el.type);
        ctx.fillStyle = bg;

        const radius = Math.min(Math.min(w, h) / 2, (el.style?.borderRadius || (el.type === 'badge' ? 12 : 4)) * scale);
        drawRoundedRect(ctx, x, y, w, h, radius);
        ctx.fill();

        // Apply element border if any
        if (el.style?.borderWidth && el.style.borderWidth > 0 && el.style.borderColor) {
          ctx.strokeStyle = el.style.borderColor;
          ctx.lineWidth = Math.max(1, el.style.borderWidth * scale);
          drawRoundedRect(ctx, x, y, w, h, radius);
          ctx.stroke();
        }

        // Draw simplified inner content representations
        renderElementMicroContent(ctx, el, x, y, w, h, scale);

        ctx.restore();
      }

      // Export as compressed image/jpeg or image/webp
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    } catch (err) {
      console.warn('Failed to generate canvas thumbnail data URL:', err);
      resolve('');
    }
  });
}

function getFallbackBg(type: CanvasElement['type']): string {
  switch (type) {
    case 'card':
    case 'container':
    case 'detailCard':
      return '#26292e';
    case 'kpi':
      return '#1f2937';
    case 'chart':
      return '#1e2430';
    case 'table':
    case 'matrix':
      return '#181a1d';
    case 'badge':
      return '#3b82f6';
    case 'divider':
      return '#374151';
    case 'qrcode':
      return '#ffffff';
    default:
      return '#2f3136';
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (r <= 0) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderElementMicroContent(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number
) {
  const pad = Math.max(2, 4 * scale);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  if (innerW <= 0 || innerH <= 0) return;

  switch (el.type) {
    case 'text': {
      ctx.fillStyle = el.style?.color || '#e5e7eb';
      const barH = Math.max(2, 4 * scale);
      ctx.fillRect(x + pad, y + pad, Math.min(innerW, innerW * 0.75), barH);
      break;
    }
    case 'kpi': {
      // Small title bar
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(x + pad, y + pad, innerW * 0.5, Math.max(1.5, 3 * scale));
      // Value bar
      ctx.fillStyle = el.style?.color || '#38bdf8';
      ctx.fillRect(x + pad, y + pad + 5 * scale, innerW * 0.8, Math.max(3, 7 * scale));
      break;
    }
    case 'chart': {
      // Draw mini bars or area chart
      const chartColors = el.binding?.chartColors || ['#38bdf8', '#818cf8', '#34d399', '#f472b6'];
      const barCount = 5;
      const barWidth = (innerW - (barCount - 1) * 2 * scale) / barCount;
      if (barWidth > 1) {
        for (let i = 0; i < barCount; i++) {
          const colHeight = Math.max(3, (innerH * 0.7) * ((i + 2) % 4 + 1) / 4);
          ctx.fillStyle = chartColors[i % chartColors.length];
          ctx.fillRect(
            x + pad + i * (barWidth + 2 * scale),
            y + h - pad - colHeight,
            barWidth,
            colHeight
          );
        }
      }
      break;
    }
    case 'table':
    case 'matrix': {
      // Header row
      ctx.fillStyle = '#374151';
      ctx.fillRect(x + pad, y + pad, innerW, Math.max(2, 4 * scale));
      // Content rows
      const rowCount = Math.min(4, Math.floor(innerH / (5 * scale)));
      ctx.fillStyle = '#1f2937';
      for (let r = 1; r < rowCount; r++) {
        ctx.fillRect(x + pad, y + pad + r * 5 * scale, innerW, Math.max(1.5, 3 * scale));
      }
      break;
    }
    case 'badge': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + pad, y + h / 2 - (1.5 * scale), innerW * 0.7, Math.max(1.5, 3 * scale));
      break;
    }
    case 'divider': {
      ctx.fillStyle = el.style?.borderColor || '#4b5563';
      ctx.fillRect(x, y + h / 2, w, Math.max(1, 2 * scale));
      break;
    }
    case 'qrcode': {
      // Draw small 3x3 pattern
      ctx.fillStyle = '#000000';
      const qrSize = Math.min(innerW, innerH);
      const step = qrSize / 3;
      ctx.fillRect(x + pad, y + pad, step, step);
      ctx.fillRect(x + pad + step * 2, y + pad, step, step);
      ctx.fillRect(x + pad, y + pad + step * 2, step, step);
      ctx.fillRect(x + pad + step, y + pad + step, step, step);
      break;
    }
    default:
      break;
  }
}
