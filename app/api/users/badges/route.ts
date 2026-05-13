import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
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

    // 중복 제거, 빈 문자열 제거, 최대 100개 제한
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

    // Firestore `in` 쿼리는 최대 30개. 청크 분할.
    const CHUNK = 30;
    const result: Record<string, string | null> = {};

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const snap = await adminDb
        .collection('users')
        .where('nickname', 'in', chunk)
        .get();

      snap.forEach((doc) => {
        const data = doc.data();
        const nickname = data.nickname as string | undefined;
        if (!nickname) return;
        const badgeId = data.equippedBadgeId;
        // 유효한 배지만 반환 (정의에서 사라진 배지는 무시)
        result[nickname] =
          typeof badgeId === 'string' && BADGES_BY_ID[badgeId] ? badgeId : null;
      });
    }

    // 응답에 누락된 닉네임은 null (배지 없음)으로 채움
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
  } catch (error: any) {
    console.error('[users/badges POST] error:', error);
    return NextResponse.json({ badges: {} }, { status: 200 });
  }
}
