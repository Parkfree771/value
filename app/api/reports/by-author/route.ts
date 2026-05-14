/**
 * GET /api/reports/by-author?uid=...
 *
 * Firestore posts 컬렉션에서 authorId == uid 인 글만 가져와
 * feed.json 가격 캐시와 합쳐 returnRate 를 런타임에 계산하여 반환.
 * 마이페이지·사용자 프로필 페이지가 feed.json 전체 다운로드를 피하기 위해 사용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, Timestamp } from '@/lib/firebase-admin';
import { calculateReturn } from '@/utils/calculateReturn';
import type { FeedData } from '@/types/feed';

// 모듈 단위 메모리 캐시 (서버리스 인스턴스 안에서만 유효)
// feed.json 47KB 를 매 요청마다 Storage 에서 받지 않도록 1분 TTL.
interface FeedSnapshot {
  priceMap: Record<string, { currentPrice: number; exchange: string }>;
  badgeByAuthor: Record<string, string | null>;
}
let feedCache: FeedSnapshot | null = null;
let feedCachedAt = 0;
const FEED_TTL_MS = 60 * 1000;

async function loadFeedSnapshot(): Promise<FeedSnapshot> {
  const now = Date.now();
  if (feedCache && now - feedCachedAt < FEED_TTL_MS) {
    return feedCache;
  }

  try {
    const bucket = adminStorage.bucket();
    const [content] = await bucket.file('feed.json').download();
    const feed = JSON.parse(content.toString()) as FeedData;
    const priceMap: Record<string, { currentPrice: number; exchange: string }> = {};
    const badgeByAuthor: Record<string, string | null> = {};
    for (const p of feed.posts) {
      const t = (p.ticker || '').toUpperCase();
      if (t) priceMap[t] = { currentPrice: p.currentPrice, exchange: p.exchange };
      if (p.authorId && !(p.authorId in badgeByAuthor)) {
        badgeByAuthor[p.authorId] = p.equippedBadgeId ?? null;
      }
    }
    for (const [t, v] of Object.entries(feed.prices || {})) {
      if (!priceMap[t]) priceMap[t] = { currentPrice: v.currentPrice, exchange: v.exchange };
    }
    feedCache = { priceMap, badgeByAuthor };
    feedCachedAt = now;
    return feedCache;
  } catch (e) {
    console.error('[by-author] feed.json load 실패:', e);
    return feedCache ?? { priceMap: {}, badgeByAuthor: {} };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = (searchParams.get('uid') || '').trim();

  if (!uid) {
    return NextResponse.json({ error: 'uid가 필요합니다.' }, { status: 400 });
  }

  try {
    const [snap, feed] = await Promise.all([
      adminDb.collection('posts').where('authorId', '==', uid).get(),
      loadFeedSnapshot(),
    ]);
    const priceMap = feed.priceMap;
    const equippedBadgeId = feed.badgeByAuthor[uid] ?? null;

    const reports = snap.docs.map((doc) => {
      const data = doc.data() as any;

      let createdAtStr = '';
      if (data.createdAt instanceof Timestamp) {
        createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      }

      const ticker = (data.ticker || '').toUpperCase();
      const initialPrice = Number(data.initialPrice) || 0;
      const currentPrice = priceMap[ticker]?.currentPrice ?? Number(data.currentPrice) ?? 0;
      const positionType: 'long' | 'short' =
        data.positionType || (data.opinion === 'sell' ? 'short' : 'long');
      const returnRate = currentPrice && initialPrice
        ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
        : 0;

      return {
        id: doc.id,
        title: data.title || '',
        author: data.authorName || '',
        authorId: data.authorId || '',
        equippedBadgeId,
        stockName: data.stockName || '',
        ticker: data.ticker || '',
        exchange: data.exchange || '',
        opinion: data.opinion || 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate,
        targetPrice: Number(data.targetPrice) || 0,
        createdAt: createdAtStr,
        views: data.views || 0,
        likes: data.likes || 0,
        category: data.category || '',
        stockData: data.stockData || null,
        themes: data.themes || [],
      };
    });

    // 최신순
    reports.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );

    return NextResponse.json(
      { reports, count: reports.length },
      {
        headers: {
          // 본인 글이라 캐시 짧게
          'Cache-Control': 'private, max-age=30',
        },
      },
    );
  } catch (e: any) {
    console.error('[by-author] error:', e);
    return NextResponse.json({ error: e?.message || '조회 실패' }, { status: 500 });
  }
}
