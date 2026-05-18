'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';
import Card from '@/components/Card';
import BadgeIcon from '@/components/BadgeIcon';
import { useUserBadge } from '@/contexts/UserBadgesContext';
import {
  BADGES,
  BADGES_BY_ID,
  CATEGORY_LABEL,
  type BadgeCategory,
  type UserStats,
} from '@/lib/badges';

interface FeedPost {
  id: string;
  title: string;
  author: string;
  equippedBadgeId?: string | null;
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

interface UserInfo {
  uid: string;
  nickname: string;
  bio: string;
  equippedBadgeId: string | null;
  stats: UserStats | null;
  unlockedBadgeIds: string[];
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
        // 1. 닉네임 → 사용자 정보·통계·해금배지
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

  // 해금된 배지 (sticky, users 컬렉션 저장값)
  const unlockedIds = userInfo?.unlockedBadgeIds ?? [];
  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const equippedBadgeId = userInfo?.equippedBadgeId ?? null;
  const equippedDef = equippedBadgeId ? BADGES_BY_ID[equippedBadgeId] : null;

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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--theme-accent)] border-2 border-[var(--theme-accent-dark)] flex items-center justify-center text-white font-sans text-xl sm:text-2xl font-bold shadow-md">
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {equippedBadgeId && (
                  <BadgeIcon
                    id={equippedBadgeId}
                    size={24}
                    title={equippedDef ? `${equippedDef.name} — ${equippedDef.description}` : undefined}
                  />
                )}
                <h1 className="font-sans text-lg sm:text-xl font-bold">
                  {username}
                </h1>
                {equippedDef && (
                  <span className="font-sans text-xs px-2 py-0.5 border-2 border-[var(--theme-accent)] text-[var(--theme-accent)] rounded-[6px] font-bold">
                    {equippedDef.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{totalReports}개 리포트</span>
                <span>·</span>
                <span>승률 {winRate}%</span>
                <span>·</span>
                <span>업적 {unlockedIds.length}/{BADGES.length}</span>
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

      {/* 배지 (해금 + 잠금 모두 표시, 카테고리별) */}
      {totalReports > 0 && (
        <Card variant="glass" padding="md" className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-base font-bold uppercase tracking-wider">업적</h2>
            <span className="font-sans text-xs text-gray-500 dark:text-gray-400">
              {unlockedIds.length}/{BADGES.length} 해금
            </span>
          </div>
          <div className="space-y-4">
            {(['single', 'avg', 'activity'] as BadgeCategory[]).map((cat) => {
              const inCat = BADGES.filter((b) => b.category === cat);
              return (
                <div key={cat}>
                  <div className="font-sans text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                    {CATEGORY_LABEL[cat]} · {inCat.filter((b) => unlockedSet.has(b.id)).length}/{inCat.length}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {inCat.map((b) => {
                      const unlocked = unlockedSet.has(b.id);
                      return (
                        <div
                          key={b.id}
                          className={`flex flex-col items-center p-2 rounded-[10px] border-2 ${
                            unlocked
                              ? 'border-[var(--theme-border-muted)]'
                              : 'border-[var(--theme-border-muted)] opacity-30 grayscale'
                          }`}
                          title={`${b.name} — ${b.description}`}
                        >
                          <BadgeIcon id={b.id} size={72} />
                          <div className="font-sans text-[10px] font-bold mt-1.5 text-center leading-tight">{b.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
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
            equippedBadgeId={report.equippedBadgeId ?? null}
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
