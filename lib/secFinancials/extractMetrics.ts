/**
 * companyfacts → FinancialMetrics[] 변환
 *
 * - SEC 원본은 USD raw 단위. 백만 USD 단위로 변환해서 저장.
 * - 연간 모드: fp === 'FY' 필터 (10-K).
 * - 분기 모드: 손익계산서/현금흐름 같은 flow 항목은 YTD 차감 방식으로 단일분기 산출.
 * - 정정공시 대응: 같은 (fy, fp) 후보 중 가장 최근 filed 우선.
 * - 단위 처리: USD(백만 USD로 환산) / shares(주 그대로) / USD/shares(USD/주 그대로, EPS)
 */

import type { FinancialMetrics, SplitEvent } from '@/app/analysis/types';
import type { SecCompanyFacts, SecFactUnit, SecFact } from './types';
import { TAG_MAP, type MetricKey } from './tagMap';

type Mode = 'annual' | 'quarterly';
type UnitName = 'USD' | 'shares' | 'USD/shares';

/* SEC 원본 USD → 백만 USD */
function toMillions(usd: number | null | undefined): number | null {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return null;
  return Math.round(usd / 1_000_000);
}

/** 우선순위 태그를 모두 모아서 반환 (us-gaap 우선, ifrs-full / dei 폴백) */
function collectFacts(facts: SecCompanyFacts['facts'], key: MetricKey): SecFact[] {
  const out: SecFact[] = [];
  const tags = TAG_MAP[key];
  const usg = facts['us-gaap'] || {};
  const unit = tags.unit || 'USD';
  for (const t of tags.usGaap) {
    if (usg[t]?.units?.[unit]?.length) out.push(usg[t]);
  }
  const ifrs = facts['ifrs-full'] || {};
  if (tags.ifrs) {
    for (const t of tags.ifrs) {
      if (ifrs[t]?.units?.[unit]?.length) out.push(ifrs[t]);
    }
  }
  // dei 네임스페이스 — 발행주식수 등 Entity 메타데이터. 이중 클래스 회사가 us-gaap 클래스별 태그 안 쓰면 여기서 잡힘
  const dei = facts.dei || {};
  if (tags.dei) {
    for (const t of tags.dei) {
      if (dei[t]?.units?.[unit]?.length) out.push(dei[t]);
    }
  }
  return out;
}

/**
 * 연간 값 추출
 * SEC `fy`는 *filing의* 회계연도라서 한 10-K 안에 prior year 비교 데이터가
 * 같은 fy로 들어있음 → 실제 기간은 `end` 날짜로 식별.
 *
 * 또한 SEC는 fp='FY' 태그에 *분기 YTD/단일분기 값까지* 섞어서 보고하는 경우가 있음
 * (예: AAPL 10-K 안에 종속 데이터로 Q1/Q2/Q3 분기 EPS도 fp=FY로 태깅).
 * 그래서 flow 항목(start 존재)은 기간 길이도 ~12개월인지 검증해야 함.
 *
 * 전략:
 *  - fp='FY' && end 날짜 연도 == 요청 year
 *  - flow 항목(start 존재)은 기간 길이 350~380일 (실제 회계연도)
 *  - instant 항목(start 없음)은 길이 체크 생략
 *  - 가장 최근 filed 우선 (정정공시 대응)
 */
function annualValue(units: SecFactUnit[], year: number): number | null {
  const candidates = units.filter((u) => {
    if (u.fp !== 'FY') return false;
    if (!u.end) return false;
    const endYear = parseInt(u.end.slice(0, 4), 10);
    if (endYear !== year) return false;
    // flow 항목: 기간 길이 검증 (분기값이 fp=FY로 잘못 태깅된 경우 배제)
    if (u.start) {
      const days = (new Date(u.end).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60 * 24);
      if (days < 350 || days > 380) return false;
    }
    return true;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.filed < b.filed ? 1 : -1));
  return candidates[0].val;
}

/**
 * 분기별 값
 * - allowSubtract=true(기본): Q1/2/3는 직접 매칭, Q4는 FY−(Q1+Q2+Q3) 차감 도출
 * - allowSubtract=false: 가중평균·EPS처럼 더하기로 분해 불가한 지표 — Q4는 직접매칭만, 없으면 null
 */
