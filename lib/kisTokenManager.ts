// KIS API 토큰 관리 — Supabase public.settings.kis_token 공유.
// Edge Functions(update-stock-prices, update-guru-prices)와 같은 row를 본다.
// 같은 jsonb 구조 { token, expiresAt: ISO } 유지로 토큰 단일 출처 보장.

import { getServiceClient } from './supabase-admin';
import { getKISToken } from './kis';

const SETTINGS_KEY = 'kis_token';
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface KISTokenValue {
  token?: string;
  expiresAt?: string;
}

/**
 * Supabase에 캐시된 KIS 토큰을 가져온다. 만료/없음이면 새로 발급해 UPSERT.
 * Supabase 접근이 완전히 실패하면 메모리 캐시(getKISToken)로 폴백.
 */
export async function getKISTokenWithCache(): Promise<string> {
  try {
    const supabase = getServiceClient();
    const { data: row, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (!error && row?.value) {
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
    console.error('[KIS Token] Supabase cache unavailable, using in-memory cache:', error);
    return await getKISToken();
  }
}

/**
 * 토큰 강제 갱신 + Supabase UPSERT. expiresAt은 ISO string으로 저장.
 */
export async function refreshKISToken(): Promise<string> {
  const token = await getKISToken();

  try {
    const supabase = getServiceClient();
    // KIS 토큰은 24시간 유효. 안전마진 5분.
    const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000 - EXPIRY_BUFFER_MS).toISOString();
    await supabase
      .from('settings')
      .upsert(
        { key: SETTINGS_KEY, value: { token, expiresAt: expiresAtIso } },
        { onConflict: 'key' },
      );
    console.log('[KIS Token] cached in Supabase settings');
  } catch (error) {
    console.error('[KIS Token] Supabase upsert 실패:', error);
  }

  return token;
}
