/**
 * 데이터 → 내러티브 자동 생성
 * 각 탭별로 가장 흥미로운 한두 줄을 뽑아낸다.
 */

import type { FinancialMetrics } from './types';
import type { Tone } from './theme';

export interface Insight {
  text: string;
  tone: Tone;
  metric?: string;
}

const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

const cagr = (first: number, last: number, years: number): number | null => {
  if (first <= 0 || last <= 0 || years <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
};

/* ─────── 실적 ─────── */

export function performanceInsights(data: FinancialMetrics[]): Insight[] {
  if (data.length < 2) return [];
  const out: Insight[] = [];
  const latest = last(data)!;
  const first = data[0];

  // 매출 CAGR
  if (first.revenue && latest.revenue && data.length >= 3) {
    const yearsSpan = latest.year - first.year;
    const c = cagr(first.revenue, latest.revenue, yearsSpan);
    if (c !== null) {
      out.push({
        text: `매출 ${yearsSpan}년 연평균 ${c >= 0 ? '+' : ''}${c.toFixed(1)}% ${c >= 0 ? '성장' : '감소'}`,
        tone: c >= 5 ? 'positive' : c < 0 ? 'negative' : 'neutral',
        metric: 'CAGR',
      });
    }
  }

  // 최근 영업이익률 추세
  const recentMargins = data.slice(-3).map(d => d.operatingMargin).filter((v): v is number => v !== null);
  if (recentMargins.length >= 2) {
    const trend = recentMargins[recentMargins.length - 1] - recentMargins[0];
    if (Math.abs(trend) >= 1) {
      out.push({
        text: `영업이익률 ${trend > 0 ? '개선' : '악화'} ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%p (최근 3개 기간)`,
        tone: trend > 0 ? 'positive' : 'negative',
      });
    }
  }

  // 적자 여부
  if (latest.netIncome !== null && latest.netIncome < 0) {
    out.push({ text: `${latest.period} 순손실 발생`, tone: 'negative' });
  }

  return out.slice(0, 2);
}

/* ─────── 실적 — 구조화된 성장 지표 (한눈에 보기용) ─────── */

export interface PerformanceHighlights {
  revenueCAGR: { value: number; years: number; tone: 'positive' | 'negative' | 'neutral' } | null;
  marginTrend: { value: number; periods: number; tone: 'positive' | 'negative' } | null;
  netIncomeStatus: { tone: 'positive' | 'negative'; label: string } | null;
}

export function performanceHighlights(data: FinancialMetrics[]): PerformanceHighlights {
  const result: PerformanceHighlights = { revenueCAGR: null, marginTrend: null, netIncomeStatus: null };
  if (data.length < 2) return result;
  const latest = last(data)!;
  const first = data[0];

  if (first.revenue && latest.revenue && data.length >= 3) {
    const yearsSpan = latest.year - first.year;
    const c = cagr(first.revenue, latest.revenue, yearsSpan);
    if (c !== null) {
      result.revenueCAGR = {
        value: c,
        years: yearsSpan,
        tone: c >= 5 ? 'positive' : c < 0 ? 'negative' : 'neutral',
      };
    }
  }

  const recent = data.slice(-3).map(d => d.operatingMargin).filter((v): v is number => v !== null);
  if (recent.length >= 2) {
    const diff = recent[recent.length - 1] - recent[0];
    if (Math.abs(diff) >= 0.5) {
      result.marginTrend = { value: diff, periods: recent.length, tone: diff > 0 ? 'positive' : 'negative' };
    }
  }

  if (latest.netIncome !== null) {
    result.netIncomeStatus = latest.netIncome < 0
      ? { tone: 'negative', label: '순손실' }
      : { tone: 'positive', label: '순이익 흑자' };
  }

  return result;
}

/* ─────── 수익성 ─────── */

export function profitabilityInsights(data: FinancialMetrics[]): Insight[] {
  if (data.length < 2) return [];
  const out: Insight[] = [];
  const latest = last(data)!;

  // ROE 평가
  if (latest.roe !== null) {
    if (latest.roe >= 15) {
      out.push({ text: `ROE ${latest.roe.toFixed(1)}% — 자기자본 수익성 우수 (10% 기준 초과)`, tone: 'positive' });
    } else if (latest.roe >= 10) {
      out.push({ text: `ROE ${latest.roe.toFixed(1)}% — 자기자본 수익성 양호`, tone: 'positive' });
    } else if (latest.roe < 0) {
      out.push({ text: `ROE ${latest.roe.toFixed(1)}% — 자본잠식 우려`, tone: 'negative' });
    } else if (latest.roe < 5) {
      out.push({ text: `ROE ${latest.roe.toFixed(1)}% — 자기자본 수익성 저조`, tone: 'warning' });
    }
  }

  // 마진 갭 (영업↔순)
  if (latest.operatingMargin !== null && latest.netMargin !== null) {
    const gap = latest.operatingMargin - latest.netMargin;
    if (gap >= 5) {
      out.push({ text: `영업이익률·순이익률 격차 ${gap.toFixed(1)}%p — 이자·법인세 부담 큼`, tone: 'warning' });
    }
  }

  return out.slice(0, 2);
}

/* ─────── 안정성 ─────── */

export function stabilityInsights(data: FinancialMetrics[]): Insight[] {
  if (data.length === 0) return [];
  const out: Insight[] = [];
  const latest = last(data)!;

  if (latest.debtRatio !== null) {
    if (latest.debtRatio > 200) {
      out.push({ text: `부채비율 ${latest.debtRatio.toFixed(0)}% — 200% 초과 (재무 위험)`, tone: 'negative' });
    } else if (latest.debtRatio < 50) {
      out.push({ text: `부채비율 ${latest.debtRatio.toFixed(0)}% — 안정적 재무구조`, tone: 'positive' });
    }
  }

  if (latest.currentRatio !== null) {
    if (latest.currentRatio < 100) {
      out.push({ text: `유동비율 ${latest.currentRatio.toFixed(0)}% — 단기 유동성 부족`, tone: 'negative' });
    } else if (latest.currentRatio >= 200) {
      out.push({ text: `유동비율 ${latest.currentRatio.toFixed(0)}% — 단기 상환 능력 충분`, tone: 'positive' });
    }
  }

  return out.slice(0, 2);
}

/* ─────── 현금흐름 ─────── */

export function cashflowInsights(data: FinancialMetrics[]): Insight[] {
  if (data.length === 0) return [];
  const out: Insight[] = [];
  const latest = last(data)!;

  // FCF 흑자/적자
  if (latest.freeCashFlow !== null) {
    if (latest.freeCashFlow > 0) {
      out.push({ text: `FCF ${(latest.freeCashFlow / 10000).toFixed(1)}조 — 자체 자금 창출`, tone: 'positive' });
    } else {
      out.push({ text: `FCF 적자 — 외부 자금 의존 또는 투자 확대 국면`, tone: 'warning' });
    }
  }

  // 이익의 질 (영업CF / 순이익)
  if (latest.operatingCashFlow !== null && latest.netIncome !== null && latest.netIncome > 0) {
    const ratio = latest.operatingCashFlow / latest.netIncome;
    if (ratio < 0.7) {
      out.push({ text: `영업CF가 순이익의 ${(ratio * 100).toFixed(0)}% — 이익의 질 낮음`, tone: 'warning' });
    } else if (ratio > 1.3) {
      out.push({ text: `영업CF가 순이익의 ${(ratio * 100).toFixed(0)}% — 이익의 질 우수`, tone: 'positive' });
    }
  }

  return out.slice(0, 2);
}
