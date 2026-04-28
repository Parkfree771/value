'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
} from 'recharts';
import type { FinancialMetrics } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, LEGEND_STYLE, fmtKRW, fmtKRWAxis, fmtPct, thresholdColor } from '../theme';
import { stabilityInsights } from '../insights';
import { Card, RichTooltip, KPIStat, KPIStrip, InsightList } from '../components/primitives';

export function StabilityTab({ data }: { data: FinancialMetrics[] }) {
  if (data.length === 0) return null;
  const latest = data[data.length - 1];
  const insights = stabilityInsights(data);

  const enriched = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        nonCurrentLiabilities:
          d.totalLiabilities !== null && d.currentLiabilities !== null
            ? d.totalLiabilities - d.currentLiabilities
            : null,
        shortTermRatio:
          d.currentLiabilities !== null && d.totalLiabilities !== null && d.totalLiabilities > 0
            ? Math.round((d.currentLiabilities / d.totalLiabilities) * 1000) / 10
            : null,
      })),
    [data]
  );

  const latestE = enriched[enriched.length - 1];

  return (
    <div className="space-y-4 sm:space-y-5">
      <KPIStrip>
        <KPIStat
          label="부채비율"
          value={fmtPct(latest.debtRatio)}
          hint={
            latest.debtRatio === null
              ? '부채 ÷ 자본'
              : latest.debtRatio > 200
              ? '재무 위험'
              : latest.debtRatio > 100
              ? '보통'
              : '안정'
          }
          valueColor={thresholdColor(latest.debtRatio, 100, 200, false)}
        />
        <KPIStat
          label="유동비율"
          value={fmtPct(latest.currentRatio)}
          hint={
            latest.currentRatio === null
              ? '유동자산 ÷ 유동부채'
              : latest.currentRatio < 100
              ? '유동성 부족'
              : latest.currentRatio >= 200
              ? '유동성 충분'
              : '적정'
          }
          valueColor={thresholdColor(latest.currentRatio, 200, 100, true)}
        />
        <KPIStat
          label="유동부채"
          value={fmtKRW(latest.currentLiabilities)}
          hint="1년 내 만기 도래"
        />
        <KPIStat
          label="유동부채 비중"
          value={fmtPct(latestE.shortTermRatio)}
          hint={latestE.shortTermRatio !== null && latestE.shortTermRatio > 70 ? '단기 부담 과다' : '장기부채 위주'}
          valueColor={thresholdColor(latestE.shortTermRatio, 50, 70, false)}
        />
      </KPIStrip>

      {insights.length > 0 && <InsightList insights={insights} />}

      {/* 단기 vs 장기 안정성 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Card title="유동비율" sub="유동자산 ÷ 유동부채 · 100% 이상 안전권">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine
                  y={100}
                  stroke={COLOR.negative}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: '100%', position: 'right', fill: COLOR.negative, fontSize: 10, fontWeight: 700 }}
                />
                <ReferenceLine
                  y={200}
                  stroke={COLOR.positive}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: '200%', position: 'right', fill: COLOR.positive, fontSize: 10, fontWeight: 700 }}
                />
                <Bar dataKey="currentRatio" name="유동비율" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.currentRatio === null
                          ? COLOR.axisSoft
                          : d.currentRatio >= 200
                          ? COLOR.positive
                          : d.currentRatio < 100
                          ? COLOR.negative
                          : COLOR.warning
                      }
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="부채비율" sub="부채총계 ÷ 자본총계 · 100% 이하 양호">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtPct(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine
                  y={100}
                  stroke={COLOR.warning}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: '100%', position: 'right', fill: COLOR.warning, fontSize: 10, fontWeight: 700 }}
                />
                <Bar dataKey="debtRatio" name="부채비율" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.debtRatio === null
                          ? COLOR.axisSoft
                          : d.debtRatio > 200
                          ? COLOR.negative
                          : d.debtRatio > 100
                          ? COLOR.warning
                          : COLOR.positive
                      }
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 부채 구조 (유동 vs 비유동) */}
      <Card title="부채 구조" sub="유동부채(1년 이내 만기) vs 비유동부채">
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={enriched} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={56} />
              <Tooltip content={<RichTooltip fmt={(_, v) => fmtKRW(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
              <Bar dataKey="currentLiabilities" name="유동부채" stackId="d" fill={COLOR.negative} fillOpacity={0.75} maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="nonCurrentLiabilities" name="비유동부채" stackId="d" fill={COLOR.warning} fillOpacity={0.55} maxBarSize={48} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 자산 = 부채 + 자본 */}
      <Card title="재무상태표 구성" sub="자산 = 부채 + 자본">
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={56} />
              <Tooltip content={<RichTooltip fmt={(_, v) => fmtKRW(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
              <Bar dataKey="totalLiabilities" name="부채" stackId="bs" fill={COLOR.negative} fillOpacity={0.4} maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="totalEquity" name="자본" stackId="bs" fill={COLOR.positive} fillOpacity={0.55} maxBarSize={48} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
