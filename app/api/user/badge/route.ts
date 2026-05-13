import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { BADGES_BY_ID } from '@/lib/badges';

// 본인의 장착 배지 변경 (1개만 가능, null이면 해제)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await request.json();
    const equippedBadgeId: string | null = body.equippedBadgeId ?? null;

    if (equippedBadgeId !== null && !BADGES_BY_ID[equippedBadgeId]) {
      return NextResponse.json({ error: '존재하지 않는 배지입니다.' }, { status: 400 });
    }

    await adminDb.collection('users').doc(uid).update({
      equippedBadgeId,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, equippedBadgeId });
  } catch (error: any) {
    console.error('[badge PUT] error:', error);
    return NextResponse.json(
      { error: error?.message || '배지 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
