'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './Ranking.module.css';

const RankingReportCard = dynamic(() => import('@/components/RankingReportCard'), {
  loading: () => <div className="animate-pulse h-32 bg-[var(--theme-border-muted)]/30 border-2 border-[var(--theme-border-muted)] rounded-2xl" />,
});
const Podium = dynamic(() => import('@/components/Podium'), {
  loading: () => <div className="animate-pulse h-96 bg-[var(--theme-border-muted)]/30 border-2 border-[var(--theme-border-muted)] rounded-2xl" />,
});

type TimePeriod = '1month' | '3months' | '6months' | '1year' | 'all';
type MarketFilter = 'all' | 'KR' | 'US' | 'JP' | 'CN' | 'HK';

const marketLabels: Record<MarketFilter, string> = {
  all: '전체', KR: '한국', US: '미국', JP: '일본', CN: '중국', HK: '홍콩',
};
const MARKET_EXCHANGES: Record<string, string[]> = {
  KR: ['KRX'], US: ['NAS', 'NYS', 'AMS'], JP: ['TSE'], CN: ['SHS', 'SZS'], HK: ['HKS'],
};
const marketKeys = Object.keys(marketLabels) as MarketFilter[];

// 탭 (라운드 테마)
const TAB_CHIP = 'flex-shrink-0 font-heading tracking-wide px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl transition-all';
const TAB_ACTIVE = `${TAB_CHIP} font-bold text-[var(--theme-accent)] border-2 border-[var(--theme-accent)]`;
const TAB_INACTIVE = `${TAB_CHIP} font-medium text-gray-600 dark:text-gray-300 border-2 border-transparent hover:text-[var(--foreground)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]`;

// 날짜 필터 (텍스트 스타일 - 검색 페이지 정렬과 동일)
const PERIOD_BASE = 'flex-shrink-0 font-heading tracking-wide text-[10px] sm:text-xs px-1 py-0.5 sm:px-2 sm:py-1 transition-all';
const PERIOD_ACTIVE = `${PERIOD_BASE} font-bold text-[var(--theme-accent)] border-b-2 border-[var(--theme-accent)]`;
const PERIOD_INACTIVE = `${PERIOD_BASE} font-medium text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]`;

interface RankedReport {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType?: 'long' | 'short';
  returnRate: number;
  prevReturnRate?: number;
  returnRate1D?: number | null;
  returnRate1W?: number | null;
  returnRate1M?: number | null;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  daysElapsed: number;
  exchange?: string;
  themes?: string[];
  priceHistory: Array<{ date: string; price: number; returnRate: number }>;
}

interface InvestorData {
  rank: number;
  name: string;
  avgReturnRate: number;
  totalReports: number;
  totalLikes: number;
}

interface RankingClientProps {
  initialReports: RankedReport[];
  initialInvestors: InvestorData[];
  initialTrending: RankedReport[];
}

type SortKey = 'cum' | '1d' | '1w' | '1m' | 'views' | 'likes';
type SortDir = 'desc' | 'asc';
type OpinionFilter = 'all' | 'buy' | 'sell' | 'hold';
type PositionFilter = 'all' | 'long' | 'short';

const SORT_LABELS: Record<SortKey, string> = {
  cum: '누적',
  '1d': '1일',
  '1w': '7일',
  '1m': '한달',
  views: '조회',
  likes: '좋아요',
};
const SORT_KEYS: SortKey[] = ['cum', '1d', '1w', '1m', 'views', 'likes'];

