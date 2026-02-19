import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/admin/adminVerify';

// 전체 댓글 목록 조회 (관리자용)
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

    // collectionGroup으로 모든 게시글의 댓글을 한 번에 조회
    const commentsSnap = await adminDb
      .collectionGroup('comments')
      .get();

    const comments = commentsSnap.docs
      .map((doc) => {
        const data = doc.data();
        const postId = doc.ref.parent.parent?.id || '';

        return {
          id: doc.id,
          content: data.content || '',
          authorName: data.authorName || '익명',
          authorId: data.authorId || '',
          postId,
          likes: data.likes || 0,
          createdAt: data.createdAt?.toDate?.()
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        };
      })
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error: unknown) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 삭제 (관리자용)
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

    const { postId, commentId } = await request.json();

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: '게시글 ID와 댓글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 댓글 삭제
    const commentRef = adminDb
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .doc(commentId);

    const commentSnap = await commentRef.get();

    if (!commentSnap.exists) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await commentRef.delete();

    // 게시물의 댓글 수 감소
    const postRef = adminDb.collection('posts').doc(postId);
    await postRef.update({
      commentCount: FieldValue.increment(-1),
    });

    console.log(`[Admin] 댓글 삭제: ${commentId} (게시글: ${postId}) by ${admin.email}`);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
