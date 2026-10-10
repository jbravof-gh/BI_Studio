import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF, GState } from 'jspdf';
import QRCode from 'qrcode';
import { CanvasDocument } from '../types';

export interface PageExportItem {
  element: HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: string;
  name?: string;
}

export type PdfScalingMode = 'Fit to Page' | 'Actual Size' | 'Scale to Width' | 'fit' | 'actual' | 'scale-to-width';

export interface ImageExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf';
  scale?: number; // 1, 2, 3
  quality?: number; // 0.1 to 1.0 for JPEG
  filename?: string;
  backgroundColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  pdfOrientation?: 'auto' | 'landscape' | 'portrait';
  pdfPageFormat?: 'canvas' | 'a4' | 'letter';
  pdfMargin?: number;
  pdfTitle?: string;
  pdfAuthor?: string;
  pdfSubject?: string;
  pdfWatermark?: string;
  pdfScaling?: PdfScalingMode;
  pdfPassword?: string;
  includeQrLink?: boolean;
  qrLinkUrl?: string;
  qrLinkLabel?: string;
  pages?: PageExportItem[];
}

function renderPdfWatermark(pdf: jsPDF, text?: string): void {
  if (!text || !text.trim()) return;
  const cleanText = text.trim();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  pdf.saveGraphicsState();
  try {
    if (pdf.setGState) {
      pdf.setGState(new GState({ opacity: 0.22 }));
    }
  } catch (_) {
    // Ignore if GState is unavailable
  }

  // Semi-transparent visible watermark color
  pdf.setTextColor(150, 150, 150);

  // Dynamic font sizing
  const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
  const targetFontSize = Math.min(Math.max((diagonal / (cleanText.length + 3)) * 0.9, 18), 68);
  pdf.setFontSize(targetFontSize);

  pdf.text(cleanText.toUpperCase(), centerX, centerY, {
    angle: 45,
    align: 'center',
    baseline: 'middle'
  });

  pdf.restoreGraphicsState();
}

function computePdfDrawBounds(
  pageWidth: number,
  pageHeight: number,
  contentWidth: number,
  contentHeight: number,
  margin: number,
  scaling: PdfScalingMode = 'Fit to Page',
  reservedBottom: number = 0
): { x: number; y: number; width: number; height: number } {
  const availWidth = Math.max(pageWidth - margin * 2, 10);
  const availHeight = Math.max(pageHeight - margin * 2 - reservedBottom, 10);

  const normalized = scaling.toLowerCase();

  if (normalized.includes('actual')) {
    // Actual Size: render 1:1 without scaling up or down
    const drawWidth = contentWidth;
    const drawHeight = contentHeight;
    const x = Math.max(margin, (pageWidth - drawWidth) / 2);
    const y = Math.max(margin, margin + Math.max(0, (availHeight - drawHeight) / 2));
    return { x, y, width: drawWidth, height: drawHeight };
  } else if (normalized.includes('width')) {
    // Scale to Width: fills available page width, height scales proportionally
    const ratio = availWidth / contentWidth;
    const drawWidth = availWidth;
    const drawHeight = contentHeight * ratio;
    const x = margin;
    const y = Math.max(margin, margin + Math.max(0, (availHeight - drawHeight) / 2));
    return { x, y, width: drawWidth, height: drawHeight };
  } else {
    // Fit to Page: preserve aspect ratio, fit inside available width and height
    const ratio = Math.min(availWidth / contentWidth, availHeight / contentHeight);
    const drawWidth = contentWidth * ratio;
    const drawHeight = contentHeight * ratio;
    const x = (pageWidth - drawWidth) / 2;
    const y = margin + Math.max(0, (availHeight - drawHeight) / 2);
    return { x, y, width: drawWidth, height: drawHeight };
  }
}

