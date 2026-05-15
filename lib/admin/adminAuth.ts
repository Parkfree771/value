// 서버 사이드 전용 - 클라이언트에서 import하지 마세요
import { getAuthUserAny } from '@/lib/supabase-auth';
import { isAdminEmail } from './adminConfig.server';

/**
 * Authorization 헤더(Bearer Supabase access_token) 또는 쿠키 세션으로
 * 사용자 검증 + 관리자 이메일 확인. 서버 API 라우트에서만 사용.
 *
 * @param authHeader Authorization 헤더 (Bearer <token>) — 쿠키 세션 있으면 null이어도 OK
 * @returns 검증된 관리자 이메일
 * @throws 인증 실패 또는 관리자 아님
 */
export async function verifyAdminToken(authHeader: string | null): Promise<string> {
  const user = await getAuthUserAny(authHeader);
  if (!user || !user.email) {
    throw new Error('인증 토큰이 필요합니다.');
  }

  if (!isAdminEmail(user.email)) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  return user.email;
}
