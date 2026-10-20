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
  Tooltip,
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

  // Estado para pagos relacionados (misma persona, otros turnos)
  const [relatedPayments, setRelatedPayments] = useState<{ id: string, memberIndex?: number, turnNumber: number }[]>([]);
  const [payRelated, setPayRelated] = useState(false);

  // Helper para saber si alguien pagó el turno actual
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

  // Extraer datos bancarios del receptor actual si existen
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
      {/* ─── Hero Card Superior (Gradiente Premium Financiero) ─── */}
      <Box 
        sx={{ 
          pt: { xs: 5, sm: 6 }, 
          pb: { xs: 5, sm: 6 }, 
          px: 3, 
          background: (theme) => stats.isFullyPaid
            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
            : theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #111827 0%, #1F2937 60%, #0F172A 100%)'
              : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF',
          borderRadius: { xs: '0 0 28px 28px', sm: '0 0 32px 32px' },
          boxShadow: '0 12px 30px -10px rgba(0,0,0,0.3)',
          transition: 'background 0.5s ease'
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Stack spacing={2.5}>
            {/* Header con nombre del grupo y badge */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Chip
                label={settings.groupName || "Mi Polla"}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  backdropFilter: 'blur(10px)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}
              />
              <Chip
                label={`Turno #${settings.currentTurn}`}
                size="small"
                sx={{
                  bgcolor: stats.isFullyPaid ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                  color: stats.isFullyPaid ? '#047857' : '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.75rem'
                }}
              />
            </Stack>

            {/* Monto Recaudado y Meta */}
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontWeight: 600, 
                  letterSpacing: '0.06em',
                  display: 'block',
                  mb: 0.5
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
                    color: '#FFFFFF',
                    fontSize: { xs: '2.4rem', sm: '3rem' },
                    lineHeight: 1
                  }}
                >
                  {formatCurrency(stats.collected)}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  component="span"
                  sx={{ 
                    color: 'rgba(255,255,255,0.6)', 
                    fontWeight: 600 
                  }}
                >
                  / {formatCurrency(stats.totalGoal)}
                </Typography>
                {stats.isFullyPaid && (
                  <IconButton 
                    size="small" 
                    onClick={() => triggerConfetti()} 
                    sx={{ color: '#FCD34D', bgcolor: 'rgba(255,255,255,0.1)', ml: 1 }}
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
                  height: 8, 
                  borderRadius: 4, 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { 
                    bgcolor: stats.isFullyPaid ? '#A7F3D0' : '#10B981',
                    borderRadius: 4 
                  } 
                }} 
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: stats.isFullyPaid ? '#A7F3D0' : '#FFFFFF', 
                    fontWeight: 800,
                    fontSize: '0.75rem' 
                  }}
                >
                  {stats.isFullyPaid ? "🎉 ¡100% RECAUDADO!" : `${Math.round(stats.progress)}% completado`}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  {participants.filter(p => isParticipantPaid(p, settings.currentTurn)).length} de {participants.length} cuotas
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ─── Contenido Principal ─── */}
      <Container maxWidth="sm" sx={{ mt: 3, px: 2 }}>
        
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
                  mb: 3, 
                  borderRadius: 3, 
                  fontWeight: 700, 
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)' 
                }}
              >
                ¡PAGOS ATRASADOS! Según la fecha, deberíamos ir en el Turno #{realTurn}. No avanzará hasta completar los pagos.
              </Alert>
            );
          }
          return null;
        })()}

        {/* ─── Card Destacada del Receptor ─── */}
        <Paper 
          sx={{ 
            mb: 3, 
            borderRadius: 4, 
            overflow: 'hidden',
            border: 1,
            borderColor: stats.isFullyPaid ? 'success.main' : 'divider',
            bgcolor: stats.isFullyPaid ? 'surface.paid' : 'background.paper',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Header de la tarjeta */}
          <Box 
            sx={{ 
              bgcolor: stats.isFullyPaid ? 'secondary.main' : 'surface.muted', 
              color: stats.isFullyPaid ? '#FFFFFF' : 'text.primary', 
              px: 2.5, 
              py: 1.25, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              {stats.isFullyPaid ? (
                <CheckCircleIcon sx={{ fontSize: 18 }} />
              ) : (
                <ScheduleIcon sx={{ fontSize: 18, color: 'warning.main' }} />
              )}
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em' }}>
                {stats.isFullyPaid ? "LISTO PARA ENTREGAR" : "RECEPTOR DE ESTE TURNO"}
              </Typography>
            </Stack>
            <Chip 
              icon={<EventIcon sx={{ fontSize: '15px !important' }} />}
              label={formatDateReadable(stats.deadlineDate)}
              size="small"
              sx={{ 
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: stats.isFullyPaid ? 'rgba(255,255,255,0.2)' : 'surface.elevated',
                color: stats.isFullyPaid ? '#FFFFFF' : 'text.secondary'
              }}
            />
          </Box>

          {/* Cuerpo */}
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ flex: 1, pr: 2 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    textTransform: 'uppercase',
                    fontSize: '0.7rem'
                  }}
                >
                  {stats.recipient?.type === 'shared' ? <GroupsIcon sx={{ fontSize: 16 }} /> : <PersonIcon sx={{ fontSize: 16 }} />}
                  {stats.recipient?.type === 'shared' ? 'Beneficiarios (Compartido)' : 'Beneficiario'}
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    mt: 0.5, 
                    fontWeight: 900, 
                    color: 'text.primary',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}
                >
                  {stats.recipient ? getParticipantName(stats.recipient) : "Sin asignar"}
                </Typography>
                {stats.individualAmount && (
                  <Typography variant="body2" sx={{ color: 'secondary.main', fontWeight: 700, mt: 0.5 }}>
                    {formatCurrency(stats.individualAmount)} para cada uno
                  </Typography>
                )}
              </Box>

              <Paper 
                elevation={0} 
                sx={{ 
                  bgcolor: 'surface.muted', 
                  px: 2, 
                  py: 1.2, 
                  borderRadius: 3, 
                  border: 1, 
                  borderColor: 'divider',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  minWidth: 70
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.65rem' }}>TURNO</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'secondary.main', lineHeight: 1 }}>#{settings.currentTurn}</Typography>
              </Paper>
            </Stack>

            {/* Botón para copiar datos bancarios del receptor si existen */}
            {recipientBankDetails && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={handleCopyBank}
                  startIcon={copiedBank ? <CheckIcon color="success" /> : <BankIcon />}
                  sx={{
                    borderRadius: 2.5,
                    py: 1,
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
        <Stack direction="row" spacing={1.5} sx={{ mb: 3.5 }}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={handleCopyReport}
            startIcon={<ContentCopyIcon />}
            sx={{ 
              borderRadius: 3, 
              py: 1.5, 
              minHeight: 48,
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
              setSnackbar({ open: true, message: "Enlace público copiado al portapapeles", pid: "" });
            }}
            startIcon={<ShareIcon />}
            sx={{ 
              borderRadius: 3, 
              py: 1.5, 
              minHeight: 48,
              fontWeight: 700, 
              bgcolor: 'accent.main',
              color: '#FFFFFF',
              '&:hover': { bgcolor: '#2563EB' }
            }}
          >
            Compartir Link
          </Button>
        </Stack>

        {/* ─── Lista de Integrantes (Diseño Pill/Row Limpio) ─── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 0.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Integrantes</Typography>
            <Chip 
              label={participants.length} 
              size="small" 
              sx={{ bgcolor: 'surface.muted', fontWeight: 800, fontSize: '0.75rem', height: 24 }} 
            />
          </Stack>
          <Button 
            size="small" 
            variant={isMarkingMode ? "contained" : "outlined"} 
            color={isMarkingMode ? "secondary" : "inherit"}
            startIcon={isMarkingMode ? <DoneAllIcon /> : <EditIcon />}
            onClick={() => setIsMarkingMode(!isMarkingMode)}
            sx={{ 
              borderRadius: 2.5, 
              px: 2, 
              height: 38, 
              fontSize: '0.8rem',
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
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
          }}
          sx={{ 
            mb: 2.5, 
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              borderRadius: 3,
              fontSize: '16px'
            }
          }}
          size="small"
        />

        {/* Contenedor Unificado de Integrantes */}
        <Paper 
          sx={{ 
            borderRadius: 4, 
            overflow: 'hidden', 
            border: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
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
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      bgcolor: isPaid ? 'surface.paid' : 'transparent',
                      transition: 'background-color 0.2s ease',
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
                        width: 38, 
                        height: 38, 
                        bgcolor: isRecipient 
                          ? 'secondary.main' 
                          : isPaid 
                            ? 'success.main' 
                            : 'surface.muted',
                        color: isRecipient || isPaid ? '#FFFFFF' : 'text.primary',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        borderRadius: 2.5
                      }}
                    >
                      {p.turnNumber}
                    </Avatar>

                    {/* Nombre y detalles */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 700, 
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {isShared ? p.members.map(m => m.name).join(' y ') : p.members[0].name}
                        </Typography>
                        {isShared && (
                          <Chip 
                            label="Compartido" 
                            size="small" 
                            sx={{ 
                              height: 20, 
                              fontSize: '0.65rem', 
                              fontWeight: 700,
                              bgcolor: 'surface.muted',
                              color: 'text.secondary' 
                            }} 
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.25, display: 'block' }}>
                        Turno #{p.turnNumber} {isRecipient ? '• 👑 Receptor actual' : ''}
                      </Typography>
                    </Box>

                    {/* Estado de pago a la derecha */}
                    {!isShared ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isMarkingMode ? (
                          isPaid ? (
                            <Chip
                              label="DESMARCAR"
                              size="small"
                              icon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />}
                              sx={{
                                bgcolor: 'success.main',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                height: 30,
                                px: 0.5,
                                '& .MuiChip-icon': { color: '#FFFFFF' }
                              }}
                            />
                          ) : (
                            <Chip
                              label="MARCAR"
                              size="small"
                              icon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                              sx={{
                                bgcolor: 'surface.muted',
                                color: 'text.primary',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                height: 30,
                                px: 0.5
                              }}
                            />
                          )
                        ) : (
                          <Chip
                            label={isPaid ? "PAGADO" : "PENDIENTE"}
                            size="small"
                            icon={<DotIcon sx={{ fontSize: '12px !important', color: isPaid ? 'success.main' : 'warning.main' }} />}
                            sx={{
                              bgcolor: isPaid ? 'surface.paid' : 'surface.pending',
                              color: isPaid ? 'success.main' : 'warning.main',
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              height: 26,
                              border: 1,
                              borderColor: isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                            }}
                          />
                        )}
                      </Box>
                    ) : (
                      // Indicador para participantes compartidos
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          label={isPaid ? "PAGADO" : "COMPARTIDO"}
                          size="small"
                          icon={<DotIcon sx={{ fontSize: '12px !important', color: isPaid ? 'success.main' : 'warning.main' }} />}
                          sx={{
                            bgcolor: isPaid ? 'surface.paid' : 'surface.pending',
                            color: isPaid ? 'success.main' : 'warning.main',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            height: 26
                          }}
                        />
                        <IconButton size="small" sx={{ p: 0.5, color: 'text.secondary' }}>
                          <ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>

                  {/* Sub-filas para miembros compartidos */}
                  {isShared && (
                    <Collapse in={isExpanded || isMarkingMode}>
                      <Box sx={{ bgcolor: 'surface.muted', py: 1, px: 2, borderBottom: hasDivider ? 1 : 0, borderColor: 'divider' }}>
                        <Stack spacing={1}>
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
                                  p: 1.5,
                                  px: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderRadius: 2.5,
                                  bgcolor: isMemberPaid ? 'surface.paid' : 'background.paper',
                                  border: 1,
                                  borderColor: isMemberPaid ? 'success.main' : 'divider',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                                  }
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {m.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
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
                                    height: 24
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
            borderRadius: 4, 
            width: '100%', 
            maxWidth: 380,
            p: 1,
            bgcolor: 'background.paper'
          } 
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1, fontWeight: 900 }}>
          Confirmar Estado de Pago
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, color: 'text.primary' }}>
            {confirmPayment.p && typeof confirmPayment.memberIndex === 'number' && confirmPayment.p.type === 'shared'
              ? confirmPayment.p.members[confirmPayment.memberIndex].name
              : (confirmPayment.p ? getParticipantName(confirmPayment.p) : "")}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            {confirmPayment.p?.type === 'shared' 
              ? formatCurrency(settings.quotaAmount / confirmPayment.p.members.length)
              : formatCurrency(settings.quotaAmount)}
          </Typography>

          <Box sx={{ bgcolor: 'surface.pending', color: 'warning.main', p: 1.5, borderRadius: 2.5, display: 'inline-block' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              ¿Deseas cambiar el estado del turno #{settings.currentTurn}?
            </Typography>
          </Box>
          
          {relatedPayments.length > 0 && (
            <Box sx={{ mt: 2.5, textAlign: 'left', bgcolor: 'surface.muted', p: 1.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
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
        <DialogActions sx={{ p: 2.5, pt: 0, justifyContent: 'center', gap: 1 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => setConfirmPayment({ open: false, p: null })} 
            sx={{ 
              borderRadius: 3, 
              fontWeight: 700, 
              minHeight: 48, 
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
              minHeight: 48, 
              borderRadius: 3, 
              fontWeight: 700,
              bgcolor: 'secondary.main',
              color: '#FFFFFF'
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar de Notificación ─── */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 85, sm: 85 } }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success" 
          variant="filled" 
          sx={{ 
            width: '100%', 
            borderRadius: 3.5, 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
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
