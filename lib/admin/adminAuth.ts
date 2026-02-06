// 서버 사이드 전용 - 클라이언트에서 import하지 마세요
import { adminAuth } from '@/lib/firebase-admin';
import { isAdminEmail } from './adminConfig.server';

/**
 * Authorization 헤더에서 토큰을 검증하고 관리자 이메일 반환
 * 서버 API 라우트에서만 사용
 *
 * @param authHeader Authorization 헤더 (Bearer <token>)
 * @returns 검증된 관리자 이메일
 * @throws 토큰 없음, 검증 실패, 관리자 아님
 */
export async function verifyAdminToken(authHeader: string | null): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('인증 토큰이 필요합니다.');
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    throw new Error('유효하지 않은 토큰 형식입니다.');
  }

  try {
    // Firebase Admin SDK로 토큰 검증
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      throw new Error('이메일 정보가 없습니다.');
    }

    // 관리자 여부 확인 (환경변수 기반)
    if (!isAdminEmail(email)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    return email;
  } catch (error: any) {
    // Firebase 토큰 검증 실패
    if (error.code === 'auth/id-token-expired') {
      throw new Error('토큰이 만료되었습니다. 다시 로그인해주세요.');
    }
    if (error.code === 'auth/argument-error') {
      throw new Error('유효하지 않은 토큰입니다.');
    }
    // 이미 우리가 던진 에러면 그대로 전달
    if (error.message) {
      throw error;
    }
    throw new Error('인증에 실패했습니다.');
  }
}
