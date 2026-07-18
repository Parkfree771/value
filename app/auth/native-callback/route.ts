// 네이티브 앱 로그인 후 착지 지점.
// 네이티브 구글 로그인(signInWithIdToken)은 클라이언트에서 세션 쿠키를 이미 만들었으므로
// code 교환은 필요 없고, /auth/callback과 동일하게 온보딩 체크만 수행한다.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  // open redirect 방지: 내부 경로만 허용
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/?auth_error=native_session_missing`);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
