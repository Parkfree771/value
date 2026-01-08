import { NextRequest, NextResponse } from 'next/server';
import { getKISStockPrice, getKISOverseaStockPrice, detectExchange } from '@/lib/kis';

/**
 * 한국투자증권 API - 주식 시세 조회
 * GET /api/kis/stock?code=005930 (국내)
 * GET /api/kis/stock?code=AAPL (해외)
 * GET /api/kis/stock?code=AAPL&exchange=NAS (해외, 거래소 지정)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stockCode = searchParams.get('code');
    const exchange = searchParams.get('exchange');

    if (!stockCode) {
      return NextResponse.json(
        { error: '종목코드를 입력해주세요' },
        { status: 400 }
      );
    }

    // 한국 주식 (6자리 숫자)
    if (/^\d{6}$/.test(stockCode)) {
      const stockData = await getKISStockPrice(stockCode);
      return NextResponse.json({
        success: true,
        data: stockData,
      });
    }

    // 해외 주식
    const detectedExchange = exchange || detectExchange(stockCode);
    const stockData = await getKISOverseaStockPrice(stockCode, detectedExchange);

    return NextResponse.json({
      success: true,
      data: stockData,
    });
  } catch (error) {
    console.error('주식 시세 조회 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '주식 시세 조회 실패'
      },
      { status: 500 }
    );
  }
}
