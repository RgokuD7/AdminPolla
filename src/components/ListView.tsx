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
  Avatar
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
  CalendarMonth as CalendarIcon
} from "@mui/icons-material";
import { AppSettings, Frequency, PollaGroup } from "@/types";
import { formatCurrency, getCollectedAmount, getParticipantName, calculateCurrentTurnFromDate } from "@/utils/helpers";
import { useThemeMode } from "@/theme/ThemeContext";

interface ListViewProps {
  groups: PollaGroup[];
  onSelect: (id: string) => void;
  onCreate: (s: AppSettings) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  biweekly: "Quincenal",
  monthly: "Mensual"
};

const ListView: React.FC<ListViewProps> = ({ groups, onSelect, onCreate, onDelete, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isDark, toggleMode } = useThemeMode();
  
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

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 14, px: 2, position: 'relative' }}>
      {/* ─── Barra Superior de Acciones (Logout y Dark Mode) ─── */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <IconButton 
          onClick={toggleMode} 
          sx={{ 
            color: isDark ? '#FBBF24' : 'text.secondary',
            bgcolor: 'surface.muted',
            border: 1,
            borderColor: 'divider',
            width: 42,
            height: 42,
            borderRadius: 2.5
          }}
        >
          {isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
        </IconButton>
        <IconButton 
          onClick={onLogout} 
          sx={{ 
            color: 'text.secondary',
            bgcolor: 'surface.muted',
            border: 1,
            borderColor: 'divider',
            width: 42,
            height: 42,
            borderRadius: 2.5,
            '&:hover': { color: 'error.main', bgcolor: 'surface.overdue' }
          }}
        >
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* ─── Hero Logo ─── */}
      <Stack alignItems="center" spacing={1.5} sx={{ mb: 4, mt: 1 }}>
        <Box 
          component="img" 
          src="/logo.png" 
          sx={{ 
            width: groups.length > 0 ? 80 : 130, 
            height: groups.length > 0 ? 80 : 130,
            objectFit: 'contain',
            transition: 'all 0.4s ease',
            filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.1))'
          }} 
        />
        <Typography 
          variant={groups.length > 0 ? "h4" : "h3"} 
          sx={{ 
            fontWeight: 900, 
            letterSpacing: '-1px', 
            color: 'text.primary',
            lineHeight: 1
          }}
        >
          <Box component="span" sx={{ color: 'accent.main' }}>Admin</Box>
          <Box component="span" sx={{ color: 'secondary.main' }}>Polla</Box>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}>
          GESTIÓN COLABORATIVA DE TURNOS
        </Typography>
      </Stack>

      {/* ─── Título de Lista ─── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Mis Grupos
        </Typography>
        {groups.length > 0 && (
          <Chip 
            label={`${groups.length} ${groups.length === 1 ? 'polla activa' : 'pollas activas'}`} 
            size="small" 
            sx={{ bgcolor: 'surface.muted', fontWeight: 800, fontSize: '0.75rem', height: 26 }} 
          />
        )}
      </Stack>
      
      {/* ─── Lista de Tarjetas de Grupo ─── */}
      <Stack spacing={2}>
        {groups.length === 0 ? (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 6, 
              textAlign: 'center', 
              borderStyle: 'dashed', 
              borderWidth: 2,
              borderColor: 'divider',
              bgcolor: 'background.paper', 
              borderRadius: 4 
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
              No tienes grupos registrados aún
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              Crea tu primera polla para comenzar a gestionar los pagos y turnos de tus amigos o colegas.
            </Typography>
            <Button 
              variant="contained" 
              color="secondary"
              startIcon={<AddIcon />}
              sx={{ px: 3.5, py: 1.5, minHeight: 48, fontWeight: 700, borderRadius: 3 }} 
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
                  p: 2.5,
                  cursor: 'pointer', 
                  transition: 'all 0.25s ease', 
                  borderRadius: 4,
                  border: 1,
                  borderColor: isCompleted ? 'success.main' : 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
                    borderColor: 'secondary.main'
                  },
                  '&:active': { transform: 'scale(0.99)' }
                }}
              >
                {/* Cabecera de la Tarjeta */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box sx={{ pr: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>
                      {group.settings.groupName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <GroupsIcon sx={{ fontSize: 15 }} /> {group.participants.length} integrantes
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
                <Stack spacing={2}>
                  {/* Beneficiario de este turno */}
                  <Box sx={{ 
                    bgcolor: isCompleted ? 'surface.paid' : 'surface.muted', 
                    p: 1.5, 
                    borderRadius: 3, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    border: 1,
                    borderColor: 'divider'
                  }}>
                    <Avatar sx={{ 
                      width: 34, 
                      height: 34, 
                      bgcolor: isCompleted ? 'success.main' : 'secondary.main', 
                      fontSize: 14, 
                      fontWeight: 800,
                      borderRadius: 2.5
                    }}>
                      {currentTurn}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                        TURNO #{currentTurn} • LE TOCA A:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {recipient ? getParticipantName(recipient) : "Sin asignar"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progreso de Recaudación */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: isCompleted ? 'success.main' : 'text.secondary' }}>
                        {isCompleted ? "🎉 ¡Cuota completa!" : "Recaudación actual"}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>
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
                        height: 7, 
                        borderRadius: 3.5, 
                        bgcolor: 'surface.muted',
                        '& .MuiLinearProgress-bar': { 
                          bgcolor: isCompleted ? 'success.main' : 'secondary.main', 
                          borderRadius: 3.5 
                        } 
                      }} 
                    />
                  </Box>

                  {/* Chips Informativos */}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip 
                      size="small" 
                      icon={<CalendarIcon sx={{ fontSize: '14px !important' }} />}
                      label={FREQUENCY_LABELS[group.settings.frequency] || group.settings.frequency} 
                      sx={{ 
                        height: 24, 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        bgcolor: 'surface.muted', 
                        color: 'text.secondary' 
                      }} 
                    />
                    <Chip 
                      size="small" 
                      icon={<MoneyIcon sx={{ fontSize: '14px !important' }} />}
                      label={`${formatCurrency(group.settings.quotaAmount)} c/u`} 
                      sx={{ 
                        height: 24, 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        bgcolor: 'surface.paid', 
                        color: 'secondary.main', 
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

      {/* ─── Botón Flotante para Crear Polla ─── */}
      <Fab 
        color="secondary"
        aria-label="crear"
        sx={{ 
          position: 'fixed', 
          bottom: 28, 
          right: 24, 
          bgcolor: 'secondary.main', 
          color: '#FFFFFF',
          borderRadius: 3.5, 
          width: 58,
          height: 58,
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.4)',
          '&:hover': { bgcolor: '#047857' }
        }} 
        onClick={() => setOpen(true)}
      >
        <AddIcon sx={{ fontSize: 28 }} />
      </Fab>

      {/* ─── Diálogo Crear Polla ─── */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ pt: 3, fontWeight: 900 }}>Crear Nueva Polla</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField 
              label="Nombre del Grupo" 
              fullWidth 
              placeholder="Ej: Polla de Amigos, Familia..."
              value={form.groupName} 
              onChange={e => setForm({...form, groupName: e.target.value})} 
            />
            
            <TextField 
              label="Monto de la Cuota" 
              type="text" 
              fullWidth 
              value={form.quotaAmount === 0 ? '' : new Intl.NumberFormat('es-CL').format(form.quotaAmount)} 
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, '');
                if (rawValue === '') {
                  setForm({ ...form, quotaAmount: 0 });
                } else if (/^\d*$/.test(rawValue)) {
                  setForm({ ...form, quotaAmount: Number(rawValue) });
                }
              }}
              InputProps={{ 
                startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>$</Typography></InputAdornment> 
              }} 
            />

            <FormControl fullWidth>
              <InputLabel>Frecuencia de Pago</InputLabel>
              <Select 
                label="Frecuencia de Pago" 
                value={form.frequency} 
                onChange={e => setForm({...form, frequency: e.target.value as Frequency})}
              >
                <MenuItem value="biweekly">Quincenal (Día 15 y Fin de mes)</MenuItem>
                <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
              </Select>
            </FormControl>

            {form.frequency === 'biweekly' ? (
              <Box sx={{ bgcolor: 'surface.muted', p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb: 1.5, fontWeight: 700 }}>
                  DÍAS DE GRACIA (TOLERANCIA)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField 
                      label="Quincena (15)" 
                      helperText="Días tras el 15"
                      type="number" 
                      fullWidth 
                      size="small"
                      value={form.graceDays1 || ''} 
                      onChange={(e) => setForm({ ...form, graceDays1: Number(e.target.value) })}
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
                      InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <TextField 
                label="Días de Gracia" 
                helperText="Días de tolerancia para pagar después del vencimiento"
                type="number" 
                fullWidth 
                value={form.graceDays1 || ''} 
                onChange={(e) => setForm({ ...form, graceDays1: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }} 
              />
            )}

            <TextField 
              label="Fecha de Inicio (Primer Turno)" 
              type="date" 
              fullWidth 
              value={form.startDate} 
              onChange={e => setForm({...form, startDate: e.target.value})} 
              InputLabelProps={{ shrink: true }} 
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="secondary"
            sx={{ fontWeight: 700, minHeight: 44, px: 3 }}
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
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>¿Eliminar este grupo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta acción eliminará el grupo permanentemente junto con todo su historial de pagos y lista de participantes.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="error" 
            sx={{ fontWeight: 700 }}
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
    </Container>
  );
};

export default ListView;
