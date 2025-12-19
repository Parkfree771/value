import { NextRequest, NextResponse } from 'next/server';

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
    console.log(`Fetching stock price for: ${ticker}`);

    // Yahoo Finance API를 통해 주식 가격 가져오기
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store', // 캐시 사용 안함
      }
    );

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Raw API response for ${ticker}:`, JSON.stringify(data, null, 2));

    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      const price = data.chart.result[0].meta.regularMarketPrice;
      console.log(`Successfully fetched price for ${ticker}: $${price}`);

      return NextResponse.json({
        price,
        ticker,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('Price data not found in response');
      throw new Error('Price data not found in response');
    }
  } catch (error) {
    console.error('Stock price fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stock price',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
