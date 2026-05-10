import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { searchUsStocks } from '@/lib/secFinancials/searchIndex';

/** 인기 검색 트래킹 (인메모리) */
const viewCounts = new Map<
  string,
  { ticker: string; nameEn: string; nameKr?: string; exchange: 'NAS' | 'NYS'; count: number }
>();

export function trackUsView(
  ticker: string,
  nameEn: string,
  exchange: 'NAS' | 'NYS',
  nameKr?: string,
) {
  const existing = viewCounts.get(ticker);
  if (existing) {
    existing.count++;
  } else {
    viewCounts.set(ticker, { ticker, nameEn, nameKr, exchange, count: 1 });
  }
}

export function getUsPopular(limit = 10) {
  return [...viewCounts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const mode = request.nextUrl.searchParams.get('mode') || 'search';

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`sec_search:${ip}`, 60, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    if (mode === 'popular') {
      return NextResponse.json({ results: getUsPopular(15) });
    }

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchUsStocks(query, 15);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[SEC Search] Error:', error);
    return NextResponse.json({ error: 'Search failed', results: [] }, { status: 500 });
  }
}
