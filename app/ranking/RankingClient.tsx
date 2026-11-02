'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Container from '@/components/Container';
import FilterTabs from '@/components/FilterTabs';
import Pagination from '@/components/Pagination';
import UserLevelInline from '@/components/UserLevelInline';
import { InvestorSpotlight, PriceDetail, RankRow, Spotlight } from '@/components/front/podium';
import { formatRate, returnColorClass } from '@/components/front/ranking';

// 랭킹 — 리포트 · 투자자 · 인기글 세 탭이 같은 모양: 1·2·3위 카드 세 장 + 4위부터 순위표.
// 필터는 높은 순 / 낮은 순 하나. 순위 번호는 보고 있는 순서 기준 — 낮은 순이면 가장 낮은 항목이 1위.

type Tab = 'reports' | 'investors' | 'trending';
type Order = 'desc' | 'asc';

const TAB_LABELS: Record<Tab, string> = { reports: '리포트', investors: '투자자', trending: '인기글' };
const TABS = Object.keys(TAB_LABELS) as Tab[];
const ORDERS: Order[] = ['desc', 'asc'];
const ORDER_LABELS: Record<Tab, Record<Order, string>> = {
  reports: { desc: '수익률 높은순', asc: '수익률 낮은순' },
  investors: { desc: '평균 수익률 높은순', asc: '평균 수익률 낮은순' },
  trending: { desc: '인기 많은순', asc: '인기 적은순' },
};

const PAGE_SIZE = 10;

interface RankedReport {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType?: 'long' | 'short';
  returnRate: number;
  prevReturnRate?: number;
  returnRate1D?: number | null;
  returnRate1W?: number | null;
  returnRate1M?: number | null;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  daysElapsed: number;
  levelPoints?: number;
  exchange?: string;
  themes?: string[];
  priceHistory: Array<{ date: string; price: number; returnRate: number }>;
}

interface InvestorData {
  rank: number;
  name: string;
  avgReturnRate: number;
  totalReports: number;
  totalLikes: number;
  winCount: number;
  levelPoints?: number;
}

interface RankingClientProps {
  initialReports: RankedReport[];
  initialInvestors: InvestorData[];
  initialTrending: RankedReport[];
}

function ranked<T extends object>(list: T[], order: Order) {
  const ordered = order === 'desc' ? list : [...list].reverse();
  return ordered.map((item, i) => ({ ...item, rank: i + 1 }));
}

