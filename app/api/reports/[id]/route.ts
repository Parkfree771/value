import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminDb, verifyAuthToken } from '@/lib/firebase-admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 인증 토큰 검증
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 리포트가 존재하는지 확인
    const reportRef = adminDb.collection('posts').doc(id);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      return NextResponse.json(
        { error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 확인
    const reportData = reportSnap.data();
    if (reportData?.authorId !== userId) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 리포트 삭제
    await reportRef.delete();

    // 홈 페이지 캐시 무효화
    revalidatePath('/');

    return NextResponse.json(
      { success: true, message: '리포트가 삭제되었습니다.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('리포트 삭제 오류:', error);

    return NextResponse.json(
      { error: '리포트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
