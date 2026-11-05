/**
 * 최신 가격 — Postgres public.current_prices 테이블 기반.
 * 가격 cron이 장 마감 후 UPSERT, 페이지·라우트가 이 헬퍼로 읽음.
 *
 * 캐시: Next 데이터 캐시(인스턴스 공유) · 태그 prices — 수집 완료 시 invalidateMarket() 이 비운다 (lib/cache.ts)
 */

import { unstable_cache } from 'next/cache';
import { sql } from './db';
import { SAFETY_TTL, TAG } from './cache';

export interface CachedPriceData {
  currentPrice: number;
  exchange: string;
}

const readLatestPrices = unstable_cache(
  async (): Promise<Record<string, CachedPriceData>> => {
    const data = await sql`select ticker, exchange, current_price from current_prices`;
    const map: Record<string, CachedPriceData> = {};
    for (const row of data) {
      map[row.ticker.toUpperCase()] = {
        currentPrice: Number(row.current_price),
        exchange: row.exchange,
      };
    }
    return map;
  },
  ['latest-prices'],
  { tags: [TAG.prices], revalidate: SAFETY_TTL },
);

/** 모든 티커의 최신 가격 (장 마감 종가) */
export async function getLatestPrices(): Promise<Record<string, CachedPriceData>> {
  try {
    return await readLatestPrices();
  } catch (err) {
    // 캐시가 실패를 저장하지 않도록 예외는 캐시 함수 밖에서 처리
    console.error('[priceCache] error:', err);
    return {};
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
