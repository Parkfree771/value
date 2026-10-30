// 글쓰기 페이지 부품 — 단계 머리(번호·제목·안내), 오른쪽 작성 요약
import type { ReactNode } from 'react';
import type { StockData } from '@/types/stock';
import { formatPriceInput, type Opinion } from './TargetPriceInput';
import { shortStockName, exchangeLabel } from '@/utils/reportDisplay';

/** 글쓰기 단계 — 번호 · 제목 · 안내 */
export function WriteStep({
  n,
  title,
  hint,
  optional = false,
  right,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  optional?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--theme-border)] pt-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-serif text-2xl font-black leading-none text-[var(--theme-orange)]">{n}</span>
          <div className="min-w-0">
            <h2 className="headline text-lg sm:text-xl leading-tight">
              {title}
              {optional && <span className="ml-2 font-sans text-xs font-normal text-[var(--theme-ink-soft)]">선택</span>}
            </h2>
            {hint && <p className="mt-1 text-xs sm:text-sm text-[var(--theme-ink-soft)] break-keep">{hint}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const OPINION_TEXT: Record<Opinion, string> = { buy: '매수', sell: '매도', hold: '보유' };

/** 오른쪽 요약 — 종목 · 의견 · 작성가 · 목표가 · 목표 수익률 */
export function WriteSummary({
  stock,
  opinion,
  targetPrice,
  initialPrice,
  isEditMode,
}: {
  stock: StockData | null;
  opinion: Opinion;
  targetPrice: number;
  initialPrice: number | null;
  isEditMode: boolean;
}) {
  const cur = stock?.currency;
  const fmt = (n: number | null | undefined) => (n && n > 0 ? `${formatPriceInput(n, cur)} ${cur ?? ''}` : '—');
  const base = initialPrice && initialPrice > 0 ? initialPrice : null;
  const upside = base && targetPrice > 0 ? ((targetPrice - base) / base) * 100 : null;
  const rows: [string, ReactNode][] = [
    ['종목', stock ? `${shortStockName(stock.name, stock.symbol)} · ${exchangeLabel(stock.exchange)}` : '—'],
    ['의견', <span key="o" className={opinion === 'buy' ? 'text-[var(--color-up)]' : opinion === 'sell' ? 'text-[var(--color-down)]' : ''}>{OPINION_TEXT[opinion]}</span>],
    [isEditMode ? '작성가' : '작성가(현재가)', fmt(base)],
    ['목표가', fmt(targetPrice)],
    [
      '목표 수익률',
      upside === null ? '—' : (
        <span key="u" className={upside > 0 ? 'text-[var(--color-up)]' : upside < 0 ? 'text-[var(--color-down)]' : ''}>
          {upside > 0 ? '+' : ''}
          {upside.toFixed(1)}%
        </span>
      ),
    ],
  ];
  return (
    <div className="border-t-2 border-[var(--theme-border)] pt-3">
      <h3 className="kicker !text-[var(--foreground)]">작성 요약</h3>
      <dl className="mt-2 divide-y divide-[var(--theme-border-muted)] text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-[var(--theme-ink-soft)]">{k}</dt>
            <dd className="font-bold tabular-nums text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
