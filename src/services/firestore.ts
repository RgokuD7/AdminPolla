import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { PollaGroup, AppSettings, Participant, UserProfile } from "../types";

// Colecciones en Firestore
const POLLAS_COLLECTION = "pollas";
const USERS_COLLECTION = "users";

/**
 * Extrae todos los UIDs de usuarios vinculados a los participantes de una polla
 */
export const extractParticipantUserIds = (participants: Participant[]): string[] => {
  const uids = new Set<string>();
  (participants || []).forEach(p => {
    if (p.userId) uids.add(p.userId);
    (p.members || []).forEach(m => {
      if (m.userId) uids.add(m.userId);
    });
  });
  return Array.from(uids);
};

/**
 * Servicio para gestionar las Pollas en Firestore
 */
export const PollaService = {
  
  /**
   * Crea una nueva Polla asociada a un usuario
   */
  createPolla: async (userId: string, groupName: string): Promise<string> => {
    const defaultSettings: AppSettings = {
      groupName: groupName,
      quotaAmount: 0,
      currentTurn: 1,
      frequency: 'monthly',
      startDate: new Date().toISOString(),
      graceDays1: 3,
      graceDays2: 5,
      isLocked: false,
    };

    const newPollaData = {
      adminId: userId,
      participantUserIds: [] as string[],
      settings: defaultSettings,
      participants: [] as Participant[],
      createdAt: Timestamp.now(), 
      updatedAt: Timestamp.now()
    };

    try {
      const docRef = await addDoc(collection(db, POLLAS_COLLECTION), newPollaData);
      console.log("Polla creada con ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creando polla:", error);
      throw error;
    }
  },

  /**
   * Guarda o Sobreescribe una Polla completa (útil para guardar estado inicial o migraciones)
   */
  savePolla: async (userId: string, polla: PollaGroup): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, polla.id);
      const participantUserIds = extractParticipantUserIds(polla.participants);

      await setDoc(pollaRef, {
        adminId: userId,
        participantUserIds,
        settings: polla.settings,
        participants: polla.participants,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error("Error guardando polla:", error);
      throw error;
    }
  },

  /**
   * Actualiza solo los ajustes de una Polla
   */
  updateSettings: async (pollaId: string, settings: AppSettings): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      await updateDoc(pollaRef, {
        settings: settings,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error actualizando ajustes:", error);
      throw error;
    }
  },

  /**
   * Actualiza la lista de participantes (y sincroniza participantUserIds)
   */
  updateParticipants: async (pollaId: string, participants: Participant[]): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      const participantUserIds = extractParticipantUserIds(participants);

      await updateDoc(pollaRef, {
        participants: participants,
        participantUserIds: participantUserIds,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error actualizando participantes:", error);
      throw error;
    }
  },

  /**
   * Obtiene una Polla por su ID
   */
  getPollaById: async (pollaId: string): Promise<PollaGroup | null> => {
    try {
      const docRef = doc(db, POLLAS_COLLECTION, pollaId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        adminId: data.adminId || data.userId,
        participantUserIds: data.participantUserIds || [],
        settings: data.settings as AppSettings,
        participants: (data.participants || []) as Participant[],
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
      };
    } catch (error) {
      console.error("Error obteniendo polla por ID:", error);
      throw error;
    }
  },

  /**
   * Suscribe a las Pollas que un usuario ADMINISTRA (adminId == userId)
   */
  subscribeToUserPollas: (userId: string, callback: (pollas: PollaGroup[]) => void) => {
    const q = query(collection(db, POLLAS_COLLECTION), where("adminId", "==", userId));
    
    return onSnapshot(q, (snapshot) => {
      const pollas: PollaGroup[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pollas.push({
          id: doc.id,
          adminId: data.adminId,
          participantUserIds: data.participantUserIds || [],
          settings: data.settings as AppSettings,
          participants: (data.participants || []) as Participant[],
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        });
      });
      pollas.sort((a, b) => b.createdAt - a.createdAt);
      callback(pollas);
    });
  },

  /**
   * Suscribe a las Pollas donde el usuario PARTICIPA (participantUserIds array-contains userId)
   */
  subscribeToParticipantPollas: (userId: string, callback: (pollas: PollaGroup[]) => void) => {
    const q = query(collection(db, POLLAS_COLLECTION), where("participantUserIds", "array-contains", userId));
    
    return onSnapshot(q, (snapshot) => {
      const pollas: PollaGroup[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Evitar duplicar si también es el admin
        if (data.adminId !== userId) {
          pollas.push({
            id: doc.id,
            adminId: data.adminId,
            participantUserIds: data.participantUserIds || [],
            settings: data.settings as AppSettings,
            participants: (data.participants || []) as Participant[],
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          });
        }
      });
      pollas.sort((a, b) => b.createdAt - a.createdAt);
      callback(pollas);
    });
  },

  /**
   * Vincula un usuario autenticado a una casilla de participante en una Polla
   */
  linkUserToParticipant: async (
    pollaId: string, 
    participantId: string, 
    user: { uid: string; email: string; name?: string; bankDetails?: string },
    memberIndex?: number
  ): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      const snap = await getDoc(pollaRef);
      if (!snap.exists()) throw new Error("Polla no encontrada");

      const data = snap.data();
      const participants: Participant[] = data.participants || [];

      const updatedParticipants = participants.map(p => {
        if (p.id !== participantId) return p;

        if (p.type === 'shared' && typeof memberIndex === 'number') {
          const updatedMembers = p.members.map((m, idx) => {
            if (idx === memberIndex) {
              return {
                ...m,
                userId: user.uid,
                userEmail: user.email,
                bankDetails: m.bankDetails || user.bankDetails
              };
            }
            return m;
          });
          return { ...p, members: updatedMembers };
        } else {
          const firstMember = p.members?.[0] || { name: user.name || 'Participante', phone: '', paymentHistory: {} };
          const updatedMember = {
            ...firstMember,
            userId: user.uid,
            userEmail: user.email,
            bankDetails: firstMember.bankDetails || user.bankDetails
          };
          return {
            ...p,
            userId: user.uid,
            userEmail: user.email,
            members: [updatedMember, ...p.members.slice(1)]
          };
        }
      });

      const participantUserIds = extractParticipantUserIds(updatedParticipants);

      await updateDoc(pollaRef, {
        participants: updatedParticipants,
        participantUserIds: participantUserIds,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error vinculando usuario a participante:", error);
      throw error;
    }
  },

  /**
   * Registra el envío de un comprobante de pago para un turno
   */
  submitReceipt: async (
    pollaId: string,
    participantId: string,
    turnNumber: number,
    receiptUrl: string,
    amountReported: number,
    memberIndex?: number
  ): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      const snap = await getDoc(pollaRef);
      if (!snap.exists()) throw new Error("Polla no encontrada");

      const data = snap.data();
      const participants: Participant[] = data.participants || [];

      const updatedParticipants = participants.map(p => {
        if (p.id !== participantId) return p;

        const newReceipt = {
          status: 'in_review' as const,
          receiptUrl,
          submittedAt: Date.now(),
          amountReported
        };

        if (p.type === 'shared' && typeof memberIndex === 'number') {
          const updatedMembers = p.members.map((m, idx) => {
            if (idx === memberIndex) {
              const mReceipts = { ...(m.paymentReceipts || {}) };
              mReceipts[turnNumber] = newReceipt;
              return { ...m, paymentReceipts: mReceipts };
            }
            return m;
          });
          const pReceipts = { ...(p.paymentReceipts || {}) };
          pReceipts[turnNumber] = newReceipt;
          return { ...p, members: updatedMembers, paymentReceipts: pReceipts };
        } else {
          const pReceipts = { ...(p.paymentReceipts || {}) };
          pReceipts[turnNumber] = newReceipt;
          return { ...p, paymentReceipts: pReceipts };
        }
      });

      await updateDoc(pollaRef, {
        participants: updatedParticipants,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error enviando comprobante:", error);
      throw error;
    }
  },

  /**
   * Aprueba un comprobante de pago y marca el turno como pagado
   */
  approveReceipt: async (
    pollaId: string,
    participantId: string,
    turnNumber: number,
    memberIndex?: number
  ): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      const snap = await getDoc(pollaRef);
      if (!snap.exists()) throw new Error("Polla no encontrada");

      const data = snap.data();
      const participants: Participant[] = data.participants || [];

      const updatedParticipants = participants.map(p => {
        if (p.id !== participantId) return p;

        if (p.type === 'shared' && typeof memberIndex === 'number') {
          const updatedMembers = p.members.map((m, idx) => {
            if (idx === memberIndex) {
              const mHistory = { ...(m.paymentHistory || {}) };
              mHistory[turnNumber] = true;
              const mReceipts = { ...(m.paymentReceipts || {}) };
              if (mReceipts[turnNumber]) {
                mReceipts[turnNumber] = {
                  ...mReceipts[turnNumber],
                  status: 'confirmed',
                  confirmedAt: Date.now()
                };
              }
              return { ...m, paymentHistory: mHistory, paymentReceipts: mReceipts };
            }
            return m;
          });

          const allPaid = updatedMembers.every(m => m.paymentHistory?.[turnNumber]);
          const pHistory = { ...(p.paymentHistory || {}) };
          pHistory[turnNumber] = allPaid;

          const pReceipts = { ...(p.paymentReceipts || {}) };
          if (pReceipts[turnNumber]) {
            pReceipts[turnNumber] = {
              ...pReceipts[turnNumber],
              status: 'confirmed',
              confirmedAt: Date.now()
            };
          }

          return { ...p, members: updatedMembers, paymentHistory: pHistory, paymentReceipts: pReceipts };
        } else {
          const pHistory = { ...(p.paymentHistory || {}) };
          pHistory[turnNumber] = true;

          const pReceipts = { ...(p.paymentReceipts || {}) };
          if (pReceipts[turnNumber]) {
            pReceipts[turnNumber] = {
              ...pReceipts[turnNumber],
              status: 'confirmed',
              confirmedAt: Date.now()
            };
          }

          return { ...p, paymentHistory: pHistory, paymentReceipts: pReceipts };
        }
      });

      await updateDoc(pollaRef, {
        participants: updatedParticipants,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error aprobando comprobante:", error);
      throw error;
    }
  },

  /**
   * Rechaza un comprobante de pago indicando el motivo
   */
  rejectReceipt: async (
    pollaId: string,
    participantId: string,
    turnNumber: number,
    reason: string,
    memberIndex?: number
  ): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      const snap = await getDoc(pollaRef);
      if (!snap.exists()) throw new Error("Polla no encontrada");

      const data = snap.data();
      const participants: Participant[] = data.participants || [];

      const updatedParticipants = participants.map(p => {
        if (p.id !== participantId) return p;

        if (p.type === 'shared' && typeof memberIndex === 'number') {
          const updatedMembers = p.members.map((m, idx) => {
            if (idx === memberIndex) {
              const mReceipts = { ...(m.paymentReceipts || {}) };
              if (mReceipts[turnNumber]) {
                mReceipts[turnNumber] = {
                  ...mReceipts[turnNumber],
                  status: 'rejected',
                  rejectionReason: reason
                };
              }
              return { ...m, paymentReceipts: mReceipts };
            }
            return m;
          });

          const pReceipts = { ...(p.paymentReceipts || {}) };
          if (pReceipts[turnNumber]) {
            pReceipts[turnNumber] = {
              ...pReceipts[turnNumber],
              status: 'rejected',
              rejectionReason: reason
            };
          }

          return { ...p, members: updatedMembers, paymentReceipts: pReceipts };
        } else {
          const pReceipts = { ...(p.paymentReceipts || {}) };
          if (pReceipts[turnNumber]) {
            pReceipts[turnNumber] = {
              ...pReceipts[turnNumber],
              status: 'rejected',
              rejectionReason: reason
            };
          }

          return { ...p, paymentReceipts: pReceipts };
        }
      });

      await updateDoc(pollaRef, {
        participants: updatedParticipants,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error rechazando comprobante:", error);
      throw error;
    }
  },

  /**
   * Elimina una Polla
   */
  deletePolla: async (pollaId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, POLLAS_COLLECTION, pollaId));
    } catch (error) {
      console.error("Error eliminando polla:", error);
      throw error;
    }
  }
};

/**
 * Servicio para Perfiles de Usuario (Datos Bancarios, Teléfono, FCM)
 */
export const UserService = {
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo perfil de usuario:", error);
      return null;
    }
  },

  saveUserProfile: async (profile: Partial<UserProfile> & { uid: string }): Promise<void> => {
    try {
      const userRef = doc(db, USERS_COLLECTION, profile.uid);
      await setDoc(userRef, {
        ...profile,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("Error guardando perfil de usuario:", error);
      throw error;
    }
  },

  subscribeToUserProfile: (uid: string, callback: (profile: UserProfile | null) => void) => {
    const userRef = doc(db, USERS_COLLECTION, uid);
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    });
  }
};
