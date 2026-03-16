import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const DART_API_KEY = process.env.DART_API_KEY;
const DART_BASE = 'https://opendart.fss.or.kr/api';

// 서버 메모리 캐시 (12시간)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const corpCode = request.nextUrl.searchParams.get('corp_code');

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`dart_company:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!corpCode || !/^\d{8}$/.test(corpCode)) {
    return NextResponse.json({ error: 'Invalid corp_code' }, { status: 400 });
  }

  if (!DART_API_KEY) {
    return NextResponse.json({ error: 'DART API key not configured' }, { status: 500 });
  }

  const cacheKey = `dart_company_${corpCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const res = NextResponse.json(cached.data);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  }

  try {
    const url = `${DART_BASE}/company.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`DART API error: ${response.status}`);

    const data = await response.json();
    if (data.status !== '000') throw new Error(`DART API: ${data.message || data.status}`);

    const result = {
      corp_code: data.corp_code,
      corp_name: data.corp_name,
      corp_name_eng: data.corp_name_eng,
      stock_code: data.stock_code,
      ceo_nm: data.ceo_nm,
      corp_cls: data.corp_cls,
      adres: data.adres,
      hm_url: data.hm_url,
      ir_url: data.ir_url,
      induty_code: data.induty_code,
      est_dt: data.est_dt,
      acc_mt: data.acc_mt,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  } catch (error) {
    console.error('[DART Company API] Error:', error);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    );
  }
}
