/**
 * GitHub Actions 크론용 구루 포트폴리오 가격 업데이트 스크립트
 *
 * 미국 장 마감 후(06:30 KST = 21:30 UTC) 평일 1회 실행:
 * 1. data/guru-portfolios.json에서 티커 + 공시일가 읽기 (로컬 파일)
 * 2. KIS API로 현재가 일괄 조회
 * 3. 수익률 계산 후 Firebase Storage에 guru-stock-prices.json 저장
 *
 * Firestore 읽기/쓰기: 토큰 캐시 1회만
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

// ===== 타입 =====
interface TickerInfo {
  ticker: string;
  exchange: string;
  filingPrice: number;
}

interface PortfoliosJson {
  meta: {
    updated_at: string;
    total_unique_tickers: number;
  };
  tickers: TickerInfo[];
}

interface KISTokenCache {
  token: string;
  expiresAt: Timestamp;
}

// ===== Firebase Admin 초기화 =====
if (getApps().length === 0) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccountBase64) {
    console.error('[ERROR] FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
    process.exit(1);
  }

  const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(serviceAccountJson);

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
  console.log('[Firebase] Initialized');
}

const db = getFirestore();
const bucket = getStorage().bucket();

// ===== KIS API =====
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_MS = 80; // KIS 초당 20회 제한

async function getKISToken(): Promise<string> {
  const tokenDoc = await db.collection('settings').doc('kis_token').get();

  if (tokenDoc.exists) {
    const data = tokenDoc.data() as KISTokenCache;
    const expiresAt = data.expiresAt?.toDate?.() || new Date(0);
    if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
      console.log('[KIS] Using cached token');
      return data.token;
    }
  }

  console.log('[KIS] Generating new token...');
  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });

  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);

  const data = await response.json();
  const token = data.access_token;
  const expiresIn = data.expires_in || 86400;

  await db.collection('settings').doc('kis_token').set({
    token,
    expiresAt: Timestamp.fromDate(new Date(Date.now() + (expiresIn - 300) * 1000)),
    updatedAt: Timestamp.now(),
  });

  return token;
}

async function getStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
  if (exchange === 'KRX') {
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
      }
    );
    const data = await res.json();
    if (data.rt_cd !== '0') throw new Error(data.msg1);
    return parseFloat(data.output.stck_prpr);
  }

  // 해외 주식
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
    }
  );
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(data.msg1);
  return parseFloat(data.output.last);
}

// ===== 메인 =====
async function main() {
  const startTime = Date.now();
  console.log('[GURU-CRON] ===== Starting guru price update =====');

  // 1. data/guru-portfolios.json 읽기
  const portfoliosPath = path.join(__dirname, '..', 'data', 'guru-portfolios.json');

  if (!fs.existsSync(portfoliosPath)) {
    console.error('[ERROR] data/guru-portfolios.json not found. Run fetch-13f --all first.');
    process.exit(1);
  }

  const portfoliosData: PortfoliosJson = JSON.parse(fs.readFileSync(portfoliosPath, 'utf-8'));
  console.log(`[GURU-CRON] Ticker list: ${portfoliosData.tickers.length} unique tickers (updated: ${portfoliosData.meta.updated_at})`);

  // 2. KIS 토큰 (유일한 Firestore 접근)
  const token = await getKISToken();

  // 3. 전체 고유 티커 가격 조회 + 수익률 계산
  const priceMap: Record<string, { currentPrice: number; returnRate: number }> = {};
  let success = 0;
  let fail = 0;

  console.log(`\n[GURU-CRON] Fetching ${portfoliosData.tickers.length} prices...`);

  for (const { ticker, exchange, filingPrice } of portfoliosData.tickers) {
    try {
      const currentPrice = await getStockPrice(token, ticker, exchange);
      const returnRate = filingPrice > 0
        ? Math.round(((currentPrice - filingPrice) / filingPrice) * 10000) / 100
        : 0;

      priceMap[ticker] = { currentPrice, returnRate };
      console.log(`  ✓ ${ticker} (${exchange}): $${currentPrice} (공시일가 $${filingPrice} → ${returnRate > 0 ? '+' : ''}${returnRate}%)`);
      success++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      console.error(`  ✗ ${ticker}: ${msg}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[GURU-CRON] Prices fetched: ${success} ok, ${fail} failed`);

  // 4. Firebase Storage에 guru-stock-prices.json 저장
  const storageData = {
    lastUpdated: new Date().toISOString(),
    totalTickers: Object.keys(priceMap).length,
    prices: priceMap,
  };

  await bucket.file('guru-stock-prices.json').save(JSON.stringify(storageData), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=43200' }, // 12시간 캐시
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[GURU-CRON] ===== Done in ${duration}s | ${success} prices → guru-stock-prices.json =====`);
}

main().catch(err => {
  console.error('[GURU-CRON] Critical error:', err);
  process.exit(1);
});
