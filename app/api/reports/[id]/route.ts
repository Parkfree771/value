import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 리포트가 존재하는지 확인
    const reportRef = doc(db, 'posts', id);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      return NextResponse.json(
        { error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 리포트 삭제 (Firebase 규칙에서 authorId 체크)
    // Firebase Security Rules에서 작성자만 삭제할 수 있도록 설정되어 있음
    await deleteDoc(reportRef);

    return NextResponse.json(
      { success: true, message: '리포트가 삭제되었습니다.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('리포트 삭제 오류:', error);

    // Firebase 권한 오류 처리
    if (error.code === 'permission-denied') {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: '리포트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
