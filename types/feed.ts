export interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorId?: string;            // 실제 데이터엔 있으나 타입에 누락돼있던 것 — 백필·매핑용
  equippedBadgeId?: string | null; // 작성자가 장착한 배지 ID 스냅샷 (변경 시 일괄 갱신)
  stockName: string;
  ticker: string;
  exchange: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType: 'long' | 'short';
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  prevReturnRate?: number;
  createdAt: string;
  views: number;
  likes: number;
  category: string;
  targetPrice?: number;
  themes?: string[];
}

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
