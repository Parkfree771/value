// 디버그 전용: users 컬렉션 확인 + 가상 사용자 배지 임시 시드
// 운영 전 삭제 필요
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { BADGES_BY_ID } from '@/lib/badges';

export async function GET() {
  try {
    const snap = await adminDb.collection('users').limit(50).get();
    const users = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        nickname: data.nickname,
        equippedBadgeId: data.equippedBadgeId ?? null,
      };
    });
    return NextResponse.json({ count: snap.size, users });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// POST { uid, badgeId } — 단일 사용자에게 배지 박기 (관리자 미인증, 디버그 한정)
export async function POST(request: NextRequest) {
  try {
    const { uid, badgeId } = await request.json();
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });
    if (badgeId !== null && !BADGES_BY_ID[badgeId]) {
      return NextResponse.json({ error: 'invalid badgeId' }, { status: 400 });
    }
    await adminDb.collection('users').doc(uid).update({
      equippedBadgeId: badgeId,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, uid, badgeId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
