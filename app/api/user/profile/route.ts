import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, orderBy, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: '사용자 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    // username(nickname)으로 사용자 찾기
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('nickname', '==', username));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // 해당 사용자가 작성한 리포트 가져오기
    const postsRef = collection(db, 'posts');
    const postsQuery = query(
      postsRef,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const postsSnapshot = await getDocs(postsQuery);

    const reports = postsSnapshot.docs.map((doc) => {
      const data = doc.data();

      // createdAt을 문자열로 변환
      let createdAtStr = '';
      if (data.createdAt instanceof Timestamp) {
        createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else {
        createdAtStr = new Date().toISOString().split('T')[0];
      }

      return {
        id: doc.id,
        title: data.title || '',
        author: data.authorName || username,
        authorId: data.authorId || userId,
        stockName: data.stockName || '',
        ticker: data.ticker || '',
        category: data.category || '',
        exchange: data.exchange || '',
        opinion: data.opinion || 'hold',
        returnRate: data.returnRate || 0,
        initialPrice: data.initialPrice || 0,
        currentPrice: data.currentPrice || 0,
        targetPrice: data.targetPrice || 0,
        createdAt: createdAtStr,
        views: data.views || 0,
        likes: data.likes || 0,
        mode: data.mode || 'text',
        content: data.content || '',
        cssContent: data.cssContent || '',
        images: data.images || [],
        files: data.files || [],
        positionType: data.positionType || 'long',
        stockData: data.stockData || {},
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        nickname: userData.nickname || username,
        email: userData.email || '',
        createdAt: userData.createdAt || '',
        reports,
      },
    });
  } catch (error) {
    console.error('사용자 프로필 가져오기 오류:', error);
    return NextResponse.json(
      { error: '사용자 프로필을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, nickname } = await request.json();

    if (!userId || !nickname) {
      return NextResponse.json(
        { error: '사용자 ID와 닉네임은 필수입니다.' },
        { status: 400 }
      );
    }

    // 닉네임 유효성 검사
    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      return NextResponse.json(
        { error: '닉네임은 2~20자 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // 사용자 문서 업데이트
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const oldNickname = userSnap.data().nickname;

    // 사용자 프로필 업데이트
    await updateDoc(userRef, {
      nickname: nickname.trim(),
      updatedAt: new Date().toISOString(),
    });

    // 닉네임이 변경된 경우, 해당 사용자가 작성한 모든 게시글의 authorName 업데이트
    if (oldNickname !== nickname.trim()) {
      // posts 컬렉션 업데이트
      const postsRef = collection(db, 'posts');
      const postsQuery = query(postsRef, where('authorId', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);

      // Firestore의 배치 업데이트 사용 (최대 500개까지 한 번에 처리)
      const batches = [];
      let currentBatch = writeBatch(db);
      let batchCount = 0;

      // posts 컬렉션 업데이트
      postsSnapshot.forEach((docSnapshot) => {
        if (batchCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }

        const postRef = doc(db, 'posts', docSnapshot.id);
        currentBatch.update(postRef, { authorName: nickname.trim() });
        batchCount++;
      });

      if (batchCount > 0) {
        batches.push(currentBatch);
      }

      // 모든 배치 커밋
      await Promise.all(batches.map((b) => b.commit()));

      console.log(`[Profile Update] posts: ${postsSnapshot.size}개 작성자 이름 업데이트 완료`);
    }

    return NextResponse.json({
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      nickname: nickname.trim(),
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
