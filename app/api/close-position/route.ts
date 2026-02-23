import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

// feed.json 읽기/쓰기 헬퍼
async function getFeed() {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();
    if (!exists) return null;
    const [content] = await file.download();
    return JSON.parse(content.toString());
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
    const { postId, collection: collectionName, userId, closedPrice, closedReturnRate } = body;

    // 필수 파라미터 체크
    if (!postId || !collectionName || !userId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 지원하는 컬렉션 확인 (posts만 수익 확정 가능)
    if (collectionName !== 'posts') {
      return NextResponse.json(
        { error: '지원하지 않는 컬렉션입니다.' },
        { status: 400 }
      );
    }

    // 문서 참조
    const docRef = doc(db, collectionName, postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    // 작성자 확인 (camelCase 필드명 사용)
    if (data.authorId !== userId) {
      return NextResponse.json(
        { error: '본인 게시글만 수익 확정할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 이미 확정된 경우
    if (data.is_closed) {
      return NextResponse.json(
        { error: '이미 수익이 확정된 게시글입니다.' },
        { status: 400 }
      );
    }

    const finalReturnRate = closedReturnRate ?? data.returnRate ?? 0;
    const finalPrice = closedPrice ?? data.currentPrice ?? data.initialPrice ?? 0;

    // Firestore 수익 확정 업데이트
    await updateDoc(docRef, {
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_return_rate: finalReturnRate,
      closed_price: finalPrice,
    });

    // feed.json도 동기화
    try {
      const feed = await getFeed();
      if (feed?.posts) {
        const postIndex = feed.posts.findIndex((p: { id: string }) => p.id === postId);
        if (postIndex >= 0) {
          feed.posts[postIndex].is_closed = true;
          feed.posts[postIndex].closed_return_rate = finalReturnRate;
          feed.posts[postIndex].currentPrice = finalPrice;
          feed.posts[postIndex].returnRate = finalReturnRate;
          feed.lastUpdated = new Date().toISOString();
          await saveFeed(feed);
        }
      }
    } catch (feedError) {
      console.error('[Close Position] feed.json 동기화 실패:', feedError);
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
        message: '수익이 확정되었습니다.',
        data: {
          closed_return_rate: finalReturnRate,
          closed_price: finalPrice,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('수익 확정 오류:', error);

    return NextResponse.json(
      { error: '수익 확정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
