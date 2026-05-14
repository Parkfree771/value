'use client';

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { FinancialMetrics, SplitEvent } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, getCurrencyFmt, type Currency } from '../theme';
import {
  RichTooltip,
  KPIStat,
  KPIStrip,
  PeriodNumbersStrip,
} from '../components/primitives';

/* 주주환원 탭 컬러 — Violet 메인 (탭 색) + 차트별 독립 톤 */
const SH_COLOR = {
  buyback: '#7c3aed',     // 바이올렛 — 자사주매입 (탭 메인)
  buybackSoft: '#a78bfa',
  dividend: '#3b50b5',    // 인디고 — 배당
  dividendSoft: '#6378d1',
  shares: '#0891b2',      // 시안 — 주식수 (희석/감소 트렌드)
  sharesSoft: '#22d3ee',
  epsBasic: '#db2777',    // 핑크 — EPS 기본
  epsDiluted: '#9d174d',  // 핑크 진함 — EPS 희석
  sbc: '#d97706',         // 앰버 — SBC 비용
  sbcSoft: '#f59e0b',
};

/* ─────────────── 단위 포맷터 ─────────────── */

/** 주식수 포맷 (원시 주 단위 → 사람 읽기 쉽게) */
function fmtShares(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B주`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M주`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}K주`;
  return `${sign}${abs}주`;
}

/** 주식수 축용 (짧게) */
function fmtSharesAxis(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(0)}M`;
  return `${sign}${abs}`;
}

