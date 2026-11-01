import type { QuarterView } from './PortfolioView';
import { dotDate, formatUsd, quarterLabel } from '@/lib/sec13f/format';

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note: React.ReactNode }) {
  return (
    <div className="py-3 pr-4 sm:px-5 sm:first:pl-0 sm:border-l sm:first:border-l-0 border-[var(--theme-border-muted)]">
      <dt className="text-xs text-[var(--theme-ink-soft)]">{label}</dt>
      <dd className="mt-1 font-mono text-[22px] font-black leading-none tabular-nums">{value}</dd>
      <dd className="mt-1.5 text-xs text-[var(--theme-ink-soft)]">{note}</dd>
    </div>
  );
}

/** 분기 요약 — 운용 규모 · 보유 종목 · 신규/전량매도 · 공시일 */
export default function PortfolioSummary({ view }: { view: QuarterView }) {
  const { total_value_curr: curr, total_value_prev: prev, holdings } = view;
  const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  const newBuys = holdings.filter((h) => h.status === 'NEW BUY').length;
  const soldOut = holdings.filter((h) => h.status === 'SOLD OUT').length;

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 border-b border-[var(--theme-border-muted)]">
      <Stat
        label="운용 규모"
        value={formatUsd(curr)}
        note={
          <>
            전분기 대비{' '}
            <span className={`font-mono font-bold ${changePct >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
              {changePct >= 0 ? '+' : ''}
              {changePct.toFixed(1)}%
            </span>
          </>
        }
      />
      <Stat label="보유 종목" value={view.holdings_count} note={`${quarterLabel(view.report_date_curr)} 말 기준`} />
      <Stat
        label="신규매수 · 전량매도"
        value={
          <>
            <span className="text-[var(--color-up)]">{newBuys}</span>
            <span className="mx-1.5 text-base font-normal text-[var(--theme-ink-soft)]">·</span>
            <span className="text-[var(--color-down)]">{soldOut}</span>
          </>
        }
        note="전분기 대비"
      />
      <Stat
        label="공시일"
        value={<span className="text-lg">{view.filing_date_curr ? dotDate(view.filing_date_curr) : '—'}</span>}
        note={`기준일 ${dotDate(view.report_date_curr)}`}
      />
    </dl>
  );
}
