import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-admin';

const VIEW_EXPIRY_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const viewedCookie = request.cookies.get(`viewed_${id}`);
    if (viewedCookie) {
      return NextResponse.json({ success: true, alreadyViewed: true });
    }

    const supabase = getServiceClient();

    const { data: post, error: selectError } = await supabase
      .from('posts')
      .select('id, views')
      .eq('id', id)
      .maybeSingle();

    if (selectError) {
      console.error('[view] select 실패:', selectError);
      return NextResponse.json(
        { success: false, error: '조회 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }
    if (!post) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({ views: (post.views ?? 0) + 1 })
      .eq('id', id);

    if (updateError) {
      console.error('[view] update 실패:', updateError);
      return NextResponse.json(
        { success: false, error: '조회수 증가 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(`viewed_${id}`, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: VIEW_EXPIRY_HOURS * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('조회수 증가 실패:', error);
    return NextResponse.json(
      { success: false, error: '조회수 증가 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
