import React, { useState, useEffect } from 'react';
import { CanvasDocument, DatabaseInfo } from '../types';
import { dexieManager } from '../services/dexieManager';
import { exportCanvasDocumentJSON } from '../utils/imageExporter';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';
import { 
  RotateCcw, 
  Save, 
  Trash2, 
  X, 
  AlertTriangle, 
  Database, 
  Sparkles, 
  Download, 
  CheckCircle2,
  FileX,
  LayoutTemplate
} from 'lucide-react';

interface ResetCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: CanvasDocument;
  activeDbName: string;
  databasesList: string[];
  onConfirmReset: () => void;
  onOpenTemplateGallery?: () => void;
}

export const ResetCanvasModal: React.FC<ResetCanvasModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  activeDbName,
  databasesList,
  onConfirmReset,
  onOpenTemplateGallery
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveName, setSaveName] = useState(currentDocument.name);
  const [targetDb, setTargetDb] = useState(activeDbName || databasesList[0] || '');
  const [downloadJsonBackup, setDownloadJsonBackup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSaveName(currentDocument.name || 'Mi Diseño Guardado');
      setTargetDb(activeDbName || databasesList[0] || '');
      setDownloadJsonBackup(false);
      setSaveSuccess(false);
      setIsSaving(false);
    }
  }, [isOpen, currentDocument.name, activeDbName, databasesList]);

  if (!isOpen) return null;

  const hasElements = currentDocument.elements && currentDocument.elements.length > 0;

  // Handle Save & Reset
  const handleSaveAndReset = async () => {
    setIsSaving(true);
    try {
      // 1. Download JSON backup if checked or if no database exists
      if (downloadJsonBackup || !targetDb) {
        exportCanvasDocumentJSON({
          ...currentDocument,
          name: saveName.trim() || 'Diseño_Canvas'
        });
      }

      // 2. Save into Dexie DB if database selected
      if (targetDb) {
        const toSave: CanvasDocument = {
          ...currentDocument,
          name: saveName.trim() || 'Diseño Canvas',
          targetDatabase: targetDb,
          updatedAt: new Date().toISOString()
        };
        await dexieManager.saveCanvasDesign(targetDb, toSave);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onConfirmReset();
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error guardando diseño antes de resetear:', err);
      alert('Error al guardar el diseño. Puedes descargar el JSON como respaldo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Discard & Reset directly
  const handleDirectReset = () => {
    onConfirmReset();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs transition-all duration-200 animate-fade-in ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div className={`bg-[#202225] border border-[#2f3136] shadow-2xl flex flex-col text-[#e1e1e6] overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-lg rounded-xl'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3136] bg-[#1a1b1e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Reiniciar Lienzo</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2f3136] text-[#9ca3af] font-mono">Clean Start</span>
              </h2>
              <p className="text-[11px] text-[#9ca3af]">
                Comenzar con un lienzo en blanco sin base de datos ni diseño predeterminado
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
              className="text-[#9ca3af] hover:text-white p-1.5 rounded-lg hover:bg-[#25282c] transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          {/* Current Canvas Status Pill */}
          <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
              Estado del Lienzo Actual
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white truncate max-w-[240px]">
                {currentDocument.name || 'Sin título'}
              </span>
              <span className="px-2 py-0.5 bg-[#25282c] border border-[#373a40] text-[#9ca3af] rounded font-mono text-[11px]">
                {currentDocument.elements.length} {currentDocument.elements.length === 1 ? 'elemento' : 'elementos'}
              </span>
            </div>
            <div className="text-[11px] text-[#9ca3af] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#5865f2]" />
              <span>Base de datos activa:</span>
              <span className="font-semibold text-[#e1e1e6]">
                {activeDbName || 'Ninguna seleccionada'}
              </span>
            </div>
          </div>

          {/* Save Option Section */}
          {hasElements ? (
            <div className="p-3.5 bg-[#25282c] border border-[#373a40] rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Save className="w-4 h-4 text-[#5865f2]" />
                <span>¿Deseas guardar una copia antes de reiniciar?</span>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                Puedes guardar el diseño en la base de datos de IndexedDB o exportar un respaldo JSON para no perder los cambios.
              </p>

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-[#9ca3af] uppercase mb-1">
                    Nombre del diseño a guardar
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nombre del diseño"
                    className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs text-white focus:outline-none focus:border-[#5865f2]"
                  />
                </div>

                {databasesList.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#9ca3af] uppercase mb-1">
                      Guardar en Base de Datos
                    </label>
                    <select
                      value={targetDb}
                      onChange={(e) => setTargetDb(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#1a1b1e] border border-[#2f3136] rounded-md text-xs text-white focus:outline-none focus:border-[#5865f2]"
                    >
                      {Array.from(new Set(databasesList)).map((name, idx) => (
                        <option key={`reset_db_${name}_${idx}`} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 text-[11px] text-[#e1e1e6] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={downloadJsonBackup}
                    onChange={(e) => setDownloadJsonBackup(e.target.checked)}
                    className="rounded bg-[#1a1b1e] border-[#2f3136] text-[#5865f2] focus:ring-0"
                  />
                  <span>Descargar también copia de seguridad (.json) al equipo</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveAndReset}
                  disabled={isSaving}
                  className="w-full py-2 px-4 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-300" />
                      <span>¡Guardado! Reiniciando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Guardando diseño...' : 'Guardar Diseño y Reiniciar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-[#9ca3af] text-[11px] flex items-center gap-2">
              <FileX className="w-4 h-4 text-[#9ca3af]" />
              <span>El lienzo actual ya está vacío.</span>
            </div>
          )}

          {/* Clean Start Direct Option */}
          <div className="pt-1">
            <div className="text-[11px] text-[#9ca3af] mb-2 font-medium">
              O comienza directamente desde cero sin guardar:
            </div>
            <button
              onClick={handleDirectReset}
              className="w-full py-2 px-4 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reiniciar sin guardar (Clean Start)</span>
            </button>
          </div>

          {/* Template Gallery Alternative Option */}
          {onOpenTemplateGallery && (
            <div className="pt-2 border-t border-[#2f3136]">
              <div className="text-[11px] text-[#9ca3af] mb-2 font-medium">
                ¿Prefieres comenzar desde una plantilla prediseñada?
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenTemplateGallery();
                }}
                className="w-full py-2 px-4 bg-[#25282c] hover:bg-[#2f3136] border border-[#38bdf8]/40 text-[#38bdf8] font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <LayoutTemplate className="w-4 h-4" />
                <span>Explorar Galería de Plantillas</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#2f3136] bg-[#1a1b1e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-[#9ca3af] hover:text-white hover:bg-[#25282c] rounded-md transition border border-transparent hover:border-[#2f3136]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
