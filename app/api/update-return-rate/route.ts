import { NextRequest, NextResponse } from 'next/server';
import { updateReportReturnRate } from '@/lib/stockPrice';

export async function POST(request: NextRequest) {
  try {
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
