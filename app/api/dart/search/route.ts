import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { searchCorps } from '@/lib/dartCorpIndex';

/** 인기 검색 트래킹 (인메모리) */
const viewCounts = new Map<string, { corpCode: string; corpName: string; stockCode: string; count: number }>();

export function trackView(corpCode: string, corpName: string, stockCode: string) {
  const existing = viewCounts.get(corpCode);
  if (existing) {
    existing.count++;
  } else {
    viewCounts.set(corpCode, { corpCode, corpName, stockCode, count: 1 });
  }
}

export function getPopular(limit = 10) {
  return [...viewCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const mode = request.nextUrl.searchParams.get('mode') || 'search'; // search | popular

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`dart_search:${ip}`, 60, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    if (mode === 'popular') {
      const popular = getPopular(15);
      return NextResponse.json({ results: popular });
    }

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchCorps(query, 15);
    return NextResponse.json({
      results: results.map(r => ({
        corpCode: r.corpCode,
        corpName: r.corpName,
        stockCode: r.stockCode,
      })),
    });
  } catch (error) {
    console.error('[DART Search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}
