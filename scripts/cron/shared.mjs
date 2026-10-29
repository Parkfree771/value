// GitHub Actions 가격 cron 공통 — KIS / Upbit 가격 조회 + Neon DB + KIS 토큰 캐시 + revalidate.
//
// 환경변수: DATABASE_URL, KIS_APP_KEY, KIS_APP_SECRET, [KIS_BASE_URL], [SITE_URL, REVALIDATE_SECRET]

import { neon } from '@neondatabase/serverless';

export const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const KIS_APP_KEY = process.env.KIS_APP_KEY ?? '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET ?? '';

export function makeDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 누락');
  return neon(url);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** settings.kis_token 캐시 — 웹앱(lib/kisTokenManager.ts)과 같은 행을 공유 */
export async function getKISToken(sql) {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error('KIS_APP_KEY / KIS_APP_SECRET 누락');
  }

  const [cached] = await sql`select value from settings where key = 'kis_token'`;
  const v = cached?.value;
  if (v?.token && v.expiresAt) {
    const expiresAt = new Date(v.expiresAt).getTime();
    if (expiresAt > Date.now() + 5 * 60 * 1000) {
      console.log('[KIS] cached token reuse');
      return v.token;
    }
  }

  console.log('[KIS] new token request');
  const res = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIS token request failed: ${res.status} - ${text}`);
  }
  const data = await res.json();
  const token = data.access_token;
  const expiresIn = data.expires_in ?? 86400;
  const expiresAtIso = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();

  await sql`
    insert into settings (key, value) values ('kis_token', ${JSON.stringify({ token, expiresAt: expiresAtIso })}::jsonb)
    on conflict (key) do update set value = excluded.value`;

  return token;
}

const kisHeaders = (token, trId) => ({
  'Content-Type': 'application/json',
  authorization: `Bearer ${token}`,
  appkey: KIS_APP_KEY,
  appsecret: KIS_APP_SECRET,
  tr_id: trId,
});

export async function getKoreanStockPrice(token, ticker) {
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`,
    { headers: kisHeaders(token, 'FHKST01010100') },
  );
  if (!res.ok) throw new Error(`Korean stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS API error: ${data.msg1}`);
  return parseFloat(data.output.stck_prpr);
}

export async function getOverseaStockPrice(token, ticker, exchange) {
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${ticker}`,
    { headers: kisHeaders(token, 'HHDFS00000300') },
  );
  if (!res.ok) throw new Error(`Oversea stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS API error: ${data.msg1}`);
  const price = parseFloat(data.output.last);
  if (!isFinite(price) || price <= 0) throw new Error(`Invalid price: ${data.output.last}`);
  return price;
}

export async function getCryptoPrice(ticker) {
  const market = `KRW-${ticker.toUpperCase()}`;
  const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Upbit API failed: ${res.status}`);
  const data = await res.json();
  if (!data || data.length === 0) throw new Error(`No data for ${ticker}`);
  return data[0].trade_price;
}

export async function getStockPrice(token, ticker, exchange) {
  if (exchange === 'CRYPTO') return getCryptoPrice(ticker);
  if (exchange === 'KRX') return getKoreanStockPrice(token, ticker);
  return getOverseaStockPrice(token, ticker, exchange);
}

export async function revalidateSite(paths) {
  const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
  const secret = process.env.REVALIDATE_SECRET ?? '';
  const out = {};
  if (!siteUrl || !secret) {
    console.log('[CRON] SITE_URL/REVALIDATE_SECRET 미설정 — revalidate 스킵');
    return out;
  }
  for (const path of paths) {
    try {
      const res = await fetch(`${siteUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
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
