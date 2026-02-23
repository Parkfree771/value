export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  marketCap: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  exchange: string;
  industry?: string;
  sector?: string;
  change24h?: number;
  changePercent24h?: number;
  volume24h?: number;
  tradeValue24h?: number;
}
