'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ReportSummary } from '@/types/report';
import ReportCard from '@/components/ReportCard';
import { useBookmark } from '@/contexts/BookmarkContext';

// SSR 활성화: ReportCard는 직접 import (가장 중요한 콘텐츠)
// 덜 중요한 컴포넌트만 dynamic import
const FilterBar = dynamic(() => import('@/components/FilterBar'), {
  loading: () => <div className="animate-pulse h-[52px] bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});
const TopReturnSlider = dynamic(() => import('@/components/TopReturnSlider'), {
  loading: () => <div className="animate-pulse h-[280px] bg-gray-200 dark:bg-gray-700 rounded-xl mb-8" />,
});
const SearchBar = dynamic(() => import('@/components/SearchBar'), {
  loading: () => <div className="animate-pulse h-[48px] bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});

type FeedTab = 'all' | 'following' | 'popular' | 'return';

// feed.json API 엔드포인트 (클라이언트 재검증용)
const FEED_API = '/api/feed/public';

interface FeedPost {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  exchange: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType: 'long' | 'short';
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  createdAt: string;
  views: number;
  likes: number;
  category: string;
  is_closed?: boolean;
}

interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: FeedPost[];
}

interface HomeClientProps {
  initialData: FeedData | null;
}

// FeedPost를 ReportSummary로 매핑하는 함수
function mapPostsToReports(posts: FeedPost[]): ReportSummary[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author,
    stockName: post.stockName,
    ticker: post.ticker,
    opinion: post.opinion,
    returnRate: post.returnRate,
    initialPrice: post.initialPrice,
    currentPrice: post.currentPrice,
    createdAt: post.createdAt,
    views: post.views,
    likes: post.likes,
    exchange: post.exchange,
    category: post.category,
    positionType: post.positionType,
    stockData: undefined,
  }));
}

const HomeClient = memo(function HomeClient({ initialData }: HomeClientProps) {
  // 서버에서 받은 initialData로 초기 상태 설정
  const [reports, setReports] = useState<ReportSummary[]>(() =>
    initialData?.posts ? mapPostsToReports(initialData.posts) : []
  );
  const [total, setTotal] = useState(() => initialData?.totalPosts || 0);
  // initialData가 있으면 로딩 완료 상태로 시작
  const [isLoading, setIsLoading] = useState(!initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [filters, setFilters] = useState({
    period: 'all',
    market: 'all',
    opinion: 'all',
    sortBy: 'returnRate',
  });

  // 북마크 상태
  const { bookmarkedIds } = useBookmark();

  // 서버에서 데이터를 받지 못했을 경우에만 클라이언트에서 fetch
  useEffect(() => {
    // 이미 초기 데이터가 있으면 스킵
    if (initialData) return;

    const fetchFeed = async () => {
      try {
        const res = await fetch(FEED_API);

        if (!res.ok) throw new Error('Feed fetch failed');

        const feedData: FeedData = await res.json();

        setReports(mapPostsToReports(feedData.posts));
        setTotal(feedData.totalPosts);
      } catch (error) {
        console.error('Failed to fetch feed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [initialData]);

  // 클라이언트에서 정렬 처리
  const sortedReports = useMemo(() => {
    const sorted = [...reports];

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
  }, [reports, activeTab]);

  // 검색 및 필터링
  const filteredReports = useMemo(() => {
    return sortedReports.filter((report) => {
      // 북마크 탭: 북마크한 글만 표시
      if (activeTab === 'following') {
        if (!bookmarkedIds.includes(report.id)) return false;
      }

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
  }, [sortedReports, searchQuery, filters, activeTab, bookmarkedIds]);

  // 로딩 중 스켈레톤 UI
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* TOP 10 스켈레톤 */}
        <div className="animate-pulse h-[280px] bg-gray-200 dark:bg-gray-700 rounded-xl mb-8" />

        {/* 검색바 스켈레톤 */}
        <div className="hidden md:block mb-8">
          <div className="animate-pulse h-[48px] bg-gray-200 dark:bg-gray-700 rounded-lg mb-6" />
          <div className="animate-pulse h-[52px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>

        {/* 탭 스켈레톤 */}
        <div className="flex gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-[40px] w-[100px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>

        {/* 카드 스켈레톤 */}
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-[180px] bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

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
            북마크
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
            북마크
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
});

export default HomeClient;
