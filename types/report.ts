export type Opinion = 'buy' | 'sell' | 'hold';
export type EditorMode = 'text' | 'html';
export type MarketCategory = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'NIKKEI' | 'HANGSENG' | 'OTHER';

export interface Report {
  id: string;
  title: string;
  author: string;
  authorId: string;
  stockName: string;
  ticker: string;
  category?: MarketCategory;
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
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
}
