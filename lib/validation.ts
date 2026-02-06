/**
 * 입력 검증 유틸리티
 *
 * API에서 사용자 입력을 검증할 때 사용합니다.
 */

// 닉네임 검증 규칙
export const NICKNAME_RULES = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 20,
  // 허용: 한글, 영문, 숫자, 언더스코어, 하이픈
  PATTERN: /^[가-힣a-zA-Z0-9_-]+$/,
  // 금지어 (확장 가능)
  FORBIDDEN_WORDS: ['admin', 'administrator', '관리자', 'system', '시스템', 'test', 'root'],
};

// 댓글 검증 규칙
export const COMMENT_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 2000,
};

// 리포트 제목 검증 규칙
export const REPORT_TITLE_RULES = {
  MIN_LENGTH: 5,
  MAX_LENGTH: 100,
};

// 리포트 내용 검증 규칙
export const REPORT_CONTENT_RULES = {
  MIN_LENGTH: 50,
  MAX_LENGTH: 100000, // 100KB
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * 닉네임 검증
 */
export function validateNickname(nickname: string | null | undefined): ValidationResult {
  if (!nickname || typeof nickname !== 'string') {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }

  const trimmed = nickname.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }

  if (trimmed.length < NICKNAME_RULES.MIN_LENGTH) {
    return { valid: false, error: `닉네임은 최소 ${NICKNAME_RULES.MIN_LENGTH}자 이상이어야 합니다.` };
  }

  if (trimmed.length > NICKNAME_RULES.MAX_LENGTH) {
    return { valid: false, error: `닉네임은 최대 ${NICKNAME_RULES.MAX_LENGTH}자까지 가능합니다.` };
  }

  if (!NICKNAME_RULES.PATTERN.test(trimmed)) {
    return { valid: false, error: '닉네임은 한글, 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.' };
  }

  // 금지어 체크
  const lowerNickname = trimmed.toLowerCase();
  for (const word of NICKNAME_RULES.FORBIDDEN_WORDS) {
    if (lowerNickname.includes(word.toLowerCase())) {
      return { valid: false, error: '사용할 수 없는 닉네임입니다.' };
    }
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 댓글 내용 검증
 */
export function validateComment(content: string | null | undefined): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: '댓글 내용을 입력해주세요.' };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: '댓글 내용을 입력해주세요.' };
  }

  if (trimmed.length < COMMENT_RULES.MIN_LENGTH) {
    return { valid: false, error: '댓글이 너무 짧습니다.' };
  }

  if (trimmed.length > COMMENT_RULES.MAX_LENGTH) {
    return { valid: false, error: `댓글은 최대 ${COMMENT_RULES.MAX_LENGTH}자까지 입력할 수 있습니다.` };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 리포트 제목 검증
 */
export function validateReportTitle(title: string | null | undefined): ValidationResult {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: '제목을 입력해주세요.' };
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: '제목을 입력해주세요.' };
  }

  if (trimmed.length < REPORT_TITLE_RULES.MIN_LENGTH) {
    return { valid: false, error: `제목은 최소 ${REPORT_TITLE_RULES.MIN_LENGTH}자 이상이어야 합니다.` };
  }

  if (trimmed.length > REPORT_TITLE_RULES.MAX_LENGTH) {
    return { valid: false, error: `제목은 최대 ${REPORT_TITLE_RULES.MAX_LENGTH}자까지 가능합니다.` };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 리포트 내용 검증
 */
export function validateReportContent(content: string | null | undefined): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: '내용을 입력해주세요.' };
  }

  // HTML 태그 제거 후 길이 계산
  const textContent = content.replace(/<[^>]*>/g, '').trim();

  if (textContent.length === 0) {
    return { valid: false, error: '내용을 입력해주세요.' };
  }

  if (textContent.length < REPORT_CONTENT_RULES.MIN_LENGTH) {
    return { valid: false, error: `내용은 최소 ${REPORT_CONTENT_RULES.MIN_LENGTH}자 이상이어야 합니다.` };
  }

  if (content.length > REPORT_CONTENT_RULES.MAX_LENGTH) {
    return { valid: false, error: '내용이 너무 깁니다.' };
  }

  return { valid: true, sanitized: content };
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: '이메일을 입력해주세요.' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { valid: false, error: '이메일을 입력해주세요.' };
  }

  // 간단한 이메일 패턴 검증
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return { valid: false, error: '올바른 이메일 형식이 아닙니다.' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 티커 검증
 */
export function validateTicker(ticker: string | null | undefined): ValidationResult {
  if (!ticker || typeof ticker !== 'string') {
    return { valid: false, error: '티커(종목코드)를 입력해주세요.' };
  }

  const trimmed = ticker.trim().toUpperCase();

  if (trimmed.length === 0) {
    return { valid: false, error: '티커(종목코드)를 입력해주세요.' };
  }

  // 티커: 영문, 숫자만 허용 (한국 주식 코드 포함)
  const tickerPattern = /^[A-Z0-9.]+$/;
  if (!tickerPattern.test(trimmed)) {
    return { valid: false, error: '올바른 티커 형식이 아닙니다.' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '티커가 너무 깁니다.' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 가격 검증
 */
export function validatePrice(price: number | string | null | undefined): ValidationResult {
  if (price === null || price === undefined) {
    return { valid: false, error: '가격을 입력해주세요.' };
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { valid: false, error: '올바른 가격 형식이 아닙니다.' };
  }

  if (numPrice < 0) {
    return { valid: false, error: '가격은 0 이상이어야 합니다.' };
  }

  if (numPrice > 1000000000000) { // 1조
    return { valid: false, error: '가격이 너무 큽니다.' };
  }

  return { valid: true, sanitized: numPrice.toString() };
}

/**
 * 투자 의견 검증
 */
export function validateOpinion(opinion: string | null | undefined): ValidationResult {
  const validOpinions = ['buy', 'sell', 'hold'];

  if (!opinion || typeof opinion !== 'string') {
    return { valid: false, error: '투자 의견을 선택해주세요.' };
  }

  const trimmed = opinion.trim().toLowerCase();

  if (!validOpinions.includes(trimmed)) {
    return { valid: false, error: '올바른 투자 의견이 아닙니다. (buy, sell, hold)' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 포지션 타입 검증
 */
export function validatePositionType(type: string | null | undefined): ValidationResult {
  const validTypes = ['long', 'short'];

  if (!type || typeof type !== 'string') {
    return { valid: true, sanitized: 'long' }; // 기본값
  }

  const trimmed = type.trim().toLowerCase();

  if (!validTypes.includes(trimmed)) {
    return { valid: true, sanitized: 'long' }; // 잘못된 값이면 기본값
  }

  return { valid: true, sanitized: trimmed };
}
