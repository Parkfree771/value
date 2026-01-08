/**
 * 로컬에서 구루 가격 업데이트 → Firebase Storage에 업로드
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// .env.local 로드
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('[LOCAL] Starting guru price update...');

// Firebase Admin 초기화
if (getApps().length === 0) {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  initializeApp({
    credential: cert(serviceAccount as any),
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });
  console.log('[Firebase] Initialized');
}

const db = getFirestore();
const bucket = getStorage().bucket();
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY = 100;

// 종목 로드
function loadStocks(): Map<string, { exchange: string; basePrice: number; companyName: string }> {
  const jsonPath = path.join(__dirname, '..', 'lib', 'guru-portfolio-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const gurusData = data.gurus || data;
  const stockMap = new Map();

  for (const guruId of Object.keys(gurusData)) {
    const guru = gurusData[guruId];
    if (!guru?.holdings) continue;
    for (const h of guru.holdings) {
      if (!h.exchange || stockMap.has(h.ticker)) continue;
      stockMap.set(h.ticker, { exchange: h.exchange, basePrice: h.basePrice, companyName: h.companyName });
    }
  }
  return stockMap;
}

// KIS 토큰 (Firestore)
async function getToken(): Promise<string> {
  const doc = await db.collection('settings').doc('kis_token').get();
  if (doc.exists && doc.data()?.token) {
    console.log('[KIS] Token from Firestore');
    return doc.data()!.token;
  }
  throw new Error('No token in Firestore');
}

// 현재가 조회
async function getPrice(token: string, ticker: string, exchange: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${ticker}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': process.env.KIS_APP_KEY!,
          'appsecret': process.env.KIS_APP_SECRET!,
          'tr_id': 'HHDFS00000300',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.rt_cd !== '0') return null;
    return parseFloat(data.output.last) || null;
  } catch {
    return null;
  }
}

async function main() {
  const start = Date.now();

  const stockMap = loadStocks();
  console.log(`[GURU] ${stockMap.size} stocks loaded`);

  const token = await getToken();

  const stocks: Record<string, any> = {};
  let ok = 0, fail = 0;

  for (const [ticker, info] of stockMap) {
    const price = await getPrice(token, ticker, info.exchange);

    if (price) {
      const ret = ((price - info.basePrice) / info.basePrice) * 100;
      stocks[ticker] = {
        basePrice: info.basePrice,
        currentPrice: price,
        returnRate: Math.round(ret * 100) / 100,
        exchange: info.exchange,
        companyName: info.companyName,
      };
      console.log(`✓ ${ticker}: $${price} (${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%)`);
      ok++;
    } else {
      stocks[ticker] = { basePrice: info.basePrice, currentPrice: null, returnRate: null, exchange: info.exchange, companyName: info.companyName };
      console.log(`✗ ${ticker}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, DELAY));
  }

  // Firebase Storage 업로드
  const jsonData = { lastUpdated: new Date().toISOString(), totalStocks: stockMap.size, successCount: ok, failCount: fail, stocks };

  const file = bucket.file('guru-stock-prices.json');
  await file.save(JSON.stringify(jsonData, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=900' },
  });

  console.log(`\n[DONE] ${ok} success, ${fail} failed (${((Date.now() - start) / 1000).toFixed(1)}s)`);
  console.log('[STORAGE] guru-stock-prices.json uploaded!');
}

main().catch(console.error);
