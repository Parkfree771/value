import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    console.log(`[API /stocks/${symbol}] 주식 데이터 조회 시작`);

    // Yahoo Finance에서 주식 데이터 조회
    const quote: any = await yahooFinance.quote(symbol);
    const summaryDetail: any = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData']
    });

    console.log(`[API /stocks/${symbol}] 조회 성공:`, {
      symbol: quote.symbol,
      price: quote.regularMarketPrice
    });

    // 필요한 데이터 추출
    const stockData = {
      symbol: quote.symbol || symbol,
      name: quote.shortName || quote.longName || 'Unknown',
      currentPrice: quote.regularMarketPrice || 0,
      currency: quote.currency || 'USD',
      marketCap: quote.marketCap || 0,

      // 재무 지표
      per: summaryDetail.summaryDetail?.trailingPE ||
           summaryDetail.defaultKeyStatistics?.trailingPE ||
           null,
      pbr: summaryDetail.defaultKeyStatistics?.priceToBook || null,
      eps: summaryDetail.defaultKeyStatistics?.trailingEps || null,

      // 추가 정보
      exchange: quote.exchange || 'N/A',
      industry: quote.industry || null,
      sector: quote.sector || null,
    };

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Stock data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
