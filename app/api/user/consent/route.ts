// POST /api/user/consent
// 본인의 동의 기록을 user_consents에 저장. IP / User-Agent를 서버에서 추출해 위조 불가능.
// 법적 증빙(개인정보보호법 제22조)을 위해 서버 사이드에서 처리.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getServiceClient } from '@/lib/supabase-admin';
import { getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const uid = authData.user.id;

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

    // service_role로 INSERT (ip_address INET 타입 RLS와 무관하게 신뢰성 있게 기록)
    const admin = getServiceClient();
    const { data, error } = await admin
      .from('user_consents')
      .insert({
        user_id: uid,
        consent_type: finalConsentType,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
        disclaimer_version: disclaimerVersion,
        terms_agreed: termsAgreed,
        privacy_agreed: privacyAgreed,
        investment_disclaimer_agreed: investmentDisclaimerAgreed,
        marketing_agreed: marketingAgreed,
        ip_address: ipAddress && ipAddress !== 'unknown' ? ipAddress : null,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[user/consent] insert error:', error);
      return NextResponse.json({ error: '동의 기록 저장 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, consentId: data.id });
  } catch (error) {
    console.error('[user/consent] error:', error);
    return NextResponse.json({ error: '동의 기록 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
