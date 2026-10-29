// /api/admin/comments — 관리자 전용
//   GET    - 최근 댓글 100개 (최신순)
//   DELETE - 댓글 삭제 (트리거가 posts.comment_count 감소)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { sql } from '@/lib/db';

interface CommentRow {
  id: string;
  content: string | null;
  post_id: string;
  author_id: string;
  likes: number | null;
  created_at: string;
  author_nickname: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    let rows: CommentRow[];
    try {
      rows = (await sql`
        select c.id, c.content, c.post_id, c.author_id, c.likes, c.created_at, u.nickname as author_nickname
        from comments c
        left join users u on u.id = c.author_id
        order by c.created_at desc
        limit 100
      `) as CommentRow[];
    } catch (error) {
      console.error('[admin/comments GET]:', error);
      return NextResponse.json({ error: '댓글 조회 실패' }, { status: 500 });
    }

    const comments = rows.map((r) => ({
      id: r.id,
      content: r.content ?? '',
      authorName: r.author_nickname ?? '익명',
      authorId: r.author_id,
      postId: r.post_id,
      likes: r.likes ?? 0,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json({ error: '댓글 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { commentId } = await request.json();
    // postId는 트리거가 자동 처리하므로 무시
    if (!commentId) {
      return NextResponse.json({ error: '댓글 ID가 필요합니다.' }, { status: 400 });
    }

    let data: Record<string, unknown>[];
    try {
      data = await sql`delete from comments where id = ${commentId} returning id, post_id`;
    } catch (error) {
      console.error('[admin/comments DELETE]:', error);
      return NextResponse.json({ error: '댓글 삭제 실패' }, { status: 500 });
    }
    if (data.length === 0) {
      return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
    }

    console.log(`[Admin] 댓글 삭제: ${commentId} by ${admin.email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json({ error: '댓글 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
