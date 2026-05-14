/**
 * GET /api/users/by-nickname/[nickname]
 *
 * 닉네임으로 사용자의 공개 정보를 반환.
 * 사용자 프로필 페이지(/user/[username])가 feed.json 전체 다운로드 없이
 * 통계·해금배지를 즉시 받을 수 있도록.
 *
 * 응답
 *   { user: { uid, nickname, bio, equippedBadgeId, stats, unlockedBadgeIds, lastStatsUpdate } }
 *   또는 404 (존재하지 않음·탈퇴회원)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { BADGES_BY_ID } from '@/lib/badges';

export async function GET(
  _request: NextRequest,
  context: { params: { nickname: string } | Promise<{ nickname: string }> },
) {
  try {
    const params = await context.params;
    const nickname = decodeURIComponent(params.nickname || '').trim();
    if (!nickname) {
      return NextResponse.json({ error: 'nickname 필요' }, { status: 400 });
    }

    const snap = await adminDb
      .collection('users')
      .where('nickname', '==', nickname)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: '존재하지 않습니다.' }, { status: 404 });
    }

    const doc = snap.docs[0];
    const data = doc.data() as any;
    if (data.isWithdrawn) {
      return NextResponse.json({ error: '탈퇴한 회원입니다.' }, { status: 404 });
    }

    const equippedBadgeId =
      typeof data.equippedBadgeId === 'string' && BADGES_BY_ID[data.equippedBadgeId]
        ? data.equippedBadgeId
        : null;

    // unlockedBadgeIds 는 stale 정의 배지를 걸러서 응답 (배지 정의가 바뀐 경우 대비)
    const unlockedBadgeIds = Array.isArray(data.unlockedBadgeIds)
      ? data.unlockedBadgeIds.filter((id: unknown) => typeof id === 'string' && BADGES_BY_ID[id])
      : [];

    return NextResponse.json(
      {
        user: {
          uid: doc.id,
          nickname: data.nickname,
          bio: data.bio || '',
          equippedBadgeId,
          stats: data.stats || null,
          unlockedBadgeIds,
          lastStatsUpdate: data.lastStatsUpdate || null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180',
        },
      },
    );
  } catch (e: any) {
    console.error('[users/by-nickname] error:', e);
    return NextResponse.json({ error: e?.message || '조회 실패' }, { status: 500 });
  }
}
