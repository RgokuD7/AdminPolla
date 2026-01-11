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
  InputAdornment
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import { AppSettings, Frequency, PollaGroup } from "@/types";
import { formatCurrency } from "@/utils/helpers";

interface ListViewProps {
  groups: PollaGroup[];
  onSelect: (id: string) => void;
  onCreate: (s: AppSettings) => void;
  onDelete: (id: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ groups, onSelect, onCreate, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AppSettings>({ groupName: "", quotaAmount: 20000, currentTurn: 1, frequency: 'biweekly', startDate: new Date().toISOString().split('T')[0], graceDays1: 0, graceDays2: 0, isLocked: false });

  return (
    <Container maxWidth="sm" sx={{ py: 6, pb: 12 }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>AdminPolla</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>Mis Grupos</Typography>
      
      <Stack spacing={1.5}>
        {groups.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed', bgcolor: 'transparent', borderRadius: 3 }}>
            <Typography variant="body1" color="text.secondary">No hay grupos registrados</Typography>
            <Button variant="contained" sx={{ mt: 3, px: 4 }} onClick={() => setOpen(true)}>Crear Polla</Button>
          </Paper>
        ) : (
          groups.map((group) => (
            <Card key={group.id} onClick={() => onSelect(group.id)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:active': { transform: 'translateY(1px)' } }}>
              <CardContent sx={{ p: "16px 20px !important" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>{group.settings.groupName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.settings.frequency} • {formatCurrency(group.settings.quotaAmount)}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 24, borderRadius: 3 }} onClick={() => setOpen(true)}>
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ pt: 3, fontWeight: 800 }}>Nueva Polla</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            <TextField label="Nombre del Grupo" fullWidth value={form.groupName} onChange={e => setForm({...form, groupName: e.target.value})} />
            <TextField label="Monto Cuota" type="number" fullWidth value={form.quotaAmount} onChange={e => setForm({...form, quotaAmount: Number(e.target.value)})} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            <FormControl fullWidth>
              <InputLabel>Frecuencia</InputLabel>
              <Select label="Frecuencia" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value as Frequency})}>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="biweekly">Quincenal (15 y Fin)</MenuItem>
                <MenuItem value="monthly">Mensual (Fin)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Fecha de Inicio" type="date" fullWidth value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cerrar</Button>
          <Button variant="contained" onClick={() => { if(form.groupName.trim()) { onCreate(form); setOpen(false); } }}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ListView;
