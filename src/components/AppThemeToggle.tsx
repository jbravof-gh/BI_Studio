import React from 'react';
import { Sun, Moon, Laptop, Monitor } from 'lucide-react';
import { useAppTheme, AppThemeMode } from '../context/ThemeContext';

interface AppThemeToggleProps {
  variant?: 'navbar' | 'footer' | 'compact';
  showLabel?: boolean;
  className?: string;
  showButtonLabels?: boolean;
}

export const AppThemeToggle: React.FC<AppThemeToggleProps> = ({
  variant = 'navbar',
  showLabel = true,
  className = '',
  showButtonLabels = true
}) => {
  const { themeMode, resolvedTheme, setThemeMode } = useAppTheme();

  const options: { mode: AppThemeMode; label: string; shortLabel: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      mode: 'light',
      label: 'Claro',
      shortLabel: 'Claro',
      icon: <Sun className="w-3.5 h-3.5" />,
      tooltip: 'Tema de la interfaz: Claro'
    },
    {
      mode: 'dark',
      label: 'Oscuro',
      shortLabel: 'Oscuro',
      icon: <Moon className="w-3.5 h-3.5" />,
      tooltip: 'Tema de la interfaz: Oscuro'
    },
    {
      mode: 'system',
      label: 'Sistema',
      shortLabel: 'Auto',
      icon: <Laptop className="w-3.5 h-3.5" />,
      tooltip: `Tema de la interfaz: Sistema (${resolvedTheme === 'dark' ? 'Oscuro activo' : 'Claro activo'})`
    }
  ];

  if (variant === 'footer') {
    return (
      <div 
        className={`flex items-center gap-1.5 flex-shrink-0 bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-0.5 ${className}`}
        role="radiogroup"
        aria-label="Tema de la interfaz de la aplicación"
      >
        {showLabel && (
          <span className="text-[10px] font-semibold text-[#9ca3af] px-1.5 hidden md:inline select-none">
            Tema UI
          </span>
        )}
        <div className="flex items-center gap-0.5">
          {options.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={`footer_theme_${opt.mode}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setThemeMode(opt.mode)}
                className={`px-1.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#5865f2] text-white shadow-xs'
                    : 'text-[#9ca3af] hover:text-[#e1e1e6] hover:bg-[#25282c]'
                }`}
                title={opt.tooltip}
              >
                {opt.icon}
                <span className="text-[10px] hidden sm:inline">{opt.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default navbar variant
  return (
    <div
      className={`flex items-center gap-1 bg-[#1a1b1e] border border-[#2f3136] rounded-lg p-0.5 flex-shrink-0 select-none ${className}`}
      role="radiogroup"
      aria-label="Tema de la interfaz de la aplicación"
    >
      {showLabel && (
        <span className="text-[10px] font-semibold text-[#9ca3af] pl-1.5 pr-0.5 hidden xl:inline">
          UI
        </span>
      )}
      <div className="flex items-center gap-0.5">
        {options.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <button
              key={`nav_theme_${opt.mode}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setThemeMode(opt.mode)}
              className={`group px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#5865f2] text-white shadow-xs font-bold'
                  : 'text-[#9ca3af] hover:text-[#e1e1e6] hover:bg-[#25282c]'
              }`}
              title={opt.tooltip}
            >
              {opt.icon}
              {showButtonLabels ? (
                <span className="text-[11px] hidden lg:inline">{opt.label}</span>
              ) : (
                <span className="text-[11px] hidden group-hover:inline-block whitespace-nowrap animate-in fade-in duration-150">
                  {opt.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
