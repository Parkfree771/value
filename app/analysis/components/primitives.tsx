/**
 * 분석 페이지 프리미티브 컴포넌트
 * - Card: 차트/섹션 래퍼
 * - RichTooltip: 차트 툴팁 (다중 시리즈 지원)
 * - Sparkline: KPI 옆에 들어가는 미니차트
 * - KPIStat: 큰 숫자 + 라벨 + 스파크라인 + 트렌드
 * - InsightCard: 자동 생성된 내러티브 카드
 * - Stat: 작은 통계 한 줄
 */

import { ReactNode } from 'react';
import { COLOR, toneColor, type Tone } from '../theme';
import type { Insight } from '../insights';

/* ════════════════════════════ Card ════════════════════════════ */

export function Card({
  title,
  sub,
  right,
  children,
  className = '',
  tone,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  const accentBar = tone ? toneColor(tone).border : 'transparent';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] ${className}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {tone && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: accentBar }}
        />
      )}
      {(title || right) && (
        <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && (
              <h3 className="font-heading text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
                {title}
              </h3>
            )}
            {sub && (
              <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-snug">
                {sub}
              </p>
            )}
          </div>
          {right && <div className="flex-shrink-0">{right}</div>}
        </header>
      )}
      <div className={title ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </div>
  );
}

/* ═════════════════════ RichTooltip ═════════════════════ */

interface TooltipPayload {
  name: string;
  value: number | null;
  color: string;
  payload?: Record<string, unknown>;
}

export function RichTooltip({
  active,
  payload,
  label,
  fmt,
  hint,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  fmt?: (name: string, v: number) => string;
  hint?: (payload: TooltipPayload[]) => string | null;
}) {
  if (!active || !payload?.length) return null;
  const filtered = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (!filtered.length) return null;

  const hintText = hint ? hint(filtered) : null;

  return (
    <div
      className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] backdrop-blur-sm px-3.5 py-2.5 min-w-[180px]"
      style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)' }}
    >
      <p className="font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-2">
        {label}
      </p>
      <div className="space-y-1.5">
        {filtered.map((e, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-1.5 h-4 rounded-sm flex-shrink-0" style={{ background: e.color }} />
            <span className="font-sans text-xs text-gray-500 dark:text-gray-400">{e.name}</span>
            <span
              className="font-heading text-[13px] font-black tabular-nums ml-auto"
              style={{ color: e.color }}
            >
              {fmt ? fmt(e.name, e.value!) : String(e.value)}
            </span>
          </div>
        ))}
      </div>
      {hintText && (
        <p className="mt-2 pt-2 border-t border-[var(--theme-border-muted)] font-sans text-[10px] text-gray-400 leading-snug">
          {hintText}
        </p>
      )}
    </div>
  );
}

/* ═════════════════════ Sparkline ═════════════════════ */

export function Sparkline({
  values,
  color = COLOR.primary,
  width = 80,
  height = 28,
  area = true,
}: {
  values: (number | null)[];
  color?: string;
  width?: number;
  height?: number;
  area?: boolean;
}) {
  const valid = values.map((v) => (v === null ? NaN : v));
  const finite = valid.filter((v) => !isNaN(v));
  if (finite.length < 2) return <svg width={width} height={height} />;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min || 1;
  const stepX = width / (valid.length - 1);

  const points = valid.map((v, i) => {
    const x = i * stepX;
    const y = isNaN(v) ? null : height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => (p.y === null ? '' : `${i === 0 || points[i - 1].y === null ? 'M' : 'L'}${p.x},${p.y}`))
    .filter(Boolean)
    .join(' ');

  const areaPath = area
    ? `${linePath} L${width},${height} L0,${height} Z`
    : '';

  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {area && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${id})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* 마지막 점 */}
      {(() => {
        const lastPt = [...points].reverse().find((p) => p.y !== null);
        if (!lastPt) return null;
        return <circle cx={lastPt.x} cy={lastPt.y!} r={2} fill={color} />;
      })()}
    </svg>
  );
}

/* ═════════════════════ KPIStat ═════════════════════ */

