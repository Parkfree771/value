import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit, startAfter, Timestamp, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { adminStorage } from '@/lib/firebase-admin';

function calcReturnRate(data: Record<string, unknown>): number {
  if (data.is_closed && data.closed_return_rate != null) {
    return Number(data.closed_return_rate);
  }
  const initial = Number(data.initialPrice) || 0;
  const current = Number(data.currentPrice) || 0;
  const pos = (data.positionType as string) || 'long';
  if (initial <= 0 || current <= 0) return 0;
  return pos === 'long'
    ? ((current - initial) / initial) * 100
    : ((initial - current) / initial) * 100;
}

// 게시글 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    // 토큰 기반 관리자 권한 확인
    const authHeader = request.headers.get('authorization');
    const admin = await verifyAdmin(authHeader);

    if (!admin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const lastDocId = searchParams.get('lastDocId');

    const postsRef = collection(db, 'posts');
    let q = query(postsRef, orderBy('createdAt', 'desc'), limit(pageSize));

    // 페이지네이션
    if (lastDocId) {
      const lastDocRef = doc(db, 'posts', lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);
      if (lastDocSnap.exists()) {
        q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastDocSnap), limit(pageSize));
      }
    }

    const querySnapshot = await getDocs(q);

    const posts = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        authorName: data.authorName || '익명',
        authorId: data.authorId || '',
        stockName: data.stockName || '',
        ticker: data.ticker || '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        views: data.views || 0,
        likes: data.likes || 0,
        returnRate: parseFloat(calcReturnRate(data).toFixed(2)),
      };
    });

    return NextResponse.json({
      success: true,
      posts,
      hasMore: posts.length === pageSize,
      lastDocId: posts.length > 0 ? posts[posts.length - 1].id : null,
    });
  } catch (error: unknown) {
    console.error('게시글 조회 오류:', error);
    return NextResponse.json(
      { error: '게시글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 게시글 삭제 (관리자용)
export async function DELETE(request: NextRequest) {
  try {
    // 토큰 기반 관리자 권한 확인
    const authHeader = request.headers.get('authorization');
    const admin = await verifyAdmin(authHeader);

    if (!admin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 게시글 삭제
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await deleteDoc(postRef);

    // feed.json에서도 제거
    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file('feed.json');
      const [exists] = await file.exists();
      if (exists) {
        const [content] = await file.download();
        const feed = JSON.parse(content.toString());
        if (feed.posts) {
          feed.posts = feed.posts.filter((p: { id: string }) => p.id !== postId);
          feed.totalPosts = feed.posts.length;
          feed.lastUpdated = new Date().toISOString();
          await file.save(JSON.stringify(feed, null, 2), {
            contentType: 'application/json',
            metadata: { cacheControl: 'public, max-age=60' },
          });
        }
      }
    } catch (feedError) {
      console.error('[Admin] feed.json 동기화 실패:', feedError);
    }

    console.log(`[Admin] 게시글 삭제: ${postId} by ${admin.email}`);

    return NextResponse.json({
      success: true,
      message: '게시글이 성공적으로 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json(
      { error: '게시글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
