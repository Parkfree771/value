/**
 * GitHub Actions 크론: 구루 포트폴리오 가격 — Supabase 버전
 *
 * 미국 장 마감 후(06:30 KST = 21:30 UTC) 평일 1회 실행.
 * 1. data/guru-portfolios.json에서 ticker + 공시일가 읽기 (로컬 repo 파일)
 * 2. KIS API로 현재가 일괄 조회
 * 3. 수익률 계산 후 guru_prices 테이블에 UPSERT
 *
 * KIS 토큰 캐시: settings 테이블의 key='kis_token'
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface TickerInfo {
  ticker: string;
  exchange: string;
  filingPrice: number;
}

interface PortfoliosJson {
  meta: { updated_at: string; total_unique_tickers: number };
  tickers: TickerInfo[];
}

// ===== Supabase =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseSecret) {
  console.error('[GURU-CRON] SUPABASE 환경변수 누락');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ===== KIS =====
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_MS = 100;
const MAX_RETRIES = 2;

const SKIP_TICKERS = new Set(['EXE/WS', 'KRSP/WS', 'ALVOW', 'JBSAY']);
const TICKER_REMAP: Record<string, string> = { FI: 'FISV' };
const EXCHANGE_REMAP: Record<string, string> = { FI: 'NAS' };

function toKISTicker(ticker: string): string {
  if (TICKER_REMAP[ticker]) return TICKER_REMAP[ticker];
  // 클래스 주식: LEN-B, BF-A, BF-B, BRK-B, HEI-A 등은 KIS에서 "/" 표기 사용
  return ticker.replace(/-/g, '/');
}
function toKISExchange(ticker: string, exchange: string): string {
  return EXCHANGE_REMAP[ticker] || exchange;
}

async function getKISToken(): Promise<string> {
  const { data: cached } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'kis_token')
    .maybeSingle();

  if (cached?.value) {
    const v = cached.value as { token?: string; expiresAt?: string };
    if (v.token && v.expiresAt) {
      const expiresAt = new Date(v.expiresAt).getTime();
      if (expiresAt > Date.now() + 5 * 60 * 1000) return v.token;
    }
  }

  const res = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json();
  const token = data.access_token as string;
  const expiresIn = (data.expires_in as number) || 86400;
  const expiresAtIso = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();

  await supabase
    .from('settings')
    .upsert({ key: 'kis_token', value: { token, expiresAt: expiresAtIso } }, { onConflict: 'key' });
  return token;
}

async function getStockPrice(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  const kisTicker = toKISTicker(ticker);
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${kisTicker}`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: 'HHDFS00000300',
      },
    },
  );
  if (!res.ok) throw new Error(`KIS API ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS error: ${data.msg1}`);
  const price = parseFloat(data.output.last);
  if (!isFinite(price) || price <= 0) throw new Error(`Invalid price: ${data.output.last}`);
  return price;
}

async function getStockPriceWithRetry(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  let lastError: unknown;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await getStockPrice(token, ticker, exchange);
    } catch (err) {
      lastError = err;
      if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

async function main() {
  const startTime = Date.now();
  console.log('[GURU-CRON] ===== Starting (Postgres) =====');

  const portfoliosPath = path.join(process.cwd(), 'data', 'guru-portfolios.json');
  if (!fs.existsSync(portfoliosPath)) {
    console.error(`[GURU-CRON] 파일 없음: ${portfoliosPath}`);
    process.exit(1);
  }

  const portfoliosData: PortfoliosJson = JSON.parse(
    fs.readFileSync(portfoliosPath, 'utf-8'),
  );
  console.log(`[GURU-CRON] tickers: ${portfoliosData.tickers.length}`);

  const token = await getKISToken();

  const rows: { ticker: string; current_price: number; return_rate: number }[] = [];
  let success = 0;
  let fail = 0;
  let skipped = 0;
  const failedTickers: string[] = [];

  const fetchable = portfoliosData.tickers.filter((t) => {
    if (SKIP_TICKERS.has(t.ticker)) {
      console.log(`  ⊘ ${t.ticker}: skip`);
      skipped++;
      return false;
    }
    return true;
  });

  for (const { ticker, exchange, filingPrice } of fetchable) {
    try {
      const kisExchange = toKISExchange(ticker, exchange);
      const currentPrice = await getStockPriceWithRetry(token, ticker, kisExchange);
      const returnRate =
        filingPrice > 0
          ? Math.round(((currentPrice - filingPrice) / filingPrice) * 10000) / 100
          : 0;
      rows.push({ ticker, current_price: currentPrice, return_rate: returnRate });
      console.log(`  ✓ ${ticker}: $${currentPrice} (${returnRate >= 0 ? '+' : ''}${returnRate}%)`);
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      console.error(`  ✗ ${ticker}: ${msg}`);
      failedTickers.push(ticker);
      fail++;
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[GURU-CRON] fetched: ${success} ok, ${fail} fail, ${skipped} skip`);

  // guru_prices UPSERT
  if (rows.length > 0) {
    const { error } = await supabase
      .from('guru_prices')
      .upsert(rows, { onConflict: 'ticker' });
    if (error) {
      console.error('[GURU-CRON] upsert 실패:', error);
      process.exit(1);
    }
    console.log(`[GURU-CRON] guru_prices: ${rows.length} 행 UPSERT`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[GURU-CRON] ===== Done in ${duration}s =====`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[GURU-CRON] Critical error:', err);
  process.exit(1);
});
