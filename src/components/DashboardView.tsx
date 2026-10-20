import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Typography,
  Container,
  Box,
  Avatar,
  IconButton,
  LinearProgress,
  Snackbar,
  Alert,
  Stack,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Chip,
  TextField,
  Collapse
} from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Groups as GroupsIcon,
  Edit as EditIcon,
  DoneAll as DoneAllIcon,
  FiberManualRecord as DotIcon,
  Undo as UndoIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Share as ShareIcon,
  Search as SearchIcon,
  AccountBalance as BankIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon
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
  groupId: string;
  participants: Participant[];
  settings: AppSettings;
  onTogglePayment: (id: string, memberIndex?: number) => void;
  onBatchTogglePayment?: (updates: { pid: string, memberIndex?: number }[]) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  groupId, 
  participants, 
  settings, 
  onTogglePayment, 
  onBatchTogglePayment 
}) => {
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, pid: string, memberIndex?: number }>({ 
    open: false, 
    message: "", 
    pid: "" 
  });
  const [confirmPayment, setConfirmPayment] = useState<{ open: boolean, p: Participant | null, memberIndex?: number }>({ 
    open: false, 
    p: null 
  });
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedBank, setCopiedBank] = useState(false);
  const [expandedShared, setExpandedShared] = useState<Record<string, boolean>>({});

  const [relatedPayments, setRelatedPayments] = useState<{ id: string, memberIndex?: number, turnNumber: number }[]>([]);
  const [payRelated, setPayRelated] = useState(false);

  const isParticipantPaid = (p: Participant, turn: number) => {
    return p.paymentHistory?.[turn] ?? false;
  };

  const isSharedMemberPaid = (p: Participant, memberIndex: number, turn: number) => {
    return p.members[memberIndex]?.paymentHistory?.[turn] ?? false; 
  };

  const stats = useMemo(() => {
    const totalGoal = participants.length * settings.quotaAmount;
    
    let collectedCount = 0;
    participants.forEach(p => {
      if (p.type === 'shared') {
        const paidMembers = p.members.filter((_, idx) => isSharedMemberPaid(p, idx, settings.currentTurn)).length;
        const totalMembers = p.members.length || 1;
        collectedCount += (paidMembers / totalMembers);
      } else {
        if (isParticipantPaid(p, settings.currentTurn)) collectedCount += 1;
      }
    });

    const collected = collectedCount * settings.quotaAmount;
    const progress = totalGoal > 0 ? (collected / totalGoal) * 100 : 0;
    const recipient = participants.find((p) => p.turnNumber === settings.currentTurn);
    const baseDate = calculatePaymentDate(settings, settings.currentTurn);
    const graceDays = getGraceDaysForTurn(settings, settings.currentTurn);
    const deadlineDate = getDeadlineDate(baseDate, graceDays);
    const isFullyPaid = progress >= 100 && participants.length > 0;
    
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
    const paidNames: string[] = [];
    
    participants.forEach(p => {
      if (p.type === 'shared') {
        p.members.forEach((m, idx) => {
          if (isSharedMemberPaid(p, idx, settings.currentTurn)) {
            paidNames.push(`✅ ${m.name}`);
          }
        });
      } else {
        if (isParticipantPaid(p, settings.currentTurn)) {
          paidNames.push(`✅ ${getParticipantName(p)}`);
        }
      }
    });

    const paidList = paidNames.length > 0 ? paidNames.join("\n") : "_Nadie ha pagado aún_";

    const debts: Record<string, number> = {};
    participants.forEach(p => {
      if (p.type === 'shared') {
        const amountPerMember = settings.quotaAmount / p.members.length;
        p.members.forEach((m, idx) => {
          if (!isSharedMemberPaid(p, idx, settings.currentTurn)) {
            const nameKey = m.name.trim(); 
            debts[nameKey] = (debts[nameKey] || 0) + amountPerMember;
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
      .map(([name, amount]) => `⏳ ${name} (${formatCurrency(amount)})`)
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
    const targetIsPaid = (p.type === 'shared' && memberIndex !== undefined)
      ? isSharedMemberPaid(p, memberIndex, settings.currentTurn)
      : isParticipantPaid(p, settings.currentTurn);

    const targetName = (p.type === 'shared' && memberIndex !== undefined) 
      ? p.members[memberIndex].name.trim().toLowerCase()
      : p.members[0].name.trim().toLowerCase();

    const related: { id: string, memberIndex?: number, turnNumber: number }[] = [];
    
    participants.forEach(other => {
      if (other.type === 'shared') {
        other.members.forEach((m, idx) => {
          if (m.name.trim().toLowerCase() === targetName) {
            const isSameTarget = (other.id === p.id && idx === memberIndex);
            const otherIsPaid = isSharedMemberPaid(other, idx, settings.currentTurn);
            if (!isSameTarget && otherIsPaid === targetIsPaid) {
              related.push({ id: other.id, memberIndex: idx, turnNumber: other.turnNumber });
            }
          }
        });
      } else {
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

  const recipientBankDetails = useMemo(() => {
    if (!stats.recipient) return null;
    const details = stats.recipient.members
      .map(m => m.bankDetails?.trim())
      .filter(Boolean);
    return details.length > 0 ? details.join("\n\n---\n\n") : null;
  }, [stats.recipient]);

  const handleCopyBank = async () => {
    if (recipientBankDetails) {
      await navigator.clipboard.writeText(recipientBankDetails);
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
      setSnackbar({ open: true, message: "Datos bancarios copiados", pid: "" });
    }
  };

  return (
    <Box sx={{ pb: 16 }}>
      {/* ─── Encabezado de Recaudación (CLARO en Modo Día, Oscuro en Modo Noche) ─── */}
      <Box 
        sx={{ 
          pt: 3.5, 
          pb: 3.5, 
          px: 2.5, 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          transition: 'background-color 0.2s ease'
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Stack spacing={2}>
            {/* Header: Nombre del grupo y Turno */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 700, 
                  letterSpacing: '0.05em'
                }}
              >
                {settings.groupName || "Mi Polla"}
              </Typography>
              <Chip
                label={`Turno #${settings.currentTurn}`}
                size="small"
                sx={{
                  bgcolor: stats.isFullyPaid ? 'surface.paid' : 'surface.muted',
                  color: stats.isFullyPaid ? 'secondary.main' : 'text.primary',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  border: 1,
                  borderColor: 'divider'
                }}
              />
            </Stack>

            {/* Monto Recaudado y Meta */}
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 600, 
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 0.25
                }}
              >
                RECAUDACIÓN TURNO ACTUAL
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
                <Typography 
                  variant="h3" 
                  component="span"
                  sx={{ 
                    fontWeight: 900, 
                    color: stats.isFullyPaid ? 'secondary.main' : 'text.primary',
                    fontSize: { xs: '2.2rem', sm: '2.8rem' },
                    lineHeight: 1.1
                  }}
                >
                  {formatCurrency(stats.collected)}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  component="span"
                  sx={{ 
                    color: 'text.secondary', 
                    fontWeight: 600 
                  }}
                >
                  / {formatCurrency(stats.totalGoal)}
                </Typography>
                {stats.isFullyPaid && (
                  <IconButton 
                    size="small" 
                    onClick={() => triggerConfetti()} 
                    sx={{ color: 'warning.main', ml: 0.5 }}
                  >
                    <CelebrationIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Box>

            {/* Barra de Progreso */}
            <Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(stats.progress, 100)} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3, 
                  bgcolor: 'surface.muted', 
                  '& .MuiLinearProgress-bar': { 
                    bgcolor: stats.isFullyPaid ? 'success.main' : 'secondary.main',
                    borderRadius: 3 
                  } 
                }} 
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: stats.isFullyPaid ? 'secondary.main' : 'text.secondary', 
                    fontWeight: 700,
                    fontSize: '0.75rem' 
                  }}
                >
                  {stats.isFullyPaid ? "🎉 ¡100% RECAUDADO!" : `${Math.round(stats.progress)}% completado`}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  {participants.filter(p => isParticipantPaid(p, settings.currentTurn)).length} de {participants.length} cuotas completas
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ─── Contenido Principal ─── */}
      <Container maxWidth="sm" sx={{ mt: 2.5, px: 2 }}>
        
        {/* Alerta de Atraso por Fecha */}
        {(() => {
          const realTurn = calculateCurrentTurnFromDate(settings);
          if (realTurn > settings.currentTurn) {
            return (
              <Alert 
                severity="error" 
                variant="filled"
                icon={<EventIcon fontSize="inherit" />}
                sx={{ 
                  mb: 2.5, 
                  borderRadius: 2, 
                  fontWeight: 700, 
                  boxShadow: 'none' 
                }}
              >
                ¡PAGOS ATRASADOS! Según la fecha, deberíamos ir en el Turno #{realTurn}. No avanzará hasta completar los pagos.
              </Alert>
            );
          }
          return null;
        })()}

        {/* ─── Card del Receptor (Bordes Sobrios 8-10px) ─── */}
        <Paper 
          sx={{ 
            mb: 2.5, 
            borderRadius: 2.5, 
            overflow: 'hidden',
            border: 1,
            borderColor: stats.isFullyPaid ? 'secondary.main' : 'divider',
            bgcolor: 'background.paper',
            boxShadow: 'none'
          }}
        >
          <Box 
            sx={{ 
              bgcolor: stats.isFullyPaid ? 'surface.paid' : 'surface.muted', 
              color: 'text.primary', 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              {stats.isFullyPaid ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
              ) : (
                <ScheduleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              )}
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
                {stats.isFullyPaid ? "LISTO PARA ENTREGAR" : "RECEPTOR DE ESTE TURNO"}
              </Typography>
            </Stack>
            <Chip 
              icon={<EventIcon sx={{ fontSize: '14px !important' }} />}
              label={formatDateReadable(stats.deadlineDate)}
              size="small"
              sx={{ 
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 700,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider'
              }}
            />
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ flex: 1, pr: 1.5 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    fontSize: '0.68rem'
                  }}
                >
                  {stats.recipient?.type === 'shared' ? <GroupsIcon sx={{ fontSize: 15 }} /> : <PersonIcon sx={{ fontSize: 15 }} />}
                  {stats.recipient?.type === 'shared' ? 'Beneficiarios (Compartido)' : 'Beneficiario'}
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    mt: 0.25, 
                    fontWeight: 900, 
                    color: 'text.primary',
                    lineHeight: 1.2
                  }}
                >
                  {stats.recipient ? getParticipantName(stats.recipient) : "Sin asignar"}
                </Typography>
                {stats.individualAmount && (
                  <Typography variant="body2" sx={{ color: 'secondary.main', fontWeight: 700, mt: 0.25 }}>
                    {formatCurrency(stats.individualAmount)} para cada uno
                  </Typography>
                )}
              </Box>

              <Paper 
                elevation={0} 
                sx={{ 
                  bgcolor: 'surface.muted', 
                  px: 1.5, 
                  py: 1, 
                  borderRadius: 2, 
                  border: 1, 
                  borderColor: 'divider',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  minWidth: 64
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.6rem' }}>TURNO</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: 'secondary.main', lineHeight: 1 }}>#{settings.currentTurn}</Typography>
              </Paper>
            </Stack>

            {/* Botón para copiar datos bancarios */}
            {recipientBankDetails && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={handleCopyBank}
                  startIcon={copiedBank ? <CheckIcon color="success" /> : <BankIcon />}
                  sx={{
                    borderRadius: 2,
                    py: 0.8,
                    borderColor: 'divider',
                    color: 'text.primary',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    bgcolor: 'surface.muted',
                    '&:hover': { bgcolor: 'background.paper' }
                  }}
                >
                  {copiedBank ? "¡Datos bancarios copiados!" : "Copiar datos de transferencia"}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        {/* ─── Botones de Acción (Copiar / Compartir) ─── */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={handleCopyReport}
            startIcon={<ContentCopyIcon />}
            sx={{ 
              borderRadius: 2, 
              py: 1.2, 
              borderColor: 'divider', 
              color: 'text.primary', 
              fontWeight: 700,
              bgcolor: 'background.paper',
              '&:hover': { borderColor: 'text.secondary', bgcolor: 'surface.muted' }
            }}
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
            sx={{ 
              borderRadius: 2, 
              py: 1.2, 
              fontWeight: 700, 
              bgcolor: 'accent.main',
              color: '#FFFFFF',
              '&:hover': { bgcolor: '#1D4ED8' }
            }}
          >
            Compartir Link
          </Button>
        </Stack>

        {/* ─── Lista de Integrantes (Diseño Sobrio y Limpio) ─── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 0.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Integrantes</Typography>
            <Chip 
              label={participants.length} 
              size="small" 
              sx={{ bgcolor: 'surface.muted', fontWeight: 800, fontSize: '0.72rem', height: 22 }} 
            />
          </Stack>
          <Button 
            size="small" 
            variant={isMarkingMode ? "contained" : "outlined"} 
            color={isMarkingMode ? "secondary" : "inherit"}
            startIcon={isMarkingMode ? <DoneAllIcon /> : <EditIcon />}
            onClick={() => setIsMarkingMode(!isMarkingMode)}
            sx={{ 
              borderRadius: 2, 
              px: 1.5, 
              height: 34, 
              fontSize: '0.78rem',
              fontWeight: 700,
              borderColor: 'divider'
            }}
          >
            {isMarkingMode ? "Listo" : "Marcar rápido"}
          </Button>
        </Stack>

        {/* Buscador */}
        <TextField
          fullWidth
          placeholder="Buscar por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />,
          }}
          sx={{ 
            mb: 2, 
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              borderRadius: 2,
              fontSize: '16px'
            }
          }}
          size="small"
        />

        {/* Contenedor de Integrantes con curvas sobrias */}
        <Paper 
          sx={{ 
            borderRadius: 2.5, 
            overflow: 'hidden', 
            border: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          {filteredParticipants.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No se encontraron integrantes con "{searchQuery}"
              </Typography>
            </Box>
          ) : (
            filteredParticipants.map((p, idx) => {
              const isShared = p.type === 'shared';
              const isPaid = isParticipantPaid(p, settings.currentTurn);
              const isRecipient = p.turnNumber === settings.currentTurn;
              const hasDivider = idx < filteredParticipants.length - 1;
              const isExpanded = !!expandedShared[p.id];

              return (
                <Box key={p.id}>
                  {/* Fila del Participante */}
                  <Box
                    onClick={() => {
                      if (isShared) {
                        setExpandedShared(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                        return;
                      }
                      onIntentToggle(p);
                    }}
                    sx={{
                      p: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: 'pointer',
                      bgcolor: isPaid ? 'surface.paid' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: isPaid ? 'surface.paid' : 'surface.muted'
                      },
                      borderBottom: hasDivider || (isShared && isExpanded) ? 1 : 0,
                      borderColor: 'divider'
                    }}
                  >
                    {/* Avatar con número de turno */}
                    <Avatar 
                      sx={{ 
                        width: 34, 
                        height: 34, 
                        bgcolor: isRecipient 
                          ? 'secondary.main' 
                          : isPaid 
                            ? 'success.main' 
                            : 'surface.muted',
                        color: isRecipient || isPaid ? '#FFFFFF' : 'text.primary',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        borderRadius: 1.5
                      }}
                    >
                      {p.turnNumber}
                    </Avatar>

                    {/* Nombre y detalles */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 700, 
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.9rem'
                          }}
                        >
                          {isShared ? p.members.map(m => m.name).join(' y ') : p.members[0].name}
                        </Typography>
                        {isShared && (
                          <Chip 
                            label="Compartido" 
                            size="small" 
                            sx={{ 
                              height: 18, 
                              fontSize: '0.62rem', 
                              fontWeight: 700,
                              bgcolor: 'surface.muted',
                              color: 'text.secondary' 
                            }} 
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', mt: 0.2, display: 'block' }}>
                        Turno #{p.turnNumber} {isRecipient ? '• 👑 Receptor actual' : ''}
                      </Typography>
                    </Box>

                    {/* Estado de pago a la derecha */}
                    {!isShared ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isMarkingMode ? (
                          isPaid ? (
                            <Chip
                              label="DESMARCAR"
                              size="small"
                              icon={<CheckCircleIcon sx={{ fontSize: '15px !important' }} />}
                              sx={{
                                bgcolor: 'success.main',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                height: 28,
                                borderRadius: 1.5,
                                '& .MuiChip-icon': { color: '#FFFFFF' }
                              }}
                            />
                          ) : (
                            <Chip
                              label="MARCAR"
                              size="small"
                              icon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                              sx={{
                                bgcolor: 'surface.muted',
                                color: 'text.primary',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                height: 28,
                                borderRadius: 1.5
                              }}
                            />
                          )
                        ) : (
                          <Chip
                            label={isPaid ? "PAGADO" : "PENDIENTE"}
                            size="small"
                            icon={<DotIcon sx={{ fontSize: '10px !important', color: isPaid ? 'success.main' : 'warning.main' }} />}
                            sx={{
                              bgcolor: isPaid ? 'surface.paid' : 'surface.pending',
                              color: isPaid ? 'success.main' : 'warning.main',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              height: 24,
                              borderRadius: 1.5,
                              border: 1,
                              borderColor: isPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(217, 119, 6, 0.25)'
                            }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          label={isPaid ? "PAGADO" : "COMPARTIDO"}
                          size="small"
                          icon={<DotIcon sx={{ fontSize: '10px !important', color: isPaid ? 'success.main' : 'warning.main' }} />}
                          sx={{
                            bgcolor: isPaid ? 'surface.paid' : 'surface.pending',
                            color: isPaid ? 'success.main' : 'warning.main',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            height: 24,
                            borderRadius: 1.5
                          }}
                        />
                        <IconButton size="small" sx={{ p: 0.25, color: 'text.secondary' }}>
                          <ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>

                  {/* Sub-filas para miembros compartidos */}
                  {isShared && (
                    <Collapse in={isExpanded || isMarkingMode}>
                      <Box sx={{ bgcolor: 'surface.muted', py: 1, px: 2, borderBottom: hasDivider ? 1 : 0, borderColor: 'divider' }}>
                        <Stack spacing={0.75}>
                          {p.members.map((m, mIdx) => {
                            const isMemberPaid = isSharedMemberPaid(p, mIdx, settings.currentTurn);
                            return (
                              <Paper
                                key={mIdx}
                                elevation={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onIntentToggle(p, mIdx);
                                }}
                                sx={{
                                  p: 1.25,
                                  px: 1.75,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderRadius: 1.5,
                                  bgcolor: isMemberPaid ? 'surface.paid' : 'background.paper',
                                  border: 1,
                                  borderColor: isMemberPaid ? 'success.main' : 'divider',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
                                    {m.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    Cuota: {formatCurrency(Math.floor(settings.quotaAmount / p.members.length))}
                                  </Typography>
                                </Box>

                                <Chip
                                  label={isMemberPaid ? "PAGADO" : "PENDIENTE"}
                                  size="small"
                                  icon={<DotIcon sx={{ fontSize: '10px !important', color: isMemberPaid ? 'success.main' : 'warning.main' }} />}
                                  sx={{
                                    bgcolor: isMemberPaid ? 'surface.paid' : 'surface.pending',
                                    color: isMemberPaid ? 'success.main' : 'warning.main',
                                    fontWeight: 800,
                                    fontSize: '0.65rem',
                                    height: 22,
                                    borderRadius: 1.5
                                  }}
                                />
                              </Paper>
                            );
                          })}
                        </Stack>
                      </Box>
                    </Collapse>
                  )}
                </Box>
              );
            })
          )}
        </Paper>
      </Container>

      {/* ─── Diálogo de Confirmación de Pago ─── */}
      <Dialog 
        open={confirmPayment.open} 
        onClose={() => setConfirmPayment({ open: false, p: null })} 
        PaperProps={{ 
          sx: { 
            borderRadius: 2.5, 
            width: '100%', 
            maxWidth: 360,
            p: 1,
            bgcolor: 'background.paper'
          } 
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 2.5, pb: 0.5, fontWeight: 900 }}>
          Confirmar Estado de Pago
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5, color: 'text.primary' }}>
            {confirmPayment.p && typeof confirmPayment.memberIndex === 'number' && confirmPayment.p.type === 'shared'
              ? confirmPayment.p.members[confirmPayment.memberIndex].name
              : (confirmPayment.p ? getParticipantName(confirmPayment.p) : "")}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
            {confirmPayment.p?.type === 'shared' 
              ? formatCurrency(settings.quotaAmount / confirmPayment.p.members.length)
              : formatCurrency(settings.quotaAmount)}
          </Typography>

          <Box sx={{ bgcolor: 'surface.pending', color: 'warning.main', p: 1.25, borderRadius: 2, display: 'inline-block' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              ¿Deseas cambiar el estado del turno #{settings.currentTurn}?
            </Typography>
          </Box>
          
          {relatedPayments.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'left', bgcolor: 'surface.muted', p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <FormControlLabel 
                sx={{ mr: 0 }}
                control={
                  <Checkbox 
                    size="small" 
                    checked={payRelated} 
                    onChange={e => setPayRelated(e.target.checked)} 
                    color="secondary" 
                  />
                }
                label={
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Marcar también {relatedPayments.length} cuota(s) extra (Turnos {relatedPayments.map(r => `#${r.turnNumber}`).join(', ')})
                  </Typography>
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center', gap: 1 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => setConfirmPayment({ open: false, p: null })} 
            sx={{ 
              borderRadius: 2, 
              fontWeight: 700, 
              minHeight: 44, 
              borderColor: 'divider', 
              color: 'text.secondary' 
            }}
          >
            Cancelar
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            color="secondary" 
            onClick={() => { 
              if (confirmPayment.p) { 
                if (payRelated && onBatchTogglePayment) {
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
                  onTogglePayment(confirmPayment.p.id, confirmPayment.memberIndex); 
                  setSnackbar({ 
                    open: true, 
                    message: "Estado de pago actualizado", 
                    pid: confirmPayment.p.id,
                    memberIndex: confirmPayment.memberIndex
                  }); 
                }
              } 
              setConfirmPayment({ open: false, p: null }); 
            }} 
            sx={{ 
              minHeight: 44, 
              borderRadius: 2, 
              fontWeight: 700,
              bgcolor: 'secondary.main',
              color: '#FFFFFF'
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─── */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 80, sm: 80 } }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success" 
          variant="filled" 
          sx={{ 
            width: '100%', 
            borderRadius: 2, 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText',
            fontWeight: 700,
            alignItems: 'center',
            '& .MuiAlert-icon': { color: 'secondary.main' }
          }} 
          action={
            snackbar.pid && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => onTogglePayment(snackbar.pid, snackbar.memberIndex)} 
                startIcon={<UndoIcon />} 
                sx={{ textTransform: 'none', fontWeight: 800, ml: 1 }}
              >
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
