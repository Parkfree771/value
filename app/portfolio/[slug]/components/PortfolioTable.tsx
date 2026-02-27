'use client';

import { useState, useMemo } from 'react';
import { PortfolioHolding } from '@/lib/sec13f/types';
import StatusBadge from './StatusBadge';

type FilterStatus = 'ALL' | 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'BUY_ALL' | 'SELL_ALL';
type SortType = 'default' | 'weightChange';

function formatValue(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatShares(shares: number): string {
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(2)}M`;
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(0)}K`;
  return shares.toLocaleString();
}

const thClass = 'px-3 py-3 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap';

interface PriceData {
  [ticker: string]: {
    currentPrice: number;
    returnRate: number;
  };
}

interface PortfolioTableProps {
  holdings: PortfolioHolding[];
  filingDate?: string; // "2026-02-17" 형식
  prices?: PriceData; // Storage JSON에서 가져온 가격 데이터
}

const sortLabels: Record<SortType, string> = {
  default: '기본순',
  weightChange: '비중변화순',
};
const sortKeys = Object.keys(sortLabels) as SortType[];

const SORT_BASE = 'flex-shrink-0 font-heading tracking-wide text-[10px] sm:text-xs px-1 py-0.5 sm:px-2 sm:py-1 transition-all';
const SORT_ACTIVE = `${SORT_BASE} font-bold text-ant-red-600 dark:text-ant-red-400 border-b-2 border-ant-red-600 dark:border-ant-red-400`;
const SORT_INACTIVE = `${SORT_BASE} font-medium text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]`;

