// 사용자 프로필·동의 기록 (Supabase Postgres)
// 클라이언트 컴포넌트에서 호출. RLS가 자기 자신만 UPDATE 허용.
//
// 호환성: 기존 콜러가 camelCase로 접근하므로 DB row(snake_case)는 모두 매핑.

import { createClient } from '@/utils/supabase/client';
import type { AuthUser } from '@/contexts/AuthContext';

const supabase = createClient();

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
  equippedBadgeId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  id: string;
  email: string;
  nickname: string;
  display_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  onboarding_completed: boolean;
  terms_agreed: boolean;
  privacy_agreed: boolean;
  investment_disclaimer_agreed: boolean;
  terms_version: string | null;
  privacy_version: string | null;
  agreed_at: string | null;
  equipped_badge_id: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: UserRow): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    nickname: row.nickname,
    displayName: row.display_name,
    photoURL: row.photo_url,
    isAdmin: row.is_admin,
    isSuspended: row.is_suspended,
    onboardingCompleted: row.onboarding_completed,
    termsAgreed: row.terms_agreed,
    privacyAgreed: row.privacy_agreed,
    investmentDisclaimerAgreed: row.investment_disclaimer_agreed,
    termsVersion: row.terms_version,
    privacyVersion: row.privacy_version,
    agreedAt: row.agreed_at,
    equippedBadgeId: row.equipped_badge_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── 약관 버전 상수 ──────────────────────────────────────
export const TERMS_VERSION = '2026.02.01';
export const PRIVACY_VERSION = '2026.02.01';
export const DISCLAIMER_VERSION = '2026.02.01';

// ─── 조회 ────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.error('사용자 프로필 조회 오류:', error);
    throw error;
  }
  return data ? fromRow(data as UserRow) : null;
}

/**
 * Supabase Auth는 가입 시 트리거(handle_new_auth_user)가 public.users를 자동 생성하므로
 * 별도 createUserFromAuth가 필요 없음. 하지만 호환 위해 fetch만 시도하고 없으면 에러.
 */
export async function getOrCreateUserProfile(authUser: AuthUser): Promise<UserProfile> {
  const profile = await getUserProfile(authUser.uid);
  if (profile) return profile;
  throw new Error('user row이 존재하지 않습니다 (Auth 트리거 미발동?). uid=' + authUser.uid);
}

// ─── 닉네임 중복 체크 ─────────────────────────────────────
export async function checkNicknameAvailable(
  nickname: string,
  currentUid?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('nickname', nickname);

  if (error) {
    console.error('닉네임 중복 확인 오류:', error);
    throw error;
  }

  if (!data || data.length === 0) return true;
  if (currentUid && data.length === 1 && data[0].id === currentUid) return true;
  return false;
}

// ─── 온보딩 완료 ─────────────────────────────────────────
interface OnboardingInput {
  nickname: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  investmentDisclaimerAgreed: boolean;
  marketingAgreed?: boolean;
}

export async function completeOnboarding(uid: string, data: OnboardingInput): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('users')
    .update({
      nickname: data.nickname,
      terms_agreed: data.termsAgreed,
      privacy_agreed: data.privacyAgreed,
      investment_disclaimer_agreed: data.investmentDisclaimerAgreed,
      marketing_agreed: data.marketingAgreed ?? false,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      disclaimer_version: DISCLAIMER_VERSION,
      agreed_at: nowIso,
      onboarding_completed: true,
    })
    .eq('id', uid);

  if (error) {
    console.error('온보딩 완료 오류:', error);
    throw error;
  }
}

// ─── 프로필 업데이트 ─────────────────────────────────────
type ProfileUpdate = Partial<{
  nickname: string;
  displayName: string | null;
  photoURL: string | null;
  equippedBadgeId: string | null;
}>;

export async function updateUserProfile(uid: string, updates: ProfileUpdate): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.nickname !== undefined) row.nickname = updates.nickname;
  if (updates.displayName !== undefined) row.display_name = updates.displayName;
  if (updates.photoURL !== undefined) row.photo_url = updates.photoURL;
  if (updates.equippedBadgeId !== undefined) row.equipped_badge_id = updates.equippedBadgeId;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from('users').update(row).eq('id', uid);
  if (error) {
    console.error('사용자 프로필 업데이트 오류:', error);
    throw error;
  }
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
// 사용자 row의 식별 정보를 익명화. email/nickname UNIQUE 제약 회피 위해 uid 접미사.
// auth.users 삭제는 service_role로 별도 처리 (이 함수는 클라이언트에서 호출되므로 미지원).
export async function processUserWithdrawal(
  uid: string,
  _email: string,
  _nickname: string,
  _consentRecordIds: string[] = [],
): Promise<void> {
  const shortUid = uid.slice(0, 8);
  const { error } = await supabase
    .from('users')
    .update({
      email: `withdrawn-${uid}@withdrawn.local`,
      display_name: '[탈퇴회원]',
      nickname: `withdrawn-${shortUid}`,
      photo_url: null,
      is_suspended: true,
    })
    .eq('id', uid);

  if (error) {
    console.error('회원 탈퇴 처리 오류:', error);
    throw error;
  }
}
