// /api/reports/[id]/like
//   POST - 좋아요 토글 (post_likes INSERT/DELETE, 트리거가 posts.likes 자동 증감)
//   GET  - 현재 사용자의 좋아요 상태 (쿠키 기반)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 },
      );
    }
    const userId = authData.user.id;

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

    // 현재 좋아요 상태 확인
    const { data: existing } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    let isLiked: boolean;
    if (existing) {
      const { error: delError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', id)
        .eq('user_id', userId);
      if (delError) throw delError;
      isLiked = false;
    } else {
      const { error: insError } = await supabase
        .from('post_likes')
        .insert({ post_id: id, user_id: userId });
      if (insError) throw insError;
      isLiked = true;
    }

    // 트리거가 갱신한 likes 카운트 다시 읽기
    const { data: updated } = await supabase
      .from('posts')
      .select('likes')
      .eq('id', id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      isLiked,
      likes: updated?.likes ?? 0,
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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ success: true, isLiked: false });
    }

    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', id)
      .eq('user_id', authData.user.id)
      .maybeSingle();

    return NextResponse.json({ success: true, isLiked: !!data });
  } catch (error) {
    console.error('좋아요 상태 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
