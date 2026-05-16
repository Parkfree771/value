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
    // 정적 자원·Next 내부·이미지 최적화는 제외.
    // 또한 인증이 필요 없는 public API 라우트도 제외해서 매 요청 supabase.auth.getUser() 비용 절감:
    //   - og: OG 이미지 렌더링 (edge)
    //   - revalidate, revalidate-briefing: 외부 cron webhook (secret 헤더로 자체 인증)
    //   - feed/update-prices: 가격 cron (secret 헤더)
    //   - portfolio-prices, ticker, exchange-rate, prices-history: 공개 데이터
    //   - stocks/search, stocks/profile, stocks/[symbol]: 공개 검색
    //   - kis/*, sec/*, dart/*, fred, ecos, trends: 외부 데이터 프록시
    //   - og 정적 이미지(/icon.png) 등
    '/((?!_next/static|_next/image|favicon.ico|icon.png|api/og|api/revalidate|api/revalidate-briefing|api/feed/update-prices|api/portfolio-prices|api/ticker|api/exchange-rate|api/prices-history|api/stocks|api/kis|api/sec|api/dart|api/fred|api/ecos|api/trends|api/stock-price|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
