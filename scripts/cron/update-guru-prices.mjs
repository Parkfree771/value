// settings.guru_tickers의 ticker를 KIS로 조회 → guru_prices UPSERT.
// (GitHub Actions에서 실행)
//
//   node scripts/cron/update-guru-prices.mjs
//
// 실패가 성공보다 많으면 exit 1.

import { getKISToken, getOverseaStockPrice, makeDb, sleep } from './shared.mjs';

const BATCH_SIZE = 5; // KIS 20 req/s 한도 안에서 안전
const BATCH_DELAY_MS = 100;
const MAX_RETRIES = 2;

const SKIP_TICKERS = new Set(['EXE/WS', 'KRSP/WS', 'ALVOW', 'JBSAY']);
const TICKER_REMAP = { FI: 'FISV' };
const EXCHANGE_REMAP = { FI: 'NAS' };

async function getPriceWithRetry(token, ticker, exchange) {
  let lastError;
  const kisTicker = TICKER_REMAP[ticker] ?? ticker;
  const kisExchange = EXCHANGE_REMAP[ticker] ?? exchange;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await getOverseaStockPrice(token, kisTicker, kisExchange);
    } catch (err) {
      lastError = err;
      if (i < MAX_RETRIES) await sleep(500);
    }
  }
  throw lastError;
}

const startTime = Date.now();
console.log('[GURU-CRON] ===== update-guru-prices =====');

const sql = makeDb();
const [settingRow] = await sql`select value from settings where key = 'guru_tickers'`;
const tickers = settingRow?.value ?? [];
if (!Array.isArray(tickers) || tickers.length === 0) {
  console.error('[GURU-CRON] no guru_tickers in settings');
  process.exit(1);
}
console.log(`[GURU-CRON] tickers: ${tickers.length}`);

const token = await getKISToken(sql);

const rows = [];
let success = 0;
let fail = 0;
const failedTickers = [];

const fetchable = tickers.filter((t) => !SKIP_TICKERS.has(t.ticker));
const skipped = tickers.length - fetchable.length;

// 배치 병렬 — 310 ticker × 100ms serial = 31s → batch5 × 100ms = ~6s
for (let i = 0; i < fetchable.length; i += BATCH_SIZE) {
  const batch = fetchable.slice(i, i + BATCH_SIZE);
  const results = await Promise.allSettled(
    batch.map(async ({ ticker, exchange, filingPrice }) => {
      const currentPrice = await getPriceWithRetry(token, ticker, exchange);
      const returnRate =
        filingPrice > 0 ? Math.round(((currentPrice - filingPrice) / filingPrice) * 10000) / 100 : 0;
      return { ticker, currentPrice, returnRate };
    }),
  );
  results.forEach((r, j) => {
    if (r.status === 'fulfilled') {
      rows.push(r.value);
      success++;
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : 'Unknown';
      console.error(`[GURU-CRON] ✗ ${batch[j].ticker}: ${msg}`);
      failedTickers.push(batch[j].ticker);
      fail++;
    }
  });
  if (i + BATCH_SIZE < fetchable.length) await sleep(BATCH_DELAY_MS);
}

console.log(`[GURU-CRON] fetched: ${success} ok, ${fail} fail, ${skipped} skip`);

if (rows.length > 0) {
  await sql`
    insert into guru_prices (ticker, current_price, return_rate)
    select t, p, r from unnest(
      ${rows.map((x) => x.ticker)}::text[],
      ${rows.map((x) => x.currentPrice)}::numeric[],
      ${rows.map((x) => x.returnRate)}::numeric[]
    ) as x(t, p, r)
    on conflict (ticker) do update set current_price = excluded.current_price, return_rate = excluded.return_rate`;
  console.log(`[GURU-CRON] guru_prices: ${rows.length} 행 UPSERT`);
}

console.log(
  '[GURU-CRON] result',
  JSON.stringify({
    tickers_total: tickers.length,
    success,
    fail,
    skipped,
    upserted: rows.length,
    duration_seconds: Number(((Date.now() - startTime) / 1000).toFixed(1)),
    failed_tickers: failedTickers.slice(0, 20),
  }),
);
process.exit(fail > success ? 1 : 0);
