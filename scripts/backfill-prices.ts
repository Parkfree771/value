/**
 * Firebase Storage의 가격 JSON → Supabase Postgres 일괄 마이그레이션
 *
 * 1. prices-history/{TICKER}.json (전체) → price_history 테이블
 * 2. feed.json의 prices 맵            → current_prices 테이블
 *
 * 실행:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-prices.ts
 *
 * 환경변수: .env.local 자동 로드 (dotenv)
 *   - FIREBASE_SERVICE_ACCOUNT_BASE64 또는 FIREBASE_CLIENT_EMAIL+FIREBASE_PRIVATE_KEY
 *   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SECRET_KEY
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { createClient } from '@supabase/supabase-js';

// .env.local 명시 로드 (dotenv/config는 .env만 봄)
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

// ─── Firebase Admin 초기화 ──────────────────────────────
function initFirebase() {
  if (getApps().length > 0) return;

  let serviceAccount: ServiceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      'base64',
    ).toString('utf-8');
    serviceAccount = JSON.parse(json);
  } else {
    serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    } as ServiceAccount;
  }

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// ─── Supabase service_role 클라이언트 ────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('SUPABASE_URL/SECRET_KEY 누락');
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface PriceHistoryFile {
  ticker: string;
  exchange: string;
  lastUpdated: string;
  history: Array<{ d: string; c: number }>;
}

interface FeedData {
  prices?: Record<string, { currentPrice: number; exchange: string }>;
}

async function migratePriceHistory() {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'prices-history/' });
  console.log(`[backfill] prices-history 파일 ${files.length}개 발견`);

  const supabase = getSupabase();
  let totalRows = 0;
  let processedFiles = 0;

  const BATCH = 1000;
  let buffer: Array<{ ticker: string; exchange: string; date: string; close: number }> = [];

  async function flush() {
    if (buffer.length === 0) return;
    const { error } = await supabase
      .from('price_history')
      .upsert(buffer, { onConflict: 'ticker,date', ignoreDuplicates: true });
    if (error) {
      console.error('[backfill] insert error:', error);
      throw error;
    }
    totalRows += buffer.length;
    buffer = [];
  }

  for (const file of files) {
    // 디렉토리 placeholder 스킵
    if (file.name === 'prices-history/' || !file.name.endsWith('.json')) continue;

    try {
      const [content] = await file.download();
      const data = JSON.parse(content.toString()) as PriceHistoryFile;
      if (!data.ticker || !Array.isArray(data.history)) continue;

      const ticker = data.ticker.toUpperCase();
      const exchange = (data.exchange || 'UNKNOWN').toUpperCase();

      for (const p of data.history) {
        if (!p.d || !isFinite(p.c) || p.c <= 0) continue;
        buffer.push({ ticker, exchange, date: p.d, close: p.c });
        if (buffer.length >= BATCH) await flush();
      }
      processedFiles++;
      if (processedFiles % 25 === 0) {
        console.log(`[backfill] ${processedFiles}/${files.length} 파일 처리, ${totalRows + buffer.length} 행 누적`);
      }
    } catch (err) {
      console.error(`[backfill] ${file.name} 처리 실패:`, err);
    }
  }
  await flush();

  console.log(`[backfill] price_history 완료: ${processedFiles}개 파일, ${totalRows} 행`);
}

async function migrateCurrentPrices() {
  const bucket = getStorage().bucket();
  const file = bucket.file('feed.json');
  const [exists] = await file.exists();
  if (!exists) {
    console.log('[backfill] feed.json 없음 — current_prices 스킵');
    return;
  }

  const [content] = await file.download();
  const feed = JSON.parse(content.toString()) as FeedData;
  const prices = feed.prices || {};
  const tickers = Object.keys(prices);
  console.log(`[backfill] feed.json prices: ${tickers.length}개 티커`);

  const supabase = getSupabase();
  const rows = tickers
    .map((t) => {
      const v = prices[t];
      if (!v?.currentPrice || !v.exchange) return null;
      return {
        ticker: t.toUpperCase(),
        exchange: v.exchange.toUpperCase(),
        current_price: v.currentPrice,
      };
    })
    .filter((r): r is { ticker: string; exchange: string; current_price: number } => r !== null);

  if (rows.length === 0) {
    console.log('[backfill] current_prices 대상 없음');
    return;
  }

  const { error } = await supabase
    .from('current_prices')
    .upsert(rows, { onConflict: 'ticker' });
  if (error) throw error;

  console.log(`[backfill] current_prices 완료: ${rows.length} 행`);
}

async function main() {
  initFirebase();
  console.log('[backfill] Firebase Admin 초기화 완료');

  await migratePriceHistory();
  await migrateCurrentPrices();

  console.log('[backfill] 전체 완료');
}

main().catch((err) => {
  console.error('[backfill] 실패:', err);
  process.exit(1);
});
