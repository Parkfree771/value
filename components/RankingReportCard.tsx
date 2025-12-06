'use client';

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
  };
  rank: number;
}

export default function RankingReportCard({ report, rank }: RankingReportCardProps) {

  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl">🥇</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl">🥈</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl">🥉</span>
        </div>
      );
    } else {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-lg font-bold text-white">{rank}</span>
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
    const text = `${report.stockName} ${report.returnRate > 0 ? '+' : ''}${report.returnRate}% 수익률 달성! 워렌버핏 따라잡기`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
  };

  const copyToClipboard = async () => {
    const text = `${report.stockName} ${report.daysElapsed}일 만에 ${report.returnRate}% 수익률! - 워렌버핏 따라잡기`;
    try {
      await navigator.clipboard.writeText(text);
      alert('클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-500">
      <div className="p-4">
        <div className="flex gap-4">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            <div className={`${rank <= 3 ? 'w-12 h-12' : 'w-12 h-12'}`}>
              {getRankBadge()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{report.stockName}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{report.ticker}</span>
                  {getOpinionBadge()}
                </div>
                <Link href={`/reports/${report.id}`}>
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1">
                    {report.title}
                  </h2>
                </Link>
              </div>

              {/* Return Rate - Large Display */}
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                  +{report.returnRate}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {report.daysElapsed}일 경과
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-3 gap-3 mb-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">작성시 주가</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {report.initialPrice.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">현재 주가</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {report.currentPrice.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">수익</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  +{(report.currentPrice - report.initialPrice).toLocaleString()}원
                </span>
              </div>
            </div>


            {/* Footer */}
            <div className="flex justify-between items-center text-xs pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{report.author}</span>
                <span>{report.createdAt}</span>
                <span>조회 {report.views.toLocaleString()}</span>
                <span>좋아요 {report.likes.toLocaleString()}</span>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  복사
                </button>
                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors"
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
}
