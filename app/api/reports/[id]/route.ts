// DELETE /api/reports/[id]
// 본인 또는 관리자(users.is_admin)만 삭제 — 옛 posts_delete_own RLS 조건을 코드에서 검사.
// CASCADE로 post_likes, comments, comment_likes 자동 삭제.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    let postRow: { id: string; author_id: string; requester_is_admin: boolean } | undefined;
    try {
      const rows = await sql`
        select p.id, p.author_id,
               exists (select 1 from users where id = ${user.id} and is_admin = true) as requester_is_admin
        from posts p
        where p.id = ${id}
      `;
      postRow = rows[0] as typeof postRow;
    } catch (fetchError) {
      console.error('[reports DELETE] fetch error:', fetchError);
      return NextResponse.json({ error: '리포트 조회 중 오류' }, { status: 500 });
    }
    if (!postRow) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (postRow.author_id !== user.id && !postRow.requester_is_admin) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    try {
      await sql`delete from posts where id = ${id}`;
    } catch (deleteError) {
      console.error('[reports DELETE] delete error:', deleteError);
      return NextResponse.json({ error: '리포트 삭제 중 오류가 발생했습니다.' }, { status: 500 });
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
