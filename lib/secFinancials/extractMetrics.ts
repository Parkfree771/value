/**
 * companyfacts → FinancialMetrics[] 변환
 *
 * - SEC 원본은 USD raw 단위. 백만 USD 단위로 변환해서 저장.
 * - 연간 모드: fp === 'FY' 필터 (10-K).
 * - 분기 모드: 손익계산서/현금흐름 같은 flow 항목은 YTD 차감 방식으로 단일분기 산출.
 * - 정정공시 대응: 같은 (fy, fp) 후보 중 가장 최근 filed 우선.
 */

import type { FinancialMetrics } from '@/app/analysis/types';
import type { SecCompanyFacts, SecFactUnit, SecFact } from './types';
import { TAG_MAP, type MetricKey } from './tagMap';

type Mode = 'annual' | 'quarterly';

/* SEC 원본 USD → 백만 USD */
function toMillions(usd: number | null | undefined): number | null {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return null;
  return Math.round(usd / 1_000_000);
}

/** 우선순위 태그를 모두 모아서 반환 (us-gaap 우선, ifrs-full 폴백) */
function collectFacts(facts: SecCompanyFacts['facts'], key: MetricKey): SecFact[] {
  const out: SecFact[] = [];
  const tags = TAG_MAP[key];
  const usg = facts['us-gaap'] || {};
  for (const t of tags.usGaap) {
    if (usg[t]?.units?.USD?.length) out.push(usg[t]);
  }
  const ifrs = facts['ifrs-full'] || {};
  if (tags.ifrs) {
    for (const t of tags.ifrs) {
      if (ifrs[t]?.units?.USD?.length) out.push(ifrs[t]);
    }
  }
  return out;
}

/**
 * 연간 값 추출
 * SEC `fy`는 *filing의* 회계연도라서 한 10-K 안에 prior year 비교 데이터가
 * 같은 fy로 들어있음 → 실제 기간은 `end` 날짜로 식별.
 *
 * 전략: fp='FY' && end 날짜 연도 == 요청 year && form이 10-K(또는 변형) →
 *       후보 중 가장 최근 filed 선택 (정정공시 대응)
 */
function annualValue(units: SecFactUnit[], year: number): number | null {
  const candidates = units.filter((u) => {
    if (u.fp !== 'FY') return false;
    if (!u.end) return false;
    const endYear = parseInt(u.end.slice(0, 4), 10);
    return endYear === year;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.filed < b.filed ? 1 : -1));
  return candidates[0].val;
}

/** 분기별 값 — Q1/Q2/Q3는 직접 매칭, Q4는 10-K(FY)에서 도출 */
function quarterValue(units: SecFactUnit[], year: number, quarter: 1 | 2 | 3 | 4): number | null {
  if (quarter === 4) return quarterFourValue(units, year);
  return quarterDirectValue(units, year, quarter);
}

