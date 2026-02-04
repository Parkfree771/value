// 관리자 이메일 목록
const ADMIN_EMAILS = ['dbfh1498@gmail.com'];

/**
 * 이메일이 관리자인지 확인 (클라이언트/서버 공용)
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * 관리자 권한 체크 (에러 반환) - 레거시 지원
 */
export function checkAdminPermission(email: string | null | undefined): void {
  if (!isAdmin(email)) {
    throw new Error('관리자 권한이 필요합니다.');
  }
}
