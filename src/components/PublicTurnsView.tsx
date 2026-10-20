import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth, onAuthStateChanged, loginWithGoogle, User } from '@/firebase';
import { PollaGroup, Participant, UserProfile } from '@/types';
import { calculatePaymentDate, formatDateReadable, getParticipantName, formatCurrency } from '@/utils/helpers';
import { 
  Box, 
  Container, 
  Typography, 
  CircularProgress, 
  Chip, 
  Paper, 
  Stack, 
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormControlLabel,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Groups as GroupIcon,
  AttachMoney as MoneyIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  SettingsBrightness as AutoModeIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
  Link as LinkIcon,
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useThemeMode } from '@/theme/ThemeContext';
import { AppFooter } from './AppFooter';
import { PollaService, UserService } from '@/services/firestore';

const PublicTurnsView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<PollaGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { themePreference, effectiveMode, toggleNextMode } = useThemeMode();

  // Estado de Autenticación & P2P Onboarding
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ participantId: string; memberIndex?: number } | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Escuchar estado de sesión
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setAuthUser(user);
      if (user) {
        setShowGuestModal(false);
        const profile = await UserService.getUserProfile(user.uid);
        setUserProfile(profile);
      }
    });
    return () => unsubscribe();
  }, []);

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
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          adminId: data.userId || data.adminId,
          participantUserIds: data.participantUserIds || [],
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

  useEffect(() => {
    fetchGroup();
  }, [id]);

  // Mostrar modal de invitación a espectadores no logueados tras cargar
  useEffect(() => {
    if (!loading && group && !authUser) {
      const storageKey = `guest_modal_dismissed_${group.id}`;
      const wasDismissed = sessionStorage.getItem(storageKey);
      if (!wasDismissed) {
        const timer = setTimeout(() => {
          setShowGuestModal(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, group, authUser]);

  const handleDismissGuestModal = () => {
    setShowGuestModal(false);
    if (group) {
      sessionStorage.setItem(`guest_modal_dismissed_${group.id}`, 'true');
    }
  };

  const handleLoginFromModal = async () => {
    try {
      await loginWithGoogle();
      setShowGuestModal(false);
    } catch (e) {
      console.error("Error iniciando sesión:", e);
    }
  };

  // Determinar si el usuario logueado ya está vinculado en esta polla
  const isUserLinked = Boolean(
    authUser && group && (
      group.participantUserIds?.includes(authUser.uid) ||
      group.participants.some(p => 
        p.userId === authUser.uid || 
        p.members?.some(m => m.userId === authUser.uid)
      )
    )
  );

  // Vincular usuario al turno seleccionado
  const handleConfirmLink = async () => {
    if (!group || !authUser || !selectedSlot) return;

    setIsLinking(true);
    try {
      await PollaService.linkUserToParticipant(
        group.id,
        selectedSlot.participantId,
        {
          uid: authUser.uid,
          email: authUser.email || "",
          name: authUser.displayName || "",
          bankDetails: userProfile?.bankDetails
        },
        selectedSlot.memberIndex
      );

      setFeedback("¡Te has vinculado exitosamente a este turno!");
      setLinkDialogOpen(false);
      await fetchGroup();
    } catch (err) {
      console.error("Error vinculando cuenta:", err);
      setFeedback("Error al vincular tu cuenta. Intenta nuevamente.");
    } finally {
      setIsLinking(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
        <CircularProgress size={38} color="secondary" />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Cargando calendario...</Typography>
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Paper sx={{ p: 3.5, borderRadius: 2.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      {/* ─── Header Público ─── */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        py: 1.5, 
        px: 2.5, 
        borderBottom: 1, 
        borderColor: 'divider', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box component="img" src="/logo.png" sx={{ width: 30, height: 30 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
            <Box component="span" sx={{ color: 'accent.main' }}>Admin</Box>
            <Box component="span" sx={{ color: 'secondary.main' }}>Polla</Box>
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {authUser ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/')}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                minHeight: 36,
                borderRadius: 2,
                borderColor: 'divider',
                color: 'text.primary'
              }}
            >
              Mis Pollas
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={() => loginWithGoogle()}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                minHeight: 36,
                borderRadius: 2,
                px: 1.5
              }}
            >
              Iniciar sesión
            </Button>
          )}

          <IconButton 
            size="small" 
            onClick={toggleNextMode}
            sx={{ 
              color: effectiveMode === 'dark' ? '#FBBF24' : 'text.secondary',
              bgcolor: 'surface.muted',
              border: 1,
              borderColor: 'divider',
              width: 36,
              height: 36,
              borderRadius: 2
            }}
          >
            {themePreference === 'system' ? (
              <AutoModeIcon fontSize="small" sx={{ color: 'secondary.main' }} />
            ) : themePreference === 'dark' ? (
              <DarkModeIcon fontSize="small" />
            ) : (
              <LightModeIcon fontSize="small" />
            )}
          </IconButton>
        </Stack>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 2.5, px: 2 }}>
        
        {/* ─── Banner de Vinculación / Estado P2P ─── */}
        {authUser && isUserLinked ? (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 2.5, 
              borderRadius: 2.5, 
              bgcolor: 'surface.paid', 
              border: 1, 
              borderColor: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
            elevation={0}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                ✅ Tu cuenta está vinculada a esta polla
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Puedes ver tus estados de pago y datos bancarios desde tu panel.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => navigate('/')}
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{ fontWeight: 700, borderRadius: 2, minHeight: 38, whiteSpace: 'nowrap' }}
            >
              Ir al Panel
            </Button>
          </Paper>
        ) : authUser && !isUserLinked ? (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 2.5, 
              borderRadius: 2.5, 
              bgcolor: 'surface.muted', 
              border: 1, 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
            elevation={0}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                👋 ¿Eres participante de este grupo?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Vincula tu cuenta a tu número de turno para seguir tus pagos.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<LinkIcon fontSize="small" />}
              onClick={() => setLinkDialogOpen(true)}
              sx={{ fontWeight: 700, borderRadius: 2, minHeight: 40, whiteSpace: 'nowrap' }}
            >
              Vincular mi Turno
            </Button>
          </Paper>
        ) : null}

        {/* ─── Hero Card del Grupo ─── */}
        <Paper 
          sx={{ 
            p: 2.5, 
            borderRadius: 2.5, 
            mb: 2.5, 
            border: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 'none'
          }}
        >
          <Stack spacing={1.5} alignItems="center" textAlign="center">
            <GroupIcon sx={{ fontSize: 36, color: 'secondary.main', bgcolor: 'surface.paid', p: 0.75, borderRadius: '50%' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {settings.groupName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25, display: 'block' }}>
                Frecuencia: {settings.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              <Chip 
                label={`${participants.length} Participantes`} 
                size="small" 
                sx={{ bgcolor: 'surface.muted', fontWeight: 700, borderRadius: 1.5 }} 
              />
              <Chip 
                icon={<MoneyIcon sx={{ fontSize: '13px !important' }} />}
                label={`Meta: ${formatCurrency(settings.quotaAmount * participants.length)}`} 
                size="small"
                sx={{ bgcolor: 'surface.paid', color: 'secondary.main', fontWeight: 800, borderRadius: 1.5, '& .MuiChip-icon': { color: 'secondary.main' } }} 
              />
              <Chip 
                label={`Cuota: ${formatCurrency(settings.quotaAmount)} c/u`} 
                size="small" 
                variant="outlined"
                sx={{ fontWeight: 700, borderColor: 'divider', borderRadius: 1.5 }} 
              />
            </Stack>
          </Stack>
        </Paper>

        {/* ─── Calendario de Turnos ─── */}
        <Typography variant="h6" sx={{ mb: 1.5, px: 0.5, fontWeight: 800 }}>
          Calendario de Beneficiarios
        </Typography>

        <Paper 
          sx={{ 
            borderRadius: 2.5, 
            overflow: 'hidden', 
            border: 1, 
            borderColor: 'divider', 
            bgcolor: 'background.paper',
            boxShadow: 'none'
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
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: isCurrent ? 'surface.paid' : 'transparent',
                  opacity: isPast ? 0.6 : 1,
                  borderBottom: hasDivider ? 1 : 0,
                  borderColor: 'divider',
                  borderLeft: isCurrent ? 3 : 0,
                  borderLeftColor: 'secondary.main'
                }}
              >
                {/* Caja de Fecha */}
                <Box 
                  sx={{ 
                    minWidth: 46, 
                    width: 46,
                    height: 46,
                    borderRadius: 1.5, 
                    border: 1, 
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
                      fontSize: '0.62rem', 
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
                      fontSize: '1.05rem', 
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
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        color: 'text.primary',
                        lineHeight: 1.2,
                        fontSize: '0.9rem'
                      }}
                    >
                      {getParticipantName(p)}
                    </Typography>
                    {isCurrent && (
                      <Chip 
                        label="LE TOCA AHORA" 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '0.62rem', 
                          fontWeight: 800, 
                          bgcolor: 'secondary.main', 
                          color: '#FFFFFF',
                          borderRadius: 1
                        }} 
                      />
                    )}
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.25 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: 'surface.muted', 
                        color: 'text.secondary', 
                        px: 0.75, 
                        py: 0.1, 
                        borderRadius: 1,
                        fontSize: '0.68rem'
                      }} 
                    >
                      Turno #{p.turnNumber}
                    </Typography>
                    {p.type === 'shared' && (
                      <Chip 
                        label="Compartido" 
                        size="small" 
                        variant="outlined" 
                        sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, borderColor: 'divider', borderRadius: 1 }} 
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Paper>
        
        <AppFooter sx={{ mt: 3, mb: 2 }} />

      </Container>

      {/* ─── Modal de Bienvenida para Visitantes Invitados ─── */}
      <Dialog
        open={showGuestModal}
        onClose={handleDismissGuestModal}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            bgcolor: 'background.paper',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CelebrationIcon sx={{ color: 'secondary.main' }} />
          ¿Eres parte de esta polla?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.88rem' }}>
            Inicia sesión o crea tu cuenta gratis para vincularte a tu número de turno, ver datos de transferencia y registrar tus pagos fácilmente.
          </Typography>
          <Box sx={{ bgcolor: 'surface.muted', p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mb: 0.5 }}>
              BENEFICIOS DE CREAR TU CUENTA:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              • Revisa el estado de tus cuotas en tiempo real.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              • Copia los datos bancarios del beneficiario en 1 toque.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              • Tus compañeros recibirán tus datos bancarios cuando sea tu turno.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0.5, flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            onClick={handleLoginFromModal}
            sx={{ fontWeight: 800, minHeight: 46, borderRadius: 2 }}
          >
            Iniciar sesión con Google
          </Button>
          <Button
            color="inherit"
            fullWidth
            onClick={handleDismissGuestModal}
            sx={{ fontWeight: 700, minHeight: 40, color: 'text.secondary' }}
          >
            Solo quiero ver el calendario
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo para Seleccionar Turno y Vincular ─── */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            bgcolor: 'background.paper',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon sx={{ color: 'secondary.main' }} />
          Vincular mi Turno
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
            Selecciona cuál de los siguientes turnos te corresponde en esta polla:
          </Typography>

          <RadioGroup
            value={selectedSlot ? `${selectedSlot.participantId}_${selectedSlot.memberIndex ?? 'single'}` : ""}
            onChange={(e) => {
              const val = e.target.value;
              const [pid, mIdx] = val.split('_');
              setSelectedSlot({
                participantId: pid,
                memberIndex: mIdx === 'single' ? undefined : Number(mIdx)
              });
            }}
          >
            <Stack spacing={1}>
              {sortedParticipants.map((p) => {
                if (p.type === 'shared') {
                  return (
                    <Box key={p.id} sx={{ p: 1, bgcolor: 'surface.muted', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Turno #{p.turnNumber} (Compartido)
                      </Typography>
                      {p.members.map((m, idx) => (
                        <FormControlLabel
                          key={idx}
                          value={`${p.id}_${idx}`}
                          control={<Radio size="small" color="secondary" />}
                          label={
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                              {m.name || `Miembro ${idx + 1}`} {m.userId ? "(Ya vinculado)" : ""}
                            </Typography>
                          }
                          disabled={Boolean(m.userId && m.userId !== authUser?.uid)}
                        />
                      ))}
                    </Box>
                  );
                }

                return (
                  <Paper
                    key={p.id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      borderColor: selectedSlot?.participantId === p.id ? 'secondary.main' : 'divider',
                      bgcolor: selectedSlot?.participantId === p.id ? 'surface.paid' : 'background.paper'
                    }}
                  >
                    <FormControlLabel
                      value={`${p.id}_single`}
                      control={<Radio size="small" color="secondary" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            Turno #{p.turnNumber}: {getParticipantName(p)}
                          </Typography>
                          {p.userId && p.userId !== authUser?.uid && (
                            <Typography variant="caption" color="text.secondary">
                              (Ya vinculado a otro usuario)
                            </Typography>
                          )}
                        </Box>
                      }
                      disabled={Boolean(p.userId && p.userId !== authUser?.uid)}
                    />
                  </Paper>
                );
              })}
            </Stack>
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0.5 }}>
          <Button onClick={() => setLinkDialogOpen(false)} color="inherit" sx={{ fontWeight: 700, minHeight: 44 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!selectedSlot || isLinking}
            onClick={handleConfirmLink}
            sx={{ fontWeight: 800, minHeight: 44, px: 2.5, borderRadius: 2 }}
          >
            {isLinking ? "Vinculando..." : "Confirmar Vinculación"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={!!feedback}
        autoHideDuration={3000}
        onClose={() => setFeedback("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 700 }}>
          {feedback}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PublicTurnsView;
