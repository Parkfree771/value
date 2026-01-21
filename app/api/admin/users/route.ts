import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit, Timestamp, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { verifyAdminToken } from '@/lib/admin/adminAuth';

// 사용자 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    // Authorization 헤더로 관리자 토큰 검증
    const authHeader = request.headers.get('Authorization');
    await verifyAdminToken(authHeader);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));

    const querySnapshot = await getDocs(q);

    const users = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();

      // 해당 사용자의 게시글 수 조회
      const postsRef = collection(db, 'posts');
      const postsQuery = query(postsRef, where('authorId', '==', docSnap.id));
      const postsSnapshot = await getDocs(postsQuery);

      return {
        id: docSnap.id,
        email: data.email || '',
        nickname: data.nickname || '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        isSuspended: data.isSuspended || false,
        postCount: postsSnapshot.size,
      };
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('사용자 조회 오류:', error);
    return NextResponse.json(
      { error: error.message || '사용자 조회 중 오류가 발생했습니다.' },
      { status: error.message?.includes('관리자 권한') ? 403 : 500 }
    );
  }
}

// 사용자 정지/해제 (관리자용)
export async function PUT(request: NextRequest) {
  try {
    // Authorization 헤더로 관리자 토큰 검증
    const authHeader = request.headers.get('Authorization');
    const adminEmail = await verifyAdminToken(authHeader);

    const { userId, isSuspended } = await request.json();

    if (!userId || typeof isSuspended !== 'boolean') {
      return NextResponse.json(
        { error: '사용자 ID와 정지 상태가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자 정지/해제
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await updateDoc(userRef, {
      isSuspended,
      suspendedAt: isSuspended ? new Date().toISOString() : null,
      suspendedBy: isSuspended ? adminEmail : null,
    });

    console.log(`[Admin] 사용자 ${isSuspended ? '정지' : '정지 해제'}: ${userId} by ${adminEmail}`);

    return NextResponse.json({
      success: true,
      message: `사용자가 성공적으로 ${isSuspended ? '정지' : '정지 해제'}되었습니다.`,
    });
  } catch (error: any) {
    console.error('사용자 정지/해제 오류:', error);
    return NextResponse.json(
      { error: error.message || '사용자 정지/해제 중 오류가 발생했습니다.' },
      { status: error.message?.includes('관리자 권한') ? 403 : 500 }
    );
  }
}
