'use client';

import { useState, useMemo, memo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { ReportSummary } from '@/types/report';
import ReportCard from '@/components/ReportCard';
import { useBookmark } from '@/contexts/BookmarkContext';
import { loadThemes, getSymbolsForThemes } from '@/lib/themeStocks';
import type { Theme } from '@/types/theme';

// SSR 활성화: ReportCard는 직접 import (가장 중요한 콘텐츠)
// 덜 중요한 컴포넌트만 dynamic import
const TopReturnSlider = dynamic(() => import('@/components/TopReturnSlider'), {
  loading: () => <div className="animate-pulse h-[200px] sm:h-[280px] bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)] mb-4 sm:mb-8" />,
});
const SearchBar = dynamic(() => import('@/components/SearchBar'), {
  loading: () => <div className="animate-pulse h-[48px] bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)]" />,
});

type FeedTab = 'all' | 'following' | 'popular' | 'return';
type MarketFilter = 'all' | 'KR' | 'US' | 'JP' | 'CN' | 'HK';

const marketLabels: Record<MarketFilter, string> = {
  all: '전체', KR: '한국', US: '미국', JP: '일본', CN: '중국', HK: '홍콩',
};
const MARKET_EXCHANGES: Record<string, string[]> = {
  KR: ['KRX'], US: ['NAS', 'NYS', 'AMS'], JP: ['TSE'], CN: ['SHS', 'SZS'], HK: ['HKS'],
};
const marketKeys = Object.keys(marketLabels) as MarketFilter[];

// 필터 (텍스트 스타일 - 검색 페이지와 동일)
const FILTER_BASE = 'flex-shrink-0 font-heading tracking-wide text-[10px] sm:text-xs px-1 py-0.5 sm:px-2 sm:py-1 transition-all';
const FILTER_ACTIVE = `${FILTER_BASE} font-bold text-[var(--pixel-accent)] border-b-2 border-[var(--pixel-accent)]`;
const FILTER_INACTIVE = `${FILTER_BASE} font-medium text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]`;

/** 측정 컨테이너에서 첫 줄에 들어가는 아이템 수 계산 */
function measureFirstRow(container: HTMLElement | null): number {
  if (!container) return Infinity;
  const children = Array.from(container.children) as HTMLElement[];
  if (children.length <= 1) return Infinity;
  const firstTop = children[0].offsetTop;
  let count = 0;
  for (const child of children) {
    if (child.offsetTop !== firstTop) break;
    count++;
  }
  return count >= children.length ? Infinity : Math.max(count - 1, 1);
}

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
  avgPrice?: number;
  entries?: { price: number; date: string; timestamp: string }[];
  themes?: string[];
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
    avgPrice: post.avgPrice,
    entries: post.entries,
    themes: post.themes,
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
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');

  // 테마 칩 더보기
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [themeVisible, setThemeVisible] = useState(Infinity);
  const themeMeasureRef = useRef<HTMLDivElement>(null);

  // 북마크 상태
  const { bookmarkedIds } = useBookmark();

  useEffect(() => {
    loadThemes().then(setAllThemes).catch(console.error);
  }, []);

  useEffect(() => {
    const measure = () => {
      if (!themeExpanded) setThemeVisible(measureFirstRow(themeMeasureRef.current));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [allThemes, themeExpanded]);

  const themeSymbols = useMemo(() => {
    if (!selectedTheme || allThemes.length === 0) return null;
    return getSymbolsForThemes(allThemes, [selectedTheme]);
  }, [selectedTheme, allThemes]);

  const themeItems = useMemo(() => [
    { id: null, name: '전체' },
    ...allThemes.map(t => ({ id: t.id as string | null, name: t.name })),
  ], [allThemes]);

  const totalThemes = themeItems.length;

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
      // 북마크 탭
      if (activeTab === 'following') {
        if (!bookmarkedIds.includes(report.id)) return false;
      }

      // 테마 필터
      if (themeSymbols) {
        const hasTagMatch = report.themes?.some((t: string) => t === selectedTheme);
        const hasSymbolMatch = themeSymbols.has(report.ticker.toUpperCase());
        if (!hasTagMatch && !hasSymbolMatch) return false;
      }

      // 상장사 필터
      if (marketFilter !== 'all') {
        const exchanges = MARKET_EXCHANGES[marketFilter];
        if (!exchanges || !report.exchange || !exchanges.includes(report.exchange.toUpperCase())) return false;
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

      return true;
    });
  }, [sortedReports, searchQuery, activeTab, bookmarkedIds, themeSymbols, selectedTheme, marketFilter]);

  // 로딩 중 스켈레톤 UI
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-12">
        {/* TOP 10 스켈레톤 */}
        <div className="animate-pulse h-[200px] sm:h-[280px] bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)] mb-4 sm:mb-8" />

        {/* 검색바 + 탭 스켈레톤 */}
        <div className="mb-4">
          <div className="animate-pulse h-[40px] bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)] mb-3" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-[20px] w-[50px] bg-[var(--pixel-border-muted)]/30" />
            ))}
          </div>
        </div>

        {/* 카드 스켈레톤 */}
        <div className="space-y-3 sm:space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-[140px] sm:h-[180px] bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-12">
      {/* TOP 10 Return Rate Slider */}
      <TopReturnSlider reports={reports} />

      {/* 검색바 */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} placeholder="" showStockSuggestions={false} />

      {/* 필터: 왼쪽 상장사 | 오른쪽 정렬탭 */}
      <div className="mb-3 sm:mb-4 flex justify-between items-center overflow-x-auto scrollbar-hide">
        <div className="flex gap-0.5 sm:gap-1 flex-nowrap items-center">
          {marketKeys.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={marketFilter === m ? FILTER_ACTIVE : FILTER_INACTIVE}
            >
              {marketLabels[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 sm:gap-1 flex-nowrap ml-2 items-center">
          {(['all', 'following', 'popular', 'return'] as FeedTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? FILTER_ACTIVE : FILTER_INACTIVE}
            >
              {{ all: '전체', following: '북마크', popular: '인기순', return: '수익률순' }[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="space-y-3 sm:space-y-6">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : (
          <div className="pixel-empty-state">
            <p className="font-pixel text-sm mb-2">
              {searchQuery ? '검색 결과가 없습니다.' : '아직 작성된 리포트가 없습니다.'}
            </p>
            <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">
              {searchQuery ? '다른 검색어를 입력해보세요.' : '첫 번째 리포트를 작성해보세요!'}
            </p>
          </div>
        )}
      </div>

      {/* 게시물 수 표시 */}
      {filteredReports.length > 0 && (
        <div className="flex justify-center mt-8">
          <span className="font-pixel text-xs text-gray-500 dark:text-gray-400">
            총 {total}개의 리포트
          </span>
        </div>
      )}
    </div>
  );
});

export default HomeClient;
