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
  Close as CloseIcon,
  DragIndicator as DragIndicatorIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AppSettings, Participant } from "@/types";
import { 
  calculatePaymentDate, 
  formatDateReadable, 
  formatDateFull, 
  getParticipantName 
} from "@/utils/helpers";
import { UserService } from "@/services/firestore";

interface TurnsViewProps { 
  participants: Participant[];
  settings: AppSettings;
  onAddParticipant: (p: Participant) => void;
  onUpdateParticipant: (p: Participant) => void;
  onUpdateAllParticipants?: (ps: Participant[]) => void;
  onRemoveParticipant: (id: string) => void;
  onShuffle: () => void;
  onReorder: (from: number, to: number) => void;
  onBulkImport: (participants: Participant[]) => void;
  onUpdateSettings: (s: AppSettings) => void;
  onSetTurnByDate: (pid: string, newTurn: number) => void;
  isAdmin?: boolean;
}

const TurnsView: React.FC<TurnsViewProps> = ({ 
  participants, 
  settings,
  onAddParticipant, 
  onUpdateParticipant,
  onUpdateAllParticipants,
  onRemoveParticipant, 
  onShuffle, 
  onReorder, 
  onBulkImport,
  onUpdateSettings,
  onSetTurnByDate,
  isAdmin = true
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

  // P2P Multi-Turn Sync & User Assignment State
  const [syncAllMatchingTurns, setSyncAllMatchingTurns] = useState(true);
  const [userSearchEmail, setUserSearchEmail] = useState("");
  const [userSearching, setUserSearching] = useState(false);
  const [userSearchFeedback, setUserSearchFeedback] = useState("");

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => a.turnNumber - b.turnNumber);
  }, [participants]);

  // Detectar si este participante tiene otros turnos en la polla con el mismo nombre
  const relatedTurnNumbers = useMemo(() => {
    if (!editingParticipant) return [];
    const targetNames = editingParticipant.members
      .map(m => m.name.trim().toLowerCase())
      .filter(Boolean);
    if (targetNames.length === 0) return [];
    return participants
      .filter(p => p.id !== editingParticipant.id && p.members.some(m => targetNames.includes(m.name.trim().toLowerCase())))
      .map(p => p.turnNumber)
      .sort((a, b) => a - b);
  }, [editingParticipant, participants]);

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
      if (syncAllMatchingTurns && relatedTurnNumbers.length > 0 && onUpdateAllParticipants) {
        // Actualizar todos los turnos que compartan el mismo nombre con la cuenta y datos asignados
        const targetNames = editingParticipant.members
          .map(m => m.name.trim().toLowerCase())
          .filter(Boolean);

        const updatedAll = participants.map(p => {
          if (p.id === editingParticipant.id) return editingParticipant;

          if (p.type === 'shared') {
            const updatedMembers = p.members.map(m => {
              const matchedIdx = editingParticipant.members.findIndex(em => em.name.trim().toLowerCase() === m.name.trim().toLowerCase());
              if (matchedIdx >= 0) {
                const em = editingParticipant.members[matchedIdx];
                return {
                  ...m,
                  userId: em.userId,
                  userEmail: em.userEmail,
                  phone: em.phone || m.phone,
                  bankDetails: em.bankDetails || m.bankDetails
                };
              }
              return m;
            });
            return { ...p, members: updatedMembers };
          } else {
            const firstMember = p.members[0];
            const isMatch = targetNames.includes(firstMember.name.trim().toLowerCase());
            if (isMatch) {
              const em = editingParticipant.members[0];
              const updatedMember = {
                ...firstMember,
                userId: em.userId,
                userEmail: em.userEmail,
                phone: em.phone || firstMember.phone,
                bankDetails: em.bankDetails || firstMember.bankDetails
              };
              return {
                ...p,
                userId: em.userId,
                userEmail: em.userEmail,
                members: [updatedMember, ...p.members.slice(1)]
              };
            }
            return p;
          }
        });

        onUpdateAllParticipants(updatedAll);
      } else {
        onUpdateParticipant(editingParticipant);
      }
      setEditDialogOpen(false);
      setEditingParticipant(null);
      setUserSearchFeedback("");
      setUserSearchEmail("");
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

  const updateEditMember = (index: number, field: string, value: any) => {
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

  // Manejador del Drag & Drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || settings.isLocked || !isAdmin) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    // No permitir mover antes o hacia turnos ya completados si ya inició la polla
    const sourceParticipant = sortedParticipants[sourceIndex];
    const destParticipant = sortedParticipants[destIndex];
    if (sourceParticipant.turnNumber < settings.currentTurn || destParticipant.turnNumber < settings.currentTurn) {
      return;
    }

    onReorder(sourceIndex, destIndex);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3, pb: 16, px: 2 }}>
      {/* ─── Encabezado de la Vista de Turnos ─── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Calendario</Typography>
          <Chip 
            label={`${participants.length} turnos`} 
            size="small" 
            sx={{ bgcolor: 'surface.muted', fontWeight: 800, fontSize: '0.72rem', height: 24, borderRadius: 1.5 }} 
          />
        </Stack>

        {isAdmin && (
          <Stack direction="row" spacing={1}>
            <Tooltip title={settings.isLocked ? "Desbloquear orden" : "Fijar orden definitivo"}>
              <Button 
                size="small" 
                variant={settings.isLocked ? "contained" : "outlined"} 
                color={settings.isLocked ? "primary" : "inherit"}
                onClick={toggleLock}
                startIcon={settings.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  borderColor: 'divider',
                  height: 36
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
                        borderRadius: 2,
                        width: 36,
                        height: 36,
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
                      borderRadius: 2,
                      width: 36,
                      height: 36,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <PasteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        )}
      </Stack>

      {/* Alerta de Orden Bloqueado */}
      {settings.isLocked && isAdmin && (
        <Alert 
          severity="info" 
          icon={<LockIcon fontSize="inherit" />}
          sx={{ 
            mb: 2, 
            borderRadius: 2, 
            bgcolor: 'surface.muted', 
            color: 'text.primary',
            border: 1,
            borderColor: 'divider',
            fontWeight: 600,
            py: 0.5
          }}
        >
          El orden de turnos está fijado. Desbloquea para reordenar con drag & drop.
        </Alert>
      )}

      {/* ─── Formulario de Agregar Integrante (Colapsable) ─── */}
      {!settings.isLocked && isAdmin && (
        <Box sx={{ mb: 2 }}>
          {!isAddFormOpen ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setIsAddFormOpen(true)}
              startIcon={<AddIcon />}
              sx={{
                py: 1.25,
                borderRadius: 2,
                borderStyle: 'dashed',
                borderWidth: 1.5,
                borderColor: 'divider',
                color: 'secondary.main',
                bgcolor: 'background.paper',
                fontWeight: 700,
                fontSize: '0.9rem',
                minHeight: 46,
                '&:hover': {
                  borderColor: 'secondary.main',
                  bgcolor: 'surface.paid',
                  borderWidth: 1.5
                }
              }}
            >
              Agregar nuevo integrante
            </Button>
          ) : (
            <Paper 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: 'background.paper', 
                border: 1, 
                borderColor: 'secondary.main',
                boxShadow: 'none'
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Nuevo Integrante
                  </Typography>
                  <IconButton size="small" onClick={() => setIsAddFormOpen(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <FormControlLabel
                  control={<Switch size="small" checked={isShared} onChange={e => setIsShared(e.target.checked)} color="secondary" />}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <GroupsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
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
                    startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
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
                      startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
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
                    fontSize: '0.75rem',
                    '&:hover': { color: 'secondary.main' }
                  }}
                >
                  {showAdvanced ? "Ocultar datos extra" : "＋ Agregar WhatsApp y datos bancarios"} 
                  <ExpandIcon sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: 14, ml: 0.5 }} />
                </Typography>

                <Collapse in={showAdvanced}>
                  <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                    <TextField 
                      placeholder={isShared ? "WhatsApp Persona 1 (+569...)" : "WhatsApp (+569...)"} 
                      fullWidth 
                      size="small"
                      value={phone1} 
                      onChange={e => setPhone1(e.target.value)} 
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 16, color: 'secondary.main' }} /></InputAdornment>,
                      }}
                    />
                    <TextField 
                      placeholder={isShared ? "Pega aquí datos del banco (Persona 1)..." : "Pega aquí datos del banco (Banco, Cuenta, RUT, etc.)..."} 
                      fullWidth 
                      multiline
                      minRows={2}
                      size="small"
                      value={bank1} 
                      onChange={e => setBank1(e.target.value)} 
                      InputProps={{
                        startAdornment: <InputAdornment position="start" sx={{ mt: 0.5 }}><BankIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                      }}
                      inputProps={{ style: { fontSize: '16px' } }}
                    />
                    
                    {isShared && (
                      <>
                        <Divider sx={{ my: 0.5 }}><Typography variant="caption" color="text.secondary">PERSONA 2</Typography></Divider>
                        <TextField 
                          placeholder="WhatsApp Persona 2" 
                          fullWidth 
                          size="small"
                          value={phone2} 
                          onChange={e => setPhone2(e.target.value)} 
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 16, color: 'secondary.main' }} /></InputAdornment>,
                          }}
                          inputProps={{ style: { fontSize: '16px' } }}
                        />
                        <TextField 
                          placeholder="Pega aquí datos del banco (Persona 2)..." 
                          fullWidth 
                          multiline
                          minRows={2}
                          size="small"
                          value={bank2} 
                          onChange={e => setBank2(e.target.value)} 
                          InputProps={{
                            startAdornment: <InputAdornment position="start" sx={{ mt: 0.5 }}><BankIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                          }}
                          inputProps={{ style: { fontSize: '16px' } }}
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
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    color: '#FFFFFF',
                    minHeight: 44,
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  Confirmar y Añadir
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      )}

      {/* ─── Lista con Drag & Drop y Timeline ─── */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="turns-list">
          {(provided) => (
            <Paper 
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{ 
                borderRadius: 2.5, 
                overflow: 'hidden', 
                border: 1, 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: 'none'
              }}
            >
              {sortedParticipants.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No hay participantes en la lista
                  </Typography>
                </Box>
              ) : (
                sortedParticipants.map((p, idx) => {
                  const paymentDate = calculatePaymentDate(settings, p.turnNumber);
                  const dayNumber = paymentDate.split('-')[2];
                  const monthShort = formatDateReadable(paymentDate).split(' ')[1]?.toUpperCase() || "";
                  
                  const isPast = p.turnNumber < settings.currentTurn;
                  const isCurrent = p.turnNumber === settings.currentTurn;
                  const hasDivider = idx < sortedParticipants.length - 1;
                  const isDragDisabled = !isAdmin || settings.isLocked || isPast;

                  return (
                    <Draggable 
                      key={p.id} 
                      draggableId={p.id} 
                      index={idx}
                      isDragDisabled={isDragDisabled}
                    >
                      {(draggableProvided, snapshot) => (
                        <Box
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            position: 'relative',
                            bgcolor: snapshot.isDragging 
                              ? 'surface.elevated' 
                              : isCurrent 
                                ? 'surface.paid' 
                                : 'transparent',
                            opacity: isPast ? 0.6 : 1,
                            borderBottom: hasDivider ? 1 : 0,
                            borderColor: 'divider',
                            borderLeft: isCurrent ? 3 : 0,
                            borderLeftColor: 'secondary.main',
                            boxShadow: snapshot.isDragging ? '0 4px 14px rgba(0,0,0,0.1)' : 'none',
                            transition: snapshot.isDragging ? 'none' : 'background-color 0.15s ease',
                            '&:hover': {
                              bgcolor: isCurrent ? 'surface.paid' : 'surface.muted'
                            }
                          }}
                        >
                          {/* Manija de Arrastre (Drag Handle) */}
                          {!settings.isLocked && !isPast && isAdmin && (
                            <Box 
                              {...draggableProvided.dragHandleProps} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                color: 'text.secondary',
                                cursor: 'grab',
                                '&:active': { cursor: 'grabbing' },
                                p: 0.5
                              }}
                            >
                              <DragIndicatorIcon fontSize="small" sx={{ opacity: 0.6 }} />
                            </Box>
                          )}

                          {/* Caja de Fecha */}
                          <Box 
                            sx={{ 
                              minWidth: 46, 
                              width: 46,
                              height: 46,
                              borderRadius: 1.5, 
                              border: 1, 
                              borderColor: isCurrent ? 'secondary.main' : 'divider',
                              bgcolor: isCurrent ? 'background.paper' : 'surface.muted',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.62rem', 
                                fontWeight: 900, 
                                lineHeight: 1, 
                                color: isCurrent ? 'secondary.main' : 'accent.main'
                              }}
                            >
                              {monthShort}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 900, 
                                fontSize: '1.05rem', 
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
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: 'text.primary',
                                  lineHeight: 1.2,
                                  fontSize: '0.9rem'
                                }}
                              >
                                {getParticipantName(p)}
                              </Typography>
                              {isCurrent && (
                                <Chip 
                                  label="TURNO ACTUAL" 
                                  size="small" 
                                  sx={{ 
                                    height: 18, 
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    bgcolor: 'secondary.main', 
                                    color: '#FFFFFF',
                                    borderRadius: 1
                                  }} 
                                />
                              )}
                            </Stack>

                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.25 }}>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontWeight: 700, 
                                  bgcolor: 'surface.muted', 
                                  color: 'text.secondary', 
                                  px: 0.75, 
                                  py: 0.1, 
                                  borderRadius: 1,
                                  fontSize: '0.68rem'
                                }} 
                              >
                                Turno #{p.turnNumber}
                              </Typography>
                              {p.type === 'shared' && (
                                <Chip 
                                  label="Compartido" 
                                  size="small" 
                                  variant="outlined" 
                                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, borderColor: 'divider', borderRadius: 1 }} 
                                />
                              )}
                            </Stack>
                          </Box>

                          {/* Acciones de Respaldo (Flechas) y Menú */}
                          {isAdmin && (
                            <Stack direction="row" spacing={0.25} alignItems="center">
                              {!settings.isLocked && !isPast && (
                                <Stack direction="row">
                                  <IconButton 
                                    size="small" 
                                    disabled={idx === 0 || p.turnNumber <= settings.currentTurn} 
                                    onClick={() => onReorder(idx, idx - 1)} 
                                    sx={{ p: 0.25, '&:disabled': { opacity: 0.15 } }}
                                  >
                                    <UpIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    disabled={idx === participants.length - 1 || p.turnNumber < settings.currentTurn} 
                                    onClick={() => onReorder(idx, idx + 1)} 
                                    sx={{ p: 0.25, '&:disabled': { opacity: 0.15 } }}
                                  >
                                    <DownIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              )}
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleOpenMenu(e, p.id)} 
                                sx={{ color: 'text.secondary', p: 0.75 }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </Box>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </Paper>
          )}
        </Droppable>
      </DragDropContext>

      {/* ─── Menú de Acciones ─── */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        elevation={2}
        PaperProps={{ 
          sx: { 
            borderRadius: 2, 
            minWidth: 160,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          } 
        }}
      >
        <MenuItem onClick={handleEditClick} sx={{ py: 1, minHeight: 40 }}>
          <EditIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Editar Datos</Typography>
        </MenuItem>
        
        {participants.find(p => p.id === menuAnchor?.pid)?.turnNumber! >= settings.currentTurn && (
          <>
            <MenuItem onClick={handleSetDateClick} sx={{ py: 1, minHeight: 40 }}>
              <EventIcon fontSize="small" sx={{ mr: 1.25, color: 'accent.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Cambiar Turno/Fecha</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleDeleteClick} sx={{ py: 1, minHeight: 40, color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1.25 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Eliminar</Typography>
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
        PaperProps={{ sx: { borderRadius: 2.5, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pt: 2.5 }}>Cambiar Turno por Fecha</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Selecciona la fecha para {editingParticipant ? getParticipantName(editingParticipant) : ""}.
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
        <DialogActions sx={{ p: 2 }}>
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
        PaperProps={{ sx: { borderRadius: 2.5, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pt: 2.5 }}>Editar Integrante</DialogTitle>
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
            sx={{ mt: 1, mb: 1.5, display: 'block' }}
          />

          <Stack spacing={2}>
            {editingParticipant?.members.map((m, i) => (
              <Stack key={i} spacing={1}>
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
                    startAdornment: <InputAdornment position="start"><PersonAddIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                  }}
                />
                <TextField 
                  placeholder="WhatsApp (+569...)"
                  fullWidth 
                  size="small" 
                  value={m.phone} 
                  onChange={(e) => updateEditMember(i, 'phone', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 16, color: 'secondary.main' }} /></InputAdornment>,
                  }} 
                />
                <TextField 
                  label="Datos de transferencia"
                  placeholder={`Pega directo lo que entrega el banco. Ej:\nBanco Estado\nCuenta RUT: 12345678\nRUT: 12.345.678-9\nNombre: Juan Pérez\ncorreo@ejemplo.com`} 
                  fullWidth 
                  multiline
                  minRows={3}
                  size="small"
                  value={m.bankDetails || ""} 
                  onChange={(e) => updateEditMember(i, 'bankDetails', e.target.value)} 
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ mt: 0.5 }}><BankIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                  }}
                  inputProps={{ style: { fontSize: '16px' } }}
                  helperText="Copia los datos desde la app de tu banco y pégalos aquí."
                />

                {/* Sección de Cuenta de Usuario vinculada */}
                {m.userId || m.userEmail ? (
                  <Box sx={{ p: 1.25, bgcolor: 'surface.paid', borderRadius: 2, border: 1, borderColor: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', display: 'block', fontSize: '0.65rem' }}>
                          CUENTA DE GOOGLE VINCULADA
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: 'text.primary' }}>
                          {m.userEmail || `UID: ${m.userId?.slice(0, 8)}...`}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        updateEditMember(i, 'userId', undefined);
                        updateEditMember(i, 'userEmail', undefined);
                      }}
                      sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                    >
                      Desvincular
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ p: 1.25, bgcolor: 'surface.muted', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                      VINCULAR CUENTA DE GOOGLE
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        placeholder="Email (ej: pedro@gmail.com)"
                        fullWidth
                        size="small"
                        value={userSearchEmail}
                        onChange={(e) => {
                          setUserSearchEmail(e.target.value);
                          setUserSearchFeedback("");
                        }}
                        inputProps={{ style: { fontSize: '16px' } }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!userSearchEmail.trim() || userSearching}
                        onClick={async () => {
                          setUserSearching(true);
                          setUserSearchFeedback("");
                          const profile = await UserService.findUserByEmail(userSearchEmail);
                          setUserSearching(false);
                          if (profile) {
                            updateEditMember(i, 'userId', profile.uid);
                            updateEditMember(i, 'userEmail', profile.email);
                            if (profile.bankDetails && !m.bankDetails) {
                              updateEditMember(i, 'bankDetails', profile.bankDetails);
                            }
                            if (profile.phone && !m.phone) {
                              updateEditMember(i, 'phone', profile.phone);
                            }
                            setUserSearchFeedback(`✅ Usuario asociado: ${profile.displayName}`);
                            setUserSearchEmail("");
                          } else {
                            setUserSearchFeedback("No se encontró usuario registrado con ese email.");
                          }
                        }}
                        sx={{ fontWeight: 700, minHeight: 38, whiteSpace: 'nowrap', borderRadius: 1.5, borderColor: 'divider' }}
                      >
                        {userSearching ? "..." : "Asociar"}
                      </Button>
                    </Stack>
                    {userSearchFeedback && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700, color: userSearchFeedback.startsWith('✅') ? 'secondary.main' : 'error.main' }}>
                        {userSearchFeedback}
                      </Typography>
                    )}
                  </Box>
                )}

                {i === 0 && editingParticipant.type === 'shared' && <Divider sx={{ my: 0.5 }} />}
              </Stack>
            ))}

            {/* Aviso de Números Repetidos */}
            {relatedTurnNumbers.length > 0 && (
              <Box sx={{ p: 1.5, bgcolor: 'surface.paid', borderRadius: 2, border: 1, borderColor: 'secondary.main' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'secondary.main', display: 'block' }}>
                  💡 ESTE INTEGRANTE TIENE MÁS DE UN NÚMERO
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, mt: 0.25, color: 'text.primary' }}>
                  {editingParticipant?.members[0]?.name} también participa en el Turno #{relatedTurnNumbers.join(', #')}.
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={syncAllMatchingTurns}
                      onChange={(e) => setSyncAllMatchingTurns(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: 'text.primary' }}>
                      Asignar esta cuenta y datos bancarios a todos sus números
                    </Typography>
                  }
                  sx={{ mt: 0.5, display: 'block' }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveEdit} sx={{ fontWeight: 700 }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo: Importar Lista ─── */}
      <Dialog 
        open={bulkOpen} 
        onClose={() => setBulkOpen(false)} 
        fullWidth 
        maxWidth="xs" 
        PaperProps={{ sx: { borderRadius: 2.5, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ pt: 2.5, fontWeight: 900 }}>Importar Lista de Nombres</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Pega una lista con un nombre por línea.<br/>
            💡 Para un turno compartido, usa: <b>Juan / Pedro</b> o <b>Ana & María</b>.
          </Typography>
          <TextField 
            multiline 
            rows={7} 
            fullWidth 
            placeholder="Ana María&#10;Juan / Pedro&#10;Goku / Vegeta&#10;Carlos..." 
            value={bulkText} 
            onChange={e => setBulkText(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleImportBulk} sx={{ fontWeight: 700 }}>Importar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo: Confirmar Desbloqueo de Orden ─── */}
      <Dialog 
        open={lockDialogOpen} 
        onClose={() => setLockDialogOpen(false)} 
        PaperProps={{ sx: { borderRadius: 2.5, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>¿Desbloquear orden de turnos?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Al desbloquear el orden, podrás volver a arrastrar y soltar (drag & drop) o reordenar los participantes que aún no reciben su pago.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
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