export default function RankingClient({ initialReports, initialInvestors, initialTrending }: RankingClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'investors' | 'trending'>('reports');
  const [sortKey, setSortKey] = useState<SortKey>('cum');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [opinionFilter, setOpinionFilter] = useState<OpinionFilter>('all');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const reports = initialReports;
  const investors = initialInvestors;
  const trending = initialTrending;

  const pickRate = useCallback((r: RankedReport): number | null => {
    switch (sortKey) {
      case 'cum': return r.returnRate;
      case '1d':  return r.returnRate1D ?? null;
      case '1w':  return r.returnRate1W ?? null;
      case '1m':  return r.returnRate1M ?? null;
      case 'views': return r.views;
      case 'likes': return r.likes;
    }
  }, [sortKey]);

  // 정렬 키 클릭 — 같은 키 두 번째 클릭 시 역순, 세 번째 클릭 시 cum/desc 기본으로
  const handleSortClick = useCallback((key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortKey('cum');
      setSortDir('desc');
    }
    setCurrentPage(1);
  }, [sortKey, sortDir]);

  // Reset to page 1 when tab or period changes
  const handleTabChange = useCallback((tab: 'reports' | 'investors' | 'trending') => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
    setCurrentPage(1);
  }, []);

  const handleMarketChange = useCallback((market: MarketFilter) => {
    setMarketFilter(market);
    setCurrentPage(1);
  }, []);

  const periodLabels = useMemo(() => ({
    '1month': '1달',
    '3months': '3달',
    '6months': '6달',
    '1year': '1년',
    'all': '전체',
  }), []);

  const periodDays = useMemo(() => ({
    '1month': 30,
    '3months': 90,
    '6months': 180,
    '1year': 365,
    'all': Infinity,
  }), []);

  const getPeriodLabel = useCallback((period: TimePeriod) => periodLabels[period], [periodLabels]);

  // 기간 + 시장 + 의견 + 포지션 필터링 + 정렬 (memoized)
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // 시장 필터
    if (marketFilter !== 'all') {
      const exchanges = MARKET_EXCHANGES[marketFilter];
      filtered = filtered.filter((report) => {
        if (!report.exchange) return false;
        return exchanges.includes(report.exchange.toUpperCase());
      });
    }

    // 기간 필터 (작성일 기준)
    if (selectedPeriod !== 'all') {
      const today = new Date();
      const maxDays = periodDays[selectedPeriod];
      filtered = filtered.filter((report) => {
        const createdDate = new Date(report.createdAt);
        const diffTime = today.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= maxDays;
      });
    }

    // 의견 필터
    if (opinionFilter !== 'all') {
      filtered = filtered.filter((r) => r.opinion === opinionFilter);
    }

    // 포지션 필터
    if (positionFilter !== 'all') {
      filtered = filtered.filter((r) => (r.positionType ?? 'long') === positionFilter);
    }

    // 정렬 — 선택된 키 기준, null은 정렬에서 뒤로
    const sorted = [...filtered]
      .map((r) => ({ r, val: pickRate(r) }))
      .filter((x) => x.val !== null && Number.isFinite(x.val));
    sorted.sort((a, b) => sortDir === 'desc' ? (b.val as number) - (a.val as number) : (a.val as number) - (b.val as number));
    return sorted.map((x) => x.r);
  }, [reports, selectedPeriod, marketFilter, periodDays, opinionFilter, positionFilter, pickRate, sortDir]);

  // 기간 + 시장에 따라 필터링된 인기글 (memoized)
  const filteredTrending = useMemo(() => {
    let filtered = trending;

    // 시장 필터
    if (marketFilter !== 'all') {
      const exchanges = MARKET_EXCHANGES[marketFilter];
      filtered = filtered.filter((report) => {
        if (!report.exchange) return false;
        return exchanges.includes(report.exchange.toUpperCase());
      });
    }

    // 기간 필터
    if (selectedPeriod !== 'all') {
      const today = new Date();
      const maxDays = periodDays[selectedPeriod];
      filtered = filtered.filter((report) => {
        const createdDate = new Date(report.createdAt);
        const diffTime = today.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= maxDays;
      });
    }

    return filtered;
  }, [trending, selectedPeriod, marketFilter, periodDays]);

  const getRankDisplay = useCallback((rank: number) => {
    return `${rank}`;
  }, []);

  // 필터된 결과 내에서의 직전 랭킹 맵 (id → prevRank)
  // filteredReports는 이미 현재 returnRate 기준 desc 정렬이라 currentRank = index + 1
  const prevRankMap = useMemo(() => {
    const sortedByPrev = [...filteredReports].sort(
      (a, b) => (b.prevReturnRate ?? b.returnRate) - (a.prevReturnRate ?? a.returnRate)
    );
    const map = new Map<string, number>();
    sortedByPrev.forEach((report, index) => {
      map.set(report.id, index + 1);
    });
    return map;
  }, [filteredReports]);

  // Paginated data (memoized)
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReports.slice(startIndex, startIndex + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const paginatedInvestors = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return investors.slice(startIndex, startIndex + pageSize);
  }, [investors, currentPage, pageSize]);

  const paginatedTrending = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTrending.slice(startIndex, startIndex + pageSize);
  }, [filteredTrending, currentPage, pageSize]);

  // Total pages (memoized)
  const totalPages = useMemo(() => {
    if (activeTab === 'reports') return Math.ceil(filteredReports.length / pageSize);
    if (activeTab === 'investors') return Math.ceil(investors.length / pageSize);
    return Math.ceil(filteredTrending.length / pageSize);
  }, [activeTab, filteredReports.length, investors.length, filteredTrending.length, pageSize]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-wide mb-2 sm:mb-3 text-center">랭킹</h1>

      {/* Tab Navigation (카테고리 스타일) */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 justify-center">
        {(['reports', 'investors', 'trending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={activeTab === tab ? TAB_ACTIVE : TAB_INACTIVE}
          >
            {{ reports: '리포트', investors: '투자자', trending: '인기글' }[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'reports' && (
        <>
          {/* TOP 3 Podium (픽셀 카드 스타일) */}
          <Podium topThree={filteredReports.slice(0, 3).map((report, index) => ({
            rank: index + 1,
            name: report.stockName,
            avgReturnRate: report.returnRate,
            totalReports: 0,
            totalLikes: report.likes,
            linkPath: `/reports/${report.id}`,
          }))} />

          {/* Market + Period Filter */}
          <div className="mt-6 sm:mt-8 mb-3 flex flex-wrap sm:flex-nowrap justify-between items-center gap-y-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {marketKeys.map((market) => (
                <button
                  key={market}
                  onClick={() => handleMarketChange(market)}
                  className={marketFilter === market ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {marketLabels[market]}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={selectedPeriod === period ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {getPeriodLabel(period)}
                </button>
              ))}
            </div>
          </div>

          {/* 정렬 + 의견/포지션 필터 */}
          <div className="mb-4 sm:mb-6 flex flex-wrap sm:flex-nowrap justify-between items-center gap-y-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-0.5 sm:gap-1 items-center flex-nowrap">
              <span className="text-[10px] sm:text-xs text-muted font-medium mr-1">정렬</span>
              {SORT_KEYS.map((k) => {
                const active = sortKey === k;
                return (
                  <button
                    key={k}
                    onClick={() => handleSortClick(k)}
                    className={active ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                  >
                    {SORT_LABELS[k]}{active && (sortDir === 'desc' ? ' ↓' : ' ↑')}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-0.5 sm:gap-1 items-center flex-nowrap">
              {(['all', 'buy', 'sell', 'hold'] as OpinionFilter[]).map((o) => (
                <button
                  key={o}
                  onClick={() => { setOpinionFilter(o); setCurrentPage(1); }}
                  className={opinionFilter === o ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {{ all: '전체', buy: '매수', sell: '매도', hold: '보유' }[o]}
                </button>
              ))}
              <span className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1" />
              {(['all', 'long', 'short'] as PositionFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPositionFilter(p); setCurrentPage(1); }}
                  className={positionFilter === p ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {{ all: '롱숏', long: '롱', short: '숏' }[p]}
                </button>
              ))}
            </div>
          </div>

          {/* All Rankings */}
          <div className="space-y-3 sm:space-y-6">
            {filteredReports.length > 0 ? (
              paginatedReports.map((report, index) => {
                const actualRank = (currentPage - 1) * pageSize + index + 1;
                const prevRank = prevRankMap.get(report.id) ?? actualRank;
                const rankChange = prevRank - actualRank;
                return <RankingReportCard key={report.id} report={report} rank={actualRank} rankChange={rankChange} />;
              })
            ) : (
              <div className="pixel-empty-state">
                <p className="font-sans text-sm">선택한 기간에 작성된 리포트가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-lg text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`font-sans px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                      currentPage === page
                        ? 'border-2 pixel-chip-active'
                        : 'bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-lg text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'investors' && (
        <>
          {/* TOP 3 Podium (픽셀 카드 스타일) */}
          <Podium topThree={investors.slice(0, 3)} />

          {/* Market + Period Filter */}
          <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 flex flex-wrap sm:flex-nowrap justify-between items-center gap-y-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {marketKeys.map((market) => (
                <button
                  key={market}
                  onClick={() => handleMarketChange(market)}
                  className={marketFilter === market ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {marketLabels[market]}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={selectedPeriod === period ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {getPeriodLabel(period)}
                </button>
              ))}
            </div>
          </div>

          {/* All Rankings */}
          <div className="space-y-3 sm:space-y-4">
              {paginatedInvestors.map((investor) => (
                <Link
                  key={investor.rank}
                  href={`/user/${encodeURIComponent(investor.name)}`}
                  className="flex items-center justify-between p-3 sm:p-4 card-base hover:border-[var(--theme-accent)] cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className={`${styles.investorRankBadge} ${
                      investor.rank === 1 ? styles.investorRankFirst :
                      investor.rank === 2 ? styles.investorRankSecond :
                      investor.rank === 3 ? styles.investorRankThird :
                      'bg-gray-200 dark:bg-gray-600'
                    }`}>
                      <span className={`${styles.investorRankNumber} ${
                        investor.rank === 1 ? styles.investorRankNumberFirst :
                        investor.rank === 2 ? styles.investorRankNumberSecond :
                        investor.rank === 3 ? styles.investorRankNumberThird :
                        'text-gray-600 dark:text-gray-300'
                      }`}>
                        {getRankDisplay(investor.rank)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm sm:text-lg text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors truncate">
                        {investor.name}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        리포트 {investor.totalReports}개 · 좋아요 {investor.totalLikes}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className={`text-base sm:text-2xl font-bold ${
                      investor.avgReturnRate >= 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      <span className="font-mono">{investor.avgReturnRate >= 0 ? '+' : ''}{investor.avgReturnRate.toFixed(2)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">평균 수익률</div>
                  </div>
                </Link>
              ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-lg text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`font-sans px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                      currentPage === page
                        ? 'border-2 pixel-chip-active'
                        : 'bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-lg text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'trending' && (
        <>
          <div className="mb-4 sm:mb-6">
            <h2 className="font-sans text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center">인기글</h2>
            <p className="font-sans text-xs text-gray-500 dark:text-gray-400 text-center">조회수와 좋아요가 많은 인기 리포트</p>
          </div>

          {/* Market + Period Filter */}
          <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 flex flex-wrap sm:flex-nowrap justify-between items-center gap-y-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {marketKeys.map((market) => (
                <button
                  key={market}
                  onClick={() => handleMarketChange(market)}
                  className={marketFilter === market ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {marketLabels[market]}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={selectedPeriod === period ? PERIOD_ACTIVE : PERIOD_INACTIVE}
                >
                  {getPeriodLabel(period)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 sm:space-y-6">
            {filteredTrending.length > 0 ? (
              paginatedTrending.map((report, index) => {
                const actualRank = (currentPage - 1) * pageSize + index + 1;
                return <RankingReportCard key={report.id} report={report} rank={actualRank} />;
              })
            ) : (
              <div className="pixel-empty-state">
                <p className="font-sans text-sm">선택한 기간에 작성된 리포트가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-lg text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`font-sans px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                      currentPage === page
                        ? 'border-2 pixel-chip-active'
                        : 'bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="font-sans px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-lg text-xs sm:text-sm font-bold hover:border-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
