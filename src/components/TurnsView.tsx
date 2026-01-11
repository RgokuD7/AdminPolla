import React, { useState, useMemo } from "react";
import {
  Typography,
  Container,
  Box,
  Card,
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
  alpha,
  FormControlLabel,
  Switch,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Menu,
  Tooltip,
  Divider,
  Alert,
  useTheme,
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
  ExpandMore as ExpandIcon
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
  const theme = useTheme();
  const [name1, setName1] = useState("");
  const [phone1, setPhone1] = useState("");
  const [bank1, setBank1] = useState("");
  
  const [name2, setName2] = useState("");
  const [phone2, setPhone2] = useState("");
  const [bank2, setBank2] = useState("");
  
  const [isShared, setIsShared] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
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
    // Solo generamos fechas para el total de participantes actuales
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
    if(name1.trim()) { 
      const newParticipant: Participant = {
        id: "p-" + Date.now(),
        type: isShared ? 'shared' : 'single',
        members: isShared ? [
          { name: name1.trim(), phone: phone1.trim(), bankDetails: bank1.trim(), paymentHistory: {} },
          { name: name2.trim(), phone: phone2.trim(), bankDetails: bank2.trim(), paymentHistory: {} }
        ] : [{ name: name1.trim(), phone: phone1.trim(), bankDetails: bank1.trim(), paymentHistory: {} }],
        isPaid: false, // Legacy
        turnNumber: participants.length + 1,
        paymentHistory: {}
      };
      onAddParticipant(newParticipant);
      setName1(""); setPhone1(""); setBank1("");
      setName2(""); setPhone2(""); setBank2("");
      setIsShared(false);
      setShowAdvanced(false);
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
    
    const newParticipants: Participant[] = lines.map((line, i) => {
      // Buscamos separadores explícitos: "/", ",", "&", "+" o " y "
      // Si no hay separador, asumimos que es UN SOLO nombre completo (ej: "Juan Carlos")
      const separators = ["/", ",", "&", "+", " y "];
      let parts: string[] = [line];
      
      for (const sep of separators) {
        if (line.includes(sep)) {
          parts = line.split(sep).map(s => s.trim()).filter(Boolean);
          break; // Usamos el primer separador que encontremos
        }
      }

      // Solo si encontramos exactamente 2 partes válidas, lo hacemos compartido
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
    <Container maxWidth="sm" sx={{ py: 6, pb: 16 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Integrantes</Typography>
          <Typography variant="caption" color="text.secondary">Total: {participants.length}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title={settings.isLocked ? "Desbloquear orden" : "Fijar orden definitivo"}>
            <Button 
              size="small" 
              variant={settings.isLocked ? "contained" : "outlined"} 
              color={settings.isLocked ? "primary" : "inherit"}
              onClick={toggleLock}
              startIcon={settings.isLocked ? <LockIcon /> : <LockOpenIcon />}
              sx={{ borderRadius: 2 }}
            >
              {settings.isLocked ? "Fijado" : "Fijar"}
            </Button>
          </Tooltip>
          {!settings.isLocked && (
            <>
              <Tooltip title={settings.currentTurn > 1 ? "No se puede mezclar iniciado el periodo" : "Mezclar Turnos"}>
                <span>
                  <IconButton onClick={onShuffle} disabled={settings.currentTurn > 1} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                    <ShuffleIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Pegar Lista"><IconButton onClick={() => setBulkOpen(true)} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}><PasteIcon fontSize="small" /></IconButton></Tooltip>
            </>
          )}
        </Stack>
      </Stack>
      
      {!settings.isLocked && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, // Reducido padding interno ligeramente
            mb: 4, 
            borderRadius: 3, 
            bgcolor: alpha(theme.palette.background.default, 0.5), 
            border: '1px solid #E5E7EB'
          }}
        >
          <Stack spacing={1}> 
            <FormControlLabel
              control={<Switch size="small" checked={isShared} onChange={e => setIsShared(e.target.checked)} />}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <GroupsIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>Turno Compartido (Pareja)</Typography>
                </Stack>
              }
              sx={{ ml: 0.5, mb: 0 }}
            />
            
            <Box>
              <TextField 
                placeholder={isShared ? "Nombre Persona 1" : "Nombre completo"}
                fullWidth 
                size="small"
                value={name1} 
                onChange={e => setName1(e.target.value)} 
                InputProps={{
                  startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                  sx: { bgcolor: 'white' }
                }}
              />
              
              <Typography 
                variant="caption"
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{ 
                    cursor: 'pointer',
                    color: 'text.secondary', 
                    display: 'inline-flex',
                    alignItems: 'center',
                    my: 1,
                    fontWeight: 500,
                    '&:hover': { color: 'primary.main' }
                }}
              >
                {showAdvanced ? "Menos opciones" : "Agregar banco y WhatsApp"} 
                <ExpandIcon sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: 16, ml: 0.5 }} />
              </Typography>

              <Collapse in={showAdvanced}>
                <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                  <TextField 
                    placeholder={isShared ? "WhatsApp Persona 1 (+569...)" : "WhatsApp (+569...)"} 
                    fullWidth 
                    size="small"
                    value={phone1} 
                    onChange={e => setPhone1(e.target.value)} 
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                      sx: { bgcolor: 'white' }
                    }}
                  />
                  <TextField 
                    placeholder="Pegar datos bancarios aquí...&#10;Banco: ...&#10;Cuenta: ...&#10;RUT: ..." 
                    fullWidth 
                    multiline
                    minRows={4}
                    size="small"
                    value={bank1} 
                    onChange={e => setBank1(e.target.value)} 
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ mt: 1.5 }}><BankIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                      sx: { bgcolor: 'white', alignItems: 'flex-start' }
                    }}
                  />
                  
                  {isShared && (
                    <>
                      <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">PERSONA 2</Typography></Divider>
                       <TextField 
                        placeholder="Nombre Persona 2"
                        fullWidth 
                        size="small"
                        value={name2} 
                        onChange={e => setName2(e.target.value)} 
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                          sx: { bgcolor: 'white' }
                        }}
                      />
                      <TextField 
                        placeholder="WhatsApp Persona 2" 
                        fullWidth 
                        size="small"
                        value={phone2} 
                        onChange={e => setPhone2(e.target.value)} 
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 18, color: 'secondary.main' }} /></InputAdornment>,
                          sx: { bgcolor: 'white' }
                        }}
                      />
                      <TextField 
                        placeholder="Pegar datos bancarios aquí...&#10;Banco: ...&#10;Cuenta: ...&#10;RUT: ..." 
                        fullWidth 
                        multiline
                        minRows={4}
                        size="small"
                        value={bank2} 
                        onChange={e => setBank2(e.target.value)} 
                        InputProps={{
                          startAdornment: <InputAdornment position="start" sx={{ mt: 1.5 }}><BankIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                          sx: { bgcolor: 'white', alignItems: 'flex-start' }
                        }}
                      />
                    </>
                  )}
                </Stack>
              </Collapse>

              {/* Si es compartido pero NO está expandido, necesitamos mostrar el input del Nombre 2 OBLIGATORIAMENTE */}
              {isShared && !showAdvanced && (
                 <TextField 
                    placeholder="Nombre Persona 2"
                    fullWidth 
                    size="small"
                    value={name2} 
                    onChange={e => setName2(e.target.value)} 
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                      sx: { bgcolor: 'white', mt: 1.5 }
                    }}
                  />
              )}
            </Box>

            <Button 
              variant="contained" 
              onClick={handleQuickAdd} 
              disabled={!name1.trim()}
              fullWidth
              disableElevation
              startIcon={<AddIcon />}
              sx={{ 
                borderRadius: 2,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: '#1f2937' },
              }}
            >
              Agregar a la lista
            </Button>
          </Stack>
        </Paper>
      )}

      {settings.isLocked && (
        <Alert severity="info" sx={{ mb: 4, borderRadius: 3 }}>
          El orden está bloqueado. Desbloquea para reordenar o editar integrantes.
        </Alert>
      )}

      <List sx={{ p: 0 }}>
        {participants.slice().sort((a, b) => a.turnNumber - b.turnNumber).map((p, idx) => {
          const paymentDate = calculatePaymentDate(settings, p.turnNumber);
          const dayNumber = paymentDate.split('-')[2];
          const monthShort = formatDateReadable(paymentDate).split(' ')[1].toUpperCase();
          
          const isPast = p.turnNumber < settings.currentTurn;
          const isCurrent = p.turnNumber === settings.currentTurn;

          return (
            <Card 
              key={p.id} 
              sx={{ 
                mb: 1.5, 
                border: isCurrent ? '2px solid' : '1px solid',
                borderColor: isCurrent ? 'secondary.main' : '#E5E7EB',
                borderRadius: 3,
                opacity: isPast ? 0.6 : 1,
                bgcolor: isCurrent ? '#F0FDF4' : 'white',
                background: isPast ? '#F9FAFB' : undefined,
                position: 'relative',
                overflow: 'visible'
              }}
            >
              {isCurrent && (
                <Chip 
                  label="TURNO ACTUAL" 
                  color="secondary" 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: 12, 
                    height: 20, 
                    fontSize: '0.65rem', 
                    fontWeight: 800 
                  }} 
                />
              )}
              
              <ListItem 
                sx={{ py: 1.5, px: 2 }} 
                secondaryAction={
                  <Stack direction="row" spacing={0} alignItems="center">
                    {!settings.isLocked && (
                      <Stack direction="column" sx={{ mr: 1 }}>
                        <IconButton 
                          size="small" 
                          disabled={idx === 0 || p.turnNumber <= settings.currentTurn} 
                          onClick={() => onReorder(idx, idx - 1)} 
                          sx={{ p: 0.5, '&:disabled': { opacity: 0.1 } }}
                        >
                          <UpIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          disabled={idx === participants.length - 1 || p.turnNumber < settings.currentTurn} 
                          onClick={() => onReorder(idx, idx + 1)} 
                          sx={{ p: 0.5, '&:disabled': { opacity: 0.1 } }}
                        >
                          <DownIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                    <IconButton size="small" onClick={(e) => handleOpenMenu(e, p.id)} sx={{ color: 'text.secondary' }}><MoreVertIcon fontSize="small" /></IconButton>
                  </Stack>
                }
              >
                <ListItemAvatar sx={{ minWidth: 55, textAlign: 'center', mr: 1 }}>
                  <Box sx={{ 
                    border: '2px solid', 
                    borderColor: isCurrent ? 'secondary.main' : 'primary.main', 
                    borderRadius: 2.5, 
                    px: 0.5, py: 0.5,
                    bgcolor: 'white' 
                  }}>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, lineHeight: 1, color: isCurrent ? 'secondary.main' : 'primary.main' }}>
                      {monthShort}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: isCurrent ? 'secondary.main' : 'primary.main' }}>
                      {dayNumber}
                    </Typography>
                  </Box>
                </ListItemAvatar>
                <ListItemText 
                  primary={
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: isPast ? 'text.secondary' : 'text.primary' }}>
                      {getParticipantName(p)}
                    </Typography>
                  } 
                  secondary={
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, bgcolor: '#EEF2FF', color: 'primary.main', px: 0.8, py: 0.2, borderRadius: 1 }}>
                        #{p.turnNumber}
                      </Typography>
                      {p.type === 'shared' && <Chip label="Compartido" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem', borderColor: '#E5E7EB' }} />}
                    </Stack>
                  }
                />
              </ListItem>
            </Card>
          );
        })}
      </List>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        elevation={2}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 150 } }}
      >
        <MenuItem onClick={handleEditClick} sx={{ py: 1.2 }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="subtitle2">Editar Datos</Typography>
        </MenuItem>
        
        {/* Solo permitimos mover/eliminar si el turno NO ha pasado aun */}
        {participants.find(p => p.id === menuAnchor?.pid)?.turnNumber! >= settings.currentTurn && (
          <>
            <MenuItem onClick={handleSetDateClick} sx={{ py: 1.2 }}>
              <EventIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
              <Typography variant="subtitle2">Cambiar Fecha/Turno</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleDeleteClick} sx={{ py: 1.2, color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
              <Typography variant="subtitle2">Eliminar</Typography>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Calendar Date Reorder Dialog */}
      <Dialog 
        open={dateDialogOpen} 
        onClose={() => setDateDialogOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>Asignar Turno por Fecha</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Selecciona la fecha deseada para {editingParticipant ? getParticipantName(editingParticipant) : ""}. Los demás se desplazarán.
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
                  T{d.turn} — {formatDateFull(d.date)} {d.turn < settings.currentTurn ? "(Cerrado)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDateDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSaveNewDate} disabled={!targetDate}>Confirmar Cambio</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>Editar Participante</DialogTitle>
        <DialogContent>
          <FormControlLabel 
            control={
              <Switch 
                checked={editingParticipant?.type === 'shared'} 
                onChange={(e) => {
                   if (!editingParticipant) return;
                   const isShared = e.target.checked;
                   const newType = isShared ? 'shared' : 'single';
                   let newMembers = [...editingParticipant.members];
                   
                   if (isShared && newMembers.length < 2) {
                       // Si pasamos a compartido, aseguramos tener al menos 2 huecos
                       newMembers.push({ name: '', phone: '', bankDetails: '', paymentHistory: {} });
                   } else if (!isShared && newMembers.length > 1) {
                       // Si pasamos a individual, cortamos los extras y dejamos solo el primero
                       // ¡Adiós fantasma!
                       newMembers = [newMembers[0]];
                   }
                   
                   setEditingParticipant({ 
                       ...editingParticipant, 
                       type: newType, 
                       members: newMembers 
                   });
                }} 
              />
            } 
            label="Es Turno Compartido" 
            sx={{ mt: 1, mb: 2, display: 'block' }}
          />

          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {editingParticipant?.members.map((m, i) => (
              <Stack key={i} spacing={1.5}>
                {editingParticipant.type === 'shared' && (
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>
                    INTEGRANTE {i + 1}
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
                  placeholder="Pegar datos bancarios aquí...&#10;Banco: ...&#10;Cuenta: ...&#10;RUT: ..." 
                  fullWidth 
                  multiline
                  minRows={4}
                  size="small"
                  value={m.bankDetails || ""} 
                  onChange={(e) => updateEditMember(i, 'bankDetails', e.target.value)} 
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ mt: 1.5 }}><BankIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                    sx: { alignItems: 'flex-start' }
                  }}
                />
                {i === 0 && editingParticipant.type === 'shared' && <Divider sx={{ my: 1 }} />}
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pt: 3, fontWeight: 800 }}>Importar de Texto</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Pega una lista de nombres. <br/>
            💡 Para un turno compartido, usa un separador ( <b>/</b> , <b>+</b> , <b>&</b> ).<br/>
            Ejemplo: <b>Juan / Pedro</b>
          </Typography>
          <TextField 
            multiline 
            rows={8} 
            fullWidth 
            placeholder="Ana Maria (Individual)&#10;Goku / Vegeta (Compartido)&#10;Gohan..." 
            value={bulkText} 
            onChange={e => setBulkText(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setBulkOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleImportBulk}>Importar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>¿Modificar orden?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Seguro que quieres modificar el orden? Esto cambiará las fechas de pago asignadas y el calendario actual del grupo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setLockDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={() => { onUpdateSettings({ ...settings, isLocked: false }); setLockDialogOpen(false); }}>Si, modificar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TurnsView;
