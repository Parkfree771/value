'use client';

import { memo } from 'react';
import Link from 'next/link';
import Card from './Card';

interface PriceHistoryItem {
  date: string;
  price: number;
  returnRate: number;
}

interface RankingReportCardProps {
  report: {
    id: string;
    title: string;
    author: string;
    stockName: string;
    ticker: string;
    opinion: 'buy' | 'sell' | 'hold';
    returnRate: number;
    initialPrice: number;
    currentPrice: number;
    createdAt: string;
    views: number;
    likes: number;
    daysElapsed: number;
    priceHistory: PriceHistoryItem[];
    category?: string;
    stockData?: {
      currency?: string;
      [key: string]: any;
    };
  };
  rank: number;
}

const RankingReportCard = memo(function RankingReportCard({ report, rank }: RankingReportCardProps) {

  // 통화 추론 함수
  const inferCurrency = (): string => {
    // stockData에 currency가 있으면 사용
    if (report.stockData?.currency) {
      return report.stockData.currency;
    }

    // category 기반 추론
    if (report.category) {
      const categoryUpper = report.category.toUpperCase();
      if (categoryUpper.includes('KOSPI') || categoryUpper.includes('KOSDAQ')) return 'KRW';
      if (categoryUpper.includes('NIKKEI')) return 'JPY';
      if (categoryUpper.includes('NYSE') || categoryUpper.includes('NASDAQ')) return 'USD';
      if (categoryUpper.includes('HANGSENG')) return 'HKD';
    }

    // 티커 suffix 기반 추론
    if (report.ticker) {
      if (report.ticker.endsWith('.T')) return 'JPY';
      if (report.ticker.endsWith('.KS') || report.ticker.endsWith('.KQ')) return 'KRW';
      if (report.ticker.endsWith('.L')) return 'GBP';
      if (report.ticker.endsWith('.HK')) return 'HKD';
      if (report.ticker.endsWith('.SS') || report.ticker.endsWith('.SZ')) return 'CNY';
    }

    return 'USD'; // 기본값
  };

  // 통화 기호 가져오기
  const getCurrencySymbol = (curr: string): string => {
    switch (curr.toUpperCase()) {
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'KRW': return '₩';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CNY': case 'CNH': return '¥';
      case 'HKD': return 'HK$';
      default: return '$';
    }
  };

  const currency = inferCurrency();
  const currencySymbol = getCurrencySymbol(currency);

  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-xl sm:text-2xl">🥇</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-xl sm:text-2xl">🥈</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-xl sm:text-2xl">🥉</span>
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-base sm:text-lg font-bold text-white">{rank}</span>
        </div>
      );
    }
  };

  const getOpinionBadge = () => {
    const styles = {
      buy: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700',
      sell: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700',
      hold: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
    };

    const labels = {
      buy: '매수',
      sell: '매도',
      hold: '보유',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles[report.opinion]}`}>
        {labels[report.opinion]}
      </span>
    );
  };

  const getShareUrl = () => {
    const text = `${report.stockName} ${report.returnRate >= 0 ? '+' : ''}${report.returnRate.toFixed(2)}% 수익률 달성! 워렌버핏 따라잡기`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
  };

  const copyToClipboard = async () => {
    const text = `${report.stockName} ${report.daysElapsed}일 만에 ${report.returnRate >= 0 ? '+' : ''}${report.returnRate.toFixed(2)}% 수익률! - 워렌버핏 따라잡기`;
    try {
      await navigator.clipboard.writeText(text);
      alert('클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-500">
      <div className="p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-4">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            {getRankBadge()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <div className="flex-1 min-w-0 mr-2 sm:mr-3">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">{report.stockName}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{report.ticker}</span>
                  {getOpinionBadge()}
                </div>
                <Link href={`/reports/${report.id}`}>
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1">
                    {report.title}
                  </h2>
                </Link>
              </div>

              {/* Return Rate - Large Display */}
              <div className="text-right flex-shrink-0">
                <div className={`text-xl sm:text-3xl font-extrabold ${
                  report.returnRate > 0 ? 'text-red-600 dark:text-red-400' :
                  report.returnRate < 0 ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {report.returnRate >= 0 ? '+' : ''}{report.returnRate.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {report.daysElapsed}일
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3 bg-gray-50 dark:bg-gray-700 p-2 sm:p-3 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">작성시 주가</span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  {currencySymbol}{report.initialPrice.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">현재 주가</span>
                <span className={`text-xs sm:text-sm font-bold ${
                  report.returnRate > 0 ? 'text-red-600 dark:text-red-400' :
                  report.returnRate < 0 ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-900 dark:text-white'
                }`}>
                  {currencySymbol}{report.currentPrice.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">수익</span>
                <span className={`text-xs sm:text-sm font-bold ${
                  report.returnRate > 0 ? 'text-red-600 dark:text-red-400' :
                  report.returnRate < 0 ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {report.returnRate >= 0 ? '+' : ''}{currencySymbol}{Math.abs(report.currentPrice - report.initialPrice).toLocaleString()}
                </span>
              </div>
            </div>


            {/* Footer */}
            <div className="flex justify-between items-center text-xs pt-2 sm:pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-2 sm:gap-3 text-gray-500 dark:text-gray-400 flex-wrap min-w-0">
                <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{report.author}</span>
                <span className="hidden sm:inline">{report.createdAt}</span>
                <span className="sm:hidden">{report.createdAt.slice(5)}</span>
                <span>조회 {report.views.toLocaleString()}</span>
                <span>좋아요 {report.likes.toLocaleString()}</span>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={copyToClipboard}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  복사
                </button>
                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  공유
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default RankingReportCard;
