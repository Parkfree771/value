'use client';

import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { FinancialMetrics } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, LEGEND_STYLE, fmtPct, thresholdColor } from '../theme';
import { profitabilityInsights } from '../insights';
import { Card, RichTooltip, KPIStat, KPIStrip, InsightList } from '../components/primitives';

export function ProfitabilityTab({ data }: { data: FinancialMetrics[] }) {
  if (data.length === 0) return null;
  const latest = data[data.length - 1];
  const insights = profitabilityInsights(data);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPI Strip */}
      <KPIStrip>
        <KPIStat
          label="영업이익률"
          value={fmtPct(latest.operatingMargin)}
          hint="매출 대비 영업이익"
          valueColor={thresholdColor(latest.operatingMargin, 10, 0)}
        />
        <KPIStat
          label="순이익률"
          value={fmtPct(latest.netMargin)}
          hint="매출 대비 당기순이익"
          valueColor={thresholdColor(latest.netMargin, 7, 0)}
        />
        <KPIStat
          label="ROE"
          value={fmtPct(latest.roe)}
          hint="자기자본 대비 순이익"
          valueColor={thresholdColor(latest.roe, 15, 0)}
        />
        <KPIStat
          label="ROA"
          value={fmtPct(latest.roa)}
          hint="총자산 대비 순이익"
          valueColor={thresholdColor(latest.roa, 5, 0)}
        />
      </KPIStrip>

      {insights.length > 0 && <InsightList insights={insights} />}

      {/* 마진 추이 */}
      <Card title="마진 추이" sub="영업이익률 · 순이익률 시계열">
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-om" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-nm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.series3} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COLOR.series3} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
              <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v)} />} cursor={{ stroke: COLOR.axisSoft, strokeWidth: 1 }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
              <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1.5} />
              <Area
                type="monotone"
                dataKey="operatingMargin"
                name="영업이익률"
                stroke={COLOR.primary}
                strokeWidth={2.5}
                fill="url(#grad-om)"
                dot={{ r: 3, fill: COLOR.primary, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="netMargin"
                name="순이익률"
                stroke={COLOR.series3}
                strokeWidth={2.5}
                fill="url(#grad-nm)"
                dot={{ r: 3, fill: COLOR.series3, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ROE / ROA */}
      <Card title="ROE / ROA" sub="자기자본·총자산 수익률 추이">
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-roe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0.15} />
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
      </Card>
    </div>
  );
}
