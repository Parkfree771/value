'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Feed 데이터 타입
 */
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
}

export interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: FeedPost[];
}

/**
 * 전역 캐시 (페이지 간 공유)
 * - 중복 요청 방지
 * - 60초 TTL
 */
interface FeedCache {
  data: FeedData | null;
  timestamp: number;
  promise: Promise<FeedData> | null;
}

const cache: FeedCache = {
  data: null,
  timestamp: 0,
  promise: null,
};

const CACHE_TTL = 60 * 1000; // 60초
const FEED_API = '/api/feed/public';

/**
 * Feed 데이터를 가져오는 함수
 * - 중복 요청 방지 (진행 중인 요청 재사용)
 * - 캐시 히트 시 즉시 반환
 */
async function fetchFeed(): Promise<FeedData> {
  const now = Date.now();

  // 캐시 히트
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // 진행 중인 요청이 있으면 재사용
  if (cache.promise) {
    return cache.promise;
  }

  // 새 요청 시작
  cache.promise = fetch(FEED_API)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Feed fetch failed');
      }
      const data: FeedData = await res.json();
      cache.data = data;
      cache.timestamp = Date.now();
      return data;
    })
    .finally(() => {
      cache.promise = null;
    });

  return cache.promise;
}

/**
 * 캐시 무효화
 */
export function invalidateFeedCache(): void {
  cache.data = null;
  cache.timestamp = 0;
}

/**
 * useFeed 훅
 *
 * @param initialData - 서버에서 전달받은 초기 데이터 (SSR)
 * @returns { data, isLoading, error, refetch }
 *
 * 특징:
 * - 페이지 간 캐시 공유 (중복 요청 방지)
 * - 60초 TTL
 * - SSR 초기 데이터 지원
 * - 수동 refetch 지원
 */
export function useFeed(initialData?: FeedData | null) {
  const [data, setData] = useState<FeedData | null>(initialData ?? cache.data);
  const [isLoading, setIsLoading] = useState(!initialData && !cache.data);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // 데이터 가져오기
  const fetchData = useCallback(async (forceRefresh = false) => {
    // 강제 리프레시 시 캐시 무효화
    if (forceRefresh) {
      invalidateFeedCache();
    }

    setIsLoading(true);
    setError(null);

    try {
      const feedData = await fetchFeed();
      if (mountedRef.current) {
        setData(feedData);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    mountedRef.current = true;

    // 이미 데이터가 있으면 스킵
    if (data) {
      // 캐시 업데이트는 백그라운드에서
      const now = Date.now();
      if (!cache.data || now - cache.timestamp >= CACHE_TTL) {
        fetchFeed().then((newData) => {
          if (mountedRef.current) {
            setData(newData);
          }
        }).catch(console.error);
      }
      return;
    }

    // 데이터 없으면 fetch
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [data, fetchData]);

  // 수동 refetch
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    posts: data?.posts ?? [],
    totalPosts: data?.totalPosts ?? 0,
  };
}

export default useFeed;
