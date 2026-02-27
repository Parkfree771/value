/**
 * Feed JSON 초기화 API
 * posts 컬렉션에서 데이터를 읽어 feed.json 생성
 */

import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { calculateReturn } from '@/utils/calculateReturn';
import type { FeedPost } from '@/types/feed';

export async function POST() {
  try {
    console.log('[Feed Init] Starting...');

    // posts 컬렉션 읽기
    const postsSnapshot = await adminDb.collection('posts')
      .orderBy('createdAt', 'desc')
      .get();

    console.log(`[Feed Init] Found ${postsSnapshot.size} posts`);

    const feedPosts: FeedPost[] = [];
    const prices: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = {};

    for (const docSnap of postsSnapshot.docs) {
      const data = docSnap.data();
      const ticker = (data.ticker || '').toUpperCase();
      const exchange = data.exchange || '';
      const initialPrice = data.initialPrice || 0;
      const avgPrice = data.avgPrice || undefined;
      const entries = data.entries || undefined;
      const currentPrice = data.currentPrice || initialPrice;
      const positionType: 'long' | 'short' = data.positionType || (data.opinion === 'sell' ? 'short' : 'long');

      // 수익률 계산 (물타기 평균단가 우선)
      const basePrice = avgPrice || initialPrice;
      let returnRate: number;
      if (data.is_closed && data.closed_return_rate != null) {
        returnRate = data.closed_return_rate;
      } else {
        returnRate = calculateReturn(basePrice, currentPrice, positionType);
      }

      let createdAtStr = '';
      if (data.createdAt?.toDate) {
        createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else {
        createdAtStr = new Date().toISOString().split('T')[0];
      }

      feedPosts.push({
        id: docSnap.id,
        title: data.title || '',
        author: data.authorName || '익명',
        stockName: data.stockName || '',
        ticker: data.ticker || '',
        exchange,
        opinion: data.opinion || 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate: parseFloat(returnRate.toFixed(2)),
        createdAt: createdAtStr,
        views: data.views || 0,
        likes: data.likes || 0,
        category: data.category || '',
        targetPrice: data.targetPrice || 0,
        is_closed: data.is_closed || false,
        closed_return_rate: data.closed_return_rate,
        entries,
        avgPrice,
        themes: data.themes || undefined,
      });

      // prices 맵에 추가
      if (ticker && !prices[ticker]) {
        prices[ticker] = {
          currentPrice,
          exchange,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    // feed.json 저장
    const feedData = {
      lastUpdated: new Date().toISOString(),
      totalPosts: feedPosts.length,
      posts: feedPosts,
      prices,
    };

    const bucket = adminStorage.bucket();
    await bucket.file('feed.json').save(JSON.stringify(feedData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });

    console.log(`[Feed Init] Created feed.json with ${feedPosts.length} posts`);

    return NextResponse.json({
      success: true,
      message: `feed.json 생성 완료 (${feedPosts.length}개 게시글)`,
      totalPosts: feedPosts.length,
    });
  } catch (error: any) {
    console.error('[Feed Init] Error:', error);
    return NextResponse.json(
      { error: error.message || 'feed.json 생성 실패' },
      { status: 500 }
    );
  }
}
