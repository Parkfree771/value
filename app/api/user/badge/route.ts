// PUT /api/user/badge
// 본인의 장착 배지를 변경 (1개, null이면 해제).
// users.equipped_badge_id를 갱신. feed.json도 동기화 (Storage 잔존).

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { adminStorage } from '@/lib/firebase-admin';
import { BADGES_BY_ID } from '@/lib/badges';
import type { FeedData } from '@/types/feed';

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

    let feedUpdated = 0;
    try {
      const r = await syncBadgeToFeed(uid, equippedBadgeId);
      feedUpdated = r.updated;
    } catch (e) {
      console.warn('[badge PUT] feed.json sync 실패:', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ success: true, equippedBadgeId, feedUpdated });
  } catch (error) {
    console.error('[badge PUT] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '배지 업데이트 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
