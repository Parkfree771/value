'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface TopReturn {
  id: string;
  rank: number;
  title: string;
  stockName: string;
  ticker: string;
  returnRate: number;
  author: string;
  createdAt: string;
}

interface TopReturnSliderProps {
  reports?: Array<{
    id: string;
    title: string;
    stockName: string;
    ticker: string;
    returnRate: number;
    author: string;
    createdAt: string;
  }>;
}

export default function TopReturnSlider({ reports = [] }: TopReturnSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 수익률 상위 10개 리포트 추출
  const topReturns = useMemo(() => {
    if (reports.length === 0) return [];

    return reports
      .sort((a, b) => b.returnRate - a.returnRate) // 수익률 높은 순 (양수든 음수든)
      .slice(0, 10) // 상위 10개
      .map((report, index) => ({
        ...report,
        rank: index + 1,
      }));
  }, [reports]);

  useEffect(() => {
    if (topReturns.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topReturns.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [topReturns.length]);

  // 리포트가 없으면 표시하지 않음
  if (topReturns.length === 0) {
    return null;
  }

  const getMedal = (rank: number) => {
    return rank;
  };

  return (
    <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-xl shadow-glass p-4 sm:p-6 mb-8 sm:mb-12 border border-gray-200 dark:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">수익률 TOP 10</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">가장 높은 수익률을 기록한 리포트</p>
        </div>
        <Link
          href="/ranking"
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          전체보기
        </Link>
      </div>

      {/* Horizontal Scrollable List of TOP 10 */}
      <div className="relative">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent -mx-1 px-1">
          {topReturns.map((item, index) => (
            <Link key={item.id} href={`/reports/${item.id}`}>
              <div
                className={`flex-shrink-0 w-64 sm:w-80 p-4 sm:p-5 rounded-xl transition-all cursor-pointer snap-start border ${
                  currentIndex === index
                    ? 'bg-electric-blue-50 dark:bg-electric-blue-900/20 border-electric-blue-500 dark:border-electric-blue-500 shadow-neon-blue scale-[1.02]'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                }`}
                onMouseEnter={() => setCurrentIndex(index)}
              >
                {/* Rank + Author */}
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {getMedal(item.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">{item.author}</h3>
                    <h4 className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{item.title}</h4>
                  </div>
                </div>

                {/* Return Rate */}
                <div className="mb-2">
                  <div className={`text-2xl sm:text-3xl font-bold font-heading ${
                    item.returnRate > 0
                      ? 'text-red-600 dark:text-red-500'
                      : item.returnRate < 0
                      ? 'text-blue-600 dark:text-blue-500'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {item.returnRate >= 0 ? '+' : ''}{item.returnRate.toFixed(2)}%
                  </div>
                </div>

                {/* Stock Info and Date */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="font-semibold">{item.stockName}</span>
                  <span className="hidden sm:inline">{item.ticker}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="sm:hidden">{item.createdAt.slice(5)}</span>
                  <span className="hidden sm:inline">{item.createdAt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
