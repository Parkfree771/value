import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { findByCorpCode } from '@/lib/dartCorpIndex';
import { trackView } from '@/app/api/dart/search/route';
import type { DartFinancialRaw, FinancialMetrics } from '@/app/analysis/types';

const DART_API_KEY = process.env.DART_API_KEY;
const DART_BASE = 'https://opendart.fss.or.kr/api';

/**
 * DART 단일회사 전체 재무제표 fetch (per-tuple 캐싱)
 * - 과거 연도: 영구 캐시 (revalidate: false) — 마감된 보고서는 절대 안 바뀜
 * - 진행 중인 연도: 1시간 캐시 — 새 분기 보고서가 올라올 수 있음
 */
async function fetchDartReport(corpCode: string, year: number, reprtCode: string): Promise<DartFinancialRaw[] | null> {
  const isPastYear = year < new Date().getFullYear();
  const url = `${DART_BASE}/fnlttSinglAcntAll.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}&fs_div=CFS`;

  try {
    const resp = await fetch(url, {
      next: {
        revalidate: isPastYear ? false : 3600,
        tags: [`dart-fin-${corpCode}`, `dart-fin-${corpCode}-${year}`],
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.status !== '000' || !data.list) return null;
    return data.list as DartFinancialRaw[];
  } catch {
    return null;
  }
}

/** DART 금액 문자열 → 억원 */
function parseAmount(value: string | undefined | null): number | null {
  if (!value || value === '') return null;
  const num = parseInt(value.replace(/,/g, ''), 10);
  if (isNaN(num)) return null;
  return Math.round(num / 100000000);
}

/** DART 원 단위 그대로 파싱 (EPS·주식수처럼 1억으로 나누면 안 되는 값) */
function parseRaw(value: string | undefined | null): number | null {
  if (!value || value === '') return null;
  const num = parseInt(value.replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
}

/** CF의 차감 항목 (배당금지급·자사주매입)은 보통 음수로 보고 → 양수(절대값)으로 통일 (SEC와 일관성) */
function absAmount(v: number | null): number | null {
  return v === null ? null : Math.abs(v);
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

/**
 * 주식의 총수 현황 (stockTotqySttus) — 발행주식수.
 * 응답의 list 안에서 보통주(stock_knd='보통주') 합계의 distb_stock_co(유통주식수) 또는
 * istc_totqy(발행주식의 총수)에서 자기주식수 차감한 값을 사용.
 */
async function fetchSharesOutstanding(corpCode: string, year: number, reprtCode: string): Promise<number | null> {
  const isPastYear = year < new Date().getFullYear();
  const url = `${DART_BASE}/stockTotqySttus.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}`;
  try {
    const resp = await fetch(url, {
      next: {
        revalidate: isPastYear ? false : 3600,
        tags: [`dart-shares-${corpCode}`, `dart-shares-${corpCode}-${year}`],
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.status !== '000' || !Array.isArray(data.list)) return null;

    // 보통주 합계 행 우선. 없으면 보통주 행 첫번째.
    const list = data.list as any[];
    const isCommon = (r: any) => typeof r.stock_knd === 'string' && r.stock_knd.includes('보통주');
    // "합계"가 stock_knd 또는 se 에 포함된 경우 우선
    let target = list.find((r) => isCommon(r) && (r.stock_knd?.includes('합계') || r.se?.includes('합계')));
    if (!target) target = list.find(isCommon);
    if (!target) target = list[0];
    if (!target) return null;

    // distb_stock_co (유통주식수) 우선. 없으면 istc_totqy (발행총수) - tesstk_co (자기주식)
    const distb = parseRaw(target.distb_stock_co);
    if (distb && distb > 0) return distb;

    const issued = parseRaw(target.istc_totqy);
    const treasury = parseRaw(target.tesstk_co) ?? 0;
    if (issued && issued > 0) return issued - treasury;

    return null;
  } catch {
    return null;
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
  // SEC 주주환원 탭과 동등한 필드 (KR)
  let epsBasic: number | null = null;
  let epsDiluted: number | null = null;
  let cashBalance: number | null = null;
  let longTermDebt: number | null = null;
  let dividendsPaid: number | null = null;
  let stockBuyback: number | null = null;
  let shareBasedComp: number | null = null;

  for (const item of filtered) {
    const name = item.account_nm;
    const amount = parseAmount(item.thstrm_amount);

    // 손익계산서 (IS / CIS)
    if (item.sj_div === 'IS' || item.sj_div === 'CIS') {
      // 매출 매칭 — '매출' 단독('매출액' 라인 없이 보고하는 회사 대응, 예: 한화에어로스페이스)
      // 금융지주는 '매출'/'매출액' 라인 자체가 없어 null 유지 (정책: 영업이익/순이익만 표시)
      if (
        matchAccount(name, ['매출액', '수익(매출액)', '영업수익', '매출'])
        && !name.includes('원가') && !name.includes('총이익') && !name.includes('원가율')
        && !name.includes('채권') && !name.includes('계약')
      ) {
        if (revenue === null) revenue = amount;
      }
      if (matchAccount(name, ['영업이익']) && !name.includes('금융')) {
        if (operatingProfit === null) operatingProfit = amount;
      }
      if (matchAccount(name, ['당기순이익', '당기순이익(손실)', '당기순손익'])) {
        if (netIncome === null) netIncome = amount;
      }
      // EPS — 원/주 단위, 1억 나누면 안 됨
      if (
        matchAccount(name, ['희석주당', '희석 주당'])
        || (matchAccount(name, ['희석']) && name.includes('주당'))
      ) {
        if (epsDiluted === null) epsDiluted = parseRaw(item.thstrm_amount);
      } else if (
        matchAccount(name, ['기본주당', '기본 주당', '주당이익', '주당손익', '주당순이익'])
      ) {
        if (epsBasic === null) epsBasic = parseRaw(item.thstrm_amount);
      }
      // 주식기준보상비용 — IS 안의 비용 라인 (드물게 잡힘)
      if (matchAccount(name, ['주식기준보상', '주식보상비용'])) {
        if (shareBasedComp === null) shareBasedComp = amount;
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
      // 현금잔액 — "현금및현금성자산"
      if (matchAccount(name, ['현금및현금성자산', '현금 및 현금성자산'])) {
        if (cashBalance === null) cashBalance = amount;
      }
      // 장기차입금 — 비유동 차입금 + 사채. 가장 큰 단일 라인 우선.
      if (
        matchAccount(name, ['장기차입금'])
        || (matchAccount(name, ['사채']) && !name.includes('단기'))
        || matchAccount(name, ['비유동차입금', '비유동 차입금'])
      ) {
        // 첫 매칭만 사용 (보통 종합 합계가 먼저 옴)
        if (longTermDebt === null) longTermDebt = amount;
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
      // 배당금지급 — 음수로 보고. SEC와 일관성 위해 절대값.
      // 표기 변형 많음: 공백, 괄호, "의" 삽입 등. 공백 제거 후 매칭.
      const compact = name.replace(/\s+/g, '');
      if (
        compact.includes('배당금지급')
        || compact.includes('배당금의지급')
        || compact.includes('현금배당금지급')
        || compact.includes('현금배당지급')
      ) {
        if (dividendsPaid === null) dividendsPaid = absAmount(amount);
      }
      // 자기주식 취득 — 양수/음수 둘 다 가능. 절대값.
      if (
        compact.includes('자기주식취득')
        || compact.includes('자기주식의취득')
        || compact.includes('자사주매입')
        || compact.includes('자사주취득')
      ) {
        if (stockBuyback === null) stockBuyback = absAmount(amount);
      }
      // 주식기준보상 (현금흐름 비현금 가산 — IS에서 못 잡혔으면 여기서)
      if (shareBasedComp === null && matchAccount(name, ['주식기준보상', '주식보상비용'])) {
        shareBasedComp = amount;
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
    // 주주환원 (SEC와 동등)
    dividendsPaid, stockBuyback, cashBalance, longTermDebt,
    shareBasedComp,
    // 주식수는 별도 API (stockTotqySttus) 호출로 후처리에서 채움
    sharesOutstanding: null,
    epsBasic, epsDiluted,
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

  try {
    const reprtCodes = mode === 'quarterly'
      ? ['11013', '11012', '11014', '11011']
      : ['11011'];

    const requests = years.flatMap(year =>
      reprtCodes.map(async (reprtCode) => {
        // 재무제표 + 발행주식수 병렬 fetch
        const [list, shares] = await Promise.all([
          fetchDartReport(corpCode, year, reprtCode),
          fetchSharesOutstanding(corpCode, year, reprtCode),
        ]);
        if (!list) return null;
        const m = extractMetrics(list, year, reprtCode);
        m.sharesOutstanding = shares;
        return m;
      })
    );

    const results = await Promise.all(requests);
    // 매출이 null이라도 영업이익·순이익이 있으면 유효 기간으로 인정 (금융지주 등 매출 개념 없는 회사)
    const sorted = results
      .filter((m): m is FinancialMetrics =>
        m !== null && (m.revenue !== null || m.operatingProfit !== null || m.netIncome !== null),
      )
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

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (error) {
    console.error('[DART Financial API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
