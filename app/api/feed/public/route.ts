import { NextResponse } from 'next/server';

// feed.json을 클라이언트에 전달하는 프록시 API
// Firebase Storage CORS 문제 우회
const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: 60 }, // 1분 캐시
    });

    if (!res.ok) {
      return NextResponse.json({ posts: [], totalPosts: 0 }, { status: 200 });
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to fetch feed.json:', error);
    return NextResponse.json({ posts: [], totalPosts: 0 }, { status: 200 });
  }
}
