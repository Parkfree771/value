import Link from 'next/link';
import { OpinionBadge } from '@/components/Badge';
import type { BrokerReport } from '@/lib/brokerReports';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { formatPrice } from '@/utils/currency';
import { exchangeLabel, heldDaysLabel } from '@/utils/reportDisplay';

/** 증권사 리포트 카드 — 회원 리포트 카드(components/ReportCard)와 같은 모양 */
export default function ExpertReportCard({ r }: { r: BrokerReport }) {
  const held = heldDaysLabel(r.reportDate);
  const excerpt = r.summary.split('\n').map((s) => s.trim()).filter(Boolean)[0];
  const showTicker = r.stockName.toUpperCase() !== r.ticker.toUpperCase();

  return (
    <Link href={`/expert/${r.id}`} className="group block py-4 sm:py-5 border-b border-[var(--theme-border-muted)]">
      <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="headline text-[18px] sm:text-[22px] leading-snug line-clamp-2 break-keep mb-1 sm:mb-1.5 group-hover:underline underline-offset-4 decoration-1">
            {r.headline}
          </h2>
          <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
            <h3 className="text-[13px] sm:text-base font-semibold text-[var(--foreground)] tracking-wide truncate">{r.stockName}</h3>
            {showTicker && <span className="text-[10px] sm:text-xs text-[var(--theme-ink-soft)] font-mono flex-shrink-0">{r.ticker}</span>}
            {exchangeLabel(r.exchange) && (
              <span className="text-[11px] sm:text-xs text-[var(--theme-ink-soft)] flex-shrink-0">· {exchangeLabel(r.exchange)}</span>
            )}
          </div>
        </div>
        <div className={`text-right flex-shrink-0 ${getReturnColorClass(r.returnRate)}`}>
          <div className="text-lg sm:text-2xl font-black font-mono tabular-nums tracking-tight">{formatReturn(r.returnRate)}</div>
          <div className="mt-1 flex items-center justify-end gap-1">
            {held && (
              <span
                suppressHydrationWarning
                className="rounded-sm border border-[var(--theme-border-muted)] px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-[var(--theme-ink-soft)]"
              >
                {held}
              </span>
            )}
            <OpinionBadge opinion={r.opinion} />
          </div>
        </div>
      </div>

      {excerpt && (
        <p className="mb-2 sm:mb-3 text-[13px] sm:text-sm leading-relaxed text-[var(--theme-ink-soft)] line-clamp-2">{excerpt}</p>
      )}

      <div className="mb-1 sm:mb-2 text-[11px] sm:text-sm flex items-center gap-1.5 sm:gap-3 overflow-hidden whitespace-nowrap text-[var(--theme-ink-soft)]">
        <span>
          작성 당시 <span className="font-semibold font-mono text-[var(--foreground)]">{formatPrice(r.basePrice, r.currency)}</span>
        </span>
        <span className="text-[var(--theme-border-control)]">|</span>
        <span>
          현재 <span className={`font-semibold font-mono ${getReturnColorClass(r.returnRate)}`}>{formatPrice(r.currentPrice, r.currency)}</span>
        </span>
        {r.targetPrice ? (
          <>
            <span className="text-[var(--theme-border-control)]">|</span>
            <span>
              목표 <span className="font-semibold font-mono text-[var(--foreground)]">{formatPrice(r.targetPrice, r.currency)}</span>
            </span>
          </>
        ) : null}
      </div>

      <div className="flex items-center text-[11px] sm:text-xs text-[var(--theme-ink-soft)] pt-1 sm:pt-2 gap-1 overflow-hidden whitespace-nowrap leading-none">
        <span className="font-medium text-[var(--foreground)] truncate min-w-0 flex-shrink">
          {r.broker}
        </span>
        <span className="flex-shrink-0">·</span>
        <span className="flex-shrink-0">{r.reportDate}</span>
      </div>
    </Link>
  );
}
