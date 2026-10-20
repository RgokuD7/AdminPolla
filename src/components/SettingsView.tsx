import React from "react";
import {
  Typography,
  Container,
  Stack,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  InputAdornment,
  Divider,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  Switch,
  FormControlLabel
} from "@mui/material";
import { 
  ArrowBack as ArrowBackIcon,
  Group as GroupIcon,
  EventRepeat as FrequencyIcon,
  CalendarMonth as CalendarIcon,
  Timer as TimerIcon,
  Numbers as NumberIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Sync as SyncIcon,
  SaveAlt as SaveIcon,
  Info as InfoIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Palette as PaletteIcon
} from "@mui/icons-material";
import { AppSettings, Frequency } from "@/types";
import { calculateCurrentTurnFromDate, formatDateFull } from "@/utils/helpers";
import { auth } from "../firebase";
import { useThemeMode } from "@/theme/ThemeContext";

const SUPER_ADMIN_ID = import.meta.env.VITE_SUPER_ADMIN_ID;

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onGoBack: () => void;
}

const sectionCardSx = {
  borderRadius: 4, 
  border: 1, 
  borderColor: 'divider', 
  bgcolor: 'background.paper',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  overflow: 'hidden'
};

const sectionHeaderSx = {
  px: 2.5, 
  py: 1.5, 
  bgcolor: 'surface.muted', 
  borderBottom: 1, 
  borderColor: 'divider',
  display: 'flex',
  alignItems: 'center',
  gap: 1
};

