import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue, verifyAuthToken } from '@/lib/firebase-admin';

// 댓글 좋아요 토글
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;

    // 토큰 인증
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const commentRef = adminDb.collection('posts').doc(id).collection('comments').doc(commentId);
    const commentSnap = await commentRef.get();

    if (!commentSnap.exists) {
      return NextResponse.json(
        { success: false, error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 좋아요 상태 확인
    const likeRef = commentRef.collection('likes').doc(userId);
    const likeSnap = await likeRef.get();

    let isLiked = false;

    if (likeSnap.exists) {
      // 좋아요 취소
      await likeRef.delete();
      await commentRef.update({ likes: FieldValue.increment(-1) });
      isLiked = false;
    } else {
      // 좋아요 추가
      await likeRef.set({ userId, createdAt: new Date().toISOString() });
      await commentRef.update({ likes: FieldValue.increment(1) });
      isLiked = true;
    }

    const updatedSnap = await commentRef.get();
    const likes = updatedSnap.data()?.likes || 0;

    return NextResponse.json({
      success: true,
      isLiked,
      likes,
    });
  } catch (error) {
    console.error('댓글 좋아요 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 좋아요 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 좋아요 상태 확인
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: true, isLiked: false });
    }

    const likeRef = adminDb
      .collection('posts').doc(id)
      .collection('comments').doc(commentId)
      .collection('likes').doc(userId);

    const likeSnap = await likeRef.get();

    return NextResponse.json({
      success: true,
      isLiked: likeSnap.exists,
    });
  } catch (error) {
    console.error('댓글 좋아요 상태 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;

    // 토큰 인증
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 리포트 존재 여부 확인
    const postRef = adminDb.collection('posts').doc(id);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 존재 여부 확인
    const commentRef = postRef.collection('comments').doc(commentId);
    const commentSnap = await commentRef.get();

    if (!commentSnap.exists) {
      return NextResponse.json(
        { success: false, error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 작성자 본인 확인
    const commentData = commentSnap.data();
    if (commentData?.authorId !== userId) {
      return NextResponse.json(
        { success: false, error: '본인의 댓글만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 댓글 삭제
    await commentRef.delete();

    // 게시물의 댓글 수 감소
    await postRef.update({
      commentCount: FieldValue.increment(-1),
    });

    return NextResponse.json({
      success: true,
      message: '댓글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
