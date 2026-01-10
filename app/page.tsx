'use client';

import { useState, useEffect } from 'react';
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

type FeedTab = 'all' | 'following' | 'popular' | 'return';

interface Report {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  category?: string;
  exchange?: string;
  opinion: 'buy' | 'sell' | 'hold';
  returnRate: number;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  stockData?: {
    currency?: string;
    [key: string]: any;
  };
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [filters, setFilters] = useState({
    period: 'all',
    market: 'all',
    opinion: 'all',
    sortBy: 'returnRate',
  });

  // API에서 실시간 수익률이 계산된 리포트 데이터 가져오기
  const fetchReports = async (cursor?: string, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      let sortByField = 'createdAt';
      if (activeTab === 'popular') {
        sortByField = 'views';
      } else if (activeTab === 'return') {
        sortByField = 'returnRate';
      }

      const url = cursor
        ? `/api/reports?sortBy=${sortByField}&pageSize=${pageSize}&cursor=${cursor}`
        : `/api/reports?sortBy=${sortByField}&pageSize=${pageSize}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (append) {
          setReports(prev => [...prev, ...data.reports]);
        } else {
          setReports(data.reports);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } else {
        console.error('리포트 가져오기 실패:', data.error);
      }
    } catch (error) {
      console.error('리포트 가져오기 실패:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 초기 로드 및 탭 변경 시
  useEffect(() => {
    setReports([]);
    setNextCursor(null);
    fetchReports();
  }, [activeTab]);

  // 더 보기 핸들러
  const handleLoadMore = () => {
    if (nextCursor && hasMore && !loadingMore) {
      fetchReports(nextCursor, true);
    }
  };

  // 검색 및 필터링
  const filteredReports = reports.filter((report) => {
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* TOP 10 Return Rate Slider */}
      <TopReturnSlider reports={reports} />

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
        {loading ? (
          // 로딩 중
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        ) : filteredReports.length > 0 ? (
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

      {/* 더 보기 버튼 */}
      {!loading && hasMore && (
        <div className="flex flex-col items-center gap-2 mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-electric-blue hover:bg-electric-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                로딩 중...
              </span>
            ) : (
              '더 보기'
            )}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {reports.length} / {total}개
          </span>
        </div>
      )}
    </div>
  );
}
