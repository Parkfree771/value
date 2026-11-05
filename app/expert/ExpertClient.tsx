'use client';

import { useMemo, useState } from 'react';
import FilterTabs from '@/components/FilterTabs';
import Pagination from '@/components/Pagination';
import { PriceDetail, RankRow, type PodiumReport } from '@/components/front/podium';
import type { BrokerReport } from '@/lib/brokerReports';
import ExpertPodium from './ExpertPodium';
import ExpertReportCard from './ExpertReportCard';

// 전문가 추적 — 랭킹 페이지와 같은 틀: 분류 버튼 · 정렬 · 1·2·3위 카드 · 4위부터 순위표.
// 낮은 순이면 가장 많이 잃은 리포트가 1위 (역순위). 최신순은 리포트 카드 목록.

type Region = 'all' | 'domestic' | 'global';
type Order = 'desc' | 'asc' | 'latest';

const REGION_LABELS: Record<Region, string> = { all: '전체', domestic: '국내 증권사', global: '해외 증권사' };
const REGIONS = Object.keys(REGION_LABELS) as Region[];
const ORDER_LABELS: Record<Order, string> = { desc: '수익률 높은순', asc: '수익률 낮은순', latest: '최신순' };
const ORDERS = Object.keys(ORDER_LABELS) as Order[];
const ALL_BROKERS = '전체 증권사';
const PAGE_SIZE = 10;

const isDomestic = (broker: string) => /[가-힣]/.test(broker);

/** 순위 카드·순위표가 쓰는 모양으로 — 제목은 한 줄 요약, 작성자 자리는 증권사(개인 이름은 싣지 않는다), 작성가는 작성 당시 가격 */
function toPodium(r: BrokerReport): PodiumReport {
  return {
    id: r.id,
    href: `/expert/${r.id}`,
    title: r.headline,
    author: r.broker,
    stockName: r.stockName,
    ticker: r.ticker,
    exchange: r.exchange,
    opinion: r.opinion,
    initialPrice: r.basePrice,
    currentPrice: r.currentPrice,
    createdAt: r.reportDate,
  };
}

export default function ExpertClient({ reports }: { reports: BrokerReport[] }) {
  const [region, setRegion] = useState<Region>('all');
  const [broker, setBroker] = useState<string>(ALL_BROKERS);
  const [order, setOrder] = useState<Order>('desc');
  const [page, setPage] = useState(1);

  // 분류에 맞는 증권사만 칩으로
  const brokers = useMemo(() => {
    const names = reports
      .filter((r) => region === 'all' || (region === 'domestic') === isDomestic(r.broker))
      .map((r) => r.broker);
    return [ALL_BROKERS, ...new Set(names)];
  }, [reports, region]);

  const list = useMemo(() => {
    const filtered = reports.filter(
      (r) =>
        (region === 'all' || (region === 'domestic') === isDomestic(r.broker)) &&
        (broker === ALL_BROKERS || r.broker === broker),
    );
    if (order === 'latest') return filtered; // 서버가 최신순으로 준다
    const sorted = [...filtered].sort((a, b) => b.returnRate - a.returnRate);
    return order === 'desc' ? sorted : sorted.reverse();
  }, [reports, region, broker, order]);

  const reset = () => setPage(1);
  const totalPages = Math.ceil(list.length / PAGE_SIZE);
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ranking = order !== 'latest';
  // 1·2·3위 카드는 순위 보기 첫 쪽에서만 — 순위표는 카드에 나온 항목을 뺀다
  const showSpotlight = ranking && page === 1;
  const rows = showSpotlight ? pageItems.slice(3) : pageItems;
  const rankOf = (i: number) => (page - 1) * PAGE_SIZE + i + 1;

  return (
    <>
      {/* 분류 — 가운데 배지 버튼 (랭킹과 같은 모양) */}
      <div className="flex justify-center gap-2">
        {REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRegion(r);
              setBroker(ALL_BROKERS);
              reset();
            }}
            aria-pressed={region === r}
            className={`min-w-20 px-4 py-2 text-sm font-bold rounded-sm border transition-colors ${
              region === r
                ? 'bg-[var(--foreground)] border-[var(--foreground)] text-[var(--background)]'
                : 'border-[var(--theme-border-control)] text-[var(--theme-ink-soft)] hover:border-[var(--theme-border)] hover:text-[var(--foreground)]'
            }`}
          >
            {REGION_LABELS[r]}
          </button>
        ))}
      </div>

      <FilterTabs
        options={ORDERS}
        value={order}
        onChange={(o) => {
          setOrder(o);
          reset();
        }}
        label={(o) => ORDER_LABELS[o]}
        className="mt-2 justify-center"
      />
      {brokers.length > 2 && (
        <FilterTabs
          options={brokers}
          value={broker}
          onChange={(b) => {
            setBroker(b);
            reset();
          }}
          label={(b) => b}
          className="mb-5 justify-center"
        />
      )}
      {brokers.length <= 2 && <div className="mb-5" />}

      {list.length === 0 && <p className="py-14 text-center headline text-lg">해당하는 리포트가 없어요</p>}

      {list.length > 0 && ranking && (
        <>
          {showSpotlight && <ExpertPodium items={pageItems.slice(0, 3)} />}
          {rows.length > 0 && (
            <ol className={`${showSpotlight ? 'mt-6' : ''} border-t-2 border-[var(--theme-border)]`}>
              {rows.map((r) => {
                const item = toPodium(r);
                return (
                  <RankRow
                    key={r.id}
                    report={item}
                    rank={rankOf(pageItems.indexOf(r))}
                    rate={r.returnRate}
                    detail={<PriceDetail report={item} />}
                  />
                );
              })}
            </ol>
          )}
        </>
      )}

      {list.length > 0 && !ranking && (
        <div className="border-t-2 border-[var(--theme-border)]">
          {pageItems.map((r) => (
            <ExpertReportCard key={r.id} r={r} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </>
  );
}
