'use client';

import { useState } from 'react';
import Link from 'next/link';
import RankingReportCard from '@/components/RankingReportCard';
import Podium from '@/components/Podium';

type TimePeriod = '1week' | '1month' | '3months' | 'all';

// Mock data for ranking with time-based tracking
const mockTopReports = [
  {
    id: '1',
    title: '삼성전자 반도체 업황 회복 기대',
    author: '투자왕김부자',
    stockName: '삼성전자',
    ticker: '005930',
    opinion: 'buy' as const,
    returnRate: 45.8,
    initialPrice: 50000,
    currentPrice: 72900,
    createdAt: '2025-09-01',
    views: 5234,
    likes: 432,
    daysElapsed: 95,
    priceHistory: [
      { date: '2025-09-01', price: 50000, returnRate: 0 },
      { date: '2025-09-15', price: 54000, returnRate: 8.0 },
      { date: '2025-10-01', price: 59500, returnRate: 19.0 },
      { date: '2025-10-15', price: 63200, returnRate: 26.4 },
      { date: '2025-11-01', price: 68800, returnRate: 37.6 },
      { date: '2025-11-15', price: 71500, returnRate: 43.0 },
      { date: '2025-12-05', price: 72900, returnRate: 45.8 },
    ],
  },
  {
    id: '2',
    title: 'Tesla 자율주행 기술 혁신',
    author: '일론팬',
    stockName: 'Tesla',
    ticker: 'TSLA',
    opinion: 'buy' as const,
    returnRate: 38.2,
    initialPrice: 220,
    currentPrice: 304.04,
    createdAt: '2025-09-15',
    views: 4567,
    likes: 389,
    daysElapsed: 81,
    priceHistory: [
      { date: '2025-09-15', price: 220, returnRate: 0 },
      { date: '2025-10-01', price: 238, returnRate: 8.2 },
      { date: '2025-10-15', price: 252, returnRate: 14.5 },
      { date: '2025-11-01', price: 275, returnRate: 25.0 },
      { date: '2025-11-15', price: 289, returnRate: 31.4 },
      { date: '2025-12-05', price: 304.04, returnRate: 38.2 },
    ],
  },
  {
    id: '3',
    title: 'SK하이닉스 HBM 시장 독점',
    author: '반도체전문가',
    stockName: 'SK하이닉스',
    ticker: '000660',
    opinion: 'buy' as const,
    returnRate: 35.4,
    initialPrice: 120000,
    currentPrice: 162480,
    createdAt: '2025-10-01',
    views: 3821,
    likes: 301,
    daysElapsed: 65,
    priceHistory: [
      { date: '2025-10-01', price: 120000, returnRate: 0 },
      { date: '2025-10-15', price: 128400, returnRate: 7.0 },
      { date: '2025-11-01', price: 138000, returnRate: 15.0 },
      { date: '2025-11-15', price: 150000, returnRate: 25.0 },
      { date: '2025-12-05', price: 162480, returnRate: 35.4 },
    ],
  },
  {
    id: '4',
    title: 'Microsoft AI 클라우드 성장',
    author: '클라우드왕',
    stockName: 'Microsoft',
    ticker: 'MSFT',
    opinion: 'buy' as const,
    returnRate: 28.9,
    initialPrice: 350,
    currentPrice: 451.15,
    createdAt: '2025-10-10',
    views: 3456,
    likes: 278,
    daysElapsed: 56,
    priceHistory: [
      { date: '2025-10-10', price: 350, returnRate: 0 },
      { date: '2025-10-25', price: 371, returnRate: 6.0 },
      { date: '2025-11-10', price: 399, returnRate: 14.0 },
      { date: '2025-11-25', price: 427, returnRate: 22.0 },
      { date: '2025-12-05', price: 451.15, returnRate: 28.9 },
    ],
  },
  {
    id: '5',
    title: '카카오 실적 턴어라운드',
    author: '가치투자자',
    stockName: '카카오',
    ticker: '035720',
    opinion: 'buy' as const,
    returnRate: 22.3,
    initialPrice: 45000,
    currentPrice: 55035,
    createdAt: '2025-10-20',
    views: 2890,
    likes: 234,
    daysElapsed: 46,
    priceHistory: [
      { date: '2025-10-20', price: 45000, returnRate: 0 },
      { date: '2025-11-05', price: 47700, returnRate: 6.0 },
      { date: '2025-11-20', price: 51300, returnRate: 14.0 },
      { date: '2025-12-05', price: 55035, returnRate: 22.3 },
    ],
  },
  {
    id: '6',
    title: 'NVIDIA AI 칩 수요 폭발',
    author: 'AI투자자',
    stockName: 'NVIDIA',
    ticker: 'NVDA',
    opinion: 'buy' as const,
    returnRate: 18.5,
    initialPrice: 450,
    currentPrice: 533.25,
    createdAt: '2025-11-01',
    views: 2456,
    likes: 198,
    daysElapsed: 34,
    priceHistory: [
      { date: '2025-11-01', price: 450, returnRate: 0 },
      { date: '2025-11-15', price: 486, returnRate: 8.0 },
      { date: '2025-12-05', price: 533.25, returnRate: 18.5 },
    ],
  },
];

