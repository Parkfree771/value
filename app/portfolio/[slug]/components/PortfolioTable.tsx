'use client';

import { useMemo, useState } from 'react';
import { PortfolioHolding } from '@/lib/sec13f/types';
import { formatShares, formatUsd } from '@/lib/sec13f/format';
import { returnColorClass } from '@/components/front/ranking';
import { shortStockName } from '@/utils/reportDisplay';
import TrendIcon from '@/components/TrendIcon';

type FilterStatus = 'ALL' | 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'BUY_ALL' | 'SELL_ALL';
type SortType = 'default' | 'tradeSize';

interface PriceData {
  [ticker: string]: { currentPrice: number; returnRate: number };
}

interface PortfolioTableProps {
  holdings: PortfolioHolding[];
  prices?: PriceData;
  showPrices?: boolean; // false면 공시일 가격 · 현재가 · 수익률 숨김 (과거 분기용)
}

const SORT_LABELS: Record<SortType, string> = { default: '비중순', tradeSize: '매매 규모순' };
const SORT_KEYS = Object.keys(SORT_LABELS) as SortType[];

const STATUS_LABEL: Record<PortfolioHolding['status'], string> = {
  'NEW BUY': '신규매수',
  ADD: '비중확대',
  HOLD: '유지',
  TRIM: '비중축소',
  'SOLD OUT': '전량매도',
};
const STATUS_COLOR: Record<PortfolioHolding['status'], string> = {
  'NEW BUY': 'text-[var(--color-up)]',
  ADD: 'text-[var(--color-up)]',
  HOLD: 'text-[var(--theme-ink-soft)]',
  TRIM: 'text-[var(--color-down)]',
  'SOLD OUT': 'text-[var(--color-down)]',
};

const TAB_ACTIVE = 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)]';
const TAB_INACTIVE = 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] border-b-2 border-transparent';

// 열: 번호 · 종목 · 비중과 변동 · 주식 수(lg) · 평가액(sm) · 공시일 가격(md) · 현재가(md) · 수익률
const GRID_PRICES =
  'grid-cols-[1.25rem_minmax(0,1fr)_8.75rem_4rem] sm:grid-cols-[1.75rem_minmax(0,1fr)_11.5rem_5.5rem_5rem] md:grid-cols-[1.75rem_minmax(0,1fr)_11.5rem_5.5rem_6rem_6rem_5rem] lg:grid-cols-[1.75rem_minmax(0,1fr)_11.5rem_6rem_5.5rem_6rem_6rem_5rem]';
const GRID_PLAIN =
  'grid-cols-[1.25rem_minmax(0,1fr)_8.75rem] sm:grid-cols-[1.75rem_minmax(0,1fr)_11.5rem_5.5rem] lg:grid-cols-[1.75rem_minmax(0,1fr)_11.5rem_6rem_5.5rem]';
const ROW = 'grid items-center gap-x-2';
const NUM = 'text-right font-mono text-sm tabular-nums whitespace-nowrap';

const BAR_BASE = 'color-mix(in srgb, var(--foreground) 11%, transparent)';
const BAR_UP = 'color-mix(in srgb, var(--color-up) 42%, transparent)';
const BAR_DOWN = 'color-mix(in srgb, var(--color-down) 38%, transparent)';

/**
 * 이번 분기 매매 — 주식 수 변화를 분기 말 가격으로 환산한다 (비중 변화는 주가 영향이 섞이므로 쓰지 않는다).
 * amount: 산 금액(+) · 판 금액(-) / base · change: 막대의 기존 구간과 매매 구간 (비중 %)
 */
function tradeOf(h: PortfolioHolding) {
  const prevShares = h.shares_prev ?? 0;
  if (h.status === 'NEW BUY') return { amount: h.value_curr, base: 0, change: h.weight_curr };
  if (h.status === 'SOLD OUT') return { amount: -(h.value_prev ?? 0), base: 0, change: h.weight_prev ?? 0 };
  if (h.status === 'HOLD' || h.shares_curr <= 0) return { amount: 0, base: h.weight_curr, change: 0 };

  const ratio = Math.abs(h.shares_curr - prevShares) / h.shares_curr; // 현재 보유분 대비 매매 수량
  const amount = (h.shares_curr - prevShares) * (h.value_curr / h.shares_curr);
  const change = h.weight_curr * ratio;
  return h.status === 'ADD'
    ? { amount, base: Math.max(0, h.weight_curr - change), change: Math.min(change, h.weight_curr) }
    : { amount, base: h.weight_curr, change };
}

