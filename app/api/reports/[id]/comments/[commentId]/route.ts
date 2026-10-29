// /api/reports/[id]/comments/[commentId]
//   POST   - 댓글 좋아요 토글 (트리거가 comments.likes 자동 증감)
//   GET    - 사용자의 좋아요 상태 조회
//   DELETE - 댓글 삭제 (본인/관리자만 — WHERE 절에서 검사, 트리거가 posts.comment_count 감소)

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';

// uuid 형식이 아니면 Postgres가 22P02를 던지므로 쿼리 전에 걸러냄 (옛 동작: 0행 처리)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { commentId } = await params;

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const userId = user.id;

    // 댓글 존재 확인
    const commentRows = UUID_RE.test(commentId)
      ? await sql`select id from comments where id = ${commentId}`
      : [];
    if (commentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '댓글을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 현재 좋아요 상태 확인
    const existing = await sql`
      select comment_id from comment_likes
      where comment_id = ${commentId} and user_id = ${userId}
    `;

    // user_id는 항상 세션 사용자 — 본인 좋아요만 추가/삭제 (옛 comment_likes_*_own RLS 대체)
    let isLiked: boolean;
    if (existing.length > 0) {
      await sql`delete from comment_likes where comment_id = ${commentId} and user_id = ${userId}`;
      isLiked = false;
    } else {
      await sql`insert into comment_likes (comment_id, user_id) values (${commentId}, ${userId})`;
      isLiked = true;
    }

    // 트리거가 갱신한 likes 카운트 다시 읽기
    const updated = await sql`select likes from comments where id = ${commentId}`;

    return NextResponse.json({
      success: true,
      isLiked,
      likes: updated[0]?.likes ?? 0,
    });
  } catch (error) {
    console.error('댓글 좋아요 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 좋아요 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { commentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !UUID_RE.test(userId) || !UUID_RE.test(commentId)) {
      return NextResponse.json({ success: true, isLiked: false });
    }

    const rows = await sql`
      select comment_id from comment_likes
      where comment_id = ${commentId} and user_id = ${userId}
    `;

    return NextResponse.json({ success: true, isLiked: rows.length > 0 });
  } catch (error) {
    console.error('댓글 좋아요 상태 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { commentId } = await params;

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 본인 또는 관리자(users.is_admin)만 삭제 — 옛 comments_delete_own RLS와 동일 조건.
    // 조건 불충족/없는 댓글이면 0행.
    let deleted: Record<string, unknown>[];
    try {
      deleted = await sql`
        delete from comments
        where id = ${commentId}
          and (
            author_id = ${user.id}
            or exists (select 1 from users where id = ${user.id} and is_admin = true)
          )
        returning id
      `;
    } catch (delError) {
      console.error('[comment DELETE] error:', delError);
      return NextResponse.json(
        { success: false, error: '댓글 삭제 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: '댓글을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
