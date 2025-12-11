import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCTGDVtfxapV4t2Fv4bRHSW3e1xzVUy2Rw",
  authDomain: "value-91453.firebaseapp.com",
  projectId: "value-91453",
  storageBucket: "value-91453.firebasestorage.app",
  messagingSenderId: "176233515000",
  appId: "1:176233515000:web:048fcef7a952b93708f80d",
  measurementId: "G-34YB3Y8Q7H"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configure Google Provider with additional settings
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics (only on client-side)
export const analytics = typeof window !== 'undefined' && isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
