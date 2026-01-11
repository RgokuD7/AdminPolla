import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Definir tipos para evitar errores de TS con import.meta.env
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validar configuración antes de inicializar para evitar crash silencioso
const isConfigValid = Object.values(firebaseConfig).every(value => value !== undefined && value !== '');

let app;
let auth: any;
let db: any;
let googleProvider: any;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app); // Inicializamos Firestore
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.error("🔥 Error inicializando Firebase:", e);
  }
} else {
  console.warn("⚠️ Faltan variables de entorno de Firebase. La app no funcionará correctamente.");
}

// Wrapper para login
export const loginWithGoogle = async () => {
    if (!auth) {
        console.error("Auth no inicializado");
        return;
    }
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
    }
};

export { auth, db, onAuthStateChanged };
export type { User };
