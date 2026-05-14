import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { BADGES_BY_ID } from '@/lib/badges';
import type { FeedData } from '@/types/feed';

// 본인 글들의 feed.json equippedBadgeId 를 일괄 갱신.
// 작성한 글이 없으면 no-op. 실패해도 사용자 응답에는 영향 없음 (fire-and-forget 가능하지만
// 직후 피드 새로고침 시 즉시 반영되기 위해 await 한다).
async function syncBadgeToFeed(uid: string, equippedBadgeId: string | null) {
  const bucket = adminStorage.bucket();
  const file = bucket.file('feed.json');
  const [exists] = await file.exists();
  if (!exists) return { updated: 0 };

  const [content] = await file.download();
  const feed = JSON.parse(content.toString()) as FeedData;
  let changed = 0;
  for (const post of feed.posts) {
    if (post.authorId === uid && post.equippedBadgeId !== equippedBadgeId) {
      post.equippedBadgeId = equippedBadgeId;
      changed++;
    }
  }
  if (changed === 0) return { updated: 0 };

  feed.lastUpdated = new Date().toISOString();
  await file.save(JSON.stringify(feed, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  return { updated: changed };
}

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

    // feed.json 의 작성자 모든 글에 새 배지 ID 전파
    let feedUpdated = 0;
    try {
      const r = await syncBadgeToFeed(uid, equippedBadgeId);
      feedUpdated = r.updated;
    } catch (e: any) {
      console.warn('[badge PUT] feed.json sync 실패:', e?.message || e);
    }

    return NextResponse.json({ success: true, equippedBadgeId, feedUpdated });
  } catch (error: any) {
    console.error('[badge PUT] error:', error);
    return NextResponse.json(
      { error: error?.message || '배지 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
