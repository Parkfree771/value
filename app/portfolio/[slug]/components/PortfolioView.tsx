'use client';

import { useState } from 'react';
import { GuruPortfolioDoc, PortfolioHolding } from '@/lib/sec13f/types';
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
  guruNameKr: string;
  filingName: string;
}

function dateToQuarterKr(dateStr: string): string {
  const [yStr, mStr] = dateStr.split('-');
  const q = Math.floor((Number(mStr) - 1) / 3) + 1;
  return `${yStr}년 ${q}분기`;
}

export default function PortfolioView({
  quarterViews,
  prices,
  guruNameKr,
  filingName,
}: Props) {
  // UI 순서는 최신부터. 초기 선택은 가장 최신.
  const ordered = [...quarterViews].reverse();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = ordered[selectedIdx];

  // Summary는 GuruPortfolioDoc 셰이프를 받으므로 분기별 합성 doc 구성.
  const summaryDoc: GuruPortfolioDoc = {
    guru_name_en: '',
    guru_name_kr: guruNameKr,
    cik: '',
    filing_name: filingName,
    report_date_curr: selected.report_date_curr,
    report_date_prev: selected.report_date_prev,
    filing_date_curr: selected.filing_date_curr,
    total_value_curr: selected.total_value_curr,
    total_value_prev: selected.total_value_prev,
    holdings_count: selected.holdings_count,
    holdings: selected.holdings,
    updated_at: '',
  };

  return (
    <>
      {/* 분기 셀렉터 */}
      {ordered.length > 1 && (
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold tracking-wider text-gray-700 dark:text-gray-300 mr-1">
            분기
          </span>
          {ordered.map((view, idx) => (
            <button
              key={view.report_date_curr}
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1.5 text-xs font-bold border-2 rounded-xl transition-colors ${
                idx === selectedIdx
                  ? 'bg-ant-red-600 text-white border-ant-red-800 dark:bg-ant-red-600 dark:border-ant-red-400'
                  : 'bg-[var(--theme-bg-card)] text-foreground border-[var(--theme-border)] hover:bg-[var(--theme-bg)]'
              }`}
              style={{
                boxShadow: idx === selectedIdx ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {dateToQuarterKr(view.report_date_curr)}
            </button>
          ))}
        </div>
      )}

      <PortfolioSummary portfolio={summaryDoc} />
      <PortfolioTreemap
        holdings={selected.holdings}
        guruNameKr={guruNameKr}
        filingName={filingName}
        reportDate={selected.report_date_curr}
        totalValue={selected.total_value_curr}
        holdingsCount={selected.holdings_count}
      />
      <PortfolioTable
        holdings={selected.holdings}
        filingDate={selected.filing_date_curr}
        prices={prices}
        showPrices={selectedIdx === 0}
      />
    </>
  );
}
