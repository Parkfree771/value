// Firebase Lazy Loading - 필요할 때만 로드
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;

// Firebase App 초기화 (한 번만)
async function getFirebaseApp() {
  const { initializeApp, getApps, getApp } = await import('firebase/app');

  if (getApps().length) {
    return getApp();
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  return initializeApp(firebaseConfig);
}

// Auth 필요할 때만 로드
export async function getAuthLazy() {
  if (authInstance) return authInstance;

  const app = await getFirebaseApp();
  const { getAuth } = await import('firebase/auth');
  authInstance = getAuth(app);
  return authInstance;
}

// Firestore 필요할 때만 로드
export async function getDbLazy() {
  if (dbInstance) return dbInstance;

  const app = await getFirebaseApp();
  const { getFirestore } = await import('firebase/firestore');
  dbInstance = getFirestore(app);
  return dbInstance;
}

// Storage 필요할 때만 로드
export async function getStorageLazy() {
  if (storageInstance) return storageInstance;

  const app = await getFirebaseApp();
  const { getStorage } = await import('firebase/storage');
  storageInstance = getStorage(app);
  return storageInstance;
}

// Google 로그인 (필요할 때만)
export async function signInWithGoogleLazy() {
  const auth = await getAuthLazy();
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// 로그아웃
export async function signOutLazy() {
  const auth = await getAuthLazy();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}

// 현재 유저 확인 (Auth 로드 후)
export async function getCurrentUser() {
  const auth = await getAuthLazy();
  return auth.currentUser;
}

// ID 토큰 가져오기
export async function getIdTokenLazy() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.getIdToken();
}

// Auth 상태 변화 구독
export async function onAuthStateChangeLazy(callback: (user: any) => void) {
  const auth = await getAuthLazy();
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth, callback);
}
