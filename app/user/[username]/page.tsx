'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';
import Card from '@/components/Card';
import UserLevelInline from '@/components/UserLevelInline';
import LevelCard, { type LevelBreakdown } from '@/components/LevelCard';
import { PageLoading } from '@/components/loading/Loading';

interface FeedPost {
  id: string;
  title: string;
  author: string;
  levelPoints?: number;
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
  commentCount?: number;
  authorIsVirtual?: boolean;
  category: string;
  authorId?: string;
}

// /api/users/by-nickname 의 stats (user_stats 뷰)
interface UserStats {
  totalReports: number;
  avgReturnRate: number;
  maxReturnRate: number;
  minReturnRate: number;
  winRate: number;
  totalViews: number;
  totalLikes: number;
}

interface UserInfo {
  uid: string;
  nickname: string;
  bio: string;
  level?: { points: number; breakdown: LevelBreakdown | null };
  stats: UserStats | null;
  lastStatsUpdate: string | null;
}

export default function UserPage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(params.username as string);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userReports, setUserReports] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1. 닉네임 → 사용자 정보·통계·레벨
        const userRes = await fetch(`/api/users/by-nickname/${encodeURIComponent(username)}`);
        if (userRes.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!userRes.ok) throw new Error('user fetch failed');
        const { user } = await userRes.json();
        if (cancelled) return;
        setUserInfo(user);

        // 2. uid → 해당 사용자가 작성한 글 (Firestore where 쿼리)
        const reportsRes = await fetch(`/api/reports/by-author?uid=${encodeURIComponent(user.uid)}`);
        if (reportsRes.ok) {
          const { reports } = await reportsRes.json();
          if (!cancelled) setUserReports(reports || []);
        }
      } catch (error) {
        console.error('사용자 데이터 가져오기 실패:', error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // 통계 — users 컬렉션 stats 우선 (없으면 글 목록에서 즉석 계산)
  const totalReports = userInfo?.stats?.totalReports ?? userReports.length;
  const avgReturnRate = (userInfo?.stats?.avgReturnRate ?? (
    userReports.length > 0
      ? userReports.reduce((sum, r) => sum + r.returnRate, 0) / userReports.length
      : 0
  )).toFixed(2);
  const maxReturnRate = (userInfo?.stats?.maxReturnRate ?? (
    userReports.length > 0 ? Math.max(...userReports.map((r) => r.returnRate)) : 0
  )).toFixed(2);
  const winRate = (userInfo?.stats?.winRate ?? (
    userReports.length > 0
      ? (userReports.filter((r) => r.returnRate > 0).length / userReports.length) * 100
      : 0
  )).toFixed(0);
  const totalViews = userInfo?.stats?.totalViews ?? userReports.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = userInfo?.stats?.totalLikes ?? userReports.reduce((sum, r) => sum + r.likes, 0);

  const levelPoints = userInfo?.level?.points ?? 0;

  if (loading) {
    return (
      <PageLoading label="투자자 기록을 불러오는 중" />
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
            className="btn-primary font-sans"
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--theme-accent)] border border-[var(--theme-accent-dark)] flex items-center justify-center text-white font-sans text-xl sm:text-2xl font-bold">
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="headline text-lg sm:text-xl font-bold">
                  {username}
                </h1>
                <UserLevelInline points={levelPoints} size="md" />
              </div>
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

      {/* 레벨 (배지 시스템 대체) */}
      {userInfo?.level && (
        <div className="mb-6 sm:mb-8">
          <LevelCard points={userInfo.level.points} breakdown={userInfo.level.breakdown} />
        </div>
      )}

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
            levelPoints={report.levelPoints}
            stockName={report.stockName}
            ticker={report.ticker}
            opinion={report.opinion}
            initialPrice={report.initialPrice}
            currentPrice={report.currentPrice}
            returnRate={report.returnRate}
            createdAt={report.createdAt}
            views={report.views}
            likes={report.likes}
            commentCount={report.commentCount ?? 0}
            authorIsVirtual={report.authorIsVirtual ?? false}
            category={report.category}
            exchange={report.exchange}
            showActions={false}
          />
        ))}
      </div>
    </div>
  );
}
