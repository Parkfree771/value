'use client';

import { useState } from 'react';
import { PortfolioHolding } from '@/lib/sec13f/types';
import { quarterLabel } from '@/lib/sec13f/format';
import PortfolioSummary from './PortfolioSummary';
import PortfolioTable from './PortfolioTable';

export interface QuarterView {
  report_date_curr: string;
  report_date_prev: string;
  filing_date_curr: string;
  total_value_curr: number;
  total_value_prev: number;
  holdings_count: number;
  holdings: PortfolioHolding[];
}

interface PriceData {
  [ticker: string]: { currentPrice: number; returnRate: number };
}

interface Props {
  quarterViews: QuarterView[]; // 오래된 → 최신 순
  prices: PriceData;
  /** 최신 분기 공시 후 수익률 (비중 가중) — 없으면 null */
  returnSinceFiling?: number | null;
}

export default function PortfolioView({ quarterViews, prices, returnSinceFiling = null }: Props) {
  // UI 순서는 최신부터. 초기 선택은 가장 최신.
  const ordered = [...quarterViews].reverse();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = ordered[selectedIdx];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-[var(--theme-border)] pb-2">
        <h2 className="headline text-[22px] leading-tight">{quarterLabel(selected.report_date_curr)} 포트폴리오</h2>
        {ordered.length > 1 && (
          <div className="flex max-w-full items-center gap-3 overflow-x-auto scrollbar-hide text-sm sm:overflow-visible">
            {ordered.map((view, idx) => (
              <button
                key={view.report_date_curr}
                onClick={() => setSelectedIdx(idx)}
                aria-pressed={idx === selectedIdx}
                className={`min-h-9 flex-shrink-0 whitespace-nowrap sm:min-h-0 ${
                  idx === selectedIdx
                    ? 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)] pb-0.5'
                    : 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] pb-0.5 border-b-2 border-transparent'
                }`}
              >
                {quarterLabel(view.report_date_curr)}
              </button>
            ))}
          </div>
        )}
      </div>

      <PortfolioSummary view={selected} returnSinceFiling={selectedIdx === 0 ? returnSinceFiling : null} />
      <PortfolioTable holdings={selected.holdings} prices={prices} showPrices={selectedIdx === 0} />
    </>
  );
}
