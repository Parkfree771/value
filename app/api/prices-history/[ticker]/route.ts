/**
 * 종목별 일별 종가 히스토리 조회
 *
 * GET /api/prices-history/AAPL
 * GET /api/prices-history/AAPL?from=2025-12-01
 *
 * - Firebase Storage의 prices-history/{TICKER}.json 반환
 * - from 쿼리가 있으면 해당 날짜 이후로 슬라이스
 * - 파일 없으면 404
 *
 * Cache-Control: 클라이언트/CDN에서 5분 캐시 + 1시간 stale-while-revalidate
 */

import { NextRequest, NextResponse } from 'next/server';
import '@/lib/firebase-admin'; // Admin SDK 초기화
import { readHistory } from '@/lib/priceHistory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const tickerUpper = ticker.toUpperCase();

  const from = request.nextUrl.searchParams.get('from'); // YYYY-MM-DD

  try {
    const file = await readHistory(tickerUpper);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let history = file.history;
    if (from) {
      history = history.filter((p) => p.d >= from);
    }

    return NextResponse.json(
      {
        ticker: file.ticker,
        exchange: file.exchange,
        lastUpdated: file.lastUpdated,
        history,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    console.error('[prices-history] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
