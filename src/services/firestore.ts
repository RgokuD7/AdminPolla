import { 
  collection, 
  doc, 
  setDoc, 
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
import { PollaGroup, AppSettings, Participant } from "../types";

// Nombre de la colección en Firestore
const POLLAS_COLLECTION = "pollas";

/**
 * Servicio para gestionar las Pollas en Firestore
 */
export const PollaService = {
  
  /**
   * Crea una nueva Polla asociada a un usuario
   */
  createPolla: async (userId: string, groupName: string): Promise<string> => {
    // Configuración inicial por defecto
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
      await setDoc(pollaRef, {
        adminId: userId, // Aseguramos que el usuario siga siendo el dueño
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
   * Actualiza la lista de participantes (y sus estados de pago)
   */
  updateParticipants: async (pollaId: string, participants: Participant[]): Promise<void> => {
    try {
      const pollaRef = doc(db, POLLAS_COLLECTION, pollaId);
      await updateDoc(pollaRef, {
        participants: participants,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error actualizando participantes:", error);
      throw error;
    }
  },

  /**
   * Suscribe a las Pollas de un usuario en tiempo real
   * @param userId ID del usuario autenticado
   * @param callback Función que recibe la lista de pollas actualizada
   * @returns Función para desuscribirse (unsubscribe)
   */
  subscribeToUserPollas: (userId: string, callback: (pollas: PollaGroup[]) => void) => {
    const q = query(collection(db, POLLAS_COLLECTION), where("adminId", "==", userId));
    
    return onSnapshot(q, (snapshot) => {
      const pollas: PollaGroup[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pollas.push({
          id: doc.id,
          settings: data.settings as AppSettings,
          participants: (data.participants || []) as Participant[],
          createdAt: data.createdAt?.toMillis() || Date.now(),
        });
      });
      // Ordenar por fecha de creación (opcional)
      pollas.sort((a, b) => b.createdAt - a.createdAt);
      callback(pollas);
    });
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
