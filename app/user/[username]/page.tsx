'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';
import Card from '@/components/Card';

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
}

export default function UserPage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(params.username as string);
  const [userReports, setUserReports] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        // feed.json API에서 데이터 가져오기
        const response = await fetch('/api/feed/public');
        const data = await response.json();

        if (data.posts) {
          // 해당 사용자의 리포트만 필터링
          const filtered = data.posts.filter(
            (post: FeedPost) => post.author === username
          );

          if (filtered.length === 0) {
            setNotFound(true);
          } else {
            // 최신순 정렬
            filtered.sort((a: FeedPost, b: FeedPost) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setUserReports(filtered);
          }
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('사용자 리포트 가져오기 실패:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [username]);

  // 통계 계산
  const totalReports = userReports.length;
  const avgReturnRate =
    totalReports > 0
      ? (userReports.reduce((sum, r) => sum + r.returnRate, 0) / totalReports).toFixed(2)
      : '0.00';
  const maxReturnRate =
    totalReports > 0
      ? Math.max(...userReports.map((r) => r.returnRate)).toFixed(2)
      : '0.00';
  const winRate =
    totalReports > 0
      ? ((userReports.filter((r) => r.returnRate > 0).length / totalReports) * 100).toFixed(0)
      : '0';
  const totalViews = userReports.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = userReports.reduce((sum, r) => sum + r.likes, 0);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-ant-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            사용자를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            해당 사용자가 존재하지 않거나 작성한 리포트가 없습니다.
          </p>
          <button
            onClick={() => router.back()}
            className="btn-primary font-pixel"
          >
            돌아가기
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-ant-red-600 dark:text-ant-red-400 hover:text-ant-red-700 dark:hover:text-ant-red-300 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        돌아가기
      </button>

      {/* User Profile Header */}
      <Card variant="glass" padding="lg" className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 프로필 정보 */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--pixel-accent)] border-[3px] border-pixel-accent-dark flex items-center justify-center text-white font-pixel text-xl sm:text-2xl font-bold shadow-pixel">
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-pixel text-lg sm:text-xl font-bold">
                {username}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{totalReports}개 리포트</span>
                <span>·</span>
                <span>승률 {winRate}%</span>
              </div>
            </div>
          </div>

          {/* 핵심 통계 */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="text-center">
              <div className={`text-xl sm:text-2xl font-black ${
                parseFloat(avgReturnRate) > 0 ? 'text-red-500' :
                parseFloat(avgReturnRate) < 0 ? 'text-blue-500' :
                'text-gray-500'
              }`}>
                {parseFloat(avgReturnRate) >= 0 ? '+' : ''}{avgReturnRate}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">평균 수익률</div>
            </div>
            <div className="text-center">
              <div className={`text-xl sm:text-2xl font-black ${
                parseFloat(maxReturnRate) > 0 ? 'text-red-500' :
                parseFloat(maxReturnRate) < 0 ? 'text-blue-500' :
                'text-gray-500'
              }`}>
                {parseFloat(maxReturnRate) >= 0 ? '+' : ''}{maxReturnRate}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">최고 수익률</div>
            </div>
          </div>
        </div>

        {/* 하단 통계 */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <span>조회 {totalViews.toLocaleString()}</span>
          <span>·</span>
          <span>좋아요 {totalLikes.toLocaleString()}</span>
        </div>
      </Card>

      {/* User Reports */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          작성한 리포트
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          총 {userReports.length}개의 리포트
        </p>
      </div>

      <div className="space-y-6">
        {userReports.map((report) => (
          <ReportCard
            key={report.id}
            id={report.id}
            title={report.title}
            author={report.author}
            stockName={report.stockName}
            ticker={report.ticker}
            opinion={report.opinion}
            initialPrice={report.initialPrice}
            currentPrice={report.currentPrice}
            returnRate={report.returnRate}
            createdAt={report.createdAt}
            views={report.views}
            likes={report.likes}
            category={report.category}
            exchange={report.exchange}
            showActions={false}
          />
        ))}
      </div>
    </div>
  );
}
