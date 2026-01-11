import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Stack,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
  Payments as PaymentsIcon,
  Schedule as ScheduleIcon,
  Savings as SavingsIcon,
  Groups as GroupsIcon,
  Edit as EditIcon,
  DoneAll as DoneAllIcon,
  FiberManualRecord as DotIcon,
  Undo as UndoIcon
} from "@mui/icons-material";
import { AppSettings, Participant } from "@/types";
import { 
  formatCurrency, 
  formatDateReadable, 
  formatDateFull, 
  calculatePaymentDate, 
  getGraceDaysForTurn, 
  getDeadlineDate, 
  getParticipantName, 
  triggerConfetti 
} from "@/utils/helpers";

interface DashboardViewProps {
  participants: Participant[];
  settings: AppSettings;
  onTogglePayment: (id: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ participants, settings, onTogglePayment }) => {
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

export default DashboardView;
