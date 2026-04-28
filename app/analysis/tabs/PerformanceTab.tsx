'use client';

import {
  ComposedChart,
  Bar,
  BarChart,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { FinancialMetrics } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, LEGEND_STYLE, fmtKRW, fmtKRWAxis, fmtPct } from '../theme';
import { performanceHighlights } from '../insights';
import { Card, RichTooltip, KPIStat, KPIStrip, HighlightStat, HighlightPanel } from '../components/primitives';

/** 막대 위 금액 라벨 (간략 표기: 540조 / 12조 / 8천억) */
function renderBarLabel(color: string) {
  // Recharts LabelList content prop expects a flexible signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function BarLabel(props: any) {
    const x = typeof props.x === 'number' ? props.x : 0;
    const y = typeof props.y === 'number' ? props.y : 0;
    const width = typeof props.width === 'number' ? props.width : 0;
    const value = typeof props.value === 'number' ? props.value : null;
    if (value === null) return <g />;
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fontSize={10}
        fontWeight={800}
        fill={color}
        style={{ fontFamily: 'inherit' }}
      >
        {fmtKRWAxis(value)}
      </text>
    );
  };
}

export function PerformanceTab({ data }: { data: FinancialMetrics[] }) {
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
          value={fmtKRW(latest.revenue)}
          trend={revYoY}
          trendLabel="전년 대비"
        />
        <KPIStat
          label="영업이익"
          value={fmtKRW(latest.operatingProfit)}
          trend={opYoY}
          trendLabel="전년 대비"
          valueColor={latest.operatingProfit !== null && latest.operatingProfit < 0 ? COLOR.negative : undefined}
        />
        <KPIStat
          label="순이익"
          value={fmtKRW(latest.netIncome)}
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

      {/* 메인 차트: 매출+영업이익+순이익 (3-bar grouped) */}
      <Card title="매출 · 영업이익 · 순이익" sub="추이 (단위: 억원)">
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%" barGap={3}>
              <defs>
                <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="grad-op" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.series2} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLOR.series2} stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="grad-ni" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.series3} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLOR.series3} stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={56} />
              <Tooltip content={<RichTooltip fmt={(_, v) => fmtKRW(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
              <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
              <Bar dataKey="revenue" name="매출액" fill="url(#grad-rev)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                <LabelList dataKey="revenue" position="top" content={renderBarLabel(COLOR.primary)} />
              </Bar>
              <Bar dataKey="operatingProfit" name="영업이익" fill="url(#grad-op)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                <LabelList dataKey="operatingProfit" position="top" content={renderBarLabel(COLOR.series2)} />
              </Bar>
              <Bar dataKey="netIncome" name="순이익" fill="url(#grad-ni)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                <LabelList dataKey="netIncome" position="top" content={renderBarLabel(COLOR.series3)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 핵심 성장 지표 — 메인 차트 밑 (한눈에 보이게) */}
      {(highlights.revenueCAGR || highlights.marginTrend || highlights.netIncomeStatus?.tone === 'negative') && (
        <HighlightPanel>
          {highlights.revenueCAGR && (
            <HighlightStat
              label="매출 CAGR"
              value={highlights.revenueCAGR.value.toFixed(1)}
              unit="%"
              caption={`${highlights.revenueCAGR.years}년 연평균 성장`}
              tone={highlights.revenueCAGR.tone}
            />
          )}
          {highlights.marginTrend && (
            <HighlightStat
              label="영업이익률 변화"
              value={highlights.marginTrend.value.toFixed(1)}
              unit="%p"
              caption={`최근 ${highlights.marginTrend.periods}개 기간 ${highlights.marginTrend.tone === 'positive' ? '개선' : '악화'}`}
              tone={highlights.marginTrend.tone}
            />
          )}
          {highlights.netIncomeStatus?.tone === 'negative' && (
            <HighlightStat
              label="순이익"
              value={highlights.netIncomeStatus.label}
              caption={`${latest.period} 적자 전환`}
              tone="negative"
            />
          )}
        </HighlightPanel>
      )}

      {/* 성장률 (메인 차트 바로 밑) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Card title="매출 성장률" sub="전년 대비 증감률">
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v, { sign: true })} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1.5} />
                <Bar dataKey="revenueGrowth" name="매출 성장률" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.revenueGrowth === null ? COLOR.axisSoft : d.revenueGrowth >= 0 ? COLOR.positive : COLOR.negative}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="영업이익 성장률" sub="전년 대비 증감률">
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v, { sign: true })} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1.5} />
                <Bar dataKey="profitGrowth" name="영업이익 성장률" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.profitGrowth === null ? COLOR.axisSoft : d.profitGrowth >= 0 ? COLOR.positive : COLOR.negative}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 영업이익률 추이 (마지막 — 추가 컨텍스트) */}
      {avgMargin !== null && (
        <Card title="영업이익률" sub={`평균 ${avgMargin.toFixed(1)}% — 본업의 수익성 추이`}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine y={avgMargin} stroke={COLOR.axis} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="operatingMargin" name="영업이익률" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.operatingMargin !== null && d.operatingMargin >= avgMargin ? COLOR.positive : COLOR.warning}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
