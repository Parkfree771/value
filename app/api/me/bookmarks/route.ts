// /api/me/bookmarks — 본인 북마크 (bookmarks_select_own/insert_own/delete_own RLS 규칙을 코드로 재현)
//   GET                      — { postIds: string[] }
//   POST   { postId }        — 북마크 추가 (이미 있으면 무시)
//   DELETE ?postId=<id>      — 북마크 해제
// user_id는 항상 세션 uid — 클라이언트가 다른 사용자 id를 지정할 수 없음.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const rows = await sql`
      select post_id from bookmarks where user_id = ${authUser.id} order by bookmarked_at desc
    `;
    return NextResponse.json({ postIds: rows.map((r) => r.post_id as string) });
  } catch (error) {
    console.error('[me/bookmarks GET] error:', error);
    return NextResponse.json({ error: '북마크 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const postId = body?.postId;
    if (typeof postId !== 'string' || !UUID_RE.test(postId)) {
      return NextResponse.json({ error: '잘못된 게시글 ID입니다.' }, { status: 400 });
    }

    try {
      await sql`
        insert into bookmarks (user_id, post_id) values (${authUser.id}, ${postId})
        on conflict (user_id, post_id) do nothing
      `;
    } catch (err) {
      // FK 위반 = 존재하지 않는 게시글
      if ((err as { code?: string }).code === '23503') {
        return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
      }
      throw err;
    }

    return NextResponse.json({ success: true, bookmarked: true });
  } catch (error) {
    console.error('[me/bookmarks POST] error:', error);
    return NextResponse.json({ error: '북마크 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const postId = request.nextUrl.searchParams.get('postId');
    if (!postId || !UUID_RE.test(postId)) {
      return NextResponse.json({ error: '잘못된 게시글 ID입니다.' }, { status: 400 });
    }

    await sql`delete from bookmarks where user_id = ${authUser.id} and post_id = ${postId}`;
    return NextResponse.json({ success: true, bookmarked: false });
  } catch (error) {
    console.error('[me/bookmarks DELETE] error:', error);
    return NextResponse.json({ error: '북마크 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
