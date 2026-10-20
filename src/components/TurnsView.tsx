import React, { useState, useMemo } from "react";
import {
  Typography,
  Container,
  Box,
  IconButton,
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
  FormControlLabel,
  Switch,
  Chip,
  Menu,
  Tooltip,
  Divider,
  Alert,
  Collapse
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Shuffle as ShuffleIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  ContentPaste as PasteIcon,
  Edit as EditIcon,
  PersonAddAlt1 as PersonAddIcon,
  WhatsApp as WhatsAppIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  MoreVert as MoreVertIcon,
  Event as EventIcon,
  Groups as GroupsIcon,
  AccountBalance as BankIcon,
  ExpandMore as ExpandIcon,
  Close as CloseIcon
} from "@mui/icons-material";
import { AppSettings, Participant } from "@/types";
import { 
  calculatePaymentDate, 
  formatDateReadable, 
  formatDateFull, 
  getParticipantName 
} from "@/utils/helpers";

interface TurnsViewProps { 
  participants: Participant[];
  settings: AppSettings;
  onAddParticipant: (p: Participant) => void;
  onUpdateParticipant: (p: Participant) => void;
  onRemoveParticipant: (id: string) => void;
  onShuffle: () => void;
  onReorder: (from: number, to: number) => void;
  onBulkImport: (participants: Participant[]) => void;
  onUpdateSettings: (s: AppSettings) => void;
  onSetTurnByDate: (pid: string, newTurn: number) => void;
}

