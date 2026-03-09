import { NextRequest, NextResponse } from 'next/server';

const ECOS_API_KEY = process.env.ECOS_API_KEY;
const ECOS_BASE_URL = 'https://ecos.bok.or.kr/api/StatisticSearch';

// 허용된 통계코드
const VALID_STATS: Record<string, { itemCode1: string; itemCode2?: string }> = {
  '901Y009': { itemCode1: '0' },                 // 소비자물가지수 (CPI) 총지수
  '161Y005': { itemCode1: 'BBHS00' },            // M2 통화량 (평잔, 계절조정)
  '404Y015': { itemCode1: '*AA' },               // 생산자물가지수 (총지수)
  '301Y017': { itemCode1: 'SA000' },             // 경상수지
  '901Y062': { itemCode1: 'P63A' },              // 주택매매가격지수 (총지수)
  '511Y002': { itemCode1: 'FMAB', itemCode2: '99988' }, // 소비자심리지수 (전체)
};

// 서버 메모리 캐시 (1시간 TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const statCode = request.nextUrl.searchParams.get('stat_code');
  const cycle = request.nextUrl.searchParams.get('cycle') || 'M'; // M: 월간, D: 일간, Q: 분기
  const limit = request.nextUrl.searchParams.get('limit') || '365';

  if (!statCode || !VALID_STATS[statCode]) {
    return NextResponse.json(
      { error: 'Invalid stat_code', valid: Object.keys(VALID_STATS) },
      { status: 400 }
    );
  }

  if (!ECOS_API_KEY) {
    return NextResponse.json(
      { error: 'ECOS API key not configured' },
      { status: 500 }
    );
  }

  // 캐시 확인
  const cacheKey = `ecos_${statCode}_${cycle}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const res = NextResponse.json(cached.data);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  }

  try {
    // 날짜 포맷 헬퍼 (cycle에 맞게)
    const formatDate = (d: Date, c: string): string => {
      if (c === 'D') return d.toISOString().split('T')[0].replace(/-/g, '');
      if (c === 'Q') {
        const q = Math.ceil((d.getMonth() + 1) / 3);
        return `${d.getFullYear()}Q${q}`;
      }
      if (c === 'A') return `${d.getFullYear()}`;
      // M (월간)
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // 시작일 계산
    let startDate: string;
    if (limit === 'max') {
      // cycle에 맞는 포맷으로 최대 과거 날짜 설정
      if (cycle === 'D') startDate = '19900101';
      else if (cycle === 'Q') startDate = '1960Q1';
      else if (cycle === 'A') startDate = '1960';
      else startDate = '196001'; // 월간
    } else {
      const start = new Date();
      start.setDate(start.getDate() - parseInt(limit));
      startDate = formatDate(start, cycle);
    }

    const now = new Date();
    const endDate = formatDate(now, cycle);

    const statInfo = VALID_STATS[statCode];
    // URL: /StatisticSearch/{apiKey}/json/kr/{start}/{end}/{statCode}/{cycle}/{startDate}/{endDate}/{itemCode1}/{itemCode2}
    let url = `${ECOS_BASE_URL}/${ECOS_API_KEY}/json/kr/1/1000/${statCode}/${cycle}/${startDate}/${endDate}/${statInfo.itemCode1}`;
    if (statInfo.itemCode2) {
      url += `/${statInfo.itemCode2}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ECOS API error: ${response.status}`);
    }

    const data = await response.json();

    // ECOS 응답 구조: { StatisticSearch: { row: [...] } }
    const rows = data?.StatisticSearch?.row || [];

    const observations = rows
      .filter((row: { DATA_VALUE: string }) => row.DATA_VALUE && row.DATA_VALUE !== '-')
      .map((row: { TIME: string; DATA_VALUE: string }) => {
        // TIME 형식을 YYYY-MM-DD로 변환
        const time = row.TIME;
        let date: string;
        if (time.length === 8) {
          // YYYYMMDD → YYYY-MM-DD
          date = `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}`;
        } else if (time.length === 6) {
          // YYYYMM → YYYY-MM-01
          date = `${time.slice(0, 4)}-${time.slice(4, 6)}-01`;
        } else if (time.includes('Q')) {
          // YYYYQ1 → YYYY-01-01, YYYYQ2 → YYYY-04-01, etc.
          const year = time.slice(0, 4);
          const quarter = parseInt(time.slice(5));
          const month = String((quarter - 1) * 3 + 1).padStart(2, '0');
          date = `${year}-${month}-01`;
        } else {
          // YYYY → YYYY-01-01
          date = `${time}-01-01`;
        }

        return {
          date,
          value: parseFloat(row.DATA_VALUE.replace(/,/g, '')),
        };
      })
      .filter((obs: { value: number }) => !isNaN(obs.value))
      .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));

    const result = {
      stat_code: statCode,
      observations,
      count: observations.length,
      lastUpdated: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  } catch (error) {
    console.error('[ECOS API] Error:', error);

    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json(
      { error: 'Failed to fetch ECOS data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
