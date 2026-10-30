// 사용자 프로필·동의 기록 — 클라이언트 컴포넌트에서 호출.
// DB 직접 접근 없이 /api/me/*, /api/users/nickname-available 서버 라우트로 위임
// (서버가 세션 uid로 본인 row만 조회/수정, 수정 가능 컬럼은 화이트리스트).
//
// 호환성: 기존 콜러 시그니처(uid 인자 등)는 유지 — uid는 서버 세션으로 대체되어 무시됨.

// ─── 타입 ────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  onboardingCompleted: boolean;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  investmentDisclaimerAgreed: boolean;
  termsVersion: string | null;
  privacyVersion: string | null;
  agreedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── 약관 버전 상수 ──────────────────────────────────────
// /api/me/onboarding 서버 라우트도 이 상수를 import해서 기록 (클라이언트 값 불신)
export const TERMS_VERSION = '2026.02.01';
export const PRIVACY_VERSION = '2026.02.01';
export const DISCLAIMER_VERSION = '2026.02.01';

// 서버 라우트 에러 응답({ error })을 Error로 변환
async function throwResponseError(res: Response, label: string): Promise<never> {
  const body = await res.json().catch(() => null);
  console.error(`${label}:`, body ?? res.status);
  throw new Error(body?.error ?? label);
}

// ─── 조회 ────────────────────────────────────────────────
// 본인 프로필만 조회 가능 (email·동의 정보 포함이라 타인 조회 API는 두지 않음).
// 비로그인이거나 uid가 세션 사용자와 다르면 null.
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const res = await fetch('/api/me/profile', { credentials: 'include', cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) await throwResponseError(res, '사용자 프로필 조회 오류');

  const data = await res.json();
  const profile = (data.profile ?? null) as UserProfile | null;
  if (!profile || profile.uid !== uid) return null;
  return profile;
}

// ─── 닉네임 중복 체크 ─────────────────────────────────────
// 본인이 이미 쓰는 닉네임은 서버가 사용 가능으로 처리 (currentUid는 세션 uid로 대체).
export async function checkNicknameAvailable(
  nickname: string,
  _currentUid?: string,
): Promise<boolean> {
  const res = await fetch(
    `/api/users/nickname-available?nickname=${encodeURIComponent(nickname)}`,
    { credentials: 'include', cache: 'no-store' },
  );
  if (!res.ok) await throwResponseError(res, '닉네임 중복 확인 오류');
  const data = await res.json();
  return data.available === true;
}

// ─── 온보딩 완료 ─────────────────────────────────────────
interface OnboardingInput {
  nickname: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  investmentDisclaimerAgreed: boolean;
  marketingAgreed?: boolean;
}

export async function completeOnboarding(_uid: string, data: OnboardingInput): Promise<void> {
  const res = await fetch('/api/me/onboarding', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: data.nickname,
      termsAgreed: data.termsAgreed,
      privacyAgreed: data.privacyAgreed,
      investmentDisclaimerAgreed: data.investmentDisclaimerAgreed,
      marketingAgreed: data.marketingAgreed ?? false,
    }),
  });
  if (!res.ok) await throwResponseError(res, '온보딩 완료 오류');
}

// ─── 프로필 업데이트 ─────────────────────────────────────
type ProfileUpdate = Partial<{
  nickname: string;
  displayName: string | null;
  photoURL: string | null;
}>;

export async function updateUserProfile(_uid: string, updates: ProfileUpdate): Promise<void> {
  const payload: ProfileUpdate = {};
  if (updates.nickname !== undefined) payload.nickname = updates.nickname;
  if (updates.displayName !== undefined) payload.displayName = updates.displayName;
  if (updates.photoURL !== undefined) payload.photoURL = updates.photoURL;

  if (Object.keys(payload).length === 0) return;

  const res = await fetch('/api/me/profile', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwResponseError(res, '사용자 프로필 업데이트 오류');
}

// ─── 동의 기록 ───────────────────────────────────────────
interface ConsentAgreements {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  investmentDisclaimerAgreed: boolean;
  marketingAgreed: boolean;
}

/**
 * 동의 기록을 서버 라우트로 전송. 서버에서 IP·User-Agent를 추출해 user_consents에 저장한다
 * (클라이언트가 위조할 수 없도록 법적 증빙 신뢰성 확보).
 */
export async function saveConsentRecord(
  _uid: string,
  _email: string, // 호환 위해 인자 유지
  agreements: ConsentAgreements,
  consentType: 'onboarding' | 'terms_update' | 'marketing_change' = 'onboarding',
): Promise<string> {
  const res = await fetch('/api/user/consent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consentType,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      disclaimerVersion: DISCLAIMER_VERSION,
      termsAgreed: agreements.termsAgreed,
      privacyAgreed: agreements.privacyAgreed,
      investmentDisclaimerAgreed: agreements.investmentDisclaimerAgreed,
      marketingAgreed: agreements.marketingAgreed,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    console.error('동의 기록 저장 오류:', body);
    throw new Error(body?.error ?? '동의 기록 저장 실패');
  }
  const data = await res.json();
  return data.consentId as string;
}

// ─── 회원 탈퇴 ───────────────────────────────────────────
// 서버가 본인 users row의 식별 정보를 익명화 + 정지 처리 (/api/me/withdraw 참고).
// Neon Auth 계정 삭제는 하지 않음 — 호출 후 클라이언트가 signOut.
export async function processUserWithdrawal(
  _uid: string,
  _email: string,
  _nickname: string,
  _consentRecordIds: string[] = [],
): Promise<void> {
  const res = await fetch('/api/me/withdraw', { method: 'POST', credentials: 'include' });
  if (!res.ok) await throwResponseError(res, '회원 탈퇴 처리 오류');
}
