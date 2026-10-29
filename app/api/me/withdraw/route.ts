// POST /api/me/withdraw
// 본인 회원 탈퇴 — users row의 식별 정보를 익명화하고 정지 상태로 전환.
// email/nickname UNIQUE 제약 회피 위해 uid 접미사 사용.
// Neon Auth 계정 자체 삭제는 하지 않음 (기존 Supabase 시절과 동일 — 클라이언트가 signOut만 수행).

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';

export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const uid = authUser.id;
    const shortUid = uid.slice(0, 8);

    // 본인 row만 갱신 (id = 세션 uid 고정)
    await sql`
      update users set
        email = ${`withdrawn-${uid}@withdrawn.local`},
        display_name = '[탈퇴회원]',
        nickname = ${`withdrawn-${shortUid}`},
        photo_url = null,
        is_suspended = true
      where id = ${uid}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me/withdraw POST] error:', error);
    return NextResponse.json({ error: '회원 탈퇴 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
