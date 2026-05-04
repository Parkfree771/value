/**
 * 종목별 일별 종가 히스토리 관리
 *
 * Storage 경로: prices-history/{TICKER}.json
 *
 * - readHistory / writeHistory: Firebase Storage I/O
 * - fetchDailyRange: KIS / Upbit 일봉 범위 조회 (페이징)
 * - upsertDailyClose: 중복 체크 후 한 줄 추가
 *
 * Firebase Admin SDK는 호출 측에서 미리 초기화되어 있어야 합니다.
 * (API 라우트는 @/lib/firebase-admin을 import하면 자동 초기화,
 *  스크립트는 자체적으로 initializeApp 후 사용)
 */

import { getStorage } from 'firebase-admin/storage';
import { getKISTokenWithCache } from './kisTokenManager';
import type { PriceHistoryFile, PriceHistoryPoint } from '@/types/priceHistory';

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const STORAGE_PATH = (ticker: string) => `prices-history/${ticker.toUpperCase()}.json`;

// 해외/국내 KIS는 단일 호출 최대 100영업일
const KIS_MAX_DAYS_PER_CALL = 100;
// Upbit days candles 최대 200
const UPBIT_MAX_COUNT = 200;

const KOREAN_EXCHANGES = ['KRX'];
const CRYPTO_EXCHANGE = 'CRYPTO';

// ---------- Storage I/O ----------

export async function readHistory(ticker: string): Promise<PriceHistoryFile | null> {
  const file = getStorage().bucket().file(STORAGE_PATH(ticker));
  const [exists] = await file.exists();
  if (!exists) return null;
  const [content] = await file.download();
  try {
    return JSON.parse(content.toString()) as PriceHistoryFile;
  } catch {
    return null;
  }
}

export async function writeHistory(file: PriceHistoryFile): Promise<void> {
  await getStorage()
    .bucket()
    .file(STORAGE_PATH(file.ticker))
    .save(JSON.stringify(file), {
      contentType: 'application/json',
      // CDN: 5분 캐시, 1시간 stale-while-revalidate
      metadata: { cacheControl: 'public, max-age=300, stale-while-revalidate=3600' },
    });
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
  // KIS 응답은 'YYYYMMDD' 또는 'YYYY-MM-DD'
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

// ---------- KIS 국내 일봉 (range) ----------

async function fetchKoreanRange(
  stockCode: string,
  fromYYYYMMDD: string,
  toYYYYMMDD: string
): Promise<PriceHistoryPoint[]> {
  const token = await getKISTokenWithCache();

  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J',
    fid_input_iscd: stockCode,
    fid_input_date_1: fromYYYYMMDD,
    fid_input_date_2: toYYYYMMDD,
    fid_period_div_code: 'D',
    fid_org_adj_prc: '0', // 0: 수정주가 미반영, 1: 수정주가 반영
  });

  // 기간별 시세 전용 엔드포인트 (단일일 inquire-daily-price 와 다름)
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

  if (!res.ok) {
    throw new Error(`KIS 국내 일봉 실패 ${stockCode} ${fromYYYYMMDD}-${toYYYYMMDD}: ${res.status}`);
  }
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

// ---------- KIS 해외 일봉 (range, backward paginated) ----------

async function fetchOverseaSlice(
  symbol: string,
  exchange: string,
  endYYYYMMDD: string
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

  if (!res.ok) {
    throw new Error(`KIS 해외 일봉 실패 ${symbol} BYMD=${endYYYYMMDD}: ${res.status}`);
  }
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

// ---------- Crypto (Upbit days candles) ----------

async function fetchCryptoRange(
  ticker: string,
  fromDate: Date,
  toDate: Date
): Promise<PriceHistoryPoint[]> {
  const market = `KRW-${ticker.toUpperCase()}`;
  const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

  const points: PriceHistoryPoint[] = [];
  let cursor = new Date(toDate);
  let remaining = totalDays;

  while (remaining > 0) {
    const count = Math.min(UPBIT_MAX_COUNT, remaining);
    const toISO = `${fmtYYYY_MM_DD(addDays(cursor, 1))}T00:00:00Z`;
    const url = `https://api.upbit.com/v1/candles/days?market=${market}&count=${count}&to=${toISO}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Upbit 일봉 실패 ${ticker}: ${res.status}`);

    interface UpbitCandle {
      candle_date_time_kst: string;
      trade_price: number;
    }
    const data = (await res.json()) as UpbitCandle[];
    if (!Array.isArray(data) || data.length === 0) break;

    for (const row of data) {
      const dateStr = row.candle_date_time_kst.slice(0, 10);
      points.push({ d: dateStr, c: row.trade_price });
    }

    // 다음 슬라이스: 가장 오래된 것보다 하루 전을 to로
    const oldest = data[data.length - 1];
    cursor = addDays(parseYYYYMMDD(oldest.candle_date_time_kst.slice(0, 10)), -1);
    remaining -= data.length;

    if (cursor < fromDate) break;
    await new Promise((r) => setTimeout(r, 120)); // Upbit rate limit 안전 마진
  }

  // fromDate 이전 컷
  return points.filter((p) => p.d >= fmtYYYY_MM_DD(fromDate));
}

// ---------- Dispatcher: 거래소 자동 판별 ----------

export async function fetchDailyRange(
  ticker: string,
  exchange: string,
  fromDate: Date,
  toDate: Date
): Promise<PriceHistoryPoint[]> {
  const exchUpper = exchange.toUpperCase();

  if (exchUpper === CRYPTO_EXCHANGE) {
    return fetchCryptoRange(ticker, fromDate, toDate);
  }

  if (KOREAN_EXCHANGES.includes(exchUpper)) {
    // 국내: 100일씩 끊어 forward 페이징
    const points: PriceHistoryPoint[] = [];
    let chunkStart = new Date(fromDate);

    while (chunkStart <= toDate) {
      const chunkEnd = new Date(Math.min(addDays(chunkStart, KIS_MAX_DAYS_PER_CALL - 1).getTime(), toDate.getTime()));
      const chunk = await fetchKoreanRange(ticker, fmtYYYYMMDD(chunkStart), fmtYYYYMMDD(chunkEnd));
      points.push(...chunk);
      chunkStart = addDays(chunkEnd, 1);
      await new Promise((r) => setTimeout(r, 200)); // KIS rate limit 안전 마진
    }
    return dedupeAndSort(points).filter((p) => p.d >= fmtYYYY_MM_DD(fromDate) && p.d <= fmtYYYY_MM_DD(toDate));
  }

  // 해외: BYMD 기준 backward 페이징
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
  return dedupeAndSort(points).filter((p) => p.d >= fmtYYYY_MM_DD(fromDate) && p.d <= fmtYYYY_MM_DD(toDate));
}

// ---------- Append 한 줄 ----------

export async function upsertDailyClose(
  ticker: string,
  exchange: string,
  date: string, // YYYY-MM-DD
  close: number
): Promise<PriceHistoryFile> {
  const existing = await readHistory(ticker);
  const next: PriceHistoryFile = existing ?? {
    ticker: ticker.toUpperCase(),
    exchange: exchange.toUpperCase(),
    lastUpdated: new Date().toISOString(),
    history: [],
  };

  const merged = dedupeAndSort([...next.history, { d: date, c: close }]);
  next.history = merged;
  next.lastUpdated = new Date().toISOString();
  next.exchange = exchange.toUpperCase();
  await writeHistory(next);
  return next;
}

// ---------- Backfill 한 종목 ----------

export async function backfillTicker(
  ticker: string,
  exchange: string,
  fromDate: Date
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
