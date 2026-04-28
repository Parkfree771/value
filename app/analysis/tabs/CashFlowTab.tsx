'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
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
import { COLOR, AXIS_TICK, GRID_PROPS, LEGEND_STYLE, fmtKRW, fmtKRWAxis, fmtX } from '../theme';
import { Card, RichTooltip, KPIStat, KPIStrip } from '../components/primitives';

/** 연도별 색상 — 가장 최신은 primary, 과거는 slate 그라데이션 */
const PERIOD_RAMP = ['#cbd5e1', '#94a3b8', '#64748b', '#475569', COLOR.primary];
function getPeriodColor(idx: number, total: number): string {
  if (idx === total - 1) return COLOR.primary;
  const offset = Math.max(0, PERIOD_RAMP.length - total);
  return PERIOD_RAMP[Math.min(idx + offset, PERIOD_RAMP.length - 2)];
}

/* 현금흐름 패턴 진단 */
interface PatternInfo {
  code: string;
  name: string;
  desc: string;
  color: string;
  long: string; // 자세한 한 줄 설명
}

function diagnoseCF(m: FinancialMetrics): PatternInfo {
  const o = m.operatingCashFlow,
    i = m.investingCashFlow,
    f = m.financingCashFlow;
  if (o === null || i === null || f === null)
    return { code: '?', name: '데이터 부족', desc: '', long: '', color: COLOR.axis };
  if (o > 0 && i < 0 && f < 0)
    return {
      code: 'A',
      name: '우량 성숙기업',
      desc: '영업으로 투자 + 부채상환',
      long: '본업으로 충분한 현금을 만들어 자체 투자와 차입금 상환을 동시에 해내는 가장 이상적인 상태입니다.',
      color: COLOR.positive,
    };
  if (o > 0 && i < 0 && f > 0)
    return {
      code: 'B',
      name: '고성장 투자',
      desc: '차입 포함 공격적 투자',
      long: '본업도 수익이지만 더 적극적인 성장을 위해 외부 자금까지 끌어와 투자에 쏟고 있습니다.',
      color: COLOR.primary,
    };
  if (o > 0 && i > 0 && f < 0)
    return {
      code: 'C',
      name: '구조조정',
      desc: '자산매각으로 부채상환',
      long: '본업과 자산매각으로 만든 현금을 부채 상환에 쓰는 슬림화 단계입니다.',
      color: COLOR.warning,
    };
  if (o < 0 && i < 0 && f > 0)
    return {
      code: 'E',
      name: '적자 투자',
      desc: '차입으로 적자 보전',
      long: '본업이 적자인 와중에 투자도 하면서 차입으로 버티는 위험한 상태입니다.',
      color: COLOR.negative,
    };
  if (o < 0 && i > 0 && f > 0)
    return {
      code: 'F',
      name: '위기',
      desc: '매각+차입으로 적자 보전',
      long: '본업 적자를 자산매각과 차입으로 동시에 막고 있는 매우 위험한 상태입니다.',
      color: COLOR.negative,
    };
  if (o < 0 && i > 0 && f < 0)
    return {
      code: 'G',
      name: '철수',
      desc: '자산매각으로 부채상환',
      long: '본업이 적자라 자산을 팔아 부채를 상환 중인 사업 축소 단계입니다.',
      color: COLOR.negative,
    };
  return { code: '-', name: '기타', desc: '', long: '', color: COLOR.axis };
}

