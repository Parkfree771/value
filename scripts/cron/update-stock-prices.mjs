// posts 테이블의 ticker × exchange 조합을 KIS/Upbit으로 조회 → current_prices/price_history/posts 갱신 → revalidate.
// (GitHub Actions에서 실행)
//
//   node scripts/cron/update-stock-prices.mjs --market=ASIA|US|CRYPTO|ALL [--finalize]
//
// --finalize: 장 마감 cron 전용. 이때만 price_history에 종가 UPSERT → 차트는 종가 1행/일 보장.
// 실패 ticker가 성공보다 많으면 exit 1 (Actions에서 실패로 표시).

import { getKISToken, getStockPrice, makeDb, revalidateSite, sleep } from './shared.mjs';

const ASIA_EXCHANGES = ['KRX', 'TSE', 'SHS', 'SZS', 'HKS'];
const US_EXCHANGES = ['NAS', 'NYS', 'AMS'];
const DELAY_BETWEEN_REQUESTS = 250;

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const marketType = (arg('market') ?? 'ALL').toUpperCase();
const finalize = process.argv.includes('--finalize');

function shouldProcessExchange(exchange) {
  if (marketType === 'CRYPTO') return exchange === 'CRYPTO';
  if (exchange === 'CRYPTO') return true;
  if (marketType === 'ALL') return true;
  if (marketType === 'ASIA') return ASIA_EXCHANGES.includes(exchange);
  if (marketType === 'US') return US_EXCHANGES.includes(exchange);
  return true;
}

const startTime = Date.now();
console.log(`[CRON] ===== update-stock-prices (MARKET: ${marketType}, finalize: ${finalize}) =====`);

const sql = makeDb();
const posts = await sql`select id, ticker, exchange, initial_price from posts`;
if (posts.length === 0) {
  console.log('[CRON] no_posts');
  process.exit(0);
}

const uniqueTickers = new Map();
for (const p of posts) {
  const t = (p.ticker ?? '').toString().toUpperCase().trim();
  const e = (p.exchange ?? '').toString().toUpperCase().trim();
  if (!t || !e) continue;
  if (!shouldProcessExchange(e)) continue;
  const key = `${t}:${e}`;
  if (!uniqueTickers.has(key)) uniqueTickers.set(key, { ticker: t, exchange: e });
}

if (uniqueTickers.size === 0) {
  console.log(`[CRON] no_tickers_for_market (posts: ${posts.length})`);
  process.exit(0);
}
console.log(`[CRON] tickers to fetch: ${uniqueTickers.size}`);

const token = await getKISToken(sql);

const newPrices = new Map();
let successCount = 0;
let failCount = 0;
const errors = [];

for (const { ticker, exchange } of uniqueTickers.values()) {
  try {
    const price = await getStockPrice(token, ticker, exchange);
    newPrices.set(ticker, { currentPrice: price, exchange });
    console.log(`[CRON] ✓ ${ticker} (${exchange}): ${price}`);
    successCount++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[CRON] ✗ ${ticker}: ${msg}`);
    failCount++;
    errors.push(`${ticker}: ${msg}`);
  }
  await sleep(DELAY_BETWEEN_REQUESTS);
}

const tickers = [...newPrices.keys()];
const exchanges = tickers.map((t) => newPrices.get(t).exchange);
const prices = tickers.map((t) => newPrices.get(t).currentPrice);

if (tickers.length > 0) {
  await sql`
    insert into current_prices (ticker, exchange, current_price, updated_at)
    select t, e, p, now() from unnest(${tickers}::text[], ${exchanges}::text[], ${prices}::numeric[]) as x(t, e, p)
    on conflict (ticker) do update
      set exchange = excluded.exchange, current_price = excluded.current_price, updated_at = now()`;
  console.log(`[CRON] current_prices: ${tickers.length} 행`);

  // price_history는 장 마감 cron(--finalize)에서만 종가 1회 UPSERT.
  if (finalize) {
    const today = new Date().toISOString().split('T')[0];
    await sql`
      insert into price_history (ticker, exchange, date, close)
      select t, e, ${today}::date, p from unnest(${tickers}::text[], ${exchanges}::text[], ${prices}::numeric[]) as x(t, e, p)
      on conflict (ticker, date) do update set exchange = excluded.exchange, close = excluded.close`;
    console.log(`[CRON] price_history (finalize): ${tickers.length} 행`);
  } else {
    console.log('[CRON] price_history skip (장중 cron — finalize 아님)');
  }

  // ticker → 현재가 맵을 한 번에 전달. 같은 ticker의 모든 글이 SQL 안에서
  // 각자의 initial_price로 return_rate를 계산하므로 ticker 수만큼만 처리.
  const priceMap = Object.fromEntries(tickers.map((t, i) => [t, prices[i]]));
  await sql`select update_posts_prices_batch(${JSON.stringify(priceMap)}::jsonb)`;
  const postsUpdated = posts.filter(
    (p) => priceMap[(p.ticker ?? '').toString().toUpperCase()] !== undefined && Number(p.initial_price ?? 0) > 0,
  ).length;
  console.log(`[CRON] posts updated (batched): ${postsUpdated}`);
}

const revalidated = await revalidateSite(['/', '/ranking', '/search']);

console.log(
  '[CRON] result',
  JSON.stringify({
    market: marketType,
    finalize,
    tickers_total: uniqueTickers.size,
    success: successCount,
    fail: failCount,
    revalidated,
    duration_seconds: Number(((Date.now() - startTime) / 1000).toFixed(2)),
    errors: errors.slice(0, 10),
  }),
);
process.exit(failCount > successCount ? 1 : 0);
