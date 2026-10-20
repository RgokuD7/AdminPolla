import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, PaletteMode } from '@mui/material';
import { createAppTheme } from './theme';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  effectiveMode: PaletteMode;
  setThemePreference: (pref: ThemePreference) => void;
  toggleNextMode: () => void; // Ciclo: system -> light -> dark -> system
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  effectiveMode: 'light',
  setThemePreference: () => {},
  toggleNextMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

const STORAGE_KEY = 'adminpolla-theme-preference';

export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Preferencia guardada ('system', 'light', 'dark')
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'system' || stored === 'light' || stored === 'dark') {
        return stored as ThemePreference;
      }
    } catch {}
    return 'system';
  });

  // Estado del sistema operativo
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Escuchar cambios en la preferencia del sistema operativo en tiempo real
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Guardar en localStorage cuando cambie
  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {}
  };

  // Ciclo rápido para botón de toggle: system -> light -> dark -> system
  const toggleNextMode = () => {
    setThemePreferenceState(prev => {
      let next: ThemePreference = 'system';
      if (prev === 'system') next = 'light';
      else if (prev === 'light') next = 'dark';
      else next = 'system';

      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  };

  // Modo efectivo aplicado a MUI
  const effectiveMode: PaletteMode = useMemo(() => {
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    return systemIsDark ? 'dark' : 'light';
  }, [themePreference, systemIsDark]);

  const theme = useMemo(() => createAppTheme(effectiveMode), [effectiveMode]);

  const contextValue = useMemo(() => ({
    themePreference,
    effectiveMode,
    setThemePreference,
    toggleNextMode,
  }), [themePreference, effectiveMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