function WeightBar({ holding, scale }: { holding: PortfolioHolding; scale: number }) {
  const { base, change, amount } = tradeOf(holding);
  // 제곱근 눈금 — 비중이 1% 안팎인 종목도 길이가 보이도록
  const reach = (v: number) => Math.sqrt(v / scale) * 100;
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 flex">
      <span style={{ width: `${reach(base)}%`, background: BAR_BASE }} />
      {change > 0 && <span style={{ width: `${reach(base + change) - reach(base)}%`, background: amount > 0 ? BAR_UP : BAR_DOWN }} />}
    </div>
  );
}

const TRADE_LABEL: Record<PortfolioHolding['status'], string> = {
  'NEW BUY': '신규매수',
  ADD: '매수',
  HOLD: '유지',
  TRIM: '매도',
  'SOLD OUT': '전량매도',
};

/** 이번 분기에 사고판 금액 */
function TradeLabel({ holding }: { holding: PortfolioHolding }) {
  const { amount } = tradeOf(holding);
  if (amount === 0) return <>{TRADE_LABEL[holding.status]}</>;
  return (
    <>
      <TrendIcon direction={amount > 0 ? 'up' : 'down'} /> <span className="font-mono tabular-nums">{formatUsd(Math.abs(amount))}</span>{' '}
      {TRADE_LABEL[holding.status]}
    </>
  );
}

function filingPrice(h: PortfolioHolding): string {
  if (h.price_at_filing != null) return `$${h.price_at_filing.toFixed(2)}`;
  return h.shares_curr > 0 ? `$${(h.value_curr / h.shares_curr).toFixed(2)}` : '—';
}

/** 공시일 가격 대비 현재가 */
function ReturnValue({ holding, currentPrice }: { holding: PortfolioHolding; currentPrice?: number }) {
  const base = holding.price_at_filing;
  if (base == null || currentPrice == null || base <= 0) {
    return <span className="text-[var(--theme-ink-soft)]">—</span>;
  }
  const rate = Math.round(((currentPrice - base) / base) * 1000) / 10;
  return (
    <span className={`font-bold ${returnColorClass(rate)}`}>
      {rate > 0 ? '+' : ''}
      {rate.toFixed(1)}%
    </span>
  );
}

