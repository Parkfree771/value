// /api/reports/[id]/comments/[commentId]
//   POST   - 댓글 좋아요 토글 (트리거가 comments.likes 자동 증감)
//   GET    - 사용자의 좋아요 상태 조회
//   DELETE - 댓글 삭제 (RLS가 본인/관리자만 허용, 트리거가 posts.comment_count 감소)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { commentId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const userId = authData.user.id;

    // 댓글 존재 확인
    const { data: comment } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .maybeSingle();
    if (!comment) {
      return NextResponse.json(
        { success: false, error: '댓글을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 현재 좋아요 상태 확인
    const { data: existing } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    let isLiked: boolean;
    if (existing) {
      const { error: delError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);
      if (delError) throw delError;
      isLiked = false;
    } else {
      const { error: insError } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: userId });
      if (insError) throw insError;
      isLiked = true;
    }

    // 트리거가 갱신한 likes 카운트 다시 읽기
    const { data: updated } = await supabase
      .from('comments')
      .select('likes')
      .eq('id', commentId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      isLiked,
      likes: updated?.likes ?? 0,
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

    if (!userId) {
      return NextResponse.json({ success: true, isLiked: false });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({ success: true, isLiked: !!data });
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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // RLS가 본인/관리자만 DELETE 허용. 실패 시 42501 또는 0행.
    const { data: deleted, error: delError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .select('id');

    if (delError) {
      console.error('[comment DELETE] error:', delError);
      const status = delError.code === '42501' ? 403 : 500;
      return NextResponse.json(
        {
          success: false,
          error:
            status === 403
              ? '본인의 댓글만 삭제할 수 있습니다.'
              : '댓글 삭제 중 오류가 발생했습니다.',
        },
        { status },
      );
    }

    if (!deleted || deleted.length === 0) {
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
