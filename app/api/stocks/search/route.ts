import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface GlobalStock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  nameKr?: string;
}

interface GlobalStocksData {
  version: string;
  updatedAt: string;
  totalCount: number;
  exchanges: Record<string, number>;
  stocks: GlobalStock[];
}

// 메모리 캐시
let cachedData: GlobalStocksData | null = null;

/**
 * 서버 사이드에서 글로벌 주식 데이터 로드
 */
function loadGlobalStocks(): GlobalStocksData {
  // 캐시가 있으면 반환
  if (cachedData) {
    return cachedData;
  }

  // 파일 읽기
  const filePath = path.join(process.cwd(), 'public', 'data', 'global-stocks.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data: GlobalStocksData = JSON.parse(fileContent);
  cachedData = data;

  console.log(`[API] 글로벌 주식 데이터 로드 완료: ${data.totalCount.toLocaleString()}개 종목`);

  return data;
}

/**
 * 종목 검색
 */
function searchStocks(query: string, limit: number): GlobalStock[] {
  const data = loadGlobalStocks();

  if (!query || query.length === 0) {
    return [];
  }

  const searchLower = query.toLowerCase().trim();
  const results: GlobalStock[] = [];
  const seenKeys = new Set<string>(); // 중복 방지

  // 정확한 심볼 매치 우선
  for (const stock of data.stocks) {
    const symbolLower = stock.symbol.toLowerCase();
    const nameLower = stock.name.toLowerCase();
    const nameKrLower = stock.nameKr?.toLowerCase() || '';

    // 중복 체크용 키 (symbol + exchange)
    const key = `${stock.symbol}:${stock.exchange}`;
    if (seenKeys.has(key)) continue;

    // 심볼 정확 매치 (최우선)
    if (symbolLower === searchLower) {
      results.unshift(stock);
      seenKeys.add(key);
      continue;
    }

    // 한글 이름 정확 매치
    if (nameKrLower && nameKrLower === searchLower) {
      results.unshift(stock);
      seenKeys.add(key);
      continue;
    }

    // 한글 이름 시작 매치
    if (nameKrLower && nameKrLower.startsWith(searchLower)) {
      results.push(stock);
      seenKeys.add(key);
      continue;
    }

    // 심볼 시작 매치
    if (symbolLower.startsWith(searchLower)) {
      results.push(stock);
      seenKeys.add(key);
      continue;
    }

    // 한글 이름에 포함
    if (nameKrLower && nameKrLower.includes(searchLower)) {
      results.push(stock);
      seenKeys.add(key);
      continue;
    }

    // 영문 이름에 포함
    if (nameLower.includes(searchLower)) {
      results.push(stock);
      seenKeys.add(key);
      continue;
    }

    // 심볼에 포함
    if (symbolLower.includes(searchLower)) {
      results.push(stock);
      seenKeys.add(key);
    }

    // 제한 수 도달 시 종료
    if (results.length >= limit * 2) {
      break;
    }
  }

  // 결과 정렬
  results.sort((a, b) => {
    const aSymbol = a.symbol.toLowerCase();
    const bSymbol = b.symbol.toLowerCase();
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aNameKr = a.nameKr?.toLowerCase() || '';
    const bNameKr = b.nameKr?.toLowerCase() || '';

    // 심볼 정확 매치 최우선
    if (aSymbol === searchLower && bSymbol !== searchLower) return -1;
    if (bSymbol === searchLower && aSymbol !== searchLower) return 1;

    // 한글 이름 정확 매치
    if (aNameKr === searchLower && bNameKr !== searchLower) return -1;
    if (bNameKr === searchLower && aNameKr !== searchLower) return 1;

    // 한글 이름 시작 매치
    if (aNameKr.startsWith(searchLower) && !bNameKr.startsWith(searchLower)) return -1;
    if (bNameKr.startsWith(searchLower) && !aNameKr.startsWith(searchLower)) return 1;

    // 심볼 시작 매치
    if (aSymbol.startsWith(searchLower) && !bSymbol.startsWith(searchLower)) return -1;
    if (bSymbol.startsWith(searchLower) && !aSymbol.startsWith(searchLower)) return 1;

    // 한글 이름 포함 여부
    const aNameKrMatch = aNameKr.includes(searchLower);
    const bNameKrMatch = bNameKr.includes(searchLower);
    if (aNameKrMatch && !bNameKrMatch) return -1;
    if (bNameKrMatch && !aNameKrMatch) return 1;

    // 영문 이름 포함 여부
    const aNameMatch = aName.includes(searchLower);
    const bNameMatch = bName.includes(searchLower);
    if (aNameMatch && !bNameMatch) return -1;
    if (bNameMatch && !aNameMatch) return 1;

    // 알파벳순
    return aSymbol.localeCompare(bSymbol);
  });

  return results.slice(0, limit);
}

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

    // 검색 실행
    const results = searchStocks(query, limit);

    console.log(`[API /stocks/search] 검색 완료: ${results.length}개 결과`);

    // StockInfo 형식으로 변환
    const formattedResults = results.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      type: 'EQUITY' as const,
    }));

    return NextResponse.json({
      success: true,
      stocks: formattedResults,
      count: formattedResults.length,
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
