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
  onTogglePayment: (id: string, memberIndex?: number) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ participants, settings, onTogglePayment }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: "", pid: "" });
  const [confirmPayment, setConfirmPayment] = useState<{ open: boolean, p: Participant | null, memberIndex?: number }>({ open: false, p: null });
  const [isMarkingMode, setIsMarkingMode] = useState(false);

  // Helper para saber si alguien pagó el turno actual
  const isParticipantPaid = (p: Participant, turn: number) => {
    // Leemos del historial de pagos
    return p.paymentHistory?.[turn] ?? false;
  };

  const isSharedMemberPaid = (p: Participant, memberIndex: number, turn: number) => {
    return p.members[memberIndex].paymentHistory?.[turn] ?? false; 
  };

  const stats = useMemo(() => {
    const totalGoal = participants.length * settings.quotaAmount;
    
    let collectedCount = 0;
    participants.forEach(p => {
      // Usamos el turno ACTUAL settings.currentTurn para calcular el progreso
      if (p.type === 'shared') {
        // En compartidos, sumamos la fracción si el miembro pagó SU parte de ESTE turno
        const paidMembers = p.members.filter((m, idx) => isSharedMemberPaid(p, idx, settings.currentTurn)).length;
        const totalMembers = p.members.length || 1;
        collectedCount += (paidMembers / totalMembers);
      } else {
        if (isParticipantPaid(p, settings.currentTurn)) collectedCount += 1;
      }
    });

    const collected = collectedCount * settings.quotaAmount;
    const progress = (collected / totalGoal) * 100 || 0;
    const recipient = participants.find((p) => p.turnNumber === settings.currentTurn);
    const baseDate = calculatePaymentDate(settings, settings.currentTurn);
    const graceDays = getGraceDaysForTurn(settings, settings.currentTurn);
    const deadlineDate = getDeadlineDate(baseDate, graceDays);
    const isFullyPaid = progress === 100 && participants.length > 0;
    
    const individualAmount = (isFullyPaid && recipient && recipient.type === 'shared' && recipient.members.length > 0) 
      ? totalGoal / recipient.members.length 
      : null;

    return { totalGoal, collected, progress, recipient, baseDate, deadlineDate, graceDays, isFullyPaid, individualAmount };
  }, [participants, settings]);

  const [lastProgress, setLastProgress] = useState(0);
  useEffect(() => {
    if (stats.progress === 100 && lastProgress < 100 && participants.length > 0) {
      triggerConfetti();
    }
    setLastProgress(stats.progress);
  }, [stats.progress, participants.length]);

  const handleCopyReport = useCallback(async () => {
    // Generar reporte detallado usando el estado del turno actual
    const paidList = participants.map(p => {
      const isPaid = isParticipantPaid(p, settings.currentTurn);
      
      if (p.type === 'shared') {
        const paidMembers = p.members.filter((m, idx) => isSharedMemberPaid(p, idx, settings.currentTurn)).map(m => m.name);
        if (paidMembers.length === 0) return null;
        if (paidMembers.length === p.members.length) return `✅ ${getParticipantName(p)}`;
        return `⚠️ ${p.members.map((m, idx) => isSharedMemberPaid(p, idx, settings.currentTurn) ? `✅ ${m.name}` : `⏳ ${m.name}`).join(' | ')}`;
      }
      return isPaid ? `✅ ${getParticipantName(p)}` : null;
    }).filter(Boolean).join("\n");

    const pendingList = participants.map(p => {
      const isPaid = isParticipantPaid(p, settings.currentTurn);

      if (p.type === 'shared') {
        const pendingMembers = p.members.filter((m, idx) => !isSharedMemberPaid(p, idx, settings.currentTurn)).map(m => m.name);
        if (pendingMembers.length === 0) return null;
        if (pendingMembers.length === p.members.length) return `⏳ ${getParticipantName(p)}`;
        return null;
      }
      return !isPaid ? `⏳ ${getParticipantName(p)}` : null;
    }).filter(Boolean).join("\n");

    const report = `📢 *REPORTE: ${settings.groupName.toUpperCase()}*\n📅 *Vence:* ${formatDateFull(stats.deadlineDate)}\n💰 *Recaudado:* ${formatCurrency(stats.collected)} / ${formatCurrency(stats.totalGoal)}\n\n*PAGOS:*\n${paidList || "_Sin pagos_"}\n\n*PENDIENTES:*\n${pendingList || "_Todo al día!_"}\n\n👉 *Receptor:* ${stats.recipient ? getParticipantName(stats.recipient) : "N/A"}`;
    await navigator.clipboard.writeText(report);
    setSnackbar({ open: true, message: "Reporte copiado", pid: "" });
  }, [participants, settings, stats]);

  const onIntentToggle = (p: Participant, memberIndex?: number) => {
    if (isMarkingMode) { 
        onTogglePayment(p.id, memberIndex); 
        return; 
    }
    setConfirmPayment({ open: true, p, memberIndex });
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
              <Typography variant="caption" color="text.secondary">
                {participants.filter(p => isParticipantPaid(p, settings.currentTurn)).length} de {participants.length} turnos completos
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 3 }}>
        <Paper className={stats.isFullyPaid ? "success-pulse" : ""} sx={{ 
          mb: 4, borderRadius: 4, transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
          bgcolor: stats.isFullyPaid ? '#F0FDF4' : '#FFFBEB', 
          border: stats.isFullyPaid ? '1px solid #BBF7D0' : '1px solid #FEF3C7',
          boxShadow: stats.isFullyPaid ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
        }}>
          <Box sx={{ bgcolor: stats.isFullyPaid ? 'secondary.main' : 'warning.main', color: 'white', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {stats.isFullyPaid ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : <ScheduleIcon sx={{ fontSize: 18 }} />}
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.05em' }}>
              {stats.isFullyPaid ? "RECAUDACIÓN LISTA" : "COBRO TURNO ACTUAL"}
            </Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2}>
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
              <Grid item xs={12} sm={5}>
                <Stack direction="row" spacing={2} sx={{ 
                  justifyContent: { xs: 'flex-start', sm: 'flex-end' }, borderLeft: { xs: 'none', sm: '1px solid rgba(0,0,0,0.05)' }, pl: { xs: 0, sm: 2 }
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>TURNO</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main', textAlign: { sm: 'center' } }}>#{settings.currentTurn}</Typography>
                  </Box>
                  <Box sx={{ textAlign: { sm: 'right' } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>VENCE EL</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: stats.isFullyPaid ? 'secondary.main' : 'primary.main', fontSize: '0.875rem' }}>{formatDateReadable(stats.deadlineDate)}</Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5, px: 0.5 }}>
          <Typography variant="h6">Integrantes</Typography>
          <Button 
            size="small" variant={isMarkingMode ? "contained" : "outlined"} 
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
            const isShared = p.type === 'shared';
            const isPaid = isParticipantPaid(p, settings.currentTurn);
            
            return (
              <Card 
                key={p.id} 
                onClick={() => {
                   if (isShared) return;
                   onIntentToggle(p);
                }}
                sx={{ 
                  cursor: isShared ? 'default' : 'pointer',
                  transition: 'background-color 0.2s',
                  bgcolor: isMarkingMode && isPaid ? "#F0FDF4" : "white",
                  borderLeft: isPaid ? '4px solid #10B981' : '4px solid #F59E0B'
                }}
              >
                <CardContent sx={{ py: "16px !important" }}>
                  <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Avatar sx={{ 
                      bgcolor: p.turnNumber === settings.currentTurn ? 'primary.main' : '#F3F4F6', 
                      color: p.turnNumber === settings.currentTurn ? 'white' : 'text.primary', 
                      fontWeight: 800, fontSize: 13, width: 34, height: 34, borderRadius: 1.5, mt: 0.5
                    }}>{p.turnNumber}</Avatar>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="subtitle1" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                             {isShared ? p.members.map(m => m.name).join(' y ') : p.members[0].name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Turno {p.turnNumber} • {formatDateReadable(plazo)}
                          </Typography>
                        </Box>
                        
                         {/* UNIFICADO: Indicador Global para NO compartidos */}
                         {!isShared && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 24 }}>
                              {isMarkingMode ? (
                                  // MODO RÁPIDO: Botones de Acción
                                  isPaid ? (
                                      // PAGADO -> DESMARCAR
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#15803d' }}>
                                          <CheckCircleIcon sx={{ fontSize: 18, color: '#15803d' }} />
                                          <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.05em' }}>DESMARCAR</Typography>
                                      </Box>
                                  ) : (
                                      // PENDIENTE -> MARCAR
                                      <Box sx={{ 
                                          display: 'flex', alignItems: 'center', gap: 0.5,
                                          bgcolor: '#F3F4F6', color: '#4B5563',
                                          px: 1, py: 0.25, borderRadius: 1
                                      }}>
                                          <EditIcon sx={{ fontSize: 14 }} />
                                          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>MARCAR</Typography>
                                      </Box>
                                  )
                              ) : (
                                  // MODO NORMAL: Estado
                                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: '#F9FAFB', p: 0.5, borderRadius: 1 }}>
                                      <DotIcon sx={{ fontSize: 10, color: isPaid ? '#10B981' : '#F59E0B' }} />
                                      <Typography variant="caption" sx={{ color: isPaid ? '#047857' : '#B45309', fontWeight: 800, letterSpacing: '0.05em' }}>
                                        {isPaid ? "PAGADO" : "PENDIENTE"}
                                      </Typography>
                                  </Stack>
                              )}
                            </Box>
                         )}
                      </Stack>

                      {isShared && (
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                          {p.members.map((m, idx) => {
                             const isMemberPaid = isSharedMemberPaid(p, idx, settings.currentTurn);
                             return (
                                <Paper 
                                  key={idx} 
                                  variant="outlined"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onIntentToggle(p, idx);
                                  }}
                                  sx={{ 
                                    p: 1.5, px: 2, 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    bgcolor: isMemberPaid ? '#F0FDF4' : 'white', 
                                    borderColor: isMemberPaid ? '#BBF7D0' : '#E5E7EB',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { bgcolor: isMemberPaid ? '#DCFCE7' : '#F9FAFB' }
                                  }}
                                >
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{m.name}</Typography>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 24 }}>
                                    {isMarkingMode ? (
                                        isMemberPaid ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#15803d' }}>
                                                <CheckCircleIcon sx={{ fontSize: 18, color: '#15803d' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.05em' }}>DESMARCAR</Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{ 
                                                display: 'flex', alignItems: 'center', gap: 0.5,
                                                bgcolor: '#F3F4F6', color: '#4B5563',
                                                px: 1, py: 0.25, borderRadius: 1
                                            }}>
                                                <EditIcon sx={{ fontSize: 14 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>MARCAR</Typography>
                                            </Box>
                                        )
                                    ) : (
                                        <>
                                          <DotIcon sx={{ fontSize: 10, color: isMemberPaid ? '#10B981' : '#F59E0B' }} />
                                          <Typography variant="caption" sx={{ color: isMemberPaid ? '#047857' : '#B45309', fontWeight: 800, letterSpacing: '0.05em' }}>
                                            {isMemberPaid ? "LISTO" : "PENDIENTE"}
                                          </Typography>
                                        </>
                                    )}
                                  </Box>
                                </Paper>
                             );
                          })}
                        </Stack>
                      )}
                    </Box>
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
      <Dialog open={confirmPayment.open} onClose={() => setConfirmPayment({ open: false, p: null })} PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 360 } }}>
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1, fontWeight: 800 }}>
           Confirmar Acción
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
           <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
             {confirmPayment.p && typeof confirmPayment.memberIndex === 'number' && confirmPayment.p.type === 'shared'
                ? confirmPayment.p.members[confirmPayment.memberIndex].name
                : (confirmPayment.p ? getParticipantName(confirmPayment.p) : "")}
           </Typography>
           
           <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
             {confirmPayment.p?.type === 'shared' 
                ? formatCurrency(settings.quotaAmount / confirmPayment.p.members.length)
                : formatCurrency(settings.quotaAmount)}
           </Typography>

           <Typography variant="body2" sx={{ bgcolor: '#FEF3C7', color: 'warning.dark', p: 1, borderRadius: 2, display: 'inline-block' }}>
              ¿Cambiar estado de pago?
           </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center', gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={() => setConfirmPayment({ open: false, p: null })} sx={{ fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button fullWidth variant="contained" color="secondary" onClick={() => { if(confirmPayment.p) { onTogglePayment(confirmPayment.p.id, confirmPayment.memberIndex); setSnackbar({ open: true, message: "Estado actualizado", pid: confirmPayment.p.id }); } setConfirmPayment({ open: false, p: null }); }} sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}>
            Confirmar
          </Button>
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
