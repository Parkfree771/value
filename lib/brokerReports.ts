// 전문가 추적 — 증권사 리포트 (서버 전용). 테이블: db/migrations/0005_broker_reports.sql
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db';
import { SAFETY_TTL, TAG } from '@/lib/cache';
import { fetchDailyRange, writeHistory } from '@/lib/priceHistory';

export type BrokerOpinion = 'buy' | 'hold' | 'sell';

export interface BrokerReport {
  id: string;
  broker: string;
  analyst: string | null;
  ticker: string;
  exchange: string;
  currency: string;
  stockName: string;
  reportDate: string; // YYYY-MM-DD
  reportTitle: string | null;
  opinion: BrokerOpinion;
  opinionRaw: string | null;
  targetPrice: number | null;
  prevTargetPrice: number | null;
  headline: string;
  summary: string;
  sourceUrl: string | null;
  basePrice: number;
  currentPrice: number;
  returnRate: number;
  /** 발간일 이후 최고 종가 — 목표가 도달 판정 */
  maxClose: number | null;
  createdAt: string;
}

export const OPINION_LABEL: Record<BrokerOpinion, string> = { buy: '매수', hold: '중립', sell: '매도' };

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const ymd = (v: unknown): string =>
  v instanceof Date ? new Date(v.getTime() + 9 * 3600e3).toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);

function toReport(r: Record<string, any>): BrokerReport {
  const base = Number(r.base_price);
  const current = num(r.current_price) ?? base;
  return {
    id: r.id,
    broker: r.broker,
    analyst: r.analyst ?? null,
    ticker: r.ticker,
    exchange: r.exchange,
    currency: r.currency,
    stockName: r.stock_name,
    reportDate: r.report_date_text ?? ymd(r.report_date),
    reportTitle: r.report_title ?? null,
    opinion: (r.opinion as BrokerOpinion) ?? 'buy',
    opinionRaw: r.opinion_raw ?? null,
    targetPrice: num(r.target_price),
    prevTargetPrice: num(r.prev_target_price),
    headline: r.headline,
    summary: r.summary ?? '',
    sourceUrl: r.source_url ?? null,
    basePrice: base,
    currentPrice: current,
    returnRate: num(r.return_rate) ?? (base > 0 ? ((current - base) / base) * 100 : 0),
    maxClose: num(r.max_close),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
  };
}

// 발간일 이후 최고 종가를 함께 — 목표가 도달 여부 (도달했다 내려와도 "도달"로 본다)
const SELECT = `
  select b.*, b.report_date::text as report_date_text,
         (select max(h.close) from price_history h where h.ticker = b.ticker and h.date >= b.report_date) as max_close
  from broker_reports b`;

// 캐시: 전체 목록 하나를 데이터 캐시에 — 목록·상세·홈·사이트맵이 모두 이것을 쓴다.
// 태그 broker (등록·수정·삭제, 장 마감 수집 완료 때 비움 — lib/cache.ts). 수동 큐레이션이라 수백~수천 건 규모.
const readBrokerReports = unstable_cache(
  async (): Promise<BrokerReport[]> => {
    const rows = await sql.query(`${SELECT} order by b.report_date desc, b.created_at desc`);
    return rows.map(toReport);
  },
  ['broker-reports'],
  { tags: [TAG.broker], revalidate: SAFETY_TTL },
);

/** 테이블이 아직 없으면(마이그레이션 전) 빈 목록 */
export const listBrokerReports = cache(async (): Promise<BrokerReport[]> => {
  try {
    return await readBrokerReports();
  } catch (e) {
    console.error('[brokerReports] list 실패', e);
    return [];
  }
});

/** 상세 — 별도 쿼리 없이 캐시된 목록에서 찾는다 */
export const getBrokerReport = cache(async (id: string): Promise<BrokerReport | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listBrokerReports()).find((r) => r.id === id) ?? null;
});

export function targetUpside(r: BrokerReport): number | null {
  return r.targetPrice && r.currentPrice > 0 ? ((r.targetPrice - r.currentPrice) / r.currentPrice) * 100 : null;
}

export function targetReached(r: BrokerReport): boolean | null {
  if (!r.targetPrice) return null;
  const high = Math.max(r.maxClose ?? 0, r.currentPrice);
  return r.opinion === 'sell' ? Math.min(r.currentPrice, r.basePrice) <= r.targetPrice : high >= r.targetPrice;
}

