/**
 * 종목별 일별 종가 시계열 (Firebase Storage: prices-history/{TICKER}.json)
 *
 * 키는 짧게: d=date(YYYY-MM-DD), c=close
 * 1년치 ~250 entries × ~30bytes = ~7.5KB / 종목
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
