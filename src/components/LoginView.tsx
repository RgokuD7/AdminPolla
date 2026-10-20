import React from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  Stack 
} from '@mui/material';

interface LoginViewProps {
  onLogin: () => void;
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await onLogin();
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup')) {
        setErrorMsg("⚠️ Tu navegador bloqueó la ventana. Por favor permite las ventanas emergentes (Pop-ups) e intenta nuevamente.");
      } else if (error?.code === 'auth/popup-closed-by-user') {
        console.log("Usuario canceló el login");
      } else {
        setErrorMsg("Error al iniciar sesión. Revisa tu conexión o intenta más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Stack spacing={3.5} alignItems="center" width="100%">
        
        {/* Brand Section */}
        <Box textAlign="center">
          <Box 
            component="img" 
            src="/logo.png" 
            alt="Logo AdminPolla" 
            sx={{ 
              width: 140, 
              height: 140, 
              mb: 2.5, 
              objectFit: 'contain',
              filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.12))'
            }} 
          />
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-1px', mb: 0.5, color: 'text.primary' }}>
            <Box component="span" sx={{ color: 'accent.main' }}>Admin</Box>
            <Box component="span" sx={{ color: 'secondary.main' }}>Polla</Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Gestiona tus grupos de ahorro y turnos sin enredos.
          </Typography>
        </Box>

        {/* Login Card */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3.5, 
            width: '100%', 
            borderRadius: 4, 
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0px 8px 30px rgba(0,0,0,0.06)'
          }}
        >
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center', color: 'text.primary' }}>
              Iniciar Sesión
            </Typography>

            {errorMsg && (
              <Box sx={{ 
                bgcolor: 'surface.overdue', 
                color: 'error.main', 
                p: 2, 
                borderRadius: 2.5, 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                border: 1, 
                borderColor: 'error.main' 
              }}>
                {errorMsg}
              </Box>
            )}
            
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleLogin}
              disabled={loading}
              startIcon={loading ? null : <GoogleIcon />}
              sx={{ 
                py: 1.5,
                minHeight: 50,
                borderRadius: 3,
                borderColor: 'divider',
                color: 'text.primary',
                fontWeight: 700,
                bgcolor: 'surface.muted',
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: 'background.paper',
                  borderColor: 'text.secondary'
                }
              }}
            >
              {loading ? "Conectando..." : "Continuar con Google"}
            </Button>
            
            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: 'block', px: 1, lineHeight: 1.4 }}>
              Si la ventana no abre, habilita las ventanas emergentes en tu navegador.
            </Typography>
          </Stack>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          AdminPolla • Hecho para el día a día
        </Typography>

      </Stack>
    </Container>
  );
};

export default LoginView;