export function CashFlowTab({ data }: { data: FinancialMetrics[] }) {
  if (data.length === 0) return null;
  const latest = data[data.length - 1];
  const pattern = diagnoseCF(latest);

  // 그룹드 바 차트 데이터: 활동별로 5년치 시리즈
  const periods = useMemo(() => data.map((d) => d.period), [data]);
  const groupedCFData = useMemo(() => {
    const sumNet = (d: FinancialMetrics) => {
      if (d.operatingCashFlow === null && d.investingCashFlow === null && d.financingCashFlow === null) return null;
      return (d.operatingCashFlow ?? 0) + (d.investingCashFlow ?? 0) + (d.financingCashFlow ?? 0);
    };
    const buildRow = (activity: string, getter: (d: FinancialMetrics) => number | null) =>
      data.reduce((acc, d) => ({ ...acc, [d.period]: getter(d) }), { activity });
    return [
      buildRow('영업활동', (d) => d.operatingCashFlow),
      buildRow('투자활동', (d) => d.investingCashFlow),
      buildRow('재무활동', (d) => d.financingCashFlow),
      buildRow('순현금변동', sumNet),
    ];
  }, [data]);

  const enriched = useMemo(() => {
    let cum = 0;
    return data.map((d) => {
      if (d.freeCashFlow !== null) cum += d.freeCashFlow;
      const ccr =
        d.operatingCashFlow !== null && d.operatingProfit !== null && d.operatingProfit !== 0
          ? Math.round((d.operatingCashFlow / d.operatingProfit) * 100) / 100
          : null;
      const capex = d.investingCashFlow !== null ? Math.abs(d.investingCashFlow) : null;
      const capexR =
        d.operatingCashFlow !== null && d.investingCashFlow !== null && d.operatingCashFlow > 0
          ? Math.round((Math.abs(d.investingCashFlow) / d.operatingCashFlow) * 1000) / 10
          : null;
      return {
        ...d,
        cumulativeFCF: d.freeCashFlow !== null ? cum : null,
        cashConversion: ccr,
        capex,
        capexRatio: capexR,
      };
    });
  }, [data]);

  const hasCFData =
    latest.operatingCashFlow !== null || latest.investingCashFlow !== null || latest.financingCashFlow !== null;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPI Strip */}
      <KPIStrip>
        <KPIStat
          label="영업활동 CF"
          value={fmtKRW(latest.operatingCashFlow)}
          hint="본업 현금 창출"
          valueColor={latest.operatingCashFlow !== null && latest.operatingCashFlow < 0 ? COLOR.negative : COLOR.primary}
        />
        <KPIStat
          label="투자활동 CF"
          value={fmtKRW(latest.investingCashFlow)}
          hint="유·무형자산 투자"
        />
        <KPIStat
          label="재무활동 CF"
          value={fmtKRW(latest.financingCashFlow)}
          hint="차입금·배당·자사주"
        />
        <KPIStat
          label="FCF (잉여현금흐름)"
          value={fmtKRW(latest.freeCashFlow)}
          hint="영업CF − 투자지출"
          valueColor={latest.freeCashFlow !== null && latest.freeCashFlow < 0 ? COLOR.negative : COLOR.positive}
        />
      </KPIStrip>

      {/* HERO: 활동별 현금흐름 (5년 그룹드 바) */}
      {hasCFData && (
        <Card title="활동별 현금흐름" sub={`최근 ${periods.length}년 — 영업·투자·재무 활동 추이`}>
          <div style={{ height: 420 }}>
            <ResponsiveContainer>
              <BarChart data={groupedCFData} margin={{ top: 18, right: 12, left: -4, bottom: 0 }} barCategoryGap="22%" barGap={2}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="activity"
                  tick={{ ...AXIS_TICK, fontSize: 13, fontWeight: 700, fill: 'var(--foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={56} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtKRW(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={2} />
                {periods.map((p, i) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    name={p}
                    fill={getPeriodColor(i, periods.length)}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 패턴 진단 (워터폴 아래) */}
      <PatternHero pattern={pattern} period={latest.period} />

      {/* 시계열: 영업·투자·재무 CF 추이 */}
      <Card title="현금흐름 추이" sub="활동별 시계열 (단위: 억원)">
        <div style={{ height: 290 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%" barGap={2}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={56} />
              <Tooltip content={<RichTooltip fmt={(_, v) => fmtKRW(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
              <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1.5} />
              <Bar dataKey="operatingCashFlow" name="영업활동" fill={COLOR.primary} fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
              <Bar dataKey="investingCashFlow" name="투자활동" fill={COLOR.warning} fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
              <Bar dataKey="financingCashFlow" name="재무활동" fill={COLOR.series3} fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* FCF + 누적 FCF */}
      <Card title="잉여현금흐름 (FCF)" sub="기간별 FCF + 누적 — 자체 자금 창출 능력">
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={enriched} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="grad-fcf-pos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.positive} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={COLOR.positive} stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="grad-fcf-neg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.negative} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={COLOR.negative} stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={56} />
              <Tooltip content={<RichTooltip fmt={(_, v) => fmtKRW(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
              <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
              <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1.5} />
              <Bar dataKey="freeCashFlow" name="기간 FCF" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                {enriched.map((e, i) => (
                  <Cell
                    key={i}
                    fill={
                      e.freeCashFlow === null
                        ? COLOR.axisSoft
                        : e.freeCashFlow >= 0
                        ? 'url(#grad-fcf-pos)'
                        : 'url(#grad-fcf-neg)'
                    }
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="cumulativeFCF"
                name="누적 FCF"
                stroke={COLOR.primary}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: COLOR.primary, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 품질 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card title="이익의 질" sub="영업CF ÷ 영업이익 · 1.0x 이상이면 이익이 현금으로 회수">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={enriched} margin={{ top: 10, right: 8, left: -10, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}x`} width={36} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtX(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine
                  y={1}
                  stroke={COLOR.positive}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: '1.0x', position: 'right', fill: COLOR.positive, fontSize: 10, fontWeight: 700 }}
                />
                <Bar dataKey="cashConversion" name="현금전환" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {enriched.map((e, i) => (
                    <Cell
                      key={i}
                      fill={e.cashConversion === null ? COLOR.axisSoft : e.cashConversion >= 1 ? COLOR.positive : COLOR.warning}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="CAPEX 비율" sub="투자지출 ÷ 영업CF · 투자 강도">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={enriched} margin={{ top: 10, right: 0, left: -8, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtKRWAxis} width={50} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
                <Tooltip content={<RichTooltip fmt={(n, v) => (n === 'CAPEX비율' ? `${v.toFixed(1)}%` : fmtKRW(v))} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <Bar yAxisId="left" dataKey="capex" name="투자지출" fill={COLOR.accent} fillOpacity={0.6} maxBarSize={42} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="capexRatio"
                  name="CAPEX비율"
                  stroke={COLOR.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.accent, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 패턴 변화 타임라인 */}
      <Card title="패턴 변화" sub="기간별 현금흐름 진단 코드">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {data.map((d) => {
            const p = diagnoseCF(d);
            const isLatest = d.period === latest.period;
            return (
              <div
                key={d.period}
                className={`flex-shrink-0 text-center w-[80px] rounded-xl px-1.5 py-2 ${
                  isLatest ? 'bg-[var(--theme-accent)]/5' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 mx-auto mb-2 flex items-center justify-center text-white font-black text-sm rounded-xl ${
                    isLatest ? 'shadow-md ring-2 ring-offset-2 ring-offset-[var(--theme-bg-card)]' : 'shadow-sm'
                  }`}
                  style={{ background: p.color, ...(isLatest && { boxShadow: `0 0 0 2px ${p.color}` }) }}
                >
                  {p.code}
                </div>
                <p className="font-heading text-[12px] font-black text-[var(--foreground)] tabular-nums">{d.period}</p>
                <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5 truncate">
                  {p.name}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ─────────── Pattern Hero ─────────── */

function PatternHero({ pattern, period }: { pattern: PatternInfo; period: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* 좌측 컬러 액센트 */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: pattern.color }}
      />

      <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 pl-5 sm:pl-6">
        {/* 코드 배지 */}
        <div
          className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-white font-black text-xl sm:text-2xl rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${pattern.color}, ${pattern.color}cc)`,
            boxShadow: `0 4px 12px ${pattern.color}40`,
          }}
        >
          {pattern.code}
        </div>

        {/* 본문 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
              현금흐름 패턴 진단
            </p>
            <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500">· {period}</span>
          </div>
          <div className="flex items-baseline gap-2 sm:gap-3 mt-1 flex-wrap">
            <p className="font-heading text-lg sm:text-xl font-black text-[var(--foreground)] leading-tight">
              {pattern.name}
            </p>
            {pattern.desc && (
              <p className="font-sans text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {pattern.desc}
              </p>
            )}
          </div>
          {pattern.long && (
            <p className="font-sans text-[12px] sm:text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 mt-2">
              {pattern.long}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
