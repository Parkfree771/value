import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log(`[API /stocks/search] 검색 시작: ${query}`);

    // Yahoo Finance에서 기업 검색
    const result: any = await yahooFinance.search(query);

    console.log(`[API /stocks/search] 검색 완료: ${result.quotes?.length || 0}개 결과`);

    // 주식 종목만 필터링
    const stocks = (result.quotes || [])
      .filter((quote: any) => quote.quoteType === 'EQUITY')
      .slice(0, 10) // 상위 10개만
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        exchange: quote.exchange || 'N/A',
        type: quote.quoteType
      }));

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json(
      { error: 'Failed to search stocks' },
      { status: 500 }
    );
  }
}
