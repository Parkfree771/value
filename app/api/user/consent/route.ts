// POST /api/user/consent
// 본인의 동의 기록을 user_consents에 저장. IP / User-Agent를 서버에서 추출해 위조 불가능.
// 법적 증빙(개인정보보호법 제22조)을 위해 서버 사이드에서 처리.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const uid = authUser.id;

    const body = await request.json();
    const {
      consentType,
      termsVersion,
      privacyVersion,
      disclaimerVersion,
      termsAgreed,
      privacyAgreed,
      investmentDisclaimerAgreed,
      marketingAgreed,
    } = body ?? {};

    if (
      typeof termsAgreed !== 'boolean'
      || typeof privacyAgreed !== 'boolean'
      || typeof investmentDisclaimerAgreed !== 'boolean'
      || typeof marketingAgreed !== 'boolean'
    ) {
      return NextResponse.json({ error: '동의 항목이 누락되었습니다.' }, { status: 400 });
    }
    if (
      typeof termsVersion !== 'string'
      || typeof privacyVersion !== 'string'
      || typeof disclaimerVersion !== 'string'
    ) {
      return NextResponse.json({ error: '약관 버전이 누락되었습니다.' }, { status: 400 });
    }

    const validConsentTypes = ['onboarding', 'terms_update', 'marketing_change'];
    const finalConsentType = validConsentTypes.includes(consentType) ? consentType : 'onboarding';

    // 서버에서 IP와 User-Agent 추출 (클라이언트 위조 방지)
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') ?? null;

    // user_id는 세션 uid로 고정 — 본인 명의로만 기록 (옛 RLS user_consents_insert_own과 동일 보장)
    let consentId: string;
    try {
      const rows = await sql`
        insert into user_consents (
          user_id, consent_type, terms_version, privacy_version, disclaimer_version,
          terms_agreed, privacy_agreed, investment_disclaimer_agreed, marketing_agreed,
          ip_address, user_agent
        ) values (
          ${uid}, ${finalConsentType}, ${termsVersion}, ${privacyVersion}, ${disclaimerVersion},
          ${termsAgreed}, ${privacyAgreed}, ${investmentDisclaimerAgreed}, ${marketingAgreed},
          ${ipAddress && ipAddress !== 'unknown' ? ipAddress : null}::inet, ${userAgent}
        )
        returning id
      `;
      consentId = rows[0].id as string;
    } catch (error) {
      console.error('[user/consent] insert error:', error);
      return NextResponse.json({ error: '동의 기록 저장 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, consentId });
  } catch (error) {
    console.error('[user/consent] error:', error);
    return NextResponse.json({ error: '동의 기록 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
