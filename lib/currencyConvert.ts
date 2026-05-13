/**
 * 통화 변환 유틸 — SEC 데이터(백만 USD) → 한국 형식(억원)
 *
 * 단위 변환 수학:
 *   1 백만 USD = (rate) 백만 KRW
 *   1 억원 = 100 백만 KRW
 *   ∴ N 백만 USD = N × rate 백만 KRW = N × (rate / 100) 억원
 *
 * 비율 지표(%, 영업이익률/ROE/부채비율/성장률 등)는 통화 무관 → 그대로 유지.
 */

import type { FinancialMetrics } from '@/app/analysis/types';

/** 백만 USD → 억원 */
export function millionsUsdToEokKrw(millionsUsd: number | null, usdToKrwRate: number): number | null {
  if (millionsUsd === null || !Number.isFinite(millionsUsd)) return null;
  return Math.round((millionsUsd * usdToKrwRate) / 100);
}

/** USD/주 (EPS) → KRW/주 — 단위 보존, 환율 곱하기만 */
function epsUsdToKrw(eps: number | null, usdToKrwRate: number): number | null {
  if (eps === null || !Number.isFinite(eps)) return null;
  return Math.round(eps * usdToKrwRate * 10) / 10; // 소수 1자리
}

/** FinancialMetrics 배열 전체를 USD → KRW 변환 (절대값만, 비율은 그대로) */
export function convertMetricsToKRW(
  metrics: FinancialMetrics[],
  usdToKrwRate: number,
): FinancialMetrics[] {
  return metrics.map((m) => ({
    ...m,
    revenue: millionsUsdToEokKrw(m.revenue, usdToKrwRate),
    operatingProfit: millionsUsdToEokKrw(m.operatingProfit, usdToKrwRate),
    netIncome: millionsUsdToEokKrw(m.netIncome, usdToKrwRate),
    totalAssets: millionsUsdToEokKrw(m.totalAssets, usdToKrwRate),
    totalLiabilities: millionsUsdToEokKrw(m.totalLiabilities, usdToKrwRate),
    totalEquity: millionsUsdToEokKrw(m.totalEquity, usdToKrwRate),
    currentAssets: millionsUsdToEokKrw(m.currentAssets, usdToKrwRate),
    currentLiabilities: millionsUsdToEokKrw(m.currentLiabilities, usdToKrwRate),
    operatingCashFlow: millionsUsdToEokKrw(m.operatingCashFlow, usdToKrwRate),
    investingCashFlow: millionsUsdToEokKrw(m.investingCashFlow, usdToKrwRate),
    financingCashFlow: millionsUsdToEokKrw(m.financingCashFlow, usdToKrwRate),
    freeCashFlow: millionsUsdToEokKrw(m.freeCashFlow, usdToKrwRate),
    dividendsPaid: millionsUsdToEokKrw(m.dividendsPaid, usdToKrwRate),
    stockBuyback: millionsUsdToEokKrw(m.stockBuyback, usdToKrwRate),
    cashBalance: millionsUsdToEokKrw(m.cashBalance, usdToKrwRate),
    longTermDebt: millionsUsdToEokKrw(m.longTermDebt, usdToKrwRate),
    // 주주환원 — SBC는 금액(억원), EPS는 KRW/주, 주식수는 그대로(통화 무관)
    shareBasedComp: millionsUsdToEokKrw(m.shareBasedComp, usdToKrwRate),
    sharesOutstanding: m.sharesOutstanding,
    epsBasic: epsUsdToKrw(m.epsBasic, usdToKrwRate),
    epsDiluted: epsUsdToKrw(m.epsDiluted, usdToKrwRate),
    // 비율 그대로 유지: operatingMargin, netMargin, revenueGrowth, profitGrowth,
    //                  debtRatio, currentRatio, roe, roa
  }));
}

export interface ExchangeRateInfo {
  rate: number;
  date: string;
  source: 'frankfurter' | 'naver';
  fetchedAt: string;
  cached?: boolean;
}
