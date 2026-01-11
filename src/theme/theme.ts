import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: {
    primary: { main: "#111827", contrastText: "#ffffff" },
    secondary: { main: "#059669" },
    background: { default: "#F9FAFB", paper: "#ffffff" },
    text: { primary: "#111827", secondary: "#6B7280" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" }
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
    h3: { fontWeight: 900, letterSpacing: "-0.03em" },
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700, fontSize: "1rem" },
    subtitle1: { fontWeight: 600, fontSize: "0.95rem" },
    subtitle2: { fontWeight: 700, fontSize: "0.875rem" },
    caption: { fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          height: 48,
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" }
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            fontSize: "16px",
            borderRadius: 8,
            backgroundColor: "#ffffff",
            "& fieldset": { borderColor: "#E5E7EB" },
            "&:hover fieldset": { borderColor: "#D1D5DB" },
            "&.Mui-focused fieldset": { borderWith: "1px", borderColor: "#111827" }
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          border: "1px solid #E5E7EB",
          borderRadius: 10
        }
      }
    }
  }
});
