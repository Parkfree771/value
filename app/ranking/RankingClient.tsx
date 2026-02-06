'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './Ranking.module.css';

const RankingReportCard = dynamic(() => import('@/components/RankingReportCard'), {
  loading: () => <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});
const Podium = dynamic(() => import('@/components/Podium'), {
  loading: () => <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});

type TimePeriod = '1month' | '3months' | '6months' | '1year' | 'all';

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

  // 기간에 따라 필터링된 리포트 (memoized)
  const filteredReports = useMemo(() => {
    if (selectedPeriod === 'all') return reports;

    const today = new Date();
    const maxDays = periodDays[selectedPeriod];

    return reports.filter((report) => {
      const createdDate = new Date(report.createdAt);
      const diffTime = today.getTime() - createdDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    });
  }, [reports, selectedPeriod, periodDays]);

  // 기간에 따라 필터링된 인기글 (memoized)
  const filteredTrending = useMemo(() => {
    if (selectedPeriod === 'all') return trending;

    const today = new Date();
    const maxDays = periodDays[selectedPeriod];

    return trending.filter((report) => {
      const createdDate = new Date(report.createdAt);
      const diffTime = today.getTime() - createdDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    });
  }, [trending, selectedPeriod, periodDays]);

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
      {/* Tab Navigation */}
      <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-8">
        <button
          onClick={() => handleTabChange('reports')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          리포트
        </button>
        <button
          onClick={() => handleTabChange('investors')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'investors'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          투자자
        </button>
        <button
          onClick={() => handleTabChange('trending')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'trending'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          인기글
        </button>
      </div>

      {activeTab === 'reports' && (
        <>
          {/* Podium for Top 3 - Desktop only */}
          <div className="hidden md:block mb-6">
            <Podium topThree={filteredReports.slice(0, 3).map((report, index) => ({
              rank: index + 1,
              name: report.stockName,
              avgReturnRate: report.returnRate,
              totalReports: 0,
              totalLikes: report.likes,
              linkPath: `/reports/${report.id}`,
            }))} />
          </div>

          {/* Mobile: Top 3 Badges - Dark Gold Theme */}
          <div className={`md:hidden ${styles.mobileTop3}`}>
            <div className={styles.mobileTop3Box}>
              <div className={styles.mobileTopLine}></div>
              <div className={styles.mobileContent}>
                <div className={styles.mobileHeader}>
                  <p className={styles.mobileSubtitle}>Hall of Fame</p>
                  <h2 className={styles.mobileTitle}>TOP 3</h2>
                </div>
                <div className={styles.mobileBadgeLayout}>
                  {filteredReports.slice(0, 3).map((report, index) => (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className={`${styles.mobileBadgeItem} ${index === 0 ? styles.mobileBadgeItemFirst : ''}`}
                    >
                      <div className={`${styles.mobileBadge} ${
                        index === 0 ? styles.mobileBadgeFirst :
                        index === 1 ? styles.mobileBadgeSecond :
                        styles.mobileBadgeThird
                      }`}>
                        {index === 0 && (
                          <>
                            <div className={styles.mobileBadgeFirstGlow}></div>
                            <div className={styles.mobileBadgeFirstInner}></div>
                            <div className={styles.mobileBadgeFirstShine}></div>
                            <div className={styles.mobileBadgeFirstSparkle}></div>
                            <span className={styles.mobileBadgeFirstNumber}>1</span>
                          </>
                        )}
                        {index === 1 && (
                          <>
                            <div className={styles.mobileBadgeSecondInner}></div>
                            <div className={styles.mobileBadgeSecondShine}></div>
                            <span className={styles.mobileBadgeSecondNumber}>2</span>
                          </>
                        )}
                        {index === 2 && (
                          <>
                            <div className={styles.mobileBadgeThirdInner}></div>
                            <div className={styles.mobileBadgeThirdShine}></div>
                            <span className={styles.mobileBadgeThirdNumber}>3</span>
                          </>
                        )}
                      </div>
                      <div className={`${styles.mobileName} ${index === 0 ? styles.mobileNameFirst : styles.mobileNameOther}`}>
                        {report.stockName}
                      </div>
                      <div className={`${styles.mobileReturn} ${index === 0 ? styles.mobileReturnFirst : styles.mobileReturnOther} ${
                        report.returnRate >= 0 ? styles.mobileReturnPositive : styles.mobileReturnNegative
                      }`}>
                        {report.returnRate >= 0 ? '+' : ''}{report.returnRate.toFixed(2)}%
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className={styles.mobileBottomLine}></div>
            </div>
          </div>

          {/* Time Period Filter */}
          <div className="mb-4 sm:mb-6 flex gap-2 flex-wrap justify-center">
            {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-base font-semibold transition-all ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>

          {/* All Rankings */}
          <div className="space-y-6">
            {filteredReports.length > 0 ? (
              paginatedReports.map((report, index) => {
                const actualRank = (currentPage - 1) * pageSize + index + 1;
                return <RankingReportCard key={report.id} report={report} rank={actualRank} />;
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">선택한 기간에 작성된 리포트가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'investors' && (
        <>
          {/* Podium for Top 3 - Desktop only */}
          <div className="hidden md:block">
            <Podium topThree={investors.slice(0, 3)} />
          </div>

          {/* Mobile: Top 3 Badges - Dark Gold Theme */}
          <div className={`md:hidden ${styles.mobileTop3}`}>
            <div className={styles.mobileTop3Box}>
              <div className={styles.mobileTopLine}></div>
              <div className={styles.mobileContent}>
                <div className={styles.mobileHeader}>
                  <p className={styles.mobileSubtitle}>Hall of Fame</p>
                  <h2 className={styles.mobileTitle}>TOP 3</h2>
                </div>
                <div className={styles.mobileBadgeLayout}>
                  {investors.slice(0, 3).map((investor, index) => (
                    <Link
                      key={investor.rank}
                      href={`/user/${encodeURIComponent(investor.name)}`}
                      className={`${styles.mobileBadgeItem} ${investor.rank === 1 ? styles.mobileBadgeItemFirst : ''}`}
                    >
                      <div className={`${styles.mobileBadge} ${
                        investor.rank === 1 ? styles.mobileBadgeFirst :
                        investor.rank === 2 ? styles.mobileBadgeSecond :
                        styles.mobileBadgeThird
                      }`}>
                        {investor.rank === 1 && (
                          <>
                            <div className={styles.mobileBadgeFirstGlow}></div>
                            <div className={styles.mobileBadgeFirstInner}></div>
                            <div className={styles.mobileBadgeFirstShine}></div>
                            <div className={styles.mobileBadgeFirstSparkle}></div>
                            <span className={styles.mobileBadgeFirstNumber}>1</span>
                          </>
                        )}
                        {investor.rank === 2 && (
                          <>
                            <div className={styles.mobileBadgeSecondInner}></div>
                            <div className={styles.mobileBadgeSecondShine}></div>
                            <span className={styles.mobileBadgeSecondNumber}>2</span>
                          </>
                        )}
                        {investor.rank === 3 && (
                          <>
                            <div className={styles.mobileBadgeThirdInner}></div>
                            <div className={styles.mobileBadgeThirdShine}></div>
                            <span className={styles.mobileBadgeThirdNumber}>3</span>
                          </>
                        )}
                      </div>
                      <div className={`${styles.mobileName} ${investor.rank === 1 ? styles.mobileNameFirst : styles.mobileNameOther}`}>
                        {investor.name}
                      </div>
                      <div className={`${styles.mobileReturn} ${investor.rank === 1 ? styles.mobileReturnFirst : styles.mobileReturnOther} ${
                        investor.avgReturnRate >= 0 ? styles.mobileReturnPositive : styles.mobileReturnNegative
                      }`}>
                        {investor.avgReturnRate >= 0 ? '+' : ''}{investor.avgReturnRate.toFixed(2)}%
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className={styles.mobileBottomLine}></div>
            </div>
          </div>

          {/* Time Period Filter */}
          <div className="mb-4 sm:mb-6 flex gap-2 flex-wrap justify-center">
            {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-base font-semibold transition-all ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>

          {/* All Rankings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              전체 투자자 랭킹
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {paginatedInvestors.map((investor) => (
                <Link
                  key={investor.rank}
                  href={`/user/${encodeURIComponent(investor.name)}`}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
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
                      <div className="font-bold text-sm sm:text-lg text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                        {investor.name}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        리포트 {investor.totalReports}개 · 좋아요 {investor.totalLikes}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className={`text-lg sm:text-2xl font-bold ${
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
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 text-center">인기글</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">조회수와 좋아요가 많은 인기 리포트</p>
          </div>

          {/* Time Period Filter */}
          <div className="mb-6 sm:mb-8 flex gap-2 flex-wrap justify-center">
            {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-base font-semibold transition-all ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>

          <div className="space-y-4 sm:space-y-6">
            {filteredTrending.length > 0 ? (
              paginatedTrending.map((report, index) => {
                const actualRank = (currentPage - 1) * pageSize + index + 1;
                return <RankingReportCard key={report.id} report={report} rank={actualRank} />;
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">선택한 기간에 작성된 리포트가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
