import { NextRequest, NextResponse } from 'next/server';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { tickers, reportDate } = await request.json();

    if (!tickers || !Array.isArray(tickers) || !reportDate) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    console.log(`[Portfolio Prices] Fetching prices for ${tickers.length} tickers from JSON`);

    // Firebase Storage에서 guru-stock-prices.json 다운로드
    let stockPricesData: any = null;

    try {
      const storageRef = ref(storage, 'guru-stock-prices.json');
      const downloadURL = await getDownloadURL(storageRef);
      const response = await fetch(downloadURL);

      if (!response.ok) {
        throw new Error(`Failed to fetch JSON: ${response.status}`);
      }

      stockPricesData = await response.json();
      console.log(`[Portfolio Prices] Loaded JSON with ${stockPricesData.totalStocks} stocks (updated: ${stockPricesData.lastUpdated})`);
    } catch (error) {
      console.error('[Portfolio Prices] Failed to load guru-stock-prices.json:', error);
      return NextResponse.json(
        {
          error: 'Guru price data not available',
          message: 'JSON 파일을 불러올 수 없습니다. Cron job이 실행되었는지 확인해주세요.'
        },
        { status: 503 }
      );
    }

    // 각 티커별로 basePrice와 현재가 가져오기
    const pricePromises = tickers.map(async (ticker: string) => {
      try {
        const tickerUpper = ticker.toUpperCase();

        // JSON에서 해당 티커 데이터 가져오기
        const stockData = stockPricesData.stocks[tickerUpper];

        if (!stockData) {
          console.warn(`[Portfolio Prices] No data for ${ticker} in JSON`);
          return {
            ticker,
            reportedPrice: null,
            currentPrice: null,
            changeFromReported: null,
          };
        }

        const reportedPrice = stockData.basePrice;
        const currentPrice = stockData.currentPrice;

        if (!reportedPrice || !currentPrice) {
          console.warn(`[Portfolio Prices] Missing price data for ${ticker} - basePrice: ${reportedPrice}, currentPrice: ${currentPrice}`);
          return {
            ticker,
            reportedPrice: reportedPrice || null,
            currentPrice: currentPrice || null,
            changeFromReported: null,
          };
        }

        // JSON에 이미 계산된 수익률이 있으므로 그대로 사용
        return {
          ticker,
          reportedPrice,
          currentPrice,
          changeFromReported: stockData.returnRate,
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
