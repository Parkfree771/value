import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-admin';

const VIEW_EXPIRY_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 24시간 내 같은 글 조회는 cookies로 차단
    if (request.cookies.get(`viewed_${id}`)) {
      return NextResponse.json({ success: true, alreadyViewed: true });
    }

    const supabase = getServiceClient();

    // atomic +1 — race condition 없음. 없는 글이면 0 row 영향.
    const { data, error } = await supabase.rpc('increment_post_views', { p_post_id: id });
    if (error) {
      console.error('[view] rpc 실패:', error);
      return NextResponse.json(
        { success: false, error: '조회수 증가 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }
    if (data === null) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ success: true, views: data });
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
