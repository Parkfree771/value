/**
 * 종목별 일별 종가 시계열 (Postgres: public.price_history)
 *
 * 키는 짧게: d=date(YYYY-MM-DD), c=close
 */

export interface PriceHistoryPoint {
  d: string; // YYYY-MM-DD
  c: number; // close
}

export interface PriceHistoryFile {
  ticker: string;
  exchange: string;
  lastUpdated: string; // ISO timestamp
  history: PriceHistoryPoint[]; // 오래된 → 최신 순서
}
