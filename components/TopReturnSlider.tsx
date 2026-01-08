'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Card from './Card';

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

  const getReturnColorClass = (returnRate: number) => {
    if (returnRate > 0) return 'return-positive';
    if (returnRate < 0) return 'return-negative';
    return 'return-neutral';
  };

  return (
    <Card className="p-4 sm:p-6 mb-8 sm:mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-lg sm:text-xl text-heading">수익률 TOP 10</h2>
          <p className="text-xs sm:text-sm text-muted mt-1 hidden sm:block">가장 높은 수익률을 기록한 리포트</p>
        </div>
        <Link
          href="/ranking"
          className="btn-primary text-xs sm:text-sm"
        >
          전체보기
        </Link>
      </div>

      {/* Horizontal Scrollable List of TOP 10 */}
      <div className="relative -mx-4 px-4">
        <div className="scroll-container flex gap-3 sm:gap-4 px-2">
          {topReturns.map((item, index) => (
            <Link key={item.id} href={`/reports/${item.id}`}>
              <div
                className={`flex-shrink-0 w-64 sm:w-80 p-4 sm:p-5 rounded-xl transition-all cursor-pointer snap-start border-2 ${
                  currentIndex === index
                    ? 'bg-electric-blue-50 dark:bg-electric-blue-900/20 border-electric-blue-500 dark:border-electric-blue-500 scale-[1.02]'
                    : 'card-base hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onMouseEnter={() => setCurrentIndex(index)}
              >
                {/* Rank + Author */}
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 h-[56px]">
                  <div className="text-xl sm:text-2xl font-bold text-muted flex-shrink-0">
                    {getMedal(item.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg text-heading mb-1 truncate">{item.author}</h3>
                    <h4 className="text-xs sm:text-sm text-subheading mb-2 line-clamp-2 min-h-[2.5rem]">{item.title}</h4>
                  </div>
                </div>

                {/* Return Rate */}
                <div className="mb-2 h-[40px] flex items-center">
                  <div className={`text-2xl sm:text-3xl font-bold font-heading ${getReturnColorClass(item.returnRate)}`}>
                    {item.returnRate >= 0 ? '+' : ''}{item.returnRate.toFixed(2)}%
                  </div>
                </div>

                {/* Stock Info and Date */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted flex-wrap">
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
    </Card>
  );
}
