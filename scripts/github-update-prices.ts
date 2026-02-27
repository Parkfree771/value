/**
 * GitHub Actions 크론용 주식 가격 업데이트 스크립트
 *
 * 15분마다 실행되어:
 * 1. posts 컬렉션에서 모든 게시글 읽기 (views, likes 등 최신 정보)
 * 2. 고유 ticker 추출 후 현재가 조회
 * 3. 수익률 계산
 * 4. feed.json으로 저장 (메인 페이지용)
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
  // 암호화폐는 24시간 거래이므로 항상 처리
  if (exchange === 'CRYPTO') return true;
  if (MARKET_TYPE === 'ALL') return true;
  if (MARKET_TYPE === 'ASIA') return ASIA_EXCHANGES.includes(exchange);
  if (MARKET_TYPE === 'US') return US_EXCHANGES.includes(exchange);
  return true;
}

// ===== 타입 정의 =====
interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorId: string;
  stockName: string;
  ticker: string;
  exchange: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType: 'long' | 'short';
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  createdAt: string;
  views: number;
  likes: number;
  category: string;
  is_closed?: boolean;
  closed_return_rate?: number;
  entries?: { price: number; date: string; timestamp: string }[];
  avgPrice?: number;
  themes?: string[];
}

interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: FeedPost[];
  prices: Record<string, {
    currentPrice: number;
    exchange: string;
    lastUpdated: string;
  }>;
}

interface KISTokenCache {
  token: string;
  expiresAt: Timestamp;
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

// ===== 수익률 계산 =====
function calculateReturn(
  initialPrice: number,
  currentPrice: number,
  positionType: 'long' | 'short'
): number {
  if (initialPrice <= 0 || currentPrice <= 0) return 0;

  if (positionType === 'long') {
    return ((currentPrice - initialPrice) / initialPrice) * 100;
  } else {
    return ((initialPrice - currentPrice) / initialPrice) * 100;
  }
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
  const exchangeMap: Record<string, string> = {
    'NAS': 'NAS',
    'NYS': 'NYS',
    'AMS': 'AMS',
    'TSE': 'TSE',
    'HKS': 'HKS',
    'SHS': 'SHS',
    'SZS': 'SZS',
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

// ===== 암호화폐 가격 조회 (업비트 API) =====
async function getCryptoPrice(ticker: string): Promise<number> {
  const market = `KRW-${ticker.toUpperCase()}`;
  const url = `https://api.upbit.com/v1/ticker?markets=${market}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' },
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Upbit API failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    throw new Error(`No data for ${ticker}`);
  }

  return data[0].trade_price;
}

// ===== 가격 조회 (국내/해외/암호화폐 자동 판별) =====
async function getStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
  if (exchange === 'CRYPTO') {
    return getCryptoPrice(ticker);
  } else if (exchange === 'KRX') {
    return getKoreanStockPrice(token, ticker);
  } else {
    return getOverseaStockPrice(token, ticker, exchange);
  }
}

// ===== 기존 feed.json 읽기 =====
async function getExistingFeed(): Promise<FeedData> {
  try {
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (!exists) {
      return {
        lastUpdated: new Date().toISOString(),
        totalPosts: 0,
        posts: [],
        prices: {},
      };
    }

    const [content] = await file.download();
    return JSON.parse(content.toString()) as FeedData;
  } catch (error) {
    console.error('[CRON] Error reading existing feed.json:', error);
    return {
      lastUpdated: new Date().toISOString(),
      totalPosts: 0,
      posts: [],
      prices: {},
    };
  }
}

// ===== 메인 함수 =====
async function main() {
  const startTime = Date.now();
  console.log(`[CRON] ===== Starting feed.json update (MARKET: ${MARKET_TYPE}) =====`);

  try {
    // 1. 기존 feed.json 읽기 (다른 마켓 데이터 보존용)
    console.log('[CRON] Reading existing feed.json...');
    const existingFeed = await getExistingFeed();
    console.log(`[CRON] Existing feed has ${existingFeed.posts.length} posts`);

    // 2. posts 컬렉션에서 모든 게시글 읽기
    console.log('[CRON] Reading posts collection...');
    const postsSnapshot = await db.collection('posts')
      .orderBy('createdAt', 'desc')
      .get();

    console.log(`[CRON] Found ${postsSnapshot.size} posts in DB`);

    if (postsSnapshot.empty) {
      console.log('[CRON] No posts found in DB');
      return;
    }

    // 3. 게시글 데이터 수집 - 현재 마켓용 & 전체 DB 게시글
    const currentMarketPosts: Array<{
      id: string;
      data: any;
      tickerKey: string;
    }> = [];

    const allDbPosts: Array<{
      id: string;
      data: any;
      exchange: string;
    }> = [];

    const uniqueTickers: Map<string, { ticker: string; exchange: string }> = new Map();

    for (const docSnap of postsSnapshot.docs) {
      const data = docSnap.data();
      const ticker = (data.ticker || '').toUpperCase().trim();
      const exchange = (data.exchange || '').toUpperCase().trim();

      if (!ticker || !exchange) continue;

      // 모든 게시글 저장 (나중에 병합용)
      allDbPosts.push({ id: docSnap.id, data, exchange });

      // 현재 마켓에 해당하는 게시글만 가격 조회 대상
      if (!shouldProcessExchange(exchange)) continue;

      const tickerKey = `${ticker}:${exchange}`;
      currentMarketPosts.push({ id: docSnap.id, data, tickerKey });

      // 고유 ticker 수집 (중복 제거)
      if (!uniqueTickers.has(tickerKey)) {
        uniqueTickers.set(tickerKey, { ticker, exchange });
      }
    }

    console.log(`[CRON] Posts for current market (${MARKET_TYPE}): ${currentMarketPosts.length}`);
    console.log(`[CRON] Unique tickers to fetch: ${uniqueTickers.size}`);

    // 3. KIS 토큰 가져오기
    const token = await getKISToken();

    // 4. 고유 ticker별 현재가 조회 (한 번만 조회)
    const prices: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = {};
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const [tickerKey, { ticker, exchange }] of uniqueTickers) {
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

    // 5. 기존 feed.json의 prices 병합 (다른 마켓 가격 보존)
    const mergedPrices = { ...existingFeed.prices, ...prices };

    // 6. 모든 DB 게시글에 대해 FeedPost 생성 (가격은 병합된 prices 사용)
    const feedPosts: FeedPost[] = [];

    for (const { id, data, exchange } of allDbPosts) {
      const ticker = (data.ticker || '').toUpperCase();
      const priceData = mergedPrices[ticker];

      // 현재 마켓이면 새 가격, 아니면 기존 가격 또는 DB 가격 사용
      const currentPrice = priceData?.currentPrice || data.currentPrice || 0;
      const initialPrice = data.initialPrice || 0;
      const avgPrice = data.avgPrice || undefined;
      const entries = data.entries || undefined;

      // positionType 결정 (opinion 기반)
      const positionType: 'long' | 'short' =
        data.positionType || (data.opinion === 'sell' ? 'short' : 'long');

      // 수익률 계산 (물타기 평균단가 우선, 확정된 포지션은 확정 수익률 사용)
      const basePrice = avgPrice || initialPrice;
      let returnRate: number;
      if (data.is_closed && data.closed_return_rate != null) {
        returnRate = data.closed_return_rate;
      } else {
        returnRate = calculateReturn(basePrice, currentPrice, positionType);
      }

      // createdAt 변환
      let createdAtStr = '';
      if (data.createdAt?.toDate) {
        createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else {
        createdAtStr = new Date().toISOString().split('T')[0];
      }

      feedPosts.push({
        id,
        title: data.title || '',
        author: data.authorName || '익명',
        authorId: data.authorId || '',
        stockName: data.stockName || '',
        ticker: data.ticker || '',
        exchange: data.exchange || '',
        opinion: data.opinion || 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate: parseFloat(returnRate.toFixed(2)),
        createdAt: createdAtStr,
        views: data.views || 0,
        likes: data.likes || 0,
        category: data.category || '',
        is_closed: data.is_closed || false,
        closed_return_rate: data.closed_return_rate,
        entries,
        avgPrice,
        themes: data.themes || undefined,
      });
    }

    // 7. feed.json 저장 (모든 게시글 포함)
    const feedData: FeedData = {
      lastUpdated: new Date().toISOString(),
      totalPosts: feedPosts.length,
      posts: feedPosts,
      prices: mergedPrices,
    };

    await bucket.file('feed.json').save(JSON.stringify(feedData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON] ===== Completed: ${successCount} tickers updated, ${feedPosts.length} total posts (${duration}s) =====`);
    console.log(`[STORAGE] feed.json uploaded!`);

    if (errors.length > 0) {
      console.log(`[CRON] Errors: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ` +${errors.length - 5} more` : ''}`);
    }

    // 8. 기존 stock-prices.json도 업데이트 (하위 호환성 - 병합된 가격)
    const stockPricesData = {
      lastUpdated: new Date().toISOString(),
      marketType: MARKET_TYPE,
      totalTickers: Object.keys(mergedPrices).length,
      successCount,
      failCount,
      prices: mergedPrices,
    };

    await bucket.file('stock-prices.json').save(JSON.stringify(stockPricesData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=300' },
    });
    console.log('[STORAGE] stock-prices.json also updated (backward compatibility)');

  } catch (error) {
    console.error('[CRON] Critical error:', error);
    process.exit(1);
  }
}

main();
