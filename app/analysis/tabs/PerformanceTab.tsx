'use client';

import {
  Bar,
  BarChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { FinancialMetrics } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, LEGEND_STYLE, fmtPct, getCurrencyFmt, type Currency } from '../theme';
import { performanceHighlights } from '../insights';
import {
  Card,
  RichTooltip,
  KPIStat,
  KPIStrip,
  HighlightStat,
  HighlightPanel,
  PeriodNumbersStrip,
} from '../components/primitives';

export function PerformanceTab({ data, currency = 'KRW' }: { data: FinancialMetrics[]; currency?: Currency }) {
  const { main: fmtMain, axis: fmtAxis, unitLabel } = getCurrencyFmt(currency);
  if (data.length === 0) return null;
  const latest = data[data.length - 1];
  const highlights = performanceHighlights(data);

  // 매출/영업이익 YoY (최신 시점)
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const revYoY =
    prev?.revenue && latest.revenue
      ? ((latest.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100
      : null;
  const opYoY =
    prev?.operatingProfit && latest.operatingProfit
      ? ((latest.operatingProfit - prev.operatingProfit) / Math.abs(prev.operatingProfit)) * 100
      : null;
  const niYoY =
    prev?.netIncome && latest.netIncome
      ? ((latest.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100
      : null;

  // 영업이익률 평균선
  const margins = data.map((d) => d.operatingMargin).filter((v): v is number => v !== null);
  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPI Strip */}
      <KPIStrip>
        <KPIStat
          label="매출액"
          value={fmtMain(latest.revenue)}
          trend={revYoY}
          trendLabel="전년 대비"
        />
        <KPIStat
          label="영업이익"
          value={fmtMain(latest.operatingProfit)}
          trend={opYoY}
          trendLabel="전년 대비"
          valueColor={latest.operatingProfit !== null && latest.operatingProfit < 0 ? COLOR.negative : undefined}
        />
        <KPIStat
          label="순이익"
          value={fmtMain(latest.netIncome)}
          trend={niYoY}
          trendLabel="전년 대비"
          valueColor={latest.netIncome !== null && latest.netIncome < 0 ? COLOR.negative : undefined}
        />
        <KPIStat
          label="영업이익률"
          value={fmtPct(latest.operatingMargin)}
          hint={avgMargin !== null ? `${data.length}년 평균 ${avgMargin.toFixed(1)}%` : undefined}
        />
      </KPIStrip>

      {/* 메인 차트: 매출+영업이익+순이익 (3-bar grouped) + 기간별 수치 부착 */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-2">
          <div className="min-w-0">
            <h3 className="font-sans text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
              매출 · 영업이익 · 순이익
            </h3>
            <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-snug">
              추이 (단위: {unitLabel})
            </p>
          </div>
        </header>

        {/* Chart */}
        <div className="px-5 pb-4">
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%" barGap={3}>
                <defs>
                  <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="grad-op" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.accent} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLOR.accent} stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="grad-ni" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.series3} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLOR.series3} stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtMain(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ ...LEGEND_STYLE, paddingTop: 0, paddingBottom: 4 }}
                />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                <Bar dataKey="revenue" name="매출액" fill="url(#grad-rev)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                <Bar dataKey="operatingProfit" name="영업이익" fill="url(#grad-op)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                <Bar dataKey="netIncome" name="순이익" fill="url(#grad-ni)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 기간별 수치 — 차트 박스에 붙어있지만 시각적으로 분리된 섹션 */}
        <div className="border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/40 px-5 py-4">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-3">
            기간별 수치
          </p>
          <PeriodNumbersStrip
            periods={data.map((d) => d.period)}
            rows={[
              {
                label: '매출 YoY',
                highlight: 'yoy',
                values: data.map((d) =>
                  d.revenueGrowth === null
                    ? null
                    : `${d.revenueGrowth > 0 ? '+' : ''}${d.revenueGrowth.toFixed(1)}%`
                ),
                signedValues: data.map((d) => d.revenueGrowth),
              },
              {
                label: '영업이익률',
                highlight: 'negative',
                values: data.map((d) => fmtPct(d.operatingMargin)),
                signedValues: data.map((d) => d.operatingMargin),
              },
              {
                label: '순이익률',
                highlight: 'negative',
                values: data.map((d) => fmtPct(d.netMargin)),
                signedValues: data.map((d) => d.netMargin),
              },
              {
                label: '매출액',
                values: data.map((d) => fmtMain(d.revenue)),
                signedValues: data.map((d) => d.revenue),
              },
              {
                label: '영업이익',
                highlight: 'negative',
                values: data.map((d) => fmtMain(d.operatingProfit)),
                signedValues: data.map((d) => d.operatingProfit),
              },
              {
                label: '순이익',
                highlight: 'negative',
                values: data.map((d) => fmtMain(d.netIncome)),
                signedValues: data.map((d) => d.netIncome),
              },
            ]}
          />
        </div>
      </div>

      {/* 핵심 성장 지표 — 메인 차트 밑 */}
      {(highlights.revenueCAGR || highlights.profitCAGR || highlights.marginTrend) && (
        <HighlightPanel>
          {highlights.revenueCAGR && (
            <HighlightStat
              label="매출 연평균 성장률"
              value={highlights.revenueCAGR.value.toFixed(1)}
              unit="%"
              caption={`${highlights.revenueCAGR.years}년 기준`}
              tone={highlights.revenueCAGR.tone}
            />
          )}
          {highlights.profitCAGR && (
            <HighlightStat
              label="영업이익 연평균 성장률"
              value={highlights.profitCAGR.value.toFixed(1)}
              unit="%"
              caption={`${highlights.profitCAGR.years}년 기준`}
              tone={highlights.profitCAGR.tone}
            />
          )}
          {highlights.marginTrend && (
            <HighlightStat
              label="영업이익률 변화"
              value={highlights.marginTrend.value.toFixed(1)}
              unit="%p"
              caption={`최근 ${highlights.marginTrend.periods}개 기간`}
              tone={highlights.marginTrend.tone}
            />
          )}
        </HighlightPanel>
      )}

      {/* 성장률 비교 — 팩트만 */}
      {highlights.growthGap && highlights.growthGap.higher !== 'equal' && (() => {
        const g = highlights.growthGap;
        const isOp = g.higher === 'operating';
        const gapColor = isOp ? COLOR.positive : COLOR.negative;
        const opStr = `${g.opCAGR >= 0 ? '+' : ''}${g.opCAGR.toFixed(1)}%`;
        const revStr = `${g.revCAGR >= 0 ? '+' : ''}${g.revCAGR.toFixed(1)}%`;
        return (
          <div
            className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] px-5 py-4"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-2">
              성장률 비교
            </p>
            <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-[var(--foreground)]">
              {isOp ? '영업이익 성장률' : '매출 성장률'}이 {isOp ? '매출 성장률' : '영업이익 성장률'}보다{' '}
              <span className="font-bold" style={{ color: gapColor }}>
                {Math.abs(g.gap).toFixed(1)}%p
              </span>{' '}
              높음
            </p>
            <p className="font-sans text-[12px] font-bold text-gray-600 dark:text-gray-300 mt-1.5">
              영업이익 {opStr} · 매출 {revStr}
            </p>
          </div>
        );
      })()}

      {/* ROE / ROA — 자본·자산 효율성 */}
      {data.some((d) => d.roe !== null || d.roa !== null) && (
        <Card title="ROE / ROA" sub="자기자본·총자산 수익률 추이">
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-roe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0.18} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1.5} />
                <ReferenceLine
                  y={10}
                  stroke={COLOR.positive}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: '우량 10%', position: 'right', fill: COLOR.positive, fontSize: 10, fontWeight: 700 }}
                />
                <Bar
                  dataKey="roe"
                  name="ROE"
                  fill="url(#grad-roe)"
                  stroke={COLOR.primary}
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="roa"
                  name="ROA"
                  stroke={COLOR.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: COLOR.accent, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] leading-relaxed">
            <div className="rounded-lg bg-[var(--theme-bg)]/50 border border-[var(--theme-border-muted)] p-3">
              <p className="font-bold text-[var(--foreground)] mb-1">
                ROE <span className="font-normal text-gray-500">(자기자본이익률)</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                당기순이익 ÷ 평균자본. 주주가 투자한 돈으로 얼마를 벌었는가. <b style={{ color: COLOR.positive }}>15%↑ 우량</b>
              </p>
            </div>
            <div className="rounded-lg bg-[var(--theme-bg)]/50 border border-[var(--theme-border-muted)] p-3">
              <p className="font-bold text-[var(--foreground)] mb-1">
                ROA <span className="font-normal text-gray-500">(총자산이익률)</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                당기순이익 ÷ 평균자산. 부채 포함 전체 자산을 얼마나 효율적으로 굴렸나. <b style={{ color: COLOR.positive }}>5%↑ 우량</b>
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
