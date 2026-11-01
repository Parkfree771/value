'use client';

import { useMemo, useState } from 'react';
import { PortfolioHolding } from '@/lib/sec13f/types';
import { formatShares, formatUsd } from '@/lib/sec13f/format';
import { returnColorClass } from '@/components/front/ranking';
import { shortStockName } from '@/utils/reportDisplay';

type FilterStatus = 'ALL' | 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'BUY_ALL' | 'SELL_ALL';
type SortType = 'default' | 'weightChange';

interface PriceData {
  [ticker: string]: { currentPrice: number; returnRate: number };
}

interface PortfolioTableProps {
  holdings: PortfolioHolding[];
  prices?: PriceData;
  showPrices?: boolean; // false면 공시일 가격 · 현재가 · 수익률 숨김 (과거 분기용)
}

const SORT_LABELS: Record<SortType, string> = { default: '비중순', weightChange: '비중 변화순' };
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
const TH = 'py-2 px-2 first:pl-0 last:pr-0 text-xs font-normal text-[var(--theme-ink-soft)] whitespace-nowrap';
const TD = 'py-2.5 px-2 first:pl-0 last:pr-0 font-mono text-sm tabular-nums text-right whitespace-nowrap';

function changeLabel(h: PortfolioHolding): string | null {
  if (h.status === 'NEW BUY' || h.status === 'SOLD OUT') return null;
  if (!h.shares_change_pct) return null;
  return `${h.shares_change_pct > 0 ? '+' : ''}${h.shares_change_pct.toFixed(1)}%`;
}

function filingPrice(h: PortfolioHolding): string {
  if (h.price_at_filing != null) return `$${h.price_at_filing.toFixed(2)}`;
  return h.shares_curr > 0 ? `$${(h.value_curr / h.shares_curr).toFixed(2)}` : '—';
}

/** 공시일 가격 대비 현재가 */
function ReturnCell({ holding, currentPrice }: { holding: PortfolioHolding; currentPrice?: number }) {
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
    const change = (h: PortfolioHolding) => (h.status === 'HOLD' ? 0 : Math.abs(h.weight_curr - (h.weight_prev ?? 0)));
    return [...list].sort((a, b) => change(b) - change(a));
    // matches 는 상수 조건이라 filter 만 보면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, filter, sortType]);

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

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--theme-ink-soft)]">해당 종목이 없습니다.</p>
      ) : (
        <table className="w-full table-fixed sm:table-auto">
          <thead>
            <tr className="border-b border-[var(--theme-border-muted)]">
              <th className={`${TH} hidden sm:table-cell w-8 text-left`}>#</th>
              <th className={`${TH} text-left`}>종목</th>
              <th className={`${TH} text-left w-[5.5rem] sm:w-auto`}>변동</th>
              <th className={`${TH} text-right hidden lg:table-cell`}>주식 수</th>
              <th className={`${TH} text-right hidden sm:table-cell`}>평가액</th>
              <th className={`${TH} text-right w-[4.25rem] sm:w-auto`}>비중</th>
              {showPrices && <th className={`${TH} text-right hidden md:table-cell`}>공시일 가격</th>}
              {showPrices && <th className={`${TH} text-right hidden md:table-cell`}>현재가</th>}
              {showPrices && <th className={`${TH} text-right w-[4.5rem] sm:w-auto`}>수익률</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => {
              const sold = h.status === 'SOLD OUT';
              const change = changeLabel(h);
              const current = h.ticker ? prices[h.ticker]?.currentPrice : undefined;
              return (
                <tr key={h.cusip} className="border-b border-[var(--theme-border-muted)] hover:bg-[var(--theme-bg-card)]">
                  <td className={`${TD} hidden sm:table-cell !text-left text-xs text-[var(--theme-ink-soft)]`}>{i + 1}</td>
                  <td className="py-2.5 px-2 first:pl-0 sm:max-w-[16rem]">
                    <p className={`font-mono text-sm font-bold ${sold ? 'text-[var(--theme-ink-soft)]' : ''}`}>{h.ticker || '—'}</p>
                    <p className="truncate text-xs text-[var(--theme-ink-soft)]">{shortStockName(h.name_of_issuer, h.ticker ?? undefined)}</p>
                  </td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    <p className={`text-xs font-bold ${STATUS_COLOR[h.status]}`}>{STATUS_LABEL[h.status]}</p>
                    {change && <p className={`font-mono text-xs tabular-nums ${STATUS_COLOR[h.status]}`}>{change}</p>}
                  </td>
                  <td className={`${TD} hidden lg:table-cell`}>{h.shares_curr > 0 ? formatShares(h.shares_curr) : '—'}</td>
                  <td className={`${TD} hidden sm:table-cell`}>{h.value_curr > 0 ? formatUsd(h.value_curr) : '—'}</td>
                  <td className={`${TD} font-bold`}>{h.weight_curr > 0 ? `${h.weight_curr.toFixed(2)}%` : '—'}</td>
                  {showPrices && <td className={`${TD} hidden md:table-cell`}>{filingPrice(h)}</td>}
                  {showPrices && <td className={`${TD} hidden md:table-cell`}>{current != null ? `$${current.toFixed(2)}` : '—'}</td>}
                  {showPrices && (
                    <td className={TD}>
                      <ReturnCell holding={h} currentPrice={current} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
