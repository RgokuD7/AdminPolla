import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { PollaGroup } from '@/types';
import { calculatePaymentDate, formatDateReadable, getParticipantName, formatCurrency } from '@/utils/helpers';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  CircularProgress,
  Chip,
  Paper,
  Stack
} from '@mui/material';
import { 
  Groups as GroupIcon
} from '@mui/icons-material';

const PublicTurnsView = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<PollaGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "pollas", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Asumimos que los datos coinciden con la interfaz PollaGroup
          const data = docSnap.data();
          // Aseguramos que participants sea un array
          const rawParticipants = data.participants || [];
          const groupData: PollaGroup = {
              id: docSnap.id,
              createdAt: data.createdAt || Date.now(),
              adminId: data.userId || data.adminId, // Mapeamos userId a adminId si existe
              settings: data.settings,
              participants: rawParticipants
          };
          setGroup(groupData);
        } else {
          setError("No encontramos este grupo. Verifica el enlace.");
        }
      } catch (err) {
        console.error(err);
        setError("Error cargando el grupo. Puede que sea privado o el enlace esté mal.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">Cargando turnos...</Typography>
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Container maxWidth="xs" sx={{ mt: 10, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2 }}>😕</Typography>
        <Typography variant="h6" gutterBottom>Algo salió mal</Typography>
        <Typography color="text.secondary">{error}</Typography>
      </Container>
    );
  }

  const { settings, participants } = group;
  // Ordenar participantes por turno
  const sortedParticipants = [...participants].sort((a, b) => a.turnNumber - b.turnNumber);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F3F4F6', pb: 4 }}>
      {/* Header Corporativo Público */}
      <Box sx={{ bgcolor: 'white', py: 2, px: 3, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
         <Box component="img" src="/logo.png" sx={{ width: 32, height: 32 }} />
         <Typography variant="h6" sx={{ fontWeight: 800, color: '#1F2937', fontSize: '1.1rem' }}>
            <Box component="span" sx={{ color: '#234574' }}>Admin</Box><Box component="span" sx={{ color: '#059669' }}>Polla</Box>
         </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 3 }}>
        
        {/* Tarjeta del Grupo Intro */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3, border: '1px solid #E5E7EB' }}>
          <Stack spacing={1} alignItems="center">
             <GroupIcon sx={{ fontSize: 40, color: '#3B82F6', bgcolor: '#EFF6FF', p: 1, borderRadius: '50%' }} />
             <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center' }}>{settings.groupName}</Typography>
             <Chip 
               label={`${participants.length} Participantes`} 
               size="small" 
               sx={{ bgcolor: '#F3F4F6', fontWeight: 600 }} 
             />
             <Chip 
               label={`Monto Turno: ${formatCurrency(settings.quotaAmount * participants.length)}`} 
               color="success"
               sx={{ fontWeight: 800, mt: 0.5 }} 
             />
             <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                Frecuencia: {settings.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
             </Typography>
          </Stack>
        </Paper>

        <Typography variant="h6" sx={{ mb: 2, px: 1, fontWeight: 700 }}>
           Calendario de Turnos
        </Typography>

        <List sx={{ p: 0 }}>
          {sortedParticipants.map((p) => {
            const paymentDate = calculatePaymentDate(settings, p.turnNumber);
            const isCurrent = p.turnNumber === settings.currentTurn;
            const isPast = p.turnNumber < settings.currentTurn;
            
            // UI Date Format
            const dayNumber = paymentDate.split('-')[2];
            const monthShort = formatDateReadable(paymentDate).split(' ')[1].toUpperCase();
            
            return (
              <Card 
                key={p.id} 
                sx={{ 
                  mb: 1.5, 
                  border: isCurrent ? '2px solid' : '1px solid',
                  borderColor: isCurrent ? '#059669' : '#E5E7EB',
                  borderRadius: 3,
                  opacity: isPast ? 0.7 : 1,
                  bgcolor: isCurrent ? '#ECFDF5' : 'white',
                  // Efecto visual para el actual
                  transform: isCurrent ? 'scale(1.02)' : 'none',
                  transition: 'transform 0.2s',
                  boxShadow: isCurrent ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none'
                }}
              >
                  {isCurrent && (
                    <Chip 
                      label="TURNO ACTUAL" 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        height: 20, 
                        fontSize: '0.6rem', 
                        fontWeight: 800,
                        bgcolor: '#059669',
                        color: 'white'
                      }} 
                    />
                  )}

                  <ListItem sx={{ py: 2 }}>
                    <ListItemAvatar sx={{ minWidth: 60, textAlign: 'center', mr: 1 }}>
                      <Box sx={{ 
                        border: '2px solid', 
                        borderColor: isCurrent ? '#059669' : '#3B82F6', 
                        borderRadius: 2.5, 
                        px: 0.5, py: 0.8,
                        bgcolor: 'white' 
                      }}>
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, lineHeight: 1, color: isCurrent ? '#059669' : '#3B82F6' }}>
                          {monthShort}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.2rem', lineHeight: 1, color: isCurrent ? '#059669' : '#3B82F6' }}>
                          {dayNumber}
                        </Typography>
                      </Box>
                    </ListItemAvatar>
                    
                    <ListItemText 
                       primary={
                         <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F2937' }}>
                            {getParticipantName(p)}
                         </Typography>
                       }
                       secondary={
                         <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                           <Typography variant="caption" sx={{ fontWeight: 600, bgcolor: 'rgba(0,0,0,0.05)', px: 1, borderRadius: 1 }}>
                             Turno #{p.turnNumber}
                           </Typography>
                         </Stack>
                       }
                    />
                  </ListItem>
              </Card>
            );
          })}
        </List>
        
        <Box sx={{ textAlign: 'center', mt: 4, mb: 4 }}>
             <Typography variant="caption" color="text.disabled">AdminPolla Vista Pública</Typography>
        </Box>

      </Container>
    </Box>
  );
};

export default PublicTurnsView;
