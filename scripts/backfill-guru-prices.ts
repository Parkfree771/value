/**
 * 일회성 백필: Firebase Storage의 guru-stock-prices.json → guru_prices 테이블
 *
 * 실행:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-guru-prices.ts
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { createClient } from '@supabase/supabase-js';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

function initFirebase() {
  if (getApps().length > 0) return;
  let serviceAccount: ServiceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
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

async function main() {
  initFirebase();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const bucket = getStorage().bucket();
  const file = bucket.file('guru-stock-prices.json');
  const [exists] = await file.exists();
  if (!exists) {
    console.log('[backfill-guru] guru-stock-prices.json 없음 — 스킵');
    return;
  }

  const [content] = await file.download();
  const data = JSON.parse(content.toString());
  const prices = data.prices || {};
  const tickers = Object.keys(prices);
  console.log(`[backfill-guru] ${tickers.length}개 ticker 처리`);

  const rows = tickers
    .map((t) => {
      const v = prices[t];
      if (typeof v?.currentPrice !== 'number') return null;
      return {
        ticker: t.toUpperCase(),
        current_price: v.currentPrice,
        return_rate: typeof v.returnRate === 'number' ? v.returnRate : 0,
      };
    })
    .filter((r): r is { ticker: string; current_price: number; return_rate: number } => r !== null);

  if (rows.length === 0) {
    console.log('[backfill-guru] 대상 없음');
    return;
  }

  const { error } = await supabase
    .from('guru_prices')
    .upsert(rows, { onConflict: 'ticker' });
  if (error) throw error;

  console.log(`[backfill-guru] 완료: ${rows.length} 행`);
}

main().catch((err) => {
  console.error('[backfill-guru] 실패:', err);
  process.exit(1);
});
