// 공통 KIS / Upbit 가격 조회 + Supabase 클라이언트 + KIS 토큰 캐시.
// Deno 런타임. update-stock-prices 와 update-guru-prices 가 공유.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const KIS_BASE_URL = Deno.env.get("KIS_BASE_URL") ?? "https://openapi.koreainvestment.com:9443";
const KIS_APP_KEY = Deno.env.get("KIS_APP_KEY") ?? "";
const KIS_APP_SECRET = Deno.env.get("KIS_APP_SECRET") ?? "";

export function makeSupabaseAdmin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 누락");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getKISToken(supabase: SupabaseClient): Promise<string> {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error("KIS_APP_KEY / KIS_APP_SECRET 누락");
  }

  const { data: cached } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kis_token")
    .maybeSingle();

  const v = cached?.value as { token?: string; expiresAt?: string } | null;
  if (v?.token && v.expiresAt) {
    const expiresAt = new Date(v.expiresAt).getTime();
    if (expiresAt > Date.now() + 5 * 60 * 1000) {
      console.log("[KIS] cached token reuse");
      return v.token;
    }
  }

  console.log("[KIS] new token request");
  const res = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIS token request failed: ${res.status} - ${text}`);
  }
  const data = await res.json();
  const token = data.access_token as string;
  const expiresIn = (data.expires_in as number) ?? 86400;
  const expiresAtIso = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();

  await supabase
    .from("settings")
    .upsert({ key: "kis_token", value: { token, expiresAt: expiresAtIso } }, { onConflict: "key" });

  return token;
}

export async function getKoreanStockPrice(token: string, ticker: string): Promise<number> {
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`,
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET,
        tr_id: "FHKST01010100",
      },
    },
  );
  if (!res.ok) throw new Error(`Korean stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== "0") throw new Error(`KIS API error: ${data.msg1}`);
  return parseFloat(data.output.stck_prpr);
}

export async function getOverseaStockPrice(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${ticker}`,
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET,
        tr_id: "HHDFS00000300",
      },
    },
  );
  if (!res.ok) throw new Error(`Oversea stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== "0") throw new Error(`KIS API error: ${data.msg1}`);
  const price = parseFloat(data.output.last);
  if (!isFinite(price) || price <= 0) throw new Error(`Invalid price: ${data.output.last}`);
  return price;
}

export async function getCryptoPrice(ticker: string): Promise<number> {
  const market = `KRW-${ticker.toUpperCase()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Upbit API failed: ${res.status}`);
    const data = await res.json();
    if (!data || data.length === 0) throw new Error(`No data for ${ticker}`);
    return data[0].trade_price;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getStockPrice(
  token: string,
  ticker: string,
  exchange: string,
): Promise<number> {
  if (exchange === "CRYPTO") return getCryptoPrice(ticker);
  if (exchange === "KRX") return getKoreanStockPrice(token, ticker);
  return getOverseaStockPrice(token, ticker, exchange);
}

// service_role 키로만 호출 가능. anon key 차단.
export function requireServiceRole(req: Request): Response | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function revalidateSite(paths: string[]): Promise<Record<string, number>> {
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  const secret = Deno.env.get("REVALIDATE_SECRET") ?? "";
  const out: Record<string, number> = {};
  if (!siteUrl || !secret) {
    console.log("[CRON] SITE_URL/REVALIDATE_SECRET 미설정 — revalidate 스킵");
    return out;
  }
  for (const path of paths) {
    try {
      const res = await fetch(`${siteUrl}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ path }),
      });
      out[path] = res.status;
    } catch (err) {
      console.warn(`[CRON] revalidate ${path} 실패:`, err instanceof Error ? err.message : err);
      out[path] = -1;
    }
  }
  return out;
}
