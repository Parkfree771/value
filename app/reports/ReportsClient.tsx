'use client';

import { useMemo, useState } from 'react';
import FilterTabs from '@/components/FilterTabs';
import Pagination from '@/components/Pagination';
import ReportCard from '@/components/ReportCard';
import TopThree from '@/components/front/TopThree';
import { PriceDetail, RankRow } from '@/components/front/podium';
import type { FeedPost } from '@/types/feed';
import { inferCurrency } from '@/utils/currency';
import { shortStockName } from '@/utils/reportDisplay';

// 개인 리포트 — 전문가 추적(/expert)과 같은 틀: 분류 버튼 · 정렬 · 1·2·3위 카드 · 4위부터 순위표.
// 낮은 순이면 가장 많이 잃은 리포트가 1위 (역순위). 최신순·인기순은 리포트 카드 목록.

type Region = 'all' | 'domestic' | 'global';
type Order = 'desc' | 'asc' | 'latest' | 'popular';

const REGION_LABELS: Record<Region, string> = { all: '전체', domestic: '국내 주식', global: '해외 주식' };
const REGIONS = Object.keys(REGION_LABELS) as Region[];
const ORDER_LABELS: Record<Order, string> = { desc: '수익률 높은순', asc: '수익률 낮은순', latest: '최신순', popular: '인기순' };
const ORDERS = Object.keys(ORDER_LABELS) as Order[];
const OPINION_LABEL: Record<FeedPost['opinion'], string> = { buy: '매수', hold: '보유', sell: '매도' };
const PAGE_SIZE = 10;

const isDomestic = (p: FeedPost) => (p.exchange || '').toUpperCase() === 'KRX';
const popularity = (p: FeedPost) => (p.views || 0) + (p.likes || 0) * 2;

export default function ReportsClient({ posts }: { posts: FeedPost[] }) {
  const [region, setRegion] = useState<Region>('all');
  const [order, setOrder] = useState<Order>('desc');
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const filtered = posts.filter(
      (p) => Number.isFinite(p.returnRate) && (region === 'all' || (region === 'domestic') === isDomestic(p)),
    );
    if (order === 'latest') return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (order === 'popular') return [...filtered].sort((a, b) => popularity(b) - popularity(a));
    const sorted = [...filtered].sort((a, b) => b.returnRate - a.returnRate);
    return order === 'desc' ? sorted : sorted.reverse();
  }, [posts, region, order]);

  const totalPages = Math.ceil(list.length / PAGE_SIZE);
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ranking = order === 'desc' || order === 'asc';
  // 1·2·3위 카드는 순위 보기 첫 쪽에서만 — 순위표는 카드에 나온 항목을 뺀다
  const showTop = ranking && page === 1;
  const rows = showTop ? pageItems.slice(3) : pageItems;

  return (
    <>
      <div className="flex justify-center gap-2">
        {REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRegion(r);
              setPage(1);
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
          setPage(1);
        }}
        label={(o) => ORDER_LABELS[o]}
        className="mt-2 mb-5 justify-center"
      />

      {list.length === 0 && <p className="py-14 text-center headline text-lg">해당하는 리포트가 없어요</p>}

      {list.length > 0 && ranking && (
        <>
          {showTop && (
            <TopThree
              items={pageItems.slice(0, 3).map((p) => ({
                id: p.id,
                href: `/reports/${p.id}`,
                rate: p.returnRate,
                stockName: shortStockName(p.stockName, p.ticker),
                opinion: p.opinion,
                opinionLabel: OPINION_LABEL[p.opinion],
                byline: p.author,
                date: p.createdAt,
                basePrice: p.initialPrice,
                currentPrice: p.currentPrice,
                targetPrice: p.targetPrice,
                currency: inferCurrency({ exchange: p.exchange, category: p.category, ticker: p.ticker }),
                targetReached: !!p.targetPrice && p.currentPrice >= p.targetPrice,
              }))}
            />
          )}
          {rows.length > 0 && (
            <ol className={`${showTop ? 'mt-6' : ''} border-t-2 border-[var(--theme-border)]`}>
              {rows.map((p) => (
                <RankRow
                  key={p.id}
                  report={p}
                  rank={(page - 1) * PAGE_SIZE + pageItems.indexOf(p) + 1}
                  rate={p.returnRate}
                  detail={<PriceDetail report={p} />}
                />
              ))}
            </ol>
          )}
        </>
      )}

      {list.length > 0 && !ranking && (
        <div className="border-t-2 border-[var(--theme-border)]">
          {pageItems.map((p) => (
            <ReportCard key={p.id} {...p} />
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
