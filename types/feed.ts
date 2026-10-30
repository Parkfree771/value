export interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorId?: string;            // 실제 데이터엔 있으나 타입에 누락돼있던 것 — 백필·매핑용
  authorIsVirtual?: boolean;    // 작성자가 가상(시드) 사용자인지 — UI 배지 표시용
  levelPoints?: number;         // 작성자 레벨 점수 (users.level_points, lib/levels.ts)
  stockName: string;
  ticker: string;
  exchange: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType: 'long' | 'short';
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  prevReturnRate?: number;
  returnRate1D?: number | null;
  returnRate1W?: number | null;
  returnRate1M?: number | null;
  createdAt: string;
  views: number;
  likes: number;
  commentCount?: number;
  category: string;
  targetPrice?: number;
  themes?: string[];
  excerpt?: string;             // 본문 앞부분 텍스트 (투자 근거 미리보기) — 홈 SSR만 채움
  thumbnail?: string | null;    // 첫 첨부 이미지 URL — 홈 SSR만 채움
}

export interface FeedStats {
  totalPosts: number;
  authors: number;
}

export interface FeedData {
  lastUpdated: string;
  totalPosts: number;
  posts: FeedPost[];
  stats?: FeedStats;
  prices: Record<string, {
    currentPrice: number;
    exchange: string;
    lastUpdated: string;
  }>;
}
