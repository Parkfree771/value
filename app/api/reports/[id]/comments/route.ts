// /api/reports/[id]/comments
//   GET   - 댓글 목록 (오래된 순)
//   POST  - 댓글 작성 (트리거가 posts.comment_count 자동 증가)

import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { checkRateLimitRedis } from '@/lib/rate-limit-redis';
import { getClientIP, setRateLimitHeaders } from '@/lib/rate-limit';
import { validateComment } from '@/lib/validation';

const COMMENT_RATE_LIMIT = 10;
const COMMENT_RATE_WINDOW = 60 * 1000;

// uuid 형식이 아니면 Postgres가 22P02를 던지므로 쿼리 전에 걸러냄 (옛 동작: 0행 처리)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 게시물 존재 확인
    const postRows = UUID_RE.test(id) ? await sql`select id from posts where id = ${id}` : [];

    if (postRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 댓글 목록 (작성자 닉네임 JOIN)
    let comments: Record<string, any>[];
    try {
      comments = await sql`
        select c.id, c.content, c.author_id, c.parent_id, c.created_at, c.likes, c.is_deleted,
               u.nickname as author_nickname
        from comments c
        left join users u on u.id = c.author_id
        where c.post_id = ${id}
        order by c.created_at asc
      `;
    } catch (error) {
      console.error('[comments GET] db error:', error);
      return NextResponse.json(
        { success: false, error: '댓글 조회 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    // 사용자의 좋아요 상태 단일 쿼리로 가져오기
    let likedSet = new Set<string>();
    if (userId && UUID_RE.test(userId) && comments.length > 0) {
      const ids = comments.map((c) => c.id as string);
      const likes = await sql`
        select comment_id from comment_likes
        where user_id = ${userId} and comment_id = any(${ids}::uuid[])
      `;
      likedSet = new Set(likes.map((l) => l.comment_id as string));
    }

    const mapped = comments.map((c) => {
      return {
        id: c.id,
        content: c.is_deleted ? '[삭제된 댓글입니다]' : c.content,
        author: c.author_nickname ?? '익명',
        authorId: c.author_id,
        parentId: c.parent_id,
        createdAt: c.created_at,
        likes: c.likes ?? 0,
        isLiked: likedSet.has(c.id),
      };
    });

    return NextResponse.json({ success: true, comments: mapped, count: mapped.length });
  } catch (error) {
    console.error('댓글 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimitRedis(
      `comment:${clientIP}`,
      COMMENT_RATE_LIMIT,
      COMMENT_RATE_WINDOW,
    );
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 },
      );
      setRateLimitHeaders(response.headers, rateLimitResult, COMMENT_RATE_LIMIT);
      return response;
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { content, parentId } = body;

    const contentValidation = validateComment(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { success: false, error: contentValidation.error },
        { status: 400 },
      );
    }
    const sanitizedContent = sanitizeHtml(contentValidation.sanitized!, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // 게시물 존재 확인
    const postRows = UUID_RE.test(id) ? await sql`select id from posts where id = ${id}` : [];
    if (postRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 대댓글이면 부모 댓글 존재 확인
    if (parentId) {
      const parentRows =
        typeof parentId === 'string' && UUID_RE.test(parentId)
          ? await sql`select id from comments where id = ${parentId}`
          : [];
      if (parentRows.length === 0) {
        return NextResponse.json(
          { success: false, error: '원본 댓글을 찾을 수 없습니다.' },
          { status: 404 },
        );
      }
    }

    // author_id는 항상 세션 사용자 (옛 comments_insert_own RLS 대체)
    let inserted: Record<string, any> | undefined;
    let insertError: unknown = null;
    try {
      const rows = await sql`
        with ins as (
          insert into comments (post_id, author_id, parent_id, content)
          values (${id}, ${user.id}, ${parentId ?? null}, ${sanitizedContent})
          returning id, content, author_id, parent_id, created_at, likes
        )
        select ins.*, u.nickname as author_nickname
        from ins
        left join users u on u.id = ins.author_id
      `;
      inserted = rows[0];
    } catch (err) {
      insertError = err;
    }

    if (insertError || !inserted) {
      console.error('[comments POST] insert error:', insertError);
      return NextResponse.json(
        { success: false, error: '댓글 작성 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: inserted.id,
        content: inserted.content,
        author: inserted.author_nickname ?? '익명',
        authorId: inserted.author_id,
        parentId: inserted.parent_id,
        createdAt: inserted.created_at,
        likes: 0,
        isLiked: false,
      },
    });
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 작성 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
