/**
 * 최신 가격 캐시 — Supabase public.current_prices 테이블 기반.
 * 이전에는 Firebase Storage의 stock-prices.json/feed.json을 읽었으나
 * 모두 Postgres로 이전됨.
 */

import { getServiceClient } from './supabase-admin';

export interface CachedPriceData {
  currentPrice: number;
  exchange: string;
}

// 서버 인스턴스 내 메모리 캐시 (1분)
let cachedPrices: Record<string, CachedPriceData> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000;

/**
 * 모든 티커의 최신 가격을 가져옴. 1분간 메모리 캐시.
 */
export async function getLatestPrices(): Promise<Record<string, CachedPriceData>> {
  const now = Date.now();
  if (cachedPrices && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPrices;
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('current_prices')
      .select('ticker, exchange, current_price');

    if (error) {
      console.error('[priceCache] Supabase error:', error);
      return cachedPrices || {};
    }

    const map: Record<string, CachedPriceData> = {};
    for (const row of data ?? []) {
      map[row.ticker.toUpperCase()] = {
        currentPrice: Number(row.current_price),
        exchange: row.exchange,
      };
    }
    cachedPrices = map;
    cacheTimestamp = now;
    return map;
  } catch (err) {
    console.error('[priceCache] error:', err);
    return cachedPrices || {};
  }
}

export function getCurrencyFromExchange(exchange: string): string {
  switch (exchange) {
    case 'KRX': return 'KRW';
    case 'CRYPTO': return 'KRW';
    case 'TSE': return 'JPY';
    case 'HKS': return 'HKD';
    case 'SHS':
    case 'SZS': return 'CNY';
    default: return 'USD';
  }
}

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
