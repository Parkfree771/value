// /api/admin/stats — 관리자 대시보드 통계
// 전체 게시글/사용자 수, 오늘·일주일 신규, 인기 글·활동 사용자 TOP 5
// 풀스캔 대신 head:true count + sum aggregate + order/limit + user_post_counts view 사용.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { getServiceClient } from '@/lib/supabase-admin';
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const supabase = getServiceClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const [
      { count: totalPosts },
      { count: totalUsers },
      { count: todayPosts },
      { count: weekPosts },
      { data: totalsRow },
      { data: topPostsRaw },
      { data: topUserCounts },
    ] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString()),
      // SUM aggregate — posts 1만 행이어도 단일 row 응답.
      supabase.from('posts').select('views.sum(), likes.sum()').single(),
      // TOP 5 조회수 — 인덱스 사용.
      supabase
        .from('posts')
        .select(
          'id, title, views, likes, initial_price, current_price, position_type, author_id, author:users!posts_author_id_fkey(nickname)',
        )
        .order('views', { ascending: false })
        .limit(5),
      // TOP 5 작성자 — view에 nickname/email 포함되어 단일 쿼리.
      supabase
        .from('user_post_counts')
        .select('author_id, post_count, nickname, email')
        .order('post_count', { ascending: false })
        .limit(5),
    ]);

    const totals = (totalsRow as { sum?: number; views?: number; likes?: number } | null) ?? {};
    const totalViews = Number((totals as Record<string, number>).views ?? (totals as Record<string, number>).sum ?? 0);
    const totalLikes = Number((totals as Record<string, number>).likes ?? 0);

    const topPosts = (topPostsRaw ?? []).map((p) => {
      const author = (p as { author?: { nickname?: string } | null }).author;
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
        authorName: author?.nickname ?? '익명',
      };
    });

    const topUsers = (topUserCounts ?? []).map((u) => {
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
        totalPosts: totalPosts ?? 0,
        totalUsers: totalUsers ?? 0,
        todayPosts: todayPosts ?? 0,
        weekPosts: weekPosts ?? 0,
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
