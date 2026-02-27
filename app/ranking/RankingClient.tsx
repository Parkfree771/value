'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './Ranking.module.css';

const RankingReportCard = dynamic(() => import('@/components/RankingReportCard'), {
  loading: () => <div className="animate-pulse h-32 bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)]" />,
});
const Podium = dynamic(() => import('@/components/Podium'), {
  loading: () => <div className="animate-pulse h-96 bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)]" />,
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

// 탭 (카테고리 스타일 - 검색 페이지와 동일)
const TAB_CHIP = 'flex-shrink-0 font-heading tracking-wide px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm transition-all';
const TAB_ACTIVE = `${TAB_CHIP} font-bold text-[var(--pixel-accent)] border border-[var(--pixel-accent)]`;
const TAB_INACTIVE = `${TAB_CHIP} font-medium text-gray-600 dark:text-gray-300 hover:text-[var(--foreground)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]`;

// 날짜 필터 (텍스트 스타일 - 검색 페이지 정렬과 동일)
const PERIOD_BASE = 'flex-shrink-0 font-heading tracking-wide text-[10px] sm:text-xs px-1 py-0.5 sm:px-2 sm:py-1 transition-all';
const PERIOD_ACTIVE = `${PERIOD_BASE} font-bold text-[var(--pixel-accent)] border-b-2 border-[var(--pixel-accent)]`;
const PERIOD_INACTIVE = `${PERIOD_BASE} font-medium text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]`;

interface RankedReport {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  returnRate: number;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  daysElapsed: number;
  exchange?: string;
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

export default function RankingClient({ initialReports, initialInvestors, initialTrending }: RankingClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'investors' | 'trending'>('reports');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const reports = initialReports;
  const investors = initialInvestors;
  const trending = initialTrending;

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

  // 기간 + 시장에 따라 필터링된 리포트 (memoized)
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
  }, [reports, selectedPeriod, marketFilter, periodDays]);

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
          <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 flex justify-between items-center">
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
          <div className="space-y-3 sm:space-y-6">
            {filteredReports.length > 0 ? (
              paginatedReports.map((report, index) => {
                const actualRank = (currentPage - 1) * pageSize + index + 1;
                return <RankingReportCard key={report.id} report={report} rank={actualRank} />;
              })
            ) : (
              <div className="pixel-empty-state">
                <p className="font-pixel text-sm">선택한 기간에 작성된 리포트가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="font-pixel px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] text-xs sm:text-sm font-bold hover:border-[var(--pixel-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`font-pixel px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold transition-all ${
                      currentPage === page
                        ? 'border-2 pixel-chip-active'
                        : 'bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="font-pixel px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] text-xs sm:text-sm font-bold hover:border-[var(--pixel-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 flex justify-between items-center">
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
                  className="flex items-center justify-between p-3 sm:p-4 card-base hover:border-[var(--pixel-accent)] cursor-pointer"
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
                      {investor.avgReturnRate >= 0 ? '+' : ''}{investor.avgReturnRate.toFixed(2)}%
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
                className="font-pixel px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] text-xs sm:text-sm font-bold hover:border-[var(--pixel-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`font-pixel px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold transition-all ${
                      currentPage === page
                        ? 'border-2 pixel-chip-active'
                        : 'bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="font-pixel px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] text-xs sm:text-sm font-bold hover:border-[var(--pixel-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            <h2 className="font-pixel text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center">인기글</h2>
            <p className="font-pixel text-xs text-gray-500 dark:text-gray-400 text-center">조회수와 좋아요가 많은 인기 리포트</p>
          </div>

          {/* Market + Period Filter */}
          <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 flex justify-between items-center">
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
                <p className="font-pixel text-sm">선택한 기간에 작성된 리포트가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="font-pixel px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] text-xs sm:text-sm font-bold hover:border-[var(--pixel-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`font-pixel px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold transition-all ${
                      currentPage === page
                        ? 'border-2 pixel-chip-active'
                        : 'bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="font-pixel px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--pixel-bg-card)] border-2 border-[var(--pixel-border-muted)] text-xs sm:text-sm font-bold hover:border-[var(--pixel-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
