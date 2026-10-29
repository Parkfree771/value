// OAuth 로그인 후 착지 지점 (웹 + 네이티브 공통).
// 세션 쿠키 교환은 proxy(Neon Auth 미들웨어)가 이 요청 직전에 끝내 둠.
// 여기서는 public.users 프로필 보장 → 온보딩 미완료면 /onboarding, 아니면 next로.

import { NextResponse } from 'next/server';
import { ensureProfileForSession } from '@/lib/auth/session';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  // open redirect 방지: 내부 경로(/foo)만 허용. //evil.com, https://... 같은 외부 URL은 '/'로 폴백.
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  try {
    const profile = await ensureProfileForSession();
    if (!profile) {
      return NextResponse.redirect(`${origin}/?auth_error=session_missing`);
    }
    if (!profile.onboardingCompleted) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  } catch (err) {
    console.error('[auth/callback] 프로필 처리 실패:', err);
    return NextResponse.redirect(`${origin}/?auth_error=profile_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
