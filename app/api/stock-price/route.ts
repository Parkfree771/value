import { NextRequest, NextResponse } from 'next/server';
import { getLatestPrices, getCurrencyFromExchange } from '@/lib/priceCache';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json(
      { error: 'Ticker parameter is required' },
      { status: 400 }
    );
  }

  try {
    const tickerUpper = ticker.toUpperCase();
    console.log(`[Stock Price] Fetching from JSON: ${tickerUpper}`);

    // JSON 파일에서 가격 가져오기
    const latestPrices = await getLatestPrices();
    const stockData = latestPrices[tickerUpper];

    if (stockData && stockData.currentPrice) {
      const currency = getCurrencyFromExchange(stockData.exchange);
      console.log(`[Stock Price] Found data for ${tickerUpper}: ${stockData.currentPrice} ${currency}`);

      const response = NextResponse.json({
        price: stockData.currentPrice,
        currency,
        ticker: tickerUpper,
      });

      // 주가 데이터는 1분간 캐시 (실시간성과 성능 균형)
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

      return response;
    } else {
      console.warn(`[Stock Price] No data for ${tickerUpper} in JSON`);
      return NextResponse.json(
        {
          error: 'Stock data not found',
          message: `${tickerUpper} 종목 데이터가 없습니다. 잠시 후 다시 시도해주세요.`,
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('[Stock Price] Fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stock price',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
