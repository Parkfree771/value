// 장 마감 종가 갱신 — 종목마다 하루 한 번 (GitHub Actions price-cron)
//
//   node scripts/cron/update-stock-prices.mjs --market=ASIA|US|ALL [--max=100] [--chunk=20] [--force]
//
// 장중 갱신은 하지 않는다. 사이트의 현재가·수익률은 "마지막 장 마감 종가" 기준.
//   - 대상: 회원 리포트(posts) + 전문가 추적(broker_reports) 종목. 같은 종목은 한 번만 조회한다.
//   - 아직 장중인 거래소 종목은 건너뛴다 (홍콩은 한국보다 늦게 마감).
//   - 이미 이번 마감 이후 갱신된 종목은 건너뛴다 → 하루에 여러 번 예약해 두면
//     GitHub 예약 실행이 밀리거나 한 번 빠져도 다음 실행이 남은 종목을 이어받는다.
//   - 20종목씩 끊어서 조회 → 묶음마다 바로 DB 저장. 중간에 시간 초과로 끊겨도 저장된 묶음은 남고,
//     다음 실행이 남은 종목부터 이어서 한다. 한 실행은 --max 개까지 (기본 100).
//   - 종가 날짜 = 거래소 현지 기준 마지막 마감 거래일 (shared.mjs lastSessionDate).
// --force: 이미 갱신된 종목도 다시 조회 (수동 실행용)
// 실패 ticker가 성공보다 많으면 exit 1 (Actions에서 실패로 표시).

import {
  getKISToken,
  getStockPrice,
  isMarketOpen,
  lastSessionDate,
  makeDb,
  revalidateScope,
  sessionCloseInstant,
  sleep,
} from './shared.mjs';

const ASIA_EXCHANGES = ['KRX', 'TSE', 'SHS', 'SZS', 'HKS'];
const US_EXCHANGES = ['NAS', 'NYS', 'AMS'];
const DELAY_BETWEEN_REQUESTS = 250;

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const marketType = (arg('market') ?? 'ALL').toUpperCase();
const MAX_PER_RUN = Number(arg('max') ?? 100);
const CHUNK_SIZE = Number(arg('chunk') ?? 20);
const PAUSE_BETWEEN_CHUNKS = 2000;
const FORCE = process.argv.includes('--force');

function shouldProcessExchange(exchange) {
  if (marketType === 'ALL') return true;
  if (marketType === 'ASIA') return ASIA_EXCHANGES.includes(exchange);
  if (marketType === 'US') return US_EXCHANGES.includes(exchange);
  return true;
}

const startTime = Date.now();
const now = new Date();
console.log(`[CRON] ===== update-stock-prices (MARKET: ${marketType}, max: ${MAX_PER_RUN}${FORCE ? ', force' : ''}) =====`);

const sql = makeDb();
const posts = await sql`select ticker, exchange from posts`;
// 전문가 추적(증권사 리포트) 종목도 같은 목록에 — 테이블이 아직 없으면(마이그레이션 전) 건너뜀
const brokerReports = await sql`select ticker, exchange from broker_reports`.catch(() => []);

// 종목코드:거래소 기준으로 한 번만
const uniqueTickers = new Map();
for (const p of [...posts, ...brokerReports]) {
  const t = (p.ticker ?? '').toString().toUpperCase().trim();
  const e = (p.exchange ?? '').toString().toUpperCase().trim();
  if (!t || !e || !shouldProcessExchange(e)) continue;
  const key = `${t}:${e}`;
  if (!uniqueTickers.has(key)) uniqueTickers.set(key, { ticker: t, exchange: e });
}

// 이미 이번 마감 이후 갱신된 종목은 건너뛴다
const updatedAt = new Map(
  (await sql`select ticker, updated_at from current_prices`).map((r) => [String(r.ticker).toUpperCase(), new Date(r.updated_at)]),
);
let stillOpen = 0;
let alreadyDone = 0;
const pending = [];
for (const item of uniqueTickers.values()) {
  if (isMarketOpen(item.exchange, now)) {
    stillOpen++;
    continue;
  }
  const date = lastSessionDate(item.exchange, now);
  const closeAt = sessionCloseInstant(item.exchange, date);
  const last = updatedAt.get(item.ticker);
  if (!FORCE && last && last >= closeAt) {
    alreadyDone++;
    continue;
  }
  pending.push({ ...item, date });
}
const batch = pending.slice(0, MAX_PER_RUN);
console.log(
  `[CRON] 종목 ${uniqueTickers.size} · 장중이라 건너뜀 ${stillOpen} · 이미 종가 반영 ${alreadyDone} · 남음 ${pending.length} → 이번에 ${batch.length}`,
);
if (batch.length === 0) {
  console.log('[CRON] 할 일 없음');
  process.exit(0);
}

