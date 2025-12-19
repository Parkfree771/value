'use client';

import { GuruPortfolio, PortfolioHolding } from '@/app/guru-tracker/types';

interface PortfolioTableProps {
  portfolio: GuruPortfolio;
}

export default function PortfolioTable({ portfolio }: PortfolioTableProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return `$${num.toFixed(2)}`;
  };

  const getActivityBadge = (activity?: string) => {
    if (!activity) return null;

    let bgColor = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    if (activity.toLowerCase().includes('buy') || activity.toLowerCase().includes('add')) {
      bgColor = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    } else if (activity.toLowerCase().includes('reduce') || activity.toLowerCase().includes('trim')) {
      bgColor = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    } else if (activity.toLowerCase().includes('sold')) {
      bgColor = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${bgColor}`}>
        {activity}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Portfolio Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {portfolio.guruNameKr}의 포트폴리오
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {portfolio.guruNameEn}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">총 포트폴리오 가치</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(portfolio.totalValue)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <span className="font-semibold">보고 기준일:</span> {portfolio.reportDate}
          </div>
          <div>
            <span className="font-semibold">공시일:</span> {portfolio.filingDate}
          </div>
          <div>
            <span className="font-semibold">종목 수:</span> {portfolio.holdings.length}개
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  종목
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  비중
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  최근 활동
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  보유 주식
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  평가액
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  현재가
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  수익률
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {portfolio.holdings.map((holding, index) => (
                <tr
                  key={holding.ticker}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                        {holding.ticker}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {holding.companyName}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {holding.portfolioPercent.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getActivityBadge(holding.recentActivity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatNumber(holding.shares)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(holding.value)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      ${holding.currentPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      vs ${holding.reportedPrice.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={`text-sm font-bold ${
                      holding.changeFromReported >= 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {holding.changeFromReported >= 0 ? '+' : ''}{holding.changeFromReported.toFixed(2)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {portfolio.holdings.map((holding, index) => (
          <div
            key={holding.ticker}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="font-mono font-bold text-base text-gray-900 dark:text-white mb-1">
                  {holding.ticker}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {holding.companyName}
                </div>
                {holding.recentActivity && (
                  <div className="mb-2">
                    {getActivityBadge(holding.recentActivity)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {holding.portfolioPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  포트폴리오 비중
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">보유 주식</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(holding.shares)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">평가액</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(holding.value)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">현재가</div>
                <div className="text-gray-700 dark:text-gray-300">
                  ${holding.currentPrice.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  vs ${holding.reportedPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">수익률</div>
                <div className={`text-base font-bold ${
                  holding.changeFromReported >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {holding.changeFromReported >= 0 ? '+' : ''}{holding.changeFromReported.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
