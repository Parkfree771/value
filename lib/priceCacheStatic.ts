// Firebase SDK 초기화 없이 직접 fetch하는 정적 가격 캐시
// Cold start 시간을 크게 줄여줍니다

export interface CachedPriceData {
  currentPrice: number;
  exchange: string;
}

// 서버 사이드 캐시 (요청 간 공유)
let cachedPrices: Record<string, CachedPriceData> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1분

// Firebase Storage public URL (환경 변수 또는 직접 설정)
const STOCK_PRICES_URL = process.env.STOCK_PRICES_JSON_URL ||
  `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/stock-prices.json?alt=media`;

/**
 * Firebase SDK 초기화 없이 stock-prices.json을 직접 fetch합니다.
 * Cold start 시간을 크게 단축시킵니다.
 */
export async function getLatestPricesStatic(): Promise<Record<string, CachedPriceData>> {
  const now = Date.now();

  // 캐시 히트
  if (cachedPrices && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPrices;
  }

  try {
    const response = await fetch(STOCK_PRICES_URL, {
      next: { revalidate: 60 }, // Next.js fetch 캐시 1분
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    cachedPrices = data.prices || {};
    cacheTimestamp = now;

    return cachedPrices || {};
  } catch (error) {
    console.error('[PriceCacheStatic] Failed to load prices:', error);
    // 캐시된 데이터가 있으면 반환, 없으면 빈 객체
    return cachedPrices || {};
  }
}
