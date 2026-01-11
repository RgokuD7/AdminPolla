export type Frequency = 'biweekly' | 'monthly';

export interface PaymentStatus {
  [turnNumber: number]: boolean; // Ejemplo: { 1: true, 2: false, 3: true }
}

export interface Member {
  name: string;
  phone: string;
  bankDetails?: string; // Datos de transferencia (Banco, Tipo Cta, Numero)
  paymentHistory: PaymentStatus; // Historial indiviudal para miembros compartidos
}

export interface Participant { 
  id: string; 
  type: 'single' | 'shared';
  members: Member[];
  turnNumber: number; // El turno en el que RECIBEN el dinero
  
  // Historial de pagos para el participante completo
  // En 'single', esto refleja el pago del usuario único.
  // En 'shared', esto suele ser true si TODOS pagaron, o manejarse derivado.
  paymentHistory: PaymentStatus; 
  
  // Mantenemos propiedades legacy opcionales para evitar crashes inmediatos durante migración, 
  // pero la lógica nueva usará paymentHistory.
  isPaid?: boolean; 
}

export interface AppSettings { 
  groupName: string; 
  quotaAmount: number; 
  currentTurn: number; 
  frequency: Frequency; 
  startDate: string; 
  graceDays1: number; 
  graceDays2: number; 
  isLocked: boolean;
}

export interface PollaGroup { 
  id: string; 
  settings: AppSettings; 
  participants: Participant[]; 
  createdAt: number; 
  adminId?: string;
}
