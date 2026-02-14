'use client';

import { useState, useEffect, useMemo, memo } from 'react';
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

const TopReturnSlider = memo(function TopReturnSlider({ reports = [] }: TopReturnSliderProps) {
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
    <Card className="p-3 sm:p-6 mb-3 sm:mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-8">
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

      {/* 모바일: 세로 리스트 (3개 보이고 스크롤) */}
      <div className="sm:hidden max-h-[132px] overflow-y-auto">
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {topReturns.map((item) => (
            <Link key={item.id} href={`/reports/${item.id}`}>
              <div className="flex items-center gap-3 h-[44px] active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
                <span className={`w-5 text-center text-sm font-bold flex-shrink-0 ${
                  item.rank <= 3 ? 'text-ant-red' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {item.rank}
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate">{item.stockName} <span className="font-normal text-xs text-gray-400 font-mono">{item.ticker}</span></span>
                <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${getReturnColorClass(item.returnRate)}`}>
                  {item.returnRate >= 0 ? '+' : ''}{item.returnRate.toFixed(2)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 데스크탑: 가로 슬라이더 */}
      <div className="hidden sm:block">
        <div className="relative -mx-4 px-4">
          <div className="scroll-container flex gap-4 px-2">
            {topReturns.map((item, index) => (
              <Link key={item.id} href={`/reports/${item.id}`}>
                <div
                  className={`flex-shrink-0 w-80 p-5 transition-all cursor-pointer snap-start border-2 ${
                    currentIndex === index
                      ? 'bg-ant-red-50 dark:bg-ant-red-900/20 border-ant-red-500 dark:border-ant-red-500 scale-[1.02]'
                      : 'card-base hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onMouseEnter={() => setCurrentIndex(index)}
                >
                  {/* Rank + Author */}
                  <div className="flex items-start gap-3 mb-3 h-[56px]">
                    <div className="text-2xl font-bold text-muted flex-shrink-0">
                      {getMedal(item.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg text-heading mb-1 truncate">{item.author}</h3>
                      <h4 className="text-sm text-subheading mb-2 line-clamp-2 min-h-[2.5rem]">{item.title}</h4>
                    </div>
                  </div>

                  {/* Return Rate */}
                  <div className="mb-2 h-[40px] flex items-center">
                    <div className={`text-3xl font-black font-heading ${getReturnColorClass(item.returnRate)}`}>
                      {item.returnRate >= 0 ? '+' : ''}{item.returnRate.toFixed(2)}%
                    </div>
                  </div>

                  {/* Stock Info and Date */}
                  <div className="flex flex-col text-xs text-muted">
                    <span className="font-semibold truncate max-w-[200px]">{item.stockName} <span className="font-normal">{item.ticker}</span></span>
                    <span className="mt-0.5">{item.createdAt}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});

export default TopReturnSlider;
