// KIS API 토큰 관리 — Postgres public.settings.kis_token 공유.
// 가격 배치(update-stock-prices, update-guru-prices)와 같은 row를 본다.
// 같은 jsonb 구조 { token, expiresAt: ISO } 유지로 토큰 단일 출처 보장.

import { sql } from './db';
import { getKISToken } from './kis';

const SETTINGS_KEY = 'kis_token';
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface KISTokenValue {
  token?: string;
  expiresAt?: string;
}

/**
 * DB(settings)에 캐시된 KIS 토큰을 가져온다. 만료/없음이면 새로 발급해 UPSERT.
 * DB 접근이 완전히 실패하면 메모리 캐시(getKISToken)로 폴백.
 */
export async function getKISTokenWithCache(): Promise<string> {
  try {
    let row: Record<string, any> | null = null;
    try {
      const rows = await sql`select value from settings where key = ${SETTINGS_KEY}`;
      row = rows[0] ?? null;
    } catch (selectError) {
      // 기존 동작 유지: SELECT 에러는 무시하고 재발급 경로로
      console.error('[KIS Token] settings 조회 실패:', selectError);
    }

    if (row?.value) {
      const v = row.value as KISTokenValue;
      if (v.token && v.expiresAt) {
        const expiresAtMs = new Date(v.expiresAt).getTime();
        if (Date.now() < expiresAtMs - EXPIRY_BUFFER_MS) {
          return v.token;
        }
      }
    }

    return await refreshKISToken();
  } catch (error) {
    console.error('[KIS Token] DB cache unavailable, using in-memory cache:', error);
    return await getKISToken();
  }
}

/**
 * 토큰 강제 갱신 + settings UPSERT. expiresAt은 ISO string으로 저장.
 */
export async function refreshKISToken(): Promise<string> {
  const token = await getKISToken();

  try {
    // KIS 토큰은 24시간 유효. 안전마진 5분.
    const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000 - EXPIRY_BUFFER_MS).toISOString();
    const value = JSON.stringify({ token, expiresAt: expiresAtIso });
    await sql`
      insert into settings (key, value) values (${SETTINGS_KEY}, ${value}::jsonb)
      on conflict (key) do update set value = excluded.value
    `;
    console.log('[KIS Token] cached in settings');
  } catch (error) {
    console.error('[KIS Token] settings upsert 실패:', error);
  }

  return token;
}
