'use client';

import { useState } from 'react';
import ReportCard from '@/components/ReportCard';
import FilterBar from '@/components/FilterBar';
import TopReturnSlider from '@/components/TopReturnSlider';
import SearchBar from '@/components/SearchBar';

// Mock data - 실제로는 API에서 가져올 데이터
const mockReports = [
  {
    id: '1',
    title: '삼성전자 반도체 업황 회복 기대',
    author: '투자왕김부자',
    stockName: '삼성전자',
    ticker: '005930',
    opinion: 'buy' as const,
    returnRate: 24.5,
    initialPrice: 50000,
    currentPrice: 62250,
    createdAt: '2025-11-01',
    views: 1234,
    likes: 89,
  },
  {
    id: '2',
    title: 'NVIDIA AI 시장 과열 우려',
    author: '월가의늑대',
    stockName: 'NVIDIA',
    ticker: 'NVDA',
    opinion: 'sell' as const,
    returnRate: -12.3,
    initialPrice: 500,
    currentPrice: 438.5,
    createdAt: '2025-10-15',
    views: 2341,
    likes: 156,
  },
  {
    id: '3',
    title: '현대차 전기차 판매 호조',
    author: '주린이탈출',
    stockName: '현대차',
    ticker: '005380',
    opinion: 'buy' as const,
    returnRate: 18.7,
    initialPrice: 180000,
    currentPrice: 213660,
    createdAt: '2025-11-10',
    views: 876,
    likes: 67,
  },
  {
    id: '4',
    title: 'Apple 신제품 발표 기대',
    author: '애플매니아',
    stockName: 'Apple',
    ticker: 'AAPL',
    opinion: 'hold' as const,
    returnRate: 5.2,
    initialPrice: 175,
    currentPrice: 184.1,
    createdAt: '2025-11-20',
    views: 1567,
    likes: 112,
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredReports = mockReports.filter((report) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      report.stockName.toLowerCase().includes(query) ||
      report.ticker.toLowerCase().includes(query) ||
      report.author.toLowerCase().includes(query) ||
      report.title.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* TOP 10 Return Rate Slider */}
      <TopReturnSlider />

      {/* Search Bar */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} reports={mockReports} />

      {/* Filters */}
      <FilterBar />

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
          전체 피드
        </button>
        <button className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors">
          팔로우 피드
        </button>
      </div>

      {/* Reports Grid */}
      <div className="space-y-4">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              검색 결과가 없습니다.
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              다른 검색어를 입력해보세요.
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      <div className="text-center mt-8">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          더 보기
        </button>
      </div>
    </div>
  );
}
