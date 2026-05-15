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

function calculateReturn(
  initialPrice: number,
  currentPrice: number,
  positionType: "long" | "short",
): number {
  if (initialPrice <= 0 || currentPrice <= 0) return 0;
  if (positionType === "long") return ((currentPrice - initialPrice) / initialPrice) * 100;
  return ((initialPrice - currentPrice) / initialPrice) * 100;
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const marketType = (url.searchParams.get("market") ?? "ALL").toUpperCase();
  const startTime = Date.now();
  console.log(`[CRON] ===== update-stock-prices (MARKET: ${marketType}) =====`);

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
      else console.log(`[CRON] price_history: ${historyRows.length} 행`);
    }

    let postsUpdated = 0;
    for (const p of posts) {
      const ticker = (p.ticker ?? "").toString().toUpperCase();
      const np = newPrices.get(ticker);
      if (!np) continue;
      const positionType = (p.position_type as "long" | "short") ?? "long";
      const newReturnRate = parseFloat(
        calculateReturn(Number(p.initial_price ?? 0), np.currentPrice, positionType).toFixed(2),
      );
      const { error } = await supabase
        .from("posts")
        .update({
          current_price: np.currentPrice,
          prev_return_rate: p.return_rate,
          return_rate: newReturnRate,
        })
        .eq("id", p.id);
      if (!error) postsUpdated++;
    }
    console.log(`[CRON] posts updated: ${postsUpdated}`);

    const revalidated = await revalidateSite(["/", "/ranking", "/search"]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    return new Response(
      JSON.stringify({
        market: marketType,
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