const sectionBodySx = {
  p: 2.5
};

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onGoBack }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [isManualTurnEnabled, setIsManualTurnEnabled] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const { mode, toggleMode, isDark } = useThemeMode();

  React.useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(localSettings));
  }, [localSettings, settings]);

  const handleSave = () => {
    onUpdate(localSettings);
    setHasChanges(false);
  };

  const formattedStartDate = localSettings.startDate 
    ? formatDateFull(localSettings.startDate)
    : null;

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 16, px: 2 }}>
      {/* ─── Header ─── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <IconButton 
          onClick={onGoBack} 
          sx={{ 
            width: 42, 
            height: 42, 
            bgcolor: 'surface.muted', 
            borderRadius: 2.5,
            border: 1,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': { bgcolor: 'background.paper' }
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>Ajustes</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          variant="outlined" 
          startIcon={<GroupIcon />}
          onClick={onGoBack}
          sx={{ 
            borderRadius: 3, 
            fontWeight: 700,
            borderColor: 'divider',
            color: 'text.primary',
            height: 40,
            px: 2,
            bgcolor: 'background.paper',
            '&:hover': { borderColor: 'text.secondary' }
          }}
        >
          Mis Grupos
        </Button>
      </Stack>

      <Stack spacing={2.5}>
        {/* ─── Sección 1: Información General ─── */}
        <Paper sx={sectionCardSx} elevation={0}>
          <Box sx={sectionHeaderSx}>
            <GroupIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'text.secondary' }}>
              INFORMACIÓN GENERAL
            </Typography>
          </Box>
          <Box sx={sectionBodySx}>
            <Stack spacing={2.5}>
              <TextField 
                label="Nombre del Grupo" 
                fullWidth 
                value={localSettings.groupName} 
                onChange={(e) => setLocalSettings({ ...localSettings, groupName: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><GroupIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }}
              />
              <TextField 
                label="Monto de la Cuota" 
                type="text" 
                fullWidth 
                value={localSettings.quotaAmount === 0 ? '' : new Intl.NumberFormat('es-CL').format(localSettings.quotaAmount)} 
                disabled={localSettings.currentTurn > 1}
                helperText={localSettings.currentTurn > 1 ? "⚠️ Polla iniciada. No se puede cambiar el monto pactado." : "Monto por cada integrante por turno"}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\./g, '');
                  if (rawValue === '') {
                    setLocalSettings({ ...localSettings, quotaAmount: 0 });
                  } else if (/^\d*$/.test(rawValue)) {
                    setLocalSettings({ ...localSettings, quotaAmount: Number(rawValue) });
                  }
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>$</Typography></InputAdornment>,
                }} 
              />
            </Stack>
          </Box>
        </Paper>

        {/* ─── Sección 2: Frecuencia y Calendario ─── */}
        <Paper sx={sectionCardSx} elevation={0}>
          <Box sx={sectionHeaderSx}>
            <FrequencyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'text.secondary' }}>
              FRECUENCIA Y FECHAS
            </Typography>
          </Box>
          <Box sx={sectionBodySx}>
            <Stack spacing={2.5}>
              <FormControl fullWidth>
                <InputLabel>Frecuencia de Pago</InputLabel>
                <Select 
                  label="Frecuencia de Pago" 
                  value={localSettings.frequency} 
                  onChange={e => {
                    const newFreq = e.target.value as Frequency;
                    setLocalSettings({...localSettings, frequency: newFreq });
                  }}
                  startAdornment={<InputAdornment position="start" sx={{ ml: 1, mr: 2 }}><FrequencyIcon sx={{ color: 'text.secondary' }} /></InputAdornment>}
                >
                  <MenuItem value="biweekly">Quincenal (Día 15 y Fin de mes)</MenuItem>
                  <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
                </Select>
              </FormControl>
              
              {/* Panel de Fecha de Inicio */}
              <Box sx={{ 
                bgcolor: 'surface.muted', 
                borderRadius: 3, 
                border: 1, 
                borderColor: 'divider',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  px: 2, 
                  py: 1.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider'
                }}>
                  <CalendarIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ 
                      fontWeight: 700, 
                      fontSize: '0.7rem', 
                      letterSpacing: '0.05em',
                      color: 'text.secondary',
                      display: 'block'
                    }}>
                      FECHA DE INICIO DEL 1ER TURNO
                    </Typography>
                    {formattedStartDate && (
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25 }}>
                        {formattedStartDate}
                      </Typography>
                    )}
                  </Box>
                  {localSettings.currentTurn > 1 && (
                    <Chip 
                      icon={<InfoIcon sx={{ fontSize: '14px !important' }} />}
                      label="En curso" 
                      size="small" 
                      sx={{ 
                        bgcolor: 'surface.pending', 
                        color: 'warning.main', 
                        fontWeight: 800, 
                        fontSize: '0.65rem',
                        height: 24,
                        '& .MuiChip-icon': { color: 'warning.main' }
                      }} 
                    />
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <TextField 
                    type="date" 
                    fullWidth 
                    size="small"
                    value={localSettings.startDate || ''} 
                    disabled={localSettings.currentTurn > 1}
                    onChange={e => setLocalSettings({...localSettings, startDate: e.target.value})} 
                    InputLabelProps={{ shrink: true }} 
                    helperText={localSettings.currentTurn > 1 ? "Bloqueado: La polla ya inició." : "Fecha base para el calendario de pagos."}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                      }
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          </Box>
        </Paper>

        {/* ─── Sección 3: Días de Gracia ─── */}
        <Paper sx={sectionCardSx} elevation={0}>
          <Box sx={sectionHeaderSx}>
            <TimerIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'text.secondary' }}>
              DÍAS DE GRACIA (TOLERANCIA)
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip 
              label="Tolerancia" 
              size="small"
              sx={{ 
                bgcolor: 'surface.pending', 
                color: 'warning.main', 
                fontWeight: 800, 
                fontSize: '0.65rem',
                height: 22
              }} 
            />
          </Box>
          <Box sx={sectionBodySx}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
              Días adicionales después del vencimiento antes de considerar un pago como atrasado.
            </Typography>

            {localSettings.frequency === 'biweekly' ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField 
                    label="Quincena (Día 15)" 
                    helperText="Días tras el 15"
                    type="number" 
                    fullWidth 
                    size="small"
                    value={localSettings.graceDays1 || ''} 
                    onChange={(e) => setLocalSettings({ ...localSettings, graceDays1: Number(e.target.value) })}
                    InputProps={{ 
                      endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>días</Typography></InputAdornment>,
                      startAdornment: <InputAdornment position="start"><TimerIcon fontSize="small" sx={{ color: 'warning.main' }} /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField 
                    label="Fin de Mes" 
                    helperText="Días tras fin de mes"
                    type="number" 
                    fullWidth 
                    size="small"
                    value={localSettings.graceDays2 || ''} 
                    onChange={(e) => setLocalSettings({ ...localSettings, graceDays2: Number(e.target.value) })}
                    InputProps={{ 
                      endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>días</Typography></InputAdornment>,
                      startAdornment: <InputAdornment position="start"><TimerIcon fontSize="small" sx={{ color: 'warning.main' }} /></InputAdornment>
                    }}
                  />
                </Grid>
              </Grid>
            ) : (
              <TextField 
                label="Días de Gracia" 
                type="number" 
                fullWidth 
                value={localSettings.graceDays1 || ''} 
                onChange={(e) => setLocalSettings({ ...localSettings, graceDays1: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: 'warning.main' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>días</Typography></InputAdornment>,
                }} 
              />
            )}
          </Box>
        </Paper>

        {/* ─── Sección 4: Apariencia (Modo Oscuro / Claro) ─── */}
        <Paper sx={sectionCardSx} elevation={0}>
          <Box sx={sectionHeaderSx}>
            <PaletteIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'text.secondary' }}>
              APARIENCIA Y TEMA
            </Typography>
          </Box>
          <Box sx={sectionBodySx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {isDark ? "Modo Oscuro Activo 🌙" : "Modo Claro Activo ☀️"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ajusta la paleta visual para descansar la vista
                </Typography>
              </Box>
              <IconButton 
                onClick={toggleMode}
                sx={{ 
                  width: 48, 
                  height: 48, 
                  bgcolor: 'surface.muted', 
                  border: 1, 
                  borderColor: 'divider',
                  color: isDark ? '#FBBF24' : '#4B5563',
                  borderRadius: 3
                }}
              >
                {isDark ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Stack>
          </Box>
        </Paper>

        {/* ─── Sección 5: Control de Turno (Super Admin) ─── */}
        {auth?.currentUser?.uid === SUPER_ADMIN_ID && (
          <Paper sx={{ ...sectionCardSx, borderColor: 'warning.main' }} elevation={0}>
            <Box sx={{ ...sectionHeaderSx, bgcolor: 'surface.pending' }}>
              <NumberIcon sx={{ fontSize: 18, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'warning.main' }}>
                CONTROL DE TURNO (ADMIN)
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Chip 
                label="SuperAdmin" 
                size="small"
                sx={{ 
                  bgcolor: 'warning.main', 
                  color: '#FFFFFF', 
                  fontWeight: 800, 
                  fontSize: '0.65rem',
                  height: 22
                }} 
              />
            </Box>
            <Box sx={sectionBodySx}>
              <TextField 
                label="Turno Actual Forzado" 
                type="number" 
                fullWidth 
                disabled={!isManualTurnEnabled}
                value={localSettings.currentTurn} 
                onChange={(e) => setLocalSettings({ ...localSettings, currentTurn: Number(e.target.value) })}
                helperText={!isManualTurnEnabled ? "Calculado automáticamente según la fecha." : "⚠️ Modo manual activado."}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><NumberIcon sx={{ color: isManualTurnEnabled ? 'warning.main' : 'text.disabled' }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Recalcular según fecha real">
                        <IconButton onClick={() => setLocalSettings({ ...localSettings, currentTurn: calculateCurrentTurnFromDate(localSettings) })} edge="end" size="small" sx={{ mr: 0.5 }}>
                          <SyncIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isManualTurnEnabled ? "Bloquear Turno" : "Desbloquear edición manual"}>
                        <IconButton onClick={() => setIsManualTurnEnabled(!isManualTurnEnabled)} edge="end" size="small">
                          {isManualTurnEnabled ? <LockOpenIcon color="warning" /> : <LockIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }} 
              />
            </Box>
          </Paper>
        )}

        {/* ─── Botón Guardar Cambios ─── */}
        <Button 
          variant="contained" 
          color="secondary"
          fullWidth 
          size="large"
          startIcon={hasChanges ? <SaveIcon /> : undefined}
          onClick={handleSave} 
          disabled={!hasChanges}
          sx={{ 
            borderRadius: 3, 
            py: 1.5, 
            minHeight: 52,
            fontWeight: 800, 
            bgcolor: hasChanges ? 'secondary.main' : undefined,
            color: '#FFFFFF',
            fontSize: '1rem',
            boxShadow: hasChanges ? '0 8px 24px rgba(5, 150, 105, 0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {hasChanges ? "Guardar Ajustes" : "Sin Cambios Pendientes"}
        </Button>
      </Stack>
    </Container>
  );
};

export default SettingsView;
