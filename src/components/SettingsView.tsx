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
  Grid
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { AppSettings, Frequency } from "@/types";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onGoBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onGoBack }) => {
  return (
    <Container maxWidth="sm" sx={{ py: 6, pb: 16 }}>
      <Typography variant="h5" sx={{ mb: 4, fontWeight: 900 }}>Ajustes</Typography>
      <Stack spacing={3}>
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={3}>
            <TextField label="Nombre del Grupo" fullWidth value={settings.groupName} onChange={(e) => onUpdate({ ...settings, groupName: e.target.value })} />
            <TextField label="Monto Cuota ($)" type="number" fullWidth value={settings.quotaAmount} onChange={(e) => onUpdate({ ...settings, quotaAmount: Number(e.target.value) })} />
            <FormControl fullWidth>
              <InputLabel>Frecuencia</InputLabel>
              <Select label="Frecuencia" value={settings.frequency} onChange={e => onUpdate({...settings, frequency: e.target.value as Frequency})}>
                 <MenuItem value="weekly">Semanal</MenuItem>
                 <MenuItem value="biweekly">Quincenal (15 y Fin)</MenuItem>
                 <MenuItem value="monthly">Mensual (Fin de mes)</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={2}>
               <Grid item xs={6}><TextField label="Gracia Q1" type="number" fullWidth value={settings.graceDays1} onChange={(e) => onUpdate({ ...settings, graceDays1: Number(e.target.value) })} /></Grid>
               <Grid item xs={6}><TextField label="Gracia Q2" type="number" fullWidth value={settings.graceDays2} onChange={(e) => onUpdate({ ...settings, graceDays2: Number(e.target.value) })} disabled={settings.frequency !== 'biweekly'} /></Grid>
            </Grid>
            <TextField label="Turno que cobra hoy" type="number" fullWidth value={settings.currentTurn} onChange={(e) => onUpdate({ ...settings, currentTurn: Number(e.target.value) })} />
          </Stack>
        </Card>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} fullWidth onClick={onGoBack} sx={{ borderRadius: 3 }}>Cambiar de Grupo</Button>
      </Stack>
    </Container>
  );
};

export default SettingsView;
