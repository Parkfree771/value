'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ReportCard = dynamic(() => import('@/components/ReportCard'), {
  loading: () => <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});
const FilterBar = dynamic(() => import('@/components/FilterBar'));
const TopReturnSlider = dynamic(() => import('@/components/TopReturnSlider'), {
  loading: () => <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8" />,
});
const SearchBar = dynamic(() => import('@/components/SearchBar'));

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

type FeedTab = 'all' | 'following' | 'popular' | 'return';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');

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

      {/* 데스크탑: 검색바 + 필터바 */}
      <div className="hidden md:block">
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} reports={mockReports} />
        <FilterBar />
      </div>

      {/* 모바일: 검색 버튼 */}
      <div className="md:hidden mb-4">
        <Link href="/search">
          <button className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-left text-gray-500 dark:text-gray-400 flex items-center gap-3 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>종목명, 티커, 작성자로 검색...</span>
          </button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 sm:mb-6">
        {/* 모바일: 4개 탭 한 줄 */}
        <div className="flex gap-2 md:hidden overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'following'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            팔로우
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'popular'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            인기
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'return'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            수익률
          </button>
        </div>

        {/* 데스크탑: 4개 탭 */}
        <div className="hidden md:flex gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            전체 피드
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeTab === 'following'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            팔로우 피드
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeTab === 'popular'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            인기순
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeTab === 'return'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            수익률순
          </button>
        </div>
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
      <div className="text-center mt-6 sm:mt-8">
        <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors">
          더 보기
        </button>
      </div>
    </div>
  );
}
