export type Opinion = 'buy' | 'sell' | 'hold';
export type EditorMode = 'text' | 'html';
export type MarketCategory = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'NIKKEI' | 'HANGSENG' | 'OTHER';

/**
 * 리포트 리스트용 요약 타입 (홈페이지, 검색 결과 등)
 */
export interface ReportSummary {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  stockName: string;
  ticker: string;
  category?: string;
  exchange?: string;
  opinion: Opinion;
  returnRate: number;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  positionType?: string;
  stockData?: {
    currency?: string;
    [key: string]: any;
  };
  is_closed?: boolean;
  closed_return_rate?: number;
}

export interface Report {
  id: string;
  title: string;
  author: string;
  authorId: string;
  stockName: string;
  ticker: string;
  category?: MarketCategory;
  exchange?: string;
  opinion: Opinion;
  targetPrice?: number;
  content: string;
  cssContent?: string;
  mode: EditorMode;
  createdAt: string;
  updatedAt?: string[];
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  views: number;
  likes: number;
  images?: string[];
  files?: string[];
  positionType?: 'long' | 'short';
  stockData?: {
    currency?: string;
    marketCap?: number;
    per?: number;
    pbr?: number;
    [key: string]: any;
  };
  is_closed?: boolean;
  closed_at?: string;
  closed_return_rate?: number;
  closed_price?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
}
