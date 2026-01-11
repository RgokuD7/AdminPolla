import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ThemeProvider,
  CssBaseline,
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
  Settings as SettingsIcon
} from "@mui/icons-material";

import { theme } from "@/theme/theme";
import { AppSettings, PollaGroup, Participant, PaymentStatus } from "@/types";
import ListView from "@/components/ListView";
import DashboardView from "@/components/DashboardView";
import TurnsView from "@/components/TurnsView";
import SettingsView from "@/components/SettingsView";
import LoginView from "@/components/LoginView"; 
import { auth, onAuthStateChanged, loginWithGoogle, getRedirectResult, User } from "@/firebase";
import { signOut } from "firebase/auth";
import { PollaService } from "@/services/firestore";

const App = () => {
  // === ESTADO ===
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [view, setView] = useState(0); 
  const [groups, setGroups] = useState<PollaGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // === EFECTOS ===
  useEffect(() => {
    if (!auth) {
      console.error("Auth no disponible");
      setIsInitializing(false);
      return;
    }

    let redirectCheckDone = false;

    // 1. Iniciar chequeo de Redirect
    getRedirectResult(auth)
      .then((result) => {
         console.log("Redirect check complete. User:", result?.user?.uid);
      })
      .catch((error) => {
         console.error("Error en redirect result:", error);
      })
      .finally(() => {
         // Una vez que Firebase terminó de procesar el redirect (haya usuario o no)
         redirectCheckDone = true;
         // Si en este punto NO tenemos usuario, forzamos el fin de la carga.
         // (Si SÍ tenemos usuario, onAuthStateChanged ya lo habrá manejado o lo hará en microsegundos)
         if (!auth.currentUser) {
            setIsInitializing(false);
         }
      });

    // 2. Escuchar cambios de estado (Login normal / Persistencia / Éxito de Redirect)
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      console.log("Auth State Changed. User:", currentUser?.uid);
      setUser(currentUser);
      
      // Si detectamos un usuario, terminamos la carga inmediatamente (éxito)
      if (currentUser) {
        setIsInitializing(false);
      } 
      // Si viene null, SOLO terminamos la carga si el chequeo de redirect ya terminó.
      // Si el redirect sigue procesando, esperamos (el finally de arriba se encargará).
      else if (redirectCheckDone) {
        setIsInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar grupos desde Firestore cuando el usuario se loguea
  useEffect(() => {
    if (user) {
      setIsLoadingGroups(true);
      const unsubscribeGroups = PollaService.subscribeToUserPollas(user.uid, (fetchedGroups) => {
        setGroups(fetchedGroups);
        setIsLoadingGroups(false);
      });
      return () => unsubscribeGroups();
    } else {
      setGroups([]);
    }
  }, [user]);

  // === CALCULOS ===
  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);

  // === HANDLERS FIREBASE ===
  
  const handleCreateGroup = async (settings: AppSettings) => {
    if (!user) return;
    try {
      const newId = await PollaService.createPolla(user.uid, settings.groupName);
      // Actualizamos settings iniciales si es necesario, aunque createPolla ya pone defaults
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
    if (!activeGroupId) return;
    try {
      await PollaService.updateParticipants(activeGroupId, newParticipants);
    } catch (e) {
      console.error("Error actualizando participantes:", e);
    }
  };
  
  const updateActiveGroupSettings = async (newSettings: AppSettings) => {
    if (!activeGroupId) return;
    try {
      await PollaService.updateSettings(activeGroupId, newSettings);
    } catch (e) {
      console.error("Error actualizando ajustes:", e);
    }
  };

  // === LÓGICA DE NEGOCIO LOCAL (Adaptada a Firestore & Historial de Pagos) ===

  const handleSetTurnByDate = (pid: string, newTurn: number) => {
    if (!activeGroup) return;
    const sorted = [...activeGroup.participants].sort((a, b) => a.turnNumber - b.turnNumber);
    const targetIdx = sorted.findIndex(p => p.id === pid);
    if (targetIdx === -1) return;
    const [pToMove] = sorted.splice(targetIdx, 1);
    sorted.splice(newTurn - 1, 0, pToMove);
    
    // Guardar en Firestore
    updateActiveGroupParticipants(sorted.map((p, i) => ({ ...p, turnNumber: i + 1 })));
  };

  // Función pura para calcular el nuevo estado de un participante tras un toggle
  const toggleParticipantPayment = (p: Participant, currentTurn: number, memberIndex?: number): Participant => {
      // Inicializar historial
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
    if (!activeGroup) return;
    const currentTurn = activeGroup.settings.currentTurn;
    const updatedParticipants = activeGroup.participants.map(p => {
       if (p.id !== pid) return p;
       return toggleParticipantPayment(p, currentTurn, memberIndex);
    });
    updateActiveGroupParticipants(updatedParticipants);
  };

  const handleBatchTogglePayment = (updates: { pid: string, memberIndex?: number }[]) => {
    if (!activeGroup) return;
    const currentTurn = activeGroup.settings.currentTurn;
    
    // Clonamos lista inicial
    let nextParticipants = [...activeGroup.participants];
    
    // Aplicamos cada update secuencialmente sobre la lista acumulada
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
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <CircularProgress />
      </Box>
    );
  }

  if (!user) {
     return (
       <ThemeProvider theme={theme}>
         <CssBaseline />
         <LoginView onLogin={loginWithGoogle} />
       </ThemeProvider>
     );
  }

  if (isLoadingGroups && groups.length === 0) {
      return (
        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <Typography variant="body2" color="text.secondary">Cargando tus pollas...</Typography>
        </Box>
      );
  }

  // 1. LISTA DE GRUPOS (HOME)
  if (!activeGroupId || !activeGroup) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ListView 
          groups={groups} 
          onSelect={setActiveGroupId} 
          onCreate={handleCreateGroup} 
          onDelete={handleDeleteGroup}
          onLogout={() => signOut(auth)} 
        />
      </ThemeProvider>
    );
  }

  // 2. VISTA DE DETALLE (DASHBOARD/TURNOS/SETTINGS)
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: "env(safe-area-inset-bottom)" }}>
        {view === 0 && (
          <DashboardView 
            participants={activeGroup.participants} 
            settings={activeGroup.settings} 
            onTogglePayment={handleTogglePayment} 
            onBatchTogglePayment={handleBatchTogglePayment}
          />
        )}
        {view === 1 && (
          <TurnsView 
            participants={activeGroup.participants} 
            settings={activeGroup.settings}
            onUpdateSettings={updateActiveGroupSettings}
            onAddParticipant={(p) => updateActiveGroupParticipants([...activeGroup.participants, 
                // Asegurar que nuevos participantes tengan historial inicializado
                {...p, paymentHistory: {}} 
            ])} 
            onUpdateParticipant={(updatedP) => updateActiveGroupParticipants(
              activeGroup.participants.map(p => p.id === updatedP.id ? updatedP : p)
            )}
            onRemoveParticipant={(pid) => updateActiveGroupParticipants(
              activeGroup.participants.filter(p => p.id !== pid).map((p, i) => ({...p, turnNumber: i+1}))
            )} 
            onShuffle={() => updateActiveGroupParticipants(
              [...activeGroup.participants].sort(() => Math.random() - 0.5).map((p, i) => ({...p, turnNumber: i+1}))
            )} 
            onReorder={(f, t) => { 
              const r = [...activeGroup.participants].sort((a,b) => a.turnNumber - b.turnNumber);
              const [rem] = r.splice(f, 1); 
              r.splice(t, 0, rem); 
              updateActiveGroupParticipants(r.map((p, i) => ({...p, turnNumber: i+1}))); 
            }} 
            onBulkImport={(newParticipants) => updateActiveGroupParticipants(
              [...activeGroup.participants, ...newParticipants.map(p => ({ ...p, paymentHistory: {} }))]
            )} 
            onSetTurnByDate={handleSetTurnByDate}
          />
        )}
        {view === 2 && (
          <SettingsView 
            settings={activeGroup.settings} 
            onUpdate={updateActiveGroupSettings} 
            onGoBack={() => { setActiveGroupId(null); setView(0); }} 
          />
        )}
        
        <Paper sx={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, 
          borderRadius: '16px 16px 0 0', 
          borderTop: '1px solid #E5E7EB',
          bgcolor: 'white',
          pb: "env(safe-area-inset-bottom)"
        }} elevation={0}>
          <BottomNavigation showLabels value={view} onChange={(_, v) => setView(v)} sx={{ height: 80, bgcolor: 'transparent' }}>
            <BottomNavigationAction label="Pagos" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Turnos" icon={<CalendarIcon />} />
            <BottomNavigationAction label="Ajustes" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default App;
