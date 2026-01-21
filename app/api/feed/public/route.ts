import { NextResponse } from 'next/server';
import { getCachedFeed } from '@/lib/jsonCache';

// feed.json을 클라이언트에 전달하는 프록시 API
// Firebase Storage CORS 문제 우회 + 메모리 캐시
const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: unknown[];
  prices?: Record<string, unknown>;
}

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

export async function GET() {
  try {
    // 메모리 캐시 사용 (1분 TTL, 2분 stale-while-revalidate)
    const data = await getCachedFeed(fetchFeedFromStorage);

    return NextResponse.json(data, {
      headers: {
        // 브라우저 캐시 1분 + CDN 캐시 1분 + 스테일 2분
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        // 캐시 검증용
        'Last-Modified': data.lastUpdated
          ? new Date(data.lastUpdated).toUTCString()
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
