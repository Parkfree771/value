import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * USD ↔ KRW 환율 API
 *
 * 1차: frankfurter.app (ECB 데이터, 무인증, 영업일 16시 CET 갱신)
 * 2차 폴백: Naver 금융 모바일 페이지 스크랩 (실시간)
 *
 * 인메모리 캐시 1시간. 환율 일간 변동 ±0.5% 수준이라 충분.
 */

interface RateData {
  rate: number;        // 1 USD = N KRW
  date: string;        // YYYY-MM-DD
  source: 'frankfurter' | 'naver';
  fetchedAt: string;   // ISO
}

const cache = new Map<string, { data: RateData; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

async function fetchFromFrankfurter(): Promise<RateData | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.KRW;
    if (!rate || typeof rate !== 'number') return null;
    return {
      rate,
      date: data.date,
      source: 'frankfurter',
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchFromNaver(): Promise<RateData | null> {
  try {
    // 네이버 금융 모바일 환율 페이지
    const res = await fetch('https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW&pageSize=1', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.result?.[0];
    if (!item?.closePrice) return null;
    const rate = parseFloat(String(item.closePrice).replace(/,/g, ''));
    if (!Number.isFinite(rate)) return null;
    return {
      rate,
      date: item.localTradedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      source: 'naver',
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`exchange_rate:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 캐시 적중
  const cached = cache.get('USDKRW');
  if (cached && cached.expires > Date.now()) {
    const res = NextResponse.json({ ...cached.data, cached: true });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  }

  // 1차: Frankfurter
  let data = await fetchFromFrankfurter();
  // 2차: Naver
  if (!data) data = await fetchFromNaver();

  if (!data) {
    return NextResponse.json({ error: 'Exchange rate sources unavailable' }, { status: 503 });
  }

  cache.set('USDKRW', { data, expires: Date.now() + CACHE_TTL_MS });

  const res = NextResponse.json(data);
  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res;
}
