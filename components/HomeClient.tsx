'use client';

import { useState, useMemo, memo, useEffect, useRef, useCallback, Fragment } from 'react';
import dynamic from 'next/dynamic';
import type { ReportSummary } from '@/types/report';
import type { FeedPost, FeedData } from '@/types/feed';
import ReportCard from '@/components/ReportCard';
import WriteCtaCard from '@/components/WriteCtaCard';
import { HomeSkeleton } from '@/components/loading/Loading';
import { matchesReport } from '@/utils/reportSearch';
import FrontPage from '@/components/front/FrontPage';
import MarketStrip from '@/components/front/MarketStrip';
import FeedSidebar from '@/components/front/FeedSidebar';
import type { Briefing } from '@/lib/briefing';
import type { TickerResponse } from '@/lib/ticker';
import { useBookmark } from '@/contexts/BookmarkContext';
import { loadThemes, getSymbolsForThemes } from '@/lib/themeStocks';
import type { Theme } from '@/types/theme';

// SSR 활성화: ReportCard는 직접 import (가장 중요한 콘텐츠)
// 덜 중요한 컴포넌트만 dynamic import
const SearchBar = dynamic(() => import('@/components/SearchBar'), {
  loading: () => <div className="skel h-11 w-full sm:w-72" />,
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
const FILTER_BASE = 'flex-shrink-0 font-heading tracking-tight sm:tracking-wide text-[10px] sm:text-sm px-1 py-0.5 sm:px-3 sm:py-1.5 transition-all';
const FILTER_ACTIVE = `${FILTER_BASE} font-black text-[var(--theme-accent)] border-b-2 border-[var(--theme-accent)]`;
const FILTER_INACTIVE = `${FILTER_BASE} font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--theme-accent)]`;

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

// 날짜 줄 — "2026년 10월 30일 금요일" (한국 시간)
const DATELINE = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

// feed.json API 엔드포인트 (클라이언트 재검증용)
const FEED_API = '/api/feed/public';

interface HomeClientProps {
  initialData: FeedData | null;
  briefing?: Briefing | null;
  ticker?: TickerResponse | null;
}

// FeedPost를 ReportSummary로 매핑하는 함수
function mapPostsToReports(posts: FeedPost[]): ReportSummary[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author,
    levelPoints: post.levelPoints,
    stockName: post.stockName,
    ticker: post.ticker,
    opinion: post.opinion,
    returnRate: post.returnRate,
    prevReturnRate: post.prevReturnRate,
    returnRate1D: post.returnRate1D,
    returnRate1W: post.returnRate1W,
    returnRate1M: post.returnRate1M,
    initialPrice: post.initialPrice,
    currentPrice: post.currentPrice,
    createdAt: post.createdAt,
    views: post.views,
    likes: post.likes,
    commentCount: post.commentCount ?? 0,
    authorIsVirtual: post.authorIsVirtual ?? false,
    exchange: post.exchange,
    category: post.category,
    positionType: post.positionType,
    themes: post.themes,
    excerpt: post.excerpt,
    thumbnail: post.thumbnail,
    stockData: undefined,
  }));
}