export function daysSinceReport(r: BrokerReport): number {
  const t = new Date(`${r.reportDate}T00:00:00+09:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export interface BrokerStats {
  broker: string;
  count: number;
  avgReturn: number;
  winRate: number; // 수익 난 비율 %
  targetHitRate: number | null; // 목표가 있는 리포트 중 도달 비율 %
}

/** 증권사별 + 전체 성적 */
export function brokerStats(reports: BrokerReport[]): { total: BrokerStats; byBroker: BrokerStats[] } {
  const calc = (broker: string, rs: BrokerReport[]): BrokerStats => {
    const withTarget = rs.filter((r) => r.targetPrice);
    return {
      broker,
      count: rs.length,
      avgReturn: rs.length ? rs.reduce((s, r) => s + r.returnRate, 0) / rs.length : 0,
      winRate: rs.length ? (rs.filter((r) => r.returnRate > 0).length / rs.length) * 100 : 0,
      targetHitRate: withTarget.length
        ? (withTarget.filter((r) => targetReached(r)).length / withTarget.length) * 100
        : null,
    };
  };
  const groups = new Map<string, BrokerReport[]>();
  for (const r of reports) groups.set(r.broker, [...(groups.get(r.broker) ?? []), r]);
  return {
    total: calc('전체', reports),
    byBroker: [...groups.entries()].map(([b, rs]) => calc(b, rs)).sort((a, b) => b.count - a.count),
  };
}

// ─── 저장 (관리자 API) ─────────────────────────────────────────

export interface BrokerReportInput {
  broker: string;
  analyst?: string | null;
  ticker: string;
  exchange: string;
  currency: string;
  stockName: string;
  reportDate: string;
  reportTitle?: string | null;
  opinion: BrokerOpinion;
  opinionRaw?: string | null;
  targetPrice?: number | null;
  prevTargetPrice?: number | null;
  headline: string;
  summary: string;
  sourceUrl?: string | null;
}

export function parseBrokerReportInput(body: unknown): { ok: true; value: BrokerReportInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '');
  const optStr = (k: string, max: number) => str(k, max) || null;
  const optNum = (k: string) => {
    const n = Number(b[k]);
    return b[k] === null || b[k] === undefined || b[k] === '' || !Number.isFinite(n) || n <= 0 ? null : n;
  };

  const v: BrokerReportInput = {
    broker: str('broker', 60),
    analyst: optStr('analyst', 60),
    ticker: str('ticker', 20).toUpperCase(),
    exchange: str('exchange', 10).toUpperCase(),
    currency: str('currency', 5).toUpperCase() || 'KRW',
    stockName: str('stockName', 100),
    reportDate: str('reportDate', 10),
    reportTitle: optStr('reportTitle', 200),
    opinion: (['buy', 'hold', 'sell'] as const).includes(b.opinion as BrokerOpinion) ? (b.opinion as BrokerOpinion) : 'buy',
    opinionRaw: optStr('opinionRaw', 30),
    targetPrice: optNum('targetPrice'),
    prevTargetPrice: optNum('prevTargetPrice'),
    headline: str('headline', 120),
    summary: str('summary', 3000),
    sourceUrl: optStr('sourceUrl', 500),
  };

  if (!v.broker) return { ok: false, error: '증권사를 입력하세요.' };
  if (!v.ticker || !v.exchange || !v.stockName) return { ok: false, error: '종목을 선택하세요.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.reportDate)) return { ok: false, error: '발간일 형식이 올바르지 않습니다.' };
  if (v.reportDate > new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)) {
    return { ok: false, error: '발간일이 미래입니다.' };
  }
  if (!v.headline) return { ok: false, error: '한 줄 요약을 입력하세요.' };
  if (v.sourceUrl && !/^https?:\/\//.test(v.sourceUrl)) return { ok: false, error: '원문 링크는 http(s) 주소여야 합니다.' };
  return { ok: true, value: v };
}

/**
 * 발간일 종가 확정 + 차트용 일봉 저장.
 * 발간일이 휴장일이면 그 다음 첫 거래일 종가 (그날 산 것으로 본다).
 */
export async function resolvePrices(
  ticker: string,
  exchange: string,
  reportDate: string,
): Promise<{ basePrice: number; baseDate: string; currentPrice: number } | { error: string }> {
  const from = new Date(`${reportDate}T00:00:00`);
  from.setDate(from.getDate() - 7);
  const kstNow = new Date(Date.now() + 9 * 3600e3);
  const kstToday = kstNow.toISOString().slice(0, 10);
  const krxOpen = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes() < 15 * 60 + 40;
  // 국내 장 마감 전이면 오늘 행은 진행 중 가격 — 종가로 쓰지 않는다
  const points = (await fetchDailyRange(ticker, exchange, from, new Date())).filter(
    (p) => !(exchange === 'KRX' && krxOpen && p.d === kstToday),
  );
  const base = points.find((p) => p.d >= reportDate);
  if (!base) return { error: '발간일 이후 종가가 아직 없습니다. 장 마감 후 다시 저장해 주세요.' };
  await writeHistory({
    ticker,
    exchange,
    lastUpdated: new Date().toISOString(),
    history: points.filter((p) => p.d >= reportDate),
  });
  return { basePrice: base.c, baseDate: base.d, currentPrice: points.at(-1)!.c };
}
