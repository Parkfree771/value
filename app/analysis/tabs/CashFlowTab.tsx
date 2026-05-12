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

/* 현금흐름 탭 컬러 — 녹색 계열로 통일 (실적/부채와 차별화) */
const CF_COLOR = {
  ocf: '#059669',      // emerald-600 — 영업CF (들어오는 현금)
  capex: '#475569',    // slate-600 — CapEx (나가는 지출, 중립색)
  fcf: '#65a30d',      // lime-600 — FCF (남은 잉여)
  dividend: '#7c3aed', // violet — 배당 (회수 정기)
  buyback: '#F97316',  // orange — 자사주 (재량 환원)
};

export function CashFlowTab({ data, currency = 'KRW' }: { data: FinancialMetrics[]; currency?: Currency }) {
  const { main: fmtMain, axis: fmtAxis, unitLabel } = getCurrencyFmt(currency);
  if (data.length === 0) return null;
  const latest = data[data.length - 1];

  // CapEx 표시값: -investingCashFlow (투자 시 양수, 자산매각 시 음수)
  // 이렇게 하면 OCF − CapEx_display = OCF + IC = freeCashFlow 와 일관됨
  const chartData = data.map((d) => ({
    ...d,
    capexDisplay: d.investingCashFlow !== null ? -d.investingCashFlow : null,
  }));

  // 최신값 KPI
  const capexLatest = latest.investingCashFlow !== null ? -latest.investingCashFlow : null;
  const fcfMarginLatest =
    latest.freeCashFlow !== null && latest.revenue !== null && latest.revenue !== 0
      ? (latest.freeCashFlow / latest.revenue) * 100
      : null;

  // 기간 누적 비교 (팩트만)
  let ocfSum = 0, ocfCount = 0;
  let capexSum = 0, capexCount = 0;
  let fcfSum = 0, fcfCount = 0;
  let divSum = 0, divCount = 0;
  let buySum = 0, buyCount = 0;
  for (const d of data) {
    if (d.operatingCashFlow !== null) { ocfSum += d.operatingCashFlow; ocfCount++; }
    if (d.investingCashFlow !== null) { capexSum += -d.investingCashFlow; capexCount++; }
    if (d.freeCashFlow !== null) { fcfSum += d.freeCashFlow; fcfCount++; }
    if (d.dividendsPaid !== null) { divSum += d.dividendsPaid; divCount++; }
    if (d.stockBuyback !== null) { buySum += d.stockBuyback; buyCount++; }
  }
  const showComparison = ocfCount >= 2 && capexCount >= 2 && fcfCount >= 2 && capexSum > 0;
  const ocfCapexRatio = showComparison ? ocfSum / capexSum : null;

  // 주주환원: 배당 또는 자사주 데이터가 한 기간이라도 있으면 섹션 표시
  const hasShareholderReturn = divCount > 0 || buyCount > 0;
  const totalReturnSum = divSum + buySum;
  const returnVsFcfPct = fcfSum > 0 && totalReturnSum > 0 ? (totalReturnSum / fcfSum) * 100 : null;

  // 현금잔액 데이터 존재 여부
  const hasCashBalance = data.some((d) => d.cashBalance !== null);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPI Strip */}
      <KPIStrip>
        <KPIStat
          label="영업활동 CF"
          value={fmtMain(latest.operatingCashFlow)}
          hint="본업으로 만든 현금"
          valueColor={latest.operatingCashFlow !== null && latest.operatingCashFlow < 0 ? COLOR.negative : COLOR.primary}
        />
        <KPIStat
          label="CapEx (투자지출)"
          value={fmtMain(capexLatest)}
          hint="유·무형자산 투자"
        />
        <KPIStat
          label="잉여현금흐름 (FCF)"
          value={fmtMain(latest.freeCashFlow)}
          hint="영업CF − CapEx"
          valueColor={latest.freeCashFlow !== null && latest.freeCashFlow < 0 ? COLOR.negative : COLOR.positive}
        />
        <KPIStat
          label="FCF 마진"
          value={fmtPct(fcfMarginLatest)}
          hint="FCF ÷ 매출"
          valueColor={fcfMarginLatest !== null && fcfMarginLatest < 0 ? COLOR.negative : undefined}
        />
      </KPIStrip>

      {/* 메인 차트: OCF + CapEx + FCF (3-bar grouped) + 기간별 수치 부착 */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-2 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-sans text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
              영업CF · CapEx · 잉여현금흐름
            </h3>
            <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              추이 (단위: {unitLabel})
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
              <span className="w-2 h-2 rounded-full" style={{ background: CF_COLOR.ocf }} />
              영업CF
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
              <span className="w-2 h-2 rounded-full" style={{ background: CF_COLOR.capex }} />
              CapEx
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
              <span className="w-2 h-2 rounded-full" style={{ background: CF_COLOR.fcf }} />
              FCF
            </span>
          </div>
        </header>

        {/* Chart */}
        <div className="px-5 pb-4">
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%" barGap={3}>
                <defs>
                  <linearGradient id="grad-ocf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CF_COLOR.ocf} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={CF_COLOR.ocf} stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="grad-capex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CF_COLOR.capex} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={CF_COLOR.capex} stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="grad-fcf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CF_COLOR.fcf} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={CF_COLOR.fcf} stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                <Tooltip content={<RichTooltip fmt={(_, v) => fmtMain(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                <Bar dataKey="operatingCashFlow" name="영업CF" fill="url(#grad-ocf)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                <Bar dataKey="capexDisplay" name="CapEx" fill="url(#grad-capex)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                <Bar dataKey="freeCashFlow" name="FCF" fill="url(#grad-fcf)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
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
                label: '영업CF',
                highlight: 'negative',
                values: data.map((d) => fmtMain(d.operatingCashFlow)),
                signedValues: data.map((d) => d.operatingCashFlow),
              },
              {
                label: 'CapEx',
                values: chartData.map((d) => fmtMain(d.capexDisplay)),
                signedValues: chartData.map((d) => d.capexDisplay),
              },
              {
                label: 'FCF',
                highlight: 'negative',
                values: data.map((d) => fmtMain(d.freeCashFlow)),
                signedValues: data.map((d) => d.freeCashFlow),
              },
              {
                label: 'FCF 마진',
                highlight: 'negative',
                values: data.map((d) => {
                  if (d.freeCashFlow === null || d.revenue === null || d.revenue === 0) return null;
                  const m = (d.freeCashFlow / d.revenue) * 100;
                  return `${m >= 0 ? '' : ''}${m.toFixed(1)}%`;
                }),
                signedValues: data.map((d) => {
                  if (d.freeCashFlow === null || d.revenue === null || d.revenue === 0) return null;
                  return (d.freeCashFlow / d.revenue) * 100;
                }),
              },
              ...(hasCashBalance ? [{
                label: '현금잔액',
                values: data.map((d) => fmtMain(d.cashBalance)),
                signedValues: data.map((d) => d.cashBalance),
              }] : []),
            ]}
          />
        </div>
      </div>

      {/* 누적 비교 — 팩트만 (메인 차트 바로 아래) */}
      {showComparison && ocfCapexRatio !== null && (
        <div
          className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] px-5 py-4"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-2">
            누적 비교
          </p>
          <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-[var(--foreground)]">
            최근 {data.length}년 영업CF가 CapEx의{' '}
            <span
              className="font-bold"
              style={{ color: ocfCapexRatio >= 1 ? COLOR.positive : COLOR.negative }}
            >
              {ocfCapexRatio.toFixed(1)}배
            </span>
          </p>
          <p className="font-sans text-[12px] font-bold text-gray-600 dark:text-gray-300 mt-1.5">
            영업CF 합계 {fmtMain(ocfSum)} · CapEx 합계 {fmtMain(capexSum)} · 누적 FCF {fmtMain(fcfSum)}
          </p>
        </div>
      )}

      {/* 주주환원 차트: 배당 + 자사주 */}
      {hasShareholderReturn && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-sans text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
                주주환원 — 배당 · 자사주 매입
              </h3>
              <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                기간별 지급액 (단위: {unitLabel})
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: CF_COLOR.dividend }} />
                배당
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ background: CF_COLOR.buyback }} />
                자사주
              </span>
            </div>
          </header>

          <div className="px-5 pb-4">
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%" barGap={3}>
                  <defs>
                    <linearGradient id="grad-div" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CF_COLOR.dividend} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={CF_COLOR.dividend} stopOpacity={0.65} />
                    </linearGradient>
                    <linearGradient id="grad-buy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CF_COLOR.buyback} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={CF_COLOR.buyback} stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                  <Tooltip content={<RichTooltip fmt={(_, v) => fmtMain(v)} />} cursor={{ fill: COLOR.primaryAlpha }} />
                  <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                  <Bar dataKey="dividendsPaid" name="배당" fill="url(#grad-div)" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false} />
                  <Bar dataKey="stockBuyback" name="자사주" fill="url(#grad-buy)" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/40 px-5 py-4">
            <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-3">
              기간별 수치
            </p>
            <PeriodNumbersStrip
              periods={data.map((d) => d.period)}
              rows={[
                {
                  label: '배당',
                  values: data.map((d) => fmtMain(d.dividendsPaid)),
                  signedValues: data.map((d) => d.dividendsPaid),
                },
                {
                  label: '자사주',
                  values: data.map((d) => fmtMain(d.stockBuyback)),
                  signedValues: data.map((d) => d.stockBuyback),
                },
                {
                  label: '환원 합계',
                  values: data.map((d) => {
                    if (d.dividendsPaid === null && d.stockBuyback === null) return null;
                    return fmtMain((d.dividendsPaid ?? 0) + (d.stockBuyback ?? 0));
                  }),
                  signedValues: data.map((d) => {
                    if (d.dividendsPaid === null && d.stockBuyback === null) return null;
                    return (d.dividendsPaid ?? 0) + (d.stockBuyback ?? 0);
                  }),
                },
                {
                  label: '환원율',
                  values: data.map((d) => {
                    if ((d.dividendsPaid === null && d.stockBuyback === null) || d.netIncome === null || d.netIncome <= 0) return null;
                    const total = (d.dividendsPaid ?? 0) + (d.stockBuyback ?? 0);
                    return `${((total / d.netIncome) * 100).toFixed(0)}%`;
                  }),
                  signedValues: data.map((d) => {
                    if ((d.dividendsPaid === null && d.stockBuyback === null) || d.netIncome === null || d.netIncome <= 0) return null;
                    const total = (d.dividendsPaid ?? 0) + (d.stockBuyback ?? 0);
                    return (total / d.netIncome) * 100;
                  }),
                },
              ]}
            />
            <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">
              * 환원율 = (배당 + 자사주) ÷ 순이익
            </p>
          </div>
        </div>
      )}

      {/* 주주환원 누적 비교 — 팩트만 */}
      {hasShareholderReturn && totalReturnSum > 0 && (
        <div
          className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] px-5 py-4"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-2">
            주주환원 누적
          </p>
          <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-[var(--foreground)]">
            {returnVsFcfPct !== null ? (
              <>
                최근 {data.length}년 주주환원이 누적 FCF의{' '}
                <span className="font-bold" style={{ color: CF_COLOR.ocf }}>
                  {returnVsFcfPct.toFixed(0)}%
                </span>
              </>
            ) : (
              <>
                최근 {data.length}년 주주환원 합계{' '}
                <span className="font-bold" style={{ color: CF_COLOR.ocf }}>
                  {fmtMain(totalReturnSum)}
                </span>
              </>
            )}
          </p>
          <p className="font-sans text-[12px] font-bold text-gray-600 dark:text-gray-300 mt-1.5">
            주주환원 합계 {fmtMain(totalReturnSum)} · 배당 {fmtMain(divSum)} · 자사주 {fmtMain(buySum)}
          </p>
        </div>
      )}
    </div>
  );
}
