import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Typography,
  CircularProgress
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon
} from "@mui/icons-material";

import { AppSettings, PollaGroup, Participant } from "@/types";
import ListView from "@/components/ListView";
import DashboardView from "@/components/DashboardView";
import TurnsView from "@/components/TurnsView";
import SettingsView from "@/components/SettingsView";
import LoginView from "@/components/LoginView"; 
import { auth, onAuthStateChanged, loginWithGoogle, User } from "@/firebase";
import { calculateCurrentTurnFromDate } from "@/utils/helpers";
import { signOut } from "firebase/auth";
import { PollaService } from "@/services/firestore";

const App = () => {
  // === ESTADO ===
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [view, setView] = useState(0); 
  const [adminGroups, setAdminGroups] = useState<PollaGroup[]>([]);
  const [participantGroups, setParticipantGroups] = useState<PollaGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // === EFECTOS ===
  useEffect(() => {
    if (!auth) {
      console.error("Auth no disponible");
      setIsInitializing(false);
      return;
    }

    // Escuchar cambios de Auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      console.log("Auth State Changed. User:", currentUser?.uid);
      setUser(currentUser);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // Cargar grupos desde Firestore cuando el usuario se loguea (Doble Rol: Admin y Participante)
  useEffect(() => {
    if (user) {
      setIsLoadingGroups(true);
      const unsubscribeAdmin = PollaService.subscribeToUserPollas(user.uid, (fetchedAdmin) => {
        setAdminGroups(fetchedAdmin);
        setIsLoadingGroups(false);
      });

      const unsubscribeParticipant = PollaService.subscribeToParticipantPollas(user.uid, (fetchedParticipant) => {
        setParticipantGroups(fetchedParticipant);
      });

      return () => {
        unsubscribeAdmin();
        unsubscribeParticipant();
      };
    } else {
      setAdminGroups([]);
      setParticipantGroups([]);
    }
  }, [user]);

  // Lista unificada para resolución de grupo activo
  const allGroups = useMemo(() => {
    const map = new Map<string, PollaGroup>();
    adminGroups.forEach(g => map.set(g.id, g));
    participantGroups.forEach(g => map.set(g.id, g));
    return Array.from(map.values());
  }, [adminGroups, participantGroups]);

  // === CÁLCULOS ===
  const activeGroup = useMemo(() => allGroups.find(g => g.id === activeGroupId), [allGroups, activeGroupId]);
  const isAdmin = useMemo(() => Boolean(activeGroup && user && activeGroup.adminId === user.uid), [activeGroup, user]);

  // Flag derivado: ¿el turno actual está 100% pagado?
  const isCurrentTurnFullyPaid = useMemo(() => {
    if (!activeGroup || activeGroup.participants.length === 0) return false;
    const turn = activeGroup.settings.currentTurn;
    return activeGroup.participants.every(p => {
      if (p.type === 'shared') {
        return p.members.every(m => m.paymentHistory?.[turn]);
      }
      return p.paymentHistory?.[turn];
    });
  }, [activeGroup?.participants, activeGroup?.settings.currentTurn]);

  // AUTO-CRON: Verificar turno AL ENTRAR al grupo o cuando se paguen todos los turnos (Solo Admin)
  useEffect(() => {
    if (isAdmin && activeGroup?.settings?.startDate) {
      const realTurn = calculateCurrentTurnFromDate(activeGroup.settings);
      const currentTurn = activeGroup.settings.currentTurn;

      // Solo corregir si hay discrepancia
      if (currentTurn !== realTurn) {
        if (realTurn > currentTurn) {
          const isCurrentFullyPaid = activeGroup.participants.every(p => {
            if (p.type === 'shared') {
              return p.members.every(m => m.paymentHistory?.[currentTurn]);
            }
            return p.paymentHistory?.[currentTurn];
          });

          if (isCurrentFullyPaid) {
            console.log(`🔄 Auto-corrigiendo turno (Avance): ${currentTurn} -> ${realTurn}`);
            PollaService.updateSettings(activeGroup.id, { ...activeGroup.settings, currentTurn: realTurn })
              .catch(err => console.error("Error auto-corrigiendo turno:", err));
          } else {
            console.log(`🛑 Bloqueo Auto-avance: Turno ${currentTurn} incompleto. Se requiere pago total para avanzar automáticamente.`);
          }
        } else {
          console.log(`🔄 Auto-corrigiendo turno (Retroceso): ${currentTurn} -> ${realTurn}`);
          PollaService.updateSettings(activeGroup.id, { ...activeGroup.settings, currentTurn: realTurn })
            .catch(err => console.error("Error auto-corrigiendo turno:", err));
        }
      }
    }
  }, [isAdmin, activeGroup?.id, isCurrentTurnFullyPaid]);

  // === HANDLERS FIREBASE ===
  
  const handleCreateGroup = async (settings: AppSettings) => {
    if (!user) return;
    try {
      const newId = await PollaService.createPolla(user.uid, settings.groupName);
      await PollaService.updateSettings(newId, settings);
      setActiveGroupId(newId);
    } catch (e) {
      console.error("Error creando grupo:", e);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      if (confirm("¿Estás seguro de eliminar este grupo?")) {
        await PollaService.deletePolla(id);
        if (activeGroupId === id) setActiveGroupId(null);
      }
    } catch (e) {
      console.error("Error eliminando grupo:", e);
    }
  };

  const updateActiveGroupParticipants = async (newParticipants: Participant[]) => {
    if (!activeGroupId || !isAdmin) return;
    try {
      await PollaService.updateParticipants(activeGroupId, newParticipants);
    } catch (e) {
      console.error("Error actualizando participantes:", e);
    }
  };
  
  const updateActiveGroupSettings = async (newSettings: AppSettings) => {
    if (!activeGroupId || !isAdmin) return;
    try {
      await PollaService.updateSettings(activeGroupId, newSettings);
    } catch (e) {
      console.error("Error actualizando ajustes:", e);
    }
  };

  // === LÓGICA DE NEGOCIO LOCAL ===

  const handleSetTurnByDate = (pid: string, newTurn: number) => {
    if (!activeGroup || !isAdmin) return;
    const sorted = [...activeGroup.participants].sort((a, b) => a.turnNumber - b.turnNumber);
    const targetIdx = sorted.findIndex(p => p.id === pid);
    if (targetIdx === -1) return;
    const [pToMove] = sorted.splice(targetIdx, 1);
    sorted.splice(newTurn - 1, 0, pToMove);
    
    updateActiveGroupParticipants(sorted.map((p, i) => ({ ...p, turnNumber: i + 1 })));
  };

  const toggleParticipantPayment = (p: Participant, currentTurn: number, memberIndex?: number): Participant => {
    const pHistory = { ...(p.paymentHistory || {}) };
    
    // Caso 1: Pago individual en grupo compartido
    if (p.type === 'shared' && typeof memberIndex === 'number') {
      const newMembers = p.members.map((m, idx) => {
        if (idx === memberIndex) {
          const mHistory = { ...(m.paymentHistory || {}) };
          const isCurrentlyPaid = mHistory[currentTurn] || false;
          mHistory[currentTurn] = !isCurrentlyPaid;
          return { ...m, paymentHistory: mHistory, isPaid: !isCurrentlyPaid };
        }
        return m;
      });
      const allPaidThisTurn = newMembers.every(m => m.paymentHistory?.[currentTurn]);
      pHistory[currentTurn] = allPaidThisTurn;
      return { ...p, members: newMembers, paymentHistory: pHistory, isPaid: allPaidThisTurn };
    } 
    
    // Caso 2: Pago total
    const isCurrentlyPaid = pHistory[currentTurn] || false;
    const newPaidStatus = !isCurrentlyPaid;
    pHistory[currentTurn] = newPaidStatus;
    
    let newMembers = p.members;
    if (p.type === 'shared') {
      newMembers = p.members.map(m => {
        const mHistory = { ...(m.paymentHistory || {}) };
        mHistory[currentTurn] = newPaidStatus;
        return { ...m, paymentHistory: mHistory, isPaid: newPaidStatus };
      });
    }
    return { ...p, paymentHistory: pHistory, isPaid: newPaidStatus, members: newMembers };
  };

  const handleTogglePayment = (pid: string, memberIndex?: number) => {
    if (!activeGroup || !isAdmin) return;
    const currentTurn = activeGroup.settings.currentTurn;
    const updatedParticipants = activeGroup.participants.map(p => {
      if (p.id !== pid) return p;
      return toggleParticipantPayment(p, currentTurn, memberIndex);
    });
    updateActiveGroupParticipants(updatedParticipants);
  };

  const handleBatchTogglePayment = (updates: { pid: string, memberIndex?: number }[]) => {
    if (!activeGroup || !isAdmin) return;
    const currentTurn = activeGroup.settings.currentTurn;
    let nextParticipants = [...activeGroup.participants];
    
    updates.forEach(({ pid, memberIndex }) => {
      const idx = nextParticipants.findIndex(p => p.id === pid);
      if (idx !== -1) {
        nextParticipants[idx] = toggleParticipantPayment(nextParticipants[idx], currentTurn, memberIndex);
      }
    });
    
    updateActiveGroupParticipants(nextParticipants);
  };

  // === RENDER ===
  if (isInitializing) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (!user) {
    return <LoginView onLogin={loginWithGoogle} />;
  }

  if (isLoadingGroups && adminGroups.length === 0 && participantGroups.length === 0) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary">Cargando tus pollas...</Typography>
      </Box>
    );
  }

  // 1. LISTA DE GRUPOS (HOME)
  if (!activeGroupId || !activeGroup) {
    return (
      <ListView 
        groups={adminGroups} 
        participantGroups={participantGroups}
        onSelect={setActiveGroupId} 
        onCreate={handleCreateGroup} 
        onDelete={handleDeleteGroup}
        onLogout={() => signOut(auth)} 
        currentUser={user}
      />
    );
  }

  // 2. VISTA DE DETALLE (DASHBOARD/TURNOS/SETTINGS)
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: "env(safe-area-inset-bottom)" }}>
      {view === 0 && (
        <DashboardView 
          groupId={activeGroup.id}
          participants={activeGroup.participants} 
          settings={activeGroup.settings} 
          onTogglePayment={handleTogglePayment} 
          onBatchTogglePayment={handleBatchTogglePayment}
          isAdmin={isAdmin}
        />
      )}
      {view === 1 && (
        <TurnsView 
          participants={activeGroup.participants} 
          settings={activeGroup.settings}
          onUpdateSettings={updateActiveGroupSettings}
          onAddParticipant={(p) => updateActiveGroupParticipants([
            ...activeGroup.participants, 
            { ...p, paymentHistory: {} } 
          ])} 
          onUpdateParticipant={(updatedP) => updateActiveGroupParticipants(
            activeGroup.participants.map(p => p.id === updatedP.id ? updatedP : p)
          )}
          onRemoveParticipant={(pid) => updateActiveGroupParticipants(
            activeGroup.participants.filter(p => p.id !== pid).map((p, i) => ({ ...p, turnNumber: i + 1 }))
          )} 
          onShuffle={() => updateActiveGroupParticipants(
            [...activeGroup.participants].sort(() => Math.random() - 0.5).map((p, i) => ({ ...p, turnNumber: i + 1 }))
          )} 
          onReorder={(f, t) => { 
            const r = [...activeGroup.participants].sort((a, b) => a.turnNumber - b.turnNumber);
            const [rem] = r.splice(f, 1); 
            r.splice(t, 0, rem); 
            updateActiveGroupParticipants(r.map((p, i) => ({ ...p, turnNumber: i + 1 }))); 
          }} 
          onBulkImport={(newParticipants) => updateActiveGroupParticipants([
            ...activeGroup.participants, 
            ...newParticipants.map(p => ({ ...p, paymentHistory: {} }))
          ])} 
          onSetTurnByDate={handleSetTurnByDate}
          isAdmin={isAdmin}
        />
      )}
      {view === 2 && isAdmin && (
        <SettingsView 
          settings={activeGroup.settings} 
          onUpdate={updateActiveGroupSettings} 
          onGoBack={() => { setActiveGroupId(null); setView(0); }} 
        />
      )}
      
      {/* ─── Bottom Navigation Sobrio ─── */}
      <Paper sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000, 
        borderRadius: 0, 
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        pb: "env(safe-area-inset-bottom)"
      }} elevation={0}>
        <BottomNavigation 
          showLabels 
          value={view} 
          onChange={(_, v) => {
            if (!isAdmin && v === 2) {
              // Si no es admin y toca "Volver a Mis Pollas"
              setActiveGroupId(null);
              setView(0);
            } else {
              setView(v);
            }
          }} 
          sx={{ height: 64 }}
        >
          <BottomNavigationAction label="Pagos" icon={<DashboardIcon />} />
          <BottomNavigationAction label="Turnos" icon={<CalendarIcon />} />
          {isAdmin ? (
            <BottomNavigationAction label="Ajustes" icon={<SettingsIcon />} />
          ) : (
            <BottomNavigationAction label="Mis Pollas" icon={<ArrowBackIcon />} />
          )}
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default App;
