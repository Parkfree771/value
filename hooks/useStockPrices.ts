/**
 * Firebase Storage에서 주식 가격 JSON 가져오는 hook
 *
 * stock-prices.json 파일에서 현재가를 로드
 * 캐싱: 5분간 유지 (JSON 파일의 max-age와 동일)
 */

import { useState, useEffect, useCallback } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import app from '@/lib/firebase';

interface StockPrice {
  currentPrice: number;
  exchange: string;
  lastUpdated: string;
}

interface StockPricesData {
  lastUpdated: string;
  marketType: string;
  totalTickers: number;
  successCount: number;
  failCount: number;
  prices: Record<string, StockPrice>;
}

// 캐시 (5분)
let cache: {
  data: StockPricesData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5분

export function useStockPrices() {
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchPrices = useCallback(async (forceRefresh = false) => {
    // 캐시가 유효하면 사용
    if (!forceRefresh && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
      setPrices(cache.data.prices);
      setLastUpdated(cache.data.lastUpdated);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const storage = getStorage(app);
      const fileRef = ref(storage, 'stock-prices.json');
      const url = await getDownloadURL(fileRef);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch stock prices');
      }

      const data: StockPricesData = await response.json();

      // 캐시 업데이트
      cache = {
        data,
        timestamp: Date.now(),
      };

      setPrices(data.prices);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      console.error('[useStockPrices] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // 특정 ticker의 현재가 가져오기
  const getPrice = useCallback((ticker: string): number | null => {
    const upperTicker = ticker.toUpperCase().trim();
    return prices[upperTicker]?.currentPrice ?? null;
  }, [prices]);

  // 수익률 계산 (base_price와 현재가로)
  const calculateReturn = useCallback((ticker: string, basePrice: number, positionType: 'long' | 'short' = 'long'): number | null => {
    const currentPrice = getPrice(ticker);
    if (currentPrice === null || basePrice <= 0) return null;

    if (positionType === 'long') {
      return ((currentPrice - basePrice) / basePrice) * 100;
    } else {
      return ((basePrice - currentPrice) / basePrice) * 100;
    }
  }, [getPrice]);

  return {
    prices,
    loading,
    error,
    lastUpdated,
    refresh: () => fetchPrices(true),
    getPrice,
    calculateReturn,
  };
}

/**
 * 단일 ticker 가격만 필요할 때 사용
 */
export function useStockPrice(ticker: string) {
  const { prices, loading, error, getPrice, calculateReturn } = useStockPrices();

  return {
    currentPrice: getPrice(ticker),
    loading,
    error,
    calculateReturn: (basePrice: number, positionType?: 'long' | 'short') =>
      calculateReturn(ticker, basePrice, positionType),
  };
}