const HomeClient = memo(function HomeClient({ initialData, briefing = null, ticker = null }: HomeClientProps) {
  // 서버에서 받은 initialData로 초기 상태 설정
  const [reports, setReports] = useState<ReportSummary[]>(() =>
    initialData?.posts ? mapPostsToReports(initialData.posts) : []
  );
  const [total, setTotal] = useState(() => initialData?.totalPosts || 0);
  // initialData가 있으면 로딩 완료 상태로 시작
  const [isLoading, setIsLoading] = useState(!initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  // 수익률순 3단 사이클: 비활성 → desc(높은순) → asc(낮은순) → 비활성(기본)
  const [returnDir, setReturnDir] = useState<'desc' | 'asc'>('desc');

  const handleTabClick = useCallback((tab: FeedTab) => {
    if (tab !== 'return') {
      setActiveTab(tab);
      return;
    }
    if (activeTab !== 'return') {
      setActiveTab('return');
      setReturnDir('desc');
    } else if (returnDir === 'desc') {
      setReturnDir('asc');
    } else {
      setActiveTab('all');
      setReturnDir('desc');
    }
  }, [activeTab, returnDir]);
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  // 검색·필터를 쓰기 시작하면 전체 글(최대 500)을 한 번 받아온다 — SSR 은 최신 50 + 상위 일부만 싣기 때문에
  // 그대로 두면 "총 N개" 중 일부만 검색된다. 첫 화면만 보는 방문자는 추가 요청 없음.
  const fullLoadedRef = useRef(false);
  const wantsFullFeed = searchQuery.trim() !== '' || marketFilter !== 'all' || selectedTheme !== null || activeTab !== 'all';
  useEffect(() => {
    if (!wantsFullFeed || fullLoadedRef.current || reports.length >= total) return;
    fullLoadedRef.current = true;
    fetch(FEED_API)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Feed fetch failed'))))
      .then((feedData: FeedData) => {
        // SSR 글에만 있는 요약·썸네일은 유지
        const extra = new Map(reports.map((r) => [r.id, r]));
        setReports(
          mapPostsToReports(feedData.posts).map((r) => {
            const prev = extra.get(r.id);
            return prev ? { ...r, excerpt: prev.excerpt, thumbnail: prev.thumbnail, levelPoints: prev.levelPoints ?? r.levelPoints } : r;
          }),
        );
      })
      .catch((error) => {
        fullLoadedRef.current = false;
        console.error('Failed to fetch full feed:', error);
      });
  }, [wantsFullFeed, reports, total]);

  // SSR initialData(최신 50 + 수익률 top30)가 첫 페인트부터 피드를 채운다.
  // 평상시엔 클라이언트 피드 fetch를 하지 않는다 — 매 진입 500건 재요청 제거.
  // SSR이 실패해 initialData가 없을 때만 /api/feed/public 으로 보충한다.
  useEffect(() => {
    if (initialData) return;
    fetch(FEED_API)
      .then((res) => {
        if (!res.ok) throw new Error('Feed fetch failed');
        return res.json();
      })
      .then((feedData: FeedData) => {
        setReports(mapPostsToReports(feedData.posts));
        setTotal(feedData.totalPosts);
      })
      .catch((error) => console.error('Failed to fetch feed:', error))
      .finally(() => setIsLoading(false));
  }, [initialData]);

  // 클라이언트에서 정렬 처리
  const sortedReports = useMemo(() => {
    const sorted = [...reports];

    switch (activeTab) {
      case 'popular':
        sorted.sort((a, b) => b.views - a.views);
        break;
      case 'return':
        sorted.sort((a, b) => returnDir === 'desc' ? b.returnRate - a.returnRate : a.returnRate - b.returnRate);
        break;
      case 'all':
      default:
        // 최신순 정렬 (createdAt desc)
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return sorted;
  }, [reports, activeTab, returnDir]);

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

      // 검색어 — 공백 무시, 한글 약칭(마이크론 → MU)까지 (utils/reportSearch)
      if (searchQuery.trim() && !matchesReport(report, searchQuery)) return false;

      return true;
    });
  }, [sortedReports, searchQuery, activeTab, bookmarkedIds, themeSymbols, selectedTheme, marketFilter]);

  // 필터/탭/검색이 바뀌면 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, marketFilter, searchQuery, selectedTheme]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReports = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, safePage, pageSize]);

  // 기본 피드(필터·검색 없음) 첫 페이지에서만 3번째 카드 뒤에 글쓰기 유도 카드
  const showWriteCta =
    safePage === 1 && activeTab === 'all' && marketFilter === 'all' && !selectedTheme && !searchQuery.trim();

  // 로딩 중 스켈레톤 UI
  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-3 sm:pb-12">
      <h1 className="sr-only">AntStreet - 개미 가치투자자의 투자 리포트 기록장</h1>
      {/* 지수 띠 */}
      <MarketStrip ticker={ticker} />
      {/* 신문 날짜 줄 — 슬로건 · 날짜 · 리포트 수 */}
      <div className="md:hidden mt-3 mb-5 flex items-baseline justify-between gap-3 border-b border-[var(--theme-border-muted)] pb-2">
        <p className="font-serif font-bold text-[13px] sm:text-[15px] text-[var(--foreground)] break-keep">
          개인 투자자가 쓰고, 시장이 채점한다
        </p>
        <p suppressHydrationWarning className="flex-shrink-0 text-[11px] sm:text-xs text-muted tabular-nums">
          <span className="hidden sm:inline">{DATELINE.format(new Date())} · </span>리포트 {total.toLocaleString('ko-KR')}편
        </p>
      </div>

      {/* 1면 — 수익률 1·2·3위 + 4~10위 / 모닝 브리핑 · 구루 / 최신 리포트 */}
      <div className="mt-5 md:mt-7">
        <FrontPage reports={reports} briefing={briefing} />
      </div>


      {/* 아래: 모든 리포트 (왼쪽) + 고정 사이드 (오른쪽) */}
      <div className="mt-10 lg:grid lg:grid-cols-12 lg:gap-x-10">
      <div className="lg:col-span-8 min-w-0">
      {/* 제목 줄 — 왼쪽 "모든 리포트", 오른쪽 검색 */}
      <div className="section-rule flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3 sm:mb-4">
        <h2 id="feed" className="text-xl sm:text-2xl text-heading scroll-mt-20">모든 리포트</h2>
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="종목·작성자·제목으로 찾기"
          showStockSuggestions={false}
          className="w-full sm:w-72"
        />
      </div>

      {/* 필터: 왼쪽 상장사 | 오른쪽 정렬탭 (한 줄 유지, 모바일 축소) */}
      <div className="mb-3 sm:mb-4 flex justify-between items-center gap-1 overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 sm:gap-1 flex-nowrap items-center">
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
        <div className="flex gap-0 sm:gap-1 flex-nowrap sm:ml-2 items-center">
          {(['all', 'following', 'popular', 'return'] as FeedTab[]).map((tab) => {
            const label = { all: '전체', following: '북마크', popular: '인기순', return: '수익률순' }[tab];
            const showArrow = tab === 'return' && activeTab === 'return';
            return (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={activeTab === tab ? FILTER_ACTIVE : FILTER_INACTIVE}
              >
                {label}{showArrow && (returnDir === 'desc' ? ' ↓' : ' ↑')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports — 상자 없이 괘선으로 구분된 기사 목록 */}
      <div className="border-t border-[var(--theme-border-muted)]">
        {filteredReports.length > 0 ? (
          paginatedReports.map((report, index) => (
            <Fragment key={report.id}>
              <ReportCard {...report} />
              {showWriteCta && index === 2 && (
                <div className="lg:hidden">
                  <WriteCtaCard />
                </div>
              )}
            </Fragment>
          ))
        ) : (
          <div className="pixel-empty-state">
            <p className="font-sans text-sm mb-2">
              {searchQuery ? '검색 결과가 없습니다.' : '아직 작성된 리포트가 없습니다.'}
            </p>
            <p className="font-sans text-xs text-gray-500 dark:text-gray-400">
              {searchQuery ? '다른 검색어를 입력해보세요.' : '첫 번째 리포트를 작성해보세요!'}
            </p>
          </div>
        )}
      </div>

      {/* 페이지네이션 (랭킹 페이지와 동일 스타일) */}
      {filteredReports.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border border-[var(--theme-border-muted)] rounded-sm text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            이전
          </button>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`font-sans px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold rounded-sm transition-all ${
                  safePage === page
                    ? 'border pixel-chip-active'
                    : 'bg-[var(--theme-bg-card)] border border-[var(--theme-border-control)] hover:border-[var(--theme-border)]'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border border-[var(--theme-border-muted)] rounded-sm text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            다음
          </button>
        </div>
      )}

      {/* 게시물 수 표시 */}
      {filteredReports.length > 0 && (
        <div className="flex justify-center mt-4 sm:mt-6">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400">
            총 {total}개의 리포트
          </span>
        </div>
      )}
      </div>

      <aside className="hidden lg:block lg:col-span-4">
        <div className="sticky top-16">
          <FeedSidebar totalPosts={total} />
        </div>
      </aside>
      </div>
    </div>
  );
});

export default HomeClient;
