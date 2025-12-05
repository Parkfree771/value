'use client';

import ReportCard from '@/components/ReportCard';
import FilterBar from '@/components/FilterBar';
import TopReturnSlider from '@/components/TopReturnSlider';

// Mock data - 실제로는 API에서 가져올 데이터
const mockReports = [
  {
    id: '1',
    title: '삼성전자 반도체 업황 회복 기대',
    author: '투자왕김부자',
    stockName: '삼성전자',
    ticker: '005930',
    opinion: 'buy' as const,
    returnRate: 24.5,
    initialPrice: 50000,
    currentPrice: 62250,
    createdAt: '2025-11-01',
    views: 1234,
    likes: 89,
  },
  {
    id: '2',
    title: 'NVIDIA AI 시장 과열 우려',
    author: '월가의늑대',
    stockName: 'NVIDIA',
    ticker: 'NVDA',
    opinion: 'sell' as const,
    returnRate: -12.3,
    initialPrice: 500,
    currentPrice: 438.5,
    createdAt: '2025-10-15',
    views: 2341,
    likes: 156,
  },
  {
    id: '3',
    title: '현대차 전기차 판매 호조',
    author: '주린이탈출',
    stockName: '현대차',
    ticker: '005380',
    opinion: 'buy' as const,
    returnRate: 18.7,
    initialPrice: 180000,
    currentPrice: 213660,
    createdAt: '2025-11-10',
    views: 876,
    likes: 67,
  },
  {
    id: '4',
    title: 'Apple 신제품 발표 기대',
    author: '애플매니아',
    stockName: 'Apple',
    ticker: 'AAPL',
    opinion: 'hold' as const,
    returnRate: 5.2,
    initialPrice: 175,
    currentPrice: 184.1,
    createdAt: '2025-11-20',
    views: 1567,
    likes: 112,
  },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          투자 리포트 커뮤니티
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          개인 투자자들의 실시간 투자 아이디어와 성과를 확인하세요
        </p>
      </div>

      {/* TOP 5 Return Rate Slider */}
      <TopReturnSlider />

      {/* Filters */}
      <FilterBar />

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
          전체 피드
        </button>
        <button className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors">
          팔로우 피드
        </button>
      </div>

      {/* Reports Grid */}
      <div className="space-y-4">
        {mockReports.map((report) => (
          <ReportCard key={report.id} {...report} />
        ))}
      </div>

      {/* Load More Button */}
      <div className="text-center mt-8">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          더 보기
        </button>
      </div>
    </div>
  );
}