export function KPIStat({
  label,
  value,
  hint,
  trend,
  trendLabel,
  spark,
  sparkColor,
  valueColor,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  trendLabel?: string;
  spark?: (number | null)[];
  sparkColor?: string;
  valueColor?: string;
}) {
  const trendColor =
    trend === null || trend === undefined
      ? COLOR.axis
      : trend > 0
      ? COLOR.positive
      : trend < 0
      ? COLOR.negative
      : COLOR.axis;

  const hasTrendRow = (trend !== null && trend !== undefined) || trendLabel || (spark && spark.length >= 2);

  return (
    <div className="relative">
      <p className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-1.5">
        {label}
      </p>
      <p
        className="font-heading text-2xl sm:text-[28px] font-black leading-none tabular-nums"
        style={{ color: valueColor || 'var(--foreground)' }}
      >
        {value}
      </p>
      {hasTrendRow && (
        <div className="flex items-center gap-2 mt-2">
          {trend !== null && trend !== undefined && (
            <span
              className="inline-flex items-center gap-0.5 font-heading text-[11px] font-bold tabular-nums"
              style={{ color: trendColor }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                {trend > 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                ) : trend < 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                )}
              </svg>
              {trend > 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
          )}
          {trendLabel && (
            <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500">{trendLabel}</span>
          )}
          {spark && spark.length >= 2 && (
            <div className="ml-auto">
              <Sparkline values={spark} color={sparkColor || COLOR.primary} width={64} height={22} />
            </div>
          )}
        </div>
      )}
      {hint && (
        <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 leading-snug">{hint}</p>
      )}
    </div>
  );
}

/* ═════════════════════ KPIStrip ═════════════════════ */

export function KPIStrip({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4 sm:gap-x-6 p-4 sm:p-5 rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {children}
    </div>
  );
}

/* ═════════════════════ InsightList ═════════════════════ */

export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {insights.map((ins, i) => {
        const tc = toneColor(ins.tone);
        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border"
            style={{ borderColor: tc.border, background: tc.bg }}
          >
            <span className="mt-0.5 flex-shrink-0" style={{ color: tc.text }}>
              {ins.tone === 'positive' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {ins.tone === 'negative' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {ins.tone === 'warning' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
                </svg>
              )}
              {ins.tone === 'neutral' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>
            <p className="font-sans text-[13px] sm:text-sm leading-relaxed text-[var(--foreground)] flex-1">
              {ins.text}
            </p>
            {ins.metric && (
              <span
                className="font-heading text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
                style={{ color: tc.text, background: tc.bg }}
              >
                {ins.metric}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════════ HighlightStat (성장 지표용) ═════════════════════ */

export function HighlightStat({
  label,
  value,
  unit = '',
  caption,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  tone: Tone;
}) {
  const tc = toneColor(tone);
  const isNumericLike = /^-?\d+(\.\d+)?$/.test(value);
  const isPositive = tone === 'positive';
  const isNegative = tone === 'negative';
  const showSign = isNumericLike && (isPositive || isNegative);
  const needsPlusSign = showSign && isPositive && !value.startsWith('-') && !value.startsWith('+');

  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <span
        className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
        style={{ background: tc.bg, color: tc.text }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          {tone === 'positive' && (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          )}
          {tone === 'negative' && (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          )}
          {tone === 'warning' && (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
          )}
          {tone === 'neutral' && (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          )}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <p
          className="font-heading text-xl sm:text-[22px] font-black tabular-nums leading-tight"
          style={{ color: tc.text }}
        >
          {needsPlusSign ? '+' : ''}
          {value}
          {unit && <span className="text-[13px] font-bold ml-0.5">{unit}</span>}
        </p>
        {caption && (
          <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug truncate">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

export function HighlightPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {children}
    </div>
  );
}

/* ═════════════════════ Pill ═════════════════════ */

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const tc = toneColor(tone);
  return (
    <span
      className="inline-flex items-center gap-1 font-heading text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
      style={{ color: tc.text, background: tc.bg, border: `1px solid ${tc.border}` }}
    >
      {children}
    </span>
  );
}
