/**
 * 통합 메모리 캐시
 *
 * Firebase Storage JSON 파일에 대한 메모리 캐시를 제공합니다.
 * 서버 사이드에서 요청 간 캐시를 공유하여 Firebase 호출을 최소화합니다.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

interface CacheOptions {
  /** 캐시 유효 시간 (ms). 기본값: 60000 (1분) */
  ttl?: number;
  /** 스테일 상태에서도 응답할지 여부. 기본값: true */
  staleWhileRevalidate?: boolean;
  /** 스테일 허용 시간 (ms). 기본값: 120000 (2분) */
  staleTime?: number;
}

const DEFAULT_TTL = 60 * 1000; // 1분
const DEFAULT_STALE_TIME = 120 * 1000; // 2분

class JsonCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * 캐시에서 데이터를 가져옵니다.
   * 캐시가 없거나 만료되면 fetcher를 실행합니다.
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = DEFAULT_TTL,
      staleWhileRevalidate = true,
      staleTime = DEFAULT_STALE_TIME,
    } = options;

    const now = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    // 캐시 히트 - 아직 유효함
    if (entry && now - entry.timestamp < ttl) {
      return entry.data;
    }

    // 스테일 캐시 - 백그라운드에서 재검증
    if (entry && staleWhileRevalidate && now - entry.timestamp < staleTime) {
      // 비동기로 재검증 (응답은 스테일 데이터로)
      this.revalidate(key, fetcher, ttl).catch(console.error);
      return entry.data;
    }

    // 캐시 미스 또는 스테일 타임 초과 - 새로 가져옴
    return this.revalidate(key, fetcher, ttl);
  }

  /**
   * 데이터를 가져와서 캐시를 업데이트합니다.
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const data = await fetcher();
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } catch (error) {
      // 실패 시 기존 캐시 반환 (있다면)
      const existing = this.cache.get(key) as CacheEntry<T> | undefined;
      if (existing) {
        console.warn(`[JsonCache] Revalidation failed for ${key}, using stale data`);
        return existing.data;
      }
      throw error;
    }
  }

  /**
   * 특정 키의 캐시를 무효화합니다.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 모든 캐시를 무효화합니다.
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * 캐시 상태를 확인합니다.
   */
  getStatus(key: string): { exists: boolean; age: number | null; isStale: boolean } {
    const entry = this.cache.get(key);
    if (!entry) {
      return { exists: false, age: null, isStale: false };
    }

    const age = Date.now() - entry.timestamp;
    return {
      exists: true,
      age,
      isStale: age > DEFAULT_TTL,
    };
  }
}

// 싱글톤 인스턴스
export const jsonCache = new JsonCache();

// 편의 함수들
export const CACHE_KEYS = {
  FEED: 'feed.json',
  STOCK_PRICES: 'stock-prices.json',
  RANKINGS: 'rankings.json',
} as const;

/**
 * feed.json을 캐시와 함께 가져옵니다.
 */
export async function getCachedFeed<T>(fetcher: () => Promise<T>): Promise<T> {
  return jsonCache.get(CACHE_KEYS.FEED, fetcher, {
    ttl: 60 * 1000, // 1분
    staleWhileRevalidate: true,
    staleTime: 120 * 1000, // 2분
  });
}

/**
 * stock-prices.json을 캐시와 함께 가져옵니다.
 */
export async function getCachedPrices<T>(fetcher: () => Promise<T>): Promise<T> {
  return jsonCache.get(CACHE_KEYS.STOCK_PRICES, fetcher, {
    ttl: 60 * 1000,
    staleWhileRevalidate: true,
    staleTime: 300 * 1000, // 5분
  });
}

export default jsonCache;
