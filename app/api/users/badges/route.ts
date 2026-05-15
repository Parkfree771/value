import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { BADGES_BY_ID } from '@/lib/badges';

// 닉네임 목록 → {nickname: equippedBadgeId|null} 매핑
// 공개 API. 비로그인 사용자도 피드 카드에서 배지를 볼 수 있도록.
// POST 사용 이유: 닉네임 목록이 길어질 수 있고 URL 길이 제한 회피.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nicknames: unknown = body.nicknames;
    if (!Array.isArray(nicknames) || nicknames.length === 0) {
      return NextResponse.json({ badges: {} });
    }

    const unique = Array.from(
      new Set(
        nicknames
          .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
          .map((n) => n.trim())
      )
    ).slice(0, 100);

    if (unique.length === 0) {
      return NextResponse.json({ badges: {} });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: rows, error } = await supabase
      .from('users')
      .select('nickname, equipped_badge_id')
      .in('nickname', unique);

    if (error) {
      console.error('[users/badges POST] supabase error:', error);
      return NextResponse.json({ badges: {} }, { status: 200 });
    }

    const result: Record<string, string | null> = {};
    for (const row of rows ?? []) {
      const nickname = (row as { nickname?: string }).nickname;
      if (!nickname) continue;
      const badgeId = (row as { equipped_badge_id?: string | null }).equipped_badge_id;
      result[nickname] =
        typeof badgeId === 'string' && BADGES_BY_ID[badgeId] ? badgeId : null;
    }

    for (const n of unique) {
      if (!(n in result)) result[n] = null;
    }

    return NextResponse.json(
      { badges: result },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[users/badges POST] error:', error);
    return NextResponse.json({ badges: {} }, { status: 200 });
  }
}
