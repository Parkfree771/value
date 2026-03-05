import HomeClient from '@/components/HomeClient';
import type { FeedData } from '@/types/feed';

// 서버에서 초기 피드 데이터 fetch
async function getInitialFeed(): Promise<FeedData | null> {
  try {
    const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

    const res = await fetch(FEED_URL, {
      next: { revalidate: 60 }, // 1분 캐시
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch initial feed:', error);
    return null;
  }
}

// 서버 컴포넌트 - 초기 데이터를 서버에서 fetch하여 props로 전달
export default async function HomePage() {
  const initialData = await getInitialFeed();

  return <HomeClient initialData={initialData} />;
}
