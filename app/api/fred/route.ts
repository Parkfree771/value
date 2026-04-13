import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

const VALID_SERIES = ['VIXCLS', 'T10Y2Y', 'UNRATE', 'PCEPI', 'CPIAUCSL', 'M2SL', 'BAA10Y', 'AAA10Y'];

// 서버 메모리 캐시 (1시간 TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const seriesId = request.nextUrl.searchParams.get('series_id');
  const limit = request.nextUrl.searchParams.get('limit') || '365';

  // 레이트 리밋: IP당 분당 30회
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`fred:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!seriesId || !VALID_SERIES.includes(seriesId)) {
    return NextResponse.json(
      { error: 'Invalid series_id', valid: VALID_SERIES },
      { status: 400 }
    );
  }

  if (!FRED_API_KEY) {
    return NextResponse.json(
      { error: 'FRED API key not configured' },
      { status: 500 }
    );
  }

  // 캐시 확인
  const cacheKey = `${seriesId}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const res = NextResponse.json(cached.data);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  }

  try {
    let url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc`;

    // MAX가 아닌 경우에만 시작일 지정
    if (limit !== 'max') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(limit));
      url += `&observation_start=${startDate.toISOString().split('T')[0]}`;
    }

    // 시리즈 메타(발표일 last_updated) 병렬 조회
    const seriesInfoUrl = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`;

    const [response, seriesInfoRes] = await Promise.all([
      fetch(url),
      fetch(seriesInfoUrl),
    ]);

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();
    const seriesInfo = seriesInfoRes.ok ? await seriesInfoRes.json() : null;
    const releasedAt: string | null = seriesInfo?.seriess?.[0]?.last_updated || null;

    // "." 값(결측치) 필터링
    const observations = (data.observations || [])
      .filter((obs: { value: string }) => obs.value !== '.')
      .map((obs: { date: string; value: string }) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }));

    const result = {
      series_id: seriesId,
      observations,
      count: observations.length,
      releasedAt,
      lastUpdated: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  } catch (error) {
    console.error('[FRED API] Error:', error);

    // 에러 시 stale 캐시 반환
    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json(
      { error: 'Failed to fetch FRED data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
