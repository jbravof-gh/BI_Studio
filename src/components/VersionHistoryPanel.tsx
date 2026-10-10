import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Camera,
  RotateCcw,
  Trash2,
  Clock,
  Layers,
  Search,
  Check,
  AlertTriangle,
  Eye,
  Maximize2,
  X,
  Edit2,
  Sparkles,
  Calendar,
  Info
} from 'lucide-react';
import { CanvasDocument, CanvasSnapshot } from '../types';
import { snapshotService } from '../services/snapshotService';

interface VersionHistoryPanelProps {
  currentDocument: CanvasDocument;
  activeDbName: string;
  onRestoreSnapshot: (document: CanvasDocument) => void;
  onTakeSnapshot?: () => Promise<CanvasSnapshot | void>;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  currentDocument,
  activeDbName,
  onRestoreSnapshot,
  onTakeSnapshot
}) => {
  const [snapshots, setSnapshots] = useState<CanvasSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<CanvasSnapshot | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Load snapshots from IndexedDB
  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const data = await snapshotService.getSnapshots(activeDbName);
      setSnapshots(data);
    } catch (err) {
      console.error('Error loading snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();

    const handleSnapshotUpdated = () => {
      loadSnapshots();
    };

    window.addEventListener('canvas-snapshot-updated', handleSnapshotUpdated);
    return () => {
      window.removeEventListener('canvas-snapshot-updated', handleSnapshotUpdated);
    };
  }, [activeDbName]);

  // Handle taking a snapshot from the panel
  const handleCreateSnapshot = async () => {
    if (isTakingSnapshot) return;
    setIsTakingSnapshot(true);
    try {
      let created: CanvasSnapshot | void;
      if (onTakeSnapshot) {
        created = await onTakeSnapshot();
      } else {
        created = await snapshotService.takeSnapshot(currentDocument, activeDbName);
      }
      if (created) {
        setJustSavedId(created.id);
        setTimeout(() => setJustSavedId(null), 3000);
      }
      await loadSnapshots();
    } catch (err) {
      console.error('Failed to take snapshot:', err);
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  // Handle restoring a snapshot
  const handleExecuteRestore = (snapshot: CanvasSnapshot) => {
    setRestoringId(snapshot.id);
    try {
      // Deep clone the document state
      const restoredDoc: CanvasDocument = JSON.parse(JSON.stringify(snapshot.document));
      onRestoreSnapshot(restoredDoc);
      setConfirmRestoreId(null);
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    } finally {
      setTimeout(() => setRestoringId(null), 500);
    }
  };

  // Handle deleting a single snapshot
  const handleDeleteSnapshot = async (id: string) => {
    try {
      await snapshotService.deleteSnapshot(id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  // Handle clearing all snapshots
  const handleClearAll = async () => {
    try {
      await snapshotService.clearSnapshots(activeDbName);
      setSnapshots([]);
      setConfirmClearAll(false);
    } catch (err) {
      console.error('Failed to clear snapshots:', err);
    }
  };

  // Handle renaming
  const handleStartRename = (s: CanvasSnapshot) => {
    setEditingId(s.id);
    setEditingName(s.docName);
  };

  const handleSaveRename = async (id: string) => {
    if (editingName.trim()) {
      await snapshotService.updateSnapshotName(id, editingName.trim());
      setSnapshots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, docName: editingName.trim() } : s))
      );
    }
    setEditingId(null);
  };

  // Filter snapshots by search
  const filteredSnapshots = useMemo(() => {
    if (!searchQuery.trim()) return snapshots;
    const q = searchQuery.toLowerCase().trim();
    return snapshots.filter(
      (s) =>
        s.docName.toLowerCase().includes(q) ||
        s.createdAt.toLowerCase().includes(q) ||
        String(s.elementCount).includes(q)
    );
  }, [snapshots, searchQuery]);

  // Format relative time
  const getRelativeTime = (timestamp: number): string => {
    const diff = Math.max(0, Date.now() - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'Hace unos segundos';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `Hace ${mins} min${mins > 1 ? 's' : ''}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  };

  return (
    <div className="flex flex-col h-full bg-[#181a1d] text-[#e1e1e6] select-none text-xs">
      {/* Panel Top Header Bar */}
      <div className="px-3.5 py-2.5 bg-[#202225] border-b border-[#2f3136] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <History className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate text-xs flex items-center gap-1.5">
              <span>Historial de Versiones</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#2f3136] text-[#9ca3af]">
                {snapshots.length}
              </span>
            </h3>
            <p className="text-[10px] text-[#9ca3af] truncate">
              {activeDbName ? `BD: ${activeDbName}` : 'Instantáneas en IndexedDB'}
            </p>
          </div>
        </div>

        {/* Top Actions: Take Snapshot & Clear */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={isTakingSnapshot}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer ${
              isTakingSnapshot
                ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
            title="Crear una nueva instantánea del lienzo actual y guardarla en IndexedDB"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Instantánea</span>
          </button>
        </div>
      </div>

      {/* Subheader Toolbar: Search & Info */}
      <div className="px-3 py-2 bg-[#1a1b1e] border-b border-[#2f3136] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar instantáneas..."
            className="w-full pl-8 pr-7 py-1 text-xs bg-[#141517] border border-[#2f3136] rounded-md text-white placeholder-[#6b7280] focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {snapshots.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="p-1.5 text-[#9ca3af] hover:text-rose-400 hover:bg-rose-500/15 rounded-md transition cursor-pointer flex-shrink-0"
            title="Eliminar todas las instantáneas guardadas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Confirmation Banner for Clear All */}
      {confirmClearAll && (
        <div className="p-3 bg-rose-950/40 border-b border-rose-500/40 flex items-center justify-between gap-2 text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-[11px]">¿Eliminar todas las instantáneas?</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              Sí, vaciar
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearAll(false)}
              className="px-2 py-0.5 bg-[#25282c] hover:bg-[#2f3136] text-[#9ca3af] rounded text-[10px] cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && snapshots.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#9ca3af] text-center space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Cargando instantáneas desde IndexedDB...</span>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center text-[#9ca3af] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#202225] border border-[#2f3136] flex items-center justify-center text-emerald-400 shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            {searchQuery ? (
              <>
                <div className="font-semibold text-white">Sin resultados</div>
                <p className="text-[11px] max-w-xs text-[#9ca3af]">
                  No se encontraron instantáneas que coincidan con &quot;{searchQuery}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1 bg-[#25282c] hover:bg-[#2f3136] text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <div className="font-semibold text-white">Sin instantáneas aún</div>
                <p className="text-[11px] max-w-xs text-[#9ca3af]">
                  Guarda instantáneas completas de tu dashboard con su miniatura visual en IndexedDB.
                  Podrás restaurar cualquier versión en cualquier momento.
                </p>
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  disabled={isTakingSnapshot}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Tomar primera instantánea</span>
                </button>
              </>
            )}
          </div>
        ) : (
          filteredSnapshots.map((snapshot) => {
            const isJustSaved = justSavedId === snapshot.id;
            const isConfirmingRestore = confirmRestoreId === snapshot.id;
            const isConfirmingDelete = confirmDeleteId === snapshot.id;
            const isEditing = editingId === snapshot.id;

            return (
              <div
                key={snapshot.id}
                className={`bg-[#202225] border rounded-xl overflow-hidden transition-all duration-150 ${
                  isJustSaved
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : isConfirmingRestore
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-[#2f3136] hover:border-[#3f434a]'
                }`}
              >
                {/* Thumbnail Preview Area with Hover Actions */}
                <div className="relative aspect-[16/10] bg-[#141517] w-full overflow-hidden border-b border-[#2f3136] group">
                  {snapshot.thumbnail ? (
                    <img
                      src={snapshot.thumbnail}
                      alt={snapshot.docName}
                      className="w-full h-full object-contain p-1 select-none transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#6b7280]">
                      <Layers className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[10px]">Sin miniatura</span>
                    </div>
                  )}

                  {/* Badges on Thumbnail */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/60 text-white backdrop-blur-xs border border-white/10">
                      {snapshot.dimensions.width}×{snapshot.dimensions.height}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/60 text-emerald-300 backdrop-blur-xs border border-white/10 flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      {snapshot.elementCount}
                    </span>
                  </div>

                  {/* Relative Time Badge */}
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-slate-300 backdrop-blur-xs border border-white/10 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-emerald-400" />
                      {getRelativeTime(snapshot.timestamp)}
                    </span>
                  </div>

                  {/* Overlay Action to Preview Larger */}
                  {snapshot.thumbnail && (
                    <button
                      type="button"
                      onClick={() => setPreviewSnapshot(snapshot)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-semibold text-xs cursor-pointer backdrop-blur-[1px]"
                      title="Ver miniatura en detalle"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Ampliar</span>
                    </button>
                  )}
                </div>

                {/* Card Content & Meta */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(snapshot.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 bg-[#141517] border border-blue-500 rounded text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(snapshot.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group/title">
                          <h4
                            className="font-bold text-white text-xs truncate cursor-pointer hover:text-emerald-300 transition-colors"
                            onClick={() => handleStartRename(snapshot)}
                            title="Haz clic para renombrar esta instantánea"
                          >
                            {snapshot.docName}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleStartRename(snapshot)}
                            className="text-[#6b7280] hover:text-white opacity-0 group-hover/title:opacity-100 transition cursor-pointer"
                            title="Renombrar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-[#9ca3af] mt-0.5">
                        <Calendar className="w-2.5 h-2.5 text-slate-500" />
                        <span>{snapshot.createdAt}</span>
                      </div>
                    </div>

                    {/* Delete button (or toggle confirmation) */}
                    {!isConfirmingDelete && !isConfirmingRestore && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(snapshot.id)}
                        className="p-1 text-[#6b7280] hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                        title="Eliminar esta instantánea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Confirmation Dialogs for Delete / Restore */}
                  {isConfirmingDelete ? (
                    <div className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-lg flex items-center justify-between gap-1 text-[11px] text-rose-200">
                      <span>¿Eliminar instantánea?</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 bg-[#25282c] text-[#9ca3af] rounded text-[10px] cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : isConfirmingRestore ? (
                    <div className="p-2 bg-blue-950/40 border border-blue-500/30 rounded-lg space-y-2 text-[11px] text-blue-200">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>¿Restaurar esta versión?</span>
                      </div>
                      <p className="text-[10px] text-blue-200/80 leading-snug">
                        Esta acción sustituirá el diseño actual del lienzo con los elementos y dimensiones de esta instantánea.
                      </p>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(null)}
                          className="px-2 py-1 bg-[#25282c] hover:bg-[#2f3136] text-[#9ca3af] rounded text-[10px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteRestore(snapshot)}
                          disabled={restoringId === snapshot.id}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] shadow transition cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Confirmar Restauración</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Default Action Button: Restaurar */
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreId(snapshot.id)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-[#25282c] hover:bg-blue-600 hover:text-white text-slate-200 border border-[#373a40] hover:border-blue-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer group/btn"
                      title="Restaurar esta versión en el lienzo"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400 group-hover/btn:text-white transition-colors" />
                      <span>Restaurar esta versión</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Preview Lightbox Modal */}
      {previewSnapshot && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewSnapshot(null)}
        >
          <div
            className="bg-[#181a1d] border border-[#2f3136] rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-[#202225] border-b border-[#2f3136] flex items-center justify-between">
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{previewSnapshot.docName}</h4>
                <p className="text-xs text-[#9ca3af]">
                  {previewSnapshot.createdAt} • {previewSnapshot.dimensions.width}×{previewSnapshot.dimensions.height} px • {previewSnapshot.elementCount} elementos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSnapshot(null)}
                className="p-1 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#25282c] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#141517] flex items-center justify-center">
              {previewSnapshot.thumbnail ? (
                <img
                  src={previewSnapshot.thumbnail}
                  alt={previewSnapshot.docName}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-[#2f3136] shadow-xl"
                />
              ) : (
                <div className="text-[#9ca3af]">Sin vista previa</div>
              )}
            </div>
            <div className="px-4 py-2.5 bg-[#202225] border-t border-[#2f3136] flex items-center justify-between">
              <span className="text-xs text-[#9ca3af]">
                Almacenado localmente en IndexedDB
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewSnapshot(null)}
                  className="px-3 py-1 text-xs bg-[#25282c] text-white rounded hover:bg-[#2f3136] cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExecuteRestore(previewSnapshot);
                    setPreviewSnapshot(null);
                  }}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Ahora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
