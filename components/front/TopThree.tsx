import Link from 'next/link';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { formatPrice } from '@/utils/currency';
import { heldDaysLabel } from '@/utils/reportDisplay';

// 1·2·3위 카드 — 개인 리포트(/reports).
// 같은 크기 카드 세 장. 읽는 순서를 하나로:
//   순위 → 수익률(가장 크게) → 종목 · 의견 → 작성자 · 날짜 → 작성 당시 → 현재 → 목표

export interface TopThreeItem {
  id: string;
  href: string;
  rate: number;
  stockName: string;
  opinion: 'buy' | 'hold' | 'sell';
  opinionLabel: string;
  byline: string; // 작성자 닉네임
  date: string; // YYYY-MM-DD
  basePrice: number; // 작성 당시
  currentPrice: number;
  targetPrice?: number | null;
  currency: string;
  targetReached?: boolean;
}

const OPINION_COLOR: Record<TopThreeItem['opinion'], string> = {
  buy: 'text-[var(--color-up)]',
  hold: 'text-[var(--theme-ink-soft)]',
  sell: 'text-[var(--color-down)]',
};

function Card({ item, rank }: { item: TopThreeItem; rank: number }) {
  const first = rank === 1;
  const held = heldDaysLabel(item.date);

  return (
    <Link
      href={item.href}
      className={`group flex flex-col min-w-0 border-t-4 p-4 sm:p-5 transition-colors ${
        first
          ? 'border-[var(--theme-orange)] bg-[var(--theme-orange)]/[0.06]'
          : 'border-[var(--theme-border)] bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg)]'
      }`}
    >
      {/* 순위 · 경과일 */}
      <div className="flex items-center justify-between">
        <span className={`font-serif font-black leading-none text-[22px] ${first ? 'text-[var(--theme-orange)]' : 'text-[var(--foreground)]'}`}>
          {rank}
          <span className="ml-0.5 text-[14px]">위</span>
        </span>
        {held && (
          <span suppressHydrationWarning className="font-mono text-[11px] font-bold text-[var(--theme-ink-soft)]">
            {held}
          </span>
        )}
      </div>

      {/* 수익률 — 카드에서 가장 큰 글자 */}
      <p className={`mt-3 font-mono font-black tabular-nums tracking-tight leading-none text-[40px] sm:text-[44px] ${getReturnColorClass(item.rate)}`}>
        {formatReturn(item.rate)}
      </p>

      {/* 종목 · 의견 */}
      <p className="mt-4 flex items-baseline gap-2 min-w-0">
        <span className="truncate text-[19px] font-bold text-[var(--foreground)] group-hover:underline underline-offset-4">{item.stockName}</span>
        <span className={`flex-shrink-0 text-[13px] font-bold ${OPINION_COLOR[item.opinion]}`}>{item.opinionLabel}</span>
      </p>
      <p className="mt-0.5 truncate text-[13px] text-[var(--theme-ink-soft)]">
        {item.byline} · {item.date.replaceAll('-', '.')}
      </p>

      {/* 가격 — 작성 당시 → 현재, 목표 */}
      <dl className="mt-4 pt-3 border-t border-[var(--theme-border-muted)] space-y-1.5 text-[13px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[var(--theme-ink-soft)]">작성 당시</dt>
          <dd className="font-mono tabular-nums text-[var(--foreground)]">{formatPrice(item.basePrice, item.currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[var(--theme-ink-soft)]">현재</dt>
          <dd className={`font-mono font-bold tabular-nums ${getReturnColorClass(item.rate)}`}>{formatPrice(item.currentPrice, item.currency)}</dd>
        </div>
        {item.targetPrice ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--theme-ink-soft)]">목표</dt>
            <dd className="font-mono tabular-nums text-[var(--foreground)]">
              {item.targetReached && <span className="mr-1.5 font-sans text-[11px] font-bold text-[var(--color-up)]">도달</span>}
              {formatPrice(item.targetPrice, item.currency)}
            </dd>
          </div>
        ) : null}
      </dl>
    </Link>
  );
}

export default function TopThree({ items }: { items: TopThreeItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item, i) => (
        <Card key={item.id} item={item} rank={i + 1} />
      ))}
    </div>
  );
}