const topInvestors = [
  { rank: 1, name: '투자왕김부자', avgReturnRate: 32.5, totalReports: 24, totalLikes: 1234 },
  { rank: 2, name: '반도체전문가', avgReturnRate: 28.7, totalReports: 18, totalLikes: 987 },
  { rank: 3, name: '월가의늑대', avgReturnRate: 25.3, totalReports: 31, totalLikes: 876 },
  { rank: 4, name: '일론팬', avgReturnRate: 23.8, totalReports: 15, totalLikes: 765 },
  { rank: 5, name: '가치투자자', avgReturnRate: 21.2, totalReports: 22, totalLikes: 654 },
];

// 인기글 데이터 (조회수/좋아요 기준)
const trendingReports = [
  {
    id: '1',
    title: 'NVIDIA AI 칩 수요 폭발적 증가 분석',
    author: 'AI투자자',
    stockName: 'NVIDIA',
    ticker: 'NVDA',
    opinion: 'buy' as const,
    returnRate: 18.5,
    initialPrice: 450,
    currentPrice: 533.25,
    createdAt: '2025-11-01',
    views: 8234,
    likes: 567,
    daysElapsed: 34,
    priceHistory: [],
  },
  {
    id: '2',
    title: '삼성전자 반도체 업황 회복 기대',
    author: '투자왕김부자',
    stockName: '삼성전자',
    ticker: '005930',
    opinion: 'buy' as const,
    returnRate: 45.8,
    initialPrice: 50000,
    currentPrice: 72900,
    createdAt: '2025-09-01',
    views: 7821,
    likes: 498,
    daysElapsed: 95,
    priceHistory: [],
  },
  {
    id: '3',
    title: 'Tesla 자율주행 FSD 베타 완성도 분석',
    author: '일론팬',
    stockName: 'Tesla',
    ticker: 'TSLA',
    opinion: 'buy' as const,
    returnRate: 38.2,
    initialPrice: 220,
    currentPrice: 304.04,
    createdAt: '2025-09-15',
    views: 6543,
    likes: 445,
    daysElapsed: 81,
    priceHistory: [],
  },
  {
    id: '4',
    title: 'SK하이닉스 HBM3E 양산 본격화',
    author: '반도체전문가',
    stockName: 'SK하이닉스',
    ticker: '000660',
    opinion: 'buy' as const,
    returnRate: 35.4,
    initialPrice: 120000,
    currentPrice: 162480,
    createdAt: '2025-10-01',
    views: 5987,
    likes: 412,
    daysElapsed: 65,
    priceHistory: [],
  },
  {
    id: '5',
    title: 'Microsoft AI Copilot 매출 급증',
    author: '클라우드왕',
    stockName: 'Microsoft',
    ticker: 'MSFT',
    opinion: 'buy' as const,
    returnRate: 28.9,
    initialPrice: 350,
    currentPrice: 451.15,
    createdAt: '2025-10-10',
    views: 5234,
    likes: 389,
    daysElapsed: 56,
    priceHistory: [],
  },
];

export default function RankingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'investors' | 'trending'>('investors');

  const getPeriodLabel = (period: TimePeriod) => {
    const labels = {
      '1week': '1주일',
      '1month': '1개월',
      '3months': '3개월',
      'all': '전체',
    };
    return labels[period];
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}위`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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
          {/* Time Period Filter */}
          <div className="mb-4 sm:mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">기간별 수익률</h3>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              {(['1week', '1month', '3months', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {getPeriodLabel(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: Top 3 Badges */}
          <div className="md:hidden mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">TOP 3 리포트</h2>
            <div className="flex gap-3 justify-center items-end">
              {mockTopReports.slice(0, 3).map((report, index) => (
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
                  <div className={`inline-block px-2 py-0.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-full mt-1 ${
                    index === 0 ? 'text-xs' : 'text-[10px]'
                  }`}>
                    +{report.returnRate}%
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* All Rankings */}
          <div className="space-y-4">
            {mockTopReports.map((report, index) => (
              <RankingReportCard key={report.id} report={report} rank={index + 1} />
            ))}
          </div>
        </>
      )}

      {activeTab === 'investors' && (
        <>
          {/* Podium for Top 3 - Desktop only */}
          <div className="hidden md:block">
            <Podium topThree={topInvestors.slice(0, 3)} />
          </div>

          {/* Mobile: Top 3 Badges */}
          <div className="md:hidden mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">TOP 3 투자자</h2>
            <div className="flex gap-3 justify-center items-end">
              {topInvestors.slice(0, 3).map((investor, index) => (
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
                  <div className={`inline-block px-2 py-0.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-full mt-1 ${
                    investor.rank === 1 ? 'text-xs' : 'text-[10px]'
                  }`}>
                    +{investor.avgReturnRate}%
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* All Rankings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              전체 투자자 랭킹
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {topInvestors.map((investor) => (
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
                    <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
                      +{investor.avgReturnRate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">평균 수익률</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'trending' && (
        <>
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">인기글</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">조회수와 좋아요가 많은 인기 리포트</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {trendingReports.map((report, index) => (
              <RankingReportCard key={report.id} report={report} rank={index + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