function quarterValue(
  units: SecFactUnit[],
  year: number,
  quarter: 1 | 2 | 3 | 4,
  allowSubtract: boolean,
): number | null {
  if (quarter === 4) return quarterFourValue(units, year, allowSubtract);
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
 * - 흐름(IS·CF) + allowSubtract: Q4 = FY − (Q1 + Q2 + Q3 단일분기)
 * - 잔액(BS, start 없는 instant): Q4 기말 = FY 기말 (같은 시점값이라 그대로 사용)
 * - allowSubtract=false (EPS·가중평균): 직접 매칭만 시도, 없으면 null
 */
function quarterFourValue(units: SecFactUnit[], year: number, allowSubtract: boolean): number | null {
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

  if (!allowSubtract) return null;

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

/**
 * 우선순위 태그 배열을 순회하며 해당 기간 값 시도 (첫 매칭 우선).
 * skipZero=true면 0 값은 폴백 태그로 넘어감 (CRWD 같은 이중 클래스 회사의 0 placeholder 회피용).
 */
function valueFor(
  factList: SecFact[],
  year: number,
  mode: Mode,
  unit: UnitName,
  quarter: 1 | 2 | 3 | 4 | undefined,
  allowSubtract: boolean,
  skipZero: boolean = false,
): number | null {
  for (const fact of factList) {
    const units = fact.units?.[unit];
    if (!units || units.length === 0) continue;
    const v = mode === 'annual'
      ? annualValue(units, year)
      : quarter
      ? quarterValue(units, year, quarter, allowSubtract)
      : null;
    if (v !== null && (!skipZero || v !== 0)) return v;
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

  /** 백만USD 환산 — 일반 금액 (IS·BS·CF) */
  const vUsd = (k: MetricKey) =>
    toMillions(valueFor(get(k), year, mode, 'USD', quarter, true));

  /** 주식수 그대로 (BS instant 또는 가중평균 flow). 0은 placeholder로 간주하고 폴백 시도 */
  const vShares = (k: MetricKey) =>
    valueFor(get(k), year, mode, 'shares', quarter, false, true);

  /** EPS — USD/주 그대로. Q4 차감 비허용(EPS는 더하기 분해 불가) */
  const vEps = (k: MetricKey) =>
    valueFor(get(k), year, mode, 'USD/shares', quarter, false);

  const revenue = vUsd('revenue');
  let operatingProfit = vUsd('operatingProfit');
  const netIncome = vUsd('netIncome');

  // 영업이익이 SEC 표준 태그(OperatingIncomeLoss)로 안 잡힌 경우 구성요소로 계산.
  // JNJ 같은 제조/제약 회사가 영업이익 별도 태그는 안 박지만 GP·SGA·R&D는 박는 패턴.
  //
  // 계산식: GrossProfit - SGA - R&D
  // 검증: JNJ 2024 → $61,350 - $22,869 - $17,232 = $21,249M (실제 ~$21.6B, 2% 오차)
  //
  // Revenue - CostsAndExpenses 폴백은 의도적으로 안 함:
  //  - 에너지(XOM/CVX): CostsAndExpenses에 비영업 항목 섞여서 pre-tax 값 나옴 → 영업이익이라 부르면 30% 과대
  //  - 보험(PRU/AIG): 너무 부정확
  //  - 정직하게 null 유지하는 게 나음
  if (operatingProfit === null) {
    const grossProfit = vUsd('grossProfit');
    const sga = vUsd('sgaExpense');
    const rd = vUsd('rdExpense');
    if (grossProfit !== null && sga !== null && rd !== null) {
      operatingProfit = grossProfit - sga - rd;
    }
  }

  // 핵심 IS 값이 모두 null이면 그 기간은 건너뜀 (보고서 없음)
  if (revenue === null && operatingProfit === null && netIncome === null) return null;

  const totalAssets = vUsd('totalAssets');
  const totalLiabilities = vUsd('totalLiabilities');
  const totalEquity = vUsd('totalEquity');
  const currentAssets = vUsd('currentAssets');
  const currentLiabilities = vUsd('currentLiabilities');
  const operatingCashFlow = vUsd('operatingCashFlow');
  const investingCashFlow = vUsd('investingCashFlow');
  const financingCashFlow = vUsd('financingCashFlow');
  const dividendsPaid = vUsd('dividendsPaid');
  const stockBuyback = vUsd('stockBuyback');
  const cashBalance = vUsd('cashBalance');
  const longTermDebt = vUsd('longTermDebt');
  const shareBasedComp = vUsd('shareBasedComp');
  const sharesOutstanding = vShares('sharesOutstanding');
  const epsBasic = vEps('epsBasic');
  const epsDiluted = vEps('epsDiluted');

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
    dividendsPaid,
    stockBuyback,
    cashBalance,
    longTermDebt,
    shareBasedComp,
    sharesOutstanding,
    epsBasic,
    epsDiluted,
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

/**
 * SEC가 공시한 주식분할 이벤트 추출
 *
 * 태그: us-gaap:StockholdersEquityNoteStockSplitConversionRatio1
 *      (구버전: StockholdersEquityNoteStockSplitConversionRatio)
 *
 * 같은 분할 이벤트가 후속 보고서마다 반복되므로 (분할비율, 발생연도) 기준 중복 제거.
 * NVIDIA 같은 다중 분할 회사는 2개 이상 반환됨.
 */
function extractSplitEvents(facts: SecCompanyFacts['facts']): SplitEvent[] {
  const usg = facts['us-gaap'] || {};
  const candidateTags = [
    'StockholdersEquityNoteStockSplitConversionRatio1',
    'StockholdersEquityNoteStockSplitConversionRatio',
  ];

  const events: { date: string; ratio: number }[] = [];
  const seen = new Set<string>(); // (ratio, year) 단위 중복 제거

  for (const tag of candidateTags) {
    const fact = usg[tag];
    if (!fact?.units?.pure) continue;
    for (const u of fact.units.pure) {
      if (!u.end || typeof u.val !== 'number' || u.val <= 0 || u.val === 1) continue;
      const year = u.end.slice(0, 4);
      // 정밀도 손실 방지: 비율 소수점 반올림 후 key
      const ratioKey = Math.round(u.val * 100) / 100;
      const key = `${ratioKey}-${year}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ date: u.end, ratio: ratioKey });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events.map((e) => ({
    effectiveDate: e.date,
    ratio: e.ratio,
    appliedAtPeriod: null,
    source: 'sec' as const,
  }));
}

/**
 * 주식분할 보정 — SEC 공시만 신뢰.
 *
 * SEC `companyfacts`는 발행주식수·EPS를 *공시 시점* 액면 기준으로 보관.
 * 후속 10-K가 비교공시 일부만 재진술하므로, 우리 시계열에 액면이 섞임 → 인위적 점프.
 *
 * 전략:
 *  1. SEC 분할 태그(`StockholdersEquityNoteStockSplitConversionRatio1`)가 있는 회사
 *     → 그 정확한 정수 비율로 발행주식수·EPS 보정 (이중 보정 방지 위해 실제 점프 있을 때만)
 *  2. SEC 태그 없는 회사에서 발행주식수 ≥2배(혹은 ≤0.5배) 점프 발견
 *     → 보정 안 함, 사용자에게 검증 요청 알림으로만 처리 (유상증자·SPAC 합병·구조조정 등 가능)
 *
 * 휴리스틱(표준 비율 매칭) 폴백은 의도적으로 제거 — 금융위기 신주발행 같은 케이스에서
 * 분할로 오인할 위험 있음. SEC가 공시 안 한 건 분할이 아니라는 보수적 입장.
 *
 * 자사주매입 금액 등 USD는 분할과 무관 → 건드리지 않음.
 *
 * 반환: 보정된 metrics + 분할 이벤트 (source: 'sec' = 적용 / 'unverified' = 알림만)
 */
function applyStockSplitAdjustment(
  metrics: FinancialMetrics[],
  secSplits: SplitEvent[],
): { metrics: FinancialMetrics[]; appliedSplits: SplitEvent[] } {
  if (metrics.length < 2) return { metrics, appliedSplits: [] };
  const out = metrics.map((m) => ({ ...m }));
  const applied: SplitEvent[] = [];

  /**
   * 시계열에서 분할 경계를 *지표별로* 독립 검출 → 정확한 비율 적용.
   *
   * 발행주식수와 EPS의 경계 인덱스가 다를 수 있음:
   *  - 발행주식수(BS): SEC가 2년치 비교공시만 재진술 → 최근 1년만 새 액면
   *  - EPS(IS): SEC가 3년치 비교공시 재진술 → 최근 2년이 새 액면
   *
   * 임계값:
   *  - 발행주식수: 관측비율 ≈ split.ratio ±20% (자사주매입 노이즈 허용)
   *  - EPS: 관측비율 ≈ 1/split.ratio 의 ÷3.5~×3.5 (순이익 변동성 허용)
   *    근거: 분할 + 정상 실적변동(0.3~3배) 결합 = 분할비율 역수 × [0.3, 3]
   *
   * 검출 범위 제한 — 핵심:
   *  SEC 분할 효력일 ±2년 윈도우로 좁힘. 회사 일생 전체에서 비율 매칭하면
   *  실적 변동(예: NVIDIA 크립토 크래시)을 분할로 오인할 수 있어 윈도우 필수.
   */
  const inWindow = (idx: number, splitYear: number): boolean => {
    const y = out[idx].year;
    return Math.abs(y - splitYear) <= 2;
  };

  const findSharesBoundary = (split: SplitEvent, excluded: Set<number>): number | null => {
    const splitYear = parseInt(split.effectiveDate.slice(0, 4), 10);
    for (let i = 1; i < out.length; i++) {
      if (excluded.has(i)) continue;
      if (!inWindow(i, splitYear)) continue;
      const prev = out[i - 1].sharesOutstanding;
      const curr = out[i].sharesOutstanding;
      if (prev === null || curr === null || prev === 0) continue;
      const observed = curr / prev;
      if (Math.abs(observed - split.ratio) / split.ratio < 0.20) return i;
    }
    return null;
  };

  const findEpsBoundary = (split: SplitEvent, excluded: Set<number>): number | null => {
    const splitYear = parseInt(split.effectiveDate.slice(0, 4), 10);
    // EPS는 분할 비율의 *역수*로 움직임 (정방향 10:1 → EPS 1/10, 역방향 1:10 → EPS 10배)
    // inv가 정방향이면 작은 수(0.1), 역방향이면 큰 수(10) — 비대칭이라 ÷3.5/×3.5 그대로 사용
    const inv = 1 / split.ratio;
    const minR = inv / 3.5;
    const maxR = inv * 3.5;
    for (let i = 1; i < out.length; i++) {
      if (excluded.has(i)) continue;
      if (!inWindow(i, splitYear)) continue;
      const prev = out[i - 1].epsDiluted ?? out[i - 1].epsBasic;
      const curr = out[i].epsDiluted ?? out[i].epsBasic;
      if (prev === null || curr === null || prev === 0) continue;
      const observed = curr / prev;
      if (observed <= 0) continue;
      if (observed >= minR && observed <= maxR) return i;
    }
    return null;
  };

  const adjustSharesBefore = (idx: number, factor: number) => {
    for (let j = 0; j < idx; j++) {
      const s = out[j].sharesOutstanding;
      if (s !== null) out[j].sharesOutstanding = Math.round(s * factor);
    }
  };
  const adjustEpsBefore = (idx: number, factor: number) => {
    for (let j = 0; j < idx; j++) {
      const eb = out[j].epsBasic;
      if (eb !== null) out[j].epsBasic = Math.round((eb / factor) * 100) / 100;
      const ed = out[j].epsDiluted;
      if (ed !== null) out[j].epsDiluted = Math.round((ed / factor) * 100) / 100;
    }
  };

  // === 1단계: SEC 분할 이벤트 적용 — 발행주식수에 실제 점프가 보일 때만 ===
  // SEC가 분할 보고했어도 데이터에 점프가 없으면 이미 재진술됐거나 우리 범위 밖
  // (예: PATH 같은 IPO 전 클래스 재구조화)이라 적용 안 함 — false positive 방지.
  // 이렇게 하면 EPS만 우연히 매칭되는 케이스도 자동 차단.
  const usedSharesIndices = new Set<number>();
  const usedEpsIndices = new Set<number>();
  for (const split of secSplits) {
    const sharesIdx = findSharesBoundary(split, usedSharesIndices);
    if (sharesIdx === null) continue; // 발행주식수에 점프 없으면 SEC 보고 무시

    adjustSharesBefore(sharesIdx, split.ratio);
    usedSharesIndices.add(sharesIdx);

    // EPS는 같은 분할에 대해 별도 경계 검출 (3년치 IS vs 2년치 BS 재진술 차이)
    const epsIdx = findEpsBoundary(split, usedEpsIndices);
    if (epsIdx !== null) {
      adjustEpsBefore(epsIdx, split.ratio);
      usedEpsIndices.add(epsIdx);
    }

    // UI 라벨: shares 경계 기준
    applied.push({ ...split, appliedAtPeriod: out[sharesIdx].period });
  }

  // === 2단계: SEC가 공시하지 않은 발행주식수 점프 검출 — 보정 안 하고 알림만 ===
  // 분할 외 사유(유상증자·SPAC 합병·자본재구조화 등)일 가능성이 높아 사용자 직접 확인 필요.
  for (let i = 1; i < out.length; i++) {
    if (usedSharesIndices.has(i)) continue;
    const prev = out[i - 1].sharesOutstanding;
    const curr = out[i].sharesOutstanding;
    if (prev === null || curr === null || prev === 0 || curr === 0) continue;

    const ratio = curr / prev;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    if (ratio < 1.8 && ratio > 0.55) continue; // 정상 변동

    // 발행주식수 ≥2배 또는 ≤0.5배 점프 → 알림 (보정 안 함)
    applied.push({
      effectiveDate: `${out[i].year}-01-01`,
      ratio,
      appliedAtPeriod: out[i].period,
      source: 'unverified',
    });
  }

  // 적용된 분할을 효력일 기준 정렬
  applied.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  return { metrics: out, appliedSplits: applied };
}

/** 메인: companyfacts → 정렬된 FinancialMetrics[] + 적용된 분할 이벤트 */
export function extractMetrics(
  companyFacts: SecCompanyFacts,
  years: number[],
  mode: Mode,
): { metrics: FinancialMetrics[]; splits: SplitEvent[] } {
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

  const derived = computeDerivedMetrics(periods);
  const secSplits = extractSplitEvents(facts);
  const { metrics, appliedSplits } = applyStockSplitAdjustment(derived, secSplits);
  return { metrics, splits: appliedSplits };
}
