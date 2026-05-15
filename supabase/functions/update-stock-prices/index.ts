// posts 테이블의 ticker × exchange 조합을 KIS/Upbit으로 조회 → current_prices/price_history/posts UPSERT → revalidate.
// 호출: POST /functions/v1/update-stock-prices?market=ASIA|US|CRYPTO|ALL (Authorization: Bearer service_role)

import {
  getKISToken,
  getStockPrice,
  makeSupabaseAdmin,
  requireServiceRole,
  revalidateSite,
} from "../_shared/kis.ts";

const ASIA_EXCHANGES = ["KRX", "TSE", "SHS", "SZS", "HKS"];
const US_EXCHANGES = ["NAS", "NYS", "AMS"];
const DELAY_BETWEEN_REQUESTS = 250;

function shouldProcessExchange(exchange: string, marketType: string): boolean {
  if (marketType === "CRYPTO") return exchange === "CRYPTO";
  if (exchange === "CRYPTO") return true;
  if (marketType === "ALL") return true;
  if (marketType === "ASIA") return ASIA_EXCHANGES.includes(exchange);
  if (marketType === "US") return US_EXCHANGES.includes(exchange);
  return true;
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const marketType = (url.searchParams.get("market") ?? "ALL").toUpperCase();
  // finalize=true일 때만 price_history에 종가 UPSERT (장 마감 cron 전용).
  // 그 외 장중 cron은 current_prices와 posts return_rate만 갱신 → 차트는 종가 1행/일 보장.
  const finalize = url.searchParams.get("finalize") === "true";
  const startTime = Date.now();
  console.log(`[CRON] ===== update-stock-prices (MARKET: ${marketType}, finalize: ${finalize}) =====`);

  try {
    const supabase = makeSupabaseAdmin();

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, ticker, exchange, initial_price, position_type, return_rate, current_price");

    if (postsError) {
      console.error("[CRON] posts 조회 실패:", postsError);
      return new Response(JSON.stringify({ error: "posts fetch failed", detail: postsError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ status: "no_posts", market: marketType }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const uniqueTickers = new Map<string, { ticker: string; exchange: string }>();
    for (const p of posts) {
      const t = (p.ticker ?? "").toString().toUpperCase().trim();
      const e = (p.exchange ?? "").toString().toUpperCase().trim();
      if (!t || !e) continue;
      if (!shouldProcessExchange(e, marketType)) continue;
      const key = `${t}:${e}`;
      if (!uniqueTickers.has(key)) uniqueTickers.set(key, { ticker: t, exchange: e });
    }

    if (uniqueTickers.size === 0) {
      return new Response(
        JSON.stringify({ status: "no_tickers_for_market", market: marketType, posts: posts.length }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    console.log(`[CRON] tickers to fetch: ${uniqueTickers.size}`);

    const token = await getKISToken(supabase);

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
        const msg = err instanceof Error ? err.message : "Unknown";
        console.error(`[CRON] ✗ ${ticker}: ${msg}`);
        failCount++;
        errors.push(`${ticker}: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }

    const currentRows = Array.from(newPrices.entries()).map(([ticker, v]) => ({
      ticker,
      exchange: v.exchange,
      current_price: v.currentPrice,
    }));
    if (currentRows.length > 0) {
      const { error } = await supabase
        .from("current_prices")
        .upsert(currentRows, { onConflict: "ticker" });
      if (error) console.error("[CRON] current_prices upsert:", error);
      else console.log(`[CRON] current_prices: ${currentRows.length} 행`);
    }

    // price_history는 장 마감 cron(finalize=true)에서만 종가 1회 UPSERT.
    // 장중 cron은 current_prices만 실시간 갱신, price_history는 종가만 보존.
    if (finalize) {
      const today = new Date().toISOString().split("T")[0];
      const historyRows = Array.from(newPrices.entries()).map(([ticker, v]) => ({
        ticker,
        exchange: v.exchange,
        date: today,
        close: v.currentPrice,
      }));
      if (historyRows.length > 0) {
        const { error } = await supabase
          .from("price_history")
          .upsert(historyRows, { onConflict: "ticker,date" });
        if (error) console.error("[CRON] price_history upsert:", error);
        else console.log(`[CRON] price_history (finalize): ${historyRows.length} 행`);
      }
    } else {
      console.log("[CRON] price_history skip (장중 cron — finalize=false)");
    }

    // ticker → 현재가 맵을 RPC로 한 번에 전달.
    // 같은 ticker의 모든 글이 SQL 안에서 각자의 initial_price로 return_rate를 계산하므로
    // "삼성전자 글 10개"여도 cron에서 10번 UPDATE할 필요 없이 ticker 수만큼만 호출.
    const priceMap: Record<string, number> = {};
    for (const [ticker, v] of newPrices.entries()) {
      priceMap[ticker] = v.currentPrice;
    }
    let postsUpdated = 0;
    if (Object.keys(priceMap).length > 0) {
      const { error: rpcError } = await supabase.rpc("update_posts_prices_batch", {
        p_prices: priceMap,
      });
      if (rpcError) {
        console.error("[CRON] update_posts_prices_batch error:", rpcError);
      } else {
        // 영향 받은 posts 수는 RPC가 void라 측정 안 됨.
        // 매핑된 ticker에 해당하는 posts.id 수로 추정 (로깅용).
        for (const p of posts) {
          const t = (p.ticker ?? "").toString().toUpperCase();
          if (priceMap[t] !== undefined && Number(p.initial_price ?? 0) > 0) postsUpdated++;
        }
      }
    }
    console.log(`[CRON] posts updated (batched): ${postsUpdated}`);

    const revalidated = await revalidateSite(["/", "/ranking", "/search"]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    return new Response(
      JSON.stringify({
        market: marketType,
        finalize,
        tickers_total: uniqueTickers.size,
        success: successCount,
        fail: failCount,
        posts_updated: postsUpdated,
        revalidated,
        duration_seconds: parseFloat(duration),
        errors: errors.slice(0, 10),
      }),
      {
        status: failCount > successCount ? 500 : 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[CRON] Critical error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
