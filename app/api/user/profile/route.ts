import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

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
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('authorId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Firestore의 배치 업데이트 사용 (최대 500개까지 한 번에 처리)
        const batches = [];
        let currentBatch = writeBatch(db);
        let batchCount = 0;

        querySnapshot.forEach((docSnapshot) => {
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

        console.log(`[Profile Update] ${querySnapshot.size}개의 게시글 작성자 이름 업데이트 완료`);
      }
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
