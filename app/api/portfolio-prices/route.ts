import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalPrice, getCurrentStockPrice } from '@/lib/stockPrice';

export async function POST(request: NextRequest) {
  try {
    const { tickers, reportDate } = await request.json();

    if (!tickers || !Array.isArray(tickers) || !reportDate) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    console.log(`Fetching prices for ${tickers.length} tickers on ${reportDate}`);

    // 각 티커별로 과거 가격과 현재 가격 가져오기
    const pricePromises = tickers.map(async (ticker: string) => {
      try {
        const [historicalData, currentData] = await Promise.all([
          getHistoricalPrice(ticker, reportDate),
          getCurrentStockPrice(ticker),
        ]);

        if (!historicalData || !currentData) {
          console.warn(`Price data not available for ${ticker}`);
          return {
            ticker,
            reportedPrice: null,
            currentPrice: null,
            changeFromReported: null,
          };
        }

        const changeFromReported =
          ((currentData.price - historicalData.close) / historicalData.close) * 100;

        return {
          ticker,
          reportedPrice: historicalData.close,
          currentPrice: currentData.price,
          changeFromReported: parseFloat(changeFromReported.toFixed(2)),
        };
      } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error);
        return {
          ticker,
          reportedPrice: null,
          currentPrice: null,
          changeFromReported: null,
        };
      }
    });

    const prices = await Promise.all(pricePromises);

    return NextResponse.json({
      success: true,
      prices,
      reportDate,
    });
  } catch (error) {
    console.error('Portfolio prices fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch portfolio prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
