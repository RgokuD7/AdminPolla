import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Fab,
  LinearProgress,
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Stack,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  alpha,
  FormControlLabel,
  Checkbox,
  Menu
} from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  EmojiEvents as TrophyIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Shuffle as ShuffleIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  ContentPaste as PasteIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
  Edit as EditIcon,
  DoneAll as DoneAllIcon,
  FiberManualRecord as DotIcon,
  WhatsApp as WhatsAppIcon,
  PersonAddAlt1 as PersonAddIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  MoreVert as MoreVertIcon,
  Event as EventIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
  Payments as PaymentsIcon,
  Schedule as ScheduleIcon,
  Savings as SavingsIcon,
  Groups as GroupsIcon
} from "@mui/icons-material";

// Declaración para el script externo de confeti
declare var confetti: any;

// --- Configuración del Tema "Sharp & Clean Fintech" ---
const theme = createTheme({
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

// --- Tipos ---
type Frequency = 'weekly' | 'biweekly' | 'monthly';

interface Member {
  name: string;
  phone: string;
}

interface Participant { 
  id: string; 
  type: 'single' | 'shared';
  members: Member[];
  turnNumber: number; 
  isPaid: boolean; 
}

interface AppSettings { 
  groupName: string; 
  quotaAmount: number; 
  currentTurn: number; 
  frequency: Frequency; 
  startDate: string; 
  graceDays1: number; 
  graceDays2: number; 
  isLocked: boolean;
}

interface PollaGroup { 
  id: string; 
  settings: AppSettings; 
  participants: Participant[]; 
  createdAt: number; 
}

// --- Helpers ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
const formatDateReadable = (dateStr: string) => dateStr ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(dateStr + "T12:00:00")) : "";
const formatDateFull = (dateStr: string) => dateStr ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr + "T12:00:00")) : "";

const calculatePaymentDate = (settings: AppSettings, turn: number): string => {
  const { startDate, frequency } = settings;
  const startBase = new Date(startDate + "T12:00:00");
  const turnIndex = turn - 1;
  if (frequency === 'weekly') {
    const date = new Date(startBase);
    date.setDate(date.getDate() + (turnIndex * 7));
    return date.toISOString().split('T')[0];
  }
  let year = startBase.getFullYear(), month = startBase.getMonth();
  if (frequency === 'monthly') return new Date(year, month + turnIndex + 1, 0, 12).toISOString().split('T')[0];
  const monthOffset = Math.floor(turnIndex / 2);
  const isSecondHalf = turnIndex % 2 === 1;
  return (!isSecondHalf ? new Date(year, month + monthOffset, 15, 12) : new Date(year, month + monthOffset + 1, 0, 12)).toISOString().split('T')[0];
};

const getGraceDaysForTurn = (settings: AppSettings, turn: number): number => settings.frequency === 'biweekly' ? ((turn - 1) % 2 === 1 ? settings.graceDays2 : settings.graceDays1) : settings.graceDays1;
const getDeadlineDate = (baseDateStr: string, graceDays: number): string => {
  const date = new Date(baseDateStr + "T12:00:00");
  date.setDate(date.getDate() + graceDays);
  return date.toISOString().split('T')[0];
};

const getParticipantName = (p: Participant) => p.members.map(m => m.name).join(" / ");

const triggerConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
};

// --- Vistas ---

