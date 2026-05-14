import { type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // 세션 refresh 필수 — getUser() 호출로 만료된 access token이 갱신되고 새 쿠키가 응답에 실림.
  // Server Component에서 직접 갱신 못 하므로 middleware가 유일한 갱신 지점.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 정적 자원·Next 내부·이미지 최적화는 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
