/**
 * 종목별 1일/7일/30일 전 종가를 한 번에 조회.
 * 휴장일이면 cutoff 이하 가장 최근 거래일 종가로 대체.
 * price_history(ticker, exchange, date, close) 기반.
 */

import { sql } from './db';

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

/** 1일/7일/30일 비교 기준일 (UTC 달력 기준, 휴장일이면 그 이전 마지막 거래일 종가를 씀) */
function periodCutoffs(now = new Date()) {
  const back = (days: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - days);
    return ymd(d);
  };
  return { c1d: back(1), c7d: back(7), c30d: back(30) };
}

/**
 * Lookback 가격 조회.
 *
 * @param tickers 조회할 ticker 목록(대소문자 무관). 비우면 전체 조회 + 1h 글로벌 캐시.
 *                목록을 주면 ticker = any(...) 로 필터 → SSR TTFB 단축.
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
    const today = new Date();
    // 60일치만 가져옴 — 30일 cutoff 이전 거래일 fallback 여유분 포함
    const fromDate = new Date(today); fromDate.setUTCDate(fromDate.getUTCDate() - 60);

    let data: Record<string, any>[];
    try {
      if (filtered) {
        // DB 측에서 정규화된 ticker 비교를 위해 대문자 통일
        const uniq = Array.from(new Set(tickers!.map((t) => t.toUpperCase()).filter(Boolean)));
        data = await sql`
          select ticker, date, close from price_history
          where date >= ${ymd(fromDate)} and ticker = any(${uniq}::text[])
          order by date desc
        `;
      } else {
        data = await sql`
          select ticker, date, close from price_history
          where date >= ${ymd(fromDate)}
          order by date desc
        `;
      }
    } catch (error) {
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

    const { c1d, c7d, c30d } = periodCutoffs(today);

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

export interface ReportPeriodReturns {
  returnRate1D: number | null;
  returnRate1W: number | null;
  returnRate1M: number | null;
}

/**
 * 리포트의 최근 1일/7일/30일 수익률.
 * 기준가 = N일 전 종가. 단, 리포트가 그보다 최근에 작성됐으면 작성가(initialPrice) —
 * 작성 전에 오른 주가는 그 리포트의 성과가 아니므로. (예: 3일 전 글의 "7일" = 작성 후 3일 수익률)
 */
export function calcReportPeriodReturns(
  report: { currentPrice: number; initialPrice: number; createdAt: string; positionType?: 'long' | 'short' },
  lookback: LookbackPrice | undefined,
): ReportPeriodReturns {
  const { c1d, c7d, c30d } = periodCutoffs();
  const written = (report.createdAt || '').slice(0, 10);
  const base = (cutoff: string, close: number | null | undefined) =>
    written && written > cutoff ? report.initialPrice : close;
  const pos = report.positionType ?? 'long';
  return {
    returnRate1D: calcPeriodReturn(report.currentPrice, base(c1d, lookback?.close1d), pos),
    returnRate1W: calcPeriodReturn(report.currentPrice, base(c7d, lookback?.close7d), pos),
    returnRate1M: calcPeriodReturn(report.currentPrice, base(c30d, lookback?.close30d), pos),
  };
}
