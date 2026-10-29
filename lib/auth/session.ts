// 서버 사이드 인증 헬퍼 — API Route / Server Component에서 사용.
// Neon Auth 세션 쿠키 기반. (Supabase 시절 Bearer 토큰 패턴은 제거 — 모든 클라이언트가 쿠키 사용)

import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * 현재 요청의 인증된 사용자를 반환. 미인증/실패 시 null.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const { data } = await auth.getSession();
    const user = data?.user;
    if (!user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch (err) {
    console.error('[auth] 세션 조회 실패:', err);
    return null;
  }
}

/**
 * 로그인 직후(콜백 라우트) public.users 프로필 보장 후 onboarding 완료 여부 반환.
 * 프로필 생성/기존 프로필 승계 규칙은 db/migrations/0002_ensure_user_profile.sql 참고.
 * 세션이 없으면 null.
 */
export async function ensureProfileForSession(): Promise<{ id: string; onboardingCompleted: boolean } | null> {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user?.email) return null;

  await sql`select public.ensure_user_profile(
    ${user.id}::uuid, ${user.email}, ${user.name || null}, ${user.image ?? null}, ${user.emailVerified === true}
  )`;
  const rows = await sql`select onboarding_completed from public.users where id = ${user.id}`;
  return { id: user.id, onboardingCompleted: rows[0]?.onboarding_completed === true };
}
