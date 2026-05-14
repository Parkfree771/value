// GET /api/portfolio-prices
// 구루 포트폴리오 티커별 현재가 + 수익률. Supabase guru_prices 테이블.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: rows, error } = await supabase
      .from('guru_prices')
      .select('ticker, current_price, return_rate, updated_at');

    if (error) {
      console.error('[Portfolio Prices] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
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
