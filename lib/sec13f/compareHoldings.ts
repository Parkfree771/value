// Q3 vs Q4 보유 종목 비교 모듈

import { Raw13FHolding, PortfolioHolding } from './types';
import { resolveCusip, GENERIC_ISSUER_BLACKLIST, normalizeCompanyName } from './cusipMap';

/**
 * 표시용 종목명 결정 (우선순위)
 * 1. 매핑에서 제공된 수동 이름 (ETF 등)
 * 2. 포괄적 발행자명이면 titleOfClass (SEC 원본 대체)
 * 3. SEC 원본 nameOfIssuer
 */
function getDisplayName(nameOfIssuer: string, titleOfClass: string, mappingName?: string): string {
  // 수동 매핑에서 이름이 지정된 경우 (ETF 등)
  if (mappingName && mappingName !== nameOfIssuer) {
    return mappingName;
  }
  // 포괄적 발행자명이면 titleOfClass 사용
  const normalized = normalizeCompanyName(nameOfIssuer);
  const isGeneric = GENERIC_ISSUER_BLACKLIST.some(
    b => normalized === normalizeCompanyName(b)
  );
  if (isGeneric && titleOfClass) {
    return titleOfClass;
  }
  return nameOfIssuer;
}

/**
 * Q3(이전)과 Q4(현재) 보유 종목을 비교하여 상태 판별
 */
export function compareHoldings(
  prevHoldings: Raw13FHolding[], // Q3
  currHoldings: Raw13FHolding[]  // Q4
): PortfolioHolding[] {
  // CUSIP 기준 Map 생성
  const prevMap = new Map<string, Raw13FHolding>();
  for (const h of prevHoldings) {
    prevMap.set(h.cusip, h);
  }

  const currMap = new Map<string, Raw13FHolding>();
  for (const h of currHoldings) {
    currMap.set(h.cusip, h);
  }

  // 총 포트폴리오 가치 계산 (천달러 → 달러)
  const totalValuePrev = prevHoldings.reduce((sum, h) => sum + h.value, 0) * 1000;
  const totalValueCurr = currHoldings.reduce((sum, h) => sum + h.value, 0) * 1000;

  const result: PortfolioHolding[] = [];

  // 1. 현재(Q4) 보유 종목 처리
  for (const [cusip, curr] of currMap) {
    const prev = prevMap.get(cusip);
    const mapping = resolveCusip(cusip, curr.nameOfIssuer);

    let status: PortfolioHolding['status'];
    let sharesChangePct: number | null = null;

    if (!prev) {
      // Q3에 없고 Q4에 있음 → 신규 매수
      status = 'NEW BUY';
    } else {
      // 양쪽 다 있음 → 변동 분석
      const change = prev.shares > 0
        ? (curr.shares - prev.shares) / prev.shares
        : 0;
      sharesChangePct = Math.round(change * 10000) / 100; // 소수점 2자리

      if (change > 0.01) {
        status = 'ADD'; // 1% 이상 증가
      } else if (change < -0.01) {
        status = 'TRIM'; // 1% 이상 감소
      } else {
        status = 'HOLD'; // 변동 없음 (±1% 이내)
      }
    }

    result.push({
      cusip,
      ticker: mapping?.ticker || null,
      name_of_issuer: getDisplayName(curr.nameOfIssuer, curr.titleOfClass, mapping?.name),
      title_of_class: curr.titleOfClass,
      exchange: mapping?.exchange || 'NAS',
      value_curr: curr.value * 1000,
      shares_curr: curr.shares,
      weight_curr: totalValueCurr > 0
        ? Math.round((curr.value * 1000 / totalValueCurr) * 10000) / 100
        : 0,
      value_prev: prev ? prev.value * 1000 : null,
      shares_prev: prev?.shares ?? null,
      weight_prev: prev && totalValuePrev > 0
        ? Math.round((prev.value * 1000 / totalValuePrev) * 10000) / 100
        : null,
      status,
      shares_change_pct: sharesChangePct,
      ticker_source: mapping?.source || 'unmapped',
    });
  }

  // 2. Q3에만 있고 Q4에 없는 종목 → 전량 매도
  for (const [cusip, prev] of prevMap) {
    if (!currMap.has(cusip)) {
      const mapping = resolveCusip(cusip, prev.nameOfIssuer);

      result.push({
        cusip,
        ticker: mapping?.ticker || null,
        name_of_issuer: getDisplayName(prev.nameOfIssuer, prev.titleOfClass, mapping?.name),
        title_of_class: prev.titleOfClass,
        exchange: mapping?.exchange || 'NAS',
        value_curr: 0,
        shares_curr: 0,
        weight_curr: 0,
        value_prev: prev.value * 1000,
        shares_prev: prev.shares,
        weight_prev: totalValuePrev > 0
          ? Math.round((prev.value * 1000 / totalValuePrev) * 10000) / 100
          : null,
        status: 'SOLD OUT',
        shares_change_pct: -100,
        ticker_source: mapping?.source || 'unmapped',
      });
    }
  }

  // 비중 기준 내림차순 정렬 (현재 비중 → 이전 비중)
  result.sort((a, b) => {
    if (b.weight_curr !== a.weight_curr) return b.weight_curr - a.weight_curr;
    return (b.weight_prev || 0) - (a.weight_prev || 0);
  });

  return result;
}

/**
 * 상태별 통계 출력
 */
export function printComparisonStats(holdings: PortfolioHolding[]) {
  const stats = {
    'NEW BUY': holdings.filter(h => h.status === 'NEW BUY'),
    'SOLD OUT': holdings.filter(h => h.status === 'SOLD OUT'),
    'ADD': holdings.filter(h => h.status === 'ADD'),
    'TRIM': holdings.filter(h => h.status === 'TRIM'),
    'HOLD': holdings.filter(h => h.status === 'HOLD'),
  };

  console.log(`\n[비교 결과]`);
  console.log(`  총 종목: ${holdings.length}개`);
  console.log(`  NEW BUY: ${stats['NEW BUY'].length}개`);
  console.log(`  SOLD OUT: ${stats['SOLD OUT'].length}개`);
  console.log(`  ADD (증가): ${stats['ADD'].length}개`);
  console.log(`  TRIM (감소): ${stats['TRIM'].length}개`);
  console.log(`  HOLD (유지): ${stats['HOLD'].length}개`);

  if (stats['NEW BUY'].length > 0) {
    console.log(`\n  [신규 매수]`);
    stats['NEW BUY'].forEach(h => {
      const v = h.value_curr >= 1e9 ? `$${(h.value_curr / 1e9).toFixed(2)}B` : `$${(h.value_curr / 1e6).toFixed(1)}M`;
      console.log(`    ${h.ticker || '???'} (${h.name_of_issuer}) - ${v} (${h.weight_curr}%)`);
    });
  }

  if (stats['SOLD OUT'].length > 0) {
    console.log(`\n  [전량 매도]`);
    stats['SOLD OUT'].forEach(h => {
      console.log(`    ${h.ticker || '???'} (${h.name_of_issuer})`);
    });
  }
}