/** Q1/Q2/Q3: fp='Q1/2/3' 매칭 — 단일분기 우선, YTD 폴백 허용 */
function quarterDirectValue(units: SecFactUnit[], year: number, quarter: 1 | 2 | 3): number | null {
  const fpKey = `Q${quarter}`;
  const candidates = units.filter((u) => {
    if (u.fp !== fpKey) return false;
    if (!u.end) return false;
    const endYear = parseInt(u.end.slice(0, 4), 10);
    return endYear === year;
  });
  if (candidates.length === 0) return null;

  // 'start'와 'end' 기간이 ~3개월인 항목 우선 (단일 분기 — YTD 누적값 제외)
  const isSingleQuarter = (u: SecFactUnit): boolean => {
    if (!u.start || !u.end) return false;
    const days = (new Date(u.end).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 80 && days <= 100; // 3개월 ±
  };

  const single = candidates.filter(isSingleQuarter);
  if (single.length > 0) {
    single.sort((a, b) => (a.filed < b.filed ? 1 : -1));
    return single[0].val;
  }

  // BS 같은 instant 항목 (start 없음 == 시점값) — 가장 최근 filed
  const instants = candidates.filter((u) => !u.start);
  if (instants.length > 0) {
    instants.sort((a, b) => (a.filed < b.filed ? 1 : -1));
    return instants[0].val;
  }

  // 폴백
  candidates.sort((a, b) => (a.filed < b.filed ? 1 : -1));
  return candidates[0].val;
}

/**
 * Q4 단일 분기 값 도출.
 *
 * SEC는 fp='Q4' 태깅을 거의 안 함 — 4분기 숫자는 10-K(fp='FY')에 묻혀 들어감.
 * - 흐름(IS·CF): Q4 = FY − (Q1 + Q2 + Q3 단일분기)
 * - 잔액(BS): Q4 기말 = FY 기말 (같은 시점값이라 그대로 사용)
 */
function quarterFourValue(units: SecFactUnit[], year: number): number | null {
  // 드물게 fp='Q4'로 직접 보고하는 회사 — 있으면 우선 사용
  const directCandidates = units.filter((u) => {
    if (u.fp !== 'Q4' || !u.end) return false;
    return parseInt(u.end.slice(0, 4), 10) === year;
  });
  if (directCandidates.length > 0) {
    const single = directCandidates.filter((u) => {
      if (!u.start || !u.end) return false;
      const days = (new Date(u.end).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60 * 24);
      return days >= 80 && days <= 100;
    });
    const pick = single.length > 0 ? single : directCandidates.filter((u) => !u.start);
    if (pick.length > 0) {
      pick.sort((a, b) => (a.filed < b.filed ? 1 : -1));
      return pick[0].val;
    }
  }

  const fyVal = annualValue(units, year);
  if (fyVal === null) return null;

  // 잔액 항목(start 없는 시점값)은 FY 기말 = Q4 기말이므로 그대로 사용
  const isFlow = units.some((u) => !!u.start);
  if (!isFlow) return fyVal;

  // 흐름 항목: FY에서 Q1+Q2+Q3 단일분기 차감
  const q1 = quarterSingleValue(units, year, 1);
  const q2 = quarterSingleValue(units, year, 2);
  const q3 = quarterSingleValue(units, year, 3);
  if (q1 === null || q2 === null || q3 === null) return null;
  return fyVal - q1 - q2 - q3;
}

/** Q1/Q2/Q3 단일분기(3개월 ±)만. Q4 차감 정확도용 — YTD 폴백 없음 */
function quarterSingleValue(units: SecFactUnit[], year: number, quarter: 1 | 2 | 3): number | null {
  const fpKey = `Q${quarter}`;
  const candidates = units.filter((u) => {
    if (u.fp !== fpKey) return false;
    if (!u.end || !u.start) return false;
    const endYear = parseInt(u.end.slice(0, 4), 10);
    if (endYear !== year) return false;
    const days = (new Date(u.end).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 80 && days <= 100;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.filed < b.filed ? 1 : -1));
  return candidates[0].val;
}

/** 우선순위 태그 배열을 순회하며 해당 기간 값 시도 (첫 매칭 우선) */
function valueFor(
  factList: SecFact[],
  year: number,
  mode: Mode,
  quarter?: 1 | 2 | 3 | 4,
): number | null {
  for (const fact of factList) {
    const units = fact.units?.USD;
    if (!units || units.length === 0) continue;
    const v = mode === 'annual'
      ? annualValue(units, year)
      : quarter
      ? quarterValue(units, year, quarter)
      : null;
    if (v !== null) return v;
  }
  return null;
}

/** 한 기간(year 또는 year+quarter)의 FinancialMetrics 만들기 */
function buildPeriodMetrics(
  facts: SecCompanyFacts['facts'],
  year: number,
  mode: Mode,
  quarter?: 1 | 2 | 3 | 4,
): FinancialMetrics | null {
  const factCache: Partial<Record<MetricKey, SecFact[]>> = {};
  const get = (k: MetricKey): SecFact[] => {
    if (!factCache[k]) factCache[k] = collectFacts(facts, k);
    return factCache[k]!;
  };

  const v = (k: MetricKey) => toMillions(valueFor(get(k), year, mode, quarter));

  const revenue = v('revenue');
  const operatingProfit = v('operatingProfit');
  const netIncome = v('netIncome');

  // 핵심 IS 값이 모두 null이면 그 기간은 건너뜀 (보고서 없음)
  if (revenue === null && operatingProfit === null && netIncome === null) return null;

  const totalAssets = v('totalAssets');
  const totalLiabilities = v('totalLiabilities');
  const totalEquity = v('totalEquity');
  const currentAssets = v('currentAssets');
  const currentLiabilities = v('currentLiabilities');
  const operatingCashFlow = v('operatingCashFlow');
  const investingCashFlow = v('investingCashFlow');
  const financingCashFlow = v('financingCashFlow');

  // 마진
  const operatingMargin =
    revenue && operatingProfit !== null ? Math.round((operatingProfit / revenue) * 1000) / 10 : null;
  const netMargin =
    revenue && netIncome !== null ? Math.round((netIncome / revenue) * 1000) / 10 : null;

  // 비율
  const debtRatio =
    totalLiabilities !== null && totalEquity && totalEquity !== 0
      ? Math.round((totalLiabilities / totalEquity) * 1000) / 10
      : null;
  const currentRatio =
    currentAssets !== null && currentLiabilities && currentLiabilities !== 0
      ? Math.round((currentAssets / currentLiabilities) * 1000) / 10
      : null;

  // ROE/ROA — 일단 기말값 기준. 후처리에서 평균자본/자산으로 재계산.
  const roe =
    netIncome !== null && totalEquity && totalEquity !== 0
      ? Math.round((netIncome / totalEquity) * 1000) / 10
      : null;
  const roa =
    netIncome !== null && totalAssets && totalAssets !== 0
      ? Math.round((netIncome / totalAssets) * 1000) / 10
      : null;

  const freeCashFlow =
    operatingCashFlow !== null && investingCashFlow !== null
      ? operatingCashFlow + investingCashFlow
      : null;

  const period = quarter ? `${year}Q${quarter}` : `${year}`;

  return {
    period,
    year,
    quarter,
    revenue,
    operatingProfit,
    netIncome,
    operatingMargin,
    netMargin,
    revenueGrowth: null, // 후처리
    profitGrowth: null,  // 후처리
    totalAssets,
    totalLiabilities,
    totalEquity,
    currentAssets,
    currentLiabilities,
    debtRatio,
    currentRatio,
    roe,
    roa,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    freeCashFlow,
  };
}

/** 후처리: 성장률, 평균자본/자산 ROE/ROA */
function computeDerivedMetrics(metrics: FinancialMetrics[]): FinancialMetrics[] {
  return metrics.map((m, i) => {
    const prev = i > 0 ? metrics[i - 1] : null;

    const revenueGrowth =
      prev?.revenue && m.revenue
        ? Math.round(((m.revenue - prev.revenue) / Math.abs(prev.revenue)) * 1000) / 10
        : null;
    const profitGrowth =
      prev?.operatingProfit && m.operatingProfit
        ? Math.round(((m.operatingProfit - prev.operatingProfit) / Math.abs(prev.operatingProfit)) * 1000) / 10
        : null;

    let roe = m.roe;
    if (prev?.totalEquity && m.totalEquity && m.netIncome) {
      const avg = (prev.totalEquity + m.totalEquity) / 2;
      if (avg !== 0) roe = Math.round((m.netIncome / avg) * 1000) / 10;
    }

    let roa = m.roa;
    if (prev?.totalAssets && m.totalAssets && m.netIncome) {
      const avg = (prev.totalAssets + m.totalAssets) / 2;
      if (avg !== 0) roa = Math.round((m.netIncome / avg) * 1000) / 10;
    }

    return { ...m, revenueGrowth, profitGrowth, roe, roa };
  });
}

/** 메인: companyfacts → 정렬된 FinancialMetrics[] */
export function extractMetrics(
  companyFacts: SecCompanyFacts,
  years: number[],
  mode: Mode,
): FinancialMetrics[] {
  const facts = companyFacts.facts;

  const periods: FinancialMetrics[] = [];

  for (const year of years) {
    if (mode === 'annual') {
      const m = buildPeriodMetrics(facts, year, 'annual');
      if (m) periods.push(m);
    } else {
      for (const q of [1, 2, 3, 4] as const) {
        const m = buildPeriodMetrics(facts, year, 'quarterly', q);
        if (m) periods.push(m);
      }
    }
  }

  periods.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.quarter || 4) - (b.quarter || 4);
  });

  return computeDerivedMetrics(periods);
}
