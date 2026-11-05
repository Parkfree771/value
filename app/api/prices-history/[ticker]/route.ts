/**
 * 종목별 일별 종가 히스토리 조회 (수익률 차트)
 *
 * GET /api/prices-history/AAPL
 * GET /api/prices-history/AAPL?from=2025-12-01
 *
 * - from 은 SQL 안에서 거른다 (예전엔 종목 전체를 읽고 서버에서 잘랐다)
 * - 데이터 캐시: 종목·from 별 · 태그 prices — 장 마감 수집 완료 때만 비운다 (lib/cache.ts)
 * - CDN 은 5분만 들고 있다 → 수집 완료 후 길어야 5분 안에 새 종가. CDN 미스여도 데이터 캐시라 DB 는 안 읽는다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db';
import { SAFETY_TTL, TAG } from '@/lib/cache';

const readHistory = unstable_cache(
  async (ticker: string, from: string | null) => {
    const rows = from
      ? await sql`select exchange, date, close from price_history where ticker = ${ticker} and date >= ${from}::date order by date asc`
      : await sql`select exchange, date, close from price_history where ticker = ${ticker} order by date asc`;
    if (rows.length === 0) return null;
    return {
      ticker,
      exchange: rows[0].exchange as string,
      history: rows.map((r) => ({ d: r.date as string, c: Number(r.close) })),
    };
  },
  ['price-history-v2'],
  { tags: [TAG.prices], revalidate: SAFETY_TTL },
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const from = request.nextUrl.searchParams.get('from'); // YYYY-MM-DD
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: 'from 은 YYYY-MM-DD' }, { status: 400 });
  }

  try {
    const file = await readHistory(ticker.toUpperCase(), from);
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(
      { ...file, lastUpdated: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('[prices-history] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
