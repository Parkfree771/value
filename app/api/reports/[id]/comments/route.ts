// /api/reports/[id]/comments
//   GET   - 댓글 목록 (오래된 순)
//   POST  - 댓글 작성 (트리거가 posts.comment_count 자동 증가)

import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimitRedis } from '@/lib/rate-limit-redis';
import { getClientIP, setRateLimitHeaders } from '@/lib/rate-limit';
import { validateComment } from '@/lib/validation';

const COMMENT_RATE_LIMIT = 10;
const COMMENT_RATE_WINDOW = 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 게시물 존재 확인
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!post) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 댓글 목록 (작성자 닉네임 JOIN)
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        'id, content, author_id, parent_id, created_at, likes, is_deleted, author:users!comments_author_id_fkey(nickname)',
      )
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[comments GET] supabase error:', error);
      return NextResponse.json(
        { success: false, error: '댓글 조회 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    // 사용자의 좋아요 상태 단일 쿼리로 가져오기
    let likedSet = new Set<string>();
    if (userId && comments && comments.length > 0) {
      const ids = comments.map((c) => c.id);
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', ids);
      likedSet = new Set((likes ?? []).map((l) => l.comment_id));
    }

    const mapped = (comments ?? []).map((c) => {
      const author = (c as { author?: { nickname?: string } | null }).author;
      return {
        id: c.id,
        content: c.is_deleted ? '[삭제된 댓글입니다]' : c.content,
        author: author?.nickname ?? '익명',
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

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
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
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!post) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 대댓글이면 부모 댓글 존재 확인
    if (parentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .maybeSingle();
      if (!parent) {
        return NextResponse.json(
          { success: false, error: '원본 댓글을 찾을 수 없습니다.' },
          { status: 404 },
        );
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        author_id: authData.user.id,
        parent_id: parentId ?? null,
        content: sanitizedContent,
      })
      .select(
        'id, content, author_id, parent_id, created_at, likes, author:users!comments_author_id_fkey(nickname)',
      )
      .single();

    if (insertError || !inserted) {
      console.error('[comments POST] insert error:', insertError);
      return NextResponse.json(
        { success: false, error: '댓글 작성 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    const author = (inserted as { author?: { nickname?: string } | null }).author;

    return NextResponse.json({
      success: true,
      comment: {
        id: inserted.id,
        content: inserted.content,
        author: author?.nickname ?? '익명',
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
