'use client';

import { useState } from 'react';
import { PortfolioHolding } from '@/lib/sec13f/types';
import { quarterLabel } from '@/lib/sec13f/format';
import PortfolioSummary from './PortfolioSummary';
import PortfolioTreemap from './PortfolioTreemap';
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
}

export default function PortfolioView({ quarterViews, prices }: Props) {
  // UI 순서는 최신부터. 초기 선택은 가장 최신.
  const ordered = [...quarterViews].reverse();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = ordered[selectedIdx];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-[var(--theme-border)] pb-2">
        <h2 className="headline text-[22px] leading-tight">{quarterLabel(selected.report_date_curr)} 포트폴리오</h2>
        {ordered.length > 1 && (
          <div className="flex items-center gap-3 text-sm">
            {ordered.map((view, idx) => (
              <button
                key={view.report_date_curr}
                onClick={() => setSelectedIdx(idx)}
                aria-pressed={idx === selectedIdx}
                className={
                  idx === selectedIdx
                    ? 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)] pb-0.5'
                    : 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] pb-0.5 border-b-2 border-transparent'
                }
              >
                {quarterLabel(view.report_date_curr)}
              </button>
            ))}
          </div>
        )}
      </div>

      <PortfolioSummary view={selected} />
      <PortfolioTreemap holdings={selected.holdings} />
      <PortfolioTable holdings={selected.holdings} prices={prices} showPrices={selectedIdx === 0} />
    </>
  );
}
