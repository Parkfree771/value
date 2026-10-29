// POST /api/me/onboarding
// 본인 온보딩 완료 처리 — 닉네임 + 약관 동의 플래그/버전을 users에 기록.
// { nickname, termsAgreed, privacyAgreed, investmentDisclaimerAgreed, marketingAgreed? }
//
// 동의 이력(user_consents)은 별도로 /api/user/consent가 저장 (온보딩 페이지가 먼저 호출).
// 약관 버전은 클라이언트 값이 아닌 서버 상수로 기록.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { validateNickname } from '@/lib/validation';
import { TERMS_VERSION, PRIVACY_VERSION, DISCLAIMER_VERSION } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const uid = authUser.id;

    const body = await request.json().catch(() => null);
    const { nickname, termsAgreed, privacyAgreed, investmentDisclaimerAgreed, marketingAgreed } = body ?? {};

    const v = validateNickname(nickname);
    if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
    const validatedNickname = v.sanitized!;

    // 필수 동의 3종은 반드시 true (온보딩 페이지도 동일하게 검증)
    if (termsAgreed !== true || privacyAgreed !== true || investmentDisclaimerAgreed !== true) {
      return NextResponse.json({ error: '필수 약관에 동의해주세요.' }, { status: 400 });
    }

    const dup = await sql`select 1 from users where nickname = ${validatedNickname} and id <> ${uid} limit 1`;
    if (dup.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
    }

    // 본인 row만 갱신 (id = 세션 uid 고정)
    try {
      await sql`
        update users set
          nickname = ${validatedNickname},
          terms_agreed = true,
          privacy_agreed = true,
          investment_disclaimer_agreed = true,
          marketing_agreed = ${marketingAgreed === true},
          terms_version = ${TERMS_VERSION},
          privacy_version = ${PRIVACY_VERSION},
          disclaimer_version = ${DISCLAIMER_VERSION},
          agreed_at = now(),
          onboarding_completed = true
        where id = ${uid}
      `;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me/onboarding POST] error:', error);
    return NextResponse.json({ error: '온보딩 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
