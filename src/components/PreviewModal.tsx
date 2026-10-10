import React, { useState } from 'react';
import { CanvasDocument, DrillStep } from '../types';
import { CanvasElementView } from './CanvasElementView';
import { exportCanvasToImage } from '../utils/imageExporter';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';
import { 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut,
  FileArchive
} from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CanvasDocument;
  dbRecords: Record<string, Record<string, any>[]>;
  onOpenExportModal: () => void;
  onOpenHtmlExport?: () => void;
  onRecordInserted?: (tableName: string, newRecord: Record<string, any>) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  document: canvasDoc,
  dbRecords,
  onOpenExportModal,
  onOpenHtmlExport,
  onRecordInserted
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [activeDrillPaths, setActiveDrillPaths] = useState<Record<string, DrillStep[]>>({});

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: selectedValues
    }));
  };

  const handleDrillPathChange = (drillId: string, path: DrillStep[]) => {
    setActiveDrillPaths(prev => ({
      ...prev,
      [drillId]: path
    }));
  };

  if (!isOpen) return null;

  const allFilterElements = canvasDoc.elements.filter(el => el.type === 'filter');
  const allDrillElements = canvasDoc.elements.filter(el => el.type === 'drilldown');

  // Determine max records among tables in active DB
  const tableKeys = Object.keys(dbRecords);
  const maxRecordsCount = Math.max(...tableKeys.map(k => dbRecords[k]?.length || 0), 1);

  const handlePrint = () => {
    const previewEl = document.getElementById('rendered-preview-canvas');
    if (!previewEl) return;
    window.print();
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ${
      isFullscreen ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      <div className={`bg-[#202225] border border-[#2f3136] shadow-2xl flex flex-col text-white overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-6xl h-[92vh] rounded-xl'
      }`}>
        {/* Top Bar */}
        <div className="h-14 bg-[#202225] border-b border-[#2f3136] px-4 sm:px-6 flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#5865f2]">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold truncate max-w-sm">{canvasDoc.name}</h3>
            <div className="text-[10px] text-[#9ca3af]">
              Modo Previsualización Dinámica con Datos Reales de IndexedDB
            </div>
          </div>
        </div>

        {/* Record Stepper Navigator */}
        <div className="flex items-center gap-2 bg-[#1a1b1e] px-3 py-1.5 rounded-lg border border-[#2f3136]">
          <span className="text-xs text-[#9ca3af] font-medium">Registro:</span>
          <button
            onClick={() => setRecordIndex(prev => Math.max(0, prev - 1))}
            disabled={recordIndex === 0}
            className="p-1 text-[#9ca3af] hover:text-white disabled:opacity-30 rounded hover:bg-[#2f3136]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-[#5865f2]">
            {recordIndex + 1} / {maxRecordsCount}
          </span>
          <button
            onClick={() => setRecordIndex(prev => Math.min(maxRecordsCount - 1, prev + 1))}
            disabled={recordIndex >= maxRecordsCount - 1}
            className="p-1 text-[#9ca3af] hover:text-white disabled:opacity-30 rounded hover:bg-[#2f3136]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1a1b1e] rounded-lg p-0.5 border border-[#2f3136]">
            <button
              onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(1))))}
              className="p-1.5 text-[#9ca3af] hover:text-white rounded"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-2 text-[#e1e1e6]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.1).toFixed(1))))}
              className="p-1.5 text-[#9ca3af] hover:text-white rounded"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-[10px] text-[#9ca3af] hover:text-white rounded hover:bg-[#2f3136]"
            >
              100%
            </button>
          </div>

          <button
            onClick={onOpenExportModal}
            className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#2f3136] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar (Img/PDF)</span>
          </button>

          {onOpenHtmlExport && (
            <button
              onClick={onOpenHtmlExport}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Exportar canvas actual como paquete HTML interactivo en archivo ZIP"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Exportar HTML (.zip)</span>
            </button>
          )}

          <ModalFullscreenToggle
            isFullscreen={isFullscreen}
            onToggle={() => setIsFullscreen(prev => !prev)}
            buttonSize="sm"
            className="ml-1"
          />

          <button
            onClick={onClose}
            className="p-2 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#2f3136] transition ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="flex-1 overflow-auto bg-[#141517] flex items-center justify-center p-8">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out'
          }}
        >
          <div
            id="rendered-preview-canvas"
            style={{
              width: `${canvasDoc.width}px`,
              height: `${canvasDoc.height}px`,
              backgroundColor: canvasDoc.backgroundColor || '#ffffff'
            }}
            className="relative shadow-2xl rounded-sm overflow-hidden"
          >
            {canvasDoc.elements
              .filter(el => el.visible)
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
                    selectedRecordIndex={recordIndex}
                    onRecordInserted={onRecordInserted}
                    allFilterElements={allFilterElements}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    allDrillElements={allDrillElements}
                    activeDrillPaths={activeDrillPaths}
                    onDrillPathChange={handleDrillPathChange}
                    currentDocument={canvasDoc}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
