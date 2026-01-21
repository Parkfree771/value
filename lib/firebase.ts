/**
 * Firebase 통합 진입점
 *
 * 성능 최적화를 위해 lazy loading 패턴 사용
 * - 클라이언트: 필요할 때만 Firebase 모듈 로드
 * - 서버: API 라우트에서만 Firebase Admin 사용
 *
 * 기존 코드 호환성을 위해 동기 export도 제공하되,
 * 가능하면 lazy 버전 사용 권장
 */

// Lazy loading 함수들 re-export (권장)
export {
  getAuthLazy,
  getDbLazy,
  getStorageLazy,
  signInWithGoogleLazy,
  signOutLazy,
  getCurrentUser,
  getIdTokenLazy,
  onAuthStateChangeLazy,
} from './firebase-lazy';

// 동기 버전 (기존 코드 호환용 - 번들에 포함됨)
// 새 코드에서는 위의 lazy 버전 사용 권장
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 동기 export (기존 호환용)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Analytics (클라이언트만)
export const analytics = typeof window !== 'undefined' && isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
