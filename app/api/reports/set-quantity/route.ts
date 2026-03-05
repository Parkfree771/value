/**
 * 기존 리포트에 수량 설정 API (1회만 가능)
 *
 * POST: 기존 글에 가상 매수 수량 설정 + 해당 통화 잔고 차감
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, verifyAuthToken } from '@/lib/firebase-admin';
import { inferCurrency } from '@/utils/currency';
import { INITIAL_BALANCES } from '@/lib/constants';

function getDefaultBalances(): Record<string, number> {
  return { ...INITIAL_BALANCES };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, quantity } = body;

    if (!postId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
    }

    // 게시글 확인
    const docRef = adminDb.collection('posts').doc(postId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    }

    const data = docSnap.data()!;

    // 작성자 확인
    if (data.authorId !== userId) {
      return NextResponse.json({ error: '본인 게시글만 수정할 수 있습니다.' }, { status: 403 });
    }

    // 이미 수량이 설정되어 있으면 거부
    if (data.quantity && data.quantity > 0) {
      return NextResponse.json({ error: '수량은 이미 설정되어 있습니다. 변경할 수 없습니다.' }, { status: 400 });
    }

    // 통화 추론
    const currency = inferCurrency({
      exchange: data.exchange,
      stockData: data.stockData,
    });

    // 투자금액 계산 (작성 당시 가격 기준)
    const investedAmount = data.initialPrice * quantity;

    // 잔고 확인 및 차감
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let balances: Record<string, number> = getDefaultBalances();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.virtualBalances) {
        balances = { ...getDefaultBalances(), ...userData.virtualBalances };
      } else if (userData?.virtualBalance !== undefined) {
        balances.KRW = userData.virtualBalance;
      }
    }

    const currentBalance = balances[currency] ?? 0;

    if (currentBalance < investedAmount) {
      return NextResponse.json({
        error: `잔고가 부족합니다. (현재: ${currentBalance.toLocaleString()}, 필요: ${investedAmount.toLocaleString()})`,
        balances,
      }, { status: 400 });
    }

    // Firestore 업데이트: 수량 설정 + 잔고 차감
    balances[currency] = currentBalance - investedAmount;

    await Promise.all([
      docRef.update({ quantity, investedAmount }),
      userRef.update({ virtualBalances: balances }),
    ]);

    // feed.json 동기화
    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file('feed.json');
      const [exists] = await file.exists();

      if (exists) {
        const [content] = await file.download();
        const feed = JSON.parse(content.toString());
        const postIndex = feed.posts?.findIndex((p: { id: string }) => p.id === postId);
        if (postIndex >= 0) {
          feed.posts[postIndex].quantity = quantity;
          feed.posts[postIndex].investedAmount = investedAmount;
          feed.lastUpdated = new Date().toISOString();
          await file.save(JSON.stringify(feed, null, 2), {
            contentType: 'application/json',
            metadata: { cacheControl: 'public, max-age=60' },
          });
        }
      }
    } catch (feedError) {
      console.error('[Set Quantity] feed.json 동기화 실패:', feedError);
    }

    return NextResponse.json({
      success: true,
      message: '수량이 설정되었습니다.',
      data: { quantity, investedAmount, balances, currency },
    });
  } catch (error) {
    console.error('[Set Quantity] Error:', error);
    return NextResponse.json({ error: '수량 설정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
