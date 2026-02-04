// 서버 전용 - 토큰 기반 관리자 검증
import { verifyAuthTokenWithEmail, VerifiedUser } from '@/lib/firebase-admin';
import { isAdmin } from './adminCheck';

export type { VerifiedUser };

/**
 * Authorization 헤더에서 토큰을 검증하고 관리자 권한을 확인합니다.
 * 서버 전용 함수입니다.
 * @param authHeader Authorization 헤더 값 (Bearer <token>)
 * @returns 검증된 관리자 정보 또는 null (관리자가 아닌 경우)
 */
export async function verifyAdmin(authHeader: string | null): Promise<VerifiedUser | null> {
  const user = await verifyAuthTokenWithEmail(authHeader);

  if (!user) {
    return null;
  }

  if (!isAdmin(user.email)) {
    return null;
  }

  return user;
}
