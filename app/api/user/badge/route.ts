// PUT /api/user/badge
// 본인의 장착 배지를 변경 (1개, null이면 해제).
// users.equipped_badge_id를 갱신. 메인/ranking/RelatedReports의 피드 카드 배지는
// posts ↔ users JOIN으로 즉시 반영되므로 별도 동기화 불필요.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { BADGES_BY_ID } from '@/lib/badges';

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const uid = authData.user.id;

    const body = await request.json();
    const equippedBadgeId: string | null = body.equippedBadgeId ?? null;

    if (equippedBadgeId !== null && !BADGES_BY_ID[equippedBadgeId]) {
      return NextResponse.json({ error: '존재하지 않는 배지입니다.' }, { status: 400 });
    }

    // 장착하려는 배지가 본인이 해금한 상태인지 확인 (해제는 통과)
    if (equippedBadgeId !== null) {
      const { data: owned } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', uid)
        .eq('badge_id', equippedBadgeId)
        .maybeSingle();
      if (!owned) {
        return NextResponse.json(
          { error: '해당 배지를 아직 해금하지 않았습니다.' },
          { status: 403 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ equipped_badge_id: equippedBadgeId })
      .eq('id', uid);

    if (updateError) {
      console.error('[badge PUT] users update error:', updateError);
      return NextResponse.json(
        { error: '배지 업데이트 중 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    // 피드 카드(메인·랭킹·검색)와 글 상세 모두 작성자 배지를 JOIN해서 SSR 렌더링하므로
    // 배지 변경 후 ISR 캐시를 즉시 무효화해야 새 배지가 반영됨.
    revalidatePath('/');
    revalidatePath('/ranking');
    revalidatePath('/search');

    return NextResponse.json({ success: true, equippedBadgeId });
  } catch (error) {
    console.error('[badge PUT] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '배지 업데이트 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
