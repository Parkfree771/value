// 서버 사이드 인증 헬퍼.
// API Route / Server Component / Server Action에서 사용.
//
// 두 가지 사용 패턴 지원:
//   1. 쿠키 기반 (권장, @supabase/ssr 표준): getAuthUser()
//   2. Authorization Bearer 토큰: getAuthUserFromBearer(authHeader)

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * 현재 요청의 인증된 사용자를 반환. 쿠키 기반.
 * 미인증/실패 시 null.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Authorization 헤더의 Bearer 토큰을 검증. 레거시 fetch 패턴 호환용.
 * 새 코드는 getAuthUser() (쿠키 기반)를 쓰는 게 좋음.
 */
export async function getAuthUserFromBearer(
  authHeader: string | null,
): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // service_role 키로 검증 (서버 전용, 절대 클라이언트 노출 금지)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error('[supabase-auth] SUPABASE_URL/SECRET_KEY 누락');
    return null;
  }

  const admin = createServiceClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * 쿠키 우선, 없으면 Bearer 토큰 fallback. 점진 마이그레이션 기간 동안 안전망.
 */
export async function getAuthUserAny(
  authHeader: string | null,
): Promise<AuthUser | null> {
  const fromCookie = await getAuthUser();
  if (fromCookie) return fromCookie;
  return getAuthUserFromBearer(authHeader);
}

