/**
 * 관리자 권한 확인 유틸리티
 *
 * 주의: 이 파일은 서버 전용입니다.
 * 클라이언트에서는 AuthContext의 isAdmin 상태를 사용하세요.
 */

import { isAdminEmail } from './adminConfig.server';

/**
 * 이메일이 관리자인지 확인 (서버 전용)
 * @deprecated 클라이언트에서 사용하지 마세요. AuthContext.isAdmin을 사용하세요.
 */
export function isAdmin(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}

/**
 * 관리자 권한 체크 (에러 반환)
 * @throws 관리자가 아닌 경우 에러
 */
export function checkAdminPermission(email: string | null | undefined): void {
  if (!isAdminEmail(email)) {
    throw new Error('관리자 권한이 필요합니다.');
  }
}