export default function RankingClient({ initialReports, initialInvestors, initialTrending }: RankingClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [order, setOrder] = useState<Order>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // 서버가 정렬해서 준다 (리포트: 수익률 · 인기글: 조회+좋아요 · 투자자: 평균 수익률)
  const validReports = useMemo(() => initialReports.filter((r) => Number.isFinite(r.returnRate)), [initialReports]);

  // 보고 있는 순서대로 뒤집고 1위부터 번호를 다시 매긴다
  const reports = useMemo(() => ranked(validReports, order), [validReports, order]);
  const trending = useMemo(() => ranked(initialTrending, order), [initialTrending, order]);
  const investors = useMemo(() => ranked(initialInvestors, order), [initialInvestors, order]);

  // 직전 랭킹 맵 (id → prevRank) — 높은 순 기준
  const prevRankMap = useMemo(() => {
    const sortedByPrev = [...validReports].sort(
      (a, b) => (b.prevReturnRate ?? b.returnRate) - (a.prevReturnRate ?? a.returnRate)
    );
    return new Map(sortedByPrev.map((report, index) => [report.id, index + 1]));
  }, [validReports]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handleOrderChange = useCallback((next: Order) => {
    setOrder(next);
    setCurrentPage(1);
  }, []);

  const listLength = { reports: reports.length, investors: investors.length, trending: trending.length }[activeTab];
  const totalPages = Math.ceil(listLength / PAGE_SIZE);

  // 1·2·3위 카드는 첫 쪽에서만 — 순위표는 카드에 나온 항목을 뺀다
  const showSpotlight = currentPage === 1;
  const pageRows = <T,>(list: T[]): T[] => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const rows = list.slice(start, start + PAGE_SIZE);
    return showSpotlight ? rows.slice(3) : rows;
  };
  const rowsClass = `${showSpotlight ? 'mt-6' : ''} border-t-2 border-[var(--theme-border)]`;

  return (
    <Container>
      <h1 className="sr-only">랭킹</h1>

      {/* 큰 분류 — 가운데 배지 버튼, 그 아랫줄에 정렬. 괘선 없이 여백으로만 나눈다 */}
      <div className="flex justify-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            aria-pressed={activeTab === tab}
            className={`min-w-20 px-4 py-2 text-sm font-bold rounded-sm border transition-colors ${
              activeTab === tab
                ? 'bg-[var(--foreground)] border-[var(--foreground)] text-[var(--background)]'
                : 'border-[var(--theme-border-control)] text-[var(--theme-ink-soft)] hover:border-[var(--theme-border)] hover:text-[var(--foreground)]'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <FilterTabs
        options={ORDERS}
        value={order}
        onChange={handleOrderChange}
        label={(o) => ORDER_LABELS[activeTab][o]}
        className="mt-2 mb-5 justify-center"
      />

      {listLength === 0 && (
        <p className="py-14 text-center headline text-lg">아직 순위에 오른 글이 없어요</p>
      )}

      {activeTab === 'reports' && listLength > 0 && (
        <>
          {showSpotlight && (
            <Spotlight items={reports.slice(0, 3).map((r) => ({ ...r, displayRate: r.returnRate }))} />
          )}
          <ol className={rowsClass}>
            {pageRows(reports).map((report) => (
              <RankRow
                key={report.id}
                report={report}
                rank={report.rank}
                rate={report.returnRate}
                // 순위 변동은 높은 순에서만 뜻이 있다
                rankChange={order === 'desc' ? (prevRankMap.get(report.id) ?? report.rank) - report.rank : 0}
                detail={<PriceDetail report={report} />}
              />
            ))}
          </ol>
        </>
      )}

      {activeTab === 'investors' && listLength > 0 && (
        <>
          {showSpotlight && <InvestorSpotlight items={investors.slice(0, 3)} />}
          <ol className={rowsClass}>
            {pageRows(investors).map((investor) => (
              <li key={investor.name} className="border-b border-[var(--theme-border-muted)]">
                <Link
                  href={`/user/${encodeURIComponent(investor.name)}`}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 py-2.5"
                >
                  <span className="font-serif text-lg font-black text-[var(--theme-ink-soft)]">{investor.rank}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-x-1.5">
                      <span className="truncate text-[15px] font-bold text-[var(--foreground)] group-hover:underline underline-offset-4">{investor.name}</span>
                      <UserLevelInline points={investor.levelPoints} />
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--theme-ink-soft)]">
                      {investor.totalReports}편 중 {investor.winCount}편 수익 · 좋아요 {investor.totalLikes.toLocaleString()}
                    </span>
                  </span>
                  <span className={`font-mono font-black tabular-nums ${returnColorClass(investor.avgReturnRate)}`}>
                    {formatRate(investor.avgReturnRate)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      {activeTab === 'trending' && listLength > 0 && (
        <>
          {showSpotlight && (
            <Spotlight items={trending.slice(0, 3).map((r) => ({ ...r, displayRate: r.returnRate }))} />
          )}
          <ol className={rowsClass}>
            {pageRows(trending).map((report) => (
              <RankRow
                key={report.id}
                report={report}
                rank={report.rank}
                rate={report.returnRate}
                detail={<>조회 {report.views.toLocaleString()} · 좋아요 {report.likes.toLocaleString()}</>}
              />
            ))}
          </ol>
        </>
      )}

      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
    </Container>
  );
}
