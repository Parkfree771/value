/**
 * GitHub Actions 크론용 주식 가격 업데이트 스크립트
 *
 * 15분마다 실행되어 posts/market-call 컬렉션의 currentPrice를 업데이트
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ===== Firebase Admin 초기화 =====
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
    });
    console.log('[Firebase] Initialized');
  } catch (error) {
    console.error('[ERROR] Failed to parse service account:', error);
    process.exit(1);
  }
}

const db = getFirestore();

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
  console.log('[CRON] ===== Starting stock price update =====');

  try {
    // 1. KIS 토큰 가져오기
    const token = await getKISToken();

    // 2. posts 컬렉션에서 ticker, exchange가 있는 문서 조회
    const postsSnapshot = await db.collection('posts')
      .where('ticker', '!=', null)
      .get();

    // 3. market-call 컬렉션에서 target_ticker, exchange가 있는 문서 조회
    const marketCallSnapshot = await db.collection('market-call')
      .where('target_ticker', '!=', null)
      .get();

    console.log(`[CRON] Found ${postsSnapshot.size} posts, ${marketCallSnapshot.size} market-calls`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // 4. ticker별로 그룹화 (같은 종목 중복 조회 방지)
    const tickerMap = new Map<string, { exchange: string; docRefs: { collection: string; id: string }[] }>();

    // posts 문서 그룹화
    postsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const ticker = data.ticker;
      const exchange = data.exchange || data.stockData?.exchange;

      if (ticker && exchange) {
        const key = `${ticker}:${exchange}`;
        if (!tickerMap.has(key)) {
          tickerMap.set(key, { exchange, docRefs: [] });
        }
        tickerMap.get(key)!.docRefs.push({ collection: 'posts', id: doc.id });
      }
    });

    // market-call 문서 그룹화
    marketCallSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const ticker = data.target_ticker;
      const exchange = data.exchange || data.stockData?.exchange;

      if (ticker && exchange) {
        const key = `${ticker}:${exchange}`;
        if (!tickerMap.has(key)) {
          tickerMap.set(key, { exchange, docRefs: [] });
        }
        tickerMap.get(key)!.docRefs.push({ collection: 'market-call', id: doc.id });
      }
    });

    console.log(`[CRON] Grouped into ${tickerMap.size} unique tickers`);

    // 5. 각 ticker별 가격 조회 및 업데이트
    for (const [key, { exchange, docRefs }] of tickerMap) {
      const ticker = key.split(':')[0];

      try {
        const price = await getStockPrice(token, ticker, exchange);

        // 해당 ticker의 모든 문서 업데이트
        const updatePromises = docRefs.map(({ collection, id }) =>
          db.collection(collection).doc(id).update({
            currentPrice: price,
            lastPriceUpdate: Timestamp.now(),
          })
        );

        await Promise.all(updatePromises);

        console.log(`[CRON] ✓ ${ticker} (${exchange}): $${price} → ${docRefs.length} docs`);
        successCount += docRefs.length;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CRON] ✗ ${ticker}: ${errorMsg}`);
        failCount += docRefs.length;
        errors.push(`${ticker}: ${errorMsg}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON] ===== Completed: ${successCount} success, ${failCount} failed (${duration}s) =====`);

    if (errors.length > 0) {
      console.log(`[CRON] Errors: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ` +${errors.length - 5} more` : ''}`);
    }

  } catch (error) {
    console.error('[CRON] Critical error:', error);
    process.exit(1);
  }
}

main();
