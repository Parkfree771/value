/**
 * 종목별 일별 종가 히스토리 (Neon Postgres)
 *
 * 저장소: public.price_history 테이블 (PK ticker+date)
 *
 * - readHistory / writeHistory: Postgres SELECT / UPSERT
 * - fetchDailyRange: KIS 일봉 범위 조회 (외부 API)
 * - upsertDailyClose: 한 줄 UPSERT
 */

import { sql } from './db';
import { getKISTokenWithCache } from './kisTokenManager';
import type { PriceHistoryFile, PriceHistoryPoint } from '@/types/priceHistory';

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const KIS_MAX_DAYS_PER_CALL = 100;
const KOREAN_EXCHANGES = ['KRX'];

// ---------- DB I/O ----------

export async function readHistory(ticker: string): Promise<PriceHistoryFile | null> {
  const t = ticker.toUpperCase();
  let data: Record<string, any>[];
  try {
    data = await sql`
      select ticker, exchange, date, close from price_history
      where ticker = ${t}
      order by date asc
    `;
  } catch (error) {
    console.error('[priceHistory.read] error:', error);
    return null;
  }
  if (data.length === 0) return null;

  return {
    ticker: t,
    exchange: data[0].exchange,
    lastUpdated: new Date().toISOString(),
    history: data.map((r) => ({ d: r.date as string, c: Number(r.close) })),
  };
}

export async function writeHistory(file: PriceHistoryFile): Promise<void> {
  const rows = file.history.map((p) => ({
    ticker: file.ticker.toUpperCase(),
    exchange: file.exchange.toUpperCase(),
    date: p.d,
    close: p.c,
  }));
  if (rows.length === 0) return;

  // 청크 단위 UPSERT
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    try {
      await sql`
        insert into price_history (ticker, exchange, date, close)
        select * from unnest(
          ${chunk.map((r) => r.ticker)}::text[],
          ${chunk.map((r) => r.exchange)}::text[],
          ${chunk.map((r) => r.date)}::date[],
          ${chunk.map((r) => r.close)}::numeric[]
        )
        on conflict (ticker, date) do update
          set exchange = excluded.exchange, close = excluded.close
      `;
    } catch (error) {
      console.error('[priceHistory.write] upsert error:', error);
      throw error;
    }
  }
}

// ---------- Date utilities ----------

function fmtYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function fmtYYYY_MM_DD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYYYYMMDD(s: string): Date {
  const compact = s.replace(/-/g, '');
  const y = parseInt(compact.slice(0, 4), 10);
  const m = parseInt(compact.slice(4, 6), 10) - 1;
  const day = parseInt(compact.slice(6, 8), 10);
  return new Date(y, m, day);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function dedupeAndSort(points: PriceHistoryPoint[]): PriceHistoryPoint[] {
  const map = new Map<string, number>();
  for (const p of points) map.set(p.d, p.c);
  return Array.from(map.entries())
    .map(([d, c]) => ({ d, c }))
    .sort((a, b) => a.d.localeCompare(b.d));
}

// ---------- KIS fetch (외부 API) ----------

async function fetchKoreanRange(
  stockCode: string,
  fromYYYYMMDD: string,
  toYYYYMMDD: string,
): Promise<PriceHistoryPoint[]> {
  const token = await getKISTokenWithCache();
  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J',
    fid_input_iscd: stockCode,
    fid_input_date_1: fromYYYYMMDD,
    fid_input_date_2: toYYYYMMDD,
    fid_period_div_code: 'D',
    fid_org_adj_prc: '0',
  });
  const url = `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
      tr_id: 'FHKST03010100',
    },
  });
  if (!res.ok) throw new Error(`KIS 국내 일봉 실패 ${stockCode}: ${res.status}`);
  const data = await res.json();
  if (!data.output2 || !Array.isArray(data.output2)) return [];
  const points: PriceHistoryPoint[] = [];
  for (const row of data.output2) {
    const dateStr: string | undefined = row.stck_bsop_date;
    const closeStr: string | undefined = row.stck_clpr;
    if (!dateStr || !closeStr) continue;
    const close = parseFloat(closeStr);
    if (!isFinite(close) || close <= 0) continue;
    points.push({ d: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`, c: close });
  }
  return points;
}

