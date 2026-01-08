// KIS API 토큰 관리 (Firestore 캐싱)
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getKISToken } from './kis';

const TOKEN_DOC_PATH = 'settings/kis_token';
const EXPIRY_BUFFER = 5 * 60 * 1000; // 5분 버퍼

interface KISTokenCache {
  token: string;
  expiresAt: number;
  lastUpdated: Timestamp;
}

/**
 * Firestore 캐싱된 KIS 토큰 가져오기
 * 캐시 없거나 만료되면 새로 발급 후 Firestore 저장
 */
export async function getKISTokenWithCache(): Promise<string> {
  try {
    const docRef = doc(db, 'settings', 'kis_token');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as KISTokenCache;
      const now = Date.now();

      // 토큰이 아직 유효한지 확인 (5분 버퍼)
      if (now < data.expiresAt - EXPIRY_BUFFER) {
        console.log('[KIS Token] Using cached token from Firestore');
        return data.token;
      }
    }

    // 토큰이 없거나 만료됨 - 새로 발급
    console.log('[KIS Token] Fetching new token');
    return await refreshKISToken();
  } catch (error) {
    console.error('[KIS Token] Firestore cache failed, falling back to memory cache:', error);
    // Fallback: 기존 메모리 캐시 사용
    return await getKISToken();
  }
}

/**
 * 토큰 강제 갱신 및 Firestore 저장
 */
export async function refreshKISToken(): Promise<string> {
  // 기존 getKISToken() 사용해서 토큰 발급
  const token = await getKISToken();

  try {
    const docRef = doc(db, 'settings', 'kis_token');

    // KIS 토큰은 24시간 유효 (86400초)
    // 안전하게 23시간 55분으로 설정
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000) - EXPIRY_BUFFER;

    await setDoc(docRef, {
      token,
      expiresAt,
      lastUpdated: Timestamp.now(),
    });

    console.log('[KIS Token] Token cached in Firestore');
  } catch (error) {
    console.error('[KIS Token] Failed to cache token in Firestore:', error);
    // 계속 진행 - 토큰 자체는 유효함
  }

  return token;
}
