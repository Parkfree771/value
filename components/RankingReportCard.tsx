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
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-3xl">🥇</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-3xl">🥈</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-3xl">🥉</span>
        </div>
      );
    } else {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl font-bold text-white">{rank}</span>
        </div>
      );
    }
  };

  const getOpinionBadge = () => {
    const styles = {
      buy: 'bg-red-100 text-red-700 border border-red-300',
      sell: 'bg-blue-100 text-blue-700 border border-blue-300',
      hold: 'bg-gray-100 text-gray-700 border border-gray-300',
    };

    const labels = {
      buy: '매수',
      sell: '매도',
      hold: '보유',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-bold ${styles[report.opinion]}`}>
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
    <Card className="hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-300">
      <div className="p-6">
        <div className="flex gap-6">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            {getRankBadge()}
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{report.stockName}</h3>
                  <span className="text-sm text-gray-500">{report.ticker}</span>
                  {getOpinionBadge()}
                </div>
                <Link href={`/reports/${report.id}`}>
                  <h2 className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                    {report.title}
                  </h2>
                </Link>
              </div>

              {/* Return Rate - Large Display */}
              <div className="text-right ml-4">
                <div className="text-5xl font-extrabold text-red-600">
                  +{report.returnRate}%
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {report.daysElapsed}일 경과
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 block mb-1">작성시 주가</span>
                <span className="text-lg font-bold text-gray-900">
                  {report.initialPrice.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">현재 주가</span>
                <span className="text-lg font-bold text-red-600">
                  {report.currentPrice.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">수익</span>
                <span className="text-lg font-bold text-red-600">
                  +{(report.currentPrice - report.initialPrice).toLocaleString()}원
                </span>
              </div>
            </div>


            {/* Footer */}
            <div className="flex justify-between items-center text-sm pt-4 border-t">
              <div className="flex items-center gap-4 text-gray-500">
                <span className="font-semibold text-gray-700">{report.author}</span>
                <span>{report.createdAt}</span>
                <span>조회 {report.views.toLocaleString()}</span>
                <span>좋아요 {report.likes.toLocaleString()}</span>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors"
                >
                  📋 복사
                </button>
                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  🐦 공유하기
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
