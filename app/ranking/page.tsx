import type { Metadata } from 'next';
import { getCachedFeed } from '@/lib/jsonCache';
import RankingClient from './RankingClient';

export const metadata: Metadata = {
  title: '랭킹',
  description: '투자 리포트 수익률 랭킹, 투자자 랭킹, 인기글 랭킹을 확인하세요. 최고 수익률 리포트와 인기 투자자를 한눈에 볼 수 있습니다.',
  openGraph: {
    title: '랭킹 | GuruNote',
    description: '투자 리포트 수익률 랭킹, 투자자 랭킹, 인기글 랭킹을 확인하세요.',
  },
};

// 1분마다 재검증
export const revalidate = 60;

interface FeedPost {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  returnRate: number;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  priceHistory?: Array<{ date: string; price: number; returnRate: number }>;
}

interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: FeedPost[];
}

const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

async function fetchFeedFromStorage(): Promise<FeedData> {
  const res = await fetch(FEED_URL, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status}`);
  }

  return res.json();
}

export default async function RankingPage() {
  let posts: FeedPost[] = [];

  try {
    const data = await getCachedFeed(fetchFeedFromStorage);
    posts = (data as FeedData).posts || [];
  } catch (error) {
    console.error('랭킹 데이터 가져오기 실패:', error);
  }

  // 데이터 전처리 (서버에서 수행)
  const today = new Date();

  const reportsWithDays = posts
    .map((report) => {
      const createdDate = new Date(report.createdAt);
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...report,
        daysElapsed: diffDays,
        priceHistory: report.priceHistory || [],
      };
    })
    .sort((a, b) => b.returnRate - a.returnRate);

  // 인기글 (조회수 + 좋아요 기준)
  const trendingData = [...reportsWithDays].sort((a, b) => {
    const scoreA = (a.views || 0) + (a.likes || 0) * 2;
    const scoreB = (b.views || 0) + (b.likes || 0) * 2;
    return scoreB - scoreA;
  });

  // 투자자 데이터 (작성자별 평균 수익률)
  const authorMap = new Map<string, { totalReturn: number; count: number; author: string }>();
  reportsWithDays.forEach((report) => {
    const existing = authorMap.get(report.author);
    if (existing) {
      existing.totalReturn += report.returnRate;
      existing.count += 1;
    } else {
      authorMap.set(report.author, {
        totalReturn: report.returnRate,
        count: 1,
        author: report.author,
      });
    }
  });

  const investorsData = Array.from(authorMap.values())
    .map(({ author, totalReturn, count }) => ({
      rank: 0,
      name: author,
      avgReturnRate: totalReturn / count,
      totalReports: count,
      totalLikes: reportsWithDays
        .filter((r) => r.author === author)
        .reduce((sum, r) => sum + (r.likes || 0), 0),
    }))
    .sort((a, b) => b.avgReturnRate - a.avgReturnRate)
    .map((investor, index) => ({ ...investor, rank: index + 1 }));

  return (
    <RankingClient
      initialReports={reportsWithDays}
      initialInvestors={investorsData}
      initialTrending={trendingData}
    />
  );
}
