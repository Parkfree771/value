import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { verifyAdmin } from '@/lib/admin/adminVerify';

// 통계 조회 (관리자용)
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

    // 전체 게시글 수
    const postsRef = collection(db, 'posts');
    const postsSnapshot = await getDocs(postsRef);
    const totalPosts = postsSnapshot.size;

    // 전체 사용자 수
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // 오늘 작성된 게시글 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const todayPostsQuery = query(postsRef, where('createdAt', '>=', todayTimestamp));
    const todayPostsSnapshot = await getDocs(todayPostsQuery);
    const todayPosts = todayPostsSnapshot.size;

    // 총 조회수
    let totalViews = 0;
    let totalLikes = 0;

    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      totalViews += data.views || 0;
      totalLikes += data.likes || 0;
    });

    // 최근 7일간 게시글 수
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const weekAgoTimestamp = Timestamp.fromDate(weekAgo);

    const weekPostsQuery = query(postsRef, where('createdAt', '>=', weekAgoTimestamp));
    const weekPostsSnapshot = await getDocs(weekPostsQuery);
    const weekPosts = weekPostsSnapshot.size;

    // 인기 게시글 TOP 5
    const postsData = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        views: data.views || 0,
        likes: data.likes || 0,
        returnRate: data.returnRate || 0,
        authorName: data.authorName || '익명',
      };
    });

    const topPosts = postsData
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // 활동적인 사용자 TOP 5
    const userPostCounts: { [key: string]: { count: number; nickname: string; email: string } } = {};

    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      const authorId = data.authorId;
      const authorName = data.authorName || '익명';

      if (authorId) {
        if (!userPostCounts[authorId]) {
          userPostCounts[authorId] = { count: 0, nickname: authorName, email: '' };
        }
        userPostCounts[authorId].count++;
      }
    });

    // 사용자 이메일 추가
    for (const userId in userPostCounts) {
      const userSnapshot = usersSnapshot.docs.find((doc) => doc.id === userId);
      if (userSnapshot) {
        userPostCounts[userId].email = userSnapshot.data().email || '';
      }
    }

    const topUsers = Object.entries(userPostCounts)
      .map(([userId, data]) => ({
        userId,
        nickname: data.nickname,
        email: data.email,
        postCount: data.count,
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      stats: {
        totalPosts,
        totalUsers,
        todayPosts,
        weekPosts,
        totalViews,
        totalLikes,
        topPosts,
        topUsers,
      },
    });
  } catch (error: unknown) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