const token = await getKISToken(sql);
const fetched = [];
const errors = [];

/** 한 묶음 저장 — 현재가 · 차트 종가 · 회원 리포트 · 전문가 추적 */
async function saveChunk(rows) {
  const tickers = rows.map((r) => r.ticker);
  const exchanges = rows.map((r) => r.exchange);
  const prices = rows.map((r) => r.price);
  const dates = rows.map((r) => r.date);
  await sql`
    insert into current_prices (ticker, exchange, current_price, updated_at)
    select t, e, p, now() from unnest(${tickers}::text[], ${exchanges}::text[], ${prices}::numeric[]) as x(t, e, p)
    on conflict (ticker) do update
      set exchange = excluded.exchange, current_price = excluded.current_price, updated_at = now()`;
  // 차트용 종가 1행/일
  await sql`
    insert into price_history (ticker, exchange, date, close)
    select t, e, d::date, p from unnest(${tickers}::text[], ${exchanges}::text[], ${dates}::text[], ${prices}::numeric[]) as x(t, e, d, p)
    on conflict (ticker, date) do update set exchange = excluded.exchange, close = excluded.close`;
  // 같은 종목의 모든 글이 SQL 안에서 각자의 작성가로 수익률을 계산 — ticker 수만큼만 처리
  const priceMap = JSON.stringify(Object.fromEntries(rows.map((r) => [r.ticker, r.price])));
  await sql`select update_posts_prices_batch(${priceMap}::jsonb)`;
  if (brokerReports.length > 0) await sql`select update_broker_reports_prices(${priceMap}::jsonb)`;
}

/** 묶음 하나 조회 → 성공분 저장. 실패한 종목은 돌려준다 */
async function runChunk(chunk, label) {
  const ok = [];
  const failed = [];
  for (const item of chunk) {
    try {
      const price = await getStockPrice(token, item.ticker, item.exchange);
      ok.push({ ...item, price });
      console.log(`[CRON] ✓ ${item.ticker} (${item.exchange}) ${item.date}: ${price}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      console.warn(`[CRON] ✗ ${item.ticker}: ${msg}`);
      failed.push({ ...item, error: msg });
    }
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  if (ok.length > 0) {
    await saveChunk(ok);
    fetched.push(...ok);
  }
  console.log(`[CRON] ${label} 저장 ${ok.length}종목${failed.length ? ` · 실패 ${failed.length}` : ''}`);
  return failed;
}

let failed = [];
const chunkCount = Math.ceil(batch.length / CHUNK_SIZE);
for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
  failed.push(...(await runChunk(batch.slice(i, i + CHUNK_SIZE), `묶음 ${i / CHUNK_SIZE + 1}/${chunkCount}`)));
  if (i + CHUNK_SIZE < batch.length) await sleep(PAUSE_BETWEEN_CHUNKS);
}

// 실패한 종목은 끝에 모아 한 번 더 (일시적인 API 오류·호출 한도 대비 — 조금 쉬었다가)
// 그래도 실패하면 다음 예약 실행이 "아직 갱신 안 된 종목"으로 다시 잡는다.
if (failed.length > 0) {
  console.log(`[CRON] 실패 ${failed.length}종목 재시도 (10초 후)`);
  await sleep(10_000);
  failed = await runChunk(failed, '재시도');
}
for (const f of failed) errors.push(`${f.ticker}: ${f.error}`);

if (fetched.length > 0) {
  // 수익률이 바뀌었으니 레벨 점수도 갱신 (최고점만 올라감 — db/migrations/0003_user_levels.sql)
  await sql`select refresh_level_points()`;
  console.log(`[CRON] 갱신 ${fetched.length}종목 (현재가 · 종가 · 회원 리포트 · 전문가 추적)`);
}

// 수집이 끝났으니 캐시 갱신 신호 한 번 — 가격이 들어간 모든 페이지·API (lib/cache.ts invalidateMarket)
const revalidated = fetched.length > 0 ? await revalidateScope('market') : null;

console.log(
  '[CRON] result',
  JSON.stringify({
    market: marketType,
    tickers_total: uniqueTickers.size,
    processed: batch.length,
    success: fetched.length,
    fail: errors.length,
    remaining: pending.length - batch.length,
    revalidated,
    duration_seconds: Number(((Date.now() - startTime) / 1000).toFixed(2)),
    errors: errors.slice(0, 10),
  }),
);
process.exit(errors.length > fetched.length ? 1 : 0);
