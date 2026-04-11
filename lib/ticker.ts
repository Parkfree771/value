/**
 * lib/ticker.ts
 * ─────────────────────────────────────────────
 * 상단 마켓 티커 바의 데이터 페칭 로직.
 * /api/ticker route 와 <MarketTickerBar /> Server Component 양쪽에서
 * 직접 호출되어 HTTP 왕복 없이 재사용된다.
 *
 * 반환 항목 (9개, 표시 순서 고정):
 *   0. AntStreet 유저 평균 수익률 (feed.json 기반)
 *   1. KOSPI                     (한투 국내업종 API)
 *   2. KOSDAQ                    (한투 국내업종 API)
 *   3. KOSPI200                  (한투 국내업종 API)
 *   4. USD/KRW                   (market.json forex)
 *   5. S&P 500                   (market.json)
 *   6. NASDAQ                    (market.json)
 *   7. DOW                       (market.json)
 *   8. BTC/KRW                   (Upbit 공개 API)
 */

import { getKISDomesticIndex } from '@/lib/kis';
import { getUpbitPrice } from '@/lib/upbit';

export type TickerCategory = 'site' | 'kr_index' | 'us_index' | 'forex' | 'crypto';

export interface TickerItem {
  id: string;
  label: string;
  price: number | null;
  changePercent: number | null;
  category: TickerCategory;
  decimals: number;
  prefix?: string;
  suffix?: string;
  accent?: boolean;
}

export interface MarketStatusPayload {
  code: 'open' | 'closed' | 'pre' | 'after';
  label: string;
}

export interface TickerResponse {
  status: MarketStatusPayload;
  items: TickerItem[];
  updatedAt: number;
}

// ───────────────────────────────────────────────
// 장 상태 (KST 기준)
// ───────────────────────────────────────────────

export function getKRXMarketStatus(now: Date = new Date()): MarketStatusPayload {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();

  const PRE = 8 * 60;
  const OPEN = 9 * 60;
  const CLOSE = 15 * 60 + 30;
  const AFTER_END = 18 * 60;

  if (day === 0 || day === 6) return { code: 'closed', label: '휴장' };
  if (minutes >= OPEN && minutes < CLOSE) return { code: 'open', label: '개장중' };
  if (minutes >= PRE && minutes < OPEN) return { code: 'pre', label: '장 전' };
  if (minutes >= CLOSE && minutes < AFTER_END) return { code: 'after', label: '장 마감' };
  return { code: 'closed', label: '장외' };
}

// ───────────────────────────────────────────────
// AntStreet 평균 수익률
// ───────────────────────────────────────────────

async function fetchAntStreetAverage(): Promise<number | null> {
  try {
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) return null;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/feed.json?alt=media`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = await res.json();
    const posts: { returnRate?: number }[] = data?.posts ?? [];
    if (posts.length === 0) return null;
    const sum = posts.reduce(
      (acc, p) => acc + (Number.isFinite(p.returnRate) ? (p.returnRate as number) : 0),
      0
    );
    return sum / posts.length;
  } catch (err) {
    console.error('[Ticker] AntStreet avg fetch failed:', err);
    return null;
  }
}

// ───────────────────────────────────────────────
// market.json (US 지수 + USD/KRW)
// ───────────────────────────────────────────────

interface MarketJsonQuote {
  price: number;
  changePercent: string;
}
interface MarketJsonItem {
  symbol: string;
  name: string;
  type: string;
  quote: MarketJsonQuote | null;
}
interface MarketJsonForex {
  from: string;
  to: string;
  name: string;
  rate: { price: number; lastUpdated: string } | null;
}
interface MarketJson {
  market: MarketJsonItem[];
  forex: MarketJsonForex[];
}

async function fetchMarketJson(): Promise<MarketJson | null> {
  try {
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) return null;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/market.json?alt=media`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    return (await res.json()) as MarketJson;
  } catch (err) {
    console.error('[Ticker] market.json fetch failed:', err);
    return null;
  }
}

function parsePct(str: string | undefined | null): number | null {
  if (!str) return null;
  const n = parseFloat(str.replace('%', ''));
  return Number.isFinite(n) ? n : null;
}

function pickMarketItem(
  mj: MarketJson | null,
  name: string
): { price: number; changePercent: number } | null {
  if (!mj) return null;
  const item = mj.market.find((m) => m.name === name);
  if (!item?.quote) return null;
  const pct = parsePct(item.quote.changePercent);
  return { price: item.quote.price, changePercent: pct ?? 0 };
}

// ───────────────────────────────────────────────
// 메인: 전체 티커 데이터 조립
// ───────────────────────────────────────────────

export async function getTickerData(): Promise<TickerResponse> {
  const status = getKRXMarketStatus();

  const [antAvg, marketJson, kospi, kosdaq, kospi200, btc] = await Promise.all([
    fetchAntStreetAverage(),
    fetchMarketJson(),
    getKISDomesticIndex('0001').catch(() => null),
    getKISDomesticIndex('1001').catch(() => null),
    getKISDomesticIndex('2001').catch(() => null),
    getUpbitPrice('BTC').catch(() => null),
  ]);

  const sp500 = pickMarketItem(marketJson, 'S&P 500');
  const nasdaq = pickMarketItem(marketJson, 'NASDAQ');
  const dow = pickMarketItem(marketJson, 'DOW');
  const usdkrw = marketJson?.forex?.find((f) => f.name === 'USD/KRW')?.rate ?? null;

  const items: TickerItem[] = [
    {
      id: 'antstreet',
      label: 'AntStreet',
      price: antAvg,
      changePercent: antAvg,
      category: 'site',
      decimals: 2,
      suffix: '%',
      accent: true,
    },
    {
      id: 'kospi',
      label: 'KOSPI',
      price: kospi?.price ?? null,
      changePercent: kospi?.changePercent ?? null,
      category: 'kr_index',
      decimals: 2,
    },
    {
      id: 'kosdaq',
      label: 'KOSDAQ',
      price: kosdaq?.price ?? null,
      changePercent: kosdaq?.changePercent ?? null,
      category: 'kr_index',
      decimals: 2,
    },
    {
      id: 'kospi200',
      label: 'KOSPI200',
      price: kospi200?.price ?? null,
      changePercent: kospi200?.changePercent ?? null,
      category: 'kr_index',
      decimals: 2,
    },
    {
      id: 'usdkrw',
      label: 'USD/KRW',
      price: usdkrw?.price ?? null,
      changePercent: null,
      category: 'forex',
      decimals: 2,
      suffix: '원',
    },
    {
      id: 'sp500',
      label: 'S&P 500',
      price: sp500?.price ?? null,
      changePercent: sp500?.changePercent ?? null,
      category: 'us_index',
      decimals: 2,
    },
    {
      id: 'nasdaq',
      label: 'NASDAQ',
      price: nasdaq?.price ?? null,
      changePercent: nasdaq?.changePercent ?? null,
      category: 'us_index',
      decimals: 2,
    },
    {
      id: 'dow',
      label: 'DOW',
      price: dow?.price ?? null,
      changePercent: dow?.changePercent ?? null,
      category: 'us_index',
      decimals: 2,
    },
    {
      id: 'btc',
      label: 'BTC/KRW',
      price: btc?.price ?? null,
      changePercent: btc?.changePercent ?? null,
      category: 'crypto',
      decimals: 0,
      suffix: '원',
    },
  ];

  return { status, items, updatedAt: Date.now() };
}
