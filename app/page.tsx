import { adminStorage, adminDb } from '@/lib/firebase-admin';
import HomeClient from '@/components/HomeClient';
import type { ReportSummary } from '@/types/report';

// ISR: 5분마다 재생성 (On-Demand Revalidation으로 즉시 갱신 가능)
export const revalidate = 300;

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

// feed.json + posts 컬렉션(views, likes만)에서 데이터 가져오기
async function getReportsFromFeed(): Promise<{ reports: ReportSummary[]; total: number }> {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file('feed.json');

    // 병렬 처리: Storage 다운로드 + Firestore 쿼리 동시 실행
    const [contentResult, postsSnapshot] = await Promise.all([
      file.download().catch(() => null),
      adminDb.collection('posts').select('views', 'likes').get()
    ]);

    if (!contentResult) {
      console.log('[ISR] feed.json not found, returning empty');
      return { reports: [], total: 0 };
    }

    const [content] = contentResult;
    const feedData: FeedData = JSON.parse(content.toString());

    if (feedData.posts.length === 0) {
      return { reports: [], total: 0 };
    }

    // id → { views, likes } 맵 생성
    const statsMap = new Map<string, { views: number; likes: number }>();
    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      statsMap.set(doc.id, {
        views: data.views || 0,
        likes: data.likes || 0,
      });
    });

    // 3. feed.json 데이터 + 실시간 views/likes 합치기
    const reports: ReportSummary[] = feedData.posts.map((post) => {
      const liveStats = statsMap.get(post.id);

      return {
        id: post.id,
        title: post.title,
        author: post.author,
        stockName: post.stockName,
        ticker: post.ticker,
        opinion: post.opinion,
        returnRate: post.returnRate,
        initialPrice: post.initialPrice,
        currentPrice: post.currentPrice,
        createdAt: post.createdAt,
        // 실시간 views/likes 사용 (없으면 feed.json 값 fallback)
        views: liveStats?.views ?? post.views,
        likes: liveStats?.likes ?? post.likes,
        exchange: post.exchange,
        category: post.category,
        positionType: post.positionType,
        stockData: undefined,
      };
    });

    console.log(`[ISR] Loaded ${reports.length} posts from feed.json + live stats`);

    return {
      reports,
      total: feedData.totalPosts,
    };
  } catch (error) {
    console.error('[ISR] Failed to load feed.json:', error);
    return { reports: [], total: 0 };
  }
}

export default async function HomePage() {
  const { reports, total } = await getReportsFromFeed();

  // 클라이언트 컴포넌트에 초기 데이터 전달
  return <HomeClient initialReports={reports} total={total} />;
}
