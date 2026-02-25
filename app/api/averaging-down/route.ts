import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { calculateReturn, calculateAvgPrice } from '@/utils/calculateReturn';

const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

async function getFeed() {
  try {
    const res = await fetch(FEED_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function saveFeed(feedData: Record<string, unknown>) {
  const bucket = adminStorage.bucket();
  const file = bucket.file('feed.json');
  await file.save(JSON.stringify(feedData, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=60' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId } = body;

    if (!postId || !userId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Firestore 문서 조회 (Admin SDK)
    const docRef = adminDb.collection('posts').doc(postId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const data = docSnap.data()!;

    // 작성자 확인
    if (data.authorId !== userId) {
      return NextResponse.json(
        { error: '본인 게시글만 물타기할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 이미 확정된 경우
    if (data.is_closed) {
      return NextResponse.json(
        { error: '수익이 확정된 게시글은 물타기할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 물타기 횟수 제한 (최대 3회)
    const existingEntries = data.entries || [];
    if (existingEntries.length >= 3) {
      return NextResponse.json(
        { error: '물타기는 최대 3회까지 가능합니다.' },
        { status: 400 }
      );
    }

    // feed.json의 prices 맵에서 크론이 갱신한 현재가 가져오기
    const ticker = (data.ticker || '').toUpperCase();
    let currentPrice = data.currentPrice; // Firestore 값 (fallback)
    const feed = await getFeed();
    if (feed?.prices?.[ticker]?.currentPrice) {
      currentPrice = feed.prices[ticker].currentPrice;
    }

    if (!currentPrice) {
      return NextResponse.json(
        { error: '현재 주가 정보가 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 400 }
      );
    }
    const now = new Date();

    // 새 물타기 엔트리 생성
    const newEntry = {
      price: currentPrice,
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
    };

    const newEntries = [...existingEntries, newEntry];

    // 평균단가 계산
    const avgPrice = calculateAvgPrice(data.initialPrice, newEntries);

    // 수익률 재계산
    const positionType = data.positionType || 'long';
    const returnRate = parseFloat(
      calculateReturn(avgPrice, currentPrice, positionType).toFixed(2)
    );

    // Firestore 업데이트 (Admin SDK)
    await docRef.update({
      entries: newEntries,
      avgPrice,
      currentPrice,
      returnRate,
    });

    // feed.json 동기화 (위에서 이미 읽은 feed 재사용)
    try {
      if (feed?.posts) {
        const postIndex = feed.posts.findIndex((p: { id: string }) => p.id === postId);
        if (postIndex >= 0) {
          feed.posts[postIndex].entries = newEntries;
          feed.posts[postIndex].avgPrice = avgPrice;
          feed.posts[postIndex].currentPrice = currentPrice;
          feed.posts[postIndex].returnRate = returnRate;
          feed.lastUpdated = now.toISOString();
          await saveFeed(feed);
        }
      }
    } catch (feedError) {
      console.error('[Averaging Down] feed.json 동기화 실패:', feedError);
    }

    // 캐시 무효화
    try {
      revalidatePath('/');
      revalidatePath(`/reports/${postId}`);
    } catch {
      // revalidate 실패는 무시
    }

    return NextResponse.json(
      {
        success: true,
        message: '물타기가 기록되었습니다.',
        data: {
          entries: newEntries,
          avgPrice,
          currentPrice,
          returnRate,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('물타기 오류:', error);

    return NextResponse.json(
      { error: '물타기 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
