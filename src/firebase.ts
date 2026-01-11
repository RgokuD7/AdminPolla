import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

// Configuración de Firebase para AdminPolla Web (desde variables de entorno)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validación simple para depuración
if (!firebaseConfig.apiKey) {
  console.error("🔥 Error Crítico: Falta la API KEY de Firebase. Verifica las variables de entorno en Vercel (.env.local en local).");
}

// Inicializar Apps de forma segura
let app;
let auth;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.error("🔥 Error inicializando Firebase:", e);
}

// Funciones Helper de Auth
export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase no está inicializado.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error en login con Google:", error);
    throw error;
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};

// Exportar instancias para uso directo si es necesario
export { auth, onAuthStateChanged };
export type { User };
