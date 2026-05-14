/**
 * GET /api/users/by-nickname/[nickname]
 *
 * 닉네임으로 사용자의 공개 정보를 반환.
 * 사용자 프로필 페이지(/user/[username])가 통계·해금배지를 즉시 받음.
 *
 * 응답
 *   { user: { uid, nickname, bio, equippedBadgeId, stats, unlockedBadgeIds, lastStatsUpdate } }
 *   또는 404
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-admin';
import { BADGES_BY_ID } from '@/lib/badges';

export async function GET(
  _request: NextRequest,
  context: { params: { nickname: string } | Promise<{ nickname: string }> },
) {
  try {
    const params = await context.params;
    const nickname = decodeURIComponent(params.nickname || '').trim();
    if (!nickname) {
      return NextResponse.json({ error: 'nickname 필요' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, nickname, bio, equipped_badge_id, is_suspended, updated_at')
      .eq('nickname', nickname)
      .maybeSingle();

    if (userErr) {
      console.error('[users/by-nickname] users select error:', userErr);
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }
    if (!user || user.is_suspended) {
      return NextResponse.json({ error: '존재하지 않습니다.' }, { status: 404 });
    }

    const equippedBadgeId =
      typeof user.equipped_badge_id === 'string' && BADGES_BY_ID[user.equipped_badge_id]
        ? user.equipped_badge_id
        : null;

    // 통계 (VIEW)
    const { data: stats } = await supabase
      .from('user_stats')
      .select('total_reports, avg_return_rate, max_return_rate, min_return_rate, win_rate, total_likes, total_views, short_positions, short_avg_return_rate, unique_tickers, crypto_count')
      .eq('author_id', user.id)
      .maybeSingle();

    // 해금 배지 — user_badges에서
    const { data: badgeRows } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user.id);

    const unlockedBadgeIds = (badgeRows ?? [])
      .map((r) => r.badge_id as string)
      .filter((id) => typeof id === 'string' && BADGES_BY_ID[id]);

    return NextResponse.json(
      {
        user: {
          uid: user.id,
          nickname: user.nickname,
          bio: user.bio || '',
          equippedBadgeId,
          stats: stats
            ? {
                totalReports: stats.total_reports ?? 0,
                avgReturnRate: Number(stats.avg_return_rate ?? 0),
                maxReturnRate: Number(stats.max_return_rate ?? 0),
                minReturnRate: Number(stats.min_return_rate ?? 0),
                winRate: Number(stats.win_rate ?? 0),
                totalLikes: stats.total_likes ?? 0,
                totalViews: stats.total_views ?? 0,
                shortPositions: stats.short_positions ?? 0,
                shortAvgReturnRate: Number(stats.short_avg_return_rate ?? 0),
                uniqueTickers: stats.unique_tickers ?? 0,
                cryptoCount: stats.crypto_count ?? 0,
              }
            : null,
          unlockedBadgeIds,
          lastStatsUpdate: user.updated_at ?? null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180',
        },
      },
    );
  } catch (e) {
    console.error('[users/by-nickname] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '조회 실패' },
      { status: 500 },
    );
  }
}
