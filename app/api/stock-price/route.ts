import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get('ticker');
  const collection = searchParams.get('collection') || 'marketcall_prices'; // 기본값: marketcall_prices (market-call에서 사용)

  if (!ticker) {
    return NextResponse.json(
      { error: 'Ticker parameter is required' },
      { status: 400 }
    );
  }

  try {
    const tickerUpper = ticker.toUpperCase();
    console.log(`[Stock Price] Fetching from Firestore: ${tickerUpper} (collection: ${collection})`);

    // Firestore에서 캐시된 가격 가져오기 (collection 파라미터로 지정)
    const stockDoc = await getDoc(doc(db, collection, tickerUpper));

    if (stockDoc.exists()) {
      const data = stockDoc.data();
      console.log(`[Stock Price] Found cached data for ${tickerUpper}: ${data.price} ${data.currency}`);

      return NextResponse.json({
        price: data.price,
        currency: data.currency || 'USD',
        ticker: tickerUpper,
        timestamp: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    } else {
      console.warn(`[Stock Price] No cached data for ${tickerUpper}`);
      return NextResponse.json(
        {
          error: 'Stock data not found',
          message: `${tickerUpper} 종목 데이터가 캐시에 없습니다. 잠시 후 다시 시도해주세요.`,
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
