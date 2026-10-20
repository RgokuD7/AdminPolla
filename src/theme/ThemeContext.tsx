import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, PaletteMode } from '@mui/material';
import { createAppTheme } from './theme';

interface ThemeContextType {
  mode: PaletteMode;
  toggleMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleMode: () => {},
  isDark: false,
});

export const useThemeMode = () => useContext(ThemeContext);

const STORAGE_KEY = 'adminpolla-theme-mode';

export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    // Default: preferencia del sistema
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const toggleMode = () => setMode(prev => prev === 'light' ? 'dark' : 'light');

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const contextValue = useMemo(() => ({
    mode,
    toggleMode,
    isDark: mode === 'dark',
  }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
