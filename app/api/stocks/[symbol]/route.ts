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

    if (!quote || typeof quote !== 'object') {
      console.error(`[API /stocks/${symbol}] 주식을 찾을 수 없습니다.`);
      return NextResponse.json(
        { error: `주식 티커 '${symbol}'을(를) 찾을 수 없습니다. 올바른 티커인지 확인해주세요.` },
        { status: 404 }
      );
    }

    if (!quote.regularMarketPrice) {
      console.error(`[API /stocks/${symbol}] 주가 데이터가 없습니다.`);
      return NextResponse.json(
        { error: `'${symbol}'의 주가 데이터를 가져올 수 없습니다.` },
        { status: 404 }
      );
    }

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
  } catch (error: any) {
    console.error(`[API /stocks/${(await params).symbol}] 오류:`, error);

    // 404 에러 (티커를 찾을 수 없음)
    if (error.message?.includes('Not Found') || error.message?.includes('404')) {
      return NextResponse.json(
        { error: `주식 티커를 찾을 수 없습니다. 올바른 티커인지 확인해주세요.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: '주식 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
