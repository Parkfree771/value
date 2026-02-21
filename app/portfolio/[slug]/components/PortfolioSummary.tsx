'use client';

import { GuruPortfolioDoc } from '@/lib/sec13f/types';

function formatValue(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}.${month}.${day}`;
}

interface PortfolioSummaryProps {
  portfolio: GuruPortfolioDoc;
}

export default function PortfolioSummary({ portfolio }: PortfolioSummaryProps) {
  const valueChange = portfolio.total_value_curr - portfolio.total_value_prev;
  const valueChangePct = portfolio.total_value_prev > 0
    ? (valueChange / portfolio.total_value_prev) * 100
    : 0;

  const newBuyCount = portfolio.holdings.filter(h => h.status === 'NEW BUY').length;
  const soldOutCount = portfolio.holdings.filter(h => h.status === 'SOLD OUT').length;

  return (
    <div className="card-base p-4 sm:p-6 mb-4 sm:mb-6" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {/* 총 포트폴리오 가치 */}
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold tracking-wider mb-1">
            포트폴리오 가치
          </p>
          <p className="text-lg sm:text-xl font-black text-foreground">
            {formatValue(portfolio.total_value_curr)}
          </p>
          <p className={`text-xs font-bold ${valueChange >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {valueChange >= 0 ? '+' : ''}{valueChangePct.toFixed(1)}% vs Q3
          </p>
        </div>

        {/* 보유 종목 수 */}
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold tracking-wider mb-1">
            보유 종목
          </p>
          <p className="text-lg sm:text-xl font-black text-foreground">
            {portfolio.holdings_count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            종목 보유중
          </p>
        </div>

        {/* 신규 매수 */}
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold tracking-wider mb-1">
            신규 / 매도
          </p>
          <p className="text-lg sm:text-xl font-black text-foreground">
            <span className="text-ant-red-600 dark:text-ant-red-400">{newBuyCount}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-blue-600 dark:text-blue-400">{soldOutCount}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            신규매수 / 전량매도
          </p>
        </div>

        {/* 보고 기간 */}
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold tracking-wider mb-1">
            보고 기간
          </p>
          <p className="text-sm sm:text-base font-bold text-foreground">
            2025년 4분기
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            기준일 {formatDate(portfolio.report_date_curr)}
          </p>
          {portfolio.filing_date_curr && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              공시일 {formatDate(portfolio.filing_date_curr)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
