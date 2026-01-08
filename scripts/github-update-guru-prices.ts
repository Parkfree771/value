/**
 * 구루 포트폴리오 가격 업데이트 스크립트
 *
 * 매일 06:15에 실행되어 구루 종목들의 현재가를 업데이트하고
 * Firebase Storage에 JSON 파일로 저장
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Admin 초기화
if (getApps().length === 0) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!serviceAccountBase64) {
    console.error('[ERROR] FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
    process.exit(1);
  }

  try {
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
    });
    console.log('[Firebase] Initialized');
  } catch (error) {
    console.error('[ERROR] Failed to parse service account:', error);
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_BETWEEN_REQUESTS = 100; // ms (초당 10개, 안전하게)

// 구루 포트폴리오 데이터 로드
interface GuruHolding {
  ticker: string;
  companyName: string;
  basePrice: number;
  exchange?: string;
}

interface GuruPortfolio {
  guruId: string;
  holdings: GuruHolding[];
}

// guru-portfolio-data.json에서 종목 추출
function loadGuruPortfolios(): Map<string, { exchange: string; basePrice: number; companyName: string }> {
  const jsonPath = path.join(process.cwd(), 'lib', 'guru-portfolio-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const stockMap = new Map<string, { exchange: string; basePrice: number; companyName: string }>();

  // 각 구루의 종목들을 순회
  for (const guruId of Object.keys(data)) {
    const guru = data[guruId];
    if (!guru.holdings) continue;

    for (const holding of guru.holdings) {
      // exchange가 없는 종목은 스킵 (채권 등)
      if (!holding.exchange) {
        console.log(`[SKIP] ${holding.ticker} - no exchange`);
        continue;
      }

      // 중복 제거 (같은 티커는 첫 번째 것만)
      if (!stockMap.has(holding.ticker)) {
        stockMap.set(holding.ticker, {
          exchange: holding.exchange,
          basePrice: holding.basePrice,
          companyName: holding.companyName,
        });
      }
    }
  }

  return stockMap;
}

// KIS 토큰 가져오기
async function getKISToken(): Promise<string> {
  const tokenDoc = await db.collection('settings').doc('kis_token').get();

  if (!tokenDoc.exists) {
    throw new Error('KIS token not found in Firebase');
  }

  const data = tokenDoc.data();
  if (!data?.token) {
    throw new Error('KIS token is empty');
  }

  console.log('[KIS] Token loaded from Firebase');
  return data.token;
}

// 해외 주식 가격 조회
async function getOverseaStockPrice(token: string, ticker: string, exchange: string): Promise<number | null> {
  try {
    const response = await fetch(
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

    if (!response.ok) {
      console.error(`[KIS] API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.rt_cd !== '0') {
      console.error(`[KIS] Error for ${ticker}: ${data.msg1}`);
      return null;
    }

    const price = parseFloat(data.output.last);
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error(`[KIS] Exception for ${ticker}:`, error);
    return null;
  }
}

// 국내 주식 가격 조회
async function getKoreanStockPrice(token: string, ticker: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': process.env.KIS_APP_KEY!,
          'appsecret': process.env.KIS_APP_SECRET!,
          'tr_id': 'FHKST01010100',
        },
      }
    );

    if (!response.ok) {
      console.error(`[KIS] API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.rt_cd !== '0') {
      console.error(`[KIS] Error for ${ticker}: ${data.msg1}`);
      return null;
    }

    const price = parseFloat(data.output.stck_prpr);
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error(`[KIS] Exception for ${ticker}:`, error);
    return null;
  }
}

// 메인 함수
async function main() {
  const startTime = Date.now();
  console.log('[GURU] ===== Starting guru price update =====');

  try {
    // 1. 구루 포트폴리오에서 종목 추출
    const stockMap = loadGuruPortfolios();
    console.log(`[GURU] Found ${stockMap.size} unique stocks (excluding no-exchange)`);

    // 2. KIS 토큰 가져오기
    const token = await getKISToken();

    // 3. 각 종목의 현재가 조회
    const stocks: Record<string, any> = {};
    let successCount = 0;
    let failCount = 0;

    for (const [ticker, info] of stockMap) {
      let currentPrice: number | null = null;

      if (info.exchange === 'KRX') {
        currentPrice = await getKoreanStockPrice(token, ticker);
      } else {
        currentPrice = await getOverseaStockPrice(token, ticker, info.exchange);
      }

      if (currentPrice !== null) {
        const returnRate = ((currentPrice - info.basePrice) / info.basePrice) * 100;

        stocks[ticker] = {
          basePrice: info.basePrice,
          currentPrice: currentPrice,
          returnRate: Math.round(returnRate * 100) / 100,
          exchange: info.exchange,
          companyName: info.companyName,
        };

        console.log(`[GURU] ✓ ${ticker}: $${info.basePrice} → $${currentPrice} (${returnRate > 0 ? '+' : ''}${returnRate.toFixed(2)}%)`);
        successCount++;
      } else {
        // 실패한 경우 기존 basePrice만 저장
        stocks[ticker] = {
          basePrice: info.basePrice,
          currentPrice: null,
          returnRate: null,
          exchange: info.exchange,
          companyName: info.companyName,
        };
        console.log(`[GURU] ✗ ${ticker}: failed to fetch price`);
        failCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }

    // 4. JSON 생성
    const jsonData = {
      lastUpdated: new Date().toISOString(),
      totalStocks: stockMap.size,
      successCount,
      failCount,
      stocks,
    };

    // 5. Firebase Storage에 업로드
    const file = bucket.file('guru-stock-prices.json');
    await file.save(JSON.stringify(jsonData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=900', // 15분 캐시
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[GURU] ===== Completed: ${successCount} success, ${failCount} failed (${duration}s) =====`);
    console.log(`[GURU] JSON uploaded to Firebase Storage`);

  } catch (error) {
    console.error('[GURU] Critical error:', error);
    process.exit(1);
  }
}

main();
