/**
 * 서버 전용 관리자 설정
 * 이 파일은 클라이언트에서 import하면 안됩니다.
 *
 * 환경변수 설정:
 * ADMIN_EMAILS=email1@example.com,email2@example.com
 */

// 환경변수에서 관리자 이메일 목록 로드
function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';

  if (!adminEmailsEnv) {
    console.warn('[Admin] ADMIN_EMAILS 환경변수가 설정되지 않았습니다.');
    return [];
  }

  return adminEmailsEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

// 캐시된 관리자 이메일 목록
let cachedAdminEmails: string[] | null = null;

/**
 * 관리자 이메일 목록 가져오기 (캐시됨)
 * 서버 전용 함수입니다.
 */
export function getAdminEmailList(): string[] {
  if (cachedAdminEmails === null) {
    cachedAdminEmails = getAdminEmails();
  }
  return cachedAdminEmails;
}

/**
 * 이메일이 관리자인지 확인 (서버 전용)
 * @param email 확인할 이메일
 * @returns 관리자 여부
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const adminEmails = getAdminEmailList();
  return adminEmails.includes(email.toLowerCase());
}

/**
 * 환경변수 캐시 초기화 (테스트용)
 */
export function clearAdminCache(): void {
  cachedAdminEmails = null;
}
