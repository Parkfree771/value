// GET /api/users/nickname-available?nickname=<닉네임>
// 닉네임 사용 가능 여부 → { available: boolean }. 본인이 이미 쓰는 닉네임은 사용 가능으로 처리.
// 로그인 사용자 전용 (온보딩/프로필 수정에서만 호출 — 비로그인 닉네임 열거 차단).

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { validateNickname } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const nickname = request.nextUrl.searchParams.get('nickname');
    if (!nickname) {
      return NextResponse.json({ error: '닉네임이 필요합니다.' }, { status: 400 });
    }

    // 형식/금지어 위반이면 어차피 저장 불가 → 사용 불가로 응답
    const v = validateNickname(nickname);
    if (!v.valid) {
      return NextResponse.json({ available: false, error: v.error });
    }

    const rows = await sql`
      select 1 from users where nickname = ${v.sanitized!} and id <> ${authUser.id} limit 1
    `;
    return NextResponse.json({ available: rows.length === 0 });
  } catch (error) {
    console.error('[nickname-available GET] error:', error);
    return NextResponse.json({ error: '닉네임 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
