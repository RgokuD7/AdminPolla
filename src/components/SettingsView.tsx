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
  Tooltip
} from "@mui/material";
import { 
  ArrowBack as ArrowBackIcon,
  AttachMoney as AmountIcon,
  Group as GroupIcon,
  EventRepeat as FrequencyIcon,

  Timer as TimerIcon,
  Numbers as NumberIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Sync as SyncIcon
} from "@mui/icons-material";
import { AppSettings, Frequency } from "@/types";
import { calculateCurrentTurnFromDate } from "@/utils/helpers";
import { auth } from "../firebase";



const SUPER_ADMIN_ID = import.meta.env.VITE_SUPER_ADMIN_ID;

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onGoBack: () => void;
}

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

  return (
    <Container maxWidth="sm" sx={{ py: 6, pb: 16 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
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

      <Stack spacing={3}>
        {/* Sección: Información General */}
        <Card sx={{ p: 3, borderRadius: 4, border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            Información del Grupo
          </Typography>
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
        </Card>

        {/* Sección: Reglas de Pago */}
        <Card sx={{ p: 3, borderRadius: 4, border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            Reglas de Pago
          </Typography>
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
            
            <TextField 
                label="Fecha de Inicio" 
                type="date" 
                fullWidth 
                value={localSettings.startDate || ''} 
                disabled={localSettings.currentTurn > 1}
                onChange={e => setLocalSettings({...localSettings, startDate: e.target.value})} 
                InputLabelProps={{ shrink: true }} 
                helperText={localSettings.currentTurn > 1 ? "⚠️ No se puede editar: La polla ya está en marcha." : "Fecha de inicio del primer turno."}
                InputProps={{
                  startAdornment: <InputAdornment position="start" sx={{ ml: 1, mr: 1, color: 'text.secondary' }}>📅</InputAdornment>
                }}
            />

            {localSettings.frequency === 'biweekly' ? (
              <Box sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb: 1.5, fontWeight: 600 }}>Días de Gracia (Tolerancia)</Typography>
                <Grid container spacing={2}>
                   <Grid item xs={6}>
                     <TextField 
                        label="Día 15" 
                        helperText="Días extra tras el 15"
                        type="number" 
                        fullWidth 
                        size="small"
                        value={localSettings.graceDays1 || ''} 
                        onChange={(e) => setLocalSettings({ ...localSettings, graceDays1: Number(e.target.value) })}
                        InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                      />
                   </Grid>
                   <Grid item xs={6}>
                     <TextField 
                        label="Fin de Mes" 
                        helperText="Días extra fin mes"
                        type="number" 
                        fullWidth 
                        size="small"
                        value={localSettings.graceDays2 || ''} 
                        onChange={(e) => setLocalSettings({ ...localSettings, graceDays2: Number(e.target.value) })}
                        InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                      />
                   </Grid>
                </Grid>
              </Box>
            ) : (
              <TextField 
                label="Días de Gracia" 
                helperText="Días extra de tolerancia para pagar después de la fecha de vencimiento"
                type="number" 
                fullWidth 
                value={localSettings.graceDays1 || ''} 
                onChange={(e) => setLocalSettings({ ...localSettings, graceDays1: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }} 
              />
            )}
            
            {auth?.currentUser?.uid === SUPER_ADMIN_ID && (
              <>
                <Divider sx={{ my: 1 }} />
                
                <TextField 
                  label="Turno Actual (Automático)" 
                  type="number" 
                  fullWidth 
                  disabled={!isManualTurnEnabled}
                  value={localSettings.currentTurn} 
                  onChange={(e) => setLocalSettings({ ...localSettings, currentTurn: Number(e.target.value) })}
                  helperText={!isManualTurnEnabled ? "Calculado automáticamente según la fecha." : "Modo manual activado."}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><NumberIcon sx={{ color: isManualTurnEnabled ? 'warning.main' : 'text.disabled' }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                         <Tooltip title="Recalcular según fecha real">
                          <IconButton onClick={() => setLocalSettings({ ...localSettings, currentTurn: calculateCurrentTurnFromDate(localSettings) })} edge="end" size="small" sx={{ mr: 1 }}>
                            <SyncIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={isManualTurnEnabled ? "Bloquear Turno" : "Desbloquear edición manual (Admin)"}>
                          <IconButton onClick={() => setIsManualTurnEnabled(!isManualTurnEnabled)} edge="end" size="small">
                            {isManualTurnEnabled ? <LockOpenIcon color="warning" /> : <LockIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    )
                  }} 
                />
              </>
            )}
          </Stack>
        </Card>

        <Button 
          variant="contained" 
          color="primary"
          fullWidth 
          size="large"
          onClick={handleSave} 
          disabled={!hasChanges}
          sx={{ 
            borderRadius: 3, 
            mt: 4, 
            py: 1.5, 
            fontWeight: 700, 
            boxShadow: hasChanges ? '0 4px 15px rgba(37, 99, 235, 0.3)' : 'none',
            fontSize: '1rem'
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
