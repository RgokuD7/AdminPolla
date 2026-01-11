import { AppSettings, Participant } from "@/types";

declare var confetti: any;

export const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
export const formatDateReadable = (dateStr: string) => dateStr ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(dateStr + "T12:00:00")) : "";
export const formatDateFull = (dateStr: string) => dateStr ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr + "T12:00:00")) : "";

export const calculatePaymentDate = (settings: AppSettings, turn: number): string => {
  const { startDate, frequency } = settings;
  const startBase = new Date(startDate + "T12:00:00");
  const turnIndex = turn - 1;
  let year = startBase.getFullYear(), month = startBase.getMonth();
  if (frequency === 'monthly') return new Date(year, month + turnIndex + 1, 0, 12).toISOString().split('T')[0];
  const monthOffset = Math.floor(turnIndex / 2);
  const isSecondHalf = turnIndex % 2 === 1;
  return (!isSecondHalf ? new Date(year, month + monthOffset, 15, 12) : new Date(year, month + monthOffset + 1, 0, 12)).toISOString().split('T')[0];
};

export const getGraceDaysForTurn = (settings: AppSettings, turn: number): number => settings.frequency === 'biweekly' ? ((turn - 1) % 2 === 1 ? settings.graceDays2 : settings.graceDays1) : settings.graceDays1;

export const getDeadlineDate = (baseDateStr: string, graceDays: number): string => {
  const date = new Date(baseDateStr + "T12:00:00");
  date.setDate(date.getDate() + graceDays);
  return date.toISOString().split('T')[0];
};

export const getParticipantName = (p: Participant) => p.members.map(m => m.name).join(" y ");

export const triggerConfetti = () => {
  if (typeof confetti === 'undefined') return;
  
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
};

export const calculateCurrentTurnFromDate = (settings: AppSettings): number => {
  if (!settings.startDate) return 1;
  
  // Ajustamos 'now' al momento actual
  const now = new Date();
  let turn = 1;

  // Límite de seguridad para evitar loops infinitos (ej: 10 años de quincenas ~ 240 turnos)
  // Buscamos el primer turno cuya FECHA DE VENCIMIENTO (Deadline) sea HOY o FUTURA.
  // Es decir, si hoy estamos dentro del plazo (incluso gracia) del turno X, ese es el actual.
  while (turn < 500) {
      const pDateStr = calculatePaymentDate(settings, turn);
      const graceDays = getGraceDaysForTurn(settings, turn);
      const deadlineStr = getDeadlineDate(pDateStr, graceDays);
      
      // Usamos el final del día de vencimiento para comparar
      const deadlineDate = new Date(deadlineStr + "T23:59:59");

      // Si la fecha límite es mayor o igual a ahora, significa que este turno
      // sigue vigente (aún no vence totalmente).
      if (deadlineDate >= now) {
          return turn;
      }
      turn++;
  }
  return turn;
};

// --- NEW HELPERS ---

export const isParticipantPaid = (p: Participant, turn: number): boolean => {
    return !!p.paymentHistory?.[turn];
};

export const isSharedMemberPaid = (p: Participant, memberIdx: number, turn: number): boolean => {
    return !!p.members[memberIdx]?.paymentHistory?.[turn];
};

export const getCollectedAmount = (participants: Participant[], currentTurn: number, quotaAmount: number): { collected: number, total: number, progress: number } => {
    let collected = 0;
    const total = participants.length * quotaAmount;
    
    if (total === 0) return { collected: 0, total: 0, progress: 0 };

    participants.forEach(p => {
        // Ignoramos el turno del receptor para la recaudación (no se paga a sí mismo), 
        // AUNQUE en el sistema anterior SÍ se cuenta el pago de todos los 'turnos vacíos' (pagan todos).
        // Asumiremos que TODOS pagan, incluido el receptor (modelo ROSCA tradicional: todos ponen, uno saca).
        
        if (p.type === 'shared') {
            const memberQuota = Math.floor(quotaAmount / p.members.length);
            p.members.forEach((m, idx) => {
                 if (m.paymentHistory?.[currentTurn]) {
                     collected += memberQuota;
                 }
            });
        } else {
            if (p.paymentHistory?.[currentTurn]) {
                collected += quotaAmount;
            }
        }
    });

    return { collected, total, progress: (collected / total) * 100 };
};
