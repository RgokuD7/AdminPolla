import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Paper,
  BottomNavigation,
  BottomNavigationAction
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon
} from "@mui/icons-material";

import { theme } from "@/theme/theme";
import { AppSettings, PollaGroup, Participant } from "@/types";
import ListView from "@/components/ListView";
import DashboardView from "@/components/DashboardView";
import TurnsView from "@/components/TurnsView";
import SettingsView from "@/components/SettingsView";

const App = () => {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [view, setView] = useState(0); 
  const [groups, setGroups] = useState<PollaGroup[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('adminpolla_v22_dates');
    if (saved) setGroups(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('adminpolla_v22_dates', JSON.stringify(groups));
  }, [groups]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);

  const handleCreateGroup = (settings: AppSettings) => {
    const newGroup: PollaGroup = { id: "g-" + Date.now(), settings, participants: [], createdAt: Date.now() };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const updateActiveGroup = useCallback((updates: Partial<PollaGroup>) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  }, [activeGroupId]);

  const handleSetTurnByDate = (pid: string, newTurn: number) => {
    if (!activeGroup) return;
    const sorted = [...activeGroup.participants].sort((a, b) => a.turnNumber - b.turnNumber);
    const targetIdx = sorted.findIndex(p => p.id === pid);
    if (targetIdx === -1) return;
    
    const [pToMove] = sorted.splice(targetIdx, 1);
    sorted.splice(newTurn - 1, 0, pToMove);
    
    updateActiveGroup({ 
      participants: sorted.map((p, i) => ({ ...p, turnNumber: i + 1 })) 
    });
  };

  if (!activeGroupId || !activeGroup) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ListView groups={groups} onSelect={setActiveGroupId} onCreate={handleCreateGroup} onDelete={(id) => setGroups(prev => prev.filter(g => g.id !== id))} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: "env(safe-area-inset-bottom)" }}>
        {view === 0 && (
          <DashboardView 
            participants={activeGroup.participants} 
            settings={activeGroup.settings} 
            onTogglePayment={(pid) => updateActiveGroup({ 
              participants: activeGroup.participants.map(p => p.id === pid ? {...p, isPaid: !p.isPaid} : p) 
            })} 
          />
        )}
        {view === 1 && (
          <TurnsView 
            participants={activeGroup.participants} 
            settings={activeGroup.settings}
            onUpdateSettings={(s) => updateActiveGroup({ settings: s })}
            onAddParticipant={(p) => updateActiveGroup({ participants: [...activeGroup.participants, p] })} 
            onUpdateParticipant={(updatedP) => updateActiveGroup({
              participants: activeGroup.participants.map(p => p.id === updatedP.id ? updatedP : p)
            })}
            onRemoveParticipant={(pid) => updateActiveGroup({ 
              participants: activeGroup.participants.filter(p => p.id !== pid).map((p, i) => ({...p, turnNumber: i+1})) 
            })} 
            onShuffle={() => updateActiveGroup({ 
              participants: [...activeGroup.participants].sort(() => Math.random() - 0.5).map((p, i) => ({...p, turnNumber: i+1})) 
            })} 
            onReorder={(f, t) => { 
              const r = [...activeGroup.participants].sort((a,b) => a.turnNumber - b.turnNumber);
              const [rem] = r.splice(f, 1); 
              r.splice(t, 0, rem); 
              updateActiveGroup({ participants: r.map((p, i) => ({...p, turnNumber: i+1})) }); 
            }} 
            onBulkImport={(newParticipants) => updateActiveGroup({ 
              participants: [...activeGroup.participants, ...newParticipants] 
            })} 
            onSetTurnByDate={handleSetTurnByDate}
          />
        )}
        {view === 2 && <SettingsView settings={activeGroup.settings} onUpdate={(s) => updateActiveGroup({ settings: s })} onGoBack={() => { setActiveGroupId(null); setView(0); }} />}
        
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
