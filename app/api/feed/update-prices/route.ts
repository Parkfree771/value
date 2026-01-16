/**
 * Feed 가격 업데이트 API
 *
 * POST /api/feed/update-prices
 *
 * feed.json의 모든 ticker에 대해:
 * 1. KIS API로 현재가 조회
 * 2. 수익률 재계산
 * 3. feed.json 업데이트
 */

import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { getKISTokenWithCache } from '@/lib/kisTokenManager';

// feed.json 구조
interface FeedPost {
  id: string;
  title: string;
  author: string;
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

// KIS API 설정
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_BETWEEN_REQUESTS = 60; // ms (초당 약 16회)

// 수익률 계산
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

// 국내 주식 가격 조회
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

// 해외 주식 가격 조회
async function getOverseaStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
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
    throw new Error(`Oversea stock API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.rt_cd !== '0') {
    throw new Error(`KIS API error: ${data.msg1}`);
  }

  return parseFloat(data.output.last);
}

// 가격 조회 (국내/해외 자동 판별)
async function getStockPrice(token: string, ticker: string, exchange: string): Promise<number> {
  if (exchange === 'KRX') {
    return getKoreanStockPrice(token, ticker);
  } else {
    return getOverseaStockPrice(token, ticker, exchange);
  }
}

export async function POST() {
  const startTime = Date.now();
  console.log('[Update Prices] ===== Starting price update =====');

  try {
    // 1. feed.json 읽기
    const bucket = adminStorage.bucket();
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: 'feed.json not found' },
        { status: 404 }
      );
    }

    const [content] = await file.download();
    const feedData: FeedData = JSON.parse(content.toString());

    console.log(`[Update Prices] Found ${feedData.posts.length} posts`);

    if (feedData.posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to update',
        updated: 0,
      });
    }

    // 2. 고유 ticker 추출
    const uniqueTickers: Map<string, { ticker: string; exchange: string }> = new Map();

    for (const post of feedData.posts) {
      const ticker = (post.ticker || '').toUpperCase().trim();
      const exchange = (post.exchange || '').toUpperCase().trim();

      if (!ticker || !exchange) continue;

      // 이미 확정된 포지션은 스킵
      if (post.is_closed) continue;

      const tickerKey = `${ticker}:${exchange}`;
      if (!uniqueTickers.has(tickerKey)) {
        uniqueTickers.set(tickerKey, { ticker, exchange });
      }
    }

    console.log(`[Update Prices] Unique tickers to fetch: ${uniqueTickers.size}`);

    // 3. KIS 토큰 가져오기
    const token = await getKISTokenWithCache();

    // 4. 가격 조회
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

        console.log(`[Update Prices] ✓ ${ticker} (${exchange}): ${price}`);
        successCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Update Prices] ✗ ${ticker}: ${errorMsg}`);
        failCount++;
        errors.push(`${ticker}: ${errorMsg}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }

    // 5. 각 게시글의 수익률 재계산
    for (const post of feedData.posts) {
      // 이미 확정된 포지션은 스킵
      if (post.is_closed && post.closed_return_rate != null) {
        continue;
      }

      const ticker = (post.ticker || '').toUpperCase();
      const priceData = prices[ticker];

      if (priceData) {
        post.currentPrice = priceData.currentPrice;
        post.returnRate = parseFloat(
          calculateReturn(post.initialPrice, priceData.currentPrice, post.positionType).toFixed(2)
        );
      }
    }

    // 6. prices 맵 업데이트 (기존 + 새로운 가격)
    feedData.prices = {
      ...feedData.prices,
      ...prices,
    };

    feedData.lastUpdated = new Date().toISOString();

    // 7. feed.json 저장
    await bucket.file('feed.json').save(JSON.stringify(feedData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Update Prices] ===== Completed: ${successCount}/${uniqueTickers.size} tickers (${duration}s) =====`);

    return NextResponse.json({
      success: true,
      message: `가격 업데이트 완료`,
      stats: {
        totalPosts: feedData.posts.length,
        tickersUpdated: successCount,
        tickersFailed: failCount,
        duration: `${duration}s`,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });

  } catch (error: any) {
    console.error('[Update Prices] Critical error:', error);
    return NextResponse.json(
      { error: error.message || 'Price update failed' },
      { status: 500 }
    );
  }
}

// GET도 지원 (브라우저에서 쉽게 테스트 가능)
export async function GET() {
  return POST();
}
