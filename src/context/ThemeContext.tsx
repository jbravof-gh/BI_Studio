import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AppThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  themeMode: AppThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: AppThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'dexie_studio_app_theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read initial preference from localStorage or fallback to 'system'
  const [themeMode, setThemeModeState] = useState<AppThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (e) {
      // Ignore localStorage read errors in restricted contexts
    }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Listen for system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    setSystemIsDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = themeMode === 'system'
    ? (systemIsDark ? 'dark' : 'light')
    : themeMode;

  // Apply theme class and data-attributes to document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.setAttribute('data-app-theme', resolvedTheme);
    root.setAttribute('data-theme-mode', themeMode);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, themeMode]);

  const setThemeMode = useCallback((mode: AppThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      // Ignore localStorage write errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState(prev => {
      const next: AppThemeMode = prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
