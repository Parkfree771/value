import { NextResponse } from 'next/server';
import { getCachedFeed } from '@/lib/jsonCache';
import { isMarketOpen } from '@/lib/marketHours';
import type { FeedData } from '@/types/feed';

// feed.json을 클라이언트에 전달하는 프록시 API
// Firebase Storage CORS 문제 우회 + 메모리 캐시
const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

// 가격 갱신 TTL: 15분
const PRICE_REFRESH_TTL = 15 * 60 * 1000;
// 동시 갱신 방지: 갱신 후 최소 대기 시간 (같은 인스턴스 내)
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5분
// KIS API 배치 설정
const BATCH_SIZE = 5;
const BATCH_DELAY = 100; // ms

// 동시 갱신 방지 (같은 인스턴스 내)
let isRefreshing = false;
let lastRefreshAttempt = 0;

// feed.json fetch 함수
async function fetchFeedFromStorage(): Promise<FeedData> {
  const res = await fetch(FEED_URL, {
    next: { revalidate: 60 }, // Next.js 캐시 1분
  });

  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status}`);
  }

  return res.json();
}

/**
 * feed.json의 가격이 오래되었고 장이 열린 종목이 있으면 갱신합니다.
 * - Firestore DB 읽기 없음 (feed.json 자체의 종목 정보 사용)
 * - 장이 닫힌 거래소는 스킵
 * - 동시 갱신 방지 (lock)
 */
async function refreshPricesIfStale(feedData: FeedData): Promise<FeedData> {
  // 이미 갱신 중이면 현재 데이터 반환
  if (isRefreshing) return feedData;

  const now = Date.now();

  // 같은 인스턴스에서 최근에 갱신 시도했으면 스킵 (5분 쿨다운)
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN) return feedData;

  // lastUpdated 체크
  const lastUpdated = new Date(feedData.lastUpdated).getTime();
  const age = now - lastUpdated;

  if (age < PRICE_REFRESH_TTL) return feedData;

  // 갱신이 필요한 종목 추출 (장이 열린 거래소만)
  const uniqueTickers = new Map<string, { ticker: string; exchange: string }>();

  for (const post of feedData.posts) {
    const ticker = (post.ticker || '').toUpperCase().trim();
    const exchange = (post.exchange || '').toUpperCase().trim();
    if (!ticker || !exchange) continue;

    const key = `${ticker}:${exchange}`;
    if (!uniqueTickers.has(key) && isMarketOpen(exchange)) {
      uniqueTickers.set(key, { ticker, exchange });
    }
  }

  // 장이 열린 종목이 없으면 갱신 불필요
  if (uniqueTickers.size === 0) return feedData;

  // Lock 설정 + 쿨다운 시작
  isRefreshing = true;
  lastRefreshAttempt = now;
  console.log(`[Feed TTL] Refreshing ${uniqueTickers.size} tickers (feed age: ${Math.round(age / 1000 / 60)}min)`);

  try {
    // KIS 토큰 가져오기 (dynamic import로 서버 모듈 지연 로드)
    const { getKISTokenWithCache } = await import('@/lib/kisTokenManager');
    const token = await getKISTokenWithCache();

    // 가격 조회 (배치 병렬 처리)
    const updatedPrices: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = {};
    const tickerArray = Array.from(uniqueTickers.entries());
    let successCount = 0;

    for (let i = 0; i < tickerArray.length; i += BATCH_SIZE) {
      const batch = tickerArray.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async ([, { ticker, exchange }]) => {
          const price = await fetchPrice(token, ticker, exchange);
          return { ticker, exchange, price };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { ticker, exchange, price } = result.value;
          updatedPrices[ticker] = {
            currentPrice: price,
            exchange,
            lastUpdated: new Date().toISOString(),
          };
          successCount++;
        }
      }

      // 배치 간 딜레이 (마지막 배치 제외)
      if (i + BATCH_SIZE < tickerArray.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    if (successCount === 0) return feedData;

    // 수익률 재계산
    const { calculateReturn } = await import('@/utils/calculateReturn');

    const updatedFeed: FeedData = {
      ...feedData,
      lastUpdated: new Date().toISOString(),
      prices: { ...feedData.prices, ...updatedPrices },
      posts: feedData.posts.map(post => {
        const ticker = (post.ticker || '').toUpperCase();
        const priceData = updatedPrices[ticker];
        if (!priceData) return post;

        const returnRate = calculateReturn(
          post.initialPrice,
          priceData.currentPrice,
          post.positionType
        );

        return {
          ...post,
          currentPrice: priceData.currentPrice,
          returnRate: parseFloat(returnRate.toFixed(2)),
        };
      }),
    };

    // Firebase Storage에 저장 (await로 완료 보장 - serverless 종료 전 저장)
    try {
      await saveFeedToStorage(updatedFeed);
    } catch (err) {
      console.error('[Feed TTL] Failed to save feed.json:', err);
      // 저장 실패해도 사용자에게는 갱신된 데이터 반환
    }

    console.log(`[Feed TTL] Refreshed ${successCount}/${uniqueTickers.size} tickers`);
    return updatedFeed;

  } catch (error) {
    console.error('[Feed TTL] Refresh failed:', error);
    return feedData; // 실패 시 기존 데이터 반환
  } finally {
    isRefreshing = false;
  }
}

/** KIS/Upbit API로 개별 종목 가격 조회 */
async function fetchPrice(token: string, ticker: string, exchange: string): Promise<number> {
  const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';

  if (exchange === 'CRYPTO') {
    const market = `KRW-${ticker.toUpperCase()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Upbit API failed: ${res.status}`);
    const data = await res.json();
    if (!data || data.length === 0) throw new Error(`No data for ${ticker}`);
    return data[0].trade_price;
  }

  const isKorean = exchange === 'KRX';
  const url = isKorean
    ? `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`
    : `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${ticker}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      'tr_id': isKorean ? 'FHKST01010100' : 'HHDFS00000300',
    },
  });

  if (!res.ok) throw new Error(`KIS API failed: ${res.status}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS error: ${data.msg1}`);

  return parseFloat(isKorean ? data.output.stck_prpr : data.output.last);
}

/** feed.json을 Firebase Storage에 저장 */
async function saveFeedToStorage(feedData: FeedData): Promise<void> {
  const { adminStorage } = await import('@/lib/firebase-admin');
  const bucket = adminStorage.bucket();
  await bucket.file('feed.json').save(JSON.stringify(feedData, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  console.log('[Feed TTL] feed.json saved to Firebase Storage');
}

export async function GET() {
  try {
    // 메모리 캐시 사용 (1분 TTL, 2분 stale-while-revalidate)
    const data = await getCachedFeed(fetchFeedFromStorage) as FeedData;

    // 가격이 15분 이상 오래되었으면 장 열린 종목만 갱신
    const freshData = await refreshPricesIfStale(data);

    return NextResponse.json(freshData, {
      headers: {
        // 브라우저 캐시 1분 + CDN 캐시 1분 + 스테일 2분
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        // 캐시 검증용
        'Last-Modified': freshData.lastUpdated
          ? new Date(freshData.lastUpdated).toUTCString()
          : new Date().toUTCString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch feed.json:', error);
    return NextResponse.json(
      { posts: [], totalPosts: 0 },
      {
        status: 200,
        headers: {
          // 에러 시에도 짧은 캐시 (재시도 방지)
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  }
}
