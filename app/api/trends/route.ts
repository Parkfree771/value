import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// google-trends-api는 CommonJS 모듈
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require('google-trends-api');

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

// 서버 캐시 (6시간)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** 네이버 데이터랩 검색어 트렌드 */
async function fetchNaverTrends(keyword: string, startDate: string, endDate: string) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return [];

  const body = {
    startDate,
    endDate,
    timeUnit: 'week',
    keywordGroups: [
      { groupName: keyword, keywords: [keyword] },
    ],
  };

  try {
    const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error('[Naver DataLab] Error:', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const results = data.results?.[0]?.data || [];

    return results.map((p: { period: string; ratio: number }) => ({
      date: p.period,
      timestamp: new Date(p.period).getTime(),
      value: Math.round(p.ratio),
    }));
  } catch (e) {
    console.error('[Naver DataLab] Error:', e);
    return [];
  }
}

/** Google Trends 가져오기 */
async function fetchGoogleTrends(keyword: string, startTime: Date, endTime: Date, geo: string) {
  try {
    const results = await googleTrends.interestOverTime({
      keyword,
      startTime,
      endTime,
      geo,
    });

    const parsed = JSON.parse(results);
    const timeline = parsed.default?.timelineData || [];

    return timeline.map((point: { formattedTime: string; value: number[]; time: string }) => ({
      date: point.formattedTime,
      timestamp: Number(point.time) * 1000,
      value: point.value[0] ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword'); // 한국어 기업명
  const keywordEn = request.nextUrl.searchParams.get('keyword_en'); // 영문 키워드 (구글용)
  const period = request.nextUrl.searchParams.get('period') || '12m';

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`trends:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!keyword || keyword.trim().length === 0) {
    return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
  }

  const cacheKey = `trends_${keyword}_${keywordEn}_${period}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // 기간 계산
  const now = new Date();
  let startTime: Date;
  switch (period) {
    case '1m': startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
    case '3m': startTime = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
    case '6m': startTime = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
    case '5y': startTime = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()); break;
    default: startTime = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
  }

  // 네이버용 날짜 포맷
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const naverStart = fmtDate(startTime);
  const naverEnd = fmtDate(now);

  // 구글 검색 키워드: 영문 있으면 영문, 없으면 한국어
  const googleKeyword = keywordEn || keyword;

  try {
    // 병렬 요청: 구글(글로벌) + 구글(한국어, 한국) + 네이버
    const [googleGlobal, googleKorea, naver] = await Promise.allSettled([
      fetchGoogleTrends(googleKeyword, startTime, now, ''),
      fetchGoogleTrends(keyword, startTime, now, 'KR'),
      fetchNaverTrends(keyword, naverStart, naverEnd),
    ]);

    const result = {
      keyword,
      keywordEn: googleKeyword,
      period,
      google: {
        global: googleGlobal.status === 'fulfilled' ? googleGlobal.value : [],
        korea: googleKorea.status === 'fulfilled' ? googleKorea.value : [],
      },
      naver: naver.status === 'fulfilled' ? naver.value : [],
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Trends API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends data' },
      { status: 500 }
    );
  }
}
