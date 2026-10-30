// 리포트 검색 — 홈 "모든 리포트"와 /search 가 같이 쓴다.
// 공백·대소문자·기호를 무시하고 제목 · 작성자 · 티커 · 종목명(원문 + 한글 약칭)에서 찾는다.
//   예) "마이크론" → stockName 이 "MICRON TECHNOLOGY INC" 인 MU 리포트도 잡힌다 (stockNameKr 약칭)
// tickers 를 주면(종목 검색 결과) 그 종목 리포트도 포함 — "하닉", "ㅅㅅㅈㅈ" 같은 별칭·초성으로도 찾기.

import { normalizeQuery } from '@/lib/stockSearchIndex';
import { shortStockName } from '@/utils/reportDisplay';

export interface SearchableReport {
  title?: string;
  author?: string;
  ticker?: string;
  stockName?: string;
}

export function matchesReport(report: SearchableReport, query: string, tickers?: Set<string>): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  const ticker = (report.ticker || '').toUpperCase();
  if (tickers?.has(ticker)) return true;
  const fields = [
    report.title,
    report.author,
    ticker,
    report.stockName,
    report.stockName ? shortStockName(report.stockName, ticker) : '',
  ];
  return fields.some((f) => f && normalizeQuery(f).includes(q));
}
