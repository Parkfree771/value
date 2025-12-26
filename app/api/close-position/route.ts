import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, collection, userId, closedPrice, closedReturnRate } = body;

    // 필수 파라미터 체크
    if (!postId || !collection || !userId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 지원하는 컬렉션 확인
    if (collection !== 'posts' && collection !== 'word-watch') {
      return NextResponse.json(
        { error: '지원하지 않는 컬렉션입니다.' },
        { status: 400 }
      );
    }

    // 문서 참조
    const docRef = doc(db, collection, postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    // 작성자 확인
    if (data.author_id !== userId) {
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

    // 수익 확정 업데이트
    await updateDoc(docRef, {
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_return_rate: closedReturnRate || data.return_rate || 0,
      closed_price: closedPrice || data.current_price || data.base_price || 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: '수익이 확정되었습니다.',
        data: {
          closed_return_rate: closedReturnRate || data.return_rate || 0,
          closed_price: closedPrice || data.current_price || data.base_price || 0,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('수익 확정 오류:', error);

    return NextResponse.json(
      { error: '수익 확정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
