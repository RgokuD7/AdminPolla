import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { PollaGroup } from '@/types';
import { calculatePaymentDate, formatDateReadable, getParticipantName, formatCurrency } from '@/utils/helpers';
import { 
  Box, 
  Container, 
  Typography, 
  CircularProgress,
  Chip,
  Paper,
  Stack,
  IconButton
} from '@mui/material';
import { 
  Groups as GroupIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';
import { useThemeMode } from '@/theme/ThemeContext';

const PublicTurnsView = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<PollaGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isDark, toggleMode } = useThemeMode();

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "pollas", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const rawParticipants = data.participants || [];
          const groupData: PollaGroup = {
            id: docSnap.id,
            createdAt: data.createdAt || Date.now(),
            adminId: data.userId || data.adminId,
            settings: data.settings,
            participants: rawParticipants
          };
          setGroup(groupData);
        } else {
          setError("No encontramos este grupo. Verifica el enlace compartido.");
        }
      } catch (err) {
        console.error(err);
        setError("Error cargando el grupo. Puede que sea privado o el enlace esté mal.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
        <CircularProgress size={42} color="secondary" />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Cargando calendario de la polla...</Typography>
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 4, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h3" sx={{ mb: 1 }}>😕</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }} gutterBottom>Enlace no disponible</Typography>
          <Typography color="text.secondary" variant="body2">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  const { settings, participants } = group;
  const sortedParticipants = [...participants].sort((a, b) => a.turnNumber - b.turnNumber);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      {/* ─── Header Público ─── */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        py: 2, 
        px: 3, 
        borderBottom: 1, 
        borderColor: 'divider', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box component="img" src="/logo.png" sx={{ width: 34, height: 34 }} />
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>
            <Box component="span" sx={{ color: 'accent.main' }}>Admin</Box>
            <Box component="span" sx={{ color: 'secondary.main' }}>Polla</Box>
          </Typography>
        </Stack>
        <IconButton 
          size="small" 
          onClick={toggleMode}
          sx={{ 
            color: isDark ? '#FBBF24' : 'text.secondary',
            bgcolor: 'surface.muted',
            border: 1,
            borderColor: 'divider',
            width: 38,
            height: 38,
            borderRadius: 2
          }}
        >
          {isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 3, px: 2 }}>
        
        {/* ─── Hero Card del Grupo ─── */}
        <Paper 
          sx={{ 
            p: 3, 
            borderRadius: 4, 
            mb: 3, 
            border: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            <GroupIcon sx={{ fontSize: 44, color: 'secondary.main', bgcolor: 'surface.paid', p: 1, borderRadius: '50%' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary' }}>
                {settings.groupName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
                Frecuencia: {settings.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              <Chip 
                label={`${participants.length} Participantes`} 
                size="small" 
                sx={{ bgcolor: 'surface.muted', fontWeight: 700 }} 
              />
              <Chip 
                icon={<MoneyIcon sx={{ fontSize: '14px !important' }} />}
                label={`Meta: ${formatCurrency(settings.quotaAmount * participants.length)}`} 
                size="small"
                sx={{ bgcolor: 'surface.paid', color: 'secondary.main', fontWeight: 800, '& .MuiChip-icon': { color: 'secondary.main' } }} 
              />
              <Chip 
                label={`Cuota: ${formatCurrency(settings.quotaAmount)} c/u`} 
                size="small" 
                variant="outlined"
                sx={{ fontWeight: 700, borderColor: 'divider' }} 
              />
            </Stack>
          </Stack>
        </Paper>

        {/* ─── Calendario de Turnos ─── */}
        <Typography variant="h6" sx={{ mb: 2, px: 0.5, fontWeight: 800 }}>
          Calendario de Beneficiarios
        </Typography>

        <Paper 
          sx={{ 
            borderRadius: 4, 
            overflow: 'hidden', 
            border: 1, 
            borderColor: 'divider', 
            bgcolor: 'background.paper',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}
        >
          {sortedParticipants.map((p, idx) => {
            const paymentDate = calculatePaymentDate(settings, p.turnNumber);
            const isCurrent = p.turnNumber === settings.currentTurn;
            const isPast = p.turnNumber < settings.currentTurn;
            const hasDivider = idx < sortedParticipants.length - 1;
            
            const dayNumber = paymentDate.split('-')[2];
            const monthShort = formatDateReadable(paymentDate).split(' ')[1]?.toUpperCase() || "";

            return (
              <Box 
                key={p.id}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: isCurrent ? 'surface.paid' : 'transparent',
                  opacity: isPast ? 0.6 : 1,
                  borderBottom: hasDivider ? 1 : 0,
                  borderColor: 'divider',
                  borderLeft: isCurrent ? 4 : 0,
                  borderLeftColor: 'secondary.main',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Caja de Fecha */}
                <Box 
                  sx={{ 
                    minWidth: 52, 
                    width: 52,
                    height: 52,
                    borderRadius: 3, 
                    border: 1.5, 
                    borderColor: isCurrent ? 'secondary.main' : 'divider',
                    bgcolor: isCurrent ? 'background.paper' : 'surface.muted',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      lineHeight: 1, 
                      color: isCurrent ? 'secondary.main' : 'accent.main'
                    }}
                  >
                    {monthShort}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 900, 
                      fontSize: '1.2rem', 
                      lineHeight: 1.1, 
                      color: isCurrent ? 'secondary.main' : 'text.primary',
                      mt: 0.2
                    }}
                  >
                    {dayNumber}
                  </Typography>
                </Box>

                {/* Info del Participante */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'text.primary',
                        lineHeight: 1.2
                      }}
                    >
                      {getParticipantName(p)}
                    </Typography>
                    {isCurrent && (
                      <Chip 
                        label="LE TOCA AHORA" 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem', 
                          fontWeight: 800, 
                          bgcolor: 'secondary.main', 
                          color: '#FFFFFF' 
                        }} 
                      />
                    )}
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: 'surface.muted', 
                        color: 'text.secondary', 
                        px: 1, 
                        py: 0.2, 
                        borderRadius: 1 
                      }}
                    >
                      Turno #{p.turnNumber}
                    </Typography>
                    {p.type === 'shared' && (
                      <Chip 
                        label="Compartido" 
                        size="small" 
                        variant="outlined" 
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, borderColor: 'divider' }} 
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Paper>
        
        <Box sx={{ textAlign: 'center', mt: 4, mb: 4 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            AdminPolla • Vista Pública Segura
          </Typography>
        </Box>

      </Container>
    </Box>
  );
};

export default PublicTurnsView;
