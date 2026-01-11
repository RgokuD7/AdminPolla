export type Frequency = 'biweekly' | 'monthly';

export interface Member {
  name: string;
  phone: string;
  isPaid?: boolean; // Nuevo: Estado de pago individual
}

export interface Participant { 
  id: string; 
  type: 'single' | 'shared';
  members: Member[];
  turnNumber: number; 
  isPaid: boolean; 
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
}
