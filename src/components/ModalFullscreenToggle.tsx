import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ModalFullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
  className?: string;
  buttonSize?: 'sm' | 'md';
}

export const ModalFullscreenToggle: React.FC<ModalFullscreenToggleProps> = ({
  isFullscreen,
  onToggle,
  className = '',
  buttonSize = 'md'
}) => {
  const iconClass = buttonSize === 'sm' ? 'w-4 h-4' : 'w-4 h-4 sm:w-4.5 sm:h-4.5';
  const paddingClass = buttonSize === 'sm' ? 'p-1.5' : 'p-1.5 sm:p-2';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${paddingClass} rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#25282c] border border-transparent hover:border-[#2f3136] transition-all duration-150 cursor-pointer flex items-center justify-center select-none ${className}`}
      title={isFullscreen ? 'Restaurar tamaño normal de ventana' : 'Maximizar modal a pantalla completa (Full Screen)'}
      aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      aria-pressed={isFullscreen}
    >
      {isFullscreen ? (
        <Minimize2 className={`${iconClass} text-[#5865f2] hover:text-[#7983f5] transition-colors`} />
      ) : (
        <Maximize2 className={iconClass} />
      )}
    </button>
  );
};
