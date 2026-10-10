import React, { useState, useMemo, useEffect } from 'react';
import { CanvasDocument } from '../types';
import { DASHBOARD_TEMPLATES, DashboardTemplate } from '../data/dashboardTemplates';
import { 
  LayoutTemplate, 
  X, 
  Search, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Database, 
  Eye, 
  Layers, 
  Palette, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  Briefcase, 
  SlidersHorizontal,
  CheckCircle2,
  Table,
  ArrowRight
} from 'lucide-react';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: CanvasDocument;
  activeDbName: string;
  databasesList: string[];
  onLoadTemplate: (templateDoc: CanvasDocument, targetDb?: string) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  activeDbName,
  databasesList,
  onLoadTemplate
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewingTemplate, setPreviewingTemplate] = useState<DashboardTemplate | null>(null);
  const [templateToConfirm, setTemplateToConfirm] = useState<DashboardTemplate | null>(null);
  const [switchDbIfAvailable, setSwitchDbIfAvailable] = useState<boolean>(true);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setPreviewingTemplate(null);
      setTemplateToConfirm(null);
      setSwitchDbIfAvailable(true);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (templateToConfirm) {
          setTemplateToConfirm(null);
        } else if (previewingTemplate) {
          setPreviewingTemplate(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, templateToConfirm, previewingTemplate, onClose]);

  // Categories list
  const categories = useMemo(() => {
    return ['Todas', 'Ventas', 'Finanzas', 'Recursos Humanos', 'Operaciones', 'Clientes', 'Minimalista'];
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return DASHBOARD_TEMPLATES.filter(tpl => {
      const matchesCategory = selectedCategory === 'Todas' || tpl.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some(t => t.toLowerCase().includes(q)) ||
        tpl.targetDatabase.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const currentElementsCount = currentDocument.elements?.length || 0;
  const hasExistingElements = currentElementsCount > 0;

  // Execute loading of the template
  const handleExecuteLoad = (template: DashboardTemplate) => {
    // Determine target database: prefer template's database if user chose to switch and it exists
    let chosenDb: string | undefined = undefined;
    if (switchDbIfAvailable && template.targetDatabase && databasesList.includes(template.targetDatabase)) {
      chosenDb = template.targetDatabase;
    }

    // Clone the template document with fresh timestamp and unique ID
    const newDoc: CanvasDocument = {
      ...template.document,
      id: `doc_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetDatabase: chosenDb || activeDbName || template.targetDatabase
    };

    onLoadTemplate(newDoc, chosenDb);
    onClose();
  };

  // Initial trigger for load button
  const handleLoadClick = (template: DashboardTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasExistingElements) {
      setTemplateToConfirm(template);
    } else {
      handleExecuteLoad(template);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in transition-all duration-200 ${
      isFullscreen ? 'p-0' : 'p-4'
    }`}>
      <div className={`bg-[#202225] border border-[#2f3136] shadow-2xl overflow-hidden flex flex-col text-[#e1e1e6] transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none max-h-none' : 'w-full max-w-5xl rounded-xl max-h-[90vh]'
      }`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#38bdf8]/20 to-[#5865f2]/20 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8] shadow-sm">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Galería de Plantillas de Dashboard
                </h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#5865f2]/20 text-[#818cf8] border border-[#5865f2]/30">
                  Pre-construidas
                </span>
              </div>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                Carga un diseño prediseñado listo para usar en tu lienzo reemplazando la disposición actual
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
              className="text-[#9ca3af] hover:text-white p-2 rounded-lg hover:bg-[#25282c] transition cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar: Category tabs + Search */}
        <div className="px-6 py-3 border-b border-[#2f3136] bg-[#25282c] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            {categories.map(cat => {
              const count = cat === 'Todas' 
                ? DASHBOARD_TEMPLATES.length 
                : DASHBOARD_TEMPLATES.filter(t => t.category === cat).length;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#5865f2] text-white shadow-sm font-semibold'
                      : 'bg-[#1a1b1e] text-[#9ca3af] hover:text-[#e1e1e6] hover:bg-[#2f3136]'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#25282c] text-[#6b7280]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plantilla o métricas..."
              className="w-full pl-8 pr-8 py-1.5 bg-[#1a1b1e] border border-[#373a40] rounded-lg text-xs text-white placeholder-[#6b7280] focus:outline-hidden focus:border-[#5865f2]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning banner if current canvas has elements */}
          {hasExistingElements && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  El lienzo actual contiene <strong>{currentElementsCount}</strong> {currentElementsCount === 1 ? 'elemento' : 'elementos'}. Al cargar una plantilla, <strong>el lienzo se reemplazará</strong> por completo.
                </span>
              </div>
              <span className="text-[11px] text-amber-400/80 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Lienzo Activo
              </span>
            </div>
          )}

          {/* Grid of Templates */}
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center text-[#9ca3af] space-y-3">
              <LayoutTemplate className="w-12 h-12 mx-auto text-[#4f545c] stroke-[1.5]" />
              <p className="text-sm font-semibold text-white">No se encontraron plantillas</p>
              <p className="text-xs text-[#6b7280]">
                Intenta ajustar el término de búsqueda o selecciona otra categoría de la barra superior.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map(template => {
                const isRecommendedDbPresent = databasesList.includes(template.targetDatabase);
                const elementsCount = template.document.elements?.length || 0;
                const pagesCount = template.document.pages?.length || 1;

                return (
                  <div
                    key={template.id}
                    className="group bg-[#1a1b1e] border border-[#2f3136] hover:border-[#5865f2]/60 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition flex flex-col justify-between"
                  >
                    {/* Top: Mockup Preview Graphic */}
                    <div 
                      onClick={() => setPreviewingTemplate(template)}
                      className="h-40 bg-[#121316] relative p-3.5 border-b border-[#2f3136] cursor-pointer overflow-hidden flex flex-col justify-between group-hover:bg-[#16171b] transition"
                    >
                      {/* Stylized Miniature Dashboard Canvas Wireframe */}
                      <div className="w-full h-full rounded-md border border-[#2f3136] bg-[#1a1b1e] p-2 flex flex-col gap-1.5 select-none relative overflow-hidden shadow-inner">
                        {/* Mini Header Bar */}
                        <div className="h-4 rounded bg-[#25282c] flex items-center justify-between px-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#5865f2]" />
                          <div className="flex gap-1">
                            <div className="w-4 h-1.5 rounded-full bg-emerald-500" />
                            <div className="w-6 h-1.5 rounded-full bg-[#4f545c]" />
                          </div>
                        </div>

                        {/* Mini 3 or 4 KPI Row */}
                        <div className="grid grid-cols-4 gap-1">
                          <div className="h-6 rounded bg-[#202225] border border-[#2f3136] p-1 flex flex-col justify-center">
                            <div className="w-8 h-1 bg-[#9ca3af] rounded-full" />
                            <div className="w-10 h-1.5 bg-[#38bdf8] rounded-full mt-1" />
                          </div>
                          <div className="h-6 rounded bg-[#202225] border border-[#2f3136] p-1 flex flex-col justify-center">
                            <div className="w-6 h-1 bg-[#9ca3af] rounded-full" />
                            <div className="w-8 h-1.5 bg-emerald-400 rounded-full mt-1" />
                          </div>
                          <div className="h-6 rounded bg-[#202225] border border-[#2f3136] p-1 flex flex-col justify-center">
                            <div className="w-7 h-1 bg-[#9ca3af] rounded-full" />
                            <div className="w-9 h-1.5 bg-amber-400 rounded-full mt-1" />
                          </div>
                          <div className="h-6 rounded bg-[#202225] border border-[#2f3136] p-1 flex flex-col justify-center">
                            <div className="w-8 h-1 bg-[#9ca3af] rounded-full" />
                            <div className="w-7 h-1.5 bg-purple-400 rounded-full mt-1" />
                          </div>
                        </div>

                        {/* Mini Chart + Card Split */}
                        <div className="grid grid-cols-2 gap-1 flex-1">
                          {/* Mini Bar Chart */}
                          <div className="rounded bg-[#202225] border border-[#2f3136] p-1.5 flex items-end justify-between gap-1">
                            <div className="w-1/5 h-[40%] bg-[#5865f2]/70 rounded-t" />
                            <div className="w-1/5 h-[70%] bg-[#38bdf8]/70 rounded-t" />
                            <div className="w-1/5 h-[55%] bg-emerald-500/70 rounded-t" />
                            <div className="w-1/5 h-[90%] bg-purple-500/70 rounded-t" />
                          </div>
                          {/* Mini Table / Lines */}
                          <div className="rounded bg-[#202225] border border-[#2f3136] p-1.5 flex flex-col justify-around">
                            <div className="w-full h-1.5 bg-[#2f3136] rounded" />
                            <div className="w-3/4 h-1.5 bg-[#2f3136] rounded" />
                            <div className="w-5/6 h-1.5 bg-[#2f3136] rounded" />
                          </div>
                        </div>
                      </div>

                      {/* Overlay Hover Pill */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-[#202225]/90 border border-[#2f3136] text-white text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <Eye className="w-3 h-3 text-[#38bdf8]" />
                          <span>Ver Estructura</span>
                        </span>
                      </div>

                      {/* Category Badge & Elements Count */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: template.color }}
                        >
                          {template.category}
                        </span>
                        {template.themeId && template.themeId !== 'light' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-black/60 text-[#cbd5e1] border border-white/10 font-mono">
                            {template.themeId}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/70 text-[#9ca3af] border border-[#2f3136] font-mono">
                          {elementsCount} elms
                        </span>
                      </div>
                    </div>

                    {/* Middle: Content Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#5865f2] transition line-clamp-1">
                          {template.name}
                        </h3>
                        <p className="text-xs text-[#9ca3af] mt-1 line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>
                      </div>

                      {/* Highlights Pill Tags */}
                      <div className="flex flex-wrap gap-1">
                        {template.highlights.map((hl, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#25282c] border border-[#2f3136] text-[#cbd5e1]"
                          >
                            {hl}
                          </span>
                        ))}
                      </div>

                      {/* Database compatibility info */}
                      <div className="pt-2 border-t border-[#2f3136] flex items-center justify-between text-[11px] text-[#9ca3af]">
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={`Base de datos recomendada: ${template.targetDatabase}`}>
                          <Database className="w-3 h-3 text-[#5865f2] flex-shrink-0" />
                          <span className="truncate">{template.targetDatabase}</span>
                        </div>
                        {isRecommendedDbPresent ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>BD Lista</span>
                          </span>
                        ) : (
                          <span className="text-[#6b7280] text-[10px]">
                            Fallback auto
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-3 bg-[#16171a] border-t border-[#2f3136] flex items-center gap-2">
                      <button
                        onClick={() => setPreviewingTemplate(template)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-[#373a40]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#9ca3af]" />
                        <span>Detalles</span>
                      </button>

                      <button
                        onClick={(e) => handleLoadClick(template, e)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>Cargar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between text-xs text-[#9ca3af] flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-[#5865f2]" />
            <span>{DASHBOARD_TEMPLATES.length} plantillas prediseñadas disponibles</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-white rounded-lg text-xs font-semibold transition cursor-pointer border border-[#373a40]"
          >
            Cerrar Galería
          </button>
        </div>
      </div>

      {/* Confirmation Modal / Dialog: Replace Existing Canvas */}
      {templateToConfirm && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#202225] border border-[#2f3136] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-[#e1e1e6] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-[#1a1b1e] border-b border-[#2f3136] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">¿Reemplazar diseño actual?</h3>
                  <p className="text-[11px] text-[#9ca3af]">Confirmación de carga de plantilla</p>
                </div>
              </div>
              <button
                onClick={() => setTemplateToConfirm(null)}
                className="text-[#9ca3af] hover:text-white p-1 rounded hover:bg-[#25282c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#cbd5e1] leading-relaxed">
                Estás a punto de cargar la plantilla <strong className="text-white">"{templateToConfirm.name}"</strong>. Esto reemplazará los <strong className="text-amber-400">{currentElementsCount} elementos</strong> actuales de tu lienzo.
              </p>

              {/* Comparison Box */}
              <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#9ca3af]">Lienzo Actual:</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">{currentDocument.name || 'Sin título'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#9ca3af]">Nueva Plantilla:</span>
                  <span className="font-bold text-[#5865f2] truncate max-w-[200px]">{templateToConfirm.name}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#9ca3af]">Nuevos Controles:</span>
                  <span className="font-mono text-white">{templateToConfirm.document.elements?.length || 0} elementos</span>
                </div>
              </div>

              {/* Checkbox: Switch to recommended database if available */}
              {templateToConfirm.targetDatabase && databasesList.includes(templateToConfirm.targetDatabase) && templateToConfirm.targetDatabase !== activeDbName && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#25282c] border border-[#373a40] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={switchDbIfAvailable}
                    onChange={(e) => setSwitchDbIfAvailable(e.target.checked)}
                    className="mt-0.5 rounded text-[#5865f2] focus:ring-[#5865f2] bg-[#1a1b1e] border-[#373a40]"
                  />
                  <div className="text-[11px]">
                    <span className="font-semibold text-white">Cambiar a la base de datos recomendada</span>
                    <p className="text-[#9ca3af] mt-0.5">
                      Vincular a <span className="text-[#5865f2] font-semibold">{templateToConfirm.targetDatabase}</span> para visualizar datos reales al instante.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-[#16171a] border-t border-[#2f3136] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setTemplateToConfirm(null)}
                className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] rounded-lg text-xs font-semibold transition cursor-pointer border border-[#373a40]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteLoad(templateToConfirm)}
                className="px-4 py-1.5 bg-gradient-to-r from-[#5865f2] to-[#4752c4] hover:from-[#4752c4] hover:to-[#3c45a5] text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Reemplazar y Cargar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details / Structure Preview Modal */}
      {previewingTemplate && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#202225] border border-[#2f3136] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-[#e1e1e6] flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 bg-[#1a1b1e] border-b border-[#2f3136] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                  style={{ backgroundColor: previewingTemplate.color }}
                >
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{previewingTemplate.name}</span>
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold"
                      style={{ backgroundColor: previewingTemplate.color }}
                    >
                      {previewingTemplate.category}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#9ca3af]">Detalle de controles y arquitectura del dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingTemplate(null)}
                className="text-[#9ca3af] hover:text-white p-1 rounded hover:bg-[#25282c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <p className="text-[#cbd5e1] leading-relaxed">
                {previewingTemplate.description}
              </p>

              {/* Features and Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg">
                  <div className="text-[10px] text-[#9ca3af] uppercase font-semibold">Total Elementos</div>
                  <div className="text-base font-bold text-white mt-1">
                    {previewingTemplate.document.elements?.length || 0}
                  </div>
                </div>
                <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg">
                  <div className="text-[10px] text-[#9ca3af] uppercase font-semibold">Base de Datos</div>
                  <div className="text-xs font-bold text-[#5865f2] mt-1 truncate">
                    {previewingTemplate.targetDatabase}
                  </div>
                </div>
                <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg">
                  <div className="text-[10px] text-[#9ca3af] uppercase font-semibold">Tema Visual</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1 capitalize">
                    {previewingTemplate.themeId || 'light'}
                  </div>
                </div>
              </div>

              {/* Included Elements breakdown */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>Componentes Incluidos en la Plantilla</span>
                </h4>
                <div className="divide-y divide-[#2f3136] border border-[#2f3136] rounded-lg bg-[#1a1b1e] overflow-hidden max-h-48 overflow-y-auto">
                  {previewingTemplate.document.elements?.map((el, i) => (
                    <div key={el.id || i} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#25282c]/60">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#25282c] border border-[#373a40] flex items-center justify-center text-[10px] font-mono text-[#9ca3af]">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-white">{el.name || el.type}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2f3136] text-[#9ca3af] uppercase">
                          {el.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9ca3af]">
                        {el.binding?.tableName ? (
                          <span className="font-mono text-[#5865f2]">
                            {el.binding.tableName}.{el.binding.field || '*'}
                          </span>
                        ) : (
                          <span>Diseño visual</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#16171a] border-t border-[#2f3136] flex items-center justify-between">
              <button
                onClick={() => setPreviewingTemplate(null)}
                className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] rounded-lg text-xs font-semibold transition cursor-pointer border border-[#373a40]"
              >
                Volver a la Galería
              </button>

              <button
                onClick={() => {
                  const t = previewingTemplate;
                  setPreviewingTemplate(null);
                  handleLoadClick(t);
                }}
                className="px-4 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar Esta Plantilla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