/** EPS 포맷 (currency에 따라 $X.XX / ₩X,XXX) */
function fmtEps(v: number | null | undefined, currency: Currency): string {
  if (v === null || v === undefined) return '—';
  if (currency === 'USD') {
    const sign = v < 0 ? '-' : '';
    return `${sign}$${Math.abs(v).toFixed(2)}`;
  }
  // KRW: 정수 + 콤마
  return `₩${v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

/** EPS 축용 — 부호 + 짧게 */
function fmtEpsAxis(v: number, currency: Currency): string {
  if (currency === 'USD') return `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(1)}`;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 10000) return `${sign}₩${Math.round(abs / 1000)}k`;
  return `${sign}₩${Math.round(abs).toLocaleString('ko-KR')}`;
}

/* ════════════════════════════════════════════════ */

/** 분할 이벤트 → 표시용 비율 문자열. 예: 10 → "10:1", 0.1 → "1:10" */
function fmtSplitRatio(ratio: number): string {
  if (ratio >= 1) {
    // 정수에 가까우면 정수로 표기, 아니면 소수1자리
    const rounded = Math.round(ratio);
    if (Math.abs(ratio - rounded) < 0.05) return `${rounded}:1`;
    return `${ratio.toFixed(2)}:1`;
  }
  const inv = 1 / ratio;
  const rounded = Math.round(inv);
  if (Math.abs(inv - rounded) < 0.05) return `1:${rounded}`;
  return `1:${inv.toFixed(2)}`;
}

export function ShareholderTab({
  data,
  currency = 'KRW',
  splits = [],
}: {
  data: FinancialMetrics[];
  currency?: Currency;
  splits?: SplitEvent[];
}) {
  const { main: fmtMain, axis: fmtAxis, unitLabel } = getCurrencyFmt(currency);
  if (data.length === 0) return null;
  const latest = data[data.length - 1];

  /* ── 분할 보정 / 미공시 점프 배지 (발행주식수·EPS 차트에 공통 사용) ── */
  const secSplits = splits.filter((s) => s.source === 'sec');
  const unverifiedJumps = splits.filter((s) => s.source === 'unverified');
  const splitBadges: ChartBadge[] = [];
  if (secSplits.length > 0) {
    splitBadges.push({
      kind: 'info',
      text: secSplits
        .map((s) => `${s.effectiveDate.slice(0, 7)} ${fmtSplitRatio(s.ratio)} ${s.ratio >= 1 ? '액면분할' : '액면병합'}`)
        .join(' · '),
      note: '이전 기간 수치는 분할 후 액면 기준으로 보정. 분할 전 시기는 일부 연도가 다른 액면일 수 있음.',
    });
  }
  if (unverifiedJumps.length > 0) {
    splitBadges.push({
      kind: 'warning',
      text: unverifiedJumps
        .map((s) => {
          const change = s.ratio >= 1 ? `${s.ratio.toFixed(2)}배 증가` : `${(1 / s.ratio).toFixed(2)}분의 1로 감소`;
          return `${s.effectiveDate.slice(0, 4)}년 발행주식수 ${change}`;
        })
        .join(' · '),
      note: '정형화된 분할 공시 데이터가 없어 자동 판별이 어렵습니다 — 액면분할·유상증자·합병·자본재구조화 등 사유일 수 있어 직접 확인이 필요합니다.',
    });
  }

  /* ── 데이터 존재 여부 ── */
  const hasBuyback = data.some((d) => d.stockBuyback !== null);
  const hasDividend = data.some((d) => d.dividendsPaid !== null);
  const hasShares = data.some((d) => d.sharesOutstanding !== null);
  const hasEps = data.some((d) => d.epsBasic !== null || d.epsDiluted !== null);
  const hasSbc = data.some((d) => d.shareBasedComp !== null);

  /* ── KPI: 최신 + 추세 ── */

  // 발행주식수 변동 (최신 vs 가장 오래된 유효값)
  const firstSharesIdx = data.findIndex((d) => d.sharesOutstanding !== null);
  const firstShares = firstSharesIdx >= 0 ? data[firstSharesIdx].sharesOutstanding : null;
  const lastShares = latest.sharesOutstanding;
  const sharesChangePct =
    firstShares !== null && lastShares !== null && firstShares !== 0
      ? ((lastShares - firstShares) / firstShares) * 100
      : null;
  // 비교 기간 길이 (sparkline + KPI hint)
  const periodsBetween = firstSharesIdx >= 0 ? data.length - 1 - firstSharesIdx : 0;

  // EPS 변화 (최신 vs 직전 기간)
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const epsYoY =
    prev?.epsDiluted && latest.epsDiluted
      ? ((latest.epsDiluted - prev.epsDiluted) / Math.abs(prev.epsDiluted)) * 100
      : null;

  /* ── 누적 합계 ── */
  let buybackSum = 0, buybackCount = 0;
  let divSum = 0, divCount = 0;
  let sbcSum = 0, sbcCount = 0;
  for (const d of data) {
    if (d.stockBuyback !== null) { buybackSum += d.stockBuyback; buybackCount++; }
    if (d.dividendsPaid !== null) { divSum += d.dividendsPaid; divCount++; }
    if (d.shareBasedComp !== null) { sbcSum += d.shareBasedComp; sbcCount++; }
  }
  const totalReturn = buybackSum + divSum;
  // 순(net) 주주환원 = (자사주 + 배당) - SBC
  const netReturn = totalReturn - sbcSum;
  const hasNetReturn = buybackCount >= 1 && sbcCount >= 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ─── KPI ─── */}
      <KPIStrip>
        <KPIStat
          label="자사주매입 (최근)"
          value={fmtMain(latest.stockBuyback)}
          hint={buybackCount >= 2 ? `${buybackCount}기간 누적 ${fmtMain(buybackSum)}` : undefined}
        />
        <KPIStat
          label="배당 (최근)"
          value={fmtMain(latest.dividendsPaid)}
          hint={divCount >= 2 ? `${divCount}기간 누적 ${fmtMain(divSum)}` : undefined}
        />
        <KPIStat
          label="EPS 희석 (최근, GAAP)"
          value={fmtEps(latest.epsDiluted, currency)}
          trend={epsYoY}
          trendLabel="전 기간 대비"
          valueColor={latest.epsDiluted !== null && latest.epsDiluted < 0 ? COLOR.negative : undefined}
        />
        <KPIStat
          label="발행주식수 (기말)"
          value={fmtShares(latest.sharesOutstanding)}
          trend={sharesChangePct}
          trendLabel={periodsBetween > 0 ? `${periodsBetween}기간 변화` : undefined}
          valueColor={
            sharesChangePct !== null && sharesChangePct < 0
              ? COLOR.positive // 주식수 감소 = 주주에게 우호적
              : sharesChangePct !== null && sharesChangePct > 0
              ? COLOR.negative
              : undefined
          }
        />
      </KPIStrip>

      {/* ─── 차트 1: 자사주매입액 ─── */}
      {hasBuyback && (
        <ChartCard
          title="자사주매입액"
          sub={`기간별 매입 금액 (단위: ${unitLabel})`}
          legend={[{ label: '자사주매입', color: SH_COLOR.buyback }]}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="18%">
                <defs>
                  <linearGradient id="sh-grad-buyback" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SH_COLOR.buyback} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={SH_COLOR.buyback} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                <Tooltip
                  content={<RichTooltip fmt={(_, v) => fmtMain(v)} />}
                  cursor={{ fill: 'rgba(124, 58, 237, 0.08)' }}
                />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                <Bar
                  dataKey="stockBuyback"
                  name="자사주매입"
                  fill="url(#sh-grad-buyback)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <NumbersTable
            periods={data.map((d) => d.period)}
            rows={[
              {
                label: '자사주매입',
                values: data.map((d) => fmtMain(d.stockBuyback)),
                signedValues: data.map((d) => d.stockBuyback),
              },
            ]}
          />
        </ChartCard>
      )}

      {/* ─── 차트 2: 배당 ─── */}
      {hasDividend && (
        <ChartCard
          title="배당 지급액"
          sub={`기간별 배당 (단위: ${unitLabel})`}
          legend={[{ label: '배당', color: SH_COLOR.dividend }]}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="18%">
                <defs>
                  <linearGradient id="sh-grad-div" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SH_COLOR.dividend} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={SH_COLOR.dividend} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                <Tooltip
                  content={<RichTooltip fmt={(_, v) => fmtMain(v)} />}
                  cursor={{ fill: 'rgba(59, 80, 181, 0.08)' }}
                />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                <Bar
                  dataKey="dividendsPaid"
                  name="배당"
                  fill="url(#sh-grad-div)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <NumbersTable
            periods={data.map((d) => d.period)}
            rows={[
              {
                label: '배당',
                values: data.map((d) => fmtMain(d.dividendsPaid)),
                signedValues: data.map((d) => d.dividendsPaid),
              },
              {
                label: '배당성향',
                values: data.map((d) => {
                  if (d.dividendsPaid === null || d.netIncome === null || d.netIncome <= 0) return null;
                  return `${((d.dividendsPaid / d.netIncome) * 100).toFixed(0)}%`;
                }),
                signedValues: data.map((d) => {
                  if (d.dividendsPaid === null || d.netIncome === null || d.netIncome <= 0) return null;
                  return (d.dividendsPaid / d.netIncome) * 100;
                }),
              },
            ]}
            footnote="* 배당성향 = 배당 ÷ 순이익"
          />
        </ChartCard>
      )}

      {/* ─── 차트 3: 발행주식수 ─── */}
      {hasShares && (
        <ChartCard
          title="발행주식수 (기말 기준)"
          sub="CommonStockSharesOutstanding · 자사주매입은 감소, 신주발행·SBC 베스팅은 증가"
          legend={[{ label: '발행주식수', color: SH_COLOR.shares }]}
          badges={splitBadges}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtSharesAxis}
                  width={56}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={<RichTooltip fmt={(_, v) => fmtShares(v)} />}
                  cursor={{ stroke: SH_COLOR.shares, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line
                  type="monotone"
                  dataKey="sharesOutstanding"
                  name="발행주식수"
                  stroke={SH_COLOR.shares}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: SH_COLOR.shares, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: SH_COLOR.shares, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <NumbersTable
            periods={data.map((d) => d.period)}
            rows={[
              {
                label: '발행주식수',
                values: data.map((d) => fmtShares(d.sharesOutstanding)),
                signedValues: data.map((d) => d.sharesOutstanding),
              },
              {
                label: '전기 대비',
                highlight: 'yoy',
                values: data.map((d, i) => {
                  const prv = i > 0 ? data[i - 1].sharesOutstanding : null;
                  if (prv === null || d.sharesOutstanding === null || prv === 0) return null;
                  // 주식수에서는 -가 주주에게 우호적 → yoy 색은 그대로 두되 의미는 라벨에 명시
                  const pct = ((d.sharesOutstanding - prv) / prv) * 100;
                  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
                }),
                signedValues: data.map((d, i) => {
                  const prv = i > 0 ? data[i - 1].sharesOutstanding : null;
                  if (prv === null || d.sharesOutstanding === null || prv === 0) return null;
                  return -((d.sharesOutstanding - prv) / prv) * 100; // 감소 = 양수(녹색)
                }),
              },
            ]}
            footnote="* 기말 시점 보통주 발행 잔량. 분기 모드는 분기말 기준."
          />
        </ChartCard>
      )}

      {/* ─── 차트 4: EPS ─── */}
      {hasEps && (
        <ChartCard
          title="EPS — 기본 · 희석 (GAAP)"
          sub={`주당순이익 (단위: ${currency === 'USD' ? 'USD/주' : '원/주'})`}
          legend={[
            { label: 'Basic (기본)', color: SH_COLOR.epsBasic },
            { label: 'Diluted (희석)', color: SH_COLOR.epsDiluted, dashed: true },
          ]}
          badges={splitBadges.filter((b) => b.kind === 'info')}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtEpsAxis(v, currency)}
                  width={currency === 'KRW' ? 64 : 52}
                />
                <Tooltip
                  content={<RichTooltip fmt={(_, v) => fmtEps(v, currency)} />}
                  cursor={{ stroke: SH_COLOR.epsBasic, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="epsBasic"
                  name="EPS Basic"
                  stroke={SH_COLOR.epsBasic}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: SH_COLOR.epsBasic, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: SH_COLOR.epsBasic, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="epsDiluted"
                  name="EPS Diluted"
                  stroke={SH_COLOR.epsDiluted}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: SH_COLOR.epsDiluted, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: SH_COLOR.epsDiluted, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <NumbersTable
            periods={data.map((d) => d.period)}
            rows={[
              {
                label: 'EPS Basic',
                highlight: 'negative',
                values: data.map((d) => fmtEps(d.epsBasic, currency)),
                signedValues: data.map((d) => d.epsBasic),
              },
              {
                label: 'EPS Diluted',
                highlight: 'negative',
                values: data.map((d) => fmtEps(d.epsDiluted, currency)),
                signedValues: data.map((d) => d.epsDiluted),
              },
            ]}
            footnote="* SEC가 보고한 GAAP 기준. 회사 IR 발표의 'Adjusted EPS'와 다를 수 있음."
          />
        </ChartCard>
      )}

      {/* ─── 차트 5: SBC ─── */}
      {hasSbc && (
        <ChartCard
          title="주식기반보상 비용 (SBC)"
          sub={`임직원에 부여한 RSU·옵션의 비용 인식액 (단위: ${unitLabel})`}
          legend={[{ label: 'SBC', color: SH_COLOR.sbc }]}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="18%">
                <defs>
                  <linearGradient id="sh-grad-sbc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SH_COLOR.sbc} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={SH_COLOR.sbc} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={56} />
                <Tooltip
                  content={<RichTooltip fmt={(_, v) => fmtMain(v)} />}
                  cursor={{ fill: 'rgba(217, 119, 6, 0.08)' }}
                />
                <ReferenceLine y={0} stroke={COLOR.axis} strokeWidth={1} />
                <Bar
                  dataKey="shareBasedComp"
                  name="SBC"
                  fill="url(#sh-grad-sbc)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <NumbersTable
            periods={data.map((d) => d.period)}
            rows={[
              {
                label: 'SBC 비용',
                values: data.map((d) => fmtMain(d.shareBasedComp)),
                signedValues: data.map((d) => d.shareBasedComp),
              },
              {
                label: 'SBC ÷ 매출',
                values: data.map((d) => {
                  if (d.shareBasedComp === null || d.revenue === null || d.revenue === 0) return null;
                  return `${((d.shareBasedComp / d.revenue) * 100).toFixed(1)}%`;
                }),
                signedValues: data.map((d) => {
                  if (d.shareBasedComp === null || d.revenue === null || d.revenue === 0) return null;
                  return (d.shareBasedComp / d.revenue) * 100;
                }),
              },
            ]}
            footnote="* GAAP 기준 비용 인식액. 부여 시점 가치를 베스팅 기간에 걸쳐 분할 비용 처리."
          />
        </ChartCard>
      )}

      {/* ─── 누적 비교 — 팩트만 ─── */}
      {hasNetReturn && totalReturn > 0 && (
        <div
          className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] px-5 py-4"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-2">
            누적 비교
          </p>
          <p className="font-sans text-[14px] sm:text-[15px] font-bold leading-relaxed text-[var(--foreground)]">
            최근 {data.length}기간 (자사주 + 배당) 합계{' '}
            <span className="font-bold" style={{ color: SH_COLOR.buyback }}>
              {fmtMain(totalReturn)}
            </span>
            , SBC 비용 합계{' '}
            <span className="font-bold" style={{ color: SH_COLOR.sbc }}>
              {fmtMain(sbcSum)}
            </span>
          </p>
          <p className="font-sans text-[12px] font-bold text-gray-600 dark:text-gray-300 mt-1.5">
            (자사주 + 배당) − SBC ={' '}
            <span style={{ color: netReturn >= 0 ? COLOR.positive : COLOR.negative }}>
              {fmtMain(netReturn)}
            </span>
            {' · '}
            자사주 {fmtMain(buybackSum)} · 배당 {fmtMain(divSum)} · SBC {fmtMain(sbcSum)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ────────────────────── 차트 카드 (헤더 + 본문 + 수치표 한 묶음) ────────────────────── */

type ChartBadge = {
  kind: 'info' | 'warning';
  text: string;
  note?: string;
};

function ChartCard({
  title,
  sub,
  legend,
  badges,
  children,
}: {
  title: string;
  sub?: string;
  legend?: { label: string; color: string; dashed?: boolean }[];
  /** 차트 헤더 아래 강조 표기 — info(분할 보정) / warning(미공시 점프) */
  badges?: ChartBadge[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-sans text-sm sm:text-[15px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
            {title}
          </h3>
          {sub && (
            <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              {sub}
            </p>
          )}
        </div>
        {legend && legend.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold">
            {legend.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                {l.dashed ? (
                  <span
                    className="w-3 h-[2px] rounded-sm flex-shrink-0"
                    style={{
                      background: `repeating-linear-gradient(90deg, ${l.color} 0 4px, transparent 4px 7px)`,
                    }}
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
                )}
                {l.label}
              </span>
            ))}
          </div>
        )}
      </header>
      {badges && badges.length > 0 && (
        <div className="mx-5 mt-1 mb-2 flex flex-col gap-1.5">
          {badges.map((b, i) => {
            const styles = b.kind === 'warning'
              ? {
                  border: 'border-amber-300 dark:border-amber-700/60',
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                  iconColor: 'text-amber-600 dark:text-amber-400',
                  textColor: 'text-amber-800 dark:text-amber-300',
                  noteColor: 'text-amber-700/80 dark:text-amber-400/80',
                  iconPath: 'M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z',
                }
              : {
                  border: 'border-violet-200 dark:border-violet-900/50',
                  bg: 'bg-violet-50 dark:bg-violet-900/20',
                  iconColor: 'text-violet-600 dark:text-violet-400',
                  textColor: 'text-violet-700 dark:text-violet-300',
                  noteColor: 'text-violet-600/80 dark:text-violet-400/80',
                  iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                };
            return (
              <div
                key={i}
                className={`inline-flex items-start gap-2 px-3 py-2 rounded-lg border ${styles.border} ${styles.bg}`}
              >
                <svg
                  className={`w-3.5 h-3.5 mt-[2px] flex-shrink-0 ${styles.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={styles.iconPath} />
                </svg>
                <p className={`font-sans text-[11px] font-bold leading-snug ${styles.textColor}`}>
                  <span className="block">{b.text}</span>
                  {b.note && (
                    <span className={`block font-normal mt-0.5 ${styles.noteColor}`}>{b.note}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <div className="px-5 pb-4">{children}</div>
    </div>
  );
}

/* ────────────────────── 수치표 (차트 하단) ────────────────────── */

function NumbersTable({
  periods,
  rows,
  footnote,
}: {
  periods: string[];
  rows: {
    label: string;
    values: (string | null)[];
    signedValues?: (number | null)[];
    highlight?: 'yoy' | 'negative' | 'plain';
  }[];
  footnote?: string;
}) {
  return (
    <div className="border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/40 px-5 py-4">
      <p className="font-sans text-[12px] font-bold tracking-tight text-gray-600 dark:text-gray-300 mb-3">
        기간별 수치
      </p>
      <PeriodNumbersStrip periods={periods} rows={rows} />
      {footnote && (
        <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">{footnote}</p>
      )}
    </div>
  );
}
