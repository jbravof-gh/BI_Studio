import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Code,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileJson,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Search,
  Palette,
  Layers,
  RotateCcw
} from 'lucide-react';
import { LibraryRoot, LibraryFileNode } from '../../types';
import {
  getFileExtension,
  getMimeType,
  isTextMimeType,
  updateNodeInTree
} from '../../services/dbLibraryService';
import { renderLibraryTargetToHtml } from '../../utils/libraryHtmlResolver';

export interface FilePreviewPanelProps {
  node?: LibraryFileNode | null;
  activeRoot?: LibraryRoot | null;
  liveContent?: string;
  hasUnsavedChanges?: boolean;
  onCopyUrl: (url: string) => void;
  copiedUrl: string | null;
  className?: string;
}

export const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
  node,
  activeRoot,
  liveContent,
  hasUnsavedChanges = false,
  onCopyUrl,
  copiedUrl,
  className = ''
}) => {
  const nodeName = node?.name || '';
  const nodePath = node?.path || '';
  const nodeId = node?.id || '';
  const nodeContent = node?.content || '';

  const ext = getFileExtension(nodeName);
  const mime = node?.mimeType || getMimeType(nodeName);
  const isPdf = ext === 'pdf' || mime === 'application/pdf';
  const isExcel = ['xlsx', 'xls', 'csv', 'ods', 'tsv'].includes(ext) ||
    mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv' || mime.includes('sheet');
  const isWord = ['docx', 'doc', 'dotx'].includes(ext) ||
    mime.includes('word') || mime.includes('wordprocessingml') || mime === 'application/msword';
  const isMsg = ext === 'msg' || mime === 'application/vnd.ms-outlook' || mime === 'application/x-msg';
  const isImage = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico', 'bmp'].includes(ext);
  const isHtml = ['html', 'htm'].includes(ext);
  const isMarkdown = ['md', 'markdown'].includes(ext);
  const isJson = ext === 'json';
  const isCss = ext === 'css';
  const isJs = ['js', 'mjs', 'ts'].includes(ext);

  // Viewport and render controls
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState<number>(100);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Image specific controls
  const [imageBackdrop, setImageBackdrop] = useState<'checkers' | 'dark' | 'light'>('checkers');
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);

  // JSON search query
  const [jsonSearch, setJsonSearch] = useState<string>('');
  const [isCopiedContent, setIsCopiedContent] = useState<boolean>(false);

  const effectiveContent = liveContent !== undefined ? liveContent : nodeContent;

  // Reset states when node changes
  useEffect(() => {
    setImageDims(null);
    setImageZoom(100);
    setJsonSearch('');
  }, [nodePath, nodeId]);

  // Compute live rendered HTML via library resolver
  const renderedResult = useMemo(() => {
    if (!activeRoot || !node) return null;
    let rootToRender = activeRoot;
    if (hasUnsavedChanges && isTextMimeType(mime, nodeName)) {
      const updatedTree = updateNodeInTree(activeRoot.tree, nodePath, n => ({
        ...n,
        content: effectiveContent
      }));
      rootToRender = { ...activeRoot, tree: updatedTree };
    }
    return renderLibraryTargetToHtml(rootToRender, nodePath);
  }, [activeRoot, nodePath, effectiveContent, hasUnsavedChanges, reloadKey, mime, nodeName, node]);

  // Handle local download of the file
  const handleDownload = () => {
    const element = document.createElement('a');
    let url = '';
    let isCreatedBlob = false;
    if (effectiveContent && effectiveContent.startsWith('data:')) {
      try {
        const parts = effectiveContent.split(',');
        const byteString = atob(parts[1] || '');
        const mimeType = (parts[0].split(':')[1] || mime || 'application/octet-stream').split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        url = URL.createObjectURL(blob);
        isCreatedBlob = true;
      } catch {
        url = effectiveContent;
      }
    } else {
      const blob = new Blob([effectiveContent || ''], { type: mime || 'text/plain' });
      url = URL.createObjectURL(blob);
      isCreatedBlob = true;
    }
    element.href = url;
    element.download = node?.name || 'archivo';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    if (isCreatedBlob) {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  // Open rendered preview in new window
  const handleOpenInNewTab = () => {
    if (isPdf && effectiveContent) {
      try {
        let blob: Blob;
        if (effectiveContent.startsWith('data:')) {
          const parts = effectiveContent.split(',');
          const byteString = atob(parts[1] || '');
          const mimeType = (parts[0].split(':')[1] || 'application/pdf').split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          blob = new Blob([ab], { type: mimeType });
        } else {
          blob = new Blob([effectiveContent], { type: 'application/pdf' });
        }
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      } catch (e) {
        console.warn('Error opening PDF blob in new tab:', e);
      }
    }
    if (!renderedResult?.html) return;
    const blob = new Blob([renderedResult.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Copy file content to clipboard
  const handleCopyContent = () => {
    navigator.clipboard.writeText(effectiveContent);
    setIsCopiedContent(true);
    setTimeout(() => setIsCopiedContent(false), 2000);
  };

  // Extract CSS color palette if CSS file
  const cssColors = useMemo(() => {
    if (!isCss || !effectiveContent) return [];
    const hexMatches = effectiveContent.match(/#([0-9a-fA-F]{3,8})\b/g) || [];
    const rgbMatches = effectiveContent.match(/rgba?\([^)]+\)/g) || [];
    const unique = Array.from(new Set([...hexMatches, ...rgbMatches])).slice(0, 14);
    return unique;
  }, [isCss, effectiveContent]);

  // Extract JS functions / exports if JS file
  const jsSymbols = useMemo(() => {
    if (!isJs || !effectiveContent) return [];
    const fnMatches = Array.from(effectiveContent.matchAll(/(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g))
      .map(m => m[1] || m[2])
      .filter(Boolean);
    return Array.from(new Set(fnMatches)).slice(0, 12);
  }, [isJs, effectiveContent]);

  // JSON validity parse check
  const jsonStatus = useMemo(() => {
    if (!isJson) return null;
    try {
      const parsed = JSON.parse(effectiveContent || '{}');
      const keysCount = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 1;
      return { valid: true, keysCount, error: null };
    } catch (e: any) {
      return { valid: false, keysCount: 0, error: e.message };
    }
  }, [isJson, effectiveContent]);

  if (!node || !activeRoot) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 text-center text-[#9ca3af] bg-[#141517] rounded-xl border border-[#2f3136] ${className}`}>
        <Eye className="w-10 h-10 text-[#64748b] mb-2 opacity-50" />
        <p className="text-sm font-medium text-slate-300">Selecciona un archivo</p>
        <p className="text-xs text-[#9ca3af] mt-1">Elige un archivo de la biblioteca para ver su previsualización en vivo.</p>
      </div>
    );
  }

  const previewPanelContent = (
    <div className={`h-full flex flex-col bg-[#141517] rounded-xl border border-[#2f3136] overflow-hidden ${className}`}>
      {/* Panel Top Control Bar */}
      <div className="px-3.5 py-2.5 bg-[#1a1b1e] border-b border-[#2f3136] flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Mode badge & file tag */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-semibold">
            {isHtml && <span className="flex items-center gap-1">🌐 HTML5</span>}
            {isMarkdown && <span className="flex items-center gap-1">📄 Markdown</span>}
            {isPdf && <span className="flex items-center gap-1 text-rose-400 font-bold">📑 PDF Documento</span>}
            {isExcel && <span className="flex items-center gap-1 text-emerald-400 font-bold">📊 Hoja de Cálculo Excel</span>}
            {isWord && <span className="flex items-center gap-1 text-sky-400 font-bold">📝 Documento Word</span>}
            {isMsg && <span className="flex items-center gap-1 text-blue-400 font-bold">✉️ Mensaje Outlook (.msg)</span>}
            {isImage && <span className="flex items-center gap-1">🖼️ Imagen {ext.toUpperCase()}</span>}
            {isJson && <span className="flex items-center gap-1">🧩 JSON</span>}
            {isCss && <span className="flex items-center gap-1">🎨 CSS</span>}
            {isJs && <span className="flex items-center gap-1">⚡ JavaScript</span>}
            {!isHtml && !isMarkdown && !isPdf && !isExcel && !isWord && !isMsg && !isImage && !isJson && !isCss && !isJs && (
              <span className="flex items-center gap-1">📄 {ext.toUpperCase()}</span>
            )}
          </div>

          <span className="text-xs font-mono font-medium text-white truncate max-w-[150px] sm:max-w-[220px]">
            {node.name}
          </span>

          {hasUnsavedChanges && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>En vivo</span>
            </span>
          )}
        </div>

        {/* Center: Device preset selector (for HTML & responsive preview) */}
        {isHtml && (
          <div className="flex items-center bg-[#141517] border border-[#2f3136] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              title="Vista Escritorio (100%)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                device === 'desktop' ? 'bg-[#5865f2] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('tablet')}
              title="Vista Tablet (768px)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                device === 'tablet' ? 'bg-[#5865f2] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              title="Vista Móvil (375px)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                device === 'mobile' ? 'bg-[#5865f2] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image backdrop controls (if Image) */}
        {isImage && (
          <div className="flex items-center bg-[#141517] border border-[#2f3136] rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setImageBackdrop('checkers')}
              title="Fondo transparente (Cuadrícula)"
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                imageBackdrop === 'checkers' ? 'bg-[#373a40] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Cuadrícula
            </button>
            <button
              type="button"
              onClick={() => setImageBackdrop('dark')}
              title="Fondo oscuro"
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                imageBackdrop === 'dark' ? 'bg-[#373a40] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Oscuro
            </button>
            <button
              type="button"
              onClick={() => setImageBackdrop('light')}
              title="Fondo claro"
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                imageBackdrop === 'light' ? 'bg-white text-slate-900 font-bold' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Claro
            </button>
          </div>
        )}

        {/* Right: Zoom, Reload, Download, External, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          {(isHtml || isImage) && (
            <div className="flex items-center bg-[#141517] border border-[#2f3136] rounded-lg p-0.5 text-xs text-[#9ca3af]">
              <button
                type="button"
                onClick={() => {
                  if (isImage) setImageZoom(prev => Math.max(25, prev - 25));
                  else setZoom(prev => Math.max(50, prev - 15));
                }}
                title="Reducir zoom"
                className="p-1 hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] px-1 text-slate-300 min-w-[36px] text-center">
                {isImage ? `${imageZoom}%` : `${zoom}%`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isImage) setImageZoom(prev => Math.min(300, prev + 25));
                  else setZoom(prev => Math.min(150, prev + 15));
                }}
                title="Aumentar zoom"
                className="p-1 hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reload button */}
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            title="Recargar previsualización"
            className="p-1.5 hover:bg-[#25282c] rounded-lg text-[#9ca3af] hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Download file */}
          <button
            type="button"
            onClick={handleDownload}
            title="Descargar archivo"
            className="p-1.5 hover:bg-[#25282c] rounded-lg text-[#9ca3af] hover:text-white transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Open in new tab (for HTML / Markdown / PDF / Excel / Word) */}
          {(isHtml || isMarkdown || isPdf || isExcel || isWord) && (
            <button
              type="button"
              onClick={handleOpenInNewTab}
              title="Abrir en pestaña nueva"
              className="p-1.5 hover:bg-[#25282c] rounded-lg text-[#9ca3af] hover:text-white transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="p-1.5 hover:bg-[#25282c] rounded-lg text-[#9ca3af] hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Panel Canvas Body */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-[#0f172a]">
        {/* Case 0: PDF Document */}
        {isPdf && (
          <div className="flex-1 w-full h-full overflow-hidden bg-[#0b0f19] relative">
            <iframe
              key={`preview_pdf_${reloadKey}_${node.path}`}
              srcDoc={renderedResult?.html}
              title={node.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              className="w-full h-full border-0 block"
            />
          </div>
        )}

        {/* Case 0.5: Excel Spreadsheet */}
        {isExcel && (
          <div className="flex-1 w-full h-full overflow-hidden bg-[#0b130e] relative">
            <iframe
              key={`preview_excel_${reloadKey}_${node.path}`}
              srcDoc={renderedResult?.html}
              title={node.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              className="w-full h-full border-0 block"
            />
          </div>
        )}

        {/* Case 0.6: Word Document */}
        {isWord && (
          <div className="flex-1 w-full h-full overflow-hidden bg-[#0b0f19] relative">
            <iframe
              key={`preview_word_${reloadKey}_${node.path}`}
              srcDoc={renderedResult?.html}
              title={node.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              className="w-full h-full border-0 block"
            />
          </div>
        )}

        {/* Case 0.7: Outlook Message (.msg) */}
        {isMsg && (
          <div className="flex-1 w-full h-full overflow-hidden bg-[#0b0f19] relative">
            <iframe
              key={`preview_msg_${reloadKey}_${node.path}`}
              srcDoc={renderedResult?.html}
              title={node.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              className="w-full h-full border-0 block"
            />
          </div>
        )}

        {/* Case 1: HTML / Web Document */}
        {isHtml && (
          <div className="flex-1 w-full h-full flex flex-col items-center justify-center overflow-auto p-2 sm:p-4 bg-[#0b0f19]">
            <div
              style={{
                width: device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '375px',
                height: device === 'desktop' ? '100%' : '94%',
                maxWidth: '100%',
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: 'top center',
                transition: 'all 0.2s ease'
              }}
              className={`flex flex-col bg-white overflow-hidden ${
                device !== 'desktop'
                  ? 'rounded-2xl border-4 border-[#334155] shadow-2xl shadow-black/80 my-auto'
                  : 'rounded-lg border border-[#334155]'
              }`}
            >
              {/* Mini simulated browser header for mobile/tablet */}
              {device !== 'desktop' && (
                <div className="h-6 bg-[#1e293b] border-b border-[#334155] px-3 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] text-[#9ca3af] font-mono truncate max-w-[200px]">
                    lib://{activeRoot.name}{node.path}
                  </span>
                  <span className="text-[9px] text-[#64748b]">{device.toUpperCase()}</span>
                </div>
              )}

              {/* The Live Iframe */}
              <iframe
                key={`preview_iframe_${reloadKey}_${node.path}`}
                srcDoc={renderedResult?.html}
                title={node.name}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full flex-1 border-0 block bg-white"
              />
            </div>
          </div>
        )}

        {/* Case 2: Markdown File */}
        {isMarkdown && (
          <div className="flex-1 w-full h-full overflow-hidden bg-[#0f172a]">
            <iframe
              key={`preview_md_${reloadKey}_${node.path}`}
              srcDoc={renderedResult?.html}
              title={node.name}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-full border-0 block"
            />
          </div>
        )}

        {/* Case 3: Image / SVG Vector */}
        {isImage && (
          <div
            className={`flex-1 w-full h-full flex flex-col items-center justify-center p-6 overflow-auto select-none ${
              imageBackdrop === 'checkers'
                ? 'bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:20px_20px]'
                : imageBackdrop === 'dark'
                ? 'bg-[#0f172a]'
                : 'bg-white'
            }`}
          >
            <div className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150">
              <img
                src={node.content}
                alt={node.name}
                onLoad={(e) => {
                  setImageDims({
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight
                  });
                }}
                style={{
                  transform: `scale(${imageZoom / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease'
                }}
                className="max-h-[68vh] max-w-[85vw] object-contain rounded shadow-2xl drop-shadow-lg"
              />
            </div>

            {/* Bottom info pill */}
            <div className="mt-4 px-3 py-1.5 rounded-full bg-[#1e293b]/90 backdrop-blur-md border border-[#334155] text-xs font-mono text-[#9ca3af] flex items-center gap-3 shadow-lg">
              <span className="text-white font-medium">{node.name}</span>
              {imageDims && (
                <span className="text-indigo-400">
                  {imageDims.width} × {imageDims.height} px
                </span>
              )}
              <span>{node.size ? `${(node.size / 1024).toFixed(1)} KB` : ''}</span>
              <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                {ext}
              </span>
            </div>
          </div>
        )}

        {/* Case 4: JSON Data File */}
        {isJson && (
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#0f172a]">
            {/* JSON search and filter bar */}
            <div className="px-4 py-2 bg-[#141f32] border-b border-[#2f3136] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#9ca3af]" />
                <input
                  type="text"
                  value={jsonSearch}
                  onChange={(e) => setJsonSearch(e.target.value)}
                  placeholder="Filtrar claves o valores..."
                  className="bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-[#64748b] outline-none w-full font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                {jsonStatus?.valid ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>JSON Válido ({jsonStatus.keysCount} claves)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Error de Sintaxis</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                >
                  {isCopiedContent ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            {/* Formatted JSON content */}
            <div className="flex-1 overflow-auto p-4">
              <pre className="font-mono text-xs text-[#38bdf8] leading-relaxed whitespace-pre-wrap word-break-all select-text">
                {jsonSearch
                  ? effectiveContent
                      .split('\n')
                      .filter(line => line.toLowerCase().includes(jsonSearch.toLowerCase()))
                      .join('\n')
                  : effectiveContent}
              </pre>
            </div>
          </div>
        )}

        {/* Case 5: CSS Stylesheet File */}
        {isCss && (
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#0f172a]">
            {/* Color palette banner if colors detected */}
            {cssColors.length > 0 && (
              <div className="px-4 py-2 bg-[#141f32] border-b border-[#2f3136] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[#9ca3af] font-medium text-[11px]">Paleta de Colores Detectada:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cssColors.map((color, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          onCopyUrl(color);
                        }}
                        title={`Copiar ${color}`}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0f172a] border border-[#334155] text-[10px] font-mono hover:border-indigo-400 cursor-pointer transition"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/30 shadow-xs inline-block"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[#cbd5e1]">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live CSS Sandbox */}
            <div className="flex-1 w-full h-full overflow-hidden">
              <iframe
                key={`preview_css_${reloadKey}_${node.path}`}
                srcDoc={renderedResult?.html}
                title={node.name}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0 block"
              />
            </div>
          </div>
        )}

        {/* Case 6: JavaScript / TypeScript Code File */}
        {isJs && (
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#0f172a]">
            {/* Symbols header if detected */}
            {jsSymbols.length > 0 && (
              <div className="px-4 py-2 bg-[#141f32] border-b border-[#2f3136] flex items-center gap-2 text-xs overflow-x-auto">
                <span className="text-[#9ca3af] text-[11px] font-semibold uppercase tracking-wider shrink-0">
                  Funciones ({jsSymbols.length}):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {jsSymbols.map((sym, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono text-[10px] border border-indigo-500/25"
                    >
                      {sym}()
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Formatted Code View */}
            <div className="flex-1 overflow-auto flex">
              <div className="w-12 py-3 bg-[#0b0f19] text-right pr-3 select-none text-[11px] font-mono text-[#64748b] leading-5 border-r border-[#2f3136]">
                {effectiveContent.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 p-3 text-white font-mono text-xs leading-5 select-text overflow-auto">
                <code>{effectiveContent}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Case 7: Fallback plain text */}
        {!isHtml && !isMarkdown && !isPdf && !isExcel && !isWord && !isMsg && !isImage && !isJson && !isCss && !isJs && (
          <div className="flex-1 w-full h-full overflow-hidden flex bg-[#0f172a]">
            <div className="w-12 py-3 bg-[#0b0f19] text-right pr-3 select-none text-[11px] font-mono text-[#64748b] leading-5 border-r border-[#2f3136]">
              {effectiveContent.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="flex-1 p-4 text-[#e2e8f0] font-mono text-xs leading-relaxed select-text overflow-auto">
              <code>{effectiveContent}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Footer bar with MiniBrowser lib:// address info */}
      <div className="px-4 py-2 bg-[#18191c] border-t border-[#2f3136] flex items-center justify-between text-xs text-[#9ca3af] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-[#64748b]">MiniBrowser:</span>
          <code className="text-emerald-400 font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded border border-[#2f3136] truncate">
            lib://{activeRoot.name}{node.path}
          </code>
          <button
            type="button"
            onClick={() => onCopyUrl(`lib://${activeRoot.name}${node.path}`)}
            className="hover:text-white cursor-pointer transition p-1"
            title="Copiar URL lib://"
          >
            {copiedUrl === `lib://${activeRoot.name}${node.path}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#64748b]">
          <span>{node.size ? (node.size > 1024 ? `${(node.size / 1024).toFixed(1)} KB` : `${node.size} B`) : ''}</span>
          <span>{effectiveContent ? `${effectiveContent.split('\n').length} líneas` : ''}</span>
        </div>
      </div>
    </div>
  );

  // If in fullscreen mode, render in fixed overlay modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-150">
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold text-xs border border-indigo-500/30">
              PANTALLA COMPLETA
            </span>
            <span className="font-mono text-sm font-bold">{node.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#373a40] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Cerrar Pantalla Completa</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{previewPanelContent}</div>
      </div>
    );
  }

  return previewPanelContent;
};
