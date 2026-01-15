'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ReportSummary } from '@/types/report';

// CLS 방지: 각 컴포넌트의 실제 높이에 맞는 스켈레톤 제공
const ReportCard = dynamic(() => import('@/components/ReportCard'), {
  loading: () => <div className="animate-pulse h-[180px] bg-gray-200 dark:bg-gray-700 rounded-xl" />,
  ssr: false,
});
const FilterBar = dynamic(() => import('@/components/FilterBar'), {
  loading: () => <div className="animate-pulse h-[52px] bg-gray-200 dark:bg-gray-700 rounded-lg" />,
  ssr: false,
});
const TopReturnSlider = dynamic(() => import('@/components/TopReturnSlider'), {
  loading: () => <div className="animate-pulse h-[280px] bg-gray-200 dark:bg-gray-700 rounded-xl mb-8" />,
  ssr: false,
});
const SearchBar = dynamic(() => import('@/components/SearchBar'), {
  loading: () => <div className="animate-pulse h-[48px] bg-gray-200 dark:bg-gray-700 rounded-lg" />,
  ssr: false,
});

type FeedTab = 'all' | 'following' | 'popular' | 'return';

interface HomeClientProps {
  initialReports: ReportSummary[];
  total: number;
}

export default function HomeClient({ initialReports, total }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [filters, setFilters] = useState({
    period: 'all',
    market: 'all',
    opinion: 'all',
    sortBy: 'returnRate',
  });

  // 클라이언트에서 정렬 처리
  const sortedReports = useMemo(() => {
    const sorted = [...initialReports];

    switch (activeTab) {
      case 'popular':
        sorted.sort((a, b) => b.views - a.views);
        break;
      case 'return':
        sorted.sort((a, b) => b.returnRate - a.returnRate);
        break;
      case 'all':
      default:
        // 최신순 정렬 (createdAt desc)
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return sorted;
  }, [initialReports, activeTab]);

  // 검색 및 필터링
  const filteredReports = useMemo(() => {
    return sortedReports.filter((report) => {
      // 검색어 필터링
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          report.stockName.toLowerCase().includes(query) ||
          report.ticker.toLowerCase().includes(query) ||
          report.author.toLowerCase().includes(query) ||
          report.title.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // 시장 카테고리 필터링
      if (filters.market !== 'all') {
        if (!report.category || report.category !== filters.market) return false;
      }

      // 의견 필터링
      if (filters.opinion !== 'all') {
        if (report.opinion !== filters.opinion) return false;
      }

      return true;
    });
  }, [sortedReports, searchQuery, filters]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* TOP 10 Return Rate Slider */}
      <TopReturnSlider reports={initialReports} />

      {/* 데스크탑: 검색바 + 필터바 */}
      <div className="hidden md:block mb-8">
        <div className="flex flex-col gap-6">
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <FilterBar onFilterChange={setFilters} />
        </div>
      </div>

      {/* 모바일: 검색 버튼 */}
      <div className="md:hidden mb-8">
        <Link href="/search">
          <button className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl text-left text-gray-400 flex items-center gap-3 hover:border-electric-blue-500/50 transition-colors backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>종목명, 티커, 작성자로 검색...</span>
          </button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        {/* 모바일: 4개 탭 한 줄 */}
        <div className="flex gap-2 md:hidden overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              activeTab === 'all'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              activeTab === 'following'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            팔로우
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              activeTab === 'popular'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            인기
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              activeTab === 'return'
                ? 'bg-electric-blue text-white shadow-neon-blue'
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
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-all shadow-sm ${
              activeTab === 'all'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            전체 피드
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-all shadow-sm ${
              activeTab === 'following'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            팔로우 피드
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-all shadow-sm ${
              activeTab === 'popular'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            인기순
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`px-6 py-2 rounded-lg text-base font-semibold transition-all shadow-sm ${
              activeTab === 'return'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            수익률순
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="space-y-6">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery ? '검색 결과가 없습니다.' : '아직 작성된 리포트가 없습니다.'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              {searchQuery ? '다른 검색어를 입력해보세요.' : '첫 번째 리포트를 작성해보세요!'}
            </p>
          </div>
        )}
      </div>

      {/* 게시물 수 표시 */}
      {filteredReports.length > 0 && (
        <div className="flex justify-center mt-8">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            총 {total}개의 리포트
          </span>
        </div>
      )}
    </div>
  );
}
