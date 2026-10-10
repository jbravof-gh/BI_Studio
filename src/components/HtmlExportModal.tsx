import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  FileArchive, 
  X, 
  Download, 
  FolderTree, 
  FileCode, 
  Layout, 
  Palette, 
  Settings2, 
  Check, 
  Loader2, 
  Globe, 
  Sparkles, 
  Layers, 
  Monitor, 
  Smartphone, 
  Maximize, 
  FileText,
  Info
} from 'lucide-react';
import { CanvasDocument } from '../types';
import { exportCanvasToHtmlZip, downloadBlob, HtmlZipExportOptions } from '../utils/htmlZipExporter';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';

interface HtmlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CanvasDocument;
  dbRecords: Record<string, Record<string, any>[]>;
}

export const HtmlExportModal: React.FC<HtmlExportModalProps> = ({
  isOpen,
  onClose,
  document: canvasDoc,
  dbRecords
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [responsiveMode, setResponsiveMode] = useState<'fit-screen' | 'scrollable' | 'fixed'>('fit-screen');
  const [theme, setTheme] = useState<'toggle' | 'light' | 'dark'>('toggle');
  const [extractImages, setExtractImages] = useState(true);
  const [includeDataJson, setIncludeDataJson] = useState(true);
  const [includeReadme, setIncludeReadme] = useState(true);
  const [enableTableSorting, setEnableTableSorting] = useState(true);
  
  const [filename, setFilename] = useState(() => {
    const base = canvasDoc.name?.trim() || 'reporte_canvas';
    return `${base.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_web`;
  });
  const [title, setTitle] = useState(canvasDoc.name || 'Reporte de Diseño');
  const [author, setAuthor] = useState('Canvas Designer');

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; statusText: string }>({
    percent: 0,
    statusText: ''
  });

  if (!isOpen) return null;

  const totalPages = canvasDoc.pages?.length || 1;
  const activePageIdx = canvasDoc.activePageIndex || 0;
  const activePageName = canvasDoc.pages?.[activePageIdx]?.name || `Hoja ${activePageIdx + 1}`;
  const totalElements = scope === 'all' 
    ? (canvasDoc.pages?.reduce((acc, p) => acc + (p.elements?.length || 0), 0) || canvasDoc.elements.length)
    : (canvasDoc.pages?.[activePageIdx]?.elements?.length || canvasDoc.elements.length);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress({ percent: 5, statusText: 'Preparando exportación...' });

    try {
      const options: HtmlZipExportOptions = {
        scope,
        pageIndex: activePageIdx,
        filename: filename.trim() || 'reporte_web',
        responsiveMode,
        theme,
        includeDataJson,
        includeReadme,
        extractImages,
        title: title.trim() || 'Reporte Canvas',
        author: author.trim() || 'Canvas Designer',
        enableTableSorting
      };

      const blob = await exportCanvasToHtmlZip(canvasDoc, dbRecords, options, (p) => {
        setProgress(p);
      });

      downloadBlob(blob, `${filename.trim() || 'reporte_web'}.zip`);

      // Celebrate success
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {
        // Confetti optional
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error generating HTML ZIP:', err);
      alert('Ocurrió un error al generar el paquete HTML comprimido. Revisa la consola para más detalles.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`bg-white dark:bg-[#202225] border border-slate-200 dark:border-[#2f3136] text-slate-800 dark:text-[#e1e1e6] shadow-2xl flex flex-col transition-all duration-200 ${
          isFullscreen 
            ? 'w-full h-full rounded-none border-none' 
            : 'w-full max-w-4xl rounded-2xl max-h-[92vh] overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#2f3136] bg-slate-50 dark:bg-[#25282c] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Exportar Canvas a HTML (ZIP)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                  Modo Previsualización
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9ca3af]">
                Genera un sitio web interactivo empaquetado con estructura modular de archivos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ModalFullscreenToggle 
              isFullscreen={isFullscreen} 
              onToggle={() => setIsFullscreen(!isFullscreen)} 
              buttonSize="sm" 
            />
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#2f3136] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Options Column (Left 7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* 1. Alcance de Exportación */}
            <div className="bg-slate-50 dark:bg-[#1a1b1e] p-3.5 rounded-xl border border-slate-200 dark:border-[#2f3136] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Páginas a Exportar</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('current')}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    scope === 'current'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold shadow-xs'
                      : 'bg-white dark:bg-[#202225] border-slate-200 dark:border-[#2f3136] text-slate-600 dark:text-[#9ca3af] hover:border-slate-300 dark:hover:border-[#3f4248]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Página Actual</span>
                    {scope === 'current' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5 truncate">
                    {activePageName} (Índice {activePageIdx + 1})
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    scope === 'all'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold shadow-xs'
                      : 'bg-white dark:bg-[#202225] border-slate-200 dark:border-[#2f3136] text-slate-600 dark:text-[#9ca3af] hover:border-slate-300 dark:hover:border-[#3f4248]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Todas las Páginas</span>
                    {scope === 'all' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">
                    {totalPages} {totalPages === 1 ? 'página' : 'páginas con pestañas'}
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Modo Responsive y Visualización */}
            <div className="bg-slate-50 dark:bg-[#1a1b1e] p-3.5 rounded-xl border border-slate-200 dark:border-[#2f3136] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span>Comportamiento en Pantalla (Responsive)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fit-screen', label: 'Ajuste Ventana', desc: 'Auto-escala proporcional' },
                  { id: 'scrollable', label: 'Desplazable', desc: 'Lienzo centrado con scroll' },
                  { id: 'fixed', label: 'Fijo (Píxeles)', desc: 'Tamaño exacto en px' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setResponsiveMode(mode.id as any)}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                      responsiveMode === mode.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold'
                        : 'bg-white dark:bg-[#202225] border-slate-200 dark:border-[#2f3136] text-slate-600 dark:text-[#9ca3af] hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{mode.label}</span>
                      {responsiveMode === mode.id && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Tema Visual del HTML */}
            <div className="bg-slate-50 dark:bg-[#1a1b1e] p-3.5 rounded-xl border border-slate-200 dark:border-[#2f3136] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>Tema de Color del Sitio Exportado</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'toggle', label: 'Selector Interactivo', desc: 'Botón Claro/Oscuro' },
                  { id: 'light', label: 'Tema Claro', desc: 'Fondos blancos y limpios' },
                  { id: 'dark', label: 'Tema Oscuro', desc: 'Gris oscuro Discord' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                      theme === t.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold'
                        : 'bg-white dark:bg-[#202225] border-slate-200 dark:border-[#2f3136] text-slate-600 dark:text-[#9ca3af] hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{t.label}</span>
                      {theme === t.id && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Opciones de Contenido y Recursos */}
            <div className="bg-slate-50 dark:bg-[#1a1b1e] p-3.5 rounded-xl border border-slate-200 dark:border-[#2f3136] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Settings2 className="w-4 h-4 text-emerald-500" />
                <span>Estructura de Recursos y Funcionalidades</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 bg-white dark:bg-[#202225] rounded-lg border border-slate-200 dark:border-[#2f3136] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={extractImages}
                    onChange={(e) => setExtractImages(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-[#e1e1e6]">Extraer a /assets</span>
                    <p className="text-[10px] text-slate-400">Imágenes y QR como archivos PNG</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white dark:bg-[#202225] rounded-lg border border-slate-200 dark:border-[#2f3136] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDataJson}
                    onChange={(e) => setIncludeDataJson(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-[#e1e1e6]">Incluir /data/data.json</span>
                    <p className="text-[10px] text-slate-400">Metadatos y registros en JSON</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white dark:bg-[#202225] rounded-lg border border-slate-200 dark:border-[#2f3136] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeReadme}
                    onChange={(e) => setIncludeReadme(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-[#e1e1e6]">Incluir README.md</span>
                    <p className="text-[10px] text-slate-400">Guía de cómo abrir y usar</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white dark:bg-[#202225] rounded-lg border border-slate-200 dark:border-[#2f3136] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableTableSorting}
                    onChange={(e) => setEnableTableSorting(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-[#e1e1e6]">Ordenación en Tablas</span>
                    <p className="text-[10px] text-slate-400">Clic en encabezados para ordenar</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 5. Nombres de Archivo y Título */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#9ca3af] mb-1">
                  Nombre de archivo ZIP
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="reporte_web"
                    className="w-full px-3 py-1.5 text-xs rounded-l-lg border border-r-0 border-slate-300 dark:border-[#2f3136] bg-white dark:bg-[#1a1b1e] text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#2f3136] border border-slate-300 dark:border-[#2f3136] rounded-r-lg text-xs font-semibold text-slate-500">
                    .zip
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#9ca3af] mb-1">
                  Título del Reporte
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título para el navegador"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#2f3136] bg-white dark:bg-[#1a1b1e] text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Structure Visualizer Column (Right 5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 shadow-inner flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Estructura del Paquete ZIP
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    .zip (DEFLATE)
                  </span>
                </div>

                {/* File Tree View */}
                <div className="font-mono text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span>📦</span>
                    <span>{filename || 'reporte_web'}.zip</span>
                  </div>
                  <div className="pl-4 space-y-1 border-l border-slate-800 ml-2">
                    <div className="flex items-center gap-1.5 text-sky-300">
                      <span>📄</span>
                      <span>index.html</span>
                      <span className="text-[10px] text-slate-500">
                        {scope === 'all' ? '(Página 1)' : '(Lienzo actual)'}
                      </span>
                    </div>

                    {scope === 'all' && totalPages > 1 && (
                      <>
                        <div className="flex items-center gap-1.5 text-sky-300">
                          <span>📄</span>
                          <span>pagina_2.html</span>
                        </div>
                        {totalPages > 2 && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <span>...</span>
                            <span>+{totalPages - 2} páginas adicionales</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                      <span>📁</span>
                      <span>css/</span>
                    </div>
                    <div className="pl-4 border-l border-slate-800 ml-2">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span>📄</span>
                        <span>styles.css</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                      <span>📁</span>
                      <span>js/</span>
                    </div>
                    <div className="pl-4 border-l border-slate-800 ml-2">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span>📄</span>
                        <span>app.js</span>
                      </div>
                    </div>

                    {extractImages && (
                      <>
                        <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                          <span>📁</span>
                          <span>assets/</span>
                        </div>
                        <div className="pl-4 border-l border-slate-800 ml-2">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <span>🖼️</span>
                            <span>imágenes y QR extraídos</span>
                          </div>
                        </div>
                      </>
                    )}

                    {includeDataJson && (
                      <>
                        <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                          <span>📁</span>
                          <span>data/</span>
                        </div>
                        <div className="pl-4 border-l border-slate-800 ml-2">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span>📄</span>
                            <span>data.json</span>
                          </div>
                        </div>
                      </>
                    )}

                    {includeReadme && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>📄</span>
                        <span>README.md</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-800/60 p-2 rounded-lg">
                  <div className="text-slate-400">Resolución lienzo</div>
                  <div className="text-white font-bold font-mono">
                    {canvasDoc.width} × {canvasDoc.height} px
                  </div>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-lg">
                  <div className="text-slate-400">Elementos a exportar</div>
                  <div className="text-white font-bold font-mono">
                    {totalElements} controles
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Info Box */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
              <Info className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <p className="leading-relaxed">
                El ZIP producido es <strong>completamente autónomo</strong>. Puedes abrir <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1 py-0.5 rounded font-mono">index.html</code> directamente sin necesidad de montar un servidor web.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#2f3136] bg-slate-50 dark:bg-[#25282c] flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 dark:text-[#9ca3af] flex items-center gap-2">
            {isExporting ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progress.statusText || 'Generando paquete...'}</span>
              </div>
            ) : (
              <span>Listo para generar archivo ZIP comprimido</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#2f3136] transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Empaquetando ({progress.percent}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Paquete ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
