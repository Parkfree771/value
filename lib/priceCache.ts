/**
 * 최신 가격 캐시 — Postgres public.current_prices 테이블 기반.
 * 가격 cron이 UPSERT, 페이지·라우트가 이 헬퍼로 읽음.
 */

import { sql } from './db';

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
    let data: Record<string, any>[];
    try {
      data = await sql`select ticker, exchange, current_price from current_prices`;
    } catch (error) {
      console.error('[priceCache] DB error:', error);
      return cachedPrices || {};
    }

    const map: Record<string, CachedPriceData> = {};
    for (const row of data) {
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
    case 'TSE': return 'JPY';
    case 'HKS': return 'HKD';
    case 'SHS':
    case 'SZS': return 'CNY';
    default: return 'USD';
  }
}

