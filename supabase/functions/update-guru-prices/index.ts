// settings.guru_tickers의 310개 ticker를 KIS로 조회 → guru_prices UPSERT.
// 호출: POST /functions/v1/update-guru-prices (Authorization: Bearer service_role)

import {
  getKISToken,
  getOverseaStockPrice,
  makeSupabaseAdmin,
  requireServiceRole,
} from "../_shared/kis.ts";

interface TickerInfo {
  ticker: string;
  exchange: string;
  filingPrice: number;
}

const BATCH_SIZE = 5;          // KIS 20 req/s 한도 안에서 안전
const BATCH_DELAY_MS = 100;
const MAX_RETRIES = 2;

const SKIP_TICKERS = new Set(["EXE/WS", "KRSP/WS", "ALVOW", "JBSAY"]);
const TICKER_REMAP: Record<string, string> = { FI: "FISV" };
const EXCHANGE_REMAP: Record<string, string> = { FI: "NAS" };

async function getPriceWithRetry(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  let lastError: unknown;
  const kisTicker = TICKER_REMAP[ticker] ?? ticker;
  const kisExchange = EXCHANGE_REMAP[ticker] ?? exchange;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await getOverseaStockPrice(token, kisTicker, kisExchange);
    } catch (err) {
      lastError = err;
      if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  console.log("[GURU-CRON] ===== update-guru-prices =====");

  try {
    const supabase = makeSupabaseAdmin();

    const { data: settingRow, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "guru_tickers")
      .maybeSingle();
    if (settingsError) {
      return new Response(
        JSON.stringify({ error: "settings fetch failed", detail: settingsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    const tickers = (settingRow?.value ?? []) as TickerInfo[];
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return new Response(JSON.stringify({ error: "no guru_tickers in settings" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log(`[GURU-CRON] tickers: ${tickers.length}`);

    const token = await getKISToken(supabase);

    const rows: { ticker: string; current_price: number; return_rate: number }[] = [];
    let success = 0;
    let fail = 0;
    let skipped = 0;
    const failedTickers: string[] = [];

    // SKIP_TICKERS는 미리 필터해서 배치 분할 효율 ↑
    const fetchable = tickers.filter((t) => {
      if (SKIP_TICKERS.has(t.ticker)) {
        skipped++;
        return false;
      }
      return true;
    });

    // 배치 병렬 — 310 ticker × 100ms serial = 31s → batch5 × 100ms = ~6s
    for (let i = 0; i < fetchable.length; i += BATCH_SIZE) {
      const batch = fetchable.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ({ ticker, exchange, filingPrice }) => {
          const currentPrice = await getPriceWithRetry(token, ticker, exchange);
          const returnRate = filingPrice > 0
            ? Math.round(((currentPrice - filingPrice) / filingPrice) * 10000) / 100
            : 0;
          return { ticker, currentPrice, returnRate };
        }),
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const { ticker } = batch[j];
        if (r.status === "fulfilled") {
          rows.push({
            ticker: r.value.ticker,
            current_price: r.value.currentPrice,
            return_rate: r.value.returnRate,
          });
          success++;
        } else {
          const msg = r.reason instanceof Error ? r.reason.message : "Unknown";
          console.error(`[GURU-CRON] ✗ ${ticker}: ${msg}`);
          failedTickers.push(ticker);
          fail++;
        }
      }
      if (i + BATCH_SIZE < fetchable.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    console.log(`[GURU-CRON] fetched: ${success} ok, ${fail} fail, ${skipped} skip`);

    if (rows.length > 0) {
      const { error } = await supabase
        .from("guru_prices")
        .upsert(rows, { onConflict: "ticker" });
      if (error) {
        console.error("[GURU-CRON] upsert 실패:", error);
        return new Response(
          JSON.stringify({ error: "guru_prices upsert failed", detail: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      console.log(`[GURU-CRON] guru_prices: ${rows.length} 행 UPSERT`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    return new Response(
      JSON.stringify({
        tickers_total: tickers.length,
        success,
        fail,
        skipped,
        upserted: rows.length,
        duration_seconds: parseFloat(duration),
        failed_tickers: failedTickers.slice(0, 20),
      }),
      {
        status: fail > success ? 500 : 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[GURU-CRON] Critical error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