export default function PortfolioTable({ holdings, filingDate, prices = {} }: PortfolioTableProps) {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [sortType, setSortType] = useState<SortType>('default');

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'ALL', label: '전체', count: holdings.length },
    { key: 'BUY_ALL', label: '매수', count: holdings.filter(h => h.status === 'NEW BUY' || h.status === 'ADD').length },
    { key: 'SELL_ALL', label: '매도', count: holdings.filter(h => h.status === 'SOLD OUT' || h.status === 'TRIM').length },
    { key: 'NEW BUY', label: '신규매수', count: holdings.filter(h => h.status === 'NEW BUY').length },
    { key: 'ADD', label: '비중확대', count: holdings.filter(h => h.status === 'ADD').length },
    { key: 'SOLD OUT', label: '전량매도', count: holdings.filter(h => h.status === 'SOLD OUT').length },
    { key: 'TRIM', label: '비중축소', count: holdings.filter(h => h.status === 'TRIM').length },
  ];

  const filteredList = filter === 'ALL'
    ? holdings
    : filter === 'BUY_ALL'
    ? holdings.filter(h => h.status === 'NEW BUY' || h.status === 'ADD')
    : filter === 'SELL_ALL'
    ? holdings.filter(h => h.status === 'SOLD OUT' || h.status === 'TRIM')
    : holdings.filter(h => h.status === filter);

  const filtered = useMemo(() => {
    if (sortType === 'default') return filteredList;

    const isActive = (h: PortfolioHolding) => h.status !== 'HOLD';

    return [...filteredList].sort((a, b) => {
      const aChange = isActive(a) ? Math.abs(a.weight_curr - (a.weight_prev ?? 0)) : 0;
      const bChange = isActive(b) ? Math.abs(b.weight_curr - (b.weight_prev ?? 0)) : 0;
      return bChange - aChange;
    });
  }, [filteredList, sortType]);

  return (
    <div>
      {/* 필터 + 정렬 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
                filter === f.key
                  ? 'bg-ant-red-600 text-white border-ant-red-800 dark:bg-ant-red-600 dark:border-ant-red-400'
                  : 'bg-pixel-card text-foreground border-pixel-border hover:bg-pixel-bg'
              }`}
              style={{ boxShadow: filter === f.key ? 'var(--shadow-sm)' : 'none' }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 sm:gap-1 items-center flex-shrink-0 ml-2">
        {sortKeys.map((s) => (
          <button
            key={s}
            onClick={() => setSortType(s)}
            className={sortType === s ? SORT_ACTIVE : SORT_INACTIVE}
          >
            {sortLabels[s]}
          </button>
        ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="card-base overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-pixel-bg border-b-3 border-pixel-border">
                <th className={`${thClass} text-left w-8`}>#</th>
                <th className={`${thClass} text-left`}>티커</th>
                <th className={`${thClass} text-left hidden sm:table-cell`}>종목명</th>
                <th className={`${thClass} text-center`}>상태</th>
                <th className={`${thClass} text-right`}>변동</th>
                <th className={`${thClass} text-right hidden md:table-cell`}>주식수</th>
                <th className={`${thClass} text-right`}>평가액</th>
                <th className={`${thClass} text-right`}>비중</th>
                <th className={`${thClass} text-right hidden sm:table-cell`}>공시일 가격</th>
                <th className={`${thClass} text-right hidden sm:table-cell`}>현재가</th>
                <th className={`${thClass} text-right hidden sm:table-cell`}>수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y-[2px] divide-pixel-border-muted">
              {filtered.map((h, i) => (
                <tr
                  key={h.cusip}
                  className={`hover:bg-ant-red-50/50 dark:hover:bg-ant-red-950/20 transition-colors ${
                    h.status === 'SOLD OUT' ? 'opacity-50' : ''
                  }`}
                >
                  {/* 순위 */}
                  <td className="px-3 py-3 text-sm text-gray-400 font-bold">
                    {i + 1}
                  </td>

                  {/* 티커 */}
                  <td className="px-3 py-3">
                    <span className="text-sm font-bold text-foreground">
                      {h.ticker || '—'}
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 sm:hidden">
                      {h.name_of_issuer}
                    </p>
                  </td>

                  {/* 종목명 */}
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="text-sm text-foreground">
                      {h.name_of_issuer}
                    </span>
                  </td>

                  {/* 상태 배지 */}
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={h.status} />
                  </td>

                  {/* 변동률 */}
                  <td className="px-3 py-3 text-right">
                    {h.status === 'NEW BUY' ? (
                      <span className="text-sm font-bold text-red-500">NEW</span>
                    ) : h.status === 'SOLD OUT' ? (
                      <span className="text-sm font-bold text-blue-500">-100%</span>
                    ) : h.shares_change_pct !== null && h.shares_change_pct !== 0 ? (
                      <span className={`text-sm font-bold ${
                        h.shares_change_pct > 0 ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {h.shares_change_pct > 0 ? '+' : ''}{h.shares_change_pct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">0%</span>
                    )}
                  </td>

                  {/* 주식수 */}
                  <td className="px-3 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-foreground">
                      {h.shares_curr > 0 ? formatShares(h.shares_curr) : '—'}
                    </span>
                  </td>

                  {/* 평가액 */}
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-foreground font-bold">
                      {h.value_curr > 0 ? formatValue(h.value_curr) : '—'}
                    </span>
                  </td>

                  {/* 비중 */}
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-foreground font-bold">
                      {h.weight_curr > 0 ? `${h.weight_curr.toFixed(2)}%` : '—'}
                    </span>
                  </td>

                  {/* 공시일 가격 (KIS API 과거 종가) */}
                  <td className="px-3 py-3 text-right hidden sm:table-cell">
                    <span className="text-sm text-foreground">
                      {h.price_at_filing != null
                        ? `$${h.price_at_filing.toFixed(2)}`
                        : h.shares_curr > 0 ? `$${(h.value_curr / h.shares_curr).toFixed(2)}` : '—'}
                    </span>
                  </td>

                  {/* 현재가 (Storage JSON) */}
                  <td className="px-3 py-3 text-right hidden sm:table-cell">
                    <span className="text-sm text-foreground font-bold">
                      {h.ticker && prices[h.ticker]?.currentPrice != null
                        ? `$${prices[h.ticker].currentPrice.toFixed(2)}`
                        : '—'}
                    </span>
                  </td>

                  {/* 수익률 (공시일 가격 대비 현재가) */}
                  <td className="px-3 py-3 text-right hidden sm:table-cell">
                    {(() => {
                      const filingPrice = h.price_at_filing;
                      const currentPrice = h.ticker ? prices[h.ticker]?.currentPrice : undefined;
                      if (filingPrice == null || currentPrice == null || filingPrice <= 0) {
                        return <span className="text-sm text-gray-400">—</span>;
                      }
                      const rate = Math.round(((currentPrice - filingPrice) / filingPrice) * 1000) / 10;
                      return (
                        <span className={`text-sm font-bold ${
                          rate > 0 ? 'text-red-500' : rate < 0 ? 'text-blue-500' : 'text-gray-400'
                        }`}>
                          {rate > 0 ? '+' : ''}{rate.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              해당 상태의 종목이 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
