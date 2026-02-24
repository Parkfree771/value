/**
 * 공시일 가격 업데이트 스크립트
 *
 * localhost:3000의 /api/kis/historical 엔드포인트를 사용하여
 * 각 구루의 SEC 13F 공시일(filing_date_curr) 종가를 가져와
 * guru-portfolios.json의 각 보유 종목에 price_at_filing을 추가합니다.
 *
 * 사용법: npx tsx scripts/update-filing-prices.ts
 * (Next.js 개발 서버가 localhost:3000에서 실행 중이어야 합니다)
 */

import * as fs from 'fs';
import * as path from 'path';

const PORTFOLIOS_PATH = path.join(__dirname, '..', 'data', 'guru-portfolios.json');
const API_BASE = 'http://localhost:3000';
const DELAY_MS = 150; // KIS API rate limit 여유

// KIS API에서 조회 불가능한 티커
const SKIP_TICKERS = new Set(['EXE/WS', 'KRSP/WS', 'ALVOW', 'JBSAY']);

// SEC 티커 → KIS API 티커 변환
const TICKER_REMAP: Record<string, string> = {
  'FI': 'FISV',
};

// SEC 거래소 → KIS API 거래소 변환
const EXCHANGE_REMAP: Record<string, string> = {
  'FI': 'NAS',
};

function toKISTicker(ticker: string): string {
  if (TICKER_REMAP[ticker]) return TICKER_REMAP[ticker];
  return ticker.replace(/-/g, '/');
}

function toKISExchange(ticker: string, exchange: string): string {
  return EXCHANGE_REMAP[ticker] || exchange;
}

interface Holding {
  cusip: string;
  ticker: string | null;
  exchange: string;
  status: string;
  shares_curr: number;
  value_curr: number;
  price_at_filing?: number | null;
  [key: string]: any;
}

interface GuruDoc {
  guru_name_en: string;
  guru_name_kr: string;
  filing_date_curr: string;
  holdings: Holding[];
  [key: string]: any;
}

interface PortfoliosJson {
  meta: { updated_at: string; total_unique_tickers: number };
  gurus: Record<string, GuruDoc>;
  tickers: Array<{ ticker: string; exchange: string; filingPrice: number }>;
}

async function fetchHistoricalPrice(
  ticker: string,
  exchange: string,
  date: string
): Promise<number | null> {
  try {
    const kisTicker = toKISTicker(ticker);
    const kisExchange = toKISExchange(ticker, exchange);
    const url = `${API_BASE}/api/kis/historical?code=${encodeURIComponent(kisTicker)}&date=${date}&exchange=${kisExchange}`;

    const res = await fetch(url);
    const json = await res.json();

    if (json.success && json.data?.close > 0) {
      return json.data.close;
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('[Filing Prices] ===== 공시일 가격 업데이트 시작 =====\n');

  // 1. guru-portfolios.json 읽기
  if (!fs.existsSync(PORTFOLIOS_PATH)) {
    console.error('[ERROR] guru-portfolios.json not found');
    process.exit(1);
  }

  const data: PortfoliosJson = JSON.parse(fs.readFileSync(PORTFOLIOS_PATH, 'utf-8'));

  // 2. 구루별 공시일 확인
  console.log('[Filing dates]');
  for (const [slug, guru] of Object.entries(data.gurus)) {
    console.log(`  ${guru.guru_name_kr}: ${guru.filing_date_curr}`);
  }

  // 3. 고유한 (ticker, exchange, date) 조합 수집
  const priceRequests = new Map<string, { ticker: string; exchange: string; date: string }>();

  for (const [, guru] of Object.entries(data.gurus)) {
    const filingDate = guru.filing_date_curr;

    for (const h of guru.holdings) {
      if (!h.ticker || h.status === 'SOLD OUT' || h.shares_curr <= 0) continue;
      if (SKIP_TICKERS.has(h.ticker)) continue;

      const key = `${h.ticker}:${h.exchange || 'NAS'}:${filingDate}`;
      if (!priceRequests.has(key)) {
        priceRequests.set(key, {
          ticker: h.ticker,
          exchange: h.exchange || 'NAS',
          date: filingDate,
        });
      }
    }
  }

  console.log(`\n[Requests] ${priceRequests.size}개 고유 (티커, 거래소, 날짜) 조합\n`);

  // 4. 가격 조회
  const priceMap = new Map<string, number>();
  let success = 0;
  let fail = 0;
  const failedTickers: string[] = [];

  for (const [key, { ticker, exchange, date }] of priceRequests) {
    const price = await fetchHistoricalPrice(ticker, exchange, date);

    if (price !== null) {
      priceMap.set(key, price);
      console.log(`  ✓ ${ticker.padEnd(8)} (${exchange}) @ ${date}: $${price}`);
      success++;
    } else {
      // 재시도 1회
      await new Promise(r => setTimeout(r, 500));
      const retryPrice = await fetchHistoricalPrice(ticker, exchange, date);

      if (retryPrice !== null) {
        priceMap.set(key, retryPrice);
        console.log(`  ✓ ${ticker.padEnd(8)} (${exchange}) @ ${date}: $${retryPrice} (재시도 성공)`);
        success++;
      } else {
        console.log(`  ✗ ${ticker.padEnd(8)} (${exchange}) @ ${date}: 조회 실패`);
        failedTickers.push(ticker);
        fail++;
      }
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[결과] 성공: ${success}, 실패: ${fail}`);
  if (failedTickers.length > 0) {
    console.log(`[실패 티커] ${failedTickers.join(', ')}`);
  }

  // 5. 각 구루의 holdings에 price_at_filing 추가
  let updated = 0;
  for (const [slug, guru] of Object.entries(data.gurus)) {
    const filingDate = guru.filing_date_curr;

    for (const h of guru.holdings) {
      if (!h.ticker || h.status === 'SOLD OUT' || h.shares_curr <= 0) continue;
      if (SKIP_TICKERS.has(h.ticker)) continue;

      const key = `${h.ticker}:${h.exchange || 'NAS'}:${filingDate}`;
      const price = priceMap.get(key);

      if (price) {
        h.price_at_filing = price;
        updated++;
      }
    }
  }

  console.log(`\n[Holdings 업데이트] ${updated}개 종목에 price_at_filing 추가`);

  // 6. tickers 배열도 업데이트 (각 티커의 최신 공시일 가격 사용)
  for (const tickerInfo of data.tickers) {
    // 이 티커를 보유한 구루 중 가장 최근 공시일 가격 찾기
    let latestDate = '';
    let latestPrice: number | null = null;

    for (const [, guru] of Object.entries(data.gurus)) {
      const filingDate = guru.filing_date_curr;
      const key = `${tickerInfo.ticker}:${tickerInfo.exchange}:${filingDate}`;
      const price = priceMap.get(key);

      if (price && filingDate > latestDate) {
        latestDate = filingDate;
        latestPrice = price;
      }
    }

    if (latestPrice !== null) {
      tickerInfo.filingPrice = latestPrice;
    }
  }

  // 7. 저장
  data.meta.updated_at = new Date().toISOString().split('T')[0];
  fs.writeFileSync(PORTFOLIOS_PATH, JSON.stringify(data, null, 2));

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[Filing Prices] ===== 완료 (${duration}s) =====`);
  console.log(`  → guru-portfolios.json 저장됨`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
