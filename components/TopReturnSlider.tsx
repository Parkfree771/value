'use client';

import { useState, useEffect } from 'react';
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

const mockTopReturns: TopReturn[] = [
  { id: '1', rank: 1, title: '삼성전자 반도체 업황 회복 기대', stockName: '삼성전자', ticker: '005930', returnRate: 45.8, author: '투자왕김부자', createdAt: '2025-09-01' },
  { id: '2', rank: 2, title: 'Tesla 자율주행 기술 혁신', stockName: 'Tesla', ticker: 'TSLA', returnRate: 38.2, author: '일론팬', createdAt: '2025-09-15' },
  { id: '3', rank: 3, title: 'SK하이닉스 HBM 시장 독점', stockName: 'SK하이닉스', ticker: '000660', returnRate: 35.4, author: '반도체전문가', createdAt: '2025-10-01' },
  { id: '4', rank: 4, title: 'Microsoft AI 클라우드 성장', stockName: 'Microsoft', ticker: 'MSFT', returnRate: 28.9, author: '클라우드왕', createdAt: '2025-10-10' },
  { id: '5', rank: 5, title: '카카오 실적 턴어라운드', stockName: '카카오', ticker: '035720', returnRate: 22.3, author: '가치투자자', createdAt: '2025-10-20' },
  { id: '6', rank: 6, title: 'NVIDIA AI 칩 수요 폭발', stockName: 'NVIDIA', ticker: 'NVDA', returnRate: 18.5, author: 'AI투자자', createdAt: '2025-11-01' },
  { id: '7', rank: 7, title: 'Apple 신제품 발표 기대', stockName: 'Apple', ticker: 'AAPL', returnRate: 15.2, author: '애플매니아', createdAt: '2025-11-05' },
  { id: '8', rank: 8, title: 'LG에너지솔루션 배터리 수주', stockName: 'LG에너지솔루션', ticker: '373220', returnRate: 12.8, author: '2차전지왕', createdAt: '2025-11-10' },
  { id: '9', rank: 9, title: '네이버 AI 검색 강화', stockName: '네이버', ticker: '035420', returnRate: 10.5, author: '테크분석가', createdAt: '2025-11-15' },
  { id: '10', rank: 10, title: '현대차 전기차 판매 호조', stockName: '현대차', ticker: '005380', returnRate: 8.9, author: '주린이탈출', createdAt: '2025-11-20' },
];

export default function TopReturnSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockTopReturns.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">수익률 TOP 10</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">가장 높은 수익률을 기록한 리포트</p>
        </div>
        <Link
          href="/ranking"
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          전체보기
        </Link>
      </div>

      {/* Horizontal Scrollable List of TOP 10 */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {mockTopReturns.map((item, index) => (
            <Link key={item.id} href={`/reports/${item.id}`}>
              <div
                className={`flex-shrink-0 w-80 p-4 rounded-lg transition-all cursor-pointer snap-start ${
                  currentIndex === index
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                }`}
                onMouseEnter={() => setCurrentIndex(index)}
              >
                {/* Rank + Author */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {getMedal(item.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.author}</h3>
                    <h4 className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{item.title}</h4>
                  </div>
                </div>

                {/* Return Rate */}
                <div className="mb-2">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    +{item.returnRate}%
                  </div>
                </div>

                {/* Stock Info and Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">{item.stockName}</span>
                  <span>{item.ticker}</span>
                  <span>·</span>
                  <span>{item.createdAt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Scroll Hint */}
        <div className="text-center mt-2 text-xs text-gray-400 dark:text-gray-500">
          → 가로로 스크롤해서 10위까지 확인하세요
        </div>
      </div>
    </div>
  );
}
