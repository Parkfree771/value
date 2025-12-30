'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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

export default function RankingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'investors' | 'trending'>('investors');
  const [reports, setReports] = useState<RankedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<any[]>([]);
  const [trending, setTrending] = useState<RankedReport[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // API에서 실시간 수익률이 계산된 리포트 데이터 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/reports?sortBy=returnRate&limit=100');
        const data = await response.json();

        if (data.success) {
          // daysElapsed 계산 추가
          const reportsWithDays: RankedReport[] = data.reports.map((report: any) => {
            const createdDate = new Date(report.createdAt);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - createdDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
              ...report,
              daysElapsed: diffDays,
              priceHistory: report.priceHistory || [],
            };
          });

          setReports(reportsWithDays);

          // 인기글 데이터 설정 (조회수 + 좋아요 기준으로 정렬)
          const trendingData = [...reportsWithDays].sort((a, b) => {
            const scoreA = (a.views || 0) + (a.likes || 0) * 2; // 좋아요에 2배 가중치
            const scoreB = (b.views || 0) + (b.likes || 0) * 2;
            return scoreB - scoreA;
          });
          setTrending(trendingData);

          // 투자자 데이터 설정 (작성자별 평균 수익률)
          const authorMap = new Map<string, { totalReturn: number; count: number; author: string }>();
          reportsWithDays.forEach(report => {
            const existing = authorMap.get(report.author);
            if (existing) {
              existing.totalReturn += report.returnRate;
              existing.count += 1;
            } else {
              authorMap.set(report.author, {
                totalReturn: report.returnRate,
                count: 1,
                author: report.author,
              });
            }
          });

          const investorsData = Array.from(authorMap.values())
            .map(({ author, totalReturn, count }) => ({
              rank: 0,
              name: author,
              avgReturnRate: totalReturn / count,
              totalReports: count,
              totalLikes: reportsWithDays
                .filter(r => r.author === author)
                .reduce((sum, r) => sum + (r.likes || 0), 0),
            }))
            .sort((a, b) => b.avgReturnRate - a.avgReturnRate)
            .map((investor, index) => ({ ...investor, rank: index + 1 }));

          setInvestors(investorsData);
        } else {
          console.error('리포트 가져오기 실패:', data.error);
        }
      } catch (error) {
        console.error('리포트 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Reset to page 1 when tab or period changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedPeriod]);

  const getPeriodLabel = (period: TimePeriod) => {
    const labels = {
      '1month': '1달',
      '3months': '3달',
      '6months': '6달',
      '1year': '1년',
      'all': '전체',
    };
    return labels[period];
  };

  // 기간에 따라 필터링된 리포트 가져오기
  const getFilteredReports = () => {
    if (selectedPeriod === 'all') {
      return reports;
    }

    const today = new Date();
    const periodDays = {
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365,
      'all': Infinity,
    };

    const maxDays = periodDays[selectedPeriod];

    return reports.filter((report) => {
      const createdDate = new Date(report.createdAt);
      const diffTime = today.getTime() - createdDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    });
  };

  // 기간에 따라 필터링된 인기글 가져오기
  const getFilteredTrending = () => {
    if (selectedPeriod === 'all') {
      return trending;
    }

    const today = new Date();
    const periodDays = {
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365,
      'all': Infinity,
    };

    const maxDays = periodDays[selectedPeriod];

    return trending.filter((report) => {
      const createdDate = new Date(report.createdAt);
      const diffTime = today.getTime() - createdDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    });
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}위`;
  };

  // Get paginated reports
  const getPaginatedReports = () => {
    const filtered = getFilteredReports();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  // Get paginated investors
  const getPaginatedInvestors = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return investors.slice(startIndex, endIndex);
  };

  // Get paginated trending
  const getPaginatedTrending = () => {
    const filtered = getFilteredTrending();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages based on active tab
  const getTotalPages = () => {
    if (activeTab === 'reports') {
      return Math.ceil(getFilteredReports().length / pageSize);
    } else if (activeTab === 'investors') {
      return Math.ceil(investors.length / pageSize);
    } else {
      return Math.ceil(getFilteredTrending().length / pageSize);
    }
  };

  const totalPages = getTotalPages();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-8">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          리포트
        </button>
        <button
          onClick={() => setActiveTab('investors')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'investors'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          투자자
        </button>
        <button
          onClick={() => setActiveTab('trending')}
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
            <Podium topThree={getFilteredReports().slice(0, 3).map((report, index) => ({
              rank: index + 1,
              name: report.stockName,
              avgReturnRate: report.returnRate,
              totalReports: 0,
              totalLikes: report.likes,
              linkPath: `/reports/${report.id}`,
            }))} />
          </div>

          {/* Mobile: Top 3 Badges */}
          <div className="md:hidden mb-4 p-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">TOP 3 리포트</h2>
            <div className="flex gap-3 justify-center items-end">
              {getFilteredReports().slice(0, 3).map((report, index) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className={`flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all hover:scale-105 ${
                    index === 0 ? 'flex-[1.4]' : 'flex-1'
                  }`}
                >
                  {/* Badge */}
                  <div className={`relative mb-3 ${
                    index === 0 ? 'w-16 h-16' :
                    index === 1 ? 'w-14 h-14' :
                    'w-12 h-12'
                  }`}>
                    {index === 0 && (
                      <>
                        {/* Diamond Badge - 3D 입체 */}
                        {/* 외곽 다중 글로우 - 3D 깊이 */}
                        <div className="absolute -inset-2 rotate-45 blur-2xl bg-cyan-300/40 animate-pulse"></div>
                        <div className="absolute -inset-1 rotate-45 blur-xl bg-blue-400/50 animate-pulse" style={{animationDelay: '0.5s'}}></div>

                        {/* 다이아몬드 메인 바디 - 3D 그라데이션 */}
                        <div className="absolute inset-0 rotate-45 bg-gradient-to-br from-cyan-100 via-blue-50 to-purple-100 rounded-xl shadow-2xl border-2 border-cyan-200/50"></div>

                        {/* 상단 패싯 (테이블) - 가장 밝은 면 */}
                        <div className="absolute inset-2 rotate-45 bg-gradient-to-br from-white via-cyan-50 to-blue-100 rounded-lg shadow-inner"></div>

                        {/* 왼쪽 대각선 패싯 - 어두운 입체면 */}
                        <div className="absolute top-2 left-0 w-1/2 h-3/4 rotate-45 bg-gradient-to-br from-cyan-500/40 via-cyan-400/30 to-transparent rounded-l-lg"></div>

                        {/* 오른쪽 대각선 패싯 - 밝은 반사면 */}
                        <div className="absolute top-2 right-0 w-1/2 h-3/4 rotate-45 bg-gradient-to-bl from-white/70 via-white/40 to-transparent rounded-r-lg"></div>

                        {/* 하단 패싯 - 깊이감 */}
                        <div className="absolute bottom-0 left-2 right-2 h-1/2 rotate-45 bg-gradient-to-t from-blue-400/50 via-cyan-300/30 to-transparent rounded-b-lg"></div>

                        {/* 중앙 크리스탈 하이라이트 - 빛나는 코어 */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-8 rotate-45 bg-white/90 rounded-full blur-md animate-pulse"></div>

                        {/* 패싯 라인들 - 크리스탈 구조 */}
                        <div className="absolute top-0 left-1/2 w-px h-full rotate-45 bg-gradient-to-b from-white/80 via-cyan-200/50 to-transparent"></div>
                        <div className="absolute top-1/2 left-0 w-full h-px rotate-45 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

                        {/* 대각선 패싯 구분선 */}
                        <div className="absolute top-0 left-1/4 w-px h-full rotate-45 bg-gradient-to-b from-white/40 via-transparent to-transparent"></div>
                        <div className="absolute top-0 right-1/4 w-px h-full rotate-45 bg-gradient-to-b from-white/40 via-transparent to-transparent"></div>

                        {/* 회전하는 반짝임 효과 */}
                        <div className="absolute inset-0 rotate-45 bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-pulse rounded-xl"></div>

                        {/* 순위 숫자 - 3D 효과 */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <span className="text-xl font-black bg-gradient-to-b from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(6,182,212,0.5)]">1</span>
                        </div>
                      </>
                    )}
                    {index === 1 && (
                      <>
                        {/* Gold Badge - 3D 입체 */}
                        <div className="absolute -inset-1 rotate-45 blur-lg bg-yellow-400/40 animate-pulse"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 rounded-xl rotate-45 shadow-2xl border-2 border-yellow-300"></div>
                        <div className="absolute inset-1 bg-gradient-to-b from-white/50 to-transparent rounded-lg rotate-45"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent rounded-xl rotate-45"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-base font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] z-10">2</span>
                        </div>
                      </>
                    )}
                    {index === 2 && (
                      <>
                        {/* Silver Badge - 3D 입체 */}
                        <div className="absolute -inset-1 rotate-45 blur-lg bg-slate-300/40 animate-pulse"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-gray-200 to-slate-400 rounded-xl rotate-45 shadow-2xl border-2 border-slate-200"></div>
                        <div className="absolute inset-1 bg-gradient-to-b from-white/60 to-transparent rounded-lg rotate-45"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent rounded-xl rotate-45"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-black text-gray-700 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] z-10">3</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={`font-bold text-gray-900 dark:text-white text-center truncate w-full ${
                    index === 0 ? 'text-xs' : 'text-[10px]'
                  }`}>
                    {report.stockName}
                  </div>
                  <div className={`inline-block px-2 py-0.5 ${
                    report.returnRate >= 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  } text-white font-bold rounded-full mt-1 ${
                    index === 0 ? 'text-xs' : 'text-[10px]'
                  }`}>
                    {report.returnRate >= 0 ? '+' : ''}{report.returnRate.toFixed(2)}%
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Time Period Filter */}
          <div className="mb-4 sm:mb-6 flex gap-2 flex-wrap justify-center">
            {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
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
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                ))}
              </div>
            ) : getFilteredReports().length > 0 ? (
              getPaginatedReports().map((report, index) => {
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
          {!loading && totalPages > 1 && (
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

          {/* Mobile: Top 3 Badges */}
          <div className="md:hidden mb-4 p-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">TOP 3 투자자</h2>
            <div className="flex gap-3 justify-center items-end">
              {investors.slice(0, 3).map((investor, index) => (
                <Link
                  key={investor.rank}
                  href={`/user/${encodeURIComponent(investor.name)}`}
                  className={`flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all hover:scale-105 ${
                    investor.rank === 1 ? 'flex-[1.4]' : 'flex-1'
                  }`}
                >
                  {/* Badge */}
                  <div className={`relative mb-3 ${
                    investor.rank === 1 ? 'w-16 h-16' :
                    investor.rank === 2 ? 'w-14 h-14' :
                    'w-12 h-12'
                  }`}>
                    {investor.rank === 1 && (
                      <>
                        {/* Diamond Badge - 3D 입체 */}
                        {/* 외곽 다중 글로우 - 3D 깊이 */}
                        <div className="absolute -inset-2 rotate-45 blur-2xl bg-cyan-300/40 animate-pulse"></div>
                        <div className="absolute -inset-1 rotate-45 blur-xl bg-blue-400/50 animate-pulse" style={{animationDelay: '0.5s'}}></div>

                        {/* 다이아몬드 메인 바디 - 3D 그라데이션 */}
                        <div className="absolute inset-0 rotate-45 bg-gradient-to-br from-cyan-100 via-blue-50 to-purple-100 rounded-xl shadow-2xl border-2 border-cyan-200/50"></div>

                        {/* 상단 패싯 (테이블) - 가장 밝은 면 */}
                        <div className="absolute inset-2 rotate-45 bg-gradient-to-br from-white via-cyan-50 to-blue-100 rounded-lg shadow-inner"></div>

                        {/* 왼쪽 대각선 패싯 - 어두운 입체면 */}
                        <div className="absolute top-2 left-0 w-1/2 h-3/4 rotate-45 bg-gradient-to-br from-cyan-500/40 via-cyan-400/30 to-transparent rounded-l-lg"></div>

                        {/* 오른쪽 대각선 패싯 - 밝은 반사면 */}
                        <div className="absolute top-2 right-0 w-1/2 h-3/4 rotate-45 bg-gradient-to-bl from-white/70 via-white/40 to-transparent rounded-r-lg"></div>

                        {/* 하단 패싯 - 깊이감 */}
                        <div className="absolute bottom-0 left-2 right-2 h-1/2 rotate-45 bg-gradient-to-t from-blue-400/50 via-cyan-300/30 to-transparent rounded-b-lg"></div>

                        {/* 중앙 크리스탈 하이라이트 - 빛나는 코어 */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-8 rotate-45 bg-white/90 rounded-full blur-md animate-pulse"></div>

                        {/* 패싯 라인들 - 크리스탈 구조 */}
                        <div className="absolute top-0 left-1/2 w-px h-full rotate-45 bg-gradient-to-b from-white/80 via-cyan-200/50 to-transparent"></div>
                        <div className="absolute top-1/2 left-0 w-full h-px rotate-45 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

                        {/* 대각선 패싯 구분선 */}
                        <div className="absolute top-0 left-1/4 w-px h-full rotate-45 bg-gradient-to-b from-white/40 via-transparent to-transparent"></div>
                        <div className="absolute top-0 right-1/4 w-px h-full rotate-45 bg-gradient-to-b from-white/40 via-transparent to-transparent"></div>

                        {/* 회전하는 반짝임 효과 */}
                        <div className="absolute inset-0 rotate-45 bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-pulse rounded-xl"></div>

                        {/* 순위 숫자 - 3D 효과 */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <span className="text-xl font-black bg-gradient-to-b from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(6,182,212,0.5)]">1</span>
                        </div>
                      </>
                    )}
                    {investor.rank === 2 && (
                      <>
                        {/* Gold Badge - 3D 입체 */}
                        <div className="absolute -inset-1 rotate-45 blur-lg bg-yellow-400/40 animate-pulse"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 rounded-xl rotate-45 shadow-2xl border-2 border-yellow-300"></div>
                        <div className="absolute inset-1 bg-gradient-to-b from-white/50 to-transparent rounded-lg rotate-45"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent rounded-xl rotate-45"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-base font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] z-10">2</span>
                        </div>
                      </>
                    )}
                    {investor.rank === 3 && (
                      <>
                        {/* Silver Badge - 3D 입체 */}
                        <div className="absolute -inset-1 rotate-45 blur-lg bg-slate-300/40 animate-pulse"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-gray-200 to-slate-400 rounded-xl rotate-45 shadow-2xl border-2 border-slate-200"></div>
                        <div className="absolute inset-1 bg-gradient-to-b from-white/60 to-transparent rounded-lg rotate-45"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent rounded-xl rotate-45"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-black text-gray-700 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] z-10">3</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={`font-bold text-gray-900 dark:text-white text-center truncate w-full ${
                    investor.rank === 1 ? 'text-xs' : 'text-[10px]'
                  }`}>
                    {investor.name}
                  </div>
                  <div className={`inline-block px-2 py-0.5 ${
                    investor.avgReturnRate >= 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  } text-white font-bold rounded-full mt-1 ${
                    investor.rank === 1 ? 'text-xs' : 'text-[10px]'
                  }`}>
                    {investor.avgReturnRate >= 0 ? '+' : ''}{investor.avgReturnRate.toFixed(2)}%
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Time Period Filter */}
          <div className="mb-4 sm:mb-6 flex gap-2 flex-wrap justify-center">
            {(['1month', '3months', '6months', '1year', 'all'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
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
              {getPaginatedInvestors().map((investor) => (
                <Link
                  key={investor.rank}
                  href={`/user/${encodeURIComponent(investor.name)}`}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500 w-6 sm:w-8 text-center flex-shrink-0">
                      {getMedalEmoji(investor.rank)}
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
          {!loading && totalPages > 1 && (
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
                onClick={() => setSelectedPeriod(period)}
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
            {getFilteredTrending().length > 0 ? (
              getPaginatedTrending().map((report, index) => {
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
          {!loading && totalPages > 1 && (
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
