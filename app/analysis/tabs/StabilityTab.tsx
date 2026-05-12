'use client';

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { FinancialMetrics } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, fmtPct, getCurrencyFmt, type Currency } from '../theme';
import {
  RichTooltip,
  KPIStat,
  KPIStrip,
  PeriodNumbersStrip,
} from '../components/primitives';

/* 부채 탭 컬러 */
const DEBT_COLOR = {
  debt: '#d97706',     // amber — 차입금
  cash: '#0891b2',     // cyan — 현금
  net: '#F97316',      // orange — 순차입금 (강조)
};

export function StabilityTab({ data, currency = 'KRW' }: { data: FinancialMetrics[]; currency?: Currency }) {
  const { main: fmtMain, axis: fmtAxis, unitLabel } = getCurrencyFmt(currency);
  if (data.length === 0) return null;
  const latest = data[data.length - 1];

  // 파생: 순차입금 + 자기자본비율 + 부채구조
  const chartData = data.map((d) => {
    const netDebt =
      d.longTermDebt !== null && d.cashBalance !== null
        ? d.longTermDebt - d.cashBalance
        : null;
    const equityRatio =
      d.totalEquity !== null && d.totalAssets !== null && d.totalAssets > 0
        ? (d.totalEquity / d.totalAssets) * 100
        : null;
    const nonCurrentLiabilities =
      d.totalLiabilities !== null && d.currentLiabilities !== null
        ? d.totalLiabilities - d.currentLiabilities
        : null;
    return { ...d, netDebt, equityRatio, nonCurrentLiabilities };
  });
  const latestE = chartData[chartData.length - 1];

  // 데이터 가용성
  const hasDebtData = data.some((d) => d.longTermDebt !== null);
  const hasCashData = data.some((d) => d.cashBalance !== null);
  const hasStructureData = data.some(
    (d) => d.currentLiabilities !== null && d.totalLiabilities !== null
  );

  // 부채 vs 현금 비교 (최신 기간)
  const debtCashRatio =
    latest.longTermDebt !== null && latest.cashBalance !== null && latest.cashBalance > 0
      ? latest.longTermDebt / latest.cashBalance
      : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPI Strip */}
      <KPIStrip>
        <KPIStat
          label="차입금"
          value={fmtMain(latest.longTermDebt)}
          hint="이자성 부채 (장기 + 1년내 만기)"
          valueColor={DEBT_COLOR.debt}
        />
        <KPIStat
          label="현금"
          value={fmtMain(latest.cashBalance)}
          hint="현금성 자산 잔액"
          valueColor={DEBT_COLOR.cash}
        />
        <KPIStat
          label="순차입금"
          value={fmtMain(latestE.netDebt)}
          hint="차입금 − 현금"
          valueColor={
            latestE.netDebt === null
              ? undefined
              : latestE.netDebt < 0
              ? COLOR.positive  // 현금 > 차입금 = 좋음
              : DEBT_COLOR.net
          }
        />
        <KPIStat
          label="부채비율"
          value={fmtPct(latest.debtRatio)}
          hint="부채총계 ÷ 자본"
          valueColor={
            latest.debtRatio === null
              ? undefined
              : latest.debtRatio > 200
              ? COLOR.negative
              : latest.debtRatio > 100
              ? COLOR.warning
              : COLOR.positive
          }
        />
      </KPIStrip>

      {/* 메인 차트: 차입금 · 현금 · 순차입금 */}
      {(hasDebtData || hasCashData) && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-sans text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
                차입금 · 현금 · 순차입금
              </h3>
              <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                기간별 잔액 (단위: {unitLabel})
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: DEBT_COLOR.debt }} />
                차입금
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: DEBT_COLOR.cash }} />
                현금
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: DEBT_COLOR.net }} />
                순차입금
              </span>
            </div>
          </header>

          <div className="px-5 pb-4">
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                  barCategoryGap="22%"
                  barGap={3}
                >
                  <defs>
                    <linearGradient id="grad-debt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DEBT_COLOR.debt} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={DEBT_COLOR.debt} stopOpacity={0.65} />
                    </linearGradient>
                    <linearGradient id="grad-cash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DEBT_COLOR.cash} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={DEBT_COLOR.cash} stopOpacity={0.65} />
                    </linearGradient>
                    <linearGradient id="grad-netdebt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DEBT_COLOR.net} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={DEBT_COLOR.net} stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                  <Tooltip content={<RichTooltip fmt={(_, v) => fmtMain(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                  <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                  <Bar dataKey="longTermDebt" name="차입금" fill="url(#grad-debt)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  <Bar dataKey="cashBalance" name="현금" fill="url(#grad-cash)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  <Bar dataKey="netDebt" name="순차입금" fill="url(#grad-netdebt)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 기간별 수치 */}
          <div className="border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/40 px-5 py-4">
            <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-3">
              기간별 수치
            </p>
            <PeriodNumbersStrip
              periods={data.map((d) => d.period)}
              rows={[
                {
                  label: '차입금',
                  values: data.map((d) => fmtMain(d.longTermDebt)),
                  signedValues: data.map((d) => d.longTermDebt),
                },
                {
                  label: '현금',
                  values: data.map((d) => fmtMain(d.cashBalance)),
                  signedValues: data.map((d) => d.cashBalance),
                },
                {
                  label: '순차입금',
                  highlight: 'negative',
                  values: chartData.map((d) => fmtMain(d.netDebt)),
                  signedValues: chartData.map((d) => d.netDebt),
                },
                {
                  label: '부채비율',
                  values: data.map((d) =>
                    d.debtRatio === null ? null : `${d.debtRatio.toFixed(0)}%`
                  ),
                  signedValues: data.map((d) => d.debtRatio),
                },
                {
                  label: '자본 비중',
                  values: chartData.map((d) =>
                    d.equityRatio === null ? null : `${d.equityRatio.toFixed(0)}%`
                  ),
                  signedValues: chartData.map((d) => d.equityRatio),
                },
              ]}
            />
            <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">
              * 순차입금 = 차입금 − 현금 (음수 = 현금이 차입금보다 많음)
            </p>
          </div>
        </div>
      )}

      {/* 부채 비교 — 팩트만 (메인 차트 바로 아래) */}
      {debtCashRatio !== null && latest.longTermDebt !== null && latest.cashBalance !== null && (
        <div
          className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] px-5 py-4"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-2">
            부채 비교
          </p>
          <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-[var(--foreground)]">
            현재 차입금이 현금의{' '}
            <span
              className="font-bold"
              style={{ color: debtCashRatio < 1 ? COLOR.positive : DEBT_COLOR.net }}
            >
              {debtCashRatio.toFixed(1)}배
            </span>
          </p>
          <p className="font-sans text-[12px] font-bold text-gray-600 dark:text-gray-300 mt-1.5">
            차입금 {fmtMain(latest.longTermDebt)} · 현금 {fmtMain(latest.cashBalance)} · 순차입금 {fmtMain(latestE.netDebt)}
          </p>
        </div>
      )}

      {/* 부채 구조 (유동 vs 비유동) */}
      {hasStructureData && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-sans text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
                부채 구조 — 유동 · 비유동
              </h3>
              <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                만기 구조 (단위: {unitLabel})
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: COLOR.negative }} />
                유동부채 (1년 내)
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: DEBT_COLOR.debt }} />
                비유동부채
              </span>
            </div>
          </header>

          <div className="px-5 pb-4">
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                  <Tooltip content={<RichTooltip fmt={(_, v) => fmtMain(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                  <Bar dataKey="currentLiabilities" name="유동부채" stackId="d" fill={COLOR.negative} fillOpacity={0.75} maxBarSize={48} isAnimationActive={false} />
                  <Bar dataKey="nonCurrentLiabilities" name="비유동부채" stackId="d" fill={DEBT_COLOR.debt} fillOpacity={0.7} maxBarSize={48} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
