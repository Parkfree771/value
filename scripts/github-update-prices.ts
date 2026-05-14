/**
 * GitHub Actions 가격 업데이트 cron — Supabase Postgres 버전
 *
 * 실행 흐름:
 *  1. posts 테이블에서 모든 글 읽기 (MARKET_TYPE 필터)
 *  2. 고유 ticker × exchange 추출
 *  3. KIS / Upbit으로 현재가 조회
 *  4. current_prices UPSERT
 *  5. price_history UPSERT (오늘 날짜 종가로)
 *  6. posts UPDATE (current_price, prev_return_rate, return_rate)
 *
 * 환경변수:
 *  - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *  - KIS_APP_KEY, KIS_APP_SECRET, KIS_BASE_URL
 *  - MARKET_TYPE (ASIA / US / ALL)
 */

import { createClient } from '@supabase/supabase-js';

// ===== 거래소 그룹 =====
const ASIA_EXCHANGES = ['KRX', 'TSE', 'SHS', 'SZS', 'HKS'];
const US_EXCHANGES = ['NAS', 'NYS', 'AMS'];
const MARKET_TYPE = process.env.MARKET_TYPE || 'ALL';

function shouldProcessExchange(exchange: string): boolean {
  if (exchange === 'CRYPTO') return true;
  if (MARKET_TYPE === 'ALL') return true;
  if (MARKET_TYPE === 'ASIA') return ASIA_EXCHANGES.includes(exchange);
  if (MARKET_TYPE === 'US') return US_EXCHANGES.includes(exchange);
  return true;
}

// ===== Supabase =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseSecret) {
  console.error('[CRON] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ===== KIS 토큰 (settings 테이블 캐시) =====
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_BETWEEN_REQUESTS = 50;

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
      if (expiresAt > Date.now() + 5 * 60 * 1000) {
        console.log('[KIS] cached token reuse');
        return v.token;
      }
    }
  }

  console.log('[KIS] new token request');
  const res = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} - ${text}`);
  }
  const data = await res.json();
  const token = data.access_token as string;
  const expiresIn = (data.expires_in as number) || 86400;
  const expiresAtIso = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();

  await supabase
    .from('settings')
    .upsert({ key: 'kis_token', value: { token, expiresAt: expiresAtIso } }, { onConflict: 'key' });

  return token;
}

// ===== 가격 조회 =====
async function getKoreanStockPrice(token: string, ticker: string): Promise<number> {
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: 'FHKST01010100',
      },
    },
  );
  if (!res.ok) throw new Error(`Korean stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS API error: ${data.msg1}`);
  return parseFloat(data.output.stck_prpr);
}

async function getOverseaStockPrice(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${ticker}`,
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
  if (!res.ok) throw new Error(`Oversea stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS API error: ${data.msg1}`);
  return parseFloat(data.output.last);
}

