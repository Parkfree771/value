'use client';

import { useParams } from 'next/navigation';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';

// Mock data - 실제로는 API에서 가져와야 합니다
const mockUserReports: Record<string, any[]> = {
  '투자왕김부자': [
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
    },
    {
      id: '7',
      title: '삼성전자 AI 칩 사업 확대',
      author: '투자왕김부자',
      stockName: '삼성전자',
      ticker: '005930',
      opinion: 'buy' as const,
      returnRate: 22.5,
      initialPrice: 60000,
      currentPrice: 73500,
      createdAt: '2025-10-15',
      views: 3421,
      likes: 289,
      daysElapsed: 51,
    },
  ],
  '반도체전문가': [
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
    },
    {
      id: '8',
      title: 'SK하이닉스 HBM3E 양산 본격화',
      author: '반도체전문가',
      stockName: 'SK하이닉스',
      ticker: '000660',
      opinion: 'buy' as const,
      returnRate: 28.3,
      initialPrice: 115000,
      currentPrice: 147545,
      createdAt: '2025-10-20',
      views: 2987,
      likes: 245,
      daysElapsed: 46,
    },
  ],
  '일론팬': [
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
    },
  ],
  '월가의늑대': [
    {
      id: '9',
      title: 'Apple Vision Pro 시장 전망',
      author: '월가의늑대',
      stockName: 'Apple',
      ticker: 'AAPL',
      opinion: 'buy' as const,
      returnRate: 19.2,
      initialPrice: 180,
      currentPrice: 214.56,
      createdAt: '2025-11-01',
      views: 2543,
      likes: 198,
      daysElapsed: 34,
    },
  ],
  '가치투자자': [
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
    },
  ],
};

// 사용자 통계 mock data
const mockUserStats: Record<string, any> = {
  '투자왕김부자': {
    totalReports: 24,
    avgReturnRate: 32.5,
    totalLikes: 1234,
    totalViews: 15678,
    successRate: 78.5,
  },
  '반도체전문가': {
    totalReports: 18,
    avgReturnRate: 28.7,
    totalLikes: 987,
    totalViews: 12456,
    successRate: 72.3,
  },
  '일론팬': {
    totalReports: 15,
    avgReturnRate: 23.8,
    totalLikes: 765,
    totalViews: 9876,
    successRate: 68.2,
  },
  '월가의늑대': {
    totalReports: 31,
    avgReturnRate: 25.3,
    totalLikes: 876,
    totalViews: 11234,
    successRate: 70.1,
  },
  '가치투자자': {
    totalReports: 22,
    avgReturnRate: 21.2,
    totalLikes: 654,
    totalViews: 8765,
    successRate: 65.4,
  },
};

export default function UserPage() {
  const params = useParams();
  const username = decodeURIComponent(params.username as string);

  const userReports = mockUserReports[username] || [];
  const userStats = mockUserStats[username] || {
    totalReports: 0,
    avgReturnRate: 0,
    totalLikes: 0,
    totalViews: 0,
    successRate: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        랭킹으로 돌아가기
      </Link>

      {/* User Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {username}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              투자 리포트 전문가
            </p>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {userStats.totalReports}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 리포트
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              +{userStats.avgReturnRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              평균 수익률
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {userStats.successRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              적중률
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {userStats.totalLikes.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 좋아요
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {userStats.totalViews.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 조회수
            </div>
          </div>
        </div>
      </div>

      {/* User Reports */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          작성한 리포트
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          총 {userReports.length}개의 리포트
        </p>
      </div>

      {userReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            작성한 리포트가 없습니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            아직 이 사용자가 작성한 리포트가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
