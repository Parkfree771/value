'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="border-t-2 border-[var(--theme-border)] py-14 text-center">
          <h2 className="headline text-xl sm:text-2xl mb-3">
            사용자를 찾을 수 없습니다
          </h2>
          <p className="text-sm text-[var(--theme-ink-soft)] mb-6">
            해당 사용자가 존재하지 않거나 작성한 리포트가 없습니다.
          </p>
          <button
            onClick={() => router.back()}
            className="btn-primary text-sm"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const avg = parseFloat(avgReturnRate);
  const max = parseFloat(maxReturnRate);
  const rateClass = (v: number) => (v > 0 ? 'return-positive' : v < 0 ? 'return-negative' : 'return-neutral');
  const stats: { label: string; value: string; className?: string }[] = [
    { label: '평균 수익률', value: `${avg >= 0 ? '+' : ''}${avgReturnRate}%`, className: rateClass(avg) },
    { label: '최고 수익률', value: `${max >= 0 ? '+' : ''}${maxReturnRate}%`, className: rateClass(max) },
    { label: '승률', value: `${winRate}%` },
    { label: '조회 · 좋아요', value: `${totalViews.toLocaleString()} · ${totalLikes.toLocaleString()}` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm font-bold text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] min-h-9 mb-2 sm:mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        돌아가기
      </button>

      {/* User Profile Header */}
      <header className="border-t-2 border-[var(--theme-border)] pt-4 mb-8">
        <p className="kicker">투자자</p>
        <div className="mt-2 flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 border border-[var(--theme-border)] flex items-center justify-center">
            <span className="headline text-2xl sm:text-3xl">{username[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="headline text-[24px] sm:text-[30px] leading-tight min-w-0 break-words sm:break-normal">
                {username}
              </h1>
              <UserLevelInline points={levelPoints} size="md" />
            </div>
            <p className="mt-0.5 text-sm text-[var(--theme-ink-soft)] tabular-nums">
              리포트 {totalReports}개 · 승률 {winRate}%
            </p>
          </div>
        </div>

        {/* 핵심 통계 — 얇은 괘선으로 나눈 숫자 칸 */}
        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--theme-border-muted)] border-y border-[var(--theme-border-muted)]">
          {stats.map((s) => (
            <div key={s.label} className="bg-[var(--background)] py-3 px-3 sm:px-4 min-w-0">
              <dt className="text-xs text-[var(--theme-ink-soft)]">{s.label}</dt>
              <dd className={`mt-1.5 truncate font-mono font-black tabular-nums text-lg sm:text-2xl leading-none ${s.className ?? 'text-[var(--foreground)]'}`}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* 레벨 (배지 시스템 대체) */}
      {userInfo?.level && (
        <div className="mb-6 sm:mb-8">
          <LevelCard points={userInfo.level.points} breakdown={userInfo.level.breakdown} />
        </div>
      )}

      {/* User Reports */}
      <div className="section-rule">
        <h2 className="headline text-[20px] sm:text-[22px]">
          작성한 리포트
        </h2>
        <p className="text-sm text-[var(--theme-ink-soft)] tabular-nums">
          총 {userReports.length}개의 리포트
        </p>
      </div>

      <div>
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
