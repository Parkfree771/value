import { type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

// Supabase SSR 표준 패턴 — 매 요청마다 세션 쿠키를 갱신해
// 액세스 토큰 만료 시 자동 refresh가 동작하게 한다.
// createServerClient와 getUser() 사이엔 어떤 로직도 넣지 말 것.
export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)',
  ],
};
