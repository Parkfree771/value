// GET /api/portfolio-prices
// 구루 포트폴리오 티커별 현재가 + 수익률. Postgres guru_prices 테이블.

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface GuruPriceRow {
  ticker: string;
  current_price: number;
  return_rate: number;
  updated_at: string | null;
}

export async function GET() {
  try {
    let rows: GuruPriceRow[];
    try {
      rows = (await sql`
        select ticker, current_price, return_rate, updated_at from guru_prices
      `) as GuruPriceRow[];
    } catch (error) {
      console.error('[Portfolio Prices] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Price data not available', message: 'Cron job이 아직 실행되지 않았습니다.' },
        { status: 503 },
      );
    }

    const prices: Record<string, { currentPrice: number; returnRate: number }> = {};
    let latestUpdated = '';
    for (const r of rows) {
      prices[r.ticker] = {
        currentPrice: Number(r.current_price),
        returnRate: Number(r.return_rate),
      };
      if (r.updated_at && (!latestUpdated || r.updated_at > latestUpdated)) {
        latestUpdated = r.updated_at;
      }
    }

    const response = NextResponse.json({
      success: true,
      lastUpdated: latestUpdated || new Date().toISOString(),
      totalTickers: rows.length,
      prices,
    });

    response.headers.set('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
    return response;
  } catch (error) {
    console.error('[Portfolio Prices] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
