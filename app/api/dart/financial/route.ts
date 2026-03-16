import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { findByCorpCode } from '@/lib/dartCorpIndex';
import { trackView } from '@/app/api/dart/search/route';
import type { DartFinancialRaw, FinancialMetrics } from '@/app/analysis/types';

const DART_API_KEY = process.env.DART_API_KEY;
const DART_BASE = 'https://opendart.fss.or.kr/api';

// 서버 메모리 캐시 (12시간)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000;

/** DART 금액 문자열 → 억원 */
function parseAmount(value: string | undefined | null): number | null {
  if (!value || value === '') return null;
  const num = parseInt(value.replace(/,/g, ''), 10);
  if (isNaN(num)) return null;
  return Math.round(num / 100000000);
}

/** reprt_code → 분기 번호 */
function reprtToQuarter(reprtCode: string): number | undefined {
  switch (reprtCode) {
    case '11013': return 1;
    case '11012': return 2;
    case '11014': return 3;
    case '11011': return 4;
    default: return undefined;
  }
}

/** 계정명 매칭 */
function matchAccount(accountNm: string, targets: string[]): boolean {
  return targets.some(t => accountNm.includes(t));
}

/** DART 원시 데이터에서 핵심 지표 추출 */
function extractMetrics(items: DartFinancialRaw[], year: number, reprtCode: string): FinancialMetrics {
  // fs_div 필터 (fnlttSinglAcntAll은 fs_div 미포함 가능)
  let filtered = items.filter(i => i.fs_div === 'CFS');
  if (filtered.length === 0) filtered = items.filter(i => i.fs_div === 'OFS');
  if (filtered.length === 0) filtered = items;

  let revenue: number | null = null;
  let operatingProfit: number | null = null;
  let netIncome: number | null = null;
  let totalAssets: number | null = null;
  let totalLiabilities: number | null = null;
  let totalEquity: number | null = null;
  let currentAssets: number | null = null;
  let currentLiabilities: number | null = null;
  let operatingCashFlow: number | null = null;
  let investingCashFlow: number | null = null;
  let financingCashFlow: number | null = null;

  for (const item of filtered) {
    const name = item.account_nm;
    const amount = parseAmount(item.thstrm_amount);

    // 손익계산서 (IS / CIS)
    if (item.sj_div === 'IS' || item.sj_div === 'CIS') {
      if (matchAccount(name, ['매출액', '수익(매출액)', '영업수익']) && !name.includes('원가') && !name.includes('총이익')) {
        if (revenue === null) revenue = amount;
      }
      if (matchAccount(name, ['영업이익']) && !name.includes('금융')) {
        if (operatingProfit === null) operatingProfit = amount;
      }
      if (matchAccount(name, ['당기순이익', '당기순이익(손실)', '당기순손익'])) {
        if (netIncome === null) netIncome = amount;
      }
    }

    // 재무상태표 (BS)
    if (item.sj_div === 'BS') {
      if (matchAccount(name, ['자산총계'])) {
        if (totalAssets === null) totalAssets = amount;
      }
      if (matchAccount(name, ['부채총계'])) {
        if (totalLiabilities === null) totalLiabilities = amount;
      }
      if (matchAccount(name, ['자본총계'])) {
        if (totalEquity === null) totalEquity = amount;
      }
      if (matchAccount(name, ['유동자산']) && !name.includes('비유동')) {
        if (currentAssets === null) currentAssets = amount;
      }
      if (matchAccount(name, ['유동부채']) && !name.includes('비유동')) {
        if (currentLiabilities === null) currentLiabilities = amount;
      }
    }

    // 현금흐름표 (CF)
    if (item.sj_div === 'CF') {
      if (matchAccount(name, ['영업활동현금흐름', '영업활동 현금흐름', '영업활동으로인한현금흐름', '영업활동으로 인한 현금흐름'])) {
        if (operatingCashFlow === null) operatingCashFlow = amount;
      }
      if (matchAccount(name, ['투자활동현금흐름', '투자활동 현금흐름', '투자활동으로인한현금흐름', '투자활동으로 인한 현금흐름'])) {
        if (investingCashFlow === null) investingCashFlow = amount;
      }
      if (matchAccount(name, ['재무활동현금흐름', '재무활동 현금흐름', '재무활동으로인한현금흐름', '재무활동으로 인한 현금흐름'])) {
        if (financingCashFlow === null) financingCashFlow = amount;
      }
    }
  }

  // 파생 지표
  const operatingMargin = (revenue && operatingProfit) ? Math.round(operatingProfit / revenue * 1000) / 10 : null;
  const netMargin = (revenue && netIncome) ? Math.round(netIncome / revenue * 1000) / 10 : null;
  const debtRatio = (totalLiabilities && totalEquity && totalEquity !== 0) ? Math.round(totalLiabilities / totalEquity * 1000) / 10 : null;
  const currentRatio = (currentAssets && currentLiabilities && currentLiabilities !== 0) ? Math.round(currentAssets / currentLiabilities * 1000) / 10 : null;
  // ROE/ROA는 기말값으로 임시 계산 (후처리에서 평균자본/자산으로 재계산)
  const roe = (netIncome && totalEquity && totalEquity !== 0) ? Math.round(netIncome / totalEquity * 1000) / 10 : null;
  const roa = (netIncome && totalAssets && totalAssets !== 0) ? Math.round(netIncome / totalAssets * 1000) / 10 : null;
  const freeCashFlow = (operatingCashFlow !== null && investingCashFlow !== null) ? operatingCashFlow + investingCashFlow : null;

  const quarter = reprtToQuarter(reprtCode);
  const period = quarter && quarter < 4 ? `${year}Q${quarter}` : `${year}`;

  return {
    period, year, quarter,
    revenue, operatingProfit, netIncome,
    operatingMargin, netMargin,
    revenueGrowth: null, profitGrowth: null,
    totalAssets, totalLiabilities, totalEquity,
    currentAssets, currentLiabilities,
    debtRatio, currentRatio, roe, roa,
    operatingCashFlow, investingCashFlow, financingCashFlow, freeCashFlow,
  };
}

