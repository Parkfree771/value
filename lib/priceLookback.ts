/**
 * 종목별 1일/7일/30일 전 종가를 한 번에 조회.
 * 휴장일이면 cutoff 이하 가장 최근 거래일 종가로 대체.
 * price_history(ticker, exchange, date, close) 기반.
 */

import { unstable_cache } from 'next/cache';
import { sql } from './db';
import { SAFETY_TTL, TAG } from './cache';

export interface LookbackPrice {
  close1d: number | null;
  close7d: number | null;
  close30d: number | null;
}

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
 * 종목마다 기준일 3개(1일·7일·30일 전)의 "그날 이하 마지막 종가" 만 읽는다.
 * (예전엔 60일치 전 행을 가져와 서버에서 골랐다 — 종목 80개면 200KB+, 지금은 종목당 1행)
 * 휴장일이면 그 이전 마지막 거래일 종가. 30일 cutoff 에서 30일 넘게 거슬러 가지는 않는다.
 */
const readLookback = unstable_cache(
  async (tickers: string[], c1d: string, c7d: string, c30d: string): Promise<Record<string, LookbackPrice>> => {
    const rows = await sql`
      select t.ticker,
        (select close from price_history h where h.ticker = t.ticker and h.date <= ${c1d}::date
           and h.date > ${c1d}::date - 30 order by h.date desc limit 1) as close1d,
        (select close from price_history h where h.ticker = t.ticker and h.date <= ${c7d}::date
           and h.date > ${c7d}::date - 30 order by h.date desc limit 1) as close7d,
        (select close from price_history h where h.ticker = t.ticker and h.date <= ${c30d}::date
           and h.date > ${c30d}::date - 30 order by h.date desc limit 1) as close30d
      from unnest(${tickers}::text[]) as t(ticker)`;
    const map: Record<string, LookbackPrice> = {};
    for (const r of rows) {
      if (r.close1d == null && r.close7d == null && r.close30d == null) continue;
      map[String(r.ticker).toUpperCase()] = {
        close1d: r.close1d == null ? null : Number(r.close1d),
        close7d: r.close7d == null ? null : Number(r.close7d),
        close30d: r.close30d == null ? null : Number(r.close30d),
      };
    }
    return map;
  },
  ['lookback-prices'],
  { tags: [TAG.prices], revalidate: SAFETY_TTL },
);

/**
 * Lookback 가격 조회 — 1일/7일/30일 전 종가.
 * @param tickers 조회할 ticker 목록(대소문자 무관). 비우면 price_history 의 전 종목.
 * 캐시: 인스턴스 공유 데이터 캐시 · 태그 prices (장 마감 수집 완료 시 비움). 기준일이 키에 들어가 날짜가 바뀌면 새로 읽는다.
 */
export async function getLookbackPrices(tickers?: string[]): Promise<Record<string, LookbackPrice>> {
  try {
    let list = Array.from(new Set((tickers ?? []).map((t) => t.toUpperCase()).filter(Boolean))).sort();
    if (list.length === 0) {
      list = (await sql`select distinct ticker from price_history`).map((r) => String(r.ticker).toUpperCase()).sort();
    }
    if (list.length === 0) return {};
    const { c1d, c7d, c30d } = periodCutoffs();
    return await readLookback(list, c1d, c7d, c30d);
  } catch (err) {
    console.error('[priceLookback] error:', err);
    return {};
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
