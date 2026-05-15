import { type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // 세션 refresh 필수 — getUser() 호출로 만료된 access token이 갱신되고 새 쿠키가 응답에 실림.
  // Server Component에서 직접 갱신 못 하므로 proxy가 유일한 갱신 지점.
  // stale refresh token(다른 환경의 쿠키, JWT 시크릿 회전 후 등)은 signOut으로 쿠키 정리.
  const { error } = await supabase.auth.getUser();
  if (error?.code === 'refresh_token_not_found' || error?.code === 'refresh_token_already_used') {
    await supabase.auth.signOut();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 정적 자원·Next 내부·이미지 최적화는 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
