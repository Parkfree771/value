import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import guruPortfolioData from '@/lib/guru-portfolio-data.json';

export async function POST(request: NextRequest) {
  try {
    const { tickers, reportDate } = await request.json();

    if (!tickers || !Array.isArray(tickers) || !reportDate) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    console.log(`[Portfolio Prices] Fetching prices for ${tickers.length} tickers`);

    // JSON 파일에서 basePrice 맵 생성
    const basePriceMap = new Map<string, number>();
    Object.values(guruPortfolioData.gurus).forEach((guru) => {
      guru.holdings.forEach((holding) => {
        basePriceMap.set(holding.ticker.toUpperCase(), holding.basePrice);
      });
    });

    // 각 티커별로 basePrice와 현재가 가져오기
    const pricePromises = tickers.map(async (ticker: string) => {
      try {
        const tickerUpper = ticker.toUpperCase();

        // 1. JSON에서 9월 30일 기준가 가져오기
        const reportedPrice = basePriceMap.get(tickerUpper);

        // 2. Firestore에서 현재가 가져오기
        const stockDoc = await getDoc(doc(db, 'stock_data', tickerUpper));
        const currentPrice = stockDoc.exists() ? stockDoc.data()?.price : null;

        if (!reportedPrice || !currentPrice) {
          console.warn(`[Portfolio Prices] Missing price data for ${ticker} - basePrice: ${reportedPrice}, currentPrice: ${currentPrice}`);
          return {
            ticker,
            reportedPrice: reportedPrice || null,
            currentPrice: currentPrice || null,
            changeFromReported: null,
          };
        }

        // 3. 수익률 계산
        const changeFromReported = ((currentPrice - reportedPrice) / reportedPrice) * 100;

        return {
          ticker,
          reportedPrice,
          currentPrice,
          changeFromReported: parseFloat(changeFromReported.toFixed(2)),
        };
      } catch (error) {
        console.error(`[Portfolio Prices] Error fetching price for ${ticker}:`, error);
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
    console.error('[Portfolio Prices] Fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch portfolio prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
