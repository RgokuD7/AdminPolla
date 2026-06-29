import React from "react";
import {
  Typography,
  Container,
  Card,
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
  Chip
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
  Info as InfoIcon
} from "@mui/icons-material";
import { AppSettings, Frequency } from "@/types";
import { calculateCurrentTurnFromDate, formatDateFull } from "@/utils/helpers";
import { auth } from "../firebase";



const SUPER_ADMIN_ID = import.meta.env.VITE_SUPER_ADMIN_ID;

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onGoBack: () => void;
}

const sectionCardSx = {
  p: 0, 
  borderRadius: 4, 
  border: '1px solid #E5E7EB', 
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  overflow: 'hidden'
};

const sectionHeaderSx = {
  px: 2.5, 
  py: 1.5, 
  bgcolor: '#F9FAFB', 
  borderBottom: '1px solid #F3F4F6',
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

  // Detectar cambios para habilitar botón
  React.useEffect(() => {
     setHasChanges(JSON.stringify(settings) !== JSON.stringify(localSettings));
  }, [localSettings, settings]);

  const handleSave = () => {
      onUpdate(localSettings);
      // Pequeño hack para resetear estado de cambios tras update (aunque el padre renderizará de nuevo)
      setHasChanges(false);
  };

  // Formatear la fecha de inicio para mostrarla legible
  const formattedStartDate = localSettings.startDate 
    ? formatDateFull(localSettings.startDate)
    : null;

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 16 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <IconButtonBack onClick={onGoBack} />
        <Typography variant="h5" sx={{ fontWeight: 900 }}>Ajustes</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button 
            variant="outlined" 
            color="inherit"
            startIcon={<GroupIcon />}
            onClick={onGoBack}
            sx={{ 
                borderRadius: 4, 
                textTransform: 'none', 
                fontWeight: 700,
                borderWidth: 2,
                borderColor: 'rgba(0,0,0,0.1)',
                '&:hover': {
                    borderWidth: 2,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'rgba(37, 99, 235, 0.05)'
                }
            }}
        >
            Mis Pollas
        </Button>
      </Stack>

      <Stack spacing={2.5}>
        {/* ─── Sección 1: Información General ─── */}
        <Card sx={sectionCardSx}>
          <Box sx={sectionHeaderSx}>
            <GroupIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Información del Grupo
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
                label="Monto Cuota" 
                type="text" 
                fullWidth 
                value={localSettings.quotaAmount === 0 ? '' : new Intl.NumberFormat('es-CL').format(localSettings.quotaAmount)} 
                disabled={localSettings.currentTurn > 1}
                helperText={localSettings.currentTurn > 1 ? "⚠️ Polla iniciada. No se puede cambiar el monto." : ""}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\./g, '');
                  if (rawValue === '') {
                      setLocalSettings({ ...localSettings, quotaAmount: 0 });
                  } else if (/^\d*$/.test(rawValue)) {
                      setLocalSettings({ ...localSettings, quotaAmount: Number(rawValue) });
                  }
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>$</Typography></InputAdornment>,
                }} 
              />
            </Stack>
          </Box>
        </Card>

        {/* ─── Sección 2: Frecuencia ─── */}
        <Card sx={sectionCardSx}>
          <Box sx={sectionHeaderSx}>
            <FrequencyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Frecuencia y Calendario
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
                   <MenuItem value="biweekly">Quincenal (15 y Fin de mes)</MenuItem>
                   <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
                </Select>
              </FormControl>
              
              {/* ─── Fecha de Inicio (Rediseñada) ─── */}
              <Box sx={{ 
                bgcolor: '#F9FAFB', 
                borderRadius: 3, 
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  px: 2, py: 1.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  borderBottom: '1px solid #F3F4F6'
                }}>
                  <CalendarIcon sx={{ fontSize: 20, color: '#059669' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ 
                      fontWeight: 700, 
                      fontSize: '0.7rem', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      color: 'text.secondary',
                      display: 'block',
                      lineHeight: 1.2
                    }}>
                      Fecha de Inicio
                    </Typography>
                    {formattedStartDate && (
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: 'text.primary',
                        mt: 0.25
                      }}>
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
                        bgcolor: '#FEF3C7', 
                        color: '#92400E', 
                        fontWeight: 700, 
                        fontSize: '0.65rem',
                        height: 24,
                        '& .MuiChip-icon': { color: '#92400E' }
                      }} 
                    />
                  )}
                </Box>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <TextField 
                    type="date" 
                    fullWidth 
                    size="small"
                    value={localSettings.startDate || ''} 
                    disabled={localSettings.currentTurn > 1}
                    onChange={e => setLocalSettings({...localSettings, startDate: e.target.value})} 
                    InputLabelProps={{ shrink: true }} 
                    helperText={localSettings.currentTurn > 1 ? "No se puede editar: La polla ya está en marcha." : "Selecciona cuándo inicia el primer turno."}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                      },
                      '& .MuiFormHelperText-root': {
                        mx: 0,
                        mt: 1,
                        fontSize: '0.7rem'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          </Box>
        </Card>

        {/* ─── Sección 3: Días de Gracia ─── */}
        <Card sx={sectionCardSx}>
          <Box sx={sectionHeaderSx}>
            <TimerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Días de Gracia
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip 
              label="Tolerancia" 
              size="small"
              sx={{ 
                bgcolor: '#EFF6FF', 
                color: '#1D4ED8', 
                fontWeight: 700, 
                fontSize: '0.6rem',
                height: 22,
                letterSpacing: '0.03em'
              }} 
            />
          </Box>
          <Box sx={sectionBodySx}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.8rem', lineHeight: 1.5 }}>
              Días extra de tolerancia después de la fecha de vencimiento para considerar el pago como a tiempo.
            </Typography>

            {localSettings.frequency === 'biweekly' ? (
              <Grid container spacing={2}>
                 <Grid item xs={6}>
                   <TextField 
                      label="Día 15" 
                      helperText="Tras el 15"
                      type="number" 
                      fullWidth 
                      size="small"
                      value={localSettings.graceDays1 || ''} 
                      onChange={(e) => setLocalSettings({ ...localSettings, graceDays1: Number(e.target.value) })}
                      InputProps={{ 
                        endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>días</Typography></InputAdornment>,
                        startAdornment: <InputAdornment position="start"><TimerIcon fontSize="small" sx={{ color: '#D97706' }} /></InputAdornment>
                      }}
                    />
                 </Grid>
                 <Grid item xs={6}>
                   <TextField 
                      label="Fin de Mes" 
                      helperText="Tras fin de mes"
                      type="number" 
                      fullWidth 
                      size="small"
                      value={localSettings.graceDays2 || ''} 
                      onChange={(e) => setLocalSettings({ ...localSettings, graceDays2: Number(e.target.value) })}
                      InputProps={{ 
                        endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>días</Typography></InputAdornment>,
                        startAdornment: <InputAdornment position="start"><TimerIcon fontSize="small" sx={{ color: '#D97706' }} /></InputAdornment>
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
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: '#D97706' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>días</Typography></InputAdornment>,
                }} 
              />
            )}
          </Box>
        </Card>

        {/* ─── Sección 4: Turno Actual (Solo Super Admin) ─── */}
        {auth?.currentUser?.uid === SUPER_ADMIN_ID && (
          <Card sx={{ ...sectionCardSx, border: '1px solid #FDE68A' }}>
            <Box sx={{ ...sectionHeaderSx, bgcolor: '#FFFBEB', borderBottom: '1px solid #FEF3C7' }}>
              <NumberIcon sx={{ fontSize: 18, color: '#D97706' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#92400E' }}>
                Control de Turno
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Chip 
                label="Admin" 
                size="small"
                sx={{ 
                  bgcolor: '#FEF3C7', 
                  color: '#92400E', 
                  fontWeight: 700, 
                  fontSize: '0.6rem',
                  height: 22,
                  letterSpacing: '0.03em'
                }} 
              />
            </Box>
            <Box sx={sectionBodySx}>
              <TextField 
                label="Turno Actual" 
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
          </Card>
        )}

        {/* ─── Botón Guardar ─── */}
        <Button 
          variant="contained" 
          color="primary"
          fullWidth 
          size="large"
          startIcon={hasChanges ? <SaveIcon /> : undefined}
          onClick={handleSave} 
          disabled={!hasChanges}
          sx={{ 
            borderRadius: 3, 
            mt: 2, 
            py: 1.5, 
            fontWeight: 700, 
            boxShadow: hasChanges ? '0 4px 15px rgba(17, 24, 39, 0.25)' : 'none',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          {hasChanges ? "Guardar Cambios" : "Sin Cambios"}
        </Button>
      </Stack>
    </Container>
  );
};

// Pequeño componente local para el botón de atrás
const IconButtonBack = ({ onClick }: { onClick: () => void }) => (
  <Button 
    onClick={onClick}
    sx={{ 
      minWidth: 40, width: 40, height: 40, borderRadius: '50%', p: 0, 
      color: 'text.primary', bgcolor: 'transparent', '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } 
    }}
  >
    <ArrowBackIcon />
  </Button>
);

export default SettingsView;
