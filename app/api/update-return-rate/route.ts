import { NextRequest, NextResponse } from 'next/server';
import { updateReportReturnRate } from '@/lib/stockPrice';
import { verifyAuthToken } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // 토큰 인증
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticker, initialPrice, positionType = 'long' } = body;

    if (!ticker || !initialPrice) {
      return NextResponse.json(
        { error: 'ticker와 initialPrice는 필수입니다.' },
        { status: 400 }
      );
    }

    console.log(`[API /update-return-rate] 수익률 업데이트 요청:`, {
      ticker,
      initialPrice,
      positionType,
    });

    const result = await updateReportReturnRate(ticker, initialPrice, positionType);

    if (!result) {
      return NextResponse.json(
        { error: '주가 정보를 가져올 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /update-return-rate] 오류:', error);
    return NextResponse.json(
      { error: '수익률 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
