import React, { useState } from "react";
import {
  Typography,
  Container,
  Box,
  Card,
  CardContent,
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
  Person as PersonIcon,
  Logout as LogoutIcon
} from "@mui/icons-material";
import { AppSettings, Frequency, PollaGroup } from "@/types";
import { formatCurrency, getCollectedAmount, getParticipantName, calculateCurrentTurnFromDate } from "@/utils/helpers";

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
    <Container maxWidth="sm" sx={{ py: 6, pb: 12, position: 'relative' }}>
      <IconButton 
         onClick={onLogout} 
         sx={{ 
           position: 'absolute', 
           top: 12, 
           right: 0, 
           color: 'text.disabled',
           '&:hover': { color: 'error.main', bgcolor: '#FEF2F2' }
         }}
      >
         <LogoutIcon />
      </IconButton>
      <Stack alignItems="center" spacing={2} sx={{ mb: 6, mt: 4 }}>
        <Box 
            component="img" 
            src="/logo.png" 
            sx={{ 
                width: groups.length > 0 ? 120 : 200, 
                height: groups.length > 0 ? 120 : 200,
                objectFit: 'contain',
                transition: 'all 0.5s ease', // Animación suave
                // Eliminamos cualquier borde o sombra oscura fuerte
                filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.08))'
            }} 
        />
        {/* El logo ya incluye texto a veces, pero mantenemos el texto HTML por accesibilidad y estilo consistente, 
            o lo ocultamos si el logo tiene texto. Asumiremos que es un LOGO ICONO mayormente. */}
        <Typography variant={groups.length > 0 ? "h4" : "h3"} sx={{ fontWeight: 900, letterSpacing: '-1px', color: '#1F2937', transition: 'all 0.3s ease' }}>
            <Box component="span" sx={{ color: '#234574' }}>Admin</Box><Box component="span" sx={{ color: '#059669' }}>Polla</Box>
        </Typography>
      </Stack>

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, px: 0.5 }}>
        Mis Grupos
      </Typography>
      
      <Stack spacing={1.5}>
        {groups.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed', bgcolor: 'transparent', borderRadius: 3 }}>
            <Typography variant="body1" color="text.secondary">No hay grupos registrados</Typography>
            <Button variant="contained" sx={{ mt: 3, px: 4 }} onClick={() => setOpen(true)}>Crear Polla</Button>
          </Paper>
        ) : (
          groups.map((group) => {
            const currentTurn = group.settings.currentTurn || 1;
            const stats = getCollectedAmount(group.participants, currentTurn, group.settings.quotaAmount);
            const recipient = group.participants.find(p => p.turnNumber === currentTurn);
            const isCompleted = stats.progress >= 100;

            return (
            <Card 
                key={group.id} 
                onClick={() => onSelect(group.id)} 
                sx={{ 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease', 
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
                    '&:active': { transform: 'scale(0.99)' }
                }}
            >
              <CardContent sx={{ p: 2.5 }}>
                {/* Header: Nombre y Delete */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{group.settings.groupName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                       <GroupsIcon sx={{ fontSize: 14 }} /> {group.participants.length} integrantes
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => { e.stopPropagation(); setDeleteId(group.id); }} 
                    sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: '#FEE2E2' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {/* Info Financiera */}
                <Stack spacing={2}>
                    {/* Beneficiario */}
                    <Box sx={{ bgcolor: '#F3F4F6', p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: isCompleted ? '#10B981' : '#3B82F6', fontSize: 14, fontWeight: 700 }}>
                            {currentTurn}
                        </Avatar>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                LE TOCA A:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
                                {recipient ? getParticipantName(recipient) : "Nadie"}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Progreso Recaudacion */}
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: isCompleted ? '#059669' : 'text.secondary' }}>
                                {isCompleted ? "¡Completo!" : "Recaudado"}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {formatCurrency(stats.collected)} <Typography component="span" variant="caption" color="text.secondary">/ {formatCurrency(stats.total)}</Typography>
                            </Typography>
                        </Stack>
                        <LinearProgress 
                            variant="determinate" 
                            value={stats.progress} 
                            sx={{ 
                                height: 6, 
                                borderRadius: 3, 
                                bgcolor: '#F3F4F6',
                                '& .MuiLinearProgress-bar': { bgcolor: isCompleted ? '#10B981' : '#3B82F6', borderRadius: 3 }
                            }} 
                        />
                    </Box>

                    {/* Footer Info */}
                    <Stack direction="row" spacing={1}>
                        <Chip 
                            size="small" 
                            label={FREQUENCY_LABELS[group.settings.frequency] || group.settings.frequency} 
                            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#EFF6FF', color: '#1D4ED8' }} 
                        />
                        <Chip 
                            size="small" 
                            icon={<MoneyIcon sx={{ fontSize: '14px !important' }} />}
                            label={formatCurrency(group.settings.quotaAmount)} 
                            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#ECFDF5', color: '#047857', '& .MuiChip-icon': { color: '#047857' } }} 
                        />
                    </Stack>
                </Stack>
              </CardContent>
            </Card>
          )})
        )}
      </Stack>



      <Fab 
        sx={{ 
            position: 'fixed', 
            bottom: 32, 
            right: 24, 
            bgcolor: '#059669', 
            color: 'white',
            borderRadius: 3, 
            boxShadow: '0 4px 15px rgba(5, 150, 105, 0.4)',
            '&:hover': { bgcolor: '#047857' }
        }} 
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Dialogo CREAR */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ pt: 3, fontWeight: 800 }}>Nueva Polla</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            <TextField label="Nombre del Grupo" fullWidth value={form.groupName} onChange={e => setForm({...form, groupName: e.target.value})} />
            
            <TextField 
              label="Monto Cuota" 
              type="text" 
              fullWidth 
              value={new Intl.NumberFormat('es-CL').format(form.quotaAmount)} 
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, '');
                if (/^\d*$/.test(rawValue)) {
                  setForm({ ...form, quotaAmount: Number(rawValue) });
                }
              }}
              InputProps={{ 
                startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>$</Typography></InputAdornment> 
              }} 
            />

            <FormControl fullWidth>
              <InputLabel>Frecuencia</InputLabel>
              <Select label="Frecuencia" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value as Frequency})}>
                <MenuItem value="biweekly">Quincenal (15 y Fin)</MenuItem>
                <MenuItem value="monthly">Mensual (Fin)</MenuItem>
              </Select>
            </FormControl>

            {form.frequency === 'biweekly' ? (
              <Box sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb: 1.5, fontWeight: 600 }}>Días de Gracia (Tolerancia)</Typography>
                <Grid container spacing={2}>
                   <Grid item xs={6}>
                     <TextField 
                        label="Día 15" 
                        helperText="Tras día 15"
                        type="number" 
                        fullWidth 
                        size="small"
                        value={form.graceDays1} 
                        onChange={(e) => setForm({ ...form, graceDays1: Number(e.target.value) })}
                        InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                      />
                   </Grid>
                   <Grid item xs={6}>
                     <TextField 
                        label="Fin Mes" 
                        helperText="Tras fin mes"
                        type="number" 
                        fullWidth 
                        size="small"
                        value={form.graceDays2} 
                        onChange={(e) => setForm({ ...form, graceDays2: Number(e.target.value) })}
                        InputProps={{ endAdornment: <InputAdornment position="end"><TimerIcon fontSize="small" /></InputAdornment> }}
                      />
                   </Grid>
                </Grid>
              </Box>
            ) : (
               <TextField 
                label="Días de Gracia" 
                helperText="Días extra para pagar"
                type="number" 
                fullWidth 
                value={form.graceDays1} 
                onChange={(e) => setForm({ ...form, graceDays1: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }} 
              />
            )}

            <TextField label="Fecha de Inicio" type="date" fullWidth value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cerrar</Button>
          <Button variant="contained" onClick={() => { 
            if(form.groupName.trim()) { 
               // Calcular turno inicial real basado en la fecha (y gracia)
               const realTurn = calculateCurrentTurnFromDate(form);
               const finalForm = { ...form, currentTurn: realTurn };
               onCreate(finalForm); 
               setOpen(false); 
            } 
          }}>Confirmar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogo CONFIRMAR ELIMINAR */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar este grupo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta acción no se puede deshacer. Se perderán todos los datos y el historial de pagos de este grupo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit">Cancelar</Button>
          <Button variant="contained" color="error" onClick={() => { if(deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ListView;
