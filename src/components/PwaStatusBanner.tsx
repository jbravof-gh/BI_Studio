import React from 'react';
import { usePwa } from '../hooks/usePwa';
import { Sparkles, WifiOff, RefreshCw } from 'lucide-react';

export const PwaStatusBanner: React.FC = () => {
  const { isOnline, hasUpdate, updateApp } = usePwa();

  return (
    <>
      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 text-xs text-amber-200 flex items-center justify-between z-30 select-none">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-medium">Modo Offline Activo:</span>
            <span className="text-amber-300/80 hidden sm:inline">
              Dexie Canvas Studio funciona al 100% con IndexedDB local.
            </span>
          </div>
          <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30">
            Sin conexión
          </span>
        </div>
      )}

      {/* Update Available Toast Banner */}
      {hasUpdate && (
        <div className="bg-[#5865f2]/20 border-b border-[#5865f2]/40 px-3 py-1.5 text-xs text-white flex items-center justify-between z-30 select-none animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] animate-spin" />
            <span>Hay una nueva versión de Dexie Canvas Studio disponible.</span>
          </div>
          <button
            onClick={updateApp}
            className="px-2.5 py-0.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Actualizar</span>
          </button>
        </div>
      )}
    </>
  );
};
