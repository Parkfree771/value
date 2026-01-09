// Firebase Admin SDK (서버 사이드 전용)
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Admin SDK가 이미 초기화되었는지 확인
if (getApps().length === 0) {
  let serviceAccount: ServiceAccount;

  // 방법 1: Base64 인코딩된 서비스 계정 (권장)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(json);
  }
  // 방법 2: 개별 환경 변수 (레거시)
  else {
    serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
  }

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  console.log('[Firebase Admin] Initialized successfully');
}

// Admin SDK Firestore, Storage, Auth 인스턴스
export const adminDb = getFirestore();
export const adminStorage = getStorage();
export const adminAuth = getAuth();

// Firestore 타임스탬프 유틸리티
export { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Authorization 헤더에서 Firebase ID 토큰을 검증하고 사용자 ID를 반환합니다.
 * @param authHeader Authorization 헤더 값 (Bearer <token>)
 * @returns 검증된 사용자 ID 또는 null
 */
export async function verifyAuthToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}
