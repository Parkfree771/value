// Firebase Admin SDK (서버 사이드 전용)
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Admin SDK가 이미 초기화되었는지 확인
if (getApps().length === 0) {
  // 환경 변수에서 서비스 계정 정보 읽기
  const serviceAccount: ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // 개행 문자 처리
  };

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  console.log('[Firebase Admin] Initialized successfully');
}

// Admin SDK Firestore 및 Storage 인스턴스
export const adminDb = getFirestore();
export const adminStorage = getStorage();

// Firestore 타임스탬프 유틸리티
export { FieldValue, Timestamp } from 'firebase-admin/firestore';
