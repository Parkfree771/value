// /api/admin/stats — 관리자 대시보드 통계
// 전체 게시글/사용자 수, 오늘·일주일 신규, 인기 글·활동 사용자 TOP 5

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
      { data: allPosts },
      { data: users },
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
      supabase
        .from('posts')
        .select(
          'id, title, views, likes, initial_price, current_price, position_type, author_id, author:users!posts_author_id_fkey(nickname)',
        ),
      supabase.from('users').select('id, email, nickname'),
    ]);

    let totalViews = 0;
    let totalLikes = 0;
    const postCountByAuthor = new Map<string, number>();
    const postsData = (allPosts ?? []).map((p) => {
      totalViews += p.views ?? 0;
      totalLikes += p.likes ?? 0;
      postCountByAuthor.set(p.author_id, (postCountByAuthor.get(p.author_id) ?? 0) + 1);
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

    const topPosts = [...postsData].sort((a, b) => b.views - a.views).slice(0, 5);

    const userById = new Map<string, { email: string; nickname: string }>();
    for (const u of users ?? []) {
      userById.set(u.id, { email: u.email ?? '', nickname: u.nickname ?? '' });
    }

    const topUsers = Array.from(postCountByAuthor.entries())
      .map(([userId, count]) => ({
        userId,
        nickname: userById.get(userId)?.nickname ?? '익명',
        email: userById.get(userId)?.email ?? '',
        postCount: count,
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);

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
