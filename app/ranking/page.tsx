'use client';

import { useState } from 'react';
import RankingReportCard from '@/components/RankingReportCard';

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

export default function RankingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'investors'>('reports');

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          수익률 랭킹
        </h1>
        <p className="text-lg text-gray-600">
          작성일부터 지금까지 얼마나 수익이 났을까요?
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          리포트 랭킹
        </button>
        <button
          onClick={() => setActiveTab('investors')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'investors'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          투자자 랭킹
        </button>
      </div>

      {activeTab === 'reports' && (
        <>
          {/* Time Period Filter */}
          <div className="mb-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">기간별 수익률</h3>
            <div className="flex gap-3 flex-wrap">
              {(['1week', '1month', '3months', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getPeriodLabel(period)}
                </button>
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
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            상위 투자자 랭킹
          </h2>
          <div className="space-y-3">
            {topInvestors.map((investor) => (
              <div
                key={investor.rank}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-400 w-8 text-center">
                    {getMedalEmoji(investor.rank)}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">{investor.name}</div>
                    <div className="text-sm text-gray-500">
                      리포트 {investor.totalReports}개 · 좋아요 {investor.totalLikes}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    +{investor.avgReturnRate}%
                  </div>
                  <div className="text-xs text-gray-500">평균 수익률</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
