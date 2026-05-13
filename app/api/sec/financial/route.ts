import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getCikByTicker } from '@/lib/secFinancials/cikMap';
import { fetchCompanyFacts } from '@/lib/secFinancials/companyFacts';
import { extractMetrics } from '@/lib/secFinancials/extractMetrics';
import type { FinancialMetrics, SplitEvent } from '@/app/analysis/types';

/**
 * 인메모리 결과 캐시
 *
 * 키 = `${ticker}:${mode}` (모든 연도 포함된 풀 시계열을 한 번 파싱).
 * years 파라미터는 응답 시 슬라이스만 함 → 5Y↔10Y 토글 시 SEC 재호출 없음.
 *
 * TTL 6h. 분기 보고서 업로드 사이클 안전선.
 */
type CacheEntry = {
  cik: string;
  entityName: string;
  /** 2010~current 전체 연도 풀 시계열 */
  metrics: FinancialMetrics[];
  /** SEC 공시 + 시계열에 적용된 액면분할 이벤트 (ticker 단위 글로벌, slicing 영향 없음) */
  splits: SplitEvent[];
  expires: number;
};
const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** 풀 시계열에서 요청 연도만 슬라이스 */
function sliceYears(metrics: FinancialMetrics[], years: number[]): FinancialMetrics[] {
  const allowed = new Set(years);
  return metrics.filter((m) => allowed.has(m.year));
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase() || '';
  const yearsParam = request.nextUrl.searchParams.get('years');
  const mode = (request.nextUrl.searchParams.get('mode') || 'annual') as 'annual' | 'quarterly';

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`sec_financial:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!ticker || !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const requestedYears = yearsParam
    ? yearsParam.split(',').map(Number).filter((y) => y >= 2010 && y <= currentYear)
    : Array.from({ length: 5 }, (_, i) => currentYear - 5 + i);

  // L1 캐시 — ticker:mode 단위 (years 무관)
  const cacheKey = `${ticker}:${mode}`;
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    const sliced = sliceYears(cached.metrics, requestedYears);
    const res = NextResponse.json({
      ticker,
      cik: cached.cik,
      entityName: cached.entityName,
      metrics: sliced,
      splits: cached.splits,
      lastUpdated: new Date(cached.expires - CACHE_TTL_MS).toISOString(),
      cached: true,
    });
    res.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res;
  }

  try {
    const cik = await getCikByTicker(ticker);
    if (!cik) {
      return NextResponse.json({ error: 'Ticker not found in SEC registry' }, { status: 404 });
    }

    // companyFacts.ts에서 inflight dedup → 동시 cold 요청은 1콜로 합쳐짐
    const facts = await fetchCompanyFacts(cik);
    if (!facts) {
      return NextResponse.json({ error: 'No SEC facts available' }, { status: 404 });
    }

    // 풀 시계열 파싱 (2010 ~ 현재). years 파라미터에 의존하지 않음.
    const fullYears = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);
    const { metrics: fullMetrics, splits } = extractMetrics(facts, fullYears, mode);

    resultCache.set(cacheKey, {
      cik,
      entityName: facts.entityName,
      metrics: fullMetrics,
      splits,
      expires: Date.now() + CACHE_TTL_MS,
    });

    const sliced = sliceYears(fullMetrics, requestedYears);
    const res = NextResponse.json({
      ticker,
      cik,
      entityName: facts.entityName,
      metrics: sliced,
      splits,
      lastUpdated: new Date().toISOString(),
    });
    res.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res;
  } catch (error) {
    console.error('[SEC Financial API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch SEC financials' }, { status: 500 });
  }
}
