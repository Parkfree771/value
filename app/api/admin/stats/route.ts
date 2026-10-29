// /api/admin/stats — 관리자 대시보드 통계
// 전체 게시글/사용자 수, 오늘·일주일 신규, 인기 글·활동 사용자 TOP 5
// count/sum aggregate 단일 쿼리 + order/limit + user_post_counts view 사용.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { sql } from '@/lib/db';
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const [totalsRows, topPostsRaw, topUserCounts] = await Promise.all([
      // 전체/오늘/일주일 글 수 + 조회수·좋아요 SUM + 전체 사용자 수 — 단일 row 응답.
      sql`
        select
          count(*)::int as total_posts,
          count(*) filter (where created_at >= ${today.toISOString()})::int as today_posts,
          count(*) filter (where created_at >= ${weekAgo.toISOString()})::int as week_posts,
          coalesce(sum(views), 0) as total_views,
          coalesce(sum(likes), 0) as total_likes,
          (select count(*)::int from users) as total_users
        from posts
      `,
      // TOP 5 조회수 — 인덱스 사용.
      sql`
        select p.id, p.title, p.views, p.likes, p.initial_price, p.current_price, p.position_type,
               p.author_id, u.nickname as author_nickname
        from posts p
        left join users u on u.id = p.author_id
        order by p.views desc
        limit 5
      `,
      // TOP 5 작성자 — view에 nickname/email 포함되어 단일 쿼리.
      sql`
        select author_id, post_count, nickname, email
        from user_post_counts
        order by post_count desc
        limit 5
      `,
    ]);

    const totals = totalsRows[0] ?? {};
    const totalPosts = Number(totals.total_posts ?? 0);
    const totalUsers = Number(totals.total_users ?? 0);
    const todayPosts = Number(totals.today_posts ?? 0);
    const weekPosts = Number(totals.week_posts ?? 0);
    const totalViews = Number(totals.total_views ?? 0);
    const totalLikes = Number(totals.total_likes ?? 0);

    const topPosts = topPostsRaw.map((p) => {
      return {
        id: p.id,
        title: p.title ?? '',
        views: p.views ?? 0,
        likes: p.likes ?? 0,
        returnRate: parseFloat(
          calculateReturn(
            Number(p.initial_price ?? 0),
            Number(p.current_price ?? 0),
            (p.position_type as 'long' | 'short') ?? 'long',
          ).toFixed(2),
        ),
        authorName: p.author_nickname ?? '익명',
      };
    });

    const topUsers = topUserCounts.map((u) => {
      const row = u as { author_id: string; post_count: number; nickname?: string; email?: string };
      return {
        userId: row.author_id,
        nickname: row.nickname ?? '익명',
        email: row.email ?? '',
        postCount: row.post_count,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalPosts,
        totalUsers,
        todayPosts,
        weekPosts,
        totalViews,
        totalLikes,
        topPosts,
        topUsers,
      },
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json({ error: '통계 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
