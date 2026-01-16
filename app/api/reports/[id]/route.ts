import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminDb, adminStorage, verifyAuthToken } from '@/lib/firebase-admin';

// feed.json 구조
interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: Array<{
    id: string;
    ticker: string;
    [key: string]: any;
  }>;
  prices: Record<string, any>;
}

// feed.json에서 게시글 제거
async function removeFromFeed(postId: string): Promise<void> {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (!exists) return;

    const [content] = await file.download();
    const feed: FeedData = JSON.parse(content.toString());

    // 해당 게시글 찾기
    const removedPost = feed.posts.find(p => p.id === postId);
    if (!removedPost) return;

    // 게시글 제거
    feed.posts = feed.posts.filter(p => p.id !== postId);

    // 해당 ticker를 사용하는 다른 게시글이 없으면 prices에서도 제거
    const tickerUpper = (removedPost.ticker || '').toUpperCase();
    if (tickerUpper) {
      const otherPostsWithSameTicker = feed.posts.filter(
        p => (p.ticker || '').toUpperCase() === tickerUpper
      );

      if (otherPostsWithSameTicker.length === 0) {
        delete feed.prices[tickerUpper];
      }
    }

    // 메타데이터 업데이트
    feed.totalPosts = feed.posts.length;
    feed.lastUpdated = new Date().toISOString();

    // 저장
    await file.save(JSON.stringify(feed, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });

    console.log(`[Feed] Post ${postId} removed from feed.json`);
  } catch (error) {
    console.error('[Feed] Error removing from feed.json:', error);
    // feed 업데이트 실패해도 삭제는 계속 진행
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 인증 토큰 검증
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 리포트가 존재하는지 확인
    const reportRef = adminDb.collection('posts').doc(id);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      return NextResponse.json(
        { error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 확인
    const reportData = reportSnap.data();
    if (reportData?.authorId !== userId) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 리포트 삭제
    await reportRef.delete();

    // feed.json에서도 제거
    await removeFromFeed(id);

    // 홈 페이지 캐시 무효화
    revalidatePath('/');

    return NextResponse.json(
      { success: true, message: '리포트가 삭제되었습니다.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('리포트 삭제 오류:', error);

    return NextResponse.json(
      { error: '리포트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