const ListView = ({ groups, onSelect, onCreate, onDelete }: { groups: PollaGroup[], onSelect: (id: string) => void, onCreate: (s: AppSettings) => void, onDelete: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AppSettings>({ groupName: "", quotaAmount: 20000, currentTurn: 1, frequency: 'biweekly', startDate: new Date().toISOString().split('T')[0], graceDays1: 0, graceDays2: 0, isLocked: false });

  return (
    <Container maxWidth="sm" sx={{ py: 6, pb: 12 }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>AdminPolla</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>Mis Grupos</Typography>
      
      <Stack spacing={1.5}>
        {groups.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed', bgcolor: 'transparent', borderRadius: 3 }}>
            <Typography variant="body1" color="text.secondary">No hay grupos registrados</Typography>
            <Button variant="contained" sx={{ mt: 3, px: 4 }} onClick={() => setOpen(true)}>Crear Polla</Button>
          </Paper>
        ) : (
          groups.map((group) => (
            <Card key={group.id} onClick={() => onSelect(group.id)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:active': { transform: 'translateY(1px)' } }}>
              <CardContent sx={{ p: "16px 20px !important" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>{group.settings.groupName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.settings.frequency} • {formatCurrency(group.settings.quotaAmount)}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 24, borderRadius: 3 }} onClick={() => setOpen(true)}>
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ pt: 3, fontWeight: 800 }}>Nueva Polla</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            <TextField label="Nombre del Grupo" fullWidth value={form.groupName} onChange={e => setForm({...form, groupName: e.target.value})} />
            <TextField label="Monto Cuota" type="number" fullWidth value={form.quotaAmount} onChange={e => setForm({...form, quotaAmount: Number(e.target.value)})} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            <FormControl fullWidth>
              <InputLabel>Frecuencia</InputLabel>
              <Select label="Frecuencia" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value as Frequency})}>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="biweekly">Quincenal (15 y Fin)</MenuItem>
                <MenuItem value="monthly">Mensual (Fin)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Fecha de Inicio" type="date" fullWidth value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cerrar</Button>
          <Button variant="contained" onClick={() => { if(form.groupName.trim()) { onCreate(form); setOpen(false); } }}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

const DashboardView = ({ participants, settings, onTogglePayment }: { participants: Participant[], settings: AppSettings, onTogglePayment: (id: string) => void }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: "", pid: "" });
  const [confirmPayment, setConfirmPayment] = useState<{ open: boolean, p: Participant | null }>({ open: false, p: null });
  const [isMarkingMode, setIsMarkingMode] = useState(false);

  const stats = useMemo(() => {
    const totalGoal = participants.length * settings.quotaAmount;
    const collected = participants.filter((p) => p.isPaid).length * settings.quotaAmount;
    const progress = (collected / totalGoal) * 100 || 0;
    const recipient = participants.find((p) => p.turnNumber === settings.currentTurn);
    const baseDate = calculatePaymentDate(settings, settings.currentTurn);
    const graceDays = getGraceDaysForTurn(settings, settings.currentTurn);
    const deadlineDate = getDeadlineDate(baseDate, graceDays);
    const isFullyPaid = progress === 100 && participants.length > 0;
    
    // Nueva lógica para reparto individual en turnos compartidos
    const individualAmount = (isFullyPaid && recipient && recipient.type === 'shared' && recipient.members.length > 0) 
      ? totalGoal / recipient.members.length 
      : null;

    return { totalGoal, collected, progress, recipient, baseDate, deadlineDate, graceDays, isFullyPaid, individualAmount };
  }, [participants, settings]);

  // Efecto para disparar confeti solo cuando se llega al 100%
  const [lastProgress, setLastProgress] = useState(0);
  useEffect(() => {
    if (stats.progress === 100 && lastProgress < 100 && participants.length > 0) {
      triggerConfetti();
    }
    setLastProgress(stats.progress);
  }, [stats.progress, participants.length]);

  const handleCopyReport = useCallback(async () => {
    const paidList = participants.filter((p) => p.isPaid).map((p) => `✅ ${getParticipantName(p)}`).join("\n");
    const pendingList = participants.filter((p) => !p.isPaid).map((p) => `⏳ ${getParticipantName(p)}`).join("\n");
    const report = `📢 *REPORTE: ${settings.groupName.toUpperCase()}*\n📅 *Vence:* ${formatDateFull(stats.deadlineDate)}\n💰 *Recaudado:* ${formatCurrency(stats.collected)} / ${formatCurrency(stats.totalGoal)}\n\n*PAGOS:*\n${paidList || "_Sin pagos_"}\n\n*PENDIENTES:*\n${pendingList || "_Todo al día!_"}\n\n👉 *Receptor:* ${stats.recipient ? getParticipantName(stats.recipient) : "N/A"}`;
    await navigator.clipboard.writeText(report);
    setSnackbar({ open: true, message: "Reporte copiado", pid: "" });
  }, [participants, settings, stats]);

  const onIntentToggle = (p: Participant) => {
    if (isMarkingMode) { onTogglePayment(p.id); return; }
    if (!p.isPaid) { setConfirmPayment({ open: true, p }); }
    else { onTogglePayment(p.id); setSnackbar({ open: true, message: `Se desmarcó a ${getParticipantName(p)}`, pid: p.id }); }
  };

  return (
    <Box sx={{ pb: 16 }}>
      <Box sx={{ bgcolor: "white", pt: 6, pb: 6, px: 3, borderBottom: '1px solid #E5E7EB' }}>
        <Stack spacing={3}>
          <Typography variant="caption" color="text.secondary">{settings.groupName}</Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Recaudado Actual</Typography>
            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography variant="h3" sx={{ color: stats.isFullyPaid ? 'secondary.main' : 'inherit' }}>
                {formatCurrency(stats.collected)}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">/ {formatCurrency(stats.totalGoal)}</Typography>
              {stats.isFullyPaid && (
                <IconButton size="small" onClick={() => triggerConfetti()} sx={{ ml: 1, color: 'warning.main' }}>
                  <CelebrationIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>
          <Box>
            <LinearProgress variant="determinate" value={stats.progress} sx={{ 
              height: 6, borderRadius: 1, bgcolor: '#F3F4F6', 
              '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' } 
            }} />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: stats.isFullyPaid ? 'secondary.main' : 'secondary.main', fontWeight: 700 }}>
                {stats.isFullyPaid ? "¡PAGOS COMPLETADOS!" : `${Math.round(stats.progress)}% completado`}
              </Typography>
              <Typography variant="caption" color="text.secondary">{participants.filter(p => p.isPaid).length} de {participants.length} pagos</Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 3 }}>
        <Paper 
          sx={{ 
            mb: 4, 
            borderRadius: 4, 
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: stats.isFullyPaid ? '#F0FDF4' : '#FFFBEB', 
            border: stats.isFullyPaid ? '1px solid #BBF7D0' : '1px solid #FEF3C7',
            boxShadow: stats.isFullyPaid ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
          }} 
          variant="outlined"
          className={stats.isFullyPaid ? "success-pulse" : ""}
        >
          {/* Status Header */}
          <Box sx={{ 
            bgcolor: stats.isFullyPaid ? 'secondary.main' : 'warning.main', 
            color: 'white', px: 2, py: 1, 
            display: 'flex', alignItems: 'center', gap: 1
          }}>
            {stats.isFullyPaid ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : <ScheduleIcon sx={{ fontSize: 18 }} />}
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.05em' }}>
              {stats.isFullyPaid ? "RECAUDACIÓN LISTA" : "COBRO TURNO ACTUAL"}
            </Typography>
          </Box>

          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2}>
              {/* Recipient Column */}
              <Grid item xs={12} sm={7}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    {stats.recipient?.type === 'shared' ? 'RECEPTORES (COMPARTIDO)' : 'RECEPTOR'}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    {stats.recipient?.type === 'shared' ? (
                      <GroupsIcon sx={{ mt: 0.2, color: stats.isFullyPaid ? 'secondary.main' : 'warning.main', fontSize: 20 }} />
                    ) : (
                      <PaymentsIcon sx={{ mt: 0.2, color: stats.isFullyPaid ? 'secondary.main' : 'warning.main', fontSize: 20 }} />
                    )}
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
                        {stats.recipient ? getParticipantName(stats.recipient) : "Aún sin integrantes"}
                      </Typography>
                      {stats.individualAmount && (
                        <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700, mt: 0.5, display: 'block' }}>
                           ({formatCurrency(stats.individualAmount)} cada uno)
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Stack>
              </Grid>

              {/* Amount & Date Column */}
              <Grid item xs={12} sm={5}>
                <Stack direction="row" spacing={2} sx={{ 
                  justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                  borderLeft: { xs: 'none', sm: '1px solid rgba(0,0,0,0.05)' },
                  pl: { xs: 0, sm: 2 }
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>TURNO</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main', textAlign: { sm: 'center' } }}>
                      #{settings.currentTurn}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { sm: 'right' } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{stats.isFullyPaid ? "POZO TOTAL" : "VENCE"}</Typography>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 900, 
                      color: stats.isFullyPaid ? 'secondary.main' : 'primary.main',
                      fontSize: stats.isFullyPaid ? '1rem' : '0.875rem'
                    }}>
                      {stats.isFullyPaid ? formatCurrency(stats.totalGoal) : formatDateReadable(stats.deadlineDate)}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            {stats.isFullyPaid && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <SavingsIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
                <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                  {stats.recipient?.type === 'shared' 
                    ? `¡REPARTIR POZO: ${formatCurrency(stats.totalGoal)}!` 
                    : `¡Entregar pozo de ${formatCurrency(stats.totalGoal)}!`}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5, px: 0.5 }}>
          <Typography variant="h6">Integrantes</Typography>
          <Button 
            size="small" 
            variant={isMarkingMode ? "contained" : "outlined"} 
            startIcon={isMarkingMode ? <DoneAllIcon /> : <EditIcon />}
            onClick={() => setIsMarkingMode(!isMarkingMode)}
            sx={{ borderRadius: 2, px: 2, height: 36, fontSize: '0.8rem' }}
          >
            {isMarkingMode ? "Finalizar" : "Marcar rápido"}
          </Button>
        </Stack>

        <Stack spacing={1.5}>
          {participants.map((p) => {
            const plazo = getDeadlineDate(calculatePaymentDate(settings, p.turnNumber), getGraceDaysForTurn(settings, p.turnNumber));
            return (
              <Card 
                key={p.id} 
                onClick={isMarkingMode ? () => onIntentToggle(p) : undefined}
                sx={{ 
                  cursor: isMarkingMode ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  bgcolor: isMarkingMode && p.isPaid ? "#F0FDF4" : "white",
                  borderLeft: p.isPaid ? '4px solid #10B981' : '4px solid #F59E0B'
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: "20px !important" }}>
                  <Avatar sx={{ 
                    mr: 2.5, 
                    bgcolor: p.turnNumber === settings.currentTurn ? 'primary.main' : '#F3F4F6', 
                    color: p.turnNumber === settings.currentTurn ? 'white' : 'text.primary', 
                    fontWeight: 800, fontSize: 13, width: 34, height: 34, borderRadius: 1.5
                  }}>{p.turnNumber}</Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ mb: 0.2 }}>{getParticipantName(p)}</Typography>
                    <Typography variant="caption" color="text.secondary">Turno {p.turnNumber} • {formatDateReadable(plazo)}</Typography>
                  </Box>
                  <Stack 
                    direction="row" 
                    alignItems="center" 
                    spacing={0.5} 
                    onClick={!isMarkingMode ? () => onIntentToggle(p) : undefined}
                    sx={{ cursor: 'pointer', p: 1, borderRadius: 2, '&:hover': { bgcolor: '#F9FAFB' } }}
                  >
                    <DotIcon sx={{ fontSize: 12, color: p.isPaid ? 'secondary.main' : 'warning.main' }} />
                    <Typography variant="caption" sx={{ color: p.isPaid ? 'secondary.main' : 'warning.main', fontWeight: 800 }}>
                      {p.isPaid ? "PAGADO" : "PENDIENTE"}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Container>
      
      <Fab color="primary" variant="extended" onClick={handleCopyReport} sx={{ position: 'fixed', bottom: 110, right: 24, px: 3, borderRadius: 3, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
        <ContentCopyIcon sx={{ mr: 1, fontSize: 20 }} /> Copiar Reporte
      </Fab>

      <Dialog open={confirmPayment.open} onClose={() => setConfirmPayment({ open: false, p: null })} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1 }}>Confirmar Pago</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>{confirmPayment.p ? getParticipantName(confirmPayment.p) : ""}</Typography>
          <Typography variant="body1" color="text.secondary">{formatCurrency(settings.quotaAmount)}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 0, gap: 1.5 }}>
          <Button fullWidth variant="outlined" onClick={() => setConfirmPayment({ open: false, p: null })}>Cancelar</Button>
          <Button fullWidth variant="contained" color="secondary" onClick={() => { if(confirmPayment.p) { onTogglePayment(confirmPayment.p.id); setSnackbar({ open: true, message: "Pago registrado", pid: confirmPayment.p.id }); } setConfirmPayment({ open: false, p: null }); }}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }} action={snackbar.pid && <Button color="inherit" size="small" onClick={() => onTogglePayment(snackbar.pid)} startIcon={<UndoIcon />}>Deshacer</Button>}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const TurnsView = ({ 
  participants, 
  settings,
  onAddParticipant, 
  onUpdateParticipant,
  onRemoveParticipant, 
  onShuffle, 
  onReorder, 
  onBulkImport,
  onUpdateSettings,
  onSetTurnByDate
}: { 
  participants: Participant[], 
  settings: AppSettings,
  onAddParticipant: (p: Participant) => void, 
  onUpdateParticipant: (p: Participant) => void,
  onRemoveParticipant: (id: string) => void, 
  onShuffle: () => void, 
  onReorder: (from: number, to: number) => void, 
  onBulkImport: (participants: Participant[]) => void,
  onUpdateSettings: (s: AppSettings) => void,
  onSetTurnByDate: (pid: string, newTurn: number) => void
}) => {
  const [name1, setName1] = useState("");
  const [phone1, setPhone1] = useState("");
  const [name2, setName2] = useState("");
  const [phone2, setPhone2] = useState("");
  const [isShared, setIsShared] = useState(false);
  
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  // Menu State
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; pid: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Calendar Turn Reorder State
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState("");

  const availableDates = useMemo(() => {
    // Solo generamos fechas para el total de participantes actuales
    const dates = [];
    const count = participants.length > 0 ? participants.length : 1;
    for (let i = 1; i <= count; i++) {
      dates.push({
        turn: i,
        date: calculatePaymentDate(settings, i)
      });
    }
    return dates;
  }, [settings, participants.length]);

  const handleQuickAdd = () => { 
    if(name1.trim()) { 
      const newParticipant: Participant = {
        id: "p-" + Date.now(),
        type: isShared ? 'shared' : 'single',
        members: isShared ? [
          { name: name1.trim(), phone: phone1.trim() },
          { name: name2.trim(), phone: phone2.trim() }
        ] : [{ name: name1.trim(), phone: phone1.trim() }],
        isPaid: false,
        turnNumber: participants.length + 1
      };
      onAddParticipant(newParticipant);
      setName1(""); setPhone1("");
      setName2(""); setPhone2("");
      setIsShared(false);
    } 
  };

  const toggleLock = () => {
    if (settings.isLocked) {
      setLockDialogOpen(true);
    } else {
      onUpdateSettings({ ...settings, isLocked: true });
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, pid: string) => {
    setMenuAnchor({ el: event.currentTarget, pid });
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleEditClick = () => {
    const p = participants.find(p => p.id === menuAnchor?.pid);
    if (p) {
      setEditingParticipant({ ...p });
      setEditDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleSetDateClick = () => {
    const p = participants.find(p => p.id === menuAnchor?.pid);
    if (p) {
      setEditingParticipant(p);
      setTargetDate(calculatePaymentDate(settings, p.turnNumber));
      setDateDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleDeleteClick = () => {
    if (menuAnchor?.pid) {
      onRemoveParticipant(menuAnchor.pid);
    }
    handleCloseMenu();
  };

  const handleSaveEdit = () => {
    if (editingParticipant) {
      onUpdateParticipant(editingParticipant);
      setEditDialogOpen(false);
      setEditingParticipant(null);
    }
  };

  const handleSaveNewDate = () => {
    if (editingParticipant && targetDate) {
      const selected = availableDates.find(d => d.date === targetDate);
      if (selected) {
        onSetTurnByDate(editingParticipant.id, selected.turn);
        setDateDialogOpen(false);
        setEditingParticipant(null);
      }
    }
  };

  const updateEditMember = (index: number, field: 'name' | 'phone', value: string) => {
    if (editingParticipant) {
      const newMembers = [...editingParticipant.members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      setEditingParticipant({ ...editingParticipant, members: newMembers });
    }
  };

  const handleImportBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const baseIndex = participants.length;
    
    const newParticipants: Participant[] = lines.map((line, i) => {
      const words = line.split(/\s+/).filter(w => w.length > 0);
      const isDuoLine = words.length === 2;
      
      return {
        id: "p-bulk-" + Date.now() + i,
        type: isDuoLine ? 'shared' : 'single',
        members: isDuoLine 
          ? [ { name: words[0], phone: "" }, { name: words[1], phone: "" } ]
          : [ { name: line, phone: "" } ],
        isPaid: false,
        turnNumber: baseIndex + i + 1
      };
    });

    onBulkImport(newParticipants);
    setBulkOpen(false);
    setBulkText("");
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6, pb: 16 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Integrantes</Typography>
          <Typography variant="caption" color="text.secondary">Total: {participants.length}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title={settings.isLocked ? "Desbloquear orden" : "Fijar orden definitivo"}>
            <Button 
              size="small" 
              variant={settings.isLocked ? "contained" : "outlined"} 
              color={settings.isLocked ? "primary" : "inherit"}
              onClick={toggleLock}
              startIcon={settings.isLocked ? <LockIcon /> : <LockOpenIcon />}
              sx={{ borderRadius: 2 }}
            >
              {settings.isLocked ? "Fijado" : "Fijar"}
            </Button>
          </Tooltip>
          {!settings.isLocked && (
            <>
              <Tooltip title="Mezclar Turnos"><IconButton onClick={onShuffle} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}><ShuffleIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Pegar Lista"><IconButton onClick={() => setBulkOpen(true)} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}><PasteIcon fontSize="small" /></IconButton></Tooltip>
            </>
          )}
        </Stack>
      </Stack>
      
      {!settings.isLocked && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2.5, 
            mb: 4, 
            borderRadius: 3, 
            bgcolor: alpha(theme.palette.background.default, 0.5), 
            border: '1px solid #E5E7EB'
          }}
        >
          <Stack spacing={2.5}>
            <FormControlLabel
              control={<Checkbox size="small" checked={isShared} onChange={e => setIsShared(e.target.checked)} />}
              label={<Typography variant="body2" color="text.secondary">👥 Es turno compartido (Pareja)</Typography>}
              sx={{ ml: -0.5, mb: -1 }}
            />
            
            <Stack spacing={1.5}>
              <TextField 
                placeholder={isShared ? "Nombre Persona 1" : "Nombre completo"}
                fullWidth 
                size="small"
                value={name1} 
                onChange={e => setName1(e.target.value)} 
                InputProps={{
                  startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                  sx: { bgcolor: 'white' }
                }}
              />
              <TextField 
                placeholder={isShared ? "+569 Teléfono 1" : "+569 12345678"} 
                fullWidth 
                size="small"
                value={phone1} 
                onChange={e => setPhone1(e.target.value)} 
                InputProps={{
                  startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                  sx: { bgcolor: 'white' }
                }}
              />
              {isShared && (
                <>
                  <TextField 
                    placeholder="Nombre Persona 2"
                    fullWidth 
                    size="small"
                    value={name2} 
                    onChange={e => setName2(e.target.value)} 
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                      sx: { bgcolor: 'white' }
                    }}
                  />
                  <TextField 
                    placeholder="+569 Teléfono 2" 
                    fullWidth 
                    size="small"
                    value={phone2} 
                    onChange={e => setPhone2(e.target.value)} 
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                      sx: { bgcolor: 'white' }
                    }}
                  />
                </>
              )}
            </Stack>

            <Button 
              variant="contained" 
              onClick={handleQuickAdd} 
              disabled={!name1.trim()}
              fullWidth
              disableElevation
              startIcon={<AddIcon />}
              sx={{ 
                borderRadius: 2,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: '#1f2937' },
                py: 1.5
              }}
            >
              Agregar a la lista
            </Button>
          </Stack>
        </Paper>
      )}

      {settings.isLocked && (
        <Alert severity="info" sx={{ mb: 4, borderRadius: 3 }}>
          El orden está bloqueado. Desbloquea para reordenar o editar integrantes.
        </Alert>
      )}

      <List sx={{ p: 0 }}>
        {participants.slice().sort((a, b) => a.turnNumber - b.turnNumber).map((p, idx) => {
          const paymentDate = calculatePaymentDate(settings, p.turnNumber);
          const dayNumber = paymentDate.split('-')[2];
          const monthShort = formatDateReadable(paymentDate).split(' ')[1].toUpperCase();

          return (
            <Card key={p.id} sx={{ mb: 1.5, border: '1px solid #E5E7EB', borderRadius: 2.5 }}>
              <ListItem 
                sx={{ py: 1.5 }} 
                secondaryAction={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {!settings.isLocked && (
                      <>
                        <IconButton size="small" disabled={idx === 0} onClick={() => onReorder(idx, idx - 1)} sx={{ borderRadius: 1.5 }}><UpIcon fontSize="small" /></IconButton>
                        <IconButton size="small" disabled={idx === participants.length - 1} onClick={() => onReorder(idx, idx + 1)} sx={{ borderRadius: 1.5 }}><DownIcon fontSize="small" /></IconButton>
                      </>
                    )}
                    <IconButton size="small" onClick={(e) => handleOpenMenu(e, p.id)} sx={{ borderRadius: 1.5 }}><MoreVertIcon fontSize="small" /></IconButton>
                  </Stack>
                }
              >
                <ListItemAvatar sx={{ minWidth: 65, textAlign: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 900 }}>
                      {monthShort}
                    </Typography>
                    <Avatar sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 800, fontSize: 14, width: 32, height: 32, borderRadius: 1.2, mx: 'auto', mb: 0.5 }}>
                      {dayNumber}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary' }}>
                      TURNO {p.turnNumber}
                    </Typography>
                  </Box>
                </ListItemAvatar>
                <ListItemText 
                  primary={
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {getParticipantName(p)}
                    </Typography>
                  } 
                  secondary={p.type === 'shared' ? "Turno compartido" : null}
                />
              </ListItem>
            </Card>
          );
        })}
      </List>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        elevation={2}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 150 } }}
      >
        <MenuItem onClick={handleEditClick} sx={{ py: 1.2 }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="subtitle2">Editar</Typography>
        </MenuItem>
        <MenuItem onClick={handleSetDateClick} sx={{ py: 1.2 }}>
          <EventIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="subtitle2">Cambiar Fecha/Turno</Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleDeleteClick} sx={{ py: 1.2, color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          <Typography variant="subtitle2">Eliminar</Typography>
        </MenuItem>
      </Menu>

      {/* Calendar Date Reorder Dialog */}
      <Dialog 
        open={dateDialogOpen} 
        onClose={() => setDateDialogOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>Asignar Turno por Fecha</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Selecciona la fecha deseada para {editingParticipant ? getParticipantName(editingParticipant) : ""}. Los demás se desplazarán.
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Elegir Fecha / Turno</InputLabel>
            <Select 
              label="Elegir Fecha / Turno"
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)}
            >
              {availableDates.map(d => (
                <MenuItem key={d.turn} value={d.date}>
                  T{d.turn} — {formatDateFull(d.date)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDateDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSaveNewDate} disabled={!targetDate}>Confirmar Cambio</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>Editar Participante</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {editingParticipant?.members.map((m, i) => (
              <Stack key={i} spacing={1.5}>
                {editingParticipant.type === 'shared' && (
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>
                    INTEGRANTE {i + 1}
                  </Typography>
                )}
                <TextField 
                  label="Nombre completo" 
                  fullWidth 
                  value={m.name} 
                  onChange={(e) => updateEditMember(i, 'name', e.target.value)} 
                />
                <TextField 
                  label="Teléfono WhatsApp" 
                  fullWidth 
                  placeholder="+569..."
                  value={m.phone} 
                  onChange={(e) => updateEditMember(i, 'phone', e.target.value)} 
                />
                {i === 0 && editingParticipant.type === 'shared' && <Divider sx={{ my: 1 }} />}
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pt: 3, fontWeight: 800 }}>Importar de Texto</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Pega una lista de nombres. <br/>
            💡 Si una línea tiene exactamente 2 nombres (ej: "Juan Pedro"), se creará como un turno compartido.
          </Typography>
          <TextField 
            multiline 
            rows={8} 
            fullWidth 
            placeholder="Juan&#10;Goku Vegeta (Compartido)&#10;Gohan..." 
            value={bulkText} 
            onChange={e => setBulkText(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setBulkOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleImportBulk}>Importar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>¿Modificar orden?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Seguro que quieres modificar el orden? Esto cambiará las fechas de pago asignadas y el calendario actual del grupo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setLockDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={() => { onUpdateSettings({ ...settings, isLocked: false }); setLockDialogOpen(false); }}>Si, modificar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

const SettingsView = ({ settings, onUpdate, onGoBack }: { settings: AppSettings, onUpdate: (s: AppSettings) => void, onGoBack: () => void }) => (
  <Container maxWidth="sm" sx={{ py: 6, pb: 16 }}>
    <Typography variant="h5" sx={{ mb: 4, fontWeight: 900 }}>Ajustes</Typography>
    <Stack spacing={3}>
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={3}>
          <TextField label="Nombre del Grupo" fullWidth value={settings.groupName} onChange={(e) => onUpdate({ ...settings, groupName: e.target.value })} />
          <TextField label="Monto Cuota ($)" type="number" fullWidth value={settings.quotaAmount} onChange={(e) => onUpdate({ ...settings, quotaAmount: Number(e.target.value) })} />
          <FormControl fullWidth>
            <InputLabel>Frecuencia</InputLabel>
            <Select label="Frecuencia" value={settings.frequency} onChange={e => onUpdate({...settings, frequency: e.target.value as Frequency})}>
               <MenuItem value="weekly">Semanal</MenuItem>
               <MenuItem value="biweekly">Quincenal (15 y Fin)</MenuItem>
               <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
            </Select>
          </FormControl>
          <Grid container spacing={2}>
             <Grid item xs={6}><TextField label="Gracia Q1" type="number" fullWidth value={settings.graceDays1} onChange={(e) => onUpdate({ ...settings, graceDays1: Number(e.target.value) })} /></Grid>
             <Grid item xs={6}><TextField label="Gracia Q2" type="number" fullWidth value={settings.graceDays2} onChange={(e) => onUpdate({ ...settings, graceDays2: Number(e.target.value) })} disabled={settings.frequency !== 'biweekly'} /></Grid>
          </Grid>
          <TextField label="Turno que cobra hoy" type="number" fullWidth value={settings.currentTurn} onChange={(e) => onUpdate({ ...settings, currentTurn: Number(e.target.value) })} />
        </Stack>
      </Card>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} fullWidth onClick={onGoBack} sx={{ borderRadius: 3 }}>Cambiar de Grupo</Button>
    </Stack>
  </Container>
);

const App = () => {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [view, setView] = useState(0); 
  const [groups, setGroups] = useState<PollaGroup[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('adminpolla_v22_dates');
    if (saved) setGroups(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('adminpolla_v22_dates', JSON.stringify(groups));
  }, [groups]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);

  const handleCreateGroup = (settings: AppSettings) => {
    const newGroup: PollaGroup = { id: "g-" + Date.now(), settings, participants: [], createdAt: Date.now() };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const updateActiveGroup = useCallback((updates: Partial<PollaGroup>) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  }, [activeGroupId]);

  const handleSetTurnByDate = (pid: string, newTurn: number) => {
    if (!activeGroup) return;
    const sorted = [...activeGroup.participants].sort((a, b) => a.turnNumber - b.turnNumber);
    const targetIdx = sorted.findIndex(p => p.id === pid);
    if (targetIdx === -1) return;
    
    const [pToMove] = sorted.splice(targetIdx, 1);
    sorted.splice(newTurn - 1, 0, pToMove);
    
    updateActiveGroup({ 
      participants: sorted.map((p, i) => ({ ...p, turnNumber: i + 1 })) 
    });
  };

  if (!activeGroupId || !activeGroup) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ListView groups={groups} onSelect={setActiveGroupId} onCreate={handleCreateGroup} onDelete={(id) => setGroups(prev => prev.filter(g => g.id !== id))} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: "env(safe-area-inset-bottom)" }}>
        {view === 0 && (
          <DashboardView 
            participants={activeGroup.participants} 
            settings={activeGroup.settings} 
            onTogglePayment={(pid) => updateActiveGroup({ 
              participants: activeGroup.participants.map(p => p.id === pid ? {...p, isPaid: !p.isPaid} : p) 
            })} 
          />
        )}
        {view === 1 && (
          <TurnsView 
            participants={activeGroup.participants} 
            settings={activeGroup.settings}
            onUpdateSettings={(s) => updateActiveGroup({ settings: s })}
            onAddParticipant={(p) => updateActiveGroup({ participants: [...activeGroup.participants, p] })} 
            onUpdateParticipant={(updatedP) => updateActiveGroup({
              participants: activeGroup.participants.map(p => p.id === updatedP.id ? updatedP : p)
            })}
            onRemoveParticipant={(pid) => updateActiveGroup({ 
              participants: activeGroup.participants.filter(p => p.id !== pid).map((p, i) => ({...p, turnNumber: i+1})) 
            })} 
            onShuffle={() => updateActiveGroup({ 
              participants: [...activeGroup.participants].sort(() => Math.random() - 0.5).map((p, i) => ({...p, turnNumber: i+1})) 
            })} 
            onReorder={(f, t) => { 
              const r = [...activeGroup.participants].sort((a,b) => a.turnNumber - b.turnNumber);
              const [rem] = r.splice(f, 1); 
              r.splice(t, 0, rem); 
              updateActiveGroup({ participants: r.map((p, i) => ({...p, turnNumber: i+1})) }); 
            }} 
            onBulkImport={(newParticipants) => updateActiveGroup({ 
              participants: [...activeGroup.participants, ...newParticipants] 
            })} 
            onSetTurnByDate={handleSetTurnByDate}
          />
        )}
        {view === 2 && <SettingsView settings={activeGroup.settings} onUpdate={(s) => updateActiveGroup({ settings: s })} onGoBack={() => { setActiveGroupId(null); setView(0); }} />}
        
        <Paper sx={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, 
          borderRadius: '16px 16px 0 0', 
          borderTop: '1px solid #E5E7EB',
          bgcolor: 'white',
          pb: "env(safe-area-inset-bottom)"
        }} elevation={0}>
          <BottomNavigation showLabels value={view} onChange={(_, v) => setView(v)} sx={{ height: 80, bgcolor: 'transparent' }}>
            <BottomNavigationAction label="Pagos" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Turnos" icon={<CalendarIcon />} />
            <BottomNavigationAction label="Ajustes" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);