'use client';

import Link from 'next/link';
import { InlineLoading } from '@/components/loading/Loading';

interface Stats {
  totalPosts: number;
  totalUsers: number;
  todayPosts: number;
  weekPosts: number;
  totalViews: number;
  totalLikes: number;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    returnRate: number;
    authorName: string;
  }>;
  topUsers: Array<{
    userId: string;
    nickname: string;
    email: string;
    postCount: number;
  }>;
}

interface AdminDashboardProps {
  stats: Stats | null;
  loading: boolean;
}

export default function AdminDashboard({ stats, loading }: AdminDashboardProps) {
  if (loading) {
    return (
      <InlineLoading />
    );
  }

  if (!stats) {
    return (
      <div className="card-base text-center p-8">
        <p className="text-sm text-[var(--theme-ink-soft)]">
          통계 데이터를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="pixel-stat-card">
          <div className="text-xs text-[var(--theme-ink-soft)] mb-1">
            전체 게시글
          </div>
          <div className="text-2xl font-bold text-[var(--theme-accent)]">
            {stats.totalPosts.toLocaleString()}
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="text-xs text-[var(--theme-ink-soft)] mb-1">
            전체 사용자
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--foreground)]">
            {stats.totalUsers.toLocaleString()}
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="text-xs text-[var(--theme-ink-soft)] mb-1">
            오늘 게시글
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--foreground)]">
            {stats.todayPosts.toLocaleString()}
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="text-xs text-[var(--theme-ink-soft)] mb-1">
            주간 게시글
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--foreground)]">
            {stats.weekPosts.toLocaleString()}
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="text-xs text-[var(--theme-ink-soft)] mb-1">
            총 조회수
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--foreground)]">
            {stats.totalViews.toLocaleString()}
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="text-xs text-[var(--theme-ink-soft)] mb-1">
            총 좋아요
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
            {stats.totalLikes.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="card-base p-6">
        <h3 className="text-base font-bold mb-4">인기 게시글 TOP 5</h3>
        {stats.topPosts.length > 0 ? (
          <div className="space-y-2">
            {stats.topPosts.slice(0, 5).map((post, index) => (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 border border-[var(--theme-border-muted)] bg-[var(--theme-bg)]"
              >
                <div className="flex-shrink-0 w-8 h-8 border border-[var(--theme-border)] flex items-center justify-center font-mono font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/reports/${post.id}`}
                    className="text-sm font-bold hover:text-[var(--theme-accent)] truncate block transition-colors"
                  >
                    {post.title}
                  </Link>
                  <div className="text-xs text-[var(--theme-ink-soft)]">
                    {post.authorName}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs font-bold">
                    조회 {post.views.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--theme-ink-soft)]">
                    좋아요 {post.likes.toLocaleString()}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`text-sm font-bold ${
                      post.returnRate >= 0
                        ? 'text-[var(--color-up)]'
                        : 'text-[var(--color-down)]'
                    }`}
                  >
                    {post.returnRate >= 0 ? '+' : ''}
                    {post.returnRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--theme-ink-soft)] text-center py-4">
            게시글 데이터가 없습니다.
          </p>
        )}
      </div>

      {/* Top Users */}
      <div className="card-base p-6">
        <h3 className="text-base font-bold mb-4">활동적인 사용자 TOP 5</h3>
        {stats.topUsers.length > 0 ? (
          <div className="space-y-2">
            {stats.topUsers.slice(0, 5).map((user, index) => (
              <div
                key={user.userId}
                className="flex items-center gap-3 p-3 border border-[var(--theme-border-muted)] bg-[var(--theme-bg)]"
              >
                <div className="flex-shrink-0 w-8 h-8 border border-[var(--theme-border)] flex items-center justify-center font-mono font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {user.nickname}
                  </div>
                  <div className="text-xs text-[var(--theme-ink-soft)] truncate">
                    {user.email}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-sm font-bold text-[var(--theme-accent)]">
                    게시글 {user.postCount}개
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--theme-ink-soft)] text-center py-4">
            사용자 데이터가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
