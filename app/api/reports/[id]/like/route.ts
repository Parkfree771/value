// /api/reports/[id]/like
//   POST - 좋아요 토글 (post_likes INSERT/DELETE, 트리거가 posts.likes 자동 증감)
//   GET  - 현재 사용자의 좋아요 상태 (쿠키 기반)

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { checkRateLimitRedis } from '@/lib/rate-limit-redis';
import { getClientIP, setRateLimitHeaders } from '@/lib/rate-limit';

const LIKE_RATE_LIMIT = 30;
const LIKE_RATE_WINDOW = 60 * 1000;

// uuid 형식이 아니면 Postgres가 22P02를 던지므로 쿼리 전에 걸러냄 (옛 동작: 0행 처리)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 },
      );
    }
    const userId = user.id;

    // Rate limit: 사용자별 분당 30회 토글 (봇 토글 공격 방지)
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimitRedis(
      `like:${userId}:${clientIP}`,
      LIKE_RATE_LIMIT,
      LIKE_RATE_WINDOW,
    );
    if (!rateLimitResult.success) {
      const res = NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 },
      );
      setRateLimitHeaders(res.headers, rateLimitResult, LIKE_RATE_LIMIT);
      return res;
    }

    // 토글: INSERT 시도, unique constraint 위반(23505)이면 이미 좋아요 → DELETE.
    // 옛 코드는 4 round-trips (post 존재 / existing / insert or delete / 재읽기).
    // 신: 2 round-trips (insert-or-delete / 카운트 읽기). post FK는 INSERT가 자동 검증.
    // user_id는 항상 세션 사용자 — 본인 좋아요만 추가/삭제 (옛 post_likes_*_own RLS 대체)
    let isLiked: boolean;
    let insErr: { code?: string } | null = null;
    try {
      await sql`insert into post_likes (post_id, user_id) values (${id}, ${userId})`;
    } catch (err) {
      insErr = err as { code?: string };
    }

    if (insErr) {
      if (insErr.code === '23505') {
        // 이미 좋아요 했었음 → DELETE
        await sql`delete from post_likes where post_id = ${id} and user_id = ${userId}`;
        isLiked = false;
      } else if (insErr.code === '23503') {
        // FK 위반 = 게시물 없음
        return NextResponse.json(
          { success: false, error: '리포트를 찾을 수 없습니다.' },
          { status: 404 },
        );
      } else {
        throw insErr;
      }
    } else {
      isLiked = true;
    }

    // 트리거가 갱신한 likes 카운트 다시 읽기
    const updated = await sql`select likes from posts where id = ${id}`;

    return NextResponse.json({
      success: true,
      isLiked,
      likes: updated[0]?.likes ?? 0,
    });
  } catch (error) {
    console.error('좋아요 처리 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await getAuthUser();
    if (!user || !UUID_RE.test(id)) {
      return NextResponse.json({ success: true, isLiked: false });
    }

    const rows = await sql`
      select post_id from post_likes where post_id = ${id} and user_id = ${user.id}
    `;

    return NextResponse.json({ success: true, isLiked: rows.length > 0 });
  } catch (error) {
    console.error('좋아요 상태 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
