/**
 * GET /api/users/by-nickname/[nickname]
 *
 * 닉네임으로 사용자의 공개 정보를 반환.
 * 사용자 프로필 페이지(/user/[username])가 통계·레벨을 즉시 받음.
 *
 * 응답
 *   { user: { uid, nickname, bio, level, stats, lastStatsUpdate } }
 *   또는 404
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

    let user: Record<string, any> | null;
    try {
      const rows = await sql`
        select id, nickname, bio, level_points, is_suspended, updated_at
        from users where nickname = ${nickname} limit 1
      `;
      user = rows[0] ?? null;
    } catch (userErr) {
      console.error('[users/by-nickname] users select error:', userErr);
      return NextResponse.json(
        { error: userErr instanceof Error ? userErr.message : '조회 실패' },
        { status: 500 },
      );
    }
    if (!user || user.is_suspended) {
      return NextResponse.json({ error: '존재하지 않습니다.' }, { status: 404 });
    }


    // 통계 (VIEW) + 레벨 점수 내역 — 실패해도 프로필은 반환
    const [statsRows, levelRows] = await Promise.all([
      sql`
        select total_reports, avg_return_rate, max_return_rate, min_return_rate, win_rate,
               total_likes, total_views, short_positions, short_avg_return_rate, unique_tickers
        from user_stats where author_id = ${user.id}
      `.catch((e) => {
        console.error('[users/by-nickname] user_stats select error:', e);
        return [] as Record<string, any>[];
      }),
      sql`select record_points, hold_points, profit_points from user_level_breakdown where user_id = ${user.id}`.catch(() => [] as Record<string, any>[]),
    ]);
    const levelRow = levelRows[0];
    const stats = statsRows[0] ?? null;


    return NextResponse.json(
      {
        user: {
          uid: user.id,
          nickname: user.nickname,
          bio: user.bio || '',
          level: {
            points: Number(user.level_points ?? 0),
            breakdown: levelRow
              ? { record: levelRow.record_points ?? 0, hold: levelRow.hold_points ?? 0, profit: levelRow.profit_points ?? 0 }
              : null,
          },
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
              }
            : null,
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