async function fetchOverseaSlice(
  symbol: string,
  exchange: string,
  endYYYYMMDD: string,
): Promise<PriceHistoryPoint[]> {
  const token = await getKISTokenWithCache();
  const params = new URLSearchParams({
    AUTH: '',
    EXCD: exchange,
    SYMB: symbol,
    GUBN: '0',
    BYMD: endYYYYMMDD,
    MODP: '1',
  });
  const url = `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/dailyprice?${params}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
      tr_id: 'HHDFS76240000',
    },
  });
  if (!res.ok) throw new Error(`KIS 해외 일봉 실패 ${symbol}: ${res.status}`);
  const data = await res.json();
  if (!data.output2 || !Array.isArray(data.output2)) return [];
  const points: PriceHistoryPoint[] = [];
  for (const row of data.output2) {
    const dateStr: string | undefined = row.xymd;
    const closeStr: string | undefined = row.clos;
    if (!dateStr || !closeStr) continue;
    const close = parseFloat(closeStr);
    if (!isFinite(close) || close <= 0) continue;
    points.push({ d: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`, c: close });
  }
  return points;
}


export async function fetchDailyRange(
  ticker: string,
  exchange: string,
  fromDate: Date,
  toDate: Date,
): Promise<PriceHistoryPoint[]> {
  const exchUpper = exchange.toUpperCase();

  if (KOREAN_EXCHANGES.includes(exchUpper)) {
    const points: PriceHistoryPoint[] = [];
    let chunkStart = new Date(fromDate);
    while (chunkStart <= toDate) {
      const chunkEnd = new Date(
        Math.min(
          addDays(chunkStart, KIS_MAX_DAYS_PER_CALL - 1).getTime(),
          toDate.getTime(),
        ),
      );
      const chunk = await fetchKoreanRange(
        ticker,
        fmtYYYYMMDD(chunkStart),
        fmtYYYYMMDD(chunkEnd),
      );
      points.push(...chunk);
      chunkStart = addDays(chunkEnd, 1);
      await new Promise((r) => setTimeout(r, 200));
    }
    return dedupeAndSort(points).filter(
      (p) => p.d >= fmtYYYY_MM_DD(fromDate) && p.d <= fmtYYYY_MM_DD(toDate),
    );
  }

  const points: PriceHistoryPoint[] = [];
  let cursorEnd = new Date(toDate);
  while (cursorEnd >= fromDate) {
    const slice = await fetchOverseaSlice(ticker, exchUpper, fmtYYYYMMDD(cursorEnd));
    if (slice.length === 0) break;
    points.push(...slice);
    const sorted = slice.slice().sort((a, b) => a.d.localeCompare(b.d));
    const oldestSeen = parseYYYYMMDD(sorted[0].d);
    if (oldestSeen <= fromDate) break;
    cursorEnd = addDays(oldestSeen, -1);
    await new Promise((r) => setTimeout(r, 200));
  }
  return dedupeAndSort(points).filter(
    (p) => p.d >= fmtYYYY_MM_DD(fromDate) && p.d <= fmtYYYY_MM_DD(toDate),
  );
}

// ---------- 단일 행 UPSERT ----------

export async function upsertDailyClose(
  ticker: string,
  exchange: string,
  date: string,
  close: number,
): Promise<PriceHistoryFile> {
  const t = ticker.toUpperCase();
  const ex = exchange.toUpperCase();

  try {
    await sql`
      insert into price_history (ticker, exchange, date, close)
      values (${t}, ${ex}, ${date}, ${close})
      on conflict (ticker, date) do update
        set exchange = excluded.exchange, close = excluded.close
    `;
  } catch (error) {
    console.error('[priceHistory.upsertDailyClose] error:', error);
    throw error;
  }

  // 호환 위해 PriceHistoryFile 반환 (전체 시계열)
  const file = await readHistory(t);
  return file ?? {
    ticker: t,
    exchange: ex,
    lastUpdated: new Date().toISOString(),
    history: [{ d: date, c: close }],
  };
}

// ---------- Backfill 한 종목 ----------

export async function backfillTicker(
  ticker: string,
  exchange: string,
  fromDate: Date,
): Promise<PriceHistoryFile> {
  const today = new Date();
  const points = await fetchDailyRange(ticker, exchange, fromDate, today);

  const file: PriceHistoryFile = {
    ticker: ticker.toUpperCase(),
    exchange: exchange.toUpperCase(),
    lastUpdated: new Date().toISOString(),
    history: dedupeAndSort(points),
  };
  await writeHistory(file);
  return file;
}
