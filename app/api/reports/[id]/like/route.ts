import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, increment, getDoc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 리포트 존재 여부 확인
    const postRef = doc(db, 'posts', id);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자의 좋아요 상태 확인
    const likeRef = doc(db, 'posts', id, 'likes', userId);
    const likeSnap = await getDoc(likeRef);

    let isLiked = false;

    if (likeSnap.exists()) {
      // 이미 좋아요를 눌렀다면 취소
      await deleteDoc(likeRef);
      await updateDoc(postRef, {
        likes: increment(-1),
      });
      isLiked = false;
    } else {
      // 좋아요 추가
      await setDoc(likeRef, {
        userId,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(postRef, {
        likes: increment(1),
      });
      isLiked = true;
    }

    // 업데이트된 좋아요 수 가져오기
    const updatedPostSnap = await getDoc(postRef);
    const likes = updatedPostSnap.data()?.likes || 0;

    return NextResponse.json({
      success: true,
      isLiked,
      likes
    });
  } catch (error) {
    console.error('좋아요 처리 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자의 좋아요 상태 확인
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const likeRef = doc(db, 'posts', id, 'likes', userId);
    const likeSnap = await getDoc(likeRef);

    return NextResponse.json({
      success: true,
      isLiked: likeSnap.exists()
    });
  } catch (error) {
    console.error('좋아요 상태 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
