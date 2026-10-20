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
  Divider
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
  Check as CheckIcon
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
  isAdmin?: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  groupId, 
  participants, 
  settings, 
  onTogglePayment, 
  onBatchTogglePayment,
  isAdmin = true
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
    if (!isAdmin) return;
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

  // Cuotas pagadas totales
  const paidCount = participants.filter(p => isParticipantPaid(p, settings.currentTurn)).length;

  return (
    <Box sx={{ pb: 16 }}>
      {/* ─── Encabezado de Recaudación (Limpio y Claro en Modo Día) ─── */}
      <Box 
        sx={{ 
          pt: 3, 
          pb: 3, 
          px: 2.5, 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Stack spacing={2}>
            {/* Header: Nombre del grupo y Badge del Turno Actual */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary', 
                    fontWeight: 700, 
                    letterSpacing: '0.04em'
                  }}
                >
                  GRUPO ACTIVO
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 900, 
                    color: 'text.primary',
                    lineHeight: 1.1
                  }}
                >
                  {settings.groupName || "Mi Polla"}
                </Typography>
              </Box>

              <Chip
                label={`TURNO #${settings.currentTurn}`}
                size="small"
                sx={{
                  bgcolor: stats.isFullyPaid ? 'surface.paid' : 'surface.muted',
                  color: stats.isFullyPaid ? 'secondary.main' : 'text.primary',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  border: 1,
                  borderColor: stats.isFullyPaid ? 'secondary.main' : 'divider'
                }}
              />
            </Stack>

            {/* Panel de Métricas Financieras (KPIs limpios) */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: stats.isFullyPaid ? 'surface.paid' : 'surface.muted',
                border: 1,
                borderColor: stats.isFullyPaid ? 'secondary.main' : 'divider'
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>
                      RECAUDACIÓN ACTUAL
                    </Typography>
                    <Stack direction="row" alignItems="baseline" spacing={0.75}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 900, 
                          color: stats.isFullyPaid ? 'secondary.main' : 'text.primary',
                          lineHeight: 1.1,
                          fontSize: { xs: '1.9rem', sm: '2.3rem' }
                        }}
                      >
                        {formatCurrency(stats.collected)}
                      </Typography>
                      {stats.isFullyPaid && (
                        <IconButton 
                          size="small" 
                          onClick={() => triggerConfetti()} 
                          sx={{ color: 'warning.main', p: 0.5 }}
                        >
                          <CelebrationIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>
                      META TOTAL
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.secondary', lineHeight: 1.1 }}>
                      {formatCurrency(stats.totalGoal)}
                    </Typography>
                  </Box>
                </Stack>

                {/* Barra de Progreso y Porcentaje */}
                <Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(stats.progress, 100)} 
                    sx={{ 
                      height: 7, 
                      borderRadius: 3.5, 
                      bgcolor: 'background.paper', 
                      border: 1,
                      borderColor: 'divider',
                      '& .MuiLinearProgress-bar': { 
                        bgcolor: stats.isFullyPaid ? 'success.main' : 'secondary.main',
                        borderRadius: 3.5 
                      } 
                    }} 
                  />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: stats.isFullyPaid ? 'secondary.main' : 'text.primary', 
                        fontWeight: 800,
                        fontSize: '0.72rem' 
                      }}
                    >
                      {stats.isFullyPaid ? "🎉 ¡100% RECAUDADO!" : `${Math.round(stats.progress)}% recaudado`}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem' }}
                    >
                      {paidCount} de {participants.length} cuotas al día
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
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
                  mb: 2, 
                  borderRadius: 2, 
                  fontWeight: 700 
                }}
              >
                ¡PAGOS ATRASADOS! Según la fecha, deberíamos ir en el Turno #{realTurn}. No avanzará hasta completar los pagos.
              </Alert>
            );
          }
          return null;
        })()}

        {/* ─── Card del Beneficiario / Receptor ─── */}
        <Paper 
          sx={{ 
            mb: 2.5, 
            borderRadius: 2, 
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
              icon={<EventIcon sx={{ fontSize: '13px !important' }} />}
              label={`Plazo: ${formatDateReadable(stats.deadlineDate)}`}
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
                  borderRadius: 1.5, 
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

            {recipientBankDetails && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={handleCopyBank}
                  startIcon={copiedBank ? <CheckIcon color="success" /> : <BankIcon />}
                  sx={{
                    borderRadius: 1.5,
                    py: 0.75,
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

        {/* ─── Botones de Acción (Copiar Reporte / Compartir Enlace) ─── */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={handleCopyReport}
            startIcon={<ContentCopyIcon />}
            sx={{ 
              borderRadius: 2, 
              py: 1.25, 
              minHeight: 46,
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
              py: 1.25, 
              minHeight: 46,
              fontWeight: 700, 
              bgcolor: 'accent.main',
              color: '#FFFFFF',
              '&:hover': { bgcolor: '#1D4ED8' }
            }}
          >
            Compartir Link
          </Button>
        </Stack>

        {/* ─── Lista de Integrantes y Pagos ─── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 0.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Integrantes</Typography>
            <Chip 
              label={`${participants.length} turnos`} 
              size="small" 
              sx={{ bgcolor: 'surface.muted', fontWeight: 800, fontSize: '0.72rem', height: 22, borderRadius: 1.5 }} 
            />
          </Stack>
          {isAdmin && (
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
          )}
        </Stack>

        {/* Buscador */}
        <TextField
          fullWidth
          placeholder="Buscar integrante..."
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

        {/* ─── Contenedor de Participantes (Sin colapsar, ambos miembros visibles directamente) ─── */}
        <Paper 
          sx={{ 
            borderRadius: 2, 
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

              // RENDERIZADO PARTICIPANTE INDIVIDUAL
              if (!isShared) {
                return (
                  <Box
                    key={p.id}
                    onClick={() => onIntentToggle(p)}
                    sx={{
                      p: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: isAdmin ? 'pointer' : 'default',
                      bgcolor: isPaid ? 'surface.paid' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: isPaid ? 'surface.paid' : 'surface.muted'
                      },
                      borderBottom: hasDivider ? 1 : 0,
                      borderColor: 'divider'
                    }}
                  >
                    {/* Avatar de Turno */}
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
                        {p.members[0].name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', mt: 0.2, display: 'block' }}>
                        Turno #{p.turnNumber} • Cuota: {formatCurrency(settings.quotaAmount)} {isRecipient ? '• 👑 Beneficiario' : ''}
                      </Typography>
                    </Box>

                    {/* Botón de Estado */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                  </Box>
                );
              }

              // RENDERIZADO PARTICIPANTE COMPARTIDO (AMBOS MIEMBROS VISIBLES DIRECTAMENTE)
              const halfQuota = Math.floor(settings.quotaAmount / (p.members.length || 2));
              const allPaid = p.members.every((_, mIdx) => isSharedMemberPaid(p, mIdx, settings.currentTurn));

              return (
                <Box
                  key={p.id}
                  sx={{
                    p: 1.75,
                    bgcolor: allPaid ? 'surface.paid' : 'transparent',
                    borderBottom: hasDivider ? 1 : 0,
                    borderColor: 'divider',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    {/* Avatar de Turno Compartido */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.25 }}>
                      <Avatar 
                        sx={{ 
                          width: 34, 
                          height: 34, 
                          bgcolor: isRecipient 
                            ? 'secondary.main' 
                            : allPaid 
                              ? 'success.main' 
                              : 'surface.muted',
                          color: isRecipient || allPaid ? '#FFFFFF' : 'text.primary',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          borderRadius: 1.5
                        }}
                      >
                        {p.turnNumber}
                      </Avatar>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.58rem', 
                          fontWeight: 800, 
                          color: 'text.secondary', 
                          mt: 0.5,
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase'
                        }}
                      >
                        Pareja
                      </Typography>
                    </Box>

                    {/* Contenedor Directo de Ambos Miembros (Sin necesidad de desplegar) */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack spacing={1}>
                        {p.members.map((m, mIdx) => {
                          const isMemberPaid = isSharedMemberPaid(p, mIdx, settings.currentTurn);
                          return (
                            <Paper
                              key={mIdx}
                              elevation={0}
                              onClick={() => onIntentToggle(p, mIdx)}
                              sx={{
                                p: 1,
                                px: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderRadius: 1.5,
                                bgcolor: isMemberPaid ? 'surface.paid' : 'surface.muted',
                                border: 1,
                                borderColor: isMemberPaid ? 'success.main' : 'divider',
                                cursor: isAdmin ? 'pointer' : 'default',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  borderColor: 'secondary.main',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                }
                              }}
                            >
                              <Box sx={{ minWidth: 0, pr: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: 'text.primary', 
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {m.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                  Cuota 1/2: {formatCurrency(halfQuota)}
                                </Typography>
                              </Box>

                              {/* Chip/Botón de pago individual del miembro */}
                              <Chip
                                label={isMemberPaid ? "PAGADO" : "PENDIENTE"}
                                size="small"
                                icon={<DotIcon sx={{ fontSize: '10px !important', color: isMemberPaid ? 'success.main' : 'warning.main' }} />}
                                sx={{
                                  bgcolor: isMemberPaid ? 'surface.paid' : 'surface.pending',
                                  color: isMemberPaid ? 'success.main' : 'warning.main',
                                  fontWeight: 800,
                                  fontSize: '0.65rem',
                                  height: 24,
                                  borderRadius: 1.5,
                                  border: 1,
                                  borderColor: isMemberPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(217, 119, 6, 0.25)'
                                }}
                              />
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Stack>
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
            borderRadius: 2, 
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

          <Box sx={{ bgcolor: 'surface.pending', color: 'warning.main', p: 1.25, borderRadius: 1.5, display: 'inline-block' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              ¿Deseas cambiar el estado de pago del turno #{settings.currentTurn}?
            </Typography>
          </Box>
          
          {relatedPayments.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'left', bgcolor: 'surface.muted', p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
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
              borderRadius: 1.5, 
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
              borderRadius: 1.5, 
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
            borderRadius: 1.5, 
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
