import React, { useState, useEffect } from 'react';
import { dexieManager } from '../services/dexieManager';
import { IoTransferTab } from './db/IoTransferTab';
import { DataTab } from './db/DataTab';
import { RelationshipsTab } from './db/RelationshipsTab';
import { LibraryTab } from './db/LibraryTab';
import { LinksTab } from './db/LinksTab';
import { ModalFullscreenToggle } from './ModalFullscreenToggle';
import { 
  Database, 
  ArrowLeftRight, 
  Table as TableIcon, 
  GitFork, 
  FolderTree,
  Link2,
  X, 
  HardDrive, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

interface DbManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDbName: string;
  onSelectDatabase: (name: string) => void;
  onDbChanged: () => void;
  onOpenGenerateLayout?: (tableName?: string) => void;
}

export type DbManagerTab = 'io' | 'data' | 'relationships' | 'library' | 'links';

export const DbManagerModal: React.FC<DbManagerModalProps> = ({
  isOpen,
  onClose,
  activeDbName,
  onSelectDatabase,
  onDbChanged,
  onOpenGenerateLayout
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<DbManagerTab>('data');
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>(activeDbName || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDatabasesList();
      if (activeDbName) {
        setSelectedDb(activeDbName);
      } else {
        setSelectedDb('');
      }
    }
  }, [isOpen, activeDbName]);

  const loadDatabasesList = async () => {
    try {
      const rawList = await dexieManager.listDatabases();
      const list = Array.from(new Set(rawList.map(d => String(d || '').trim()).filter(Boolean)));
      setDatabases(list);
      // 2.- Al abrir el modal Gestor de Bases de Datos se mostraran en la barra izquierda las BD existentes.
      // La parte central estara vacia hasta que se seleccione una base de datos (no auto-seleccionar list[0]).
      if (selectedDb && !list.includes(selectedDb)) {
        setSelectedDb('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectDb = (name: string) => {
    setSelectedDb(name);
  };

  const handleDbChanged = async () => {
    await loadDatabasesList();
    onDbChanged();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center transition-all duration-200 ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div className={`bg-[#202225] shadow-2xl flex flex-col overflow-hidden border border-[#2f3136] text-[#e1e1e6] transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-6xl h-[88vh] rounded-2xl'
      }`}>
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5865f2] text-white shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Gestor de Bases de Datos (IndexedDB)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#25282c] border border-[#2f3136] text-[10px] font-mono text-[#9ca3af]">
                  v1.2
                </span>
              </div>
              <p className="text-xs text-[#9ca3af]">
                Administra tus colecciones de datos, importación/exportación JSON y Excel, y relaciones de esquema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#25282c] border border-[#2f3136] rounded-lg text-xs">
              <span className="text-[#9ca3af]">BD Activa:</span>
              <strong className="text-emerald-400 font-mono">{activeDbName}</strong>
            </div>

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

        {/* Notification banner */}
        {message && (
          <div className={`px-4 py-2 text-xs flex items-center justify-between shrink-0 transition-all ${
            message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-b border-rose-500/30'
          }`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold underline ml-2 cursor-pointer">Cerrar</button>
          </div>
        )}

        {/* Main Tab Content View */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'io' && (
            <IoTransferTab
              databases={databases}
              selectedDb={selectedDb}
              onSelectDatabase={handleSelectDb}
              onDbChanged={handleDbChanged}
              onNotification={setMessage}
            />
          )}

          {activeTab === 'data' && (
            <DataTab
              databases={databases}
              selectedDb={selectedDb}
              activeDbName={activeDbName}
              onSelectDatabase={handleSelectDb}
              onSetActiveDatabase={(name) => {
                onSelectDatabase(name);
                onDbChanged();
              }}
              onDbChanged={handleDbChanged}
              onNotification={setMessage}
              onGenerateLayout={(tableName) => {
                if (onOpenGenerateLayout) {
                  onOpenGenerateLayout(tableName);
                }
              }}
            />
          )}

          {activeTab === 'relationships' && (
            <RelationshipsTab
              selectedDb={selectedDb}
              onNotification={setMessage}
              onDbChanged={handleDbChanged}
            />
          )}

          {activeTab === 'library' && (
            <LibraryTab
              databases={databases}
              selectedDb={selectedDb}
              activeDbName={activeDbName}
              onSelectDatabase={handleSelectDb}
              onDbChanged={handleDbChanged}
              onNotification={setMessage}
            />
          )}

          {activeTab === 'links' && (
            <LinksTab
              databases={databases}
              selectedDb={selectedDb}
              activeDbName={activeDbName}
              onNotification={setMessage}
            />
          )}
        </div>

        {/* Bottom Footer Navigation Bar with the Tabs */}
        <div className="px-5 py-3 border-t border-[#2f3136] bg-[#1a1b1e] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('io')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'io'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 ring-1 ring-white/20'
                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>I/O Transfer</span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'data'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 ring-1 ring-white/20'
                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Data</span>
            </button>

            <button
              onClick={() => setActiveTab('relationships')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'relationships'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 ring-1 ring-white/20'
                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
              }`}
            >
              <GitFork className="w-4 h-4" />
              <span>Relationships</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 ring-1 ring-white/20'
                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Library</span>
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 ring-1 ring-white/20'
                  : 'bg-[#25282c] text-[#9ca3af] hover:text-white hover:bg-[#2f3136] border border-[#2f3136]'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Links</span>
            </button>
          </div>

          {/* Quick Info & Action in Footer */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-[#9ca3af] hidden md:block">
              {databases.length} base(s) de datos disponibles en almacenamiento local
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#25282c] hover:bg-[#2f3136] text-[#e1e1e6] border border-[#373a40] rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

