import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getKoreanCompanyProfile } from '@/lib/kis';

// 서버 메모리 캐시 (5분 - 주가는 실시간성 필요)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get('stock_code');

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`kis_profile:${ip}`, 20, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!stockCode || !/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ error: 'Invalid stock_code' }, { status: 400 });
  }

  // 캐시 확인
  const cacheKey = `kis_profile_${stockCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const profile = await getKoreanCompanyProfile(stockCode);

    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to fetch stock profile' },
        { status: 502 }
      );
    }

    const result = {
      stockCode,
      currentPrice: profile.currentPrice,
      per: profile.per ?? null,
      pbr: profile.pbr ?? null,
      eps: profile.eps ?? null,
      high52w: profile.high52w ?? null,
      low52w: profile.low52w ?? null,
      volume: profile.volume ?? 0,
      marketCap: profile.marketCap ?? null,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    return res;
  } catch (error) {
    console.error('[KIS Profile API] Error:', error);

    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock profile' },
      { status: 500 }
    );
  }
}