/** 성장률 + ROE/ROA 평균자본 후처리 */
function computeDerivedMetrics(metrics: FinancialMetrics[]): FinancialMetrics[] {
  return metrics.map((m, i) => {
    const prev = i > 0 ? metrics[i - 1] : null;

    // 성장률
    const revenueGrowth = (prev?.revenue && m.revenue)
      ? Math.round((m.revenue - prev.revenue) / Math.abs(prev.revenue) * 1000) / 10 : null;
    const profitGrowth = (prev?.operatingProfit && m.operatingProfit)
      ? Math.round((m.operatingProfit - prev.operatingProfit) / Math.abs(prev.operatingProfit) * 1000) / 10 : null;

    // ROE = 당기순이익 / 평균자본총계
    let roe = m.roe;
    if (prev?.totalEquity && m.totalEquity && m.netIncome) {
      const avgEquity = (prev.totalEquity + m.totalEquity) / 2;
      if (avgEquity !== 0) roe = Math.round(m.netIncome / avgEquity * 1000) / 10;
    }

    // ROA = 당기순이익 / 평균자산총계
    let roa = m.roa;
    if (prev?.totalAssets && m.totalAssets && m.netIncome) {
      const avgAssets = (prev.totalAssets + m.totalAssets) / 2;
      if (avgAssets !== 0) roa = Math.round(m.netIncome / avgAssets * 1000) / 10;
    }

    return { ...m, revenueGrowth, profitGrowth, roe, roa };
  });
}

export async function GET(request: NextRequest) {
  const corpCode = request.nextUrl.searchParams.get('corp_code');
  const yearsParam = request.nextUrl.searchParams.get('years');
  const mode = request.nextUrl.searchParams.get('mode') || 'annual';

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`dart_financial:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!corpCode || !/^\d{8}$/.test(corpCode)) {
    return NextResponse.json({ error: 'Invalid corp_code' }, { status: 400 });
  }

  if (!DART_API_KEY) {
    return NextResponse.json({ error: 'DART API key not configured' }, { status: 500 });
  }

  // 상장기업인지 확인
  const corpEntry = await findByCorpCode(corpCode);
  if (!corpEntry) {
    return NextResponse.json({ error: 'Company not found or not listed' }, { status: 404 });
  }

  // 인기 검색 트래킹
  trackView(corpEntry.corpCode, corpEntry.corpName, corpEntry.stockCode);

  const currentYear = new Date().getFullYear();
  const years = yearsParam
    ? yearsParam.split(',').map(Number).filter(y => y >= 2015 && y <= currentYear)
    : Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  const cacheKey = `dart_financial_${corpCode}_${mode}_${years.join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const res = NextResponse.json(cached.data);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  }

  try {
    const reprtCodes = mode === 'quarterly'
      ? ['11013', '11012', '11014', '11011']
      : ['11011'];

    const requests = years.flatMap(year =>
      reprtCodes.map(async (reprtCode) => {
        const url = `${DART_BASE}/fnlttSinglAcntAll.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}&fs_div=CFS`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          const data = await resp.json();
          if (data.status !== '000' || !data.list) return null;
          return extractMetrics(data.list, year, reprtCode);
        } catch {
          return null;
        }
      })
    );

    const results = await Promise.all(requests);
    const sorted = results
      .filter((m): m is FinancialMetrics => m !== null && m.revenue !== null)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return (a.quarter || 4) - (b.quarter || 4);
      });

    const metrics = computeDerivedMetrics(sorted);

    const result = {
      corp_code: corpCode,
      metrics,
      lastUpdated: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res;
  } catch (error) {
    console.error('[DART Financial API] Error:', error);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
