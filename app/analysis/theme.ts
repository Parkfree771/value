/**
 * 분석 페이지 디자인 시스템 (Bloomberg × Linear × Stripe)
 * - 컬러: 의미 기반 팔레트
 * - 포맷: 통화/퍼센트/배수 헬퍼
 * - 차트 공통 props
 */

/* ─────────────── COLOR ─────────────── */

export const COLOR = {
  // 주요 데이터
  primary: '#3b50b5',         // 매출/주력 지표
  primarySoft: '#6378d1',
  primaryAlpha: 'rgba(59, 80, 181, 0.08)',

  // 보조 시리즈
  series2: '#0891b2',          // cyan-600 영업이익
  series3: '#7c3aed',          // violet-600 순이익
  series4: '#db2777',          // pink-600 보조

  // 의미
  positive: '#059669',         // emerald-600
  positiveSoft: '#10b981',
  negative: '#dc2626',         // red-600
  negativeSoft: '#ef4444',
  warning: '#d97706',          // amber-600
  caution: '#ca8a04',          // yellow-600

  // 액센트
  accent: '#F97316',
  accentSoft: '#FB923C',

  // 구조
  axis: 'rgb(148 163 184)',    // slate-400
  axisSoft: 'rgba(148, 163, 184, 0.5)',
  grid: 'rgba(148, 163, 184, 0.12)',
  gridSoft: 'rgba(148, 163, 184, 0.06)',
} as const;

/** 양/음수에 따라 색 자동 선택 */
export function valueColor(v: number | null | undefined, opts?: { neutral?: string }): string {
  if (v === null || v === undefined) return opts?.neutral || COLOR.axis;
  if (v > 0) return COLOR.positive;
  if (v < 0) return COLOR.negative;
  return opts?.neutral || COLOR.axis;
}

/** 임계값 기반 색 (예: 부채비율 > 200 빨강) */
export function thresholdColor(v: number | null, good: number, bad: number, higherIsBetter = true): string {
  if (v === null) return COLOR.axis;
  if (higherIsBetter) {
    if (v >= good) return COLOR.positive;
    if (v < bad) return COLOR.negative;
  } else {
    if (v <= good) return COLOR.positive;
    if (v > bad) return COLOR.negative;
  }
  return 'var(--foreground)';
}

/* ─────────────── FORMAT ─────────────── */

/** 억원 단위 → 사람 읽기 쉽게 (1.2조 / 1,234억) */
export function fmtKRW(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}조`;
  return `${sign}${abs.toLocaleString()}억`;
}

/** 축용 짧은 KRW (12조 / 1.2조 / 800억) */
export function fmtKRWAxis(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(0)}조`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}천억`;
  return `${sign}${abs}억`;
}

/** 퍼센트 (옵션: 부호 표시) */
export function fmtPct(v: number | null | undefined, opts?: { sign?: boolean; digits?: number }): string {
  if (v === null || v === undefined) return '—';
  const d = opts?.digits ?? 1;
  const sign = opts?.sign && v > 0 ? '+' : '';
  return `${sign}${v.toFixed(d)}%`;
}

/** 배수 (1.2x) */
export function fmtX(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return '—';
  return `${v.toFixed(digits)}x`;
}

/** 가격 (1,234,567원) */
export function fmtPrice(v: number): string {
  return `${v.toLocaleString()}원`;
}

/** 큰 숫자 (1.2M, 3.4K) */
export function fmtCompact(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toString();
}

/* ─────────────── CHART PRESETS ─────────────── */

export const AXIS_TICK = {
  fontSize: 11,
  fontWeight: 600,
  fill: COLOR.axis,
} as const;

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: COLOR.grid,
  vertical: false,
} as const;

export const LEGEND_STYLE = {
  fontSize: 11,
  fontWeight: 700,
  paddingTop: 8,
  paddingBottom: 0,
} as const;

/* ─────────────── DOMAIN ─────────────── */

/** 배지 톤 (positive/negative/neutral) */
export type Tone = 'positive' | 'negative' | 'neutral' | 'warning';

export function toneColor(tone: Tone) {
  switch (tone) {
    case 'positive': return { bg: 'rgba(5, 150, 105, 0.1)', text: COLOR.positive, border: COLOR.positive };
    case 'negative': return { bg: 'rgba(220, 38, 38, 0.1)', text: COLOR.negative, border: COLOR.negative };
    case 'warning':  return { bg: 'rgba(217, 119, 6, 0.1)', text: COLOR.warning, border: COLOR.warning };
    default:         return { bg: 'rgba(148, 163, 184, 0.12)', text: 'var(--foreground)', border: COLOR.axisSoft };
  }
}
