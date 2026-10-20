import React, { useState } from "react";
import {
  Typography,
  Container,
  Box,
  IconButton,
  Fab,
  Stack,
  Button,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  Tooltip,
  Tabs,
  Tab,
  Snackbar,
  Alert
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Timer as TimerIcon,
  Groups as GroupsIcon,
  AttachMoney as MoneyIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  SettingsBrightness as AutoModeIcon,
  CalendarMonth as CalendarIcon,
  AccountBalance as BankIcon,
  ContentCopy as ContentCopyIcon,
  Person as PersonIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  OpenInNew as OpenInNewIcon
} from "@mui/icons-material";
import { AppSettings, Frequency, PollaGroup } from "@/types";
import { formatCurrency, getCollectedAmount, getParticipantName, calculateCurrentTurnFromDate } from "@/utils/helpers";
import { useThemeMode } from "@/theme/ThemeContext";
import { AppFooter } from "./AppFooter";
import { UserProfileDialog } from "./UserProfileDialog";
import { User } from "@/firebase";

interface ListViewProps {
  groups: PollaGroup[];
  participantGroups?: PollaGroup[];
  onSelect: (id: string) => void;
  onCreate: (s: AppSettings) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  currentUser?: User | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  biweekly: "Quincenal",
  monthly: "Mensual"
};

