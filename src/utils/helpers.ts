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

export const getParticipantName = (p: Participant) => p.members.map(m => m.name).join(" / ");

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
  }, 250);
};
