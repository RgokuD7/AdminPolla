import { createTheme, PaletteMode, ThemeOptions } from "@mui/material";

// ══════════════════════════════════════════════════════
// Design Tokens — AdminPolla v2
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
      accent: { main: '#3B82F6', contrastText: '#ffffff' },
      success: { main: '#10B981' },
      warning: { main: '#F59E0B' },
      error: { main: '#EF4444' },
      background: {
        default: isLight ? '#F3F4F6' : '#0F172A',
        paper: isLight ? '#FFFFFF' : '#1E293B',
      },
      surface: {
        paid: isLight ? '#F0FDF4' : '#064E3B',
        pending: isLight ? '#FFFBEB' : '#451A03',
        overdue: isLight ? '#FEF2F2' : '#450A0A',
        muted: isLight ? '#F9FAFB' : '#1E293B',
        elevated: isLight ? '#FFFFFF' : '#334155',
      },
      text: {
        primary: isLight ? '#111827' : '#F1F5F9',
        secondary: isLight ? '#6B7280' : '#94A3B8',
      },
      divider: isLight ? '#E5E7EB' : '#334155',
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
      h3: { fontWeight: 900, letterSpacing: '-0.03em' },
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 800, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, fontSize: '1rem' },
      subtitle1: { fontWeight: 600, fontSize: '0.95rem' },
      subtitle2: { fontWeight: 700, fontSize: '0.875rem' },
      caption: { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            height: 48,
            textTransform: 'none' as const,
            fontWeight: 700,
            borderRadius: 12,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          sizeSmall: {
            height: 36,
            borderRadius: 10,
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' as const },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              fontSize: '16px',
              borderRadius: 12,
              backgroundColor: isLight ? '#ffffff' : '#1E293B',
              '& fieldset': { borderColor: isLight ? '#E5E7EB' : '#334155' },
              '&:hover fieldset': { borderColor: isLight ? '#D1D5DB' : '#475569' },
              '&.Mui-focused fieldset': { borderWidth: '1.5px', borderColor: '#059669' },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${isLight ? '#E5E7EB' : '#334155'}`,
            borderRadius: 16,
            backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
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
            borderRadius: 20,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            fontSize: '0.7rem',
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 72,
            backgroundColor: 'transparent',
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 'auto',
            padding: '6px 16px',
            color: isLight ? '#9CA3AF' : '#64748B',
            '&.Mui-selected': {
              color: '#059669',
            },
          },
          label: {
            fontSize: '0.7rem',
            fontWeight: 600,
            '&.Mui-selected': {
              fontSize: '0.7rem',
              fontWeight: 800,
            },
          },
        },
      },
    },
  };
};

export const createAppTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode));

// Default export para retrocompatibilidad
export const theme = createAppTheme('light');