const ListView: React.FC<ListViewProps> = ({ 
  groups = [], 
  participantGroups = [], 
  onSelect, 
  onCreate, 
  onDelete, 
  onLogout,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const { themePreference, effectiveMode, toggleNextMode } = useThemeMode();
  
  const [form, setForm] = useState<AppSettings>({ 
    groupName: "", 
    quotaAmount: 20000, 
    currentTurn: 1, 
    frequency: 'biweekly', 
    startDate: new Date().toISOString().split('T')[0], 
    graceDays1: 0, 
    graceDays2: 0, 
    isLocked: false 
  });

  const handleCopyBank = (bankDetails: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bankDetails);
    setCopyFeedback("¡Datos bancarios copiados al portapapeles!");
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3, pb: 12, px: 2, position: 'relative' }}>
      {/* ─── Barra Superior de Acciones (Perfil, Modo y Logout) ─── */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Tooltip title="Mis datos de transferencia">
          <IconButton 
            onClick={() => setProfileOpen(true)}
            sx={{ 
              color: 'text.secondary',
              bgcolor: 'surface.muted',
              border: 1,
              borderColor: 'divider',
              width: 44,
              height: 44,
              borderRadius: 2,
              '&:hover': { color: 'secondary.main' }
            }}
          >
            <BankIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={`Tema: ${themePreference === 'system' ? 'Automático' : themePreference === 'light' ? 'Día' : 'Noche'}`}>
          <IconButton 
            onClick={toggleNextMode} 
            sx={{ 
              color: effectiveMode === 'dark' ? '#FBBF24' : 'text.secondary',
              bgcolor: 'surface.muted',
              border: 1,
              borderColor: 'divider',
              width: 44,
              height: 44,
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
        </Tooltip>

        <Tooltip title="Cerrar sesión">
          <IconButton 
            onClick={onLogout} 
            sx={{ 
              color: 'text.secondary',
              bgcolor: 'surface.muted',
              border: 1,
              borderColor: 'divider',
              width: 44,
              height: 44,
              borderRadius: 2,
              '&:hover': { color: 'error.main', bgcolor: 'surface.overdue' }
            }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ─── Hero Logo ─── */}
      <Stack alignItems="center" spacing={1} sx={{ mb: 2.5, mt: 0.5 }}>
        <Box 
          component="img" 
          src="/logo.png" 
          sx={{ 
            width: 72, 
            height: 72,
            objectFit: 'contain',
            transition: 'all 0.3s ease'
          }} 
        />
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 900, 
            letterSpacing: '-0.5px', 
            color: 'text.primary',
            lineHeight: 1
          }}
        >
          <Box component="span" sx={{ color: 'accent.main' }}>Admin</Box>
          <Box component="span" sx={{ color: 'secondary.main' }}>Polla</Box>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
          GESTIÓN COLABORATIVA DE TURNOS
        </Typography>
      </Stack>

      {/* ─── Segmented Tabs: Administro vs Participo ─── */}
      <Paper 
        sx={{ 
          p: 0.5, 
          mb: 2.5, 
          borderRadius: 2.5, 
          bgcolor: 'surface.muted', 
          border: 1, 
          borderColor: 'divider' 
        }} 
        elevation={0}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          indicatorColor="secondary"
          textColor="inherit"
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              display: 'none'
            }
          }}
        >
          <Tab 
            value={0}
            label={`👑 Administro (${groups.length})`}
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              minHeight: 40,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              bgcolor: activeTab === 0 ? 'background.paper' : 'transparent',
              color: activeTab === 0 ? 'text.primary' : 'text.secondary',
              boxShadow: activeTab === 0 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          />
          <Tab 
            value={1}
            label={`👥 Participo (${participantGroups.length})`}
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              minHeight: 40,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              bgcolor: activeTab === 1 ? 'background.paper' : 'transparent',
              color: activeTab === 1 ? 'text.primary' : 'text.secondary',
              boxShadow: activeTab === 1 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          />
        </Tabs>
      </Paper>

      {/* ══════════════════════════════════════════════════════
          TAB 0: POLLAS QUE ADMINISTRO
         ══════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <Stack spacing={1.5}>
          {groups.length === 0 ? (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 5, 
                textAlign: 'center', 
                borderStyle: 'dashed', 
                borderWidth: 1.5,
                borderColor: 'divider',
                bgcolor: 'background.paper', 
                borderRadius: 2.5 
              }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                No tienes pollas como administrador
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
                Crea tu primera polla para comenzar a gestionar los pagos y el calendario de turnos.
              </Typography>
              <Button 
                variant="contained" 
                color="secondary"
                startIcon={<AddIcon />}
                sx={{ px: 3, py: 1.25, minHeight: 48, fontWeight: 700, borderRadius: 2 }} 
                onClick={() => setOpen(true)}
              >
                Crear Nueva Polla
              </Button>
            </Paper>
          ) : (
            groups.map((group) => {
              const currentTurn = group.settings.currentTurn || 1;
              const stats = getCollectedAmount(group.participants, currentTurn, group.settings.quotaAmount);
              const recipient = group.participants.find(p => p.turnNumber === currentTurn);
              const isCompleted = stats.progress >= 100;

              return (
                <Paper 
                  key={group.id} 
                  onClick={() => onSelect(group.id)} 
                  sx={{ 
                    p: 2,
                    cursor: 'pointer', 
                    transition: 'all 0.15s ease', 
                    borderRadius: 2.5,
                    border: 1,
                    borderColor: isCompleted ? 'secondary.main' : 'divider',
                    bgcolor: 'background.paper',
                    boxShadow: 'none',
                    '&:hover': { 
                      borderColor: 'secondary.main',
                      bgcolor: 'surface.muted'
                    },
                    '&:active': { transform: 'scale(0.99)' }
                  }}
                >
                  {/* Cabecera de la Tarjeta */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box sx={{ pr: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', fontSize: '0.98rem' }}>
                        {group.settings.groupName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <GroupsIcon sx={{ fontSize: 14 }} /> {group.participants.length} integrantes
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); setDeleteId(group.id); }} 
                      sx={{ 
                        color: 'text.secondary', 
                        '&:hover': { color: 'error.main', bgcolor: 'surface.overdue' },
                        width: 36,
                        height: 36
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {/* Info Financiera y Beneficiario */}
                  <Stack spacing={1.5}>
                    {/* Beneficiario de este turno */}
                    <Box sx={{ 
                      bgcolor: isCompleted ? 'surface.paid' : 'surface.muted', 
                      p: 1.25, 
                      borderRadius: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.25,
                      border: 1,
                      borderColor: 'divider'
                    }}>
                      <Avatar sx={{ 
                        width: 30, 
                        height: 30, 
                        bgcolor: isCompleted ? 'success.main' : 'secondary.main', 
                        fontSize: 13, 
                        fontWeight: 800,
                        borderRadius: 1.5
                      }}>
                        {currentTurn}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                          TURNO #{currentTurn} • LE TOCA A:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                          {recipient ? getParticipantName(recipient) : "Sin asignar"}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Progreso de Recaudación */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: isCompleted ? 'secondary.main' : 'text.secondary', fontSize: '0.72rem' }}>
                          {isCompleted ? "🎉 ¡Cuota completa!" : "Recaudación actual"}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.75rem' }}>
                          {formatCurrency(stats.collected)}{" "}
                          <Typography component="span" variant="caption" color="text.secondary">
                            / {formatCurrency(stats.total)}
                          </Typography>
                        </Typography>
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(stats.progress, 100)} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3, 
                          bgcolor: 'surface.muted',
                          '& .MuiLinearProgress-bar': { 
                            bgcolor: isCompleted ? 'success.main' : 'secondary.main', 
                            borderRadius: 3 
                          } 
                        }} 
                      />
                    </Box>

                    {/* Chips Informativos */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip 
                        size="small" 
                        icon={<CalendarIcon sx={{ fontSize: '13px !important' }} />}
                        label={FREQUENCY_LABELS[group.settings.frequency] || group.settings.frequency} 
                        sx={{ 
                          height: 22, 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          bgcolor: 'surface.muted', 
                          color: 'text.secondary',
                          borderRadius: 1.5
                        }} 
                      />
                      <Chip 
                        size="small" 
                        icon={<MoneyIcon sx={{ fontSize: '13px !important' }} />}
                        label={`${formatCurrency(group.settings.quotaAmount)} c/u`} 
                        sx={{ 
                          height: 22, 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          bgcolor: 'surface.paid', 
                          color: 'secondary.main', 
                          borderRadius: 1.5,
                          '& .MuiChip-icon': { color: 'secondary.main' } 
                        }} 
                      />
                    </Stack>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 1: POLLAS DONDE PARTICIPO (MODO P2P)
         ══════════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <Stack spacing={1.5}>
          {participantGroups.length === 0 ? (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 5, 
                textAlign: 'center', 
                borderStyle: 'dashed', 
                borderWidth: 1.5,
                borderColor: 'divider',
                bgcolor: 'background.paper', 
                borderRadius: 2.5 
              }}
            >
              <PersonIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5 }}>
                Aún no participas en otras pollas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 2 }}>
                Cuando abras el enlace público de una polla compartida, podrás vincular tu cuenta a tu número de turno para seguir tus pagos desde aquí.
              </Typography>
            </Paper>
          ) : (
            participantGroups.map((group) => {
              const currentTurn = group.settings.currentTurn || 1;
              const recipient = group.participants.find(p => p.turnNumber === currentTurn);
              const recipientName = recipient ? getParticipantName(recipient) : "Sin asignar";
              const recipientBank = recipient?.members?.find(m => m.bankDetails)?.bankDetails || recipient?.members?.[0]?.bankDetails || "";

              // Buscar el participante correspondiente al usuario actual
              const myParticipant = group.participants.find(p => 
                p.userId === currentUser?.uid || 
                p.members?.some(m => m.userId === currentUser?.uid)
              );

              // Estado de pago del usuario en el turno actual
              let isMyTurnPaid = false;
              let isMyTurnToReceive = false;
              let myTurnNumber = 0;

              if (myParticipant) {
                myTurnNumber = myParticipant.turnNumber;
                isMyTurnToReceive = myTurnNumber === currentTurn;

                if (myParticipant.type === 'shared') {
                  const myMember = myParticipant.members.find(m => m.userId === currentUser?.uid);
                  isMyTurnPaid = myMember?.paymentHistory?.[currentTurn] || false;
                } else {
                  isMyTurnPaid = myParticipant.paymentHistory?.[currentTurn] || false;
                }
              }

              return (
                <Paper 
                  key={group.id} 
                  onClick={() => onSelect(group.id)} 
                  sx={{ 
                    p: 2,
                    cursor: 'pointer', 
                    transition: 'all 0.15s ease', 
                    borderRadius: 2.5,
                    border: 1,
                    borderColor: isMyTurnPaid ? 'secondary.main' : 'divider',
                    bgcolor: 'background.paper',
                    boxShadow: 'none',
                    '&:hover': { 
                      borderColor: 'secondary.main',
                      bgcolor: 'surface.muted'
                    },
                    '&:active': { transform: 'scale(0.99)' }
                  }}
                >
                  {/* Cabecera */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', fontSize: '0.98rem' }}>
                        {group.settings.groupName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mt: 0.25 }}>
                        Turno #{currentTurn} • Frecuencia {FREQUENCY_LABELS[group.settings.frequency] || group.settings.frequency}
                      </Typography>
                    </Box>

                    {/* Estado del Participante */}
                    {isMyTurnToReceive ? (
                      <Chip 
                        icon={<CelebrationIcon sx={{ fontSize: '14px !important' }} />}
                        label="¡Te toca recibir!" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'surface.paid', 
                          color: 'secondary.main', 
                          fontWeight: 800, 
                          borderRadius: 1.5,
                          '& .MuiChip-icon': { color: 'secondary.main' }
                        }} 
                      />
                    ) : isMyTurnPaid ? (
                      <Chip 
                        icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                        label="Tu cuota: Pagada" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'surface.paid', 
                          color: 'secondary.main', 
                          fontWeight: 800, 
                          borderRadius: 1.5,
                          '& .MuiChip-icon': { color: 'secondary.main' }
                        }} 
                      />
                    ) : (
                      <Chip 
                        icon={<PendingIcon sx={{ fontSize: '14px !important' }} />}
                        label="Tu cuota: Pendiente" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'surface.pending', 
                          color: 'warning.main', 
                          fontWeight: 800, 
                          borderRadius: 1.5,
                          '& .MuiChip-icon': { color: 'warning.main' }
                        }} 
                      />
                    )}
                  </Stack>

                  {/* Beneficiario del Turno Actual */}
                  <Box sx={{ 
                    bgcolor: 'surface.muted', 
                    p: 1.5, 
                    borderRadius: 2, 
                    border: 1, 
                    borderColor: 'divider',
                    mb: 1.5
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em', display: 'block' }}>
                          BENEFICIARIO DE ESTE TURNO:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                          {recipientName}
                        </Typography>
                      </Box>

                      {recipientBank && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ContentCopyIcon sx={{ fontSize: '13px !important' }} />}
                          onClick={(e) => handleCopyBank(recipientBank, e)}
                          sx={{
                            minHeight: 36,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: 1.5,
                            borderColor: 'divider',
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Copiar Cuenta
                        </Button>
                      )}
                    </Stack>
                  </Box>

                  {/* Resumen de tu participación */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1}>
                      {myTurnNumber > 0 && (
                        <Chip 
                          label={`Tu turno: #${myTurnNumber}`} 
                          size="small" 
                          sx={{ 
                            height: 22, 
                            fontSize: '0.68rem', 
                            fontWeight: 700, 
                            bgcolor: 'surface.muted', 
                            borderRadius: 1.5 
                          }} 
                        />
                      )}
                      <Chip 
                        label={`Cuota: ${formatCurrency(group.settings.quotaAmount)}`} 
                        size="small" 
                        sx={{ 
                          height: 22, 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          bgcolor: 'surface.muted', 
                          borderRadius: 1.5 
                        }} 
                      />
                    </Stack>

                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      Ver detalle <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Typography>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      )}

      {/* Footer informativo */}
      <AppFooter sx={{ mt: 3, mb: 4 }} />

      {/* ─── Botón Flotante para Crear Polla (Solo en Tab Administro) ─── */}
      {activeTab === 0 && (
        <Fab 
          color="secondary"
          aria-label="crear"
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 20, 
            bgcolor: 'secondary.main', 
            color: '#FFFFFF',
            borderRadius: 2.5, 
            width: 52,
            height: 52,
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
            '&:hover': { bgcolor: '#047857' }
          }} 
          onClick={() => setOpen(true)}
        >
          <AddIcon sx={{ fontSize: 26 }} />
        </Fab>
      )}

      {/* ─── Diálogo Crear Polla ─── */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 2.5, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ pt: 2.5, fontWeight: 900 }}>Crear Nueva Polla</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField 
              label="Nombre del Grupo" 
              fullWidth 
              size="small"
              placeholder="Ej: Polla Amigos, Familia..."
              value={form.groupName} 
              onChange={e => setForm({...form, groupName: e.target.value})} 
              inputProps={{ style: { fontSize: '16px' } }}
            />
            
            <TextField 
              label="Monto de la Cuota" 
              type="text" 
              fullWidth 
              size="small"
              value={form.quotaAmount === 0 ? '' : new Intl.NumberFormat('es-CL').format(form.quotaAmount)} 
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, '');
                if (rawValue === '') {
                  setForm({ ...form, quotaAmount: 0 });
                } else if (/^\d*$/.test(rawValue)) {
                  setForm({ ...form, quotaAmount: Number(rawValue) });
                }
              }}
              inputProps={{ style: { fontSize: '16px' } }}
              InputProps={{ 
                startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>$</Typography></InputAdornment> 
              }} 
            />

            <FormControl fullWidth size="small">
              <InputLabel>Frecuencia de Pago</InputLabel>
              <Select 
                label="Frecuencia de Pago" 
                value={form.frequency} 
                onChange={e => setForm({...form, frequency: e.target.value as Frequency})}
                sx={{ fontSize: '16px' }}
              >
                <MenuItem value="biweekly">Quincenal (Día 15 y Fin de mes)</MenuItem>
                <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
              </Select>
            </FormControl>

            {form.frequency === 'biweekly' ? (
              <Box sx={{ bgcolor: 'surface.muted', p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb: 1, fontWeight: 700 }}>
                  DÍAS DE GRACIA (TOLERANCIA)
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <TextField 
                      label="Quincena (15)" 
                      helperText="Días tras el 15"
                      type="number" 
                      fullWidth 
                      size="small"
                      value={form.graceDays1 || ''} 
                      onChange={(e) => setForm({ ...form, graceDays1: Number(e.target.value) })}
                      inputProps={{ style: { fontSize: '16px' } }}
                      InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField 
                      label="Fin de Mes" 
                      helperText="Días tras fin mes"
                      type="number" 
                      fullWidth 
                      size="small"
                      value={form.graceDays2 || ''} 
                      onChange={(e) => setForm({ ...form, graceDays2: Number(e.target.value) })}
                      inputProps={{ style: { fontSize: '16px' } }}
                      InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <TextField 
                label="Días de Gracia" 
                helperText="Días para pagar tras el vencimiento"
                type="number" 
                fullWidth 
                size="small"
                value={form.graceDays1 || ''} 
                onChange={(e) => setForm({ ...form, graceDays1: Number(e.target.value) })}
                inputProps={{ style: { fontSize: '16px' } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }} 
              />
            )}

            <TextField 
              label="Fecha de Inicio" 
              type="date" 
              fullWidth 
              size="small"
              value={form.startDate} 
              onChange={e => setForm({...form, startDate: e.target.value})} 
              InputLabelProps={{ shrink: true }} 
              inputProps={{ style: { fontSize: '16px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 700, minHeight: 44 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="secondary"
            sx={{ fontWeight: 700, minHeight: 44, px: 2.5, borderRadius: 2 }}
            onClick={() => { 
              if (form.groupName.trim()) { 
                const realTurn = calculateCurrentTurnFromDate(form);
                const finalForm = { ...form, currentTurn: realTurn };
                onCreate(finalForm); 
                setOpen(false); 
              } 
            }}
          >
            Crear Grupo
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* ─── Diálogo Confirmar Eliminación ─── */}
      <Dialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        PaperProps={{ sx: { borderRadius: 2.5, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>¿Eliminar este grupo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta acción eliminará el grupo permanentemente junto con todo su historial.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit" sx={{ fontWeight: 700, minHeight: 44 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="error" 
            sx={{ fontWeight: 700, borderRadius: 2, minHeight: 44 }}
            onClick={() => { 
              if (deleteId) { 
                onDelete(deleteId); 
                setDeleteId(null); 
              } 
            }}
          >
            Eliminar Grupo
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Modal de Perfil Bancario ─── */}
      <UserProfileDialog 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)} 
        user={currentUser || null} 
      />

      {/* Snackbar feedback copiado */}
      <Snackbar
        open={!!copyFeedback}
        autoHideDuration={2000}
        onClose={() => setCopyFeedback("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 700 }}>
          {copyFeedback}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ListView;