export default function PortfolioTable({ holdings, prices = {}, showPrices = true }: PortfolioTableProps) {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [sortType, setSortType] = useState<SortType>('default');

  const matches: Record<FilterStatus, (h: PortfolioHolding) => boolean> = {
    ALL: () => true,
    BUY_ALL: (h) => h.status === 'NEW BUY' || h.status === 'ADD',
    SELL_ALL: (h) => h.status === 'SOLD OUT' || h.status === 'TRIM',
    'NEW BUY': (h) => h.status === 'NEW BUY',
    ADD: (h) => h.status === 'ADD',
    'SOLD OUT': (h) => h.status === 'SOLD OUT',
    TRIM: (h) => h.status === 'TRIM',
  };
  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'BUY_ALL', label: '매수' },
    { key: 'SELL_ALL', label: '매도' },
    { key: 'NEW BUY', label: '신규매수' },
    { key: 'ADD', label: '비중확대' },
    { key: 'TRIM', label: '비중축소' },
    { key: 'SOLD OUT', label: '전량매도' },
  ];

  const filtered = useMemo(() => {
    const list = holdings.filter(matches[filter]);
    if (sortType === 'default') return list;
    return [...list].sort((a, b) => Math.abs(tradeOf(b).amount) - Math.abs(tradeOf(a).amount));
    // matches 는 상수 조건이라 filter 만 보면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, filter, sortType]);

  // 막대 길이 기준 — 필터를 바꿔도 같은 비중이면 같은 길이
  const scale = useMemo(
    () => Math.max(1, ...holdings.map((h) => tradeOf(h).base + tradeOf(h).change)),
    [holdings],
  );
  const grid = showPrices ? GRID_PRICES : GRID_PLAIN;

  return (
    <section aria-label="보유 종목" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-[var(--theme-border)]">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide text-sm">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`flex-shrink-0 pb-1.5 ${filter === f.key ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              {f.label} <span className="font-mono text-xs">{holdings.filter(matches[f.key]).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-shrink-0 gap-3 text-xs">
          {SORT_KEYS.map((s) => (
            <button key={s} onClick={() => setSortType(s)} aria-pressed={sortType === s} className={`pb-1.5 ${sortType === s ? 'font-bold text-[var(--foreground)]' : 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)]'}`}>
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* 막대 범례 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--theme-ink-soft)]">
        <span>막대는 비중</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-4" style={{ background: BAR_UP }} />이번 분기에 산 만큼</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-4" style={{ background: BAR_DOWN }} />이번 분기에 판 만큼</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--theme-ink-soft)]">해당 종목이 없습니다.</p>
      ) : (
        <div role="table" aria-label="보유 종목 목록" className="mt-1">
          <div role="row" className={`${ROW} ${grid} border-b border-[var(--theme-border-muted)] py-1.5 text-xs text-[var(--theme-ink-soft)]`}>
            <span role="columnheader">#</span>
            <span role="columnheader" className="pl-1.5">종목</span>
            <span role="columnheader" className="text-right">비중</span>
            <span role="columnheader" className="hidden lg:block text-right">주식 수</span>
            <span role="columnheader" className="hidden sm:block text-right">평가액</span>
            {showPrices && <span role="columnheader" className="hidden md:block text-right">공시일 가격</span>}
            {showPrices && <span role="columnheader" className="hidden md:block text-right">현재가</span>}
            {showPrices && <span role="columnheader" className="text-right">수익률</span>}
          </div>

          {filtered.map((h, i) => {
            const sold = h.status === 'SOLD OUT';
            const current = h.ticker ? prices[h.ticker]?.currentPrice : undefined;
            return (
              <div key={h.cusip} role="row" className={`${ROW} ${grid} min-h-[3rem] border-b border-[var(--theme-border-muted)] py-1`}>
                <span role="cell" className="font-mono text-xs tabular-nums text-[var(--theme-ink-soft)]">{i + 1}</span>
                <div role="cell" className="relative isolate min-w-0 py-1 pl-1.5">
                  <WeightBar holding={h} scale={scale} />
                  <p className={`font-mono text-sm font-bold ${sold ? 'text-[var(--theme-ink-soft)]' : ''}`}>{h.ticker || '—'}</p>
                  <p className="truncate text-xs text-[var(--theme-ink-soft)]">{shortStockName(h.name_of_issuer, h.ticker ?? undefined)}</p>
                </div>
                <div role="cell" title={STATUS_LABEL[h.status]} className="text-right whitespace-nowrap">
                  <p className="font-mono text-[15px] font-black tabular-nums">{h.weight_curr > 0 ? `${h.weight_curr.toFixed(2)}%` : '—'}</p>
                  <p className={`text-[13px] font-extrabold ${STATUS_COLOR[h.status]}`}>
                    <TradeLabel holding={h} />
                  </p>
                </div>
                <span role="cell" className={`${NUM} hidden lg:block`}>{h.shares_curr > 0 ? formatShares(h.shares_curr) : '—'}</span>
                <span role="cell" className={`${NUM} hidden sm:block`}>{h.value_curr > 0 ? formatUsd(h.value_curr) : '—'}</span>
                {showPrices && <span role="cell" className={`${NUM} hidden md:block`}>{filingPrice(h)}</span>}
                {showPrices && <span role="cell" className={`${NUM} hidden md:block`}>{current != null ? `$${current.toFixed(2)}` : '—'}</span>}
                {showPrices && (
                  <span role="cell" className={NUM}>
                    <ReturnValue holding={h} currentPrice={current} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
