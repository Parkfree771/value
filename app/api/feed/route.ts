/**
 * Feed JSON 관리 API
 *
 * POST: 새 게시글 추가 (게시글 작성 시 호출)
 * DELETE: 게시글 제거 (게시글 삭제 시 호출)
 *
 * 이 API는 feed.json에 즉시 반영하여 메인 페이지 로딩 속도 개선
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, verifyAuthToken } from '@/lib/firebase-admin';
import { checkRateLimitRedis } from '@/lib/rate-limit-redis';
import { getClientIP, setRateLimitHeaders } from '@/lib/rate-limit';
import { calculateReturn } from '@/utils/calculateReturn';
import { pingIndexNow } from '@/lib/indexnow';
import { recomputeAllUserStatsFromFeed } from '@/lib/userStats';
import type { FeedPost, FeedData } from '@/types/feed';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr').replace(/\/$/, '');

// Rate Limit 설정: 시간당 10개 게시글 (스팸 방지)
const POST_RATE_LIMIT = 10;
const POST_RATE_WINDOW = 60 * 60 * 1000; // 1시간

// Firebase Storage에서 feed.json 읽기
async function getFeed(): Promise<FeedData> {
  try {
    const bucket = adminStorage.bucket();
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
    console.error('[Feed API] Error reading feed.json:', error);
    return {
      lastUpdated: new Date().toISOString(),
      totalPosts: 0,
      posts: [],
      prices: {},
    };
  }
}

// Firebase Storage에 feed.json 저장
async function saveFeed(feedData: FeedData): Promise<void> {
  const bucket = adminStorage.bucket();
  const file = bucket.file('feed.json');

  await file.save(JSON.stringify(feedData, null, 2), {
    contentType: 'application/json',
    metadata: {
      cacheControl: 'public, max-age=60',
    },
  });
}

/**
 * POST: 새 게시글을 feed.json에 추가
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // Rate Limit 체크 (사용자 ID + IP 기반)
    const clientIP = getClientIP(request);
    const rateLimitKey = `post:${userId}:${clientIP}`;
    const rateLimitResult = await checkRateLimitRedis(
      rateLimitKey,
      POST_RATE_LIMIT,
      POST_RATE_WINDOW
    );

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: '게시글 작성이 너무 빈번합니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult, POST_RATE_LIMIT);
      return response;
    }

    const body = await request.json();
    const { postId, postData } = body;

    if (!postId || !postData) {
      return NextResponse.json(
        { error: 'postId와 postData가 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 feed.json 읽기 + 작성자 장착 배지 1회 조회 (병렬)
    const { BADGES_BY_ID } = await import('@/lib/badges');
    const [feed, authorSnap] = await Promise.all([
      getFeed(),
      adminDb.collection('users').doc(userId).get(),
    ]);
    const authorEquipped = (() => {
      const v = authorSnap.exists ? (authorSnap.data() as any)?.equippedBadgeId : null;
      return typeof v === 'string' && BADGES_BY_ID[v] ? v : null;
    })();

    // 수익률 계산 (작성 시점에는 initialPrice = currentPrice)
    const positionType: 'long' | 'short' =
      postData.positionType || (postData.opinion === 'sell' ? 'short' : 'long');

    const returnRate = calculateReturn(
      postData.initialPrice,
      postData.currentPrice,
      positionType
    );

    // 새 FeedPost 생성
    const newPost: FeedPost = {
      id: postId,
      title: postData.title || '',
      author: postData.authorName || '익명',
      authorId: userId,
      equippedBadgeId: authorEquipped,
      stockName: postData.stockName || '',
      ticker: postData.ticker || '',
      exchange: postData.exchange || '',
      opinion: postData.opinion || 'hold',
      positionType,
      initialPrice: postData.initialPrice || 0,
      currentPrice: postData.currentPrice || postData.initialPrice || 0,
      returnRate: parseFloat(returnRate.toFixed(2)),
      createdAt: new Date().toISOString().split('T')[0],
      views: 0,
      likes: 0,
      category: postData.category || '',
      targetPrice: postData.targetPrice || 0,
      themes: postData.themes || undefined,
    };

    // 중복 체크 후 추가 (기존 포스트의 크론 관리 데이터 보존)
    const existingIndex = feed.posts.findIndex(p => p.id === postId);
    if (existingIndex >= 0) {
      const existing = feed.posts[existingIndex];
      // 크론이 관리하는 현재가/수익률 보존 (수정 페이지의 stale 값으로 덮어쓰기 방지)
      newPost.currentPrice = existing.currentPrice;
      newPost.returnRate = existing.returnRate;
      // 테마 데이터 보존
      if (!newPost.themes && existing.themes) {
        newPost.themes = existing.themes;
      }
      // 기존 views/likes 보존
      newPost.views = existing.views || 0;
      newPost.likes = existing.likes || 0;
      feed.posts[existingIndex] = newPost;
    } else {
      feed.posts.unshift(newPost);
    }

    // prices에 ticker 추가 (없는 경우)
    const tickerUpper = newPost.ticker.toUpperCase();
    if (tickerUpper && !feed.prices[tickerUpper]) {
      feed.prices[tickerUpper] = {
        currentPrice: newPost.currentPrice,
        exchange: newPost.exchange,
        lastUpdated: new Date().toISOString(),
      };
    }

    // 메타데이터 업데이트
    feed.totalPosts = feed.posts.length;
    feed.lastUpdated = new Date().toISOString();

    // 저장
    await saveFeed(feed);

    console.log(`[Feed API] Post ${postId} added to feed.json`);

    // 사용자 통계·해금배지 재계산 (실패해도 응답에는 영향 없음)
    recomputeAllUserStatsFromFeed(feed.posts).catch((err) =>
      console.warn('[Feed API] user stats recompute 실패:', err?.message || err),
    );

    // IndexNow: Bing/네이버/Yandex에 새 글/수정 즉시 통보
    // 새 글이면 sitemap·홈도 함께 통보하여 신규 발견 가속
    const reportUrl = `${SITE_URL}/reports/${postId}`;
    const urlsToNotify = existingIndex >= 0
      ? [reportUrl]
      : [reportUrl, `${SITE_URL}/`, `${SITE_URL}/sitemap.xml`, `${SITE_URL}/feed.xml`];
    pingIndexNow(urlsToNotify).catch((err) =>
      console.warn('[Feed API] IndexNow 핑 실패:', err?.message || err),
    );

    return NextResponse.json({
      success: true,
      message: '게시글이 피드에 추가되었습니다.',
    });
  } catch (error) {
    console.error('[Feed API] POST error:', error);
    return NextResponse.json(
      { error: '피드 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 게시글을 feed.json에서 제거
 */
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // Rate Limit 체크 (삭제도 제한 - 분당 30회)
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimitRedis(
      `delete:${userId}:${clientIP}`,
      30,
      60 * 1000 // 1분
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'postId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 feed.json 읽기
    const feed = await getFeed();

    // 해당 게시글 찾기
    const removedPost = feed.posts.find(p => p.id === postId);

    if (!removedPost) {
      // 게시글이 feed에 없으면 그냥 성공 처리
      return NextResponse.json({
        success: true,
        message: '게시글이 이미 피드에 없습니다.',
      });
    }

    // 게시글 제거
    feed.posts = feed.posts.filter(p => p.id !== postId);

    // 해당 ticker를 사용하는 다른 게시글이 없으면 prices에서도 제거
    const tickerUpper = removedPost.ticker.toUpperCase();
    const otherPostsWithSameTicker = feed.posts.filter(
      p => p.ticker.toUpperCase() === tickerUpper
    );

    if (otherPostsWithSameTicker.length === 0 && tickerUpper) {
      delete feed.prices[tickerUpper];
    }

    // 메타데이터 업데이트
    feed.totalPosts = feed.posts.length;
    feed.lastUpdated = new Date().toISOString();

    // 저장
    await saveFeed(feed);

    console.log(`[Feed API] Post ${postId} removed from feed.json`);

    // 사용자 통계·해금배지 재계산
    recomputeAllUserStatsFromFeed(feed.posts).catch((err) =>
      console.warn('[Feed API] user stats recompute 실패:', err?.message || err),
    );

    // IndexNow: 삭제된 페이지(404)와 sitemap을 통보하여 색인 정리 유도
    pingIndexNow([
      `${SITE_URL}/reports/${postId}`,
      `${SITE_URL}/sitemap.xml`,
    ]).catch((err) =>
      console.warn('[Feed API] IndexNow 핑 실패:', err?.message || err),
    );

    return NextResponse.json({
      success: true,
      message: '게시글이 피드에서 제거되었습니다.',
    });
  } catch (error) {
    console.error('[Feed API] DELETE error:', error);
    return NextResponse.json(
      { error: '피드 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
