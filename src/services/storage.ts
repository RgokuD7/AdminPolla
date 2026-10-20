import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { compressImage } from "../utils/imageCompressor";

export const StorageService = {
  /**
   * Sube un comprobante de pago comprimido a Firebase Storage
   * @param pollaId ID de la polla
   * @param turnNumber Número de turno
   * @param participantId ID del participante
   * @param file Archivo original tomado de la cámara o galería
   * @returns URL pública de descarga en Firebase Storage
   */
  uploadReceipt: async (
    pollaId: string,
    turnNumber: number,
    participantId: string,
    file: File
  ): Promise<string> => {
    if (!storage) {
      throw new Error("Firebase Storage no está disponible. Revisa la configuración.");
    }

    // Comprimir client-side para no saturar almacenamiento ni datos del usuario
    const compressedBlob = await compressImage(file, 1200, 1200, 0.75);

    const timestamp = Date.now();
    const filePath = `receipts/${pollaId}/turn_${turnNumber}/${participantId}_${timestamp}.jpg`;
    const storageRef = ref(storage, filePath);

    const snapshot = await uploadBytes(storageRef, compressedBlob, {
      contentType: "image/jpeg",
      customMetadata: {
        pollaId,
        turnNumber: String(turnNumber),
        participantId,
        uploadedAt: String(timestamp)
      }
    });

    return await getDownloadURL(snapshot.ref);
  }
};
