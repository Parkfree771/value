import { NextRequest, NextResponse } from 'next/server';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// JSON 캐시 (메모리)
let cachedStockPrices: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 1000; // 1분 캐시

async function getStockPricesFromJSON() {
  const now = Date.now();

  // 캐시가 유효하면 재사용
  if (cachedStockPrices && now - cacheTimestamp < CACHE_DURATION) {
    return cachedStockPrices;
  }

  // Firebase Storage에서 JSON 다운로드
  const storageRef = ref(storage, 'stock-prices.json');
  const downloadURL = await getDownloadURL(storageRef);
  const response = await fetch(downloadURL);

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.status}`);
  }

  cachedStockPrices = await response.json();
  cacheTimestamp = now;

  console.log(`[Stock Price] Loaded JSON with ${cachedStockPrices.totalTickers} tickers (updated: ${cachedStockPrices.lastUpdated})`);

  return cachedStockPrices;
}

// 거래소에서 통화 추론
function getCurrencyFromExchange(exchange: string): string {
  switch (exchange) {
    case 'KRX': return 'KRW';
    case 'TSE': return 'JPY';
    case 'HKS': return 'HKD';
    case 'SHS':
    case 'SZS': return 'CNY';
    default: return 'USD'; // NAS, NYS, AMS
  }
}

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
    const stockPricesData = await getStockPricesFromJSON();
    const stockData = stockPricesData.prices?.[tickerUpper];

    if (stockData && stockData.currentPrice) {
      const currency = getCurrencyFromExchange(stockData.exchange);
      console.log(`[Stock Price] Found data for ${tickerUpper}: ${stockData.currentPrice} ${currency}`);

      return NextResponse.json({
        price: stockData.currentPrice,
        currency,
        ticker: tickerUpper,
        timestamp: stockPricesData.lastUpdated,
      });
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
