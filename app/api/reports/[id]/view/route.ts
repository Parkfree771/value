import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

// 조회 기록 유효 시간 (24시간)
const VIEW_EXPIRY_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 쿠키에서 조회 기록 확인
    const viewedCookie = request.cookies.get(`viewed_${id}`);

    if (viewedCookie) {
      // 이미 조회한 게시글 - 조회수 증가하지 않음
      return NextResponse.json({ success: true, alreadyViewed: true });
    }

    // 리포트 존재 여부 확인
    const docRef = adminDb.collection('posts').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 조회수 증가 (Admin SDK - 보안 규칙 우회)
    await docRef.update({
      views: FieldValue.increment(1),
    });

    // 응답에 쿠키 설정
    const response = NextResponse.json({ success: true });
    response.cookies.set(`viewed_${id}`, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: VIEW_EXPIRY_HOURS * 60 * 60, // 24시간
    });

    return response;
  } catch (error) {
    console.error('조회수 증가 실패:', error);
    return NextResponse.json(
      { success: false, error: '조회수 증가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
