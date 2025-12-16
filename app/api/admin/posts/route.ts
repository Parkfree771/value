import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit, startAfter, Timestamp, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { checkAdminPermission } from '@/lib/admin/adminCheck';

// 게시글 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const lastDocId = searchParams.get('lastDocId');

    // 관리자 권한 확인
    checkAdminPermission(adminEmail);

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
        returnRate: data.returnRate || 0,
      };
    });

    return NextResponse.json({
      success: true,
      posts,
      hasMore: posts.length === pageSize,
      lastDocId: posts.length > 0 ? posts[posts.length - 1].id : null,
    });
  } catch (error: any) {
    console.error('게시글 조회 오류:', error);
    return NextResponse.json(
      { error: error.message || '게시글 조회 중 오류가 발생했습니다.' },
      { status: error.message?.includes('관리자 권한') ? 403 : 500 }
    );
  }
}

// 게시글 삭제 (관리자용)
export async function DELETE(request: NextRequest) {
  try {
    const { adminEmail, postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 관리자 권한 확인
    checkAdminPermission(adminEmail);

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

    console.log(`[Admin] 게시글 삭제: ${postId} by ${adminEmail}`);

    return NextResponse.json({
      success: true,
      message: '게시글이 성공적으로 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json(
      { error: error.message || '게시글 삭제 중 오류가 발생했습니다.' },
      { status: error.message?.includes('관리자 권한') ? 403 : 500 }
    );
  }
}
