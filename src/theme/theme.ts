import { createTheme, PaletteMode, ThemeOptions } from "@mui/material";

// ══════════════════════════════════════════════════════
// Design Tokens — AdminPolla (Sobrio, Curvas Suaves)
// ══════════════════════════════════════════════════════

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
    surface: {
      paid: string;
      pending: string;
      overdue: string;
      muted: string;
      elevated: string;
    };
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
    surface?: {
      paid: string;
      pending: string;
      overdue: string;
      muted: string;
      elevated: string;
    };
  }
}

const getDesignTokens = (mode: PaletteMode): ThemeOptions => {
  const isLight = mode === 'light';
  
  return {
    palette: {
      mode,
      primary: { 
        main: isLight ? '#111827' : '#F9FAFB',
        contrastText: isLight ? '#ffffff' : '#111827',
      },
      secondary: { main: '#059669' },
      accent: { main: '#2563EB', contrastText: '#ffffff' },
      success: { main: '#10B981' },
      warning: { main: '#D97706' },
      error: { main: '#DC2626' },
      background: {
        default: isLight ? '#F9FAFB' : '#0B0F19',
        paper: isLight ? '#FFFFFF' : '#151D2C',
      },
      surface: {
        paid: isLight ? '#ECFDF5' : '#063828',
        pending: isLight ? '#FFFBEB' : '#331B05',
        overdue: isLight ? '#FEF2F2' : '#390B0B',
        muted: isLight ? '#F3F4F6' : '#1A2333',
        elevated: isLight ? '#FFFFFF' : '#222E42',
      },
      text: {
        primary: isLight ? '#111827' : '#F1F5F9',
        secondary: isLight ? '#4B5563' : '#94A3B8',
      },
      divider: isLight ? '#E5E7EB' : '#263347',
    },
    // Curvas moderadas y sobrias (8px)
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h3: { fontWeight: 900, letterSpacing: '-0.02em' },
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 800, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, fontSize: '1rem' },
      subtitle1: { fontWeight: 600, fontSize: '0.95rem' },
      subtitle2: { fontWeight: 700, fontSize: '0.875rem' },
      caption: { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.2s ease, color 0.2s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            height: 48,
            textTransform: 'none' as const,
            fontWeight: 700,
            borderRadius: 8,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          sizeSmall: {
            height: 36,
            borderRadius: 6,
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' as const },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              fontSize: '16px',
              borderRadius: 8,
              backgroundColor: isLight ? '#FFFFFF' : '#151D2C',
              '& fieldset': { borderColor: isLight ? '#E5E7EB' : '#263347' },
              '&:hover fieldset': { borderColor: isLight ? '#CBD5E1' : '#3B4B63' },
              '&.Mui-focused fieldset': { borderWidth: '1.5px', borderColor: '#059669' },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${isLight ? '#E5E7EB' : '#263347'}`,
            borderRadius: 10,
            backgroundColor: isLight ? '#FFFFFF' : '#151D2C',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            fontSize: '0.7rem',
            borderRadius: 6,
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 68,
            backgroundColor: 'transparent',
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 'auto',
            padding: '6px 12px',
            color: isLight ? '#64748B' : '#94A3B8',
            '&.Mui-selected': {
              color: '#059669',
            },
          },
          label: {
            fontSize: '0.72rem',
            fontWeight: 600,
            '&.Mui-selected': {
              fontSize: '0.72rem',
              fontWeight: 800,
            },
          },
        },
      },
    },
  };
};

export const createAppTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode));

export const theme = createAppTheme('light');
