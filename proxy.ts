import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';

// Neon Auth 미들웨어가 하는 일:
//   1. OAuth 복귀 URL(?neon_auth_session_verifier=…)에서 verifier → 세션 쿠키 교환
//   2. 세션 쿠키 갱신
//   3. 비로그인 요청을 loginUrl로 리다이렉트  ← 이 사이트는 대부분 공개 페이지라 3번은 무력화.
// loginUrl을 존재하지 않는 sentinel 경로로 두고, 그쪽으로 가는 리다이렉트만 통과(next)로 바꾼다.
const LOGIN_SENTINEL = '/__auth_required__';
const neonMiddleware = auth.middleware({ loginUrl: LOGIN_SENTINEL });

export async function proxy(request: NextRequest) {
  const response = await neonMiddleware(request);
  const location = response.headers.get('location');
  if (location && new URL(location, request.url).pathname === LOGIN_SENTINEL) {
    return NextResponse.next();
  }
  return response;
}

export const config = {
  matcher: [
    // 정적 자원·Next 내부·이미지 최적화는 제외.
    // 또한 인증이 필요 없는 public API 라우트도 제외해서 매 요청 세션 조회 비용 절감:
    //   - og: OG 이미지 렌더링 (edge)
    //   - revalidate, revalidate-briefing: 외부 cron webhook (secret 헤더로 자체 인증)
    //   - feed/update-prices: 가격 cron (secret 헤더)
    //   - portfolio-prices, ticker, exchange-rate, prices-history: 공개 데이터
    //   - stocks/search, stocks/profile, stocks/[symbol]: 공개 검색
    //   - kis/*, sec/*, dart/*, fred, ecos, trends: 외부 데이터 프록시
    //   - auth/*: Neon Auth 프록시 라우트가 직접 쿠키 처리
    //   - og 정적 이미지(/icon.png) 등
    '/((?!_next/static|_next/image|favicon.ico|icon.png|api/auth|api/og|api/revalidate|api/revalidate-briefing|api/feed/update-prices|api/portfolio-prices|api/ticker|api/exchange-rate|api/prices-history|api/stocks|api/kis|api/sec|api/dart|api/fred|api/ecos|api/trends|api/stock-price|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
