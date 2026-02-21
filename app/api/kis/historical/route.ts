import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalPrice } from '@/lib/stockPrice';

/**
 * 과거 주가 종가 조회
 * GET /api/kis/historical?code=AAPL&date=2026-02-17&exchange=NAS
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const date = searchParams.get('date');
    const exchange = searchParams.get('exchange') || undefined;

    if (!code || !date) {
      return NextResponse.json(
        { error: 'code와 date 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const result = await getHistoricalPrice(code, date, exchange);

    if (!result) {
      return NextResponse.json(
        { success: false, error: '해당 날짜의 주가를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('과거 주가 조회 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '과거 주가 조회 실패',
      },
      { status: 500 }
    );
  }
}
