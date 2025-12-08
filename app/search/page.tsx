'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportCard from '@/components/ReportCard';
import FilterBar from '@/components/FilterBar';
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
  {
    id: '5',
    title: '네이버 AI 검색 강화 전략',
    author: '테크분석가',
    stockName: '네이버',
    ticker: '035420',
    opinion: 'buy' as const,
    returnRate: 15.3,
    initialPrice: 200000,
    currentPrice: 230600,
    createdAt: '2025-11-15',
    views: 987,
    likes: 54,
  },
  {
    id: '6',
    title: 'Tesla 자율주행 기술 혁신',
    author: '일론팬',
    stockName: 'Tesla',
    ticker: 'TSLA',
    opinion: 'buy' as const,
    returnRate: 28.4,
    initialPrice: 220,
    currentPrice: 282.5,
    createdAt: '2025-10-25',
    views: 2100,
    likes: 178,
  },
];

export default function SearchPage() {
  const router = useRouter();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          검색
        </h1>
      </div>

      {/* Search Bar */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} reports={mockReports} />

      {/* Filters */}
      <FilterBar />

      {/* Search Results Summary */}
      {searchQuery && (
        <div className="mb-4 px-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{searchQuery}&rdquo;</span>
            {' '}검색 결과 {filteredReports.length}개
          </p>
        </div>
      )}

      {/* Reports Grid */}
      <div className="space-y-4">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : searchQuery ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              검색 결과가 없습니다
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              다른 검색어를 입력해보세요
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              검색어를 입력해주세요
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              종목명, 티커, 작성자로 검색할 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {filteredReports.length > 0 && (
        <div className="text-center mt-6 sm:mt-8">
          <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors">
            더 보기
          </button>
        </div>
      )}

      {/* Popular Search Keywords (when no search query) */}
      {!searchQuery && (
        <div className="mt-8 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            인기 검색어
          </h2>
          <div className="flex flex-wrap gap-2">
            {['삼성전자', 'NVIDIA', 'Apple', '현대차', 'Tesla', '네이버', 'SK하이닉스', 'Microsoft'].map((keyword, index) => (
              <button
                key={keyword}
                onClick={() => setSearchQuery(keyword)}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="text-xs text-gray-400 mr-1">{index + 1}</span>
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
