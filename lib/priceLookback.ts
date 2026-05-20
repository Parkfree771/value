/**
 * 종목별 1일/7일/30일 전 종가를 한 번에 조회.
 * 휴장일이면 cutoff 이하 가장 최근 거래일 종가로 대체.
 * price_history(ticker, exchange, date, close) 기반.
 */

import { getServiceClient } from './supabase-admin';

export interface LookbackPrice {
  close1d: number | null;
  close7d: number | null;
  close30d: number | null;
}

let cached: Record<string, LookbackPrice> | null = null;
let cachedAt = 0;
const TTL = 60 * 60 * 1000;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Lookback 가격 조회.
 *
 * @param tickers 조회할 ticker 목록(대소문자 무관). 비우면 전체 조회 + 1h 글로벌 캐시.
 *                목록을 주면 .in('ticker',...) 으로 필터 → SSR TTFB 단축.
 *                필터드 조회는 글로벌 캐시를 쓰지 않음 (캐시키가 ticker 집합마다 달라지므로).
 */
export async function getLookbackPrices(
  tickers?: string[],
): Promise<Record<string, LookbackPrice>> {
  const filtered = tickers && tickers.length > 0;
  const now = Date.now();

  // 글로벌 캐시는 "전체" 호출만 사용
  if (!filtered && cached && now - cachedAt < TTL) return cached;

  try {
    const supabase = getServiceClient();
    const today = new Date();
    const cutoff1d = new Date(today); cutoff1d.setUTCDate(cutoff1d.getUTCDate() - 1);
    const cutoff7d = new Date(today); cutoff7d.setUTCDate(cutoff7d.getUTCDate() - 7);
    const cutoff30d = new Date(today); cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
    // 60일치만 가져옴 — 30일 cutoff 이전 거래일 fallback 여유분 포함
    const fromDate = new Date(today); fromDate.setUTCDate(fromDate.getUTCDate() - 60);

    let query = supabase
      .from('price_history')
      .select('ticker, date, close')
      .gte('date', ymd(fromDate));

    if (filtered) {
      // Supabase 측에서 정규화된 ticker 비교를 위해 대문자 통일
      const uniq = Array.from(new Set(tickers!.map((t) => t.toUpperCase()).filter(Boolean)));
      query = query.in('ticker', uniq);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error || !data) {
      console.error('[priceLookback] error:', error);
      return cached || {};
    }

    // ticker 별 series (date desc 정렬 유지)
    const series = new Map<string, { date: string; close: number }[]>();
    for (const row of data) {
      const t = String(row.ticker).toUpperCase();
      if (!series.has(t)) series.set(t, []);
      series.get(t)!.push({ date: row.date as string, close: Number(row.close) });
    }

    const c1d = ymd(cutoff1d);
    const c7d = ymd(cutoff7d);
    const c30d = ymd(cutoff30d);

    const map: Record<string, LookbackPrice> = {};
    for (const [t, rows] of series.entries()) {
      const find = (cutoff: string): number | null => {
        const hit = rows.find((r) => r.date <= cutoff);
        return hit ? hit.close : null;
      };
      map[t] = {
        close1d: find(c1d),
        close7d: find(c7d),
        close30d: find(c30d),
      };
    }

    // 글로벌 캐시 갱신은 "전체" 호출만 (필터드 조회 결과를 캐시에 박으면 다음 전체 요청이 결손됨)
    if (!filtered) {
      cached = map;
      cachedAt = now;
    }
    return map;
  } catch (err) {
    console.error('[priceLookback] exception:', err);
    return cached || {};
  }
}

/**
 * 종목의 N일 변동률 (게시 시점 무관).
 * "지난 N일 동안 이 종목이 얼마나 움직였나"를 매수/매도 방향에 맞춰 부호 처리.
 * lookbackClose 또는 currentPrice가 없으면 null (정렬 제외).
 */
export function calcPeriodReturn(
  currentPrice: number,
  lookbackClose: number | null | undefined,
  positionType: 'long' | 'short' = 'long',
): number | null {
  if (!currentPrice || !lookbackClose) return null;
  const dir = positionType === 'short' ? -1 : 1;
  const raw = ((currentPrice - lookbackClose) / lookbackClose) * 100 * dir;
  return Math.round(raw * 100) / 100;
}
