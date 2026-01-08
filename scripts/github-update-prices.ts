/**
 * GitHub Actions 크론용 주식 가격 업데이트 스크립트
 *
 * 15분마다 실행되어 tickers 컬렉션의 종목들 현재가를 조회하고
 * Firebase Storage에 JSON 파일로 저장 (비용 최적화)
 *
 * 환경변수 MARKET_TYPE으로 거래소 필터링:
 * - ASIA: KRX(한국), TSE(일본), SHS/SZS(중국), HKS(홍콩)
 * - US: NAS(나스닥), NYS(뉴욕), AMS(아멕스)
 * - ALL: 모든 거래소 (기본값)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// 거래소 그룹 정의
const ASIA_EXCHANGES = ['KRX', 'TSE', 'SHS', 'SZS', 'HKS'];
const US_EXCHANGES = ['NAS', 'NYS', 'AMS'];

// 환경변수에서 마켓 타입 확인
const MARKET_TYPE = process.env.MARKET_TYPE || 'ALL';

function shouldProcessExchange(exchange: string): boolean {
  if (MARKET_TYPE === 'ALL') return true;
  if (MARKET_TYPE === 'ASIA') return ASIA_EXCHANGES.includes(exchange);
  if (MARKET_TYPE === 'US') return US_EXCHANGES.includes(exchange);
  return true;
}

// ===== Firebase Admin 초기화 =====
let projectId: string;

if (getApps().length === 0) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!serviceAccountBase64) {
    console.error('[ERROR] FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
    process.exit(1);
  }

  try {
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    projectId = serviceAccount.project_id;

    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${projectId}.firebasestorage.app`,
    });
    console.log('[Firebase] Initialized');
  } catch (error) {
    console.error('[ERROR] Failed to parse service account:', error);
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

// ===== KIS API 설정 =====
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_BETWEEN_REQUESTS = 50; // ms (초당 20회 제한)

interface KISTokenCache {
  token: string;
  expiresAt: Timestamp;
}

// ===== KIS 토큰 관리 =====
async function getKISToken(): Promise<string> {
  try {
    // 1. Firebase에서 캐시된 토큰 확인
    const tokenDoc = await db.collection('settings').doc('kis_token').get();

    if (tokenDoc.exists) {
      const data = tokenDoc.data() as KISTokenCache;
      const expiresAt = data.expiresAt?.toDate?.() || new Date(0);

      // 토큰이 아직 유효하면 재사용 (5분 여유)
      if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
        console.log('[KIS] Using cached token');
        return data.token;
      }
    }

    // 2. 새 토큰 발급
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    const expiresIn = data.expires_in || 86400; // 기본 24시간

    // 3. Firebase에 토큰 캐시
    await db.collection('settings').doc('kis_token').set({
      token,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + (expiresIn - 300) * 1000)),
      updatedAt: Timestamp.now(),
    });

    console.log('[KIS] New token cached');
    return token;
  } catch (error) {
    console.error('[KIS] Token error:', error);
    throw error;
  }
}

// ===== 국내 주식 가격 조회 =====
async function getKoreanStockPrice(token: string, ticker: string): Promise<number> {
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
    throw new Error(`Korean stock API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.rt_cd !== '0') {
    throw new Error(`KIS API error: ${data.msg1}`);
  }

  return parseFloat(data.output.stck_prpr);
}

// ===== 해외 주식 가격 조회 =====
async function getOverseaStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
  // 거래소 코드 매핑
  const exchangeMap: Record<string, string> = {
    'NAS': 'NAS',   // NASDAQ
    'NYS': 'NYS',   // NYSE
    'AMS': 'AMS',   // AMEX
    'TSE': 'TSE',   // 도쿄
    'HKS': 'HKS',   // 홍콩
    'SHS': 'SHS',   // 상해
    'SZS': 'SZS',   // 심천
  };

  const excd = exchangeMap[exchange] || 'NAS';

  const response = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${excd}&SYMB=${ticker}`,
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
    throw new Error(`Oversea stock API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.rt_cd !== '0') {
    throw new Error(`KIS API error: ${data.msg1}`);
  }

  return parseFloat(data.output.last);
}

// ===== 가격 조회 (국내/해외 자동 판별) =====
async function getStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
  if (exchange === 'KRX') {
    return getKoreanStockPrice(token, ticker);
  } else {
    return getOverseaStockPrice(token, ticker, exchange);
  }
}

// ===== 메인 함수 =====
async function main() {
  const startTime = Date.now();
  console.log(`[CRON] ===== Starting stock price update (MARKET: ${MARKET_TYPE}) =====`);

  try {
    // 1. KIS 토큰 가져오기
    const token = await getKISToken();

    // 2. tickers 컬렉션에서 postCount > 0인 문서 조회
    const tickersSnapshot = await db.collection('tickers')
      .where('postCount', '>', 0)
      .get();

    console.log(`[CRON] Found ${tickersSnapshot.size} active tickers`);

    // 3. 기존 가격 JSON 로드 (있으면)
    let existingPrices: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = {};
    try {
      const file = bucket.file('stock-prices.json');
      const [exists] = await file.exists();
      if (exists) {
        const [content] = await file.download();
        const data = JSON.parse(content.toString());
        existingPrices = data.prices || {};
      }
    } catch (e) {
      console.log('[CRON] No existing price file, creating new one');
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const prices: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = { ...existingPrices };

    // 4. 각 ticker별 가격 조회
    for (const doc of tickersSnapshot.docs) {
      const data = doc.data();
      const ticker = data.ticker;
      const exchange = data.exchange;

      // 마켓 타입 필터링
      if (!shouldProcessExchange(exchange)) {
        continue;
      }

      try {
        const price = await getStockPrice(token, ticker, exchange);

        prices[ticker] = {
          currentPrice: price,
          exchange,
          lastUpdated: new Date().toISOString(),
        };

        console.log(`[CRON] ✓ ${ticker} (${exchange}): $${price}`);
        successCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CRON] ✗ ${ticker}: ${errorMsg}`);
        failCount++;
        errors.push(`${ticker}: ${errorMsg}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }

    // 5. Firebase Storage에 JSON 저장
    const jsonData = {
      lastUpdated: new Date().toISOString(),
      marketType: MARKET_TYPE,
      totalTickers: Object.keys(prices).length,
      successCount,
      failCount,
      prices,
    };

    const file = bucket.file('stock-prices.json');
    await file.save(JSON.stringify(jsonData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=300' }, // 5분 캐시
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON] ===== Completed: ${successCount} success, ${failCount} failed (${duration}s) =====`);
    console.log(`[STORAGE] stock-prices.json uploaded!`);

    if (errors.length > 0) {
      console.log(`[CRON] Errors: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ` +${errors.length - 5} more` : ''}`);
    }

  } catch (error) {
    console.error('[CRON] Critical error:', error);
    process.exit(1);
  }
}

main();
