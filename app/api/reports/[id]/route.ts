// DELETE /api/reports/[id]
// 본인 또는 관리자만 삭제 (RLS 정책으로 통제).
// CASCADE로 post_likes, comments, comment_likes 자동 삭제.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data: postRow, error: fetchError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[reports DELETE] fetch error:', fetchError);
      return NextResponse.json({ error: '리포트 조회 중 오류' }, { status: 500 });
    }
    if (!postRow) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);
    if (deleteError) {
      console.error('[reports DELETE] delete error:', deleteError);
      const status = deleteError.code === '42501' ? 403 : 500;
      const message = status === 403 ? '삭제 권한이 없습니다.' : '리포트 삭제 중 오류가 발생했습니다.';
      return NextResponse.json({ error: message }, { status });
    }

    revalidatePath('/');
    revalidatePath('/ranking');
    revalidatePath('/search');

    return NextResponse.json({ success: true, message: '리포트가 삭제되었습니다.' });
  } catch (error) {
    console.error('리포트 삭제 오류:', error);
    return NextResponse.json(
      { error: '리포트 삭제 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
