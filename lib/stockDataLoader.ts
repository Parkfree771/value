/**
 * 글로벌 주식 데이터 로더
 * public/data/global-stocks.json 파일을 로드하고 메모리에 캐싱
 */

export interface GlobalStock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
}

export interface GlobalStocksData {
  version: string;
  updatedAt: string;
  totalCount: number;
  exchanges: Record<string, number>;
  stocks: GlobalStock[];
}

// 메모리 캐시
let cachedData: GlobalStocksData | null = null;
let loadPromise: Promise<GlobalStocksData> | null = null;

/**
 * 글로벌 주식 데이터 로드 (캐싱 포함)
 *
 * 최초 호출 시 JSON 파일을 로드하고 메모리에 캐싱
 * 이후 호출은 캐시된 데이터를 즉시 반환
 */
export async function loadGlobalStocks(): Promise<GlobalStocksData> {
  // 이미 캐시된 데이터가 있으면 즉시 반환
  if (cachedData) {
    return cachedData;
  }

  // 이미 로딩 중이면 같은 Promise 반환 (중복 요청 방지)
  if (loadPromise) {
    return loadPromise;
  }

  // 새로운 로드 시작
  loadPromise = (async () => {
    try {
      console.log('[StockDataLoader] 글로벌 주식 데이터 로드 시작...');

      const response = await fetch('/data/global-stocks.json');
      if (!response.ok) {
        throw new Error(`Failed to load global stocks: ${response.status}`);
      }

      const data: GlobalStocksData = await response.json();

      console.log(`[StockDataLoader] 로드 완료:`);
      console.log(`  - 버전: ${data.version}`);
      console.log(`  - 총 종목: ${data.totalCount.toLocaleString()}개`);
      console.log(`  - 거래소 수: ${Object.keys(data.exchanges).length}개`);

      // 캐시에 저장
      cachedData = data;

      return data;
    } catch (error) {
      console.error('[StockDataLoader] 데이터 로드 실패:', error);
      loadPromise = null; // 실패 시 다시 시도할 수 있도록 Promise 초기화
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * 종목 검색 (이름 또는 심볼)
 *
 * @param query 검색어
 * @param limit 최대 결과 수 (기본 20)
 * @returns 검색 결과
 */
export async function searchGlobalStocks(
  query: string,
  limit: number = 20
): Promise<GlobalStock[]> {
  const data = await loadGlobalStocks();

  if (!query || query.length === 0) {
    return [];
  }

  const searchLower = query.toLowerCase().trim();
  const results: GlobalStock[] = [];

  // 정확한 심볼 매치 우선
  for (const stock of data.stocks) {
    const symbolLower = stock.symbol.toLowerCase();
    const nameLower = stock.name.toLowerCase();

    // 심볼 정확 매치 (최우선)
    if (symbolLower === searchLower) {
      results.unshift(stock); // 맨 앞에 추가
      continue;
    }

    // 심볼 시작 매치
    if (symbolLower.startsWith(searchLower)) {
      results.push(stock);
      continue;
    }

    // 이름에 포함
    if (nameLower.includes(searchLower)) {
      results.push(stock);
      continue;
    }

    // 심볼에 포함
    if (symbolLower.includes(searchLower)) {
      results.push(stock);
    }

    // 제한 수 도달 시 종료
    if (results.length >= limit * 2) {
      break;
    }
  }

  // 결과 정렬: 심볼 매치 우선, 이름 매치 후순위
  results.sort((a, b) => {
    const aSymbol = a.symbol.toLowerCase();
    const bSymbol = b.symbol.toLowerCase();
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // 심볼 정확 매치 최우선
    if (aSymbol === searchLower && bSymbol !== searchLower) return -1;
    if (bSymbol === searchLower && aSymbol !== searchLower) return 1;

    // 심볼 시작 매치
    if (aSymbol.startsWith(searchLower) && !bSymbol.startsWith(searchLower)) return -1;
    if (bSymbol.startsWith(searchLower) && !aSymbol.startsWith(searchLower)) return 1;

    // 이름 포함 여부
    const aNameMatch = aName.includes(searchLower);
    const bNameMatch = bName.includes(searchLower);

    if (aNameMatch && !bNameMatch) return -1;
    if (bNameMatch && !aNameMatch) return 1;

    // 알파벳순
    return aSymbol.localeCompare(bSymbol);
  });

  return results.slice(0, limit);
}

/**
 * 거래소별 종목 검색
 *
 * @param query 검색어
 * @param exchange 거래소 코드 (NYS, NAS, KRX 등)
 * @param limit 최대 결과 수
 * @returns 검색 결과
 */
export async function searchStocksByExchange(
  query: string,
  exchange: string,
  limit: number = 20
): Promise<GlobalStock[]> {
  const allResults = await searchGlobalStocks(query, limit * 2);
  return allResults
    .filter(stock => stock.exchange === exchange)
    .slice(0, limit);
}

/**
 * 특정 종목 조회 (심볼로)
 *
 * @param symbol 종목 심볼
 * @param exchange 거래소 코드 (선택)
 * @returns 종목 정보 또는 null
 */
export async function getStockBySymbol(
  symbol: string,
  exchange?: string
): Promise<GlobalStock | null> {
  const data = await loadGlobalStocks();

  const symbolUpper = symbol.toUpperCase();

  for (const stock of data.stocks) {
    if (stock.symbol.toUpperCase() === symbolUpper) {
      // 거래소 지정된 경우 거래소도 일치해야 함
      if (exchange && stock.exchange !== exchange) {
        continue;
      }
      return stock;
    }
  }

  return null;
}

/**
 * 캐시 초기화 (테스트/디버깅 용도)
 */
export function clearCache(): void {
  cachedData = null;
  loadPromise = null;
  console.log('[StockDataLoader] 캐시 초기화 완료');
}

/**
 * 현재 캐시 상태 확인
 */
export function getCacheStatus(): {
  isCached: boolean;
  totalStocks: number | null;
  version: string | null;
} {
  return {
    isCached: cachedData !== null,
    totalStocks: cachedData?.totalCount ?? null,
    version: cachedData?.version ?? null,
  };
}
