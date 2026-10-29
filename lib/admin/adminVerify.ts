// 서버 전용 - 쿠키(Neon Auth 세션) 기반 관리자 검증
import { getAuthUser, type AuthUser } from '@/lib/auth/session';
import { isAdminEmail } from './adminConfig.server';

export interface VerifiedUser {
  uid: string;
  email: string | null;
}

function toVerified(u: AuthUser): VerifiedUser {
  return { uid: u.id, email: u.email };
}

/**
 * 세션 사용자 검증 후 관리자 이메일 여부 확인. 관리자 아니면 null.
 * authHeader 인자는 기존 콜러 호환용 (Bearer 토큰 경로는 Neon Auth 이관 시 제거).
 */
export async function verifyAdmin(_authHeader?: string | null): Promise<VerifiedUser | null> {
  const user = await getAuthUser();
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return toVerified(user);
}