const TurnsView: React.FC<TurnsViewProps> = ({ 
  participants, 
  settings,
  onAddParticipant, 
  onUpdateParticipant,
  onRemoveParticipant, 
  onShuffle, 
  onReorder, 
  onBulkImport,
  onUpdateSettings,
  onSetTurnByDate
}) => {
  const [name1, setName1] = useState("");
  const [phone1, setPhone1] = useState("");
  const [bank1, setBank1] = useState("");
  
  const [name2, setName2] = useState("");
  const [phone2, setPhone2] = useState("");
  const [bank2, setBank2] = useState("");
  
  const [isShared, setIsShared] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  // Menu State
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; pid: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Calendar Turn Reorder State
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState("");

  const availableDates = useMemo(() => {
    const dates = [];
    const count = participants.length > 0 ? participants.length : 1;
    for (let i = 1; i <= count; i++) {
      dates.push({
        turn: i,
        date: calculatePaymentDate(settings, i)
      });
    }
    return dates;
  }, [settings, participants.length]);

  const handleQuickAdd = () => { 
    if (name1.trim()) { 
      const newParticipant: Participant = {
        id: "p-" + Date.now(),
        type: isShared ? 'shared' : 'single',
        members: isShared ? [
          { name: name1.trim(), phone: phone1.trim(), bankDetails: bank1.trim(), paymentHistory: {} },
          { name: name2.trim(), phone: phone2.trim(), bankDetails: bank2.trim(), paymentHistory: {} }
        ] : [{ name: name1.trim(), phone: phone1.trim(), bankDetails: bank1.trim(), paymentHistory: {} }],
        isPaid: false,
        turnNumber: participants.length + 1,
        paymentHistory: {}
      };
      onAddParticipant(newParticipant);
      setName1(""); setPhone1(""); setBank1("");
      setName2(""); setPhone2(""); setBank2("");
      setIsShared(false);
      setShowAdvanced(false);
      setIsAddFormOpen(false);
    } 
  };

  const toggleLock = () => {
    if (settings.isLocked) {
      setLockDialogOpen(true);
    } else {
      onUpdateSettings({ ...settings, isLocked: true });
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, pid: string) => {
    setMenuAnchor({ el: event.currentTarget, pid });
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleEditClick = () => {
    const p = participants.find(p => p.id === menuAnchor?.pid);
    if (p) {
      setEditingParticipant({ ...p });
      setEditDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleSetDateClick = () => {
    const p = participants.find(p => p.id === menuAnchor?.pid);
    if (p) {
      setEditingParticipant(p);
      setTargetDate(calculatePaymentDate(settings, p.turnNumber));
      setDateDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleDeleteClick = () => {
    if (menuAnchor?.pid) {
      onRemoveParticipant(menuAnchor.pid);
    }
    handleCloseMenu();
  };

  const handleSaveEdit = () => {
    if (editingParticipant) {
      onUpdateParticipant(editingParticipant);
      setEditDialogOpen(false);
      setEditingParticipant(null);
    }
  };

  const handleSaveNewDate = () => {
    if (editingParticipant && targetDate) {
      const selected = availableDates.find(d => d.date === targetDate);
      if (selected) {
        onSetTurnByDate(editingParticipant.id, selected.turn);
        setDateDialogOpen(false);
        setEditingParticipant(null);
      }
    }
  };

  const updateEditMember = (index: number, field: 'name' | 'phone' | 'bankDetails', value: string) => {
    if (editingParticipant) {
      const newMembers = [...editingParticipant.members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      setEditingParticipant({ ...editingParticipant, members: newMembers });
    }
  };

  const handleImportBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const baseIndex = participants.length;
    const separators = ["/", ",", "&", "+", " y "];
    
    const newParticipants: Participant[] = lines.map((line, i) => {
      let parts: string[] = [line];
      for (const sep of separators) {
        if (line.includes(sep)) {
          parts = line.split(sep).map(s => s.trim()).filter(Boolean);
          break;
        }
      }

      const isSharedLine = parts.length === 2;
      return {
        id: "p-bulk-" + Date.now() + i,
        type: isSharedLine ? 'shared' : 'single',
        members: isSharedLine 
          ? [ { name: parts[0], phone: "", paymentHistory: {} }, { name: parts[1], phone: "", paymentHistory: {} } ]
          : [ { name: line, phone: "", paymentHistory: {} } ],
        isPaid: false,
        turnNumber: baseIndex + i + 1,
        paymentHistory: {}
      };
    });

    onBulkImport(newParticipants);
    setBulkOpen(false);
    setBulkText("");
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 16, px: 2 }}>
      {/* ─── Encabezado de la Vista de Turnos ─── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Calendario</Typography>
          <Chip 
            label={`${participants.length} turnos`} 
            size="small" 
            sx={{ bgcolor: 'surface.muted', fontWeight: 800, fontSize: '0.75rem', height: 26 }} 
          />
        </Stack>

        <Stack direction="row" spacing={1}>
          <Tooltip title={settings.isLocked ? "Desbloquear orden" : "Fijar orden definitivo"}>
            <Button 
              size="small" 
              variant={settings.isLocked ? "contained" : "outlined"} 
              color={settings.isLocked ? "primary" : "inherit"}
              onClick={toggleLock}
              startIcon={settings.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
              sx={{ 
                borderRadius: 2.5, 
                fontWeight: 700,
                fontSize: '0.8rem',
                borderColor: 'divider',
                minHeight: 40
              }}
            >
              {settings.isLocked ? "Fijado" : "Fijar"}
            </Button>
          </Tooltip>

          {!settings.isLocked && (
            <>
              <Tooltip title={settings.currentTurn > 1 ? "No se puede mezclar iniciado el periodo" : "Mezclar orden aleatorio"}>
                <span>
                  <IconButton 
                    onClick={onShuffle} 
                    disabled={settings.currentTurn > 1} 
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 2.5,
                      width: 40,
                      height: 40,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <ShuffleIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Pegar lista de nombres">
                <IconButton 
                  onClick={() => setBulkOpen(true)} 
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 2.5,
                    width: 40,
                    height: 40,
                    bgcolor: 'background.paper'
                  }}
                >
                  <PasteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      </Stack>

      {/* Alerta de Orden Bloqueado */}
      {settings.isLocked && (
        <Alert 
          severity="info" 
          icon={<LockIcon fontSize="inherit" />}
          sx={{ 
            mb: 3, 
            borderRadius: 3, 
            bgcolor: 'surface.muted', 
            color: 'text.primary',
            border: 1,
            borderColor: 'divider',
            fontWeight: 600
          }}
        >
          El orden de turnos está bloqueado para proteger las fechas pactadas.
        </Alert>
      )}

      {/* ─── Formulario de Agregar Integrante (Colapsable) ─── */}
      {!settings.isLocked && (
        <Box sx={{ mb: 3 }}>
          {!isAddFormOpen ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setIsAddFormOpen(true)}
              startIcon={<AddIcon />}
              sx={{
                py: 1.5,
                borderRadius: 3,
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: 'divider',
                color: 'secondary.main',
                bgcolor: 'background.paper',
                fontWeight: 700,
                fontSize: '0.95rem',
                minHeight: 52,
                '&:hover': {
                  borderColor: 'secondary.main',
                  bgcolor: 'surface.paid',
                  borderWidth: 2
                }
              }}
            >
              Agregar nuevo integrante
            </Button>
          ) : (
            <Paper 
              sx={{ 
                p: 2.5, 
                borderRadius: 3.5, 
                bgcolor: 'background.paper', 
                border: 1, 
                borderColor: 'secondary.main',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.08)'
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Nuevo Integrante
                  </Typography>
                  <IconButton size="small" onClick={() => setIsAddFormOpen(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <FormControlLabel
                  control={<Switch size="small" checked={isShared} onChange={e => setIsShared(e.target.checked)} color="secondary" />}
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GroupsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 700 }}>
                        Turno Compartido (2 personas)
                      </Typography>
                    </Stack>
                  }
                  sx={{ ml: 0.5 }}
                />

                <TextField 
                  placeholder={isShared ? "Nombre Persona 1" : "Nombre completo"}
                  fullWidth 
                  size="small"
                  value={name1} 
                  onChange={e => setName1(e.target.value)} 
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                  }}
                />

                {isShared && (
                  <TextField 
                    placeholder="Nombre Persona 2"
                    fullWidth 
                    size="small"
                    value={name2} 
                    onChange={e => setName2(e.target.value)} 
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                    }}
                  />
                )}

                <Typography 
                  variant="caption"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  sx={{ 
                    cursor: 'pointer',
                    color: 'text.secondary', 
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 700,
                    '&:hover': { color: 'secondary.main' }
                  }}
                >
                  {showAdvanced ? "Ocultar datos extra" : "＋ Agregar WhatsApp y datos bancarios"} 
                  <ExpandIcon sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: 16, ml: 0.5 }} />
                </Typography>

                <Collapse in={showAdvanced}>
                  <Stack spacing={1.5} sx={{ pt: 1 }}>
                    <TextField 
                      placeholder={isShared ? "WhatsApp Persona 1 (+569...)" : "WhatsApp (+569...)"} 
                      fullWidth 
                      size="small"
                      value={phone1} 
                      onChange={e => setPhone1(e.target.value)} 
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                      }}
                    />
                    <TextField 
                      placeholder="Datos de transferencia Persona 1...&#10;Banco, Tipo de Cuenta, Número, RUT" 
                      fullWidth 
                      multiline
                      minRows={3}
                      size="small"
                      value={bank1} 
                      onChange={e => setBank1(e.target.value)} 
                      InputProps={{
                        startAdornment: <InputAdornment position="start" sx={{ mt: 1 }}><BankIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                      }}
                    />
                    
                    {isShared && (
                      <>
                        <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">PERSONA 2</Typography></Divider>
                        <TextField 
                          placeholder="WhatsApp Persona 2" 
                          fullWidth 
                          size="small"
                          value={phone2} 
                          onChange={e => setPhone2(e.target.value)} 
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                          }}
                        />
                        <TextField 
                          placeholder="Datos de transferencia Persona 2..." 
                          fullWidth 
                          multiline
                          minRows={3}
                          size="small"
                          value={bank2} 
                          onChange={e => setBank2(e.target.value)} 
                          InputProps={{
                            startAdornment: <InputAdornment position="start" sx={{ mt: 1 }}><BankIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                          }}
                        />
                      </>
                    )}
                  </Stack>
                </Collapse>

                <Button 
                  variant="contained" 
                  onClick={handleQuickAdd} 
                  disabled={!name1.trim()}
                  fullWidth
                  startIcon={<AddIcon />}
                  sx={{ 
                    borderRadius: 2.5,
                    bgcolor: 'secondary.main',
                    color: '#FFFFFF',
                    minHeight: 48,
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  Confirmar y Añadir a la Lista
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      )}

      {/* ─── Timeline Visual de Turnos ─── */}
      <Paper 
        sx={{ 
          borderRadius: 4, 
          overflow: 'hidden', 
          border: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}
      >
        {participants.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              No hay participantes en la lista
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Agrega participantes o pega una lista con el botón superior.
            </Typography>
          </Box>
        ) : (
          participants
            .slice()
            .sort((a, b) => a.turnNumber - b.turnNumber)
            .map((p, idx) => {
              const paymentDate = calculatePaymentDate(settings, p.turnNumber);
              const dayNumber = paymentDate.split('-')[2];
              const monthShort = formatDateReadable(paymentDate).split(' ')[1]?.toUpperCase() || "";
              
              const isPast = p.turnNumber < settings.currentTurn;
              const isCurrent = p.turnNumber === settings.currentTurn;
              const hasDivider = idx < participants.length - 1;

              return (
                <Box
                  key={p.id}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    position: 'relative',
                    bgcolor: isCurrent ? 'surface.paid' : 'transparent',
                    opacity: isPast ? 0.6 : 1,
                    borderBottom: hasDivider ? 1 : 0,
                    borderColor: 'divider',
                    borderLeft: isCurrent ? 4 : 0,
                    borderLeftColor: 'secondary.main',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: isCurrent ? 'surface.paid' : 'surface.muted'
                    }
                  }}
                >
                  {/* Caja de Fecha Estilizada */}
                  <Box 
                    sx={{ 
                      minWidth: 54, 
                      width: 54,
                      height: 54,
                      borderRadius: 3, 
                      border: 1.5, 
                      borderColor: isCurrent ? 'secondary.main' : 'divider',
                      bgcolor: isCurrent ? 'background.paper' : 'surface.muted',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCurrent ? '0 4px 10px rgba(5, 150, 105, 0.15)' : 'none'
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 900, 
                        lineHeight: 1, 
                        color: isCurrent ? 'secondary.main' : 'accent.main',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {monthShort}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 900, 
                        fontSize: '1.2rem', 
                        lineHeight: 1.1, 
                        color: isCurrent ? 'secondary.main' : 'text.primary',
                        mt: 0.2
                      }}
                    >
                      {dayNumber}
                    </Typography>
                  </Box>

                  {/* Nombre y detalles del turno */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 800, 
                          color: 'text.primary',
                          lineHeight: 1.2
                        }}
                      >
                        {getParticipantName(p)}
                      </Typography>
                      {isCurrent && (
                        <Chip 
                          label="TURNO ACTUAL" 
                          size="small" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            bgcolor: 'secondary.main', 
                            color: '#FFFFFF' 
                          }} 
                        />
                      )}
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: 'surface.muted', 
                          color: 'text.secondary', 
                          px: 1, 
                          py: 0.2, 
                          borderRadius: 1 
                        }}
                      >
                        Turno #{p.turnNumber}
                      </Typography>
                      {p.type === 'shared' && (
                        <Chip 
                          label="Compartido" 
                          size="small" 
                          variant="outlined" 
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, borderColor: 'divider' }} 
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* Acciones para Reordenar y Menú */}
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {!settings.isLocked && (
                      <Stack direction="column">
                        <IconButton 
                          size="small" 
                          disabled={idx === 0 || p.turnNumber <= settings.currentTurn} 
                          onClick={() => onReorder(idx, idx - 1)} 
                          sx={{ p: 0.5, '&:disabled': { opacity: 0.15 } }}
                        >
                          <UpIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          disabled={idx === participants.length - 1 || p.turnNumber < settings.currentTurn} 
                          onClick={() => onReorder(idx, idx + 1)} 
                          sx={{ p: 0.5, '&:disabled': { opacity: 0.15 } }}
                        >
                          <DownIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleOpenMenu(e, p.id)} 
                      sx={{ color: 'text.secondary', p: 1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              );
            })
        )}
      </Paper>

      {/* ─── Menú de Acciones de un Participante ─── */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        elevation={3}
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            minWidth: 170,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          } 
        }}
      >
        <MenuItem onClick={handleEditClick} sx={{ py: 1.2, minHeight: 44 }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Editar Datos</Typography>
        </MenuItem>
        
        {participants.find(p => p.id === menuAnchor?.pid)?.turnNumber! >= settings.currentTurn && (
          <>
            <MenuItem onClick={handleSetDateClick} sx={{ py: 1.2, minHeight: 44 }}>
              <EventIcon fontSize="small" sx={{ mr: 1.5, color: 'accent.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Cambiar Fecha/Turno</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleDeleteClick} sx={{ py: 1.2, minHeight: 44, color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Eliminar</Typography>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* ─── Diálogo: Asignar Fecha/Turno ─── */}
      <Dialog 
        open={dateDialogOpen} 
        onClose={() => setDateDialogOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pt: 3 }}>Cambiar Turno por Fecha</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Selecciona la fecha deseada para {editingParticipant ? getParticipantName(editingParticipant) : ""}.
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Elegir Fecha / Turno</InputLabel>
            <Select 
              label="Elegir Fecha / Turno"
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)}
            >
              {availableDates.map(d => (
                <MenuItem key={d.turn} value={d.date} disabled={d.turn < settings.currentTurn}>
                  T#{d.turn} — {formatDateFull(d.date)} {d.turn < settings.currentTurn ? "(Cerrado)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDateDialogOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveNewDate} disabled={!targetDate} sx={{ fontWeight: 700 }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo: Editar Participante ─── */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pt: 3 }}>Editar Integrante</DialogTitle>
        <DialogContent>
          <FormControlLabel 
            control={
              <Switch 
                checked={editingParticipant?.type === 'shared'} 
                onChange={(e) => {
                  if (!editingParticipant) return;
                  const isSharedChecked = e.target.checked;
                  const newType = isSharedChecked ? 'shared' : 'single';
                  let newMembers = [...editingParticipant.members];
                  
                  if (isSharedChecked && newMembers.length < 2) {
                    newMembers.push({ name: '', phone: '', bankDetails: '', paymentHistory: {} });
                  } else if (!isSharedChecked && newMembers.length > 1) {
                    newMembers = [newMembers[0]];
                  }
                  
                  setEditingParticipant({ 
                    ...editingParticipant, 
                    type: newType, 
                    members: newMembers 
                  });
                }} 
                color="secondary"
              />
            } 
            label="Turno Compartido" 
            sx={{ mt: 1, mb: 2, display: 'block' }}
          />

          <Stack spacing={2.5}>
            {editingParticipant?.members.map((m, i) => (
              <Stack key={i} spacing={1.5}>
                {editingParticipant.type === 'shared' && (
                  <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 800 }}>
                    INTEGRANTE #{i + 1}
                  </Typography>
                )}
                <TextField 
                  placeholder={editingParticipant.type === 'shared' ? `Nombre Persona ${i + 1}` : "Nombre completo"}
                  fullWidth 
                  size="small"
                  value={m.name} 
                  onChange={(e) => updateEditMember(i, 'name', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                  }}
                />
                <TextField 
                  placeholder="WhatsApp (+569...)"
                  fullWidth 
                  size="small" 
                  value={m.phone} 
                  onChange={(e) => updateEditMember(i, 'phone', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                  }} 
                />
                <TextField 
                  placeholder="Datos bancarios..." 
                  fullWidth 
                  multiline
                  minRows={3}
                  size="small"
                  value={m.bankDetails || ""} 
                  onChange={(e) => updateEditMember(i, 'bankDetails', e.target.value)} 
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ mt: 1 }}><BankIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                  }}
                />
                {i === 0 && editingParticipant.type === 'shared' && <Divider sx={{ my: 1 }} />}
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveEdit} sx={{ fontWeight: 700 }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo: Pegar Lista de Nombres ─── */}
      <Dialog 
        open={bulkOpen} 
        onClose={() => setBulkOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ pt: 3, fontWeight: 900 }}>Importar Lista</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Pega una lista con un nombre por línea.<br/>
            💡 Para un turno compartido, usa: <b>Juan / Pedro</b> o <b>Ana & María</b>.
          </Typography>
          <TextField 
            multiline 
            rows={8} 
            fullWidth 
            placeholder="Ana María&#10;Juan / Pedro&#10;Goku / Vegeta&#10;Carlos..." 
            value={bulkText} 
            onChange={e => setBulkText(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setBulkOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleImportBulk} sx={{ fontWeight: 700 }}>Importar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo: Confirmar Desbloqueo de Orden ─── */}
      <Dialog 
        open={lockDialogOpen} 
        onClose={() => setLockDialogOpen(false)} 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>¿Modificar el orden?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Al desbloquear el orden, podrás volver a mezclar o cambiar la posición de los participantes que aún no han recibido su pago.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setLockDialogOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={() => { 
              onUpdateSettings({ ...settings, isLocked: false }); 
              setLockDialogOpen(false); 
            }}
            sx={{ fontWeight: 700 }}
          >
            Sí, desbloquear
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TurnsView;
