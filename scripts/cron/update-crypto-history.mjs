// 코인 차트 일봉 — Upbit KST 일봉(09:00 KST 시작)의 종가를 price_history 에 기록.
// 코인은 주말에도 거래되므로 매일 실행 (GitHub Actions price-cron '20 0 * * *').
// 일봉 API 라 실행이 늦어져도 날짜·종가가 정확하다 (주식 finalize 처럼 실행 시각에 의존하지 않음).
//
//   node scripts/cron/update-crypto-history.mjs              # 최근 3일 (마감된 일봉만) upsert
//   node scripts/cron/update-crypto-history.mjs --backfill   # 글 작성일부터 빠진 날만 채움 (기존 값은 그대로)

import { makeDb, sleep } from './shared.mjs';

const backfill = process.argv.includes('--backfill');
const sql = makeDb();

const rows = await sql`
  select upper(ticker) as ticker, min(created_at)::date::text as since
  from posts where exchange = 'CRYPTO' group by 1`;
if (rows.length === 0) {
  console.log('[CRYPTO] no crypto posts');
  process.exit(0);
}

const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/** KRW-{ticker} 일봉 — to 이전 count 개 (최신순). 마감 안 된 오늘 일봉은 제외 */
async function candles(ticker, count, to) {
  const url = new URL('https://api.upbit.com/v1/candles/days');
  url.searchParams.set('market', `KRW-${ticker}`);
  url.searchParams.set('count', String(count));
  if (to) url.searchParams.set('to', to);
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Upbit candles ${res.status}`);
  const data = await res.json();
  return data
    .map((c) => ({ date: c.candle_date_time_kst.slice(0, 10), close: c.trade_price, utc: c.candle_date_time_utc }))
    .filter((c) => c.date < todayKst);
}

let total = 0;
for (const { ticker, since } of rows) {
  let list = [];
  if (backfill) {
    // 200개씩 과거로 — since 까지
    let to;
    for (let guard = 0; guard < 10; guard++) {
      const page = await candles(ticker, 200, to);
      if (page.length === 0) break;
      list.push(...page);
      const oldest = page[page.length - 1];
      if (oldest.date <= since) break;
      to = `${oldest.utc}Z`;
      await sleep(150);
    }
    list = list.filter((c) => c.date >= since);
  } else {
    list = await candles(ticker, 4);
  }
  if (list.length === 0) continue;

  const dates = list.map((c) => c.date);
  const closes = list.map((c) => c.close);
  const result = backfill
    ? await sql`
        insert into price_history (ticker, exchange, date, close)
        select ${ticker}, 'CRYPTO', d::date, c from unnest(${dates}::text[], ${closes}::numeric[]) as x(d, c)
        on conflict (ticker, date) do nothing
        returning 1`
    : await sql`
        insert into price_history (ticker, exchange, date, close)
        select ${ticker}, 'CRYPTO', d::date, c from unnest(${dates}::text[], ${closes}::numeric[]) as x(d, c)
        on conflict (ticker, date) do update set close = excluded.close, exchange = excluded.exchange
        returning 1`;
  console.log(`[CRYPTO] ${ticker}: ${backfill ? '빈 날 채움' : 'upsert'} ${result.length}행 (${dates[dates.length - 1]} ~ ${dates[0]})`);
  total += result.length;
}
console.log(`[CRYPTO] result ${JSON.stringify({ tickers: rows.length, written: total, backfill })}`);
