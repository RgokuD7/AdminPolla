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
  Box,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  ToggleButton,
  ToggleButtonGroup
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
  SettingsBrightness as AutoModeIcon,
  Palette as PaletteIcon
} from "@mui/icons-material";
import { AppSettings, Frequency } from "@/types";
import { calculateCurrentTurnFromDate, formatDateFull } from "@/utils/helpers";
import { auth } from "../firebase";
import { useThemeMode, ThemePreference } from "@/theme/ThemeContext";

const SUPER_ADMIN_ID = import.meta.env.VITE_SUPER_ADMIN_ID;

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onGoBack: () => void;
}

const sectionCardSx = {
  borderRadius: 2.5, 
  border: 1, 
  borderColor: 'divider', 
  bgcolor: 'background.paper',
  boxShadow: 'none',
  overflow: 'hidden'
};

const sectionHeaderSx = {
  px: 2, 
  py: 1.25, 
  bgcolor: 'surface.muted', 
  borderBottom: 1, 
  borderColor: 'divider',
  display: 'flex',
  alignItems: 'center',
  gap: 1
};

const sectionBodySx = {
  p: 2
};

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onGoBack }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [isManualTurnEnabled, setIsManualTurnEnabled] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const { themePreference, effectiveMode, setThemePreference } = useThemeMode();

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
    <Container maxWidth="sm" sx={{ py: 3, pb: 16, px: 2 }}>
      {/* ─── Header ─── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
        <IconButton 
          onClick={onGoBack} 
          sx={{ 
            width: 38, 
            height: 38, 
            bgcolor: 'surface.muted', 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': { bgcolor: 'background.paper' }
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Ajustes</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          variant="outlined" 
          startIcon={<GroupIcon />}
          onClick={onGoBack}
          sx={{ 
            borderRadius: 2, 
            fontWeight: 700,
            borderColor: 'divider',
            color: 'text.primary',
            height: 36,
            px: 1.75,
            fontSize: '0.82rem',
            bgcolor: 'background.paper',
            '&:hover': { borderColor: 'text.secondary' }
          }}
        >
          Mis Grupos
        </Button>
      </Stack>

      <Stack spacing={2}>
        {/* ─── Sección 1: Información General ─── */}
        <Paper sx={sectionCardSx} elevation={0}>
          <Box sx={sectionHeaderSx}>
            <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.04em', color: 'text.secondary' }}>
              INFORMACIÓN GENERAL
            </Typography>
          </Box>
          <Box sx={sectionBodySx}>
            <Stack spacing={2}>
              <TextField 
                label="Nombre del Grupo" 
                fullWidth 
                size="small"
                value={localSettings.groupName} 
                onChange={(e) => setLocalSettings({ ...localSettings, groupName: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><GroupIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                }}
              />
              <TextField 
                label="Monto de la Cuota" 
                type="text" 
                fullWidth 
                size="small"
                value={localSettings.quotaAmount === 0 ? '' : new Intl.NumberFormat('es-CL').format(localSettings.quotaAmount)} 
                disabled={localSettings.currentTurn > 1}
                helperText={localSettings.currentTurn > 1 ? "⚠️ Polla iniciada. Monto bloqueado." : "Monto por participante en cada turno"}
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
            <FrequencyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.04em', color: 'text.secondary' }}>
              FRECUENCIA Y FECHAS
            </Typography>
          </Box>
          <Box sx={sectionBodySx}>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Frecuencia de Pago</InputLabel>
                <Select 
                  label="Frecuencia de Pago" 
                  value={localSettings.frequency} 
                  onChange={e => {
                    const newFreq = e.target.value as Frequency;
                    setLocalSettings({...localSettings, frequency: newFreq });
                  }}
                  startAdornment={<InputAdornment position="start" sx={{ ml: 0.5, mr: 1.5 }}><FrequencyIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>}
                >
                  <MenuItem value="biweekly">Quincenal (Día 15 y Fin de mes)</MenuItem>
                  <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
                </Select>
              </FormControl>
              
              {/* Panel de Fecha de Inicio */}
              <Box sx={{ 
                bgcolor: 'surface.muted', 
                borderRadius: 2, 
                border: 1, 
                borderColor: 'divider',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  px: 1.75, 
                  py: 1.25, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.25,
                  borderBottom: 1,
                  borderColor: 'divider'
                }}>
                  <CalendarIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ 
                      fontWeight: 700, 
                      fontSize: '0.68rem', 
                      letterSpacing: '0.04em',
                      color: 'text.secondary',
                      display: 'block'
                    }}>
                      FECHA DE INICIO
                    </Typography>
                    {formattedStartDate && (
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.2 }}>
                        {formattedStartDate}
                      </Typography>
                    )}
                  </Box>
                  {localSettings.currentTurn > 1 && (
                    <Chip 
                      icon={<InfoIcon sx={{ fontSize: '13px !important' }} />}
                      label="En curso" 
                      size="small" 
                      sx={{ 
                        bgcolor: 'surface.pending', 
                        color: 'warning.main', 
                        fontWeight: 800, 
                        fontSize: '0.62rem',
                        height: 22,
                        borderRadius: 1,
                        '& .MuiChip-icon': { color: 'warning.main' }
                      }} 
                    />
                  )}
                </Box>
                <Box sx={{ p: 1.5 }}>
                  <TextField 
                    type="date" 
                    fullWidth 
                    size="small"
                    value={localSettings.startDate || ''} 
                    disabled={localSettings.currentTurn > 1}
                    onChange={e => setLocalSettings({...localSettings, startDate: e.target.value})} 
                    InputLabelProps={{ shrink: true }} 
                    helperText={localSettings.currentTurn > 1 ? "Bloqueado: La polla ya inició." : "Fecha base del primer turno."}
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
            <TimerIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.04em', color: 'text.secondary' }}>
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
                fontSize: '0.62rem',
                height: 20,
                borderRadius: 1
              }} 
            />
          </Box>
          <Box sx={sectionBodySx}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.8rem' }}>
              Días extra tras el vencimiento antes de considerar el pago atrasado.
            </Typography>

            {localSettings.frequency === 'biweekly' ? (
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField 
                    label="Quincena (15)" 
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
                    helperText="Días tras fin mes"
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
                size="small"
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

        {/* ─── Sección 4: Modo Noche / Día / Automático (Sistema) ─── */}
        <Paper sx={sectionCardSx} elevation={0}>
          <Box sx={sectionHeaderSx}>
            <PaletteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.04em', color: 'text.secondary' }}>
              APARIENCIA (TEMA)
            </Typography>
          </Box>
          <Box sx={sectionBodySx}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
              Elige cómo ver la aplicación. En "Automático" cambiará solo cuando tu teléfono o computador pase a modo noche.
            </Typography>
            
            <ToggleButtonGroup
              fullWidth
              size="small"
              value={themePreference}
              exclusive
              onChange={(_, val: ThemePreference | null) => {
                if (val) setThemePreference(val);
              }}
              sx={{
                bgcolor: 'surface.muted',
                p: 0.5,
                borderRadius: 2,
                '& .MuiToggleButton-root': {
                  borderRadius: 1.5,
                  border: 0,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  py: 1,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                  }
                }
              }}
            >
              <ToggleButton value="light">
                <LightModeIcon sx={{ fontSize: 16, mr: 0.75, color: '#F59E0B' }} />
                Día
              </ToggleButton>
              <ToggleButton value="dark">
                <DarkModeIcon sx={{ fontSize: 16, mr: 0.75, color: '#6366F1' }} />
                Noche
              </ToggleButton>
              <ToggleButton value="system">
                <AutoModeIcon sx={{ fontSize: 16, mr: 0.75, color: 'secondary.main' }} />
                Automático
              </ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center', fontSize: '0.72rem' }}>
              Activo ahora: <b>{effectiveMode === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</b> {themePreference === 'system' ? '(siguiendo tu sistema)' : '(fijado manualmente)'}
            </Typography>
          </Box>
        </Paper>

        {/* ─── Sección 5: Control de Turno (Super Admin) ─── */}
        {auth?.currentUser?.uid === SUPER_ADMIN_ID && (
          <Paper sx={{ ...sectionCardSx, borderColor: 'warning.main' }} elevation={0}>
            <Box sx={{ ...sectionHeaderSx, bgcolor: 'surface.pending' }}>
              <NumberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.04em', color: 'warning.main' }}>
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
                  fontSize: '0.62rem',
                  height: 20,
                  borderRadius: 1
                }} 
              />
            </Box>
            <Box sx={sectionBodySx}>
              <TextField 
                label="Turno Forzado" 
                type="number" 
                fullWidth 
                size="small"
                disabled={!isManualTurnEnabled}
                value={localSettings.currentTurn} 
                onChange={(e) => setLocalSettings({ ...localSettings, currentTurn: Number(e.target.value) })}
                helperText={!isManualTurnEnabled ? "Calculado automáticamente por fecha." : "⚠️ Edición manual habilitada."}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><NumberIcon sx={{ color: isManualTurnEnabled ? 'warning.main' : 'text.disabled', fontSize: 18 }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Recalcular según fecha real">
                        <IconButton onClick={() => setLocalSettings({ ...localSettings, currentTurn: calculateCurrentTurnFromDate(localSettings) })} edge="end" size="small" sx={{ mr: 0.5 }}>
                          <SyncIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isManualTurnEnabled ? "Bloquear Turno" : "Desbloquear edición manual"}>
                        <IconButton onClick={() => setIsManualTurnEnabled(!isManualTurnEnabled)} edge="end" size="small">
                          {isManualTurnEnabled ? <LockOpenIcon color="warning" fontSize="small" /> : <LockIcon fontSize="small" />}
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
            borderRadius: 2, 
            py: 1.25, 
            minHeight: 48,
            fontWeight: 800, 
            bgcolor: hasChanges ? 'secondary.main' : undefined,
            color: '#FFFFFF',
            fontSize: '0.95rem',
            transition: 'all 0.15s ease'
          }}
        >
          {hasChanges ? "Guardar Ajustes" : "Sin Cambios Pendientes"}
        </Button>
      </Stack>
    </Container>
  );
};

export default SettingsView;
