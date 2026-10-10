import React, { useState, useEffect } from 'react';
import { CanvasDocument } from '../types';
import { dexieManager } from '../services/dexieManager';
import { DEMO_CANVAS_TEMPLATE } from '../services/sampleData';
import { generateCanvasThumbnail } from '../utils/thumbnailGenerator';
import { CanvasThumbnail } from './CanvasThumbnail';
import { 
  FolderOpen, 
  Save, 
  Trash2, 
  Clock, 
  Layout, 
  X, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  Grid,
  List,
  Layers,
  Maximize2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';

interface SavedDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDbName: string;
  currentDocument: CanvasDocument;
  onLoadDesign: (design: CanvasDocument) => void;
}

export const SavedDesignsModal: React.FC<SavedDesignsModalProps> = ({
  isOpen,
  onClose,
  activeDbName,
  currentDocument,
  onLoadDesign
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [designs, setDesigns] = useState<CanvasDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState(currentDocument.name);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [designToDelete, setDesignToDelete] = useState<string | null>(null);
  const [previewingDesign, setPreviewingDesign] = useState<CanvasDocument | null>(null);

  useEffect(() => {
    if (isOpen && activeDbName) {
      loadSavedDesigns();
      setSaveName(currentDocument.name);
      setSaveSuccess(false);
    }
  }, [isOpen, activeDbName, currentDocument.name]);

  const loadSavedDesigns = async () => {
    setLoading(true);
    try {
      const list = await dexieManager.getCanvasDesigns(activeDbName);
      setDesigns(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrent = async () => {
    setIsSavingCurrent(true);
    try {
      // Generate preview thumbnail of current canvas state
      const thumbnailDataUrl = await generateCanvasThumbnail(currentDocument, 320);

      const toSave: CanvasDocument = {
        ...currentDocument,
        name: saveName.trim() || 'Diseño Canvas',
        targetDatabase: activeDbName,
        thumbnail: thumbnailDataUrl || undefined,
        updatedAt: new Date().toISOString()
      };
      await dexieManager.saveCanvasDesign(activeDbName, toSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await loadSavedDesigns();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingCurrent(false);
    }
  };

  const handleRegenerateThumbnail = async (design: CanvasDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newThumb = await generateCanvasThumbnail(design, 320);
      const updated: CanvasDocument = {
        ...design,
        thumbnail: newThumb || undefined,
        updatedAt: new Date().toISOString()
      };
      await dexieManager.saveCanvasDesign(activeDbName, updated);
      await loadSavedDesigns();
    } catch (err) {
      console.error('Error updating thumbnail:', err);
    }
  };

  const handleDeleteDesign = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDesignToDelete(id);
  };

  const handleConfirmDeleteDesign = async () => {
    if (!designToDelete) return;
    const targetId = designToDelete;
    try {
      await dexieManager.deleteCanvasDesign(activeDbName, targetId);
      setDesignToDelete(null);
      await loadSavedDesigns();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadDemoTemplate = () => {
    onLoadDesign(DEMO_CANVAS_TEMPLATE);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center transition-all duration-200 ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div className={`bg-[#202225] shadow-2xl flex flex-col overflow-hidden border border-[#2f3136] text-[#e1e1e6] transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-4xl max-h-[90vh] rounded-xl'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-[#2f3136] bg-[#202225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#5865f2] text-white shadow-md">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Diseños Guardados</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1b1e] border border-[#2f3136] text-[#9ca3af]">
                  IndexedDB
                </span>
              </h3>
              <p className="text-[11px] text-[#9ca3af] mt-0.5">
                Base de datos activa: <span className="font-semibold text-[#5865f2]">{activeDbName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-[#1a1b1e] p-0.5 rounded-lg border border-[#2f3136]">
              <button
                onClick={() => setViewMode('grid')}
                title="Vista Cuadrícula con Miniaturas"
                className={`p-1.5 rounded transition ${
                  viewMode === 'grid' 
                    ? 'bg-[#5865f2] text-white' 
                    : 'text-[#9ca3af] hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Vista Lista Compacta"
                className={`p-1.5 rounded transition ${
                  viewMode === 'list' 
                    ? 'bg-[#5865f2] text-white' 
                    : 'text-[#9ca3af] hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <ModalFullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={() => setIsFullscreen(prev => !prev)}
            />

            <button 
              onClick={onClose} 
              className="p-1.5 text-[#9ca3af] hover:text-white rounded hover:bg-[#2f3136] transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Canvas Live Preview & Save Bar */}
        <div className="p-3.5 bg-[#1a1b1e] border-b border-[#2f3136]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Mini Visual Preview of Current Canvas */}
            <div className="flex items-center gap-3">
              <div className="w-20 sm:w-24 flex-shrink-0">
                <CanvasThumbnail 
                  document={currentDocument} 
                  showBadge={true}
                  className="shadow-md ring-1 ring-[#5865f2]/40 rounded hover:scale-105 transition-transform" 
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#5865f2] tracking-wider">Lienzo Actual</span>
                  <span className="text-[10px] text-[#9ca3af] font-mono">
                    ({currentDocument.width}×{currentDocument.height} px)
                  </span>
                </div>
                <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                  {currentDocument.name}
                </div>
                <div className="text-[10px] text-[#9ca3af] flex items-center gap-1.5 mt-0.5">
                  <Layers className="w-3 h-3 text-[#5865f2]" />
                  <span>{currentDocument.elements.length} elementos configurados</span>
                </div>
              </div>
            </div>

            {/* Input & Save Button */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nombre para guardar este diseño..."
                className="flex-1 px-3 py-1.5 bg-[#202225] border border-[#2f3136] rounded-lg text-xs text-[#e1e1e6] focus:outline-none focus:border-[#5865f2] font-medium"
              />
              <button
                disabled={isSavingCurrent}
                onClick={handleSaveCurrent}
                className="px-3.5 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer flex-shrink-0"
              >
                {isSavingCurrent ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-200">¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar con Miniatura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Designs Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#9ca3af] gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#5865f2]" />
              <span className="text-xs">Cargando diseños guardados...</span>
            </div>
          ) : designs.length > 0 ? (
            viewMode === 'grid' ? (
              /* GRID VIEW WITH LARGE THUMBNAILS */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {designs.map((d, dIdx) => (
                  <div
                    key={`saved_design_grid_${d.id}_${dIdx}`}
                    onClick={() => {
                      onLoadDesign(d);
                      onClose();
                    }}
                    className="bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] hover:border-[#5865f2]/60 rounded-xl overflow-hidden shadow-md flex flex-col transition group cursor-pointer hover:-translate-y-0.5 duration-150"
                  >
                    {/* Thumbnail Preview Area */}
                    <div className="relative bg-[#141517] p-2 border-b border-[#2f3136] overflow-hidden">
                      <CanvasThumbnail 
                        document={d} 
                        showBadge={true} 
                        className="w-full shadow-inner transition-transform group-hover:scale-[1.02]" 
                      />
                      
                      {/* Hover Overlay Actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 pointer-events-none">
                        <span className="px-2.5 py-1 bg-[#5865f2] text-white text-[11px] font-bold rounded shadow-lg pointer-events-auto">
                          Cargar Diseño
                        </span>
                      </div>

                      {/* Top Action buttons */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleRegenerateThumbnail(d, e)}
                          title="Regenerar miniatura visual"
                          className="p-1 bg-black/70 hover:bg-[#5865f2] text-white rounded text-[10px] backdrop-blur-xs transition pointer-events-auto"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDesign(d.id, e)}
                          title="Eliminar de IndexedDB"
                          className="p-1 bg-black/70 hover:bg-rose-600 text-white rounded text-[10px] backdrop-blur-xs transition pointer-events-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Card Meta Footer */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white text-xs truncate group-hover:text-[#5865f2] transition-colors">
                          {d.name}
                        </h4>
                        <div className="text-[10px] text-[#9ca3af] flex items-center justify-between mt-1">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#5865f2]" />
                            {d.elements.length} elementos
                          </span>
                          <span className="font-mono text-[#6b7280]">
                            {d.width}×{d.height}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#2f3136]/60 flex items-center justify-between text-[10px] text-[#6b7280]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}
                        </span>
                        <span className="font-semibold text-[#9ca3af] group-hover:text-white transition">
                          Abrir ➔
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW WITH COMPACT THUMBNAILS */
              <div className="space-y-2">
                {designs.map((d, dIdx) => (
                  <div
                    key={`saved_design_list_${d.id}_${dIdx}`}
                    onClick={() => {
                      onLoadDesign(d);
                      onClose();
                    }}
                    className="p-2.5 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] hover:border-[#5865f2]/60 rounded-lg flex items-center justify-between gap-3 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Compact Thumbnail */}
                      <div className="w-16 h-12 flex-shrink-0 rounded overflow-hidden border border-[#373a40] bg-[#141517]">
                        <CanvasThumbnail document={d} showBadge={false} className="w-full h-full object-cover" />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate group-hover:text-[#5865f2] transition-colors">
                          {d.name}
                        </div>
                        <div className="text-[10px] text-[#9ca3af] flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#5865f2]" />
                            {d.elements.length} elementos
                          </span>
                          <span>•</span>
                          <span>{d.width}×{d.height} px</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadDesign(d);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[#5865f2]/15 hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#5865f2]/40 rounded-md font-semibold text-xs transition"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={(e) => handleDeleteDesign(d.id, e)}
                        className="p-1.5 text-[#9ca3af] hover:text-rose-400 rounded hover:bg-rose-500/20 transition"
                        title="Eliminar de IndexedDB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="p-8 text-center text-[#9ca3af] space-y-3 bg-[#1a1b1e] rounded-xl border border-dashed border-[#2f3136]">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#25282c] flex items-center justify-center text-[#5865f2]">
                <Layout className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">No hay diseños guardados en esta base de datos</div>
                <p className="text-[11px] text-[#9ca3af] mt-1 max-w-sm mx-auto">
                  Guarda el lienzo actual con el formulario superior o carga la plantilla demo de ventas prediseñada.
                </p>
              </div>
              <button
                onClick={handleLoadDemoTemplate}
                className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar Plantilla Demo de Ventas</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#2f3136] bg-[#202225] flex items-center justify-between text-xs text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{designs.length}</span>
            <span>diseños guardados en Dexie</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#1a1b1e] hover:bg-[#25282c] border border-[#2f3136] rounded-lg text-[#e1e1e6] hover:text-white transition cursor-pointer font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Delete Design */}
      {designToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#202225] border border-rose-500/40 rounded-xl shadow-2xl max-w-sm w-full p-4 text-[#e1e1e6] space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Eliminar diseño guardado</span>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              ¿Estás seguro de que deseas eliminar este diseño de la base de datos? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2f3136]">
              <button
                type="button"
                onClick={() => setDesignToDelete(null)}
                className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDesign}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Diseño</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

