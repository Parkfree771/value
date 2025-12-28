import { NextRequest, NextResponse } from 'next/server';
import { searchAllStocks } from '@/lib/kis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log(`[API /stocks/search] 검색 시작: ${query}`);

    // 한국투자증권 API를 통한 실시간 검색
    const results = await searchAllStocks(query, limit);

    console.log(`[API /stocks/search] 검색 완료: ${results.length}개 결과`);

    return NextResponse.json({
      success: true,
      stocks: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search stocks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
