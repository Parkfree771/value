import type { TickerResponse } from '@/lib/ticker';
import TrendIcon from '@/components/TrendIcon';

// 지수 띠 — WSJ 상단 지수 줄처럼 한 줄로 (모바일은 가로 스크롤).
// 값이 없는 항목(API 실패 · 오래된 market.json)은 빼고 보여준다.

const fmt = (n: number, decimals: number) =>
  n.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export default function MarketStrip({ ticker }: { ticker: TickerResponse | null }) {
  const items = (ticker?.items ?? []).filter((i) => i.price !== null);
  if (items.length === 0) return null;

  return (
    <div className="-mx-4 sm:mx-0 border-b border-[var(--theme-border-muted)]">
      <div className="flex items-center gap-5 sm:gap-7 overflow-x-auto scrollbar-hide px-4 sm:px-0 py-2 text-[12px] sm:text-[13px] whitespace-nowrap">
        {ticker?.status && (
          <span className="flex-shrink-0 label-box !py-0.5">{ticker.status.label}</span>
        )}
        {items.map((item) => {
          const pct = item.changePercent;
          const up = pct !== null && pct > 0;
          const down = pct !== null && pct < 0;
          const color = up ? 'text-[var(--color-up)]' : down ? 'text-[var(--color-down)]' : 'text-[var(--theme-ink-soft)]';
          return (
            <span key={item.id} className="flex-shrink-0 inline-flex items-baseline gap-1.5">
              <span className="font-bold text-[var(--foreground)]">{item.id === 'antstreet' ? 'AntStreet 평균' : item.label}</span>
              {item.id !== 'antstreet' && (
                <span className="tabular-nums text-[var(--foreground)]">
                  {item.prefix}
                  {fmt(item.price as number, item.decimals)}
                  {item.suffix}
                </span>
              )}
              {pct !== null && (
                <span className={`tabular-nums font-semibold ${color}`}>
                  {up && <TrendIcon direction="up" />}
                  {down && <TrendIcon direction="down" />}{' '}
                  {pct > 0 ? '+' : ''}
                  {pct.toFixed(2)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
