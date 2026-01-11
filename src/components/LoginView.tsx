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

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack spacing={4} alignItems="center" width="100%">
        
        {/* Brand Section */}
        <Box textAlign="center">
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-1px', mb: 1 }}>
            Admin<Box component="span" sx={{ color: 'secondary.main' }}>Polla</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona tus grupos de ahorro sin complicaciones.
          </Typography>
        </Box>

        {/* Login Card */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            width: '100%', 
            borderRadius: 4, 
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0px 4px 20px rgba(0,0,0,0.05)'
          }}
        >
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
              Bienvenido
            </Typography>
            
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleLogin}
              disabled={loading}
              startIcon={loading ? null : <GoogleIcon />}
              sx={{ 
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                borderColor: '#E5E7EB',
                color: '#374151',
                fontWeight: 600,
                bgcolor: 'white',
                fontSize: '1rem',
                '&:hover': {
                  bgcolor: '#F9FAFB',
                  borderColor: '#D1D5DB'
                }
              }}
            >
              {loading ? "Conectando..." : "Continuar con Google"}
            </Button>
            
            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: 'block', px: 2 }}>
              Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
            </Typography>
          </Stack>
        </Paper>

        {/* Footer/Version */}
        <Typography variant="caption" color="text.disabled">
          v1.0.0 • AdminPolla
        </Typography>

      </Stack>
    </Container>
  );
};

export default LoginView;
