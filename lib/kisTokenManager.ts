// KIS API 토큰 관리 (Firestore 캐싱 via Admin SDK)
//
// Client SDK (firebase/firestore) 는 보안 규칙에 따라 인증 컨텍스트가 있어야만
// 읽기/쓰기가 허용되는데, 서버 사이드(API 라우트, SSR)에서는 인증 컨텍스트가
// 없어 permission-denied 가 발생한다. Admin SDK 는 보안 규칙을 우회하므로
// 서버 사이드에서 안전하게 토큰 캐시 도큐먼트를 읽고 쓸 수 있다.

import { adminDb, Timestamp } from './firebase-admin';
import { getKISToken } from './kis';

const TOKEN_COLLECTION = 'settings';
const TOKEN_DOC = 'kis_token';
const EXPIRY_BUFFER = 5 * 60 * 1000; // 5분 버퍼

interface KISTokenCache {
  token: string;
  expiresAt: number;
  lastUpdated: FirebaseFirestore.Timestamp;
}

/**
 * Firestore 에 캐시된 KIS 토큰을 가져온다.
 * 캐시가 없거나 만료되면 새로 발급 후 Firestore 에 저장한다.
 * Firestore 접근이 완전히 실패하면 getKISToken() 메모리 캐시로 폴백.
 */
export async function getKISTokenWithCache(): Promise<string> {
  try {
    const docRef = adminDb.collection(TOKEN_COLLECTION).doc(TOKEN_DOC);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data() as KISTokenCache | undefined;
      const now = Date.now();

      if (data && now < data.expiresAt - EXPIRY_BUFFER) {
        return data.token;
      }
    }

    // 토큰이 없거나 만료됨 - 새로 발급
    return await refreshKISToken();
  } catch (error) {
    console.error('[KIS Token] Firestore cache unavailable, using in-memory cache:', error);
    return await getKISToken();
  }
}

/**
 * 토큰 강제 갱신 및 Firestore 저장 (Admin SDK)
 */
export async function refreshKISToken(): Promise<string> {
  const token = await getKISToken();

  try {
    const docRef = adminDb.collection(TOKEN_COLLECTION).doc(TOKEN_DOC);

    // KIS 토큰은 24시간 유효 (86400초). 안전하게 23시간 55분으로 설정.
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 - EXPIRY_BUFFER;

    await docRef.set({
      token,
      expiresAt,
      lastUpdated: Timestamp.now(),
    });

    console.log('[KIS Token] Token cached in Firestore (Admin SDK)');
  } catch (error) {
    console.error('[KIS Token] Failed to cache token in Firestore:', error);
    // 토큰 자체는 유효하므로 계속 진행
  }

  return token;
}
