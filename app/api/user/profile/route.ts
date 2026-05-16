// /api/user/profile
//   GET ?username=<nickname>  — 공개 프로필 + 본인 작성 글 목록
//   PUT { userId, nickname }  — 자기 닉네임 변경 (RLS가 본인만 허용)
//
// 닉네임이 변경돼도 posts.author_id로 user를 JOIN하므로 별도 denormalization 불필요.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { validateNickname } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: '사용자 이름이 필요합니다.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, nickname, created_at')
      .eq('nickname', username)
      .maybeSingle();

    if (userError) {
      console.error('[profile GET] user 조회 오류:', userError);
      return NextResponse.json({ error: '사용자 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로필 페이지 글 카드는 메타데이터만 사용 — content/css_content/images/files/stock_data 같은
    // heavy 컬럼은 글 상세(/reports/[id])에서 로드. 여기서 빼면 응답 크기 대폭 축소.
    const { data: postRows, error: postsError } = await supabase
      .from('posts')
      .select(
        'id, title, stock_name, ticker, exchange, category, opinion, position_type, return_rate, initial_price, current_price, target_price, views, likes, created_at',
      )
      .eq('author_id', userRow.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (postsError) {
      console.error('[profile GET] posts 조회 오류:', postsError);
      return NextResponse.json({ error: '글 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    const reports = (postRows ?? []).map((p) => ({
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

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 인증 확인 + 본인 확인 (RLS도 같은 체크지만 명시적으로 401/403 응답)
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (authData.user.id !== userId) {
      return NextResponse.json({ error: '본인 프로필만 수정 가능합니다.' }, { status: 403 });
    }

    // 닉네임 중복 체크 (자기 자신 제외)
    const { data: dup, error: dupError } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', validatedNickname)
      .neq('id', userId);

    if (dupError) {
      console.error('[profile PUT] 중복 체크 오류:', dupError);
      return NextResponse.json({ error: '중복 체크 중 오류가 발생했습니다.' }, { status: 500 });
    }
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ nickname: validatedNickname })
      .eq('id', userId);

    if (updateError) {
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
