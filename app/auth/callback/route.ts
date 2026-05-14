// OAuth 콜백 — Google 로그인 후 ?code=... 쿼리로 돌아옴.
// code → 세션 교환 → 온보딩 미완료면 /onboarding, 아니면 next로.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('[auth/callback] code exchange 실패:', exchangeError.message);
    return NextResponse.redirect(`${origin}/?auth_error=exchange_failed`);
  }

  // 온보딩 완료 여부 확인 — auth.users 트리거가 public.users를 미리 만들어 둠
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
