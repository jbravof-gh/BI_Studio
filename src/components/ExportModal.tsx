import React, { useState, useEffect, useMemo } from 'react';
import { exportCanvasToImage, PageExportItem, PdfScalingMode } from '../utils/imageExporter';
import { CanvasDocument, CanvasElement } from '../types';
import { normalizeDocumentPages } from '../utils/pageUtils';
import { CanvasElementView } from './CanvasElementView';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { 
  Download, 
  Image as ImageIcon, 
  FileText, 
  Check, 
  X, 
  Sparkles, 
  Loader2,
  Maximize2,
  FileCheck,
  User,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Settings2,
  Compass,
  Lock,
  Stamp,
  ChevronDown,
  ShieldCheck,
  Scaling,
  QrCode,
  Copy,
  Smartphone,
  ExternalLink,
  FileArchive
} from 'lucide-react';

function generateDefaultDashboardUrl(docId?: string): string {
  if (typeof window === 'undefined') return 'https://dashboard-canvas.app/live';
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/+$/, '');
  const docParam = docId ? `&docId=${encodeURIComponent(docId)}` : '';
  return `${origin}${path}?view=dashboard${docParam}`;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasDoc?: CanvasDocument;
  dbRecords?: Record<string, Record<string, any>[]>;
  onOpenHtmlExport?: () => void;
  // Backwards compatibility props
  canvasDocName?: string;
  canvasBackgroundColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasDoc,
  dbRecords = {},
  onOpenHtmlExport,
  canvasDocName,
  canvasBackgroundColor,
  canvasWidth,
  canvasHeight
}) => {
  // Normalize document to extract multi-page configuration
  const normalizedDoc = useMemo(() => {
    if (canvasDoc) {
      return normalizeDocumentPages(canvasDoc);
    }
    // Fallback pseudo-document
    const pseudoDoc: CanvasDocument = {
      id: 'default_doc',
      name: canvasDocName || 'canvas_report',
      width: canvasWidth || 960,
      height: canvasHeight || 680,
      backgroundColor: canvasBackgroundColor || '#ffffff',
      elements: [],
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      targetDatabase: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: 'page_1',
          name: 'Página 1',
          elements: [],
          width: canvasWidth || 960,
          height: canvasHeight || 680,
          backgroundColor: canvasBackgroundColor || '#ffffff'
        }
      ]
    };
    return normalizeDocumentPages(pseudoDoc);
  }, [canvasDoc, canvasDocName, canvasBackgroundColor, canvasWidth, canvasHeight]);

  const totalPages = normalizedDoc.pages?.length || 1;
  const activePageIdx = normalizedDoc.activePageIndex ?? 0;

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Form states
  const [format, setFormat] = useState<'png' | 'jpeg' | 'svg' | 'pdf'>('pdf');
  const [scale, setScale] = useState<number>(2);
  const [quality, setQuality] = useState<number>(0.95);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [filename, setFilename] = useState<string>(() => {
    const docName = canvasDoc?.name || canvasDocName || 'canvas_report';
    return docName.toLowerCase().replace(/\s+/g, '_');
  });

  // PDF-specific configuration & metadata
  const [includeAllPages, setIncludeAllPages] = useState<boolean>(true);
  const [pdfTitle, setPdfTitle] = useState<string>(() => canvasDoc?.name || canvasDocName || 'Reporte de Diseño');
  const [pdfAuthor, setPdfAuthor] = useState<string>('Canvas Designer');
  const [pdfSubject, setPdfSubject] = useState<string>('Reporte de Cuadro de Mando');
  const [pdfOrientation, setPdfOrientation] = useState<'auto' | 'landscape' | 'portrait'>('landscape');
  const [pdfPageFormat, setPdfPageFormat] = useState<'canvas' | 'a4' | 'letter'>('canvas');
  const [pdfMargin, setPdfMargin] = useState<number>(0);
  const [pdfWatermark, setPdfWatermark] = useState<string>('');
  const [pdfScaling, setPdfScaling] = useState<'Fit to Page' | 'Actual Size' | 'Scale to Width'>('Fit to Page');
  const [pdfPassword, setPdfPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // QR code dashboard link configuration
  const [includeQrLink, setIncludeQrLink] = useState<boolean>(false);
  const [qrUrl, setQrUrl] = useState<string>(() => generateDefaultDashboardUrl(canvasDoc?.id));
  const [qrLabel, setQrLabel] = useState<string>('Acceso Móvil al Panel');
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string>('');
  const [copiedQrUrl, setCopiedQrUrl] = useState<boolean>(false);

  // Mini-preview state
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(activePageIdx);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isCapturingThumbnail, setIsCapturingThumbnail] = useState<boolean>(false);

  // Generate QR code data URL for live preview
  useEffect(() => {
    if (includeQrLink && qrUrl.trim()) {
      let isMounted = true;
      QRCode.toDataURL(qrUrl.trim(), {
        margin: 1,
        width: 160,
        color: { dark: '#0f172a', light: '#ffffff' }
      })
        .then(dataUrl => {
          if (isMounted) setQrPreviewDataUrl(dataUrl);
        })
        .catch(err => {
          console.warn('Failed to generate preview QR code:', err);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setQrPreviewDataUrl('');
    }
  }, [includeQrLink, qrUrl]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewPageIndex(activePageIdx);
      if (canvasDoc?.name || canvasDocName) {
        setPdfTitle(canvasDoc?.name || canvasDocName || 'Reporte de Diseño');
      }
      if (!includeQrLink) {
        setQrUrl(generateDefaultDashboardUrl(canvasDoc?.id));
      }
    }
  }, [isOpen, activePageIdx, canvasDoc?.name, canvasDocName, canvasDoc?.id, includeQrLink]);

  const effectiveWidth = canvasWidth && canvasWidth > 0 
    ? canvasWidth 
    : (canvasDoc?.width || normalizedDoc.width || 960);
  const effectiveHeight = canvasHeight && canvasHeight > 0 
    ? canvasHeight 
    : (canvasDoc?.height || normalizedDoc.height || 680);
  const isLandscape = effectiveWidth >= effectiveHeight;

  // Effective orientation for preview calculation
  const resolvedOrientation: 'landscape' | 'portrait' = pdfOrientation === 'auto'
    ? (isLandscape ? 'landscape' : 'portrait')
    : pdfOrientation;

  // Capture low-resolution thumbnail for mini-preview
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setIsCapturingThumbnail(true);

    const timer = setTimeout(async () => {
      try {
        let targetEl: HTMLElement | null = null;
        if (previewPageIndex === activePageIdx) {
          targetEl = document.getElementById('active-canvas-surface') ||
                     document.getElementById(`pdf-offscreen-page-node-${previewPageIndex}`);
        } else {
          targetEl = document.getElementById(`pdf-offscreen-page-node-${previewPageIndex}`);
        }

        if (targetEl) {
          const thumbUrl = await toPng(targetEl, {
            pixelRatio: 0.35,
            quality: 0.55,
            cacheBust: true,
            filter: (node) => {
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
            }
          });

          if (!isCancelled) {
            setThumbnails(prev => ({ ...prev, [previewPageIndex]: thumbUrl }));
          }
        }
      } catch (err) {
        console.warn('Mini-preview thumbnail notice:', err);
      } finally {
        if (!isCancelled) {
          setIsCapturingThumbnail(false);
        }
      }
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, previewPageIndex, activePageIdx]);

  if (!isOpen) return null;

  // Helper to extract elements for a page
  const getPageElements = (pageIdx: number): CanvasElement[] => {
    const pages = normalizedDoc.pages || [];
    if (pageIdx === activePageIdx && canvasDoc?.elements && canvasDoc.elements.length > 0) {
      return canvasDoc.elements;
    }
    return pages[pageIdx]?.elements || [];
  };

  const previewElements = getPageElements(previewPageIndex);
  const previewPageObj = normalizedDoc.pages?.[previewPageIndex];
  const previewPageWidth = previewPageObj?.width || effectiveWidth;
  const previewPageHeight = previewPageObj?.height || effectiveHeight;
  const previewPageBg = previewPageObj?.backgroundColor || canvasBackgroundColor || '#ffffff';

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      if (format === 'pdf' && includeAllPages && totalPages > 1) {
        // Multi-page PDF generation: iterate through all pages
        const pagesToExport = normalizedDoc.pages || [];
        const pageItems: PageExportItem[] = [];

        for (let i = 0; i < pagesToExport.length; i++) {
          const page = pagesToExport[i];
          const pWidth = page.width || effectiveWidth;
          const pHeight = page.height || effectiveHeight;
          const pBg = page.backgroundColor || canvasBackgroundColor || '#ffffff';

          // Prefer dedicated rendered node for crisp layout
          let pageEl = document.getElementById(`pdf-offscreen-page-node-${i}`);
          if (!pageEl && i === activePageIdx) {
            pageEl = document.getElementById('active-canvas-surface');
          }

          if (pageEl) {
            pageItems.push({
              element: pageEl,
              width: pWidth,
              height: pHeight,
              backgroundColor: pBg,
              name: page.name || `Página ${i + 1}`
            });
          }
        }

        if (pageItems.length === 0) {
          throw new Error('No se encontraron páginas para exportar.');
        }

        await exportCanvasToImage(pageItems[0].element, {
          format: 'pdf',
          scale,
          quality,
          filename: filename.trim() || 'reporte_canvas',
          backgroundColor: canvasBackgroundColor || '#ffffff',
          canvasWidth: effectiveWidth,
          canvasHeight: effectiveHeight,
          pdfPageFormat,
          pdfOrientation,
          pdfMargin,
          pdfTitle: pdfTitle.trim() || filename.trim() || 'Reporte de Diseño',
          pdfAuthor: pdfAuthor.trim() || 'Canvas Designer',
          pdfSubject: pdfSubject.trim() || 'Reporte de Cuadro de Mando',
          pdfWatermark: pdfWatermark.trim() || undefined,
          pdfScaling,
          pdfPassword: pdfPassword.trim() || undefined,
          includeQrLink,
          qrLinkUrl: includeQrLink ? qrUrl.trim() : undefined,
          qrLinkLabel: includeQrLink ? (qrLabel.trim() || 'Acceso Móvil al Panel') : undefined,
          pages: pageItems
        });
      } else {
        // Single page export (current active page or selected page)
        let targetElement = document.getElementById('active-canvas-surface');
        if (!targetElement) {
          targetElement = document.getElementById(`pdf-offscreen-page-node-${activePageIdx}`);
        }

        if (!targetElement) {
          alert('No se encontró el lienzo para exportar.');
          setIsExporting(false);
          return;
        }

        await exportCanvasToImage(targetElement, {
          format,
          scale,
          quality,
          filename: filename.trim() || 'reporte_canvas',
          backgroundColor: canvasBackgroundColor || '#ffffff',
          canvasWidth: effectiveWidth,
          canvasHeight: effectiveHeight,
          pdfPageFormat,
          pdfOrientation,
          pdfMargin,
          pdfTitle: pdfTitle.trim() || filename.trim() || 'Reporte de Diseño',
          pdfAuthor: pdfAuthor.trim() || 'Canvas Designer',
          pdfSubject: pdfSubject.trim() || 'Reporte de Cuadro de Mando',
          pdfWatermark: pdfWatermark.trim() || undefined,
          pdfScaling,
          pdfPassword: pdfPassword.trim() || undefined,
          includeQrLink: format === 'pdf' ? includeQrLink : false,
          qrLinkUrl: (format === 'pdf' && includeQrLink) ? qrUrl.trim() : undefined,
          qrLinkLabel: (format === 'pdf' && includeQrLink) ? (qrLabel.trim() || 'Acceso Móvil al Panel') : undefined
        });
      }

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Error exporting document:', err);
      alert('Ocurrió un error al exportar el documento.');
      setIsExporting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center overflow-y-auto transition-all duration-200 ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      {/* Hidden Offscreen Container for rendering all multi-page elements faithfully */}
      <div
        id="pdf-offscreen-multipage-vault"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '0',
          pointerEvents: 'none',
          zIndex: -9999,
          visibility: 'visible'
        }}
        aria-hidden="true"
      >
        {normalizedDoc.pages?.map((p, idx) => {
          const pElements = getPageElements(idx);
          const pWidth = p.width || effectiveWidth;
          const pHeight = p.height || effectiveHeight;
          const pBg = p.backgroundColor || canvasBackgroundColor || '#ffffff';

          return (
            <div
              key={p.id || idx}
              id={`pdf-offscreen-page-node-${idx}`}
              style={{
                width: `${pWidth}px`,
                height: `${pHeight}px`,
                backgroundColor: pBg,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {pElements
                .filter(el => el.visible !== false)
                .map(el => (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      zIndex: el.zIndex || 1,
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined
                    }}
                  >
                    <CanvasElementView
                      element={el}
                      dbRecords={dbRecords}
                      previewMode={true}
                    />
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <div className={`bg-[#202225] shadow-2xl border border-[#2f3136] overflow-hidden text-[#e1e1e6] flex flex-col transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-4xl rounded-xl my-auto max-h-[92vh]'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-[#2f3136] bg-[#202225] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white transition ${
              format === 'pdf' ? 'bg-[#ef4444]' : 'bg-[#5865f2]'
            }`}>
              {format === 'pdf' ? <FileText className="w-5 h-5" /> : <Download className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Exportar Documento</h3>
                {format === 'pdf' && (
                  <span className="px-1.5 py-0.5 rounded bg-[#ef4444]/20 border border-[#ef4444]/40 text-[10px] text-[#ef4444] font-semibold">
                    {includeAllPages && totalPages > 1 ? `PDF Multipágina (${totalPages} págs)` : 'PDF 1 Página'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#9ca3af]">
                Generación de PDF vectorial/raster con metadatos y formatos de imagen de alta resolución
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
              className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#2f3136] transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Two-Column Layout */}
        <div className={`p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2f3136] flex-1 ${
          isFullscreen ? 'max-h-none' : 'max-h-[75vh]'
        }`}>
          
          {/* LEFT COLUMN: Mini-Preview Area of the Dashboard Layout as it appears in PDF */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#5865f2]" />
                <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
                  Mini-Vista Previa PDF
                </span>
              </div>
              <span className="text-[10px] text-[#9ca3af] font-mono">
                {resolvedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'}
              </span>
            </div>

            {/* Simulated PDF Paper Sheet Container */}
            <div className="w-full bg-[#141517] rounded-xl border border-[#2f3136] p-4 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden group">
              {/* Paper representation */}
              <div 
                className={`transition-all duration-300 relative shadow-2xl rounded-sm flex items-center justify-center overflow-hidden border ${
                  resolvedOrientation === 'landscape'
                    ? 'w-full max-w-[280px] aspect-[1.414/1]'
                    : 'h-[220px] aspect-[1/1.414]'
                }`}
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#4b5563',
                  boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                }}
              >
                {/* Print Safety Margin Frame Indicator */}
                <div 
                  className="w-full h-full relative transition-all"
                  style={{
                    padding: pdfMargin > 0 ? (resolvedOrientation === 'landscape' ? '8px' : '6px') : '0px'
                  }}
                >
                  <div 
                    className="w-full h-full relative overflow-hidden rounded-xs flex items-center justify-center"
                    style={{
                      backgroundColor: previewPageBg
                    }}
                  >
                    {/* Low-Resolution Thumbnail Image */}
                    {thumbnails[previewPageIndex] ? (
                      <img
                        src={thumbnails[previewPageIndex]}
                        alt={`Miniatura Página ${previewPageIndex + 1}`}
                        className={`w-full h-full pointer-events-none select-none transition-all duration-200 ${
                          pdfScaling === 'Scale to Width'
                            ? 'object-fill'
                            : pdfScaling === 'Actual Size'
                            ? 'object-none'
                            : 'object-contain'
                        }`}
                      />
                    ) : (
                      /* Instant Scaled Wireframe Layout while thumbnail is processing */
                      <div className="w-full h-full relative overflow-hidden p-1.5 pointer-events-none">
                        {previewElements.slice(0, 15).map(el => {
                          const scaleX = 1 / (previewPageWidth || 960);
                          const scaleY = 1 / (previewPageHeight || 680);
                          return (
                            <div
                              key={el.id}
                              style={{
                                position: 'absolute',
                                left: `${(el.x * scaleX) * 100}%`,
                                top: `${(el.y * scaleY) * 100}%`,
                                width: `${Math.max((el.width * scaleX) * 100, 4)}%`,
                                height: `${Math.max((el.height * scaleY) * 100, 4)}%`,
                                backgroundColor: el.style.backgroundColor || (el.type === 'kpi' ? '#5865f2' : '#374151'),
                                opacity: 0.85,
                                borderRadius: '1px'
                              }}
                            />
                          );
                        })}
                        {isCapturingThumbnail && (
                          <div className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Diagonal Watermark Preview */}
                {pdfWatermark.trim() && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-hidden px-1">
                    <span 
                      className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#4b5563]/40 select-none transform -rotate-45 whitespace-nowrap"
                      style={{ letterSpacing: '0.18em' }}
                    >
                      {pdfWatermark.trim()}
                    </span>
                  </div>
                )}

                {/* Password Protection Badge on Preview */}
                {pdfPassword.trim() && (
                  <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1 bg-[#10b981]/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Cifrado</span>
                  </div>
                )}

                {/* QR Code Mobile Link Footer Badge on Preview */}
                {includeQrLink && (
                  <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1 bg-white/95 text-slate-800 text-[8px] font-semibold px-1.5 py-0.5 rounded shadow border border-slate-300 pointer-events-none max-w-[130px]">
                    {qrPreviewDataUrl ? (
                      <img src={qrPreviewDataUrl} alt="QR" className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <QrCode className="w-3 h-3 text-[#ef4444] shrink-0" />
                    )}
                    <span className="truncate text-[7.5px] text-slate-700">QR Móvil</span>
                  </div>
                )}

                {/* Corner Dog-ear Visual Accent */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-[#374151] to-transparent pointer-events-none opacity-40" />
              </div>

              {/* Watermark / Badge over thumbnail preview */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none px-2 text-[10px] text-[#9ca3af] bg-[#1a1b1e]/85 backdrop-blur-xs py-1 rounded-md border border-[#2f3136]">
                <span className="font-semibold text-[#e1e1e6]">
                  Pág. {previewPageIndex + 1}: {previewPageObj?.name || `Hoja ${previewPageIndex + 1}`}
                </span>
                <span className="font-mono">
                  {previewPageWidth} × {previewPageHeight} px
                </span>
              </div>
            </div>

            {/* Page Stepper Navigation for Multi-Page Documents */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-[#1a1b1e] px-3 py-1.5 rounded-lg border border-[#2f3136]">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span className="text-xs font-semibold text-white">Previsualizar Páginas:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewPageIndex(prev => Math.max(0, prev - 1))}
                    disabled={previewPageIndex === 0}
                    className="p-1 rounded bg-[#25282c] hover:bg-[#2f3136] disabled:opacity-30 text-[#e1e1e6] cursor-pointer"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-[#5865f2]">
                    {previewPageIndex + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={previewPageIndex >= totalPages - 1}
                    className="p-1 rounded bg-[#25282c] hover:bg-[#2f3136] disabled:opacity-30 text-[#e1e1e6] cursor-pointer"
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Print Dimensions & Aspect Ratio Card */}
            <div className="p-2.5 rounded-lg bg-[#1a1b1e] border border-[#2f3136] space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9ca3af]">Formato de Salida:</span>
                <span className="text-white font-semibold capitalize font-mono">
                  {pdfPageFormat === 'canvas' ? 'Lienzo 1:1' : pdfPageFormat.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9ca3af]">Orientación Documento:</span>
                <span className="text-white font-semibold">
                  {resolvedOrientation === 'landscape' ? 'Horizontal (Landscape)' : 'Vertical (Portrait)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9ca3af]">Total de Hojas en PDF:</span>
                <span className="text-[#ef4444] font-bold font-mono">
                  {includeAllPages && totalPages > 1 ? `${totalPages} Páginas` : '1 Página'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Settings, Metadata Fields & Controls */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Format Selector */}
            <div>
              <label className="block text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1.5">
                Formato de Exportación
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'pdf', label: 'PDF', desc: 'Documento', icon: FileText },
                  { id: 'png', label: 'PNG', desc: 'Sin pérdidas', icon: ImageIcon },
                  { id: 'jpeg', label: 'JPEG', desc: 'Comprimido', icon: ImageIcon },
                  { id: 'svg', label: 'SVG', desc: 'Vectorial', icon: Sparkles }
                ].map(item => {
                  const IconComponent = item.icon;
                  const isSelected = format === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormat(item.id as any)}
                      className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isSelected
                          ? item.id === 'pdf'
                            ? 'bg-[#ef4444]/20 border-[#ef4444] ring-1 ring-[#ef4444] text-white font-bold'
                            : 'bg-[#5865f2]/20 border-[#5865f2] ring-1 ring-[#5865f2] text-white font-bold'
                          : 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136] text-[#e1e1e6]'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${
                        isSelected 
                          ? item.id === 'pdf' ? 'text-[#ef4444]' : 'text-[#5865f2]' 
                          : 'text-[#9ca3af]'
                      }`} />
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[9px] text-[#9ca3af]">{item.desc}</div>
                    </button>
                  );
                })}
              </div>

              {onOpenHtmlExport && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileArchive className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-300">¿Exportar como Sitio Web HTML interactivo?</div>
                      <div className="text-[10px] text-emerald-400/80">Crea un paquete .zip completo con index.html, css/, js/ y assets/</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenHtmlExport}
                    className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-xs transition shrink-0 cursor-pointer"
                  >
                    Exportar ZIP
                  </button>
                </div>
              )}
            </div>

            {/* Filename Input */}
            <div>
              <label className="block text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                Nombre de Archivo
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#5865f2] font-mono text-xs text-[#e1e1e6]"
                  placeholder="nombre_del_reporte"
                />
                <span className="absolute right-2.5 text-xs text-[#9ca3af] font-mono pointer-events-none">
                  .{format === 'jpeg' ? 'jpg' : format}
                </span>
              </div>
            </div>

            {/* PDF-SPECIFIC SECTION: Pages Scope, Orientation, Metadata, Layout */}
            {format === 'pdf' && (
              <div className="p-3.5 bg-[#1a1b1e] border border-[#ef4444]/35 rounded-xl space-y-3.5">
                
                {/* 1. Multi-Page Scope Toggle */}
                {totalPages > 1 ? (
                  <div className="p-2.5 rounded-lg bg-[#25282c] border border-[#2f3136] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#ef4444]" />
                        <span className="text-xs font-bold text-white">
                          Páginas del Documento en el PDF
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] text-[10px] font-bold">
                        {totalPages} Páginas Detectadas
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setIncludeAllPages(true)}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer flex items-center gap-2 ${
                          includeAllPages
                            ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                            : 'bg-[#1a1b1e] hover:bg-[#202225] border-[#2f3136] text-[#9ca3af]'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          includeAllPages ? 'border-[#ef4444] bg-[#ef4444]' : 'border-[#9ca3af]'
                        }`}>
                          {includeAllPages && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs">Todas las Páginas ({totalPages})</div>
                          <div className="text-[9px] text-[#9ca3af]">Cada hoja en una página PDF</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIncludeAllPages(false)}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer flex items-center gap-2 ${
                          !includeAllPages
                            ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                            : 'bg-[#1a1b1e] hover:bg-[#202225] border-[#2f3136] text-[#9ca3af]'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          !includeAllPages ? 'border-[#ef4444] bg-[#ef4444]' : 'border-[#9ca3af]'
                        }`}>
                          {!includeAllPages && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs">Solo Página Actual</div>
                          <div className="text-[9px] text-[#9ca3af]">Pág. {activePageIdx + 1} ({normalizedDoc.pages?.[activePageIdx]?.name || 'Activa'})</div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-[#25282c] rounded-lg border border-[#2f3136] text-[11px] text-[#9ca3af]">
                    <Layers className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Lienzo de página única: Se exportará 1 página al documento PDF.</span>
                  </div>
                )}

                {/* 2. Page Orientation Controls (Portrait vs Landscape) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                      Orientación de Página (PDF Orientation)
                    </label>
                    <span className="text-[10px] text-[#ef4444] font-medium">
                      {pdfOrientation === 'landscape' ? 'Horizontal Apaisado' : pdfOrientation === 'portrait' ? 'Vertical Retrato' : 'Automática'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { 
                        id: 'landscape', 
                        label: 'Horizontal', 
                        sub: 'Landscape',
                        icon: Compass 
                      },
                      { 
                        id: 'portrait', 
                        label: 'Vertical', 
                        sub: 'Portrait',
                        icon: Compass 
                      },
                      { 
                        id: 'auto', 
                        label: 'Automática', 
                        sub: isLandscape ? 'Horizontal' : 'Vertical',
                        icon: Maximize2 
                      }
                    ].map(ori => (
                      <button
                        key={ori.id}
                        type="button"
                        onClick={() => setPdfOrientation(ori.id as any)}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          pdfOrientation === ori.id
                            ? 'bg-[#ef4444]/20 border-[#ef4444] ring-1 ring-[#ef4444] text-white font-bold'
                            : 'bg-[#25282c] hover:bg-[#2f3136] border-[#2f3136] text-[#9ca3af]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{ori.label}</div>
                        <div className="text-[9px] text-[#9ca3af]">{ori.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Content Scaling Dropdown */}
                <div className="space-y-1.5 pt-1 border-t border-[#2f3136]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pdf-scaling-select" className="flex items-center gap-1.5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                      <Scaling className="w-3.5 h-3.5 text-[#ef4444]" />
                      <span>Escalado de Contenido (Scaling)</span>
                    </label>
                    <span className="text-[10px] text-[#ef4444] font-semibold font-mono">
                      {pdfScaling}
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      id="pdf-scaling-select"
                      value={pdfScaling}
                      onChange={(e) => setPdfScaling(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs text-[#e1e1e6] cursor-pointer appearance-none pr-8 font-medium"
                    >
                      <option value="Fit to Page">Fit to Page (Ajustar a la página)</option>
                      <option value="Actual Size">Actual Size (Tamaño real 100%)</option>
                      <option value="Scale to Width">Scale to Width (Ajustar al ancho)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#9ca3af] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {[
                      { id: 'Fit to Page', label: 'Fit to Page', desc: 'Ajustar a hoja' },
                      { id: 'Actual Size', label: 'Actual Size', desc: 'Tamaño 1:1' },
                      { id: 'Scale to Width', label: 'Scale to Width', desc: 'Ajustar al ancho' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPdfScaling(opt.id as any)}
                        className={`p-1.5 rounded-md border text-center transition cursor-pointer ${
                          pdfScaling === opt.id
                            ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                            : 'bg-[#25282c] hover:bg-[#2f3136] border-[#2f3136] text-[#9ca3af]'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{opt.label}</div>
                        <div className="text-[9px] text-[#9ca3af]">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#9ca3af]">
                    {pdfScaling === 'Fit to Page' && 'Ajusta el contenido proporcionalmente para caber en la página respetando los márgenes.'}
                    {pdfScaling === 'Actual Size' && 'Mantiene el tamaño nativo en píxeles del diseño (escala 100%), centrado en la página.'}
                    {pdfScaling === 'Scale to Width' && 'Escala el diseño para llenar todo el ancho disponible manteniendo la relación de aspecto.'}
                  </p>
                </div>

                {/* 4. Watermark Input Field */}
                <div className="space-y-1.5 pt-1 border-t border-[#2f3136]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pdf-watermark-input" className="flex items-center gap-1.5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                      <Stamp className="w-3.5 h-3.5 text-[#ef4444]" />
                      <span>Marca de Agua (Watermark)</span>
                    </label>
                    {pdfWatermark && (
                      <button
                        type="button"
                        onClick={() => setPdfWatermark('')}
                        className="text-[10px] text-[#ef4444] hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 text-[#9ca3af] pointer-events-none">
                      <Stamp className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="pdf-watermark-input"
                      type="text"
                      value={pdfWatermark}
                      onChange={(e) => setPdfWatermark(e.target.value)}
                      placeholder="Ej. CONFIDENCIAL, BORRADOR, COPIA, DRAFT..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs text-[#e1e1e6]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#9ca3af]">Sugerencias:</span>
                    {['CONFIDENCIAL', 'BORRADOR', 'COPIA', 'DRAFT', 'SOLO LECTURA'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPdfWatermark(tag)}
                        className={`px-1.5 py-0.5 text-[9px] rounded border transition cursor-pointer ${
                          pdfWatermark.toUpperCase() === tag
                            ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                            : 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136] text-[#9ca3af]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#9ca3af]">
                    El texto se estampará en diagonal a 45° a través de todas las páginas del PDF exportado.
                  </p>
                </div>

                {/* 5. Optional Password Encryption Field */}
                <div className="space-y-1.5 pt-1 border-t border-[#2f3136]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pdf-password-input" className="flex items-center gap-1.5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-[#ef4444]" />
                      <span>Contraseña de Protección (Password)</span>
                    </label>
                    <span className={`text-[10px] font-semibold ${pdfPassword.trim() ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>
                      {pdfPassword.trim() ? '🔒 Cifrado activado' : 'Opcional'}
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 text-[#9ca3af] pointer-events-none">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="pdf-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      placeholder="Escribe una contraseña para cifrar el PDF..."
                      className="w-full pl-8 pr-16 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs text-[#e1e1e6]"
                    />
                    <div className="absolute right-1.5 flex items-center gap-1">
                      {pdfPassword && (
                        <button
                          type="button"
                          onClick={() => setPdfPassword('')}
                          className="p-1 text-[#9ca3af] hover:text-white rounded cursor-pointer"
                          title="Borrar contraseña"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-[#9ca3af] hover:text-white rounded cursor-pointer"
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#9ca3af]">
                    {pdfPassword.trim()
                      ? 'El PDF se cifrará con algoritmo estándar. Los lectores exigirán esta contraseña para abrir el archivo.'
                      : 'Deja este campo vacío si no requieres proteger el documento con clave.'}
                  </p>
                </div>

                {/* 6. Enlace QR al Panel (Include QR link to dashboard) */}
                <div className="space-y-2 pt-1 border-t border-[#2f3136]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="include-qr-link-checkbox" className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        id="include-qr-link-checkbox"
                        type="checkbox"
                        checked={includeQrLink}
                        onChange={(e) => setIncludeQrLink(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#25282c] border-[#374151] text-[#ef4444] focus:ring-[#ef4444] focus:ring-offset-0 cursor-pointer accent-[#ef4444]"
                      />
                      <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
                        <QrCode className="w-3.5 h-3.5 text-[#ef4444]" />
                        <span>Include QR link to dashboard</span>
                      </div>
                    </label>
                    <span className={`text-[10px] font-semibold ${includeQrLink ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>
                      {includeQrLink ? '✓ Activado' : 'Opcional'}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#9ca3af]">
                    Genera una URL pública e incrusta un código QR escaneable e hipervínculo en el pie de página del PDF para acceso móvil instantáneo.
                  </p>

                  {includeQrLink && (
                    <div className="p-3 bg-[#1a1b1e] rounded-md border border-[#2f3136] space-y-2.5 mt-1.5">
                      {/* Generated Public URL Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="qr-dashboard-url-input" className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                            URL Pública del Panel (Dashboard URL)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (qrUrl) {
                                  navigator.clipboard.writeText(qrUrl);
                                  setCopiedQrUrl(true);
                                  setTimeout(() => setCopiedQrUrl(false), 2000);
                                }
                              }}
                              className="text-[10px] text-[#ef4444] hover:underline flex items-center gap-1 cursor-pointer"
                              title="Copiar enlace al portapapeles"
                            >
                              {copiedQrUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedQrUrl ? '¡Copiado!' : 'Copiar'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrUrl(generateDefaultDashboardUrl(canvasDoc?.id))}
                              className="text-[10px] text-[#9ca3af] hover:text-white cursor-pointer"
                              title="Regenerar URL predeterminada"
                            >
                              Regenerar
                            </button>
                          </div>
                        </div>

                        <div className="relative flex items-center">
                          <input
                            id="qr-dashboard-url-input"
                            type="text"
                            value={qrUrl}
                            onChange={(e) => setQrUrl(e.target.value)}
                            placeholder="https://ais-pre-...run.app?view=dashboard"
                            className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs font-mono text-[#e1e1e6]"
                          />
                        </div>
                      </div>

                      {/* Quick preset links / placeholders */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#9ca3af]">Plantillas:</span>
                        {[
                          { label: 'Vista Panel', getUrl: () => generateDefaultDashboardUrl(canvasDoc?.id) },
                          { label: 'Enlace Público', getUrl: () => `${typeof window !== 'undefined' ? window.location.origin : 'https://dashboard.app'}/public/${canvasDoc?.id || 'live'}` },
                          { label: 'Enlace Corto', getUrl: () => `https://dash.link/${canvasDoc?.id?.slice(0, 8) || 'preview'}` }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setQrUrl(preset.getUrl())}
                            className={`px-1.5 py-0.5 text-[9px] rounded border transition cursor-pointer ${
                              qrUrl === preset.getUrl()
                                ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                                : 'bg-[#25282c] hover:bg-[#2f3136] border-[#2f3136] text-[#9ca3af]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Live QR visual badge preview */}
                      <div className="flex items-center gap-3 p-2 bg-[#202225] rounded border border-[#2f3136]">
                        {qrPreviewDataUrl ? (
                          <div className="p-1 bg-white rounded border border-gray-300 shrink-0 shadow-xs">
                            <img src={qrPreviewDataUrl} alt="Vista previa de QR" className="w-14 h-14 object-contain" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 bg-[#25282c] rounded flex items-center justify-center border border-[#2f3136] shrink-0">
                            <QrCode className="w-6 h-6 text-[#9ca3af]" />
                          </div>
                        )}
                        <div className="text-[11px] text-[#9ca3af] space-y-1 min-w-0">
                          <div className="text-[#e1e1e6] font-semibold flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-[#10b981]" />
                            <span>Código QR Listo</span>
                          </div>
                          <div className="text-[10px] text-[#9ca3af] leading-relaxed">
                            Se incrustará al pie de página del PDF con diseño tipo credencial e hipervínculo activo para que los lectores móviles puedan escanearlo o tocarlo.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. PDF Metadata Fields: Title, Author, Subject */}
                <div className="space-y-2.5 pt-1 border-t border-[#2f3136]">
                  <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>Metadatos del Documento PDF (PDF Metadata Properties)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Title */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                        Título (Title)
                      </label>
                      <input
                        type="text"
                        value={pdfTitle}
                        onChange={(e) => setPdfTitle(e.target.value)}
                        placeholder="Título del reporte"
                        className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs text-[#e1e1e6]"
                      />
                    </div>

                    {/* Author */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                        Autor / Organización (Author)
                      </label>
                      <input
                        type="text"
                        value={pdfAuthor}
                        onChange={(e) => setPdfAuthor(e.target.value)}
                        placeholder="Nombre del autor o empresa"
                        className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs text-[#e1e1e6]"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">
                      Asunto / Descripción (Subject)
                    </label>
                    <input
                      type="text"
                      value={pdfSubject}
                      onChange={(e) => setPdfSubject(e.target.value)}
                      placeholder="Asunto del documento"
                      className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md focus:outline-none focus:border-[#ef4444] text-xs text-[#e1e1e6]"
                    />
                  </div>
                </div>

                {/* 4. Page Sizing & Margins */}
                <div className="pt-1 border-t border-[#2f3136] space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1.5">
                      Dimensiones de Hoja del PDF
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { 
                          id: 'canvas', 
                          label: 'Lienzo 1:1', 
                          desc: `${effectiveWidth}×${effectiveHeight}px exacto` 
                        },
                        { 
                          id: 'a4', 
                          label: 'A4', 
                          desc: '210 × 297 mm ajustado' 
                        },
                        { 
                          id: 'letter', 
                          label: 'Carta / Letter', 
                          desc: '8.5 × 11 in ajustado' 
                        }
                      ].map(pf => (
                        <button
                          key={pf.id}
                          type="button"
                          onClick={() => setPdfPageFormat(pf.id as any)}
                          className={`p-1.5 rounded-lg border text-left transition cursor-pointer ${
                            pdfPageFormat === pf.id
                              ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                              : 'bg-[#25282c] hover:bg-[#2f3136] border-[#2f3136] text-[#9ca3af]'
                          }`}
                        >
                          <div className="text-xs">{pf.label}</div>
                          <div className="text-[9px] text-[#9ca3af]">{pf.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1.5">
                      Márgenes Perimetrales
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 0, label: 'Sin márgenes (0 px)', desc: 'Borde a borde exacto' },
                        { val: 16, label: 'Margen de seguridad (16 px)', desc: 'Espaciado perimetral' }
                      ].map(m => (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => setPdfMargin(m.val)}
                          className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                            pdfMargin === m.val
                              ? 'bg-[#ef4444]/20 border-[#ef4444] text-white font-bold'
                              : 'bg-[#25282c] hover:bg-[#2f3136] border-[#2f3136] text-[#9ca3af]'
                          }`}
                        >
                          <div className="text-xs">{m.label}</div>
                          <div className="text-[9px] text-[#9ca3af]">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resolution & Scale (DPI for PDF or Scale for Image) */}
            {format !== 'svg' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
                    Resolución y Escala {format === 'pdf' ? '(DPI del Render)' : ''}
                  </label>
                  <span className="text-[10px] text-[#9ca3af]">
                    {scale === 1 ? '72 DPI' : scale === 2 ? '144 DPI (Retina)' : '300 DPI (Ultra HD)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1, label: '1x Estándar', desc: 'Web (72 DPI)' },
                    { val: 2, label: '2x Retina', desc: 'HD (144 DPI)' },
                    { val: 3, label: '3x Ultra', desc: 'Impresión (300 DPI)' }
                  ].map(s => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setScale(s.val)}
                      className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                        scale === s.val
                          ? 'bg-[#5865f2]/20 border-[#5865f2] text-white font-bold'
                          : 'bg-[#1a1b1e] hover:bg-[#25282c] border-[#2f3136] text-[#9ca3af]'
                      }`}
                    >
                      <div className="text-xs">{s.label}</div>
                      <div className="text-[9px] text-[#9ca3af]">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quality for JPEG */}
            {format === 'jpeg' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">Calidad JPEG</span>
                  <span className="font-mono text-white">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-[#5865f2]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2f3136] bg-[#202225] flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#9ca3af] truncate">
            {format === 'pdf' ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                <FileText className="w-3.5 h-3.5 text-[#ef4444]" />
                <strong className="text-white">
                  {includeAllPages && totalPages > 1 ? `PDF Multipágina (${totalPages} hojas)` : 'PDF 1 Página'}
                </strong>
                <span>• {resolvedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'}</span>
                <span>• {pdfScaling}</span>
                {pdfWatermark.trim() && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                    Marca: {pdfWatermark.trim()}
                  </span>
                )}
                {pdfPassword.trim() && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Protegido
                  </span>
                )}
                {includeQrLink && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-medium flex items-center gap-1">
                    <QrCode className="w-2.5 h-2.5" /> Con QR Móvil
                  </span>
                )}
              </span>
            ) : (
              <span>Imagen {format.toUpperCase()} • {effectiveWidth * scale} × {effectiveHeight * scale} px</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-3.5 py-2 bg-[#1a1b1e] border border-[#2f3136] hover:bg-[#25282c] rounded-lg text-xs font-semibold text-[#e1e1e6] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleExecuteExport}
              disabled={isExporting}
              className={`px-4 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer ${
                format === 'pdf' 
                  ? 'bg-[#ef4444] hover:bg-[#dc2626]' 
                  : 'bg-[#5865f2] hover:bg-[#4752c4]'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {format === 'pdf' 
                      ? (includeAllPages && totalPages > 1 ? `Generando PDF (${totalPages} págs)...` : 'Generando PDF...') 
                      : 'Generando imagen...'}
                  </span>
                </>
              ) : (
                <>
                  {format === 'pdf' ? <FileText className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  <span>
                    {format === 'pdf' 
                      ? (includeAllPages && totalPages > 1 
                          ? `Descargar PDF Completo (${totalPages} Págs)` 
                          : 'Descargar PDF (1 Pág)')
                      : `Descargar ${format.toUpperCase()}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
