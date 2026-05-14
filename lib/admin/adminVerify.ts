// 서버 전용 - 쿠키/Bearer 기반 관리자 검증
import { getAuthUserAny, type AuthUser } from '@/lib/supabase-auth';
import { isAdminEmail } from './adminConfig.server';

export interface VerifiedUser {
  uid: string;
  email: string | null;
}

function toVerified(u: AuthUser): VerifiedUser {
  return { uid: u.id, email: u.email };
}

/**
 * 쿠키 우선, Bearer fallback으로 사용자 검증 후 관리자 이메일 여부 확인.
 * 관리자 아니면 null.
 */
export async function verifyAdmin(authHeader: string | null): Promise<VerifiedUser | null> {
  const user = await getAuthUserAny(authHeader);
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return toVerified(user);
}
