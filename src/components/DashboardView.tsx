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
  DialogActions,
  Checkbox,
  FormControlLabel,
  Chip,
  TextField
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
  Undo as UndoIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Share as ShareIcon,
  Search as SearchIcon
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
  triggerConfetti,
  calculateCurrentTurnFromDate 
} from "@/utils/helpers";

interface DashboardViewProps {
  groupId: string; // Nuevo prop
  participants: Participant[];
  settings: AppSettings;
  onTogglePayment: (id: string, memberIndex?: number) => void;
  onBatchTogglePayment?: (updates: { pid: string, memberIndex?: number }[]) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ groupId, participants, settings, onTogglePayment, onBatchTogglePayment }) => {
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, pid: string, memberIndex?: number }>({ open: false, message: "", pid: "" });
  const [confirmPayment, setConfirmPayment] = useState<{ open: boolean, p: Participant | null, memberIndex?: number }>({ open: false, p: null });
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado para pagos relacionados (misma persona, otros turnos)
  const [relatedPayments, setRelatedPayments] = useState<{ id: string, memberIndex?: number, turnNumber: number }[]>([]);
  const [payRelated, setPayRelated] = useState(false);

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
    
    // 1. Construir lista de PAGADOS (Individuales + Miembros de compartidos que sí pagaron)
    const paidNames: string[] = [];
    
    participants.forEach(p => {
        if (p.type === 'shared') {
            // Filtrar solo los miembros que pagaron
            p.members.forEach((m, idx) => {
                if (isSharedMemberPaid(p, idx, settings.currentTurn)) {
                    paidNames.push(`✅ ${m.name}`);
                }
            });
        } else {
            // Individual
            if (isParticipantPaid(p, settings.currentTurn)) {
                paidNames.push(`✅ ${getParticipantName(p)}`);
            }
        }
    });

    const paidList = paidNames.length > 0 ? paidNames.join("\n") : "_Nadie ha pagado aún_";

    // 2. Agrupar deudas por nombre para mostrar totales consolidados
    const debts: Record<string, number> = {};
    const pendingNames: string[] = [];

    participants.forEach(p => {
      if (p.type === 'shared') {
        const amountPerMember = settings.quotaAmount / p.members.length;
        p.members.forEach((m, idx) => {
          if (!isSharedMemberPaid(p, idx, settings.currentTurn)) {
             const nameKey = m.name.trim(); 
             debts[nameKey] = (debts[nameKey] || 0) + amountPerMember;
             pendingNames.push(nameKey); // Para saber quién falta sin formateo de dinero si se prefiere
          }
        });
      } else {
        if (!isParticipantPaid(p, settings.currentTurn)) {
           const nameKey = p.members[0].name.trim();
           debts[nameKey] = (debts[nameKey] || 0) + settings.quotaAmount;
        }
      }
    });

    const pendingListFormatted = Object.entries(debts)
      .map(([name, amount]) => `⏳ ${name} (${formatCurrency(amount)})`) // Formato más limpio: Nombre (Monto)
      .sort((a, b) => a.localeCompare(b))
      .join("\n");

    const report = `📢 *ESTADO ${settings.groupName.toUpperCase()}*
🗓 *Vencimiento:* ${formatDateFull(stats.deadlineDate)}

💰 *Meta:* ${formatCurrency(stats.totalGoal)}
📈 *Avance:* ${Math.round(stats.progress)}% (${formatCurrency(stats.collected)})

👤 *Receptor Turno #${settings.currentTurn}:*
👉 *${stats.recipient ? getParticipantName(stats.recipient).toUpperCase() : "POR DEFINIR"}*

━━━━━━━━━━━━━━━━━━━━
✅ *PAGOS CONFIRMADOS:*
${paidList}

━━━━━━━━━━━━━━━━━━━━
⏳ *FALTAN POR PAGAR:*
${pendingListFormatted || "🎉 _¡Todos están al día!_"}
${pendingListFormatted ? `\n⚠️ *Regularizar a la brevedad.*` : ""}

🔗 *Ver detalle:* ${window.location.origin}/view/${groupId}`;
    
    await navigator.clipboard.writeText(report);
    setSnackbar({ open: true, message: "Reporte copiado al portapapeles", pid: "" });
  }, [participants, settings, stats, groupId]);

  const onIntentToggle = (p: Participant, memberIndex?: number) => {
    // 1. Determinar estado ACTUAL y Nombre del objetivo
    const targetIsPaid = (p.type === 'shared' && memberIndex !== undefined)
        ? isSharedMemberPaid(p, memberIndex, settings.currentTurn)
        : isParticipantPaid(p, settings.currentTurn);

    const targetName = (p.type === 'shared' && memberIndex !== undefined) 
        ? p.members[memberIndex].name.trim().toLowerCase()
        : p.members[0].name.trim().toLowerCase();

    // 2. Buscar otros items de la MISMA persona con el MISMO ESTADO
    // (Ej: Si voy a MARCAR, busco otros pendientes. Si voy a DESMARCAR, busco otros pagados)
    const related: { id: string, memberIndex?: number, turnNumber: number }[] = [];
    
    participants.forEach(other => {
       if (other.type === 'shared') {
          other.members.forEach((m, idx) => {
             if (m.name.trim().toLowerCase() === targetName) {
                 const isSameTarget = (other.id === p.id && idx === memberIndex);
                 const otherIsPaid = isSharedMemberPaid(other, idx, settings.currentTurn);
                 
                 // Solo agregamos si NO es el mismo Y tienen el mismo estado (para aplicarles el mismo cambio)
                 if (!isSameTarget && otherIsPaid === targetIsPaid) {
                     related.push({ id: other.id, memberIndex: idx, turnNumber: other.turnNumber });
                 }
             }
          });
       } else {
          // Single participant
          const m = other.members[0];
          if (m.name.trim().toLowerCase() === targetName) {
              const isSameTarget = (other.id === p.id); 
              const otherIsPaid = isParticipantPaid(other, settings.currentTurn);

              if (!isSameTarget && otherIsPaid === targetIsPaid) {
                  related.push({ id: other.id, memberIndex: undefined, turnNumber: other.turnNumber });
              }
          }
       }
    });

    setRelatedPayments(related);
    
    if (isMarkingMode) { 
        // Si hay relacionados, FORZAMOS EL DIÁLOGO para preguntar.
        if (related.length === 0) {
            onTogglePayment(p.id, memberIndex); 
            return; 
        }
    }

    setPayRelated(false); 
    setConfirmPayment({ open: true, p, memberIndex });
  };

  const filteredParticipants = useMemo(() => {
    if (!searchQuery) return participants;
    const lower = searchQuery.toLowerCase();
    return participants.filter(p => {
       if (p.type === 'shared') {
          return p.members.some(m => m.name.toLowerCase().includes(lower));
       }
       return p.members[0].name.toLowerCase().includes(lower);
    });
  }, [participants, searchQuery]);

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
        
        {(() => {
            const realTurn = calculateCurrentTurnFromDate(settings);
            if (realTurn > settings.currentTurn) {
                return (
                    <Alert 
                        severity="error" 
                        variant="filled"
                        icon={<EventIcon fontSize="inherit" />}
                        sx={{ mb: 3, borderRadius: 3, fontWeight: 700, boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' }}
                    >
                        ¡PAGOS ATRASADOS! Según la fecha, deberíamos ir en el Turno {realTurn}. No se avanzará hasta completar los pagos.
                    </Alert>
                );
            }
            return null;
        })()}

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
          <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
               {/* Izquierda: Receptor */}
               <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {stats.recipient?.type === 'shared' ? <GroupsIcon sx={{ fontSize: 16 }} /> : <PersonIcon sx={{ fontSize: 16 }} />}
                      {stats.recipient?.type === 'shared' ? 'RECEPTORES' : 'RECEPTOR'}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 900, color: '#1F2937', letterSpacing: '-0.02em' }}>
                       {stats.recipient ? getParticipantName(stats.recipient) : "Sin asignar"}
                  </Typography>
                  {stats.individualAmount && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
                       Reciben {formatCurrency(stats.individualAmount)} cada uno
                    </Typography>
                  )}
               </Box>

               {/* Derecha: Turno Badge */}
               <Paper elevation={0} sx={{ 
                   bgcolor: 'white', px: 2, py: 1, borderRadius: 3, 
                   border: '2px solid', borderColor: 'rgba(0,0,0,0.05)',
                   display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80
               }}>
                   <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.6rem' }}>TURNO</Typography>
                   <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>#{settings.currentTurn}</Typography>
               </Paper>
            </Stack>

            {/* Footer: Vencimiento */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                   Vencimiento del plazo:
                </Typography>
                <Chip 
                   icon={<EventIcon sx={{ fontSize: '18px !important' }} />}
                   label={formatDateReadable(stats.deadlineDate)}
                   sx={{ 
                       height: 32,
                       px: 1,
                       bgcolor: stats.isFullyPaid ? '#DCFCE7' : '#FEE2E2', 
                       color: stats.isFullyPaid ? '#15803d' : '#991B1B',
                       fontWeight: 800,
                       borderRadius: 2,
                       '& .MuiChip-icon': { color: 'inherit' }
                   }}
                />
            </Box>
          </Box>
        </Paper>

        <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={handleCopyReport}
            startIcon={<ContentCopyIcon />}
            sx={{ borderRadius: 3, py: 1.5, borderColor: '#E5E7EB', color: 'text.secondary', fontWeight: 600 }}
          >
            Copiar Reporte
          </Button>

          <Button 
            variant="contained" 
            fullWidth
            onClick={() => {
                 const url = `${window.location.origin}/view/${groupId}`;
                 navigator.clipboard.writeText(url);
                 setSnackbar({ open: true, message: "Enlace público copiado", pid: "" });
            }}
            startIcon={<ShareIcon />}
            sx={{ borderRadius: 3, py: 1.5, fontWeight: 700, bgcolor: '#3B82F6', '&:hover': { bgcolor: '#2563EB' } }}
          >
            Compartir Link
          </Button>
        </Stack>

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

        <TextField
            fullWidth
            placeholder="Buscar integrante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{ mb: 2, bgcolor: 'white', borderRadius: 2 }}
            size="small"
        />

        <Stack spacing={1.5}>
          {filteredParticipants.map((p) => {
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
                                            {isMemberPaid ? "PAGADO" : "PENDIENTE"}
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
           
           {relatedPayments.length > 0 && (
              <Box sx={{ mt: 2, textAlign: 'left', bgcolor: '#F3F4F6', p: 1.5, borderRadius: 2 }}>
                  <FormControlLabel 
                      sx={{ mr: 0 }}
                      control={<Checkbox size="small" checked={payRelated} onChange={e => setPayRelated(e.target.checked)} color="secondary" />}
                      label={
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                          Marcar también {relatedPayments.length} cuota(s) extra (Turnos {relatedPayments.map(r => `#${r.turnNumber}`).join(', ')})
                        </Typography>
                      }
                  />
              </Box>
           )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center', gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={() => setConfirmPayment({ open: false, p: null })} sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, borderColor: 'text.secondary', color: 'text.primary' }}>
            Cancelar
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            color="secondary" 
            onClick={() => { 
                if(confirmPayment.p) { 
                    if (payRelated && onBatchTogglePayment) {
                        // Construir array de updates: Principal + Relacionados
                        const updates = [
                            { pid: confirmPayment.p.id, memberIndex: confirmPayment.memberIndex },
                            ...relatedPayments.map(r => ({ pid: r.id, memberIndex: r.memberIndex }))
                        ];
                        onBatchTogglePayment(updates);
                        setSnackbar({ 
                          open: true, 
                          message: `Se actualizaron ${updates.length} pagos`, 
                          pid: confirmPayment.p.id,
                          memberIndex: confirmPayment.memberIndex
                        });
                    } else {
                        // Pago simple (o sin soporte de batch)
                        onTogglePayment(confirmPayment.p.id, confirmPayment.memberIndex); 
                        setSnackbar({ 
                          open: true, 
                          message: "Estado actualizado", 
                          pid: confirmPayment.p.id,
                          memberIndex: confirmPayment.memberIndex
                        }); 
                    }
                } 
                setConfirmPayment({ open: false, p: null }); 
            }} 
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 40, sm: 40 } }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success" 
          variant="filled" 
          sx={{ 
            width: '100%', 
            borderRadius: 4, 
            bgcolor: '#111827', // Dark Gray / Black
            color: 'white',
            fontWeight: 600,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            alignItems: 'center',
            '& .MuiAlert-icon': { color: '#4ADE80' } // Green icon
          }} 
          action={
            snackbar.pid && (
              <Button color="inherit" size="small" onClick={() => onTogglePayment(snackbar.pid, snackbar.memberIndex)} startIcon={<UndoIcon />} sx={{ textTransform: 'none', fontWeight: 700, ml: 1 }}>
                Deshacer
              </Button>
            )
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardView;
