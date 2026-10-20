export type Frequency = 'biweekly' | 'monthly';

export type PaymentState = 'pending' | 'in_review' | 'confirmed' | 'rejected';

export interface PaymentReceipt {
  status: PaymentState;
  receiptUrl?: string; // URL en Firebase Storage o base64
  submittedAt?: number; // Timestamp Unix ms
  confirmedAt?: number; // Timestamp Unix ms
  amountReported?: number; // Monto declarado por el participante
  rejectionReason?: string; // Motivo si fue rechazado
}

export interface PaymentStatus {
  [turnNumber: number]: boolean; // Ejemplo: { 1: true, 2: false, 3: true }
}

export interface Member {
  name: string;
  phone: string;
  bankDetails?: string; // Datos de transferencia (Banco, Tipo Cta, Numero)
  userId?: string; // UID de Firebase Auth si el usuario está registrado
  userEmail?: string; // Email para vincular automáticamente
  paymentHistory: PaymentStatus; // Historial individual para miembros compartidos
  paymentReceipts?: {
    [turnNumber: number]: PaymentReceipt;
  };
}

export interface Participant { 
  id: string; 
  type: 'single' | 'shared';
  members: Member[];
  turnNumber: number; // El turno en el que RECIBEN el dinero
  userId?: string; // UID de Firebase Auth si es single y está registrado
  userEmail?: string; // Email para vincular automáticamente
  
  // Historial de pagos para el participante completo
  paymentHistory: PaymentStatus; 
  
  // Comprobantes de pago por turno
  paymentReceipts?: {
    [turnNumber: number]: PaymentReceipt;
  };
  
  // Propiedades legacy opcionales
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
  participantUserIds?: string[]; // Array de UIDs de participantes para queries indexadas
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  bankDetails?: string; // Datos de transferencia: Banco, Tipo Cuenta, Número, RUT
  fcmToken?: string; // Token para Notificaciones Push
  updatedAt?: number;
}
