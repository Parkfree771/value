// /api/user/profile
//   GET ?username=<nickname>  — 공개 프로필 + 본인 작성 글 목록
//   PUT { userId, nickname }  — 자기 닉네임 변경 (세션 uid === userId일 때만 허용)
//
// 닉네임이 변경돼도 posts.author_id로 user를 JOIN하므로 별도 denormalization 불필요.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { validateNickname } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: '사용자 이름이 필요합니다.' }, { status: 400 });
    }

    let userRow: Record<string, any> | null;
    try {
      const rows = await sql`
        select id, nickname, created_at from users where nickname = ${username} limit 1
      `;
      userRow = rows[0] ?? null;
    } catch (userError) {
      console.error('[profile GET] user 조회 오류:', userError);
      return NextResponse.json({ error: '사용자 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로필 페이지 글 카드는 메타데이터만 사용 — content/css_content/images/files/stock_data 같은
    // heavy 컬럼은 글 상세(/reports/[id])에서 로드. 여기서 빼면 응답 크기 대폭 축소.
    let postRows: Record<string, any>[];
    try {
      postRows = await sql`
        select id, title, stock_name, ticker, exchange, category, opinion, position_type,
               return_rate, initial_price, current_price, target_price, views, likes, created_at
        from posts
        where author_id = ${userRow.id}
        order by created_at desc
        limit 200
      `;
    } catch (postsError) {
      console.error('[profile GET] posts 조회 오류:', postsError);
      return NextResponse.json({ error: '글 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    const reports = postRows.map((p) => ({
      id: p.id,
      title: p.title ?? '',
      author: userRow.nickname,
      authorId: userRow.id,
      stockName: p.stock_name ?? '',
      ticker: p.ticker ?? '',
      category: p.category ?? '',
      exchange: p.exchange ?? '',
      opinion: p.opinion ?? 'hold',
      positionType: p.position_type ?? 'long',
      returnRate: Number(p.return_rate ?? 0),
      initialPrice: Number(p.initial_price ?? 0),
      currentPrice: Number(p.current_price ?? 0),
      targetPrice: Number(p.target_price ?? 0),
      createdAt:
        typeof p.created_at === 'string' ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      // mode/content/cssContent/images/files/stockData — 글 상세에서만 사용 (이 라우트에서 미반환)
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: userRow.id,
        nickname: userRow.nickname,
        createdAt: userRow.created_at,
        reports,
      },
    });
  } catch (error) {
    console.error('사용자 프로필 가져오기 오류:', error);
    return NextResponse.json(
      { error: '사용자 프로필을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, nickname } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
      return NextResponse.json({ error: nicknameValidation.error }, { status: 400 });
    }
    const validatedNickname = nicknameValidation.sanitized!;

    // 인증 확인 + 본인 확인 (RLS가 없으므로 이 체크가 유일한 소유권 보장)
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (authUser.id !== userId) {
      return NextResponse.json({ error: '본인 프로필만 수정 가능합니다.' }, { status: 403 });
    }

    // 닉네임 중복 체크 (자기 자신 제외)
    let dup: Record<string, any>[];
    try {
      dup = await sql`select id from users where nickname = ${validatedNickname} and id <> ${userId}`;
    } catch (dupError) {
      console.error('[profile PUT] 중복 체크 오류:', dupError);
      return NextResponse.json({ error: '중복 체크 중 오류가 발생했습니다.' }, { status: 500 });
    }
    if (dup.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 400 });
    }

    try {
      await sql`update users set nickname = ${validatedNickname} where id = ${authUser.id}`;
    } catch (updateError) {
      console.error('[profile PUT] 업데이트 오류:', updateError);
      return NextResponse.json({ error: '프로필 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      nickname: validatedNickname,
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
