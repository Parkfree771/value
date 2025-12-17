import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 리포트 존재 여부 확인
    const docRef = doc(db, 'posts', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 조회수 증가
    await updateDoc(docRef, {
      views: increment(1),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('조회수 증가 실패:', error);
    return NextResponse.json(
      { success: false, error: '조회수 증가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
