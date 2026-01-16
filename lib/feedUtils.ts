/**
 * feed.json 관리 유틸리티
 *
 * Firebase Storage에 저장된 feed.json을 읽고 쓰는 함수들
 * - 게시글 작성 시: addPostToFeed()
 * - 게시글 삭제 시: removePostFromFeed()
 * - 크론 스크립트: 전체 갱신
 * - 메인 페이지: getFeedData()
 */

import { getStorage } from 'firebase-admin/storage';

// feed.json에 저장되는 게시글 데이터 구조
export interface FeedPost {
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

// feed.json 전체 구조
export interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: FeedPost[];
  prices: Record<string, {
    currentPrice: number;
    exchange: string;
    lastUpdated: string;
  }>;
}

// 빈 feed 데이터 생성
export function createEmptyFeed(): FeedData {
  return {
    lastUpdated: new Date().toISOString(),
    totalPosts: 0,
    posts: [],
    prices: {},
  };
}

/**
 * Firebase Storage에서 feed.json 읽기
 */
export async function getFeedFromStorage(): Promise<FeedData> {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (!exists) {
      console.log('[Feed] feed.json not found, returning empty feed');
      return createEmptyFeed();
    }

    const [content] = await file.download();
    return JSON.parse(content.toString()) as FeedData;
  } catch (error) {
    console.error('[Feed] Error reading feed.json:', error);
    return createEmptyFeed();
  }
}

/**
 * Firebase Storage에 feed.json 저장
 */
export async function saveFeedToStorage(feedData: FeedData): Promise<void> {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file('feed.json');

    await file.save(JSON.stringify(feedData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=60', // 1분 캐시 (ISR과 조화)
      },
    });

    console.log('[Feed] feed.json saved successfully');
  } catch (error) {
    console.error('[Feed] Error saving feed.json:', error);
    throw error;
  }
}

/**
 * 수익률 계산 함수
 */
export function calculateReturn(
  initialPrice: number,
  currentPrice: number,
  positionType: 'long' | 'short'
): number {
  if (initialPrice <= 0 || currentPrice <= 0) return 0;

  if (positionType === 'long') {
    // 롱 포지션: 가격 상승 시 수익
    return ((currentPrice - initialPrice) / initialPrice) * 100;
  } else {
    // 숏 포지션: 가격 하락 시 수익
    return ((initialPrice - currentPrice) / initialPrice) * 100;
  }
}

/**
 * 새 게시글을 feed.json에 추가
 * 게시글 작성 시 호출됨
 */
export async function addPostToFeed(post: FeedPost): Promise<void> {
  try {
    const feed = await getFeedFromStorage();

    // 중복 체크 (같은 ID가 이미 있으면 업데이트)
    const existingIndex = feed.posts.findIndex(p => p.id === post.id);
    if (existingIndex >= 0) {
      feed.posts[existingIndex] = post;
    } else {
      // 새 게시글을 맨 앞에 추가
      feed.posts.unshift(post);
    }

    // prices에 ticker 추가 (아직 없는 경우)
    const tickerUpper = post.ticker.toUpperCase();
    if (!feed.prices[tickerUpper]) {
      feed.prices[tickerUpper] = {
        currentPrice: post.currentPrice,
        exchange: post.exchange,
        lastUpdated: new Date().toISOString(),
      };
    }

    feed.totalPosts = feed.posts.length;
    feed.lastUpdated = new Date().toISOString();

    await saveFeedToStorage(feed);
    console.log(`[Feed] Post ${post.id} added to feed`);
  } catch (error) {
    console.error('[Feed] Error adding post to feed:', error);
    // 게시글 작성은 계속 진행 (feed 업데이트 실패해도)
  }
}

/**
 * 게시글을 feed.json에서 제거
 * 게시글 삭제 시 호출됨
 */
export async function removePostFromFeed(postId: string): Promise<void> {
  try {
    const feed = await getFeedFromStorage();

    // 해당 게시글 제거
    const removedPost = feed.posts.find(p => p.id === postId);
    feed.posts = feed.posts.filter(p => p.id !== postId);

    // 해당 ticker를 사용하는 다른 게시글이 없으면 prices에서도 제거
    if (removedPost) {
      const tickerUpper = removedPost.ticker.toUpperCase();
      const otherPostsWithSameTicker = feed.posts.filter(
        p => p.ticker.toUpperCase() === tickerUpper
      );

      if (otherPostsWithSameTicker.length === 0) {
        delete feed.prices[tickerUpper];
      }
    }

    feed.totalPosts = feed.posts.length;
    feed.lastUpdated = new Date().toISOString();

    await saveFeedToStorage(feed);
    console.log(`[Feed] Post ${postId} removed from feed`);
  } catch (error) {
    console.error('[Feed] Error removing post from feed:', error);
    // 게시글 삭제는 계속 진행
  }
}

/**
 * 게시글 수정 시 feed.json 업데이트
 */
export async function updatePostInFeed(postId: string, updates: Partial<FeedPost>): Promise<void> {
  try {
    const feed = await getFeedFromStorage();

    const postIndex = feed.posts.findIndex(p => p.id === postId);
    if (postIndex >= 0) {
      feed.posts[postIndex] = {
        ...feed.posts[postIndex],
        ...updates,
      };

      feed.lastUpdated = new Date().toISOString();
      await saveFeedToStorage(feed);
      console.log(`[Feed] Post ${postId} updated in feed`);
    }
  } catch (error) {
    console.error('[Feed] Error updating post in feed:', error);
  }
}

/**
 * 공개 URL로 feed.json 읽기 (클라이언트/서버 공통)
 * Firebase Storage 공개 URL 사용
 */
export async function getFeedPublicUrl(projectId: string): Promise<string> {
  return `https://storage.googleapis.com/${projectId}.firebasestorage.app/feed.json`;
}