async function getCryptoPrice(ticker: string): Promise<number> {
  const market = `KRW-${ticker.toUpperCase()}`;
  const url = `https://api.upbit.com/v1/ticker?markets=${market}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error(`Upbit API failed: ${res.status}`);
  const data = await res.json();
  if (!data || data.length === 0) throw new Error(`No data for ${ticker}`);
  return data[0].trade_price;
}

async function getStockPrice(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  if (exchange === 'CRYPTO') return getCryptoPrice(ticker);
  if (exchange === 'KRX') return getKoreanStockPrice(token, ticker);
  return getOverseaStockPrice(token, ticker, exchange);
}

// ===== 수익률 =====
function calculateReturn(
  initialPrice: number,
  currentPrice: number,
  positionType: 'long' | 'short',
): number {
  if (initialPrice <= 0 || currentPrice <= 0) return 0;
  if (positionType === 'long') return ((currentPrice - initialPrice) / initialPrice) * 100;
  return ((initialPrice - currentPrice) / initialPrice) * 100;
}

// ===== 메인 =====
async function main() {
  const startTime = Date.now();
  console.log(`[CRON] ===== Starting price update (MARKET: ${MARKET_TYPE}) =====`);

  try {
    // 1. posts 읽기
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, ticker, exchange, initial_price, position_type, return_rate, current_price');

    if (postsError) {
      console.error('[CRON] posts 조회 실패:', postsError);
      process.exit(1);
    }
    if (!posts || posts.length === 0) {
      console.log('[CRON] posts 없음');
      return;
    }
    console.log(`[CRON] posts: ${posts.length}`);

    // 2. 현재 마켓에 해당하는 고유 ticker × exchange
    const uniqueTickers = new Map<string, { ticker: string; exchange: string }>();
    for (const p of posts) {
      const t = (p.ticker || '').toUpperCase().trim();
      const e = (p.exchange || '').toUpperCase().trim();
      if (!t || !e) continue;
      if (!shouldProcessExchange(e)) continue;
      const key = `${t}:${e}`;
      if (!uniqueTickers.has(key)) uniqueTickers.set(key, { ticker: t, exchange: e });
    }
    console.log(`[CRON] tickers to fetch: ${uniqueTickers.size}`);

    if (uniqueTickers.size === 0) {
      console.log('[CRON] 처리할 ticker 없음 (해당 마켓 글 없음)');
      return;
    }

    // 3. KIS 토큰
    const token = await getKISToken();

    // 4. 현재가 조회 (rate-limited 직렬)
    const newPrices = new Map<string, { currentPrice: number; exchange: string }>();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const { ticker, exchange } of uniqueTickers.values()) {
      try {
        const price = await getStockPrice(token, ticker, exchange);
        newPrices.set(ticker, { currentPrice: price, exchange });
        console.log(`[CRON] ✓ ${ticker} (${exchange}): ${price}`);
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[CRON] ✗ ${ticker}: ${msg}`);
        failCount++;
        errors.push(`${ticker}: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }

    // 5. current_prices UPSERT
    const currentRows = Array.from(newPrices.entries()).map(([ticker, v]) => ({
      ticker,
      exchange: v.exchange,
      current_price: v.currentPrice,
    }));
    if (currentRows.length > 0) {
      const { error } = await supabase
        .from('current_prices')
        .upsert(currentRows, { onConflict: 'ticker' });
      if (error) console.error('[CRON] current_prices upsert 실패:', error);
      else console.log(`[CRON] current_prices: ${currentRows.length} 행 UPSERT`);
    }

    // 6. price_history UPSERT (오늘 날짜 종가)
    const today = new Date().toISOString().split('T')[0];
    const historyRows = Array.from(newPrices.entries()).map(([ticker, v]) => ({
      ticker,
      exchange: v.exchange,
      date: today,
      close: v.currentPrice,
    }));
    if (historyRows.length > 0) {
      const { error } = await supabase
        .from('price_history')
        .upsert(historyRows, { onConflict: 'ticker,date' });
      if (error) console.error('[CRON] price_history upsert 실패:', error);
      else console.log(`[CRON] price_history: ${historyRows.length} 행 UPSERT (date=${today})`);
    }

    // 7. posts UPDATE (현재 마켓 ticker만)
    let postsUpdated = 0;
    for (const p of posts) {
      const ticker = (p.ticker || '').toUpperCase();
      const np = newPrices.get(ticker);
      if (!np) continue;

      const positionType: 'long' | 'short' = (p.position_type as 'long' | 'short') ?? 'long';
      const newReturnRate = parseFloat(
        calculateReturn(Number(p.initial_price ?? 0), np.currentPrice, positionType).toFixed(2),
      );

      const { error } = await supabase
        .from('posts')
        .update({
          current_price: np.currentPrice,
          prev_return_rate: p.return_rate,
          return_rate: newReturnRate,
        })
        .eq('id', p.id);
      if (error) {
        console.warn(`[CRON] posts update 실패 (id=${p.id}):`, error.message);
      } else {
        postsUpdated++;
      }
    }
    console.log(`[CRON] posts UPDATE: ${postsUpdated} 행`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON] ===== Done: ${successCount}/${uniqueTickers.size} tickers, ${postsUpdated} posts, ${duration}s =====`);

    if (errors.length > 0) {
      console.log(`[CRON] errors: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ` +${errors.length - 5}` : ''}`);
    }

    process.exit(failCount > successCount ? 1 : 0);
  } catch (error) {
    console.error('[CRON] Critical error:', error);
    process.exit(1);
  }
}

main();
