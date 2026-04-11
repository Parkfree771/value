/**
 * /api/ticker
 * ─────────────────────────────────────────────
 * 상단 마켓 티커 바 데이터 제공 엔드포인트.
 * 로직은 lib/ticker.ts 로 분리되어 있어 MarketTickerBar Server Component 는
 * 이 route 를 거치지 않고 직접 함수를 호출한다. 이 엔드포인트는 외부/클라이언트
 * 리페치 용도로만 존재.
 *
 * 캐시: Next.js ISR 15분
 */

import { NextResponse } from 'next/server';
import { getTickerData } from '@/lib/ticker';

export const revalidate = 900;

export async function GET() {
  const payload = await getTickerData();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  });
}
