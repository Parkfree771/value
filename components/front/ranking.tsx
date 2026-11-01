// 수익률 순위 공용 — 홈 1면(FrontPage) 의 1·2·3위 + 순위표가 쓴다.
// 기간 탭(1일/7일/한달)은 종목·방향당 1개 (서버 app/page.tsx periodTopIds 와 같은 규칙).

import type { ReportSummary } from '@/types/report';

export type Period = 'all' | '1d' | '1w' | '1m';

export const PERIOD_LABELS: Record<Period, string> = {
  all: '전체',
  '1d': '1일',
  '1w': '7일',
  '1m': '한달',
};
export const PERIOD_KEYS: Period[] = ['all', '1d', '1w', '1m'];

// 직전 가격 업데이트 대비 랭킹 변동 (양수: 상승, 음수: 하락, 0: 변동 없음)
export function RankChangeIndicator({ change, className = '' }: { change: number; className?: string }) {
  if (change === 0) return null;
  const isUp = change > 0;
  const colorClass = isUp
    ? 'text-red-600 dark:text-red-400'
    : 'text-blue-600 dark:text-blue-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold font-mono ${colorClass} ${className}`}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isUp ? (
          <>
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </>
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </>
        )}
      </svg>
      {Math.abs(change)}
    </span>
  );
}

export const returnColorClass = (rate: number) =>
  rate > 0 ? 'return-positive' : rate < 0 ? 'return-negative' : 'return-neutral';

export const formatRate = (rate: number) => `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;

/**
 * 기간별 수익률 TOP N
 * 기간 탭은 종목·방향당 1개 (서버 app/page.tsx periodTopIds 와 같은 규칙).
 */
export function computeTopReturns(reports: ReportSummary[], period: Period, limit = 10) {
  if (reports.length === 0) return [];

  const pickRate = (r: ReportSummary): number | null => {
    if (period === 'all') return r.returnRate;
    if (period === '1d') return r.returnRate1D ?? null;
    if (period === '1w') return r.returnRate1W ?? null;
    return r.returnRate1M ?? null;
  };

  const enriched = reports
    .map((r) => ({ ...r, displayRate: pickRate(r), sameStockCount: 1 }))
    .filter((r): r is typeof r & { displayRate: number } => r.displayRate !== null && Number.isFinite(r.displayRate));

  // 기간 탭의 수익률은 "그 기간 종목 등락"이라 같은 종목 리포트는 숫자가 같다 → 종목·방향당 1개만 (가장 높은 글)
  // 누적(전체) 탭은 작성가가 글마다 달라 그대로 둔다. 서버 app/page.tsx periodTopIds 와 같은 규칙.
  let candidates = enriched;
  if (period !== 'all') {
    const best = new Map<string, (typeof enriched)[number]>();
    const counts = new Map<string, number>();
    for (const r of enriched) {
      const key = `${r.ticker.toUpperCase()}:${r.positionType ?? 'long'}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const cur = best.get(key);
      if (!cur || r.displayRate > cur.displayRate || (r.displayRate === cur.displayRate && r.createdAt > cur.createdAt)) {
        best.set(key, r);
      }
    }
    candidates = [...best.entries()].map(([key, r]) => ({ ...r, sameStockCount: counts.get(key) ?? 1 }));
  }

  const top10 = candidates
    .sort((a, b) => b.displayRate - a.displayRate)
    .slice(0, limit);

  // 전체 탭에서만 직전 대비 순위 변동 계산 (기간 탭엔 prev 데이터 없음)
  if (period !== 'all') {
    return top10.map((report, index) => ({
      ...report,
      rank: index + 1,
      rankChange: 0,
    }));
  }

  const prevRankMap = new Map<string, number>();
  [...top10]
    .sort((a, b) => (b.prevReturnRate ?? b.returnRate) - (a.prevReturnRate ?? a.returnRate))
    .forEach((r, i) => prevRankMap.set(r.id, i + 1));

  return top10.map((report, index) => {
    const currentRank = index + 1;
    const prevRank = prevRankMap.get(report.id) ?? currentRank;
    return {
      ...report,
      rank: currentRank,
      rankChange: prevRank - currentRank,
    };
  });
}

export type RankedReport = ReturnType<typeof computeTopReturns>[number];
