/**
 * 가격 캐시 모듈
 *
 * Firebase Storage에서 가격 데이터를 가져와 캐시
 * Dynamic import로 Firebase 모듈 지연 로드
 */

// 공통 가격 데이터 타입
export interface CachedPriceData {
  currentPrice: number;
  exchange: string;
}

// 싱글톤 캐시 (서버 사이드에서 요청 간 공유)
let cachedPrices: Record<string, CachedPriceData> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1분

/**
 * Firebase Storage의 stock-prices.json에서 최신 가격을 가져옵니다.
 * 1분간 캐시하여 중복 요청을 방지합니다.
 */
export async function getLatestPrices(): Promise<Record<string, CachedPriceData>> {
  const now = Date.now();

  if (cachedPrices && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPrices;
  }

  try {
    // Dynamic import로 Firebase 모듈 지연 로드
    const { getStorageLazy } = await import('./firebase-lazy');
    const { ref, getDownloadURL } = await import('firebase/storage');

    const storage = await getStorageLazy();
    const storageRef = ref(storage, 'stock-prices.json');
    const downloadURL = await getDownloadURL(storageRef);
    const response = await fetch(downloadURL);
    const data = await response.json();
    cachedPrices = data.prices || {};
    cacheTimestamp = now;
    console.log(`[PriceCache] Loaded ${Object.keys(cachedPrices || {}).length} prices from JSON`);
    return cachedPrices || {};
  } catch (error) {
    console.error('[PriceCache] Failed to load prices JSON:', error);
    return cachedPrices || {};
  }
}

/**
 * 거래소 코드에서 통화를 추론합니다.
 */
export function getCurrencyFromExchange(exchange: string): string {
  switch (exchange) {
    case 'KRX': return 'KRW';
    case 'TSE': return 'JPY';
    case 'HKS': return 'HKD';
    case 'SHS':
    case 'SZS': return 'CNY';
    default: return 'USD';
  }
}

/**
 * 특정 티커의 가격 정보를 가져옵니다.
 */
export async function getPriceForTicker(ticker: string): Promise<{
  currentPrice: number | null;
  exchange: string | null;
  currency: string;
} | null> {
  const prices = await getLatestPrices();
  const tickerUpper = ticker.toUpperCase();
  const priceData = prices[tickerUpper];

  if (priceData && priceData.currentPrice) {
    return {
      currentPrice: priceData.currentPrice,
      exchange: priceData.exchange,
      currency: getCurrencyFromExchange(priceData.exchange),
    };
  }

  return null;
}
