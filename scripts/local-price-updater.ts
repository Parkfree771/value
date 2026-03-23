/**
 * 로컬 주식 가격 업데이트 스케줄러
 *
 * PC에서 상시 실행하면 장 시간에 맞춰 자동으로 가격을 업데이트합니다.
 *
 * 실행:
 *   npx tsx scripts/local-price-updater.ts
 *
 * 스케줄:
 *   - 아시아 장 (09:00~17:00 KST): 15분마다 실행
 *   - 미국 장 (22:30~06:00 KST): 15분마다 실행
 *   - 암호화폐: 매시간 실행 (24시간)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ===== 거래소 그룹 =====
const ASIA_EXCHANGES = ['KRX', 'TSE', 'SHS', 'SZS', 'HKS'];
const US_EXCHANGES = ['NAS', 'NYS', 'AMS'];

type MarketType = 'ASIA' | 'US' | 'CRYPTO' | 'ALL';

function shouldProcessExchange(exchange: string, marketType: MarketType): boolean {
  if (exchange === 'CRYPTO') return marketType === 'CRYPTO' || marketType === 'ALL';
  if (marketType === 'ALL') return true;
  if (marketType === 'ASIA') return ASIA_EXCHANGES.includes(exchange);
  if (marketType === 'US') return US_EXCHANGES.includes(exchange);
  return true;
}

// ===== 타입 =====
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

// ===== Firebase Admin 초기화 =====
if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'));
    initializeApp({
      credential: cert(sa),
      storageBucket: `${sa.project_id}.firebasestorage.app`,
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('[ERROR] Firebase 인증 정보가 없습니다.');
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

// ===== KIS API =====
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_BETWEEN_REQUESTS = 50;

function calculateReturn(initial: number, current: number, positionType: 'long' | 'short'): number {
  if (initial <= 0 || current <= 0) return 0;
  return positionType === 'long'
    ? ((current - initial) / initial) * 100
    : ((initial - current) / initial) * 100;
}

async function getKISToken(): Promise<string> {
  const tokenDoc = await db.collection('settings').doc('kis_token').get();
  if (tokenDoc.exists) {
    const data = tokenDoc.data()!;
    const expiresAt = data.expiresAt?.toDate?.() || new Date(0);
    if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return data.token;
    }
  }

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

  await db.collection('settings').doc('kis_token').set({
    token: data.access_token,
    expiresAt: Timestamp.fromDate(new Date(Date.now() + ((data.expires_in || 86400) - 300) * 1000)),
    updatedAt: Timestamp.now(),
  });

  return data.access_token;
}

async function getKoreanStockPrice(token: string, ticker: string): Promise<number> {
  const res = await fetch(
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
  if (!res.ok) throw new Error(`Korean stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS: ${data.msg1}`);
  return parseFloat(data.output.stck_prpr);
}

async function getOverseaStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
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
  if (!res.ok) throw new Error(`Oversea stock API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS: ${data.msg1}`);
  return parseFloat(data.output.last);
}

async function getCryptoPrice(ticker: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${ticker.toUpperCase()}`, {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' },
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`Upbit API failed: ${res.status}`);
  const data = await res.json();
  if (!data?.length) throw new Error(`No data for ${ticker}`);
  return data[0].trade_price;
}

async function getStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
  if (exchange === 'CRYPTO') return getCryptoPrice(ticker);
  if (exchange === 'KRX') return getKoreanStockPrice(token, ticker);
  return getOverseaStockPrice(token, ticker, exchange);
}

// ===== 가격 업데이트 메인 로직 =====
// feed.json만 읽고 가격만 갱신 (Firestore 읽기 없음)
async function updatePrices(marketType: MarketType) {
  const startTime = Date.now();
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${now}] 가격 업데이트 시작 (${marketType})`);
  console.log('='.repeat(60));

  try {
    // 1. feed.json 읽기 (게시글 목록 + 가격 모두 여기에 있음)
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (!exists) {
      console.log('  feed.json 없음 - 스킵');
      return;
    }

    const [content] = await file.download();
    const feedData: FeedData = JSON.parse(content.toString());

    if (feedData.posts.length === 0) {
      console.log('  게시글 없음');
      return;
    }

    // 2. feed.json의 게시글에서 대상 티커 수집 (Firestore 접근 없음)
    const uniqueTickers = new Map<string, { ticker: string; exchange: string }>();

    for (const post of feedData.posts) {
      const ticker = (post.ticker || '').toUpperCase().trim();
      const exchange = (post.exchange || '').toUpperCase().trim();
      if (!ticker || !exchange) continue;

      if (shouldProcessExchange(exchange, marketType)) {
        const key = `${ticker}:${exchange}`;
        if (!uniqueTickers.has(key)) {
          uniqueTickers.set(key, { ticker, exchange });
        }
      }
    }

    console.log(`  게시글 ${feedData.posts.length}개 / 조회 대상 티커 ${uniqueTickers.size}개`);

    if (uniqueTickers.size === 0) {
      console.log('  조회할 티커 없음 - 스킵');
      return;
    }

    // 3. KIS 토큰
    const token = await getKISToken();

    // 4. 가격 조회
    const newPrices: FeedData['prices'] = {};
    let ok = 0, fail = 0;

    for (const [, { ticker, exchange }] of uniqueTickers) {
      try {
        const price = await getStockPrice(token, ticker, exchange);
        newPrices[ticker] = {
          currentPrice: price,
          exchange,
          lastUpdated: new Date().toISOString(),
        };
        console.log(`  ✓ ${ticker} (${exchange}): ${price.toLocaleString()}`);
        ok++;
      } catch (err: any) {
        console.error(`  ✗ ${ticker}: ${err.message}`);
        fail++;
      }
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }

    // 5. 가격 병합 + 게시글 수익률 재계산
    const mergedPrices = { ...feedData.prices, ...newPrices };

    for (const post of feedData.posts) {
      const ticker = (post.ticker || '').toUpperCase();
      const priceData = mergedPrices[ticker];
      if (priceData) {
        post.currentPrice = priceData.currentPrice;
        post.returnRate = parseFloat(
          calculateReturn(post.initialPrice, priceData.currentPrice, post.positionType).toFixed(2)
        );
      }
    }

    feedData.prices = mergedPrices;
    feedData.lastUpdated = new Date().toISOString();

    // 6. 저장
    await bucket.file('feed.json').save(JSON.stringify(feedData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });

    await bucket.file('stock-prices.json').save(JSON.stringify({
      lastUpdated: new Date().toISOString(),
      marketType,
      totalTickers: Object.keys(mergedPrices).length,
      successCount: ok,
      failCount: fail,
      prices: mergedPrices,
    }, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=300' },
    });

    const sec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  완료! ${ok}개 성공 / ${fail}개 실패 (${sec}초)`);

  } catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
  }
}

// ===== 스케줄러 =====
function startScheduler() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║    Value - 로컬 가격 업데이트 스케줄러       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║                                              ║');
  console.log('║  아시아 장  09:00~17:00 KST  15분마다        ║');
  console.log('║  미국   장  22:30~06:00 KST  15분마다        ║');
  console.log('║  암호화폐   24시간           매시간           ║');
  console.log('║                                              ║');
  console.log('║  Ctrl+C 로 종료                              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 아시아 장: 09:00~17:00 KST, 15분마다 (평일)
  // KST = UTC+9, cron은 시스템 시간 기준
  // node-cron timezone 옵션 사용
  cron.schedule('*/15 9-16 * * 1-5', () => {
    updatePrices('ASIA');
  }, { timezone: 'Asia/Seoul' });

  // 미국 장: 22:30~06:00 KST, 15분마다 (평일 기준 - 월~금 밤 + 화~토 새벽)
  // 22:00~23:59 KST (월~금)
  cron.schedule('*/15 22-23 * * 1-5', () => {
    updatePrices('US');
  }, { timezone: 'Asia/Seoul' });

  // 00:00~06:00 KST (화~토 = 월~금 밤의 연장)
  cron.schedule('*/15 0-5 * * 2-6', () => {
    updatePrices('US');
  }, { timezone: 'Asia/Seoul' });

  // 암호화폐: 매시간 0분 (매일)
  cron.schedule('0 * * * *', () => {
    updatePrices('CRYPTO');
  }, { timezone: 'Asia/Seoul' });

  // 시작 시 즉시 1회 실행
  const kstHour = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  });
  const hour = parseInt(kstHour);
  const day = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  });
  const isWeekday = !['Sat', 'Sun'].includes(day);

  console.log(`현재 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (${day})`);

  // 현재 장 시간이면 즉시 실행
  if (isWeekday && hour >= 9 && hour < 17) {
    console.log('→ 아시아 장 시간 - 즉시 업데이트 시작');
    updatePrices('ASIA');
  } else if ((isWeekday && hour >= 22) || (!['Sun', 'Sat'].includes(day) && hour < 6)) {
    console.log('→ 미국 장 시간 - 즉시 업데이트 시작');
    updatePrices('US');
  } else {
    console.log('→ 장 시간 외 - 암호화폐만 업데이트');
    updatePrices('CRYPTO');
  }

  console.log('\n스케줄러 대기 중... (다음 실행까지 대기)\n');
}

startScheduler();
