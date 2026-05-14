// DELETE /api/reports/[id]
// 본인 또는 관리자만 삭제. CASCADE로 post_likes, comments, comment_likes 자동 삭제.
// feed.json에서도 제거 (Storage 잔존, 가격 캐시 역할).

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { adminStorage } from '@/lib/firebase-admin';

interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: Array<{ id: string; ticker: string; [key: string]: unknown }>;
  prices: Record<string, unknown>;
}

async function removeFromFeed(postId: string): Promise<void> {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();
    if (!exists) return;

    const [content] = await file.download();
    const feed = JSON.parse(content.toString()) as FeedData;
    const removed = feed.posts.find((p) => p.id === postId);
    if (!removed) return;

    feed.posts = feed.posts.filter((p) => p.id !== postId);

    const tickerUpper = (removed.ticker || '').toUpperCase();
    if (tickerUpper) {
      const stillUsed = feed.posts.some(
        (p) => (p.ticker || '').toUpperCase() === tickerUpper,
      );
      if (!stillUsed) delete feed.prices[tickerUpper];
    }

    feed.totalPosts = feed.posts.length;
    feed.lastUpdated = new Date().toISOString();

    await file.save(JSON.stringify(feed, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });
  } catch (error) {
    console.error('[Feed] removeFromFeed error:', error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 인증 확인 (RLS도 같은 정책으로 차단하지만 명시적 401)
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 글 존재 확인 + 작성자 확인 (RLS는 본인/관리자만 DELETE 통과)
    const { data: postRow, error: fetchError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[reports DELETE] fetch error:', fetchError);
      return NextResponse.json({ error: '리포트 조회 중 오류' }, { status: 500 });
    }
    if (!postRow) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);
    if (deleteError) {
      // RLS 위반(권한 없음) 또는 기타
      console.error('[reports DELETE] delete error:', deleteError);
      const status = deleteError.code === '42501' ? 403 : 500;
      const message = status === 403 ? '삭제 권한이 없습니다.' : '리포트 삭제 중 오류가 발생했습니다.';
      return NextResponse.json({ error: message }, { status });
    }

    await removeFromFeed(id);
    revalidatePath('/');

    return NextResponse.json({ success: true, message: '리포트가 삭제되었습니다.' });
  } catch (error) {
    console.error('리포트 삭제 오류:', error);
    return NextResponse.json(
      { error: '리포트 삭제 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
