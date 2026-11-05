// 구루 포트폴리오 요약 — 메타데이터·OG 카드·JSON-LD 용 (서버 전용)
// 화면(PortfolioTable)과 같은 기준: 공시일 종가(price_at_filing) 대비 guru_prices 현재가.

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';
import { sql } from '@/lib/db';
import type { GuruPortfolioDoc } from './types';

export const loadGuruPortfolios = cache((): Record<string, GuruPortfolioDoc> => {
  try {
    const file = path.join(process.cwd(), 'data', 'guru-portfolios.json');
    return (JSON.parse(fs.readFileSync(file, 'utf-8')) as { gurus?: Record<string, GuruPortfolioDoc> }).gurus ?? {};
  } catch (e) {
    console.error('[portfolioSummary] JSON 로드 실패', e);
    return {};
  }
});

export const loadGuruPrices = cache(async (): Promise<Record<string, number>> => {
  try {
    const rows = await sql`select ticker, current_price from guru_prices`;
    const out: Record<string, number> = {};
    for (const r of rows) out[r.ticker] = Number(r.current_price);
    return out;
  } catch (e) {
    console.error('[portfolioSummary] 가격 로드 실패', e);
    return {};
  }
});

export interface GuruHoldingSummary {
  ticker: string;
  name: string;
  weight: number; // %
  returnRate: number | null; // 공시일 대비 %
}

export interface GuruPortfolioSummary {
  reportDate: string;
  filingDate: string;
  totalValue: number;
  holdingsCount: number;
  top: GuruHoldingSummary[];
  newBuys: string[];
  soldOut: string[];
  /** 공시일 이후 수익률 — 현재 보유 종목을 비중대로 들고 있었다면 (가격 있는 종목만) */
  returnSinceFiling: number | null;
}

export function summarizeGuruPortfolio(
  doc: GuruPortfolioDoc,
  prices: Record<string, number>,
  topN = 5,
): GuruPortfolioSummary {
  const held = doc.holdings.filter((h) => h.status !== 'SOLD OUT' && h.shares_curr > 0);
  const rateOf = (h: GuruPortfolioDoc['holdings'][number]): number | null => {
    const base = h.price_at_filing;
    const cur = h.ticker ? prices[h.ticker] : undefined;
    if (base == null || base <= 0 || cur == null || !(cur > 0)) return null;
    return ((cur - base) / base) * 100;
  };

  let wSum = 0;
  let rSum = 0;
  for (const h of held) {
    const r = rateOf(h);
    if (r === null) continue;
    wSum += h.weight_curr;
    rSum += h.weight_curr * r;
  }

  const top = [...held]
    .sort((a, b) => b.weight_curr - a.weight_curr)
    .filter((h) => h.ticker)
    .slice(0, topN)
    .map((h) => ({
      ticker: h.ticker as string,
      name: h.name_of_issuer,
      weight: h.weight_curr,
      returnRate: rateOf(h),
    }));

  return {
    reportDate: doc.report_date_curr,
    filingDate: doc.filing_date_curr,
    totalValue: doc.total_value_curr,
    holdingsCount: doc.holdings_count,
    top,
    newBuys: doc.holdings.filter((h) => h.status === 'NEW BUY' && h.ticker).map((h) => h.ticker as string),
    soldOut: doc.holdings.filter((h) => h.status === 'SOLD OUT' && h.ticker).map((h) => h.ticker as string),
    // 가격이 있는 비중이 절반 미만이면 대표성이 없어 표시하지 않는다
    returnSinceFiling: wSum >= 50 ? rSum / wSum : null,
  };
}
