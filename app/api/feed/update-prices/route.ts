/**
 * POST /api/feed/update-prices
 *
 * 모든 글의 ticker × exchange에 대해 외부 API로 현재가 조회 후
 * Postgres current_prices 테이블에 UPSERT. posts 테이블의
 * current_price/return_rate/prev_return_rate도 갱신.
 *
 * 관리자 인증 필요. cron이 정기 호출.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getKISTokenWithCache } from '@/lib/kisTokenManager';
import { getServiceClient } from '@/lib/supabase-admin';

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const BATCH_SIZE = 5;
const BATCH_DELAY = 100;

async function getKoreanStockPrice(token: string, ticker: string): Promise<number> {
  const response = await fetch(
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
  if (!response.ok) throw new Error(`Korean stock API failed: ${response.status}`);
  const data = await response.json();
  if (data.rt_cd !== '0') throw new Error(`KIS API error: ${data.msg1}`);
  return parseFloat(data.output.stck_prpr);
}

async function getOverseaStockPrice(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  const response = await fetch(
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
  if (!response.ok) throw new Error(`Oversea stock API failed: ${response.status}`);
  const data = await response.json();
  if (data.rt_cd !== '0') throw new Error(`KIS API error: ${data.msg1}`);
  return parseFloat(data.output.last);
}

async function getCryptoPrice(ticker: string): Promise<number> {
  const market = `KRW-${ticker.toUpperCase()}`;
  const url = `https://api.upbit.com/v1/ticker?markets=${market}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  });
  clearTimeout(timeoutId);
  if (!response.ok) throw new Error(`Upbit API failed: ${response.status}`);
  const data = await response.json();
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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request.headers.get('authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`update-prices:${ip}`, 10, 60 * 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const startTime = Date.now();
  console.log('[Update Prices] ===== Starting (Postgres) =====');

  try {
    const supabase = getServiceClient();

    // 1. posts에서 유니크한 ticker × exchange만 추출 (DISTINCT). post row 전체는 불필요 —
    //    배치 RPC가 ticker 매칭으로 일괄 UPDATE.
    const { data: postsRows, error: postsError } = await supabase
      .from('posts')
      .select('ticker, exchange');

    if (postsError) {
      console.error('[Update Prices] posts 조회 실패:', postsError);
      return NextResponse.json({ error: 'posts 조회 실패' }, { status: 500 });
    }
    if (!postsRows || postsRows.length === 0) {
      return NextResponse.json({ success: true, message: 'No posts to update', updated: 0 });
    }

    const uniqueTickers = new Map<string, { ticker: string; exchange: string }>();
    for (const p of postsRows) {
      const t = (p.ticker || '').toUpperCase().trim();
      const e = (p.exchange || '').toUpperCase().trim();
      if (!t || !e) continue;
      const key = `${t}:${e}`;
      if (!uniqueTickers.has(key)) uniqueTickers.set(key, { ticker: t, exchange: e });
    }

    // 2. KIS 토큰
    const token = await getKISTokenWithCache();

    // 3. 가격 조회 (배치 병렬)
    const newPrices = new Map<string, { currentPrice: number; exchange: string }>();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const tickerArray = Array.from(uniqueTickers.values());
    for (let i = 0; i < tickerArray.length; i += BATCH_SIZE) {
      const batch = tickerArray.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ({ ticker, exchange }) => {
          const price = await getStockPrice(token, ticker, exchange);
          return { ticker, exchange, price };
        }),
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const { ticker, exchange } = batch[j];
        if (r.status === 'fulfilled') {
          newPrices.set(ticker, { currentPrice: r.value.price, exchange });
          successCount++;
        } else {
          const msg = r.reason instanceof Error ? r.reason.message : 'Unknown error';
          failCount++;
          errors.push(`${ticker}: ${msg}`);
        }
      }
      if (i + BATCH_SIZE < tickerArray.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // 4. current_prices UPSERT
    const currentPricesRows = Array.from(newPrices.entries()).map(([ticker, v]) => ({
      ticker,
      exchange: v.exchange,
      current_price: v.currentPrice,
    }));
    if (currentPricesRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('current_prices')
        .upsert(currentPricesRows, { onConflict: 'ticker' });
      if (upsertError) {
        console.error('[Update Prices] current_prices upsert error:', upsertError);
      }
    }

    // 5. posts.current_price/return_rate/prev_return_rate를 배치 RPC 1콜로 일괄 갱신.
    //    옛 코드: posts 행 N개에 각각 UPDATE (50글 → 50 UPDATE)
    //    신: ticker → 가격 jsonb 맵을 한 번에 보내고 SQL aggregate 1쿼리로 같은 ticker 모두 갱신.
    //    update_posts_prices_batch가 long/short 분기 + ROUND까지 SQL 내부에서 처리 (migrations/0018).
    const priceMap: Record<string, number> = {};
    for (const [ticker, v] of newPrices) {
      priceMap[ticker] = v.currentPrice;
    }
    if (Object.keys(priceMap).length > 0) {
      const { error: rpcError } = await supabase.rpc('update_posts_prices_batch', {
        p_prices: priceMap,
      });
      if (rpcError) {
        console.error('[Update Prices] update_posts_prices_batch 실패:', rpcError.message);
      }
    }

    // 6. price_history에 오늘 날짜 종가 UPSERT (장 마감 후 호출 가정)
    const today = new Date().toISOString().split('T')[0];
    const historyRows = Array.from(newPrices.entries()).map(([ticker, v]) => ({
      ticker,
      exchange: v.exchange,
      date: today,
      close: v.currentPrice,
    }));
    if (historyRows.length > 0) {
      const { error: histError } = await supabase
        .from('price_history')
        .upsert(historyRows, { onConflict: 'ticker,date' });
      if (histError) {
        console.warn('[Update Prices] price_history upsert 실패:', histError.message);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[Update Prices] ===== Done: ${successCount}/${uniqueTickers.size} tickers (${duration}s) =====`,
    );

    return NextResponse.json({
      success: true,
      message: '가격 업데이트 완료',
      stats: {
        totalPosts: postsRows.length,
        tickersUpdated: successCount,
        tickersFailed: failCount,
        duration: `${duration}s`,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('[Update Prices] Critical error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Price update failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST with admin authentication' }, { status: 405 });
}