function renderPdfQrFooter(
  pdf: jsPDF,
  qrDataUrl: string,
  qrUrl: string,
  label: string,
  pageWidth: number,
  pageHeight: number,
  isCanvasFormat: boolean,
  margin: number
): void {
  pdf.saveGraphicsState();
  try {
    const qrSize = isCanvasFormat ? 48 : 34;
    const pad = isCanvasFormat ? 5 : 4;
    const badgeHeight = qrSize + pad * 2;
    const textWidth = isCanvasFormat ? 150 : 115;
    const badgeWidth = qrSize + pad * 3 + textWidth;

    const safeMargin = Math.max(margin, isCanvasFormat ? 14 : 12);
    const finalBadgeWidth = (badgeWidth > pageWidth - safeMargin * 2) ? (qrSize + pad * 2) : badgeWidth;
    const x = pageWidth - safeMargin - finalBadgeWidth;
    const y = pageHeight - safeMargin - badgeHeight;

    // Badge background with soft border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225); // slate-300
    pdf.setLineWidth(isCanvasFormat ? 1 : 0.75);
    pdf.roundedRect(x, y, finalBadgeWidth, badgeHeight, isCanvasFormat ? 4 : 3, isCanvasFormat ? 4 : 3, 'FD');

    // QR Image
    pdf.addImage(qrDataUrl, 'PNG', x + pad, y + pad, qrSize, qrSize);

    // Text labels if badge has room
    if (finalBadgeWidth > qrSize + pad * 2) {
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(isCanvasFormat ? 8.5 : 6.8);
      const cleanLabel = label.length > 24 ? label.slice(0, 22) + '…' : label;
      pdf.text(cleanLabel, x + qrSize + pad * 2, y + pad + (isCanvasFormat ? 11 : 9));

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.setFontSize(isCanvasFormat ? 7.5 : 5.8);
      pdf.text('Escanear para acceso móvil', x + qrSize + pad * 2, y + pad + (isCanvasFormat ? 22 : 18));

      // URL preview (truncated)
      const cleanUrl = qrUrl.replace(/^https?:\/\//, '');
      const displayUrl = cleanUrl.length > 26 ? cleanUrl.slice(0, 24) + '…' : cleanUrl;
      pdf.setTextColor(37, 99, 235); // blue-600
      pdf.setFontSize(isCanvasFormat ? 7 : 5.2);
      pdf.text(displayUrl, x + qrSize + pad * 2, y + pad + (isCanvasFormat ? 33 : 26));
    }

    // Active hyperlink annotation over the badge
    pdf.link(x, y, finalBadgeWidth, badgeHeight, { url: qrUrl });
  } catch (err) {
    console.warn('Error rendering PDF QR footer:', err);
  } finally {
    pdf.restoreGraphicsState();
  }
}

export async function exportCanvasToImage(
  element: HTMLElement,
  options: ImageExportOptions
): Promise<void> {
  const {
    format,
    scale = 2,
    quality = 0.95,
    filename = `canvas_export_${Date.now()}`,
    backgroundColor = '#ffffff',
    canvasWidth,
    canvasHeight,
    pdfOrientation = 'auto',
    pdfPageFormat = 'canvas',
    pdfMargin = 0,
    pdfTitle,
    pdfAuthor,
    pdfSubject,
    pdfWatermark,
    pdfScaling = 'Fit to Page',
    pdfPassword,
    includeQrLink = false,
    qrLinkUrl,
    qrLinkLabel,
    pages
  } = options;

  const filter = (node: HTMLElement | Node) => {
    if (node instanceof HTMLElement && node.classList) {
      if (
        node.classList.contains('canvas-ui-ignore') ||
        node.classList.contains('ui-resizable-handle') ||
        node.classList.contains('canvas-grid-pattern-dark') ||
        node.classList.contains('selection-outline')
      ) {
        return false;
      }
    }
    return true;
  };

  // Determine actual target dimensions (prioritizing provided canvasWidth/canvasHeight)
  const targetWidth = canvasWidth || element.offsetWidth || element.clientWidth || 960;
  const targetHeight = canvasHeight || element.offsetHeight || element.clientHeight || 680;

  const exportOptions = {
    pixelRatio: scale,
    backgroundColor: backgroundColor || '#ffffff',
    filter,
    cacheBust: true,
    width: targetWidth,
    height: targetHeight,
    style: {
      transform: 'none',
      margin: '0',
      left: '0',
      top: '0'
    }
  };

  if (format === 'png') {
    const dataUrl = await toPng(element, exportOptions);
    triggerDownload(dataUrl, `${filename}.png`);
  } else if (format === 'jpeg') {
    const dataUrl = await toJpeg(element, { ...exportOptions, quality });
    triggerDownload(dataUrl, `${filename}.jpg`);
  } else if (format === 'svg') {
    const dataUrl = await toSvg(element, exportOptions);
    triggerDownload(dataUrl, `${filename}.svg`);
  } else if (format === 'pdf') {
    const pageItems: PageExportItem[] = (pages && pages.length > 0)
      ? pages
      : [{ element, width: targetWidth, height: targetHeight, backgroundColor }];

    let pdf: jsPDF | null = null;

    // Optional encryption parameters
    const encryption = (pdfPassword && pdfPassword.trim().length > 0)
      ? {
          userPassword: pdfPassword.trim(),
          ownerPassword: pdfPassword.trim(),
          userPermissions: ['print', 'modify', 'copy', 'annot-forms'] as ('copy' | 'print' | 'modify' | 'annot-forms')[]
        }
      : undefined;

    // Optional QR code image generation for bottom mobile link
    let qrDataUrl: string | null = null;
    if (includeQrLink && qrLinkUrl && qrLinkUrl.trim().length > 0) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrLinkUrl.trim(), {
          margin: 1,
          width: 256,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
      } catch (qrErr) {
        console.warn('Failed to generate QR code for PDF:', qrErr);
      }
    }

    for (let i = 0; i < pageItems.length; i++) {
      const pageItem = pageItems[i];
      const pWidth = pageItem.width || targetWidth;
      const pHeight = pageItem.height || targetHeight;
      const pBg = pageItem.backgroundColor || backgroundColor || '#ffffff';

      const pExportOptions = {
        pixelRatio: scale,
        backgroundColor: pBg,
        filter,
        cacheBust: true,
        width: pWidth,
        height: pHeight,
        style: {
          transform: 'none',
          margin: '0',
          left: '0',
          top: '0'
        }
      };

      const dataUrl = await toPng(pageItem.element, pExportOptions);

      let orientation: 'landscape' | 'portrait';
      if (pdfOrientation === 'landscape') {
        orientation = 'landscape';
      } else if (pdfOrientation === 'portrait') {
        orientation = 'portrait';
      } else {
        orientation = pWidth >= pHeight ? 'landscape' : 'portrait';
      }

      if (i === 0) {
        if (pdfPageFormat === 'canvas') {
          // EXACT CANVAS DIMENSIONS (unit: 'px')
          pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [pWidth, pHeight],
            hotfixes: ['px_scaling'],
            encryption
          });

          const reservedBottom = qrDataUrl ? 60 : 0;
          const bounds = computePdfDrawBounds(
            pWidth,
            pHeight,
            pWidth,
            pHeight,
            pdfMargin,
            pdfScaling,
            reservedBottom
          );

          pdf.addImage(dataUrl, 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');

          // Render QR mobile access badge at bottom if requested
          if (qrDataUrl && qrLinkUrl) {
            renderPdfQrFooter(
              pdf,
              qrDataUrl,
              qrLinkUrl.trim(),
              qrLinkLabel || 'Acceso Móvil al Panel',
              pWidth,
              pHeight,
              true,
              pdfMargin
            );
          }
        } else {
          // Standard page formats (A4 / Letter)
          pdf = new jsPDF({
            orientation,
            unit: 'pt',
            format: pdfPageFormat === 'letter' ? 'letter' : 'a4',
            encryption
          });

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = pdfMargin || 20;
          const reservedBottom = qrDataUrl ? 44 : 0;

          const bounds = computePdfDrawBounds(
            pageWidth,
            pageHeight,
            pWidth,
            pHeight,
            margin,
            pdfScaling,
            reservedBottom
          );

          pdf.addImage(dataUrl, 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');

          // Render QR mobile access badge at bottom if requested
          if (qrDataUrl && qrLinkUrl) {
            renderPdfQrFooter(
              pdf,
              qrDataUrl,
              qrLinkUrl.trim(),
              qrLinkLabel || 'Acceso Móvil al Panel',
              pageWidth,
              pageHeight,
              false,
              margin
            );
          }
        }

        // Draw diagonal watermark across page 1
        renderPdfWatermark(pdf, pdfWatermark);

      } else if (pdf) {
        // Add subsequent page to the PDF
        if (pdfPageFormat === 'canvas') {
          pdf.addPage([pWidth, pHeight], orientation);
          const reservedBottom = qrDataUrl ? 60 : 0;
          const bounds = computePdfDrawBounds(
            pWidth,
            pHeight,
            pWidth,
            pHeight,
            pdfMargin,
            pdfScaling,
            reservedBottom
          );
          pdf.addImage(dataUrl, 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');

          if (qrDataUrl && qrLinkUrl) {
            renderPdfQrFooter(
              pdf,
              qrDataUrl,
              qrLinkUrl.trim(),
              qrLinkLabel || 'Acceso Móvil al Panel',
              pWidth,
              pHeight,
              true,
              pdfMargin
            );
          }
        } else {
          pdf.addPage(pdfPageFormat === 'letter' ? 'letter' : 'a4', orientation);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = pdfMargin || 20;
          const reservedBottom = qrDataUrl ? 44 : 0;

          const bounds = computePdfDrawBounds(
            pageWidth,
            pageHeight,
            pWidth,
            pHeight,
            margin,
            pdfScaling,
            reservedBottom
          );

          pdf.addImage(dataUrl, 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');

          if (qrDataUrl && qrLinkUrl) {
            renderPdfQrFooter(
              pdf,
              qrDataUrl,
              qrLinkUrl.trim(),
              qrLinkLabel || 'Acceso Móvil al Panel',
              pageWidth,
              pageHeight,
              false,
              margin
            );
          }
        }

        // Draw diagonal watermark across subsequent page
        renderPdfWatermark(pdf, pdfWatermark);
      }
    }

    if (pdf) {
      pdf.setProperties({
        title: pdfTitle || filename,
        subject: pdfSubject || 'Exported from Dexie Canvas Designer',
        creator: 'Dexie Canvas Designer',
        author: pdfAuthor || 'User'
      });

      pdf.save(`${filename}.pdf`);
    }
  }
}

export function exportCanvasDocumentJSON(canvasDoc: CanvasDocument, filename?: string): void {
  const jsonStr = JSON.stringify(canvasDoc, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename || canvasDoc.name.toLowerCase().replace(/\s+/g, '_')}_layout.json`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

