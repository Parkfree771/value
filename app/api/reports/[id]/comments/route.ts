import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp, FieldValue } from '@/lib/firebase-admin';

// 댓글 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 리포트 존재 여부 확인
    const postRef = adminDb.collection('posts').doc(id);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 목록 가져오기 (작성순 - 오래된 것부터)
    const commentsSnap = await postRef
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();

    // 사용자의 좋아요 상태 확인 (병렬 처리)
    const comments = await Promise.all(
      commentsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();

        // 사용자 좋아요 상태 확인
        let isLiked = false;
        if (userId) {
          const likeSnap = await docSnap.ref.collection('likes').doc(userId).get();
          isLiked = likeSnap.exists;
        }

        return {
          id: docSnap.id,
          content: data.content,
          author: data.authorName || '익명',
          authorId: data.authorId,
          parentId: data.parentId || null,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
          likes: data.likes || 0,
          isLiked,
        };
      })
    );

    return NextResponse.json({
      success: true,
      comments,
      count: comments.length,
    });
  } catch (error) {
    console.error('댓글 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 작성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, userId, authorName, parentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

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

    // 대댓글인 경우 부모 댓글 존재 여부 확인
    if (parentId) {
      const parentSnap = await postRef.collection('comments').doc(parentId).get();
      if (!parentSnap.exists) {
        return NextResponse.json(
          { success: false, error: '원본 댓글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
    }

    // 댓글 추가
    const newComment: Record<string, unknown> = {
      content: content.trim(),
      authorId: userId,
      authorName: authorName || '익명',
      createdAt: Timestamp.now(),
      likes: 0,
    };

    // 대댓글인 경우 parentId 추가
    if (parentId) {
      newComment.parentId = parentId;
    }

    const docRef = await postRef.collection('comments').add(newComment);

    // 게시물의 댓글 수 증가
    await postRef.update({
      commentCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: docRef.id,
        content: newComment.content,
        author: newComment.authorName,
        authorId: newComment.authorId,
        parentId: newComment.parentId || null,
        createdAt: (newComment.createdAt as Timestamp).toDate().toISOString(),
        likes: 0,
        isLiked: false,
      },
    });
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
