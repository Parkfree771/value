import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { verifyAdmin } from '@/lib/admin/adminVerify';

// 사용자 목록 조회 (관리자용)
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

    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));

    const querySnapshot = await getDocs(q);

    // N+1 쿼리 방지: 모든 게시글을 한 번에 가져와서 사용자별로 카운트
    const postsRef = collection(db, 'posts');
    const postsSnapshot = await getDocs(postsRef);

    // 사용자별 게시글 수 계산
    const postCountByUser: { [userId: string]: number } = {};
    postsSnapshot.docs.forEach((doc) => {
      const authorId = doc.data().authorId;
      if (authorId) {
        postCountByUser[authorId] = (postCountByUser[authorId] || 0) + 1;
      }
    });

    const users = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        email: data.email || '',
        nickname: data.nickname || '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        isSuspended: data.isSuspended || false,
        postCount: postCountByUser[docSnap.id] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: unknown) {
    console.error('사용자 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 정지/해제 (관리자용)
export async function PUT(request: NextRequest) {
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
      suspendedBy: isSuspended ? admin.email : null,
    });

    console.log(`[Admin] 사용자 ${isSuspended ? '정지' : '정지 해제'}: ${userId} by ${admin.email}`);

    return NextResponse.json({
      success: true,
      message: `사용자가 성공적으로 ${isSuspended ? '정지' : '정지 해제'}되었습니다.`,
    });
  } catch (error: unknown) {
    console.error('사용자 정지/해제 오류:', error);
    return NextResponse.json(
      { error: '사용자 정지/해제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
