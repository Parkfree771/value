/**
 * 사이트 상단 마켓 티커 바
 * ───────────────────────────────
 * - Server Component (Next.js ISR 15분)
 * - 9개 항목: AntStreet 평균 + 한국/미국 지수 + 환율 + BTC
 * - 한국식 컬러 (수익 빨강 / 손실 파랑)
 * - 데스크탑: 한 줄 표시 / 모바일: 가로 스크롤
 * - 차트 없음, 색상/아이콘으로만 방향 표시
 */

import { getTickerData } from '@/lib/ticker';
import type { TickerItem } from '@/lib/ticker';

export const revalidate = 900;

/* ─────────────────────────────── 서브 컴포넌트 ─────────────────────────────── */

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function Cell({ item, isFirst }: { item: TickerItem; isFirst?: boolean }) {
  const hasData = item.price !== null && Number.isFinite(item.price);
  const pct = item.changePercent;
  const positive = pct !== null && pct > 0;
  const negative = pct !== null && pct < 0;

  // 한국식 컬러: 수익=빨강, 손실=파랑
  const color = positive
    ? 'text-red-600 dark:text-red-500'
    : negative
      ? 'text-blue-600 dark:text-blue-500'
      : 'text-gray-500 dark:text-gray-400';

  const arrow = positive ? '▲' : negative ? '▼' : '·';

  const accentBg = item.accent
    ? 'bg-[var(--theme-accent)]/[0.06] dark:bg-[var(--theme-accent)]/[0.12]'
    : '';

  const labelColor = item.accent
    ? 'text-[var(--theme-accent)] dark:text-[var(--theme-accent-light,var(--theme-accent))]'
    : 'text-gray-700 dark:text-gray-200';

  const paddingCls = isFirst ? 'pr-3 sm:pr-5' : 'px-3 sm:px-5';

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 ${paddingCls} shrink-0 snap-start ${accentBg}`}
    >
      <span
        className={`text-xs sm:text-sm font-black uppercase tracking-[0.06em] whitespace-nowrap font-heading ${labelColor}`}
      >
        {item.label}
      </span>

      {hasData ? (
        item.accent ? (
          // AntStreet: 평균 수익률
          <span className={`text-[11px] sm:text-xs font-black font-mono tracking-tight whitespace-nowrap tabular-nums ${color}`}>
            {(pct ?? 0) >= 0 ? '+' : ''}
            {formatNumber(pct ?? 0, 2)}
            {item.suffix || '%'}
          </span>
        ) : (
          <>
            <span className="text-[11px] sm:text-xs font-bold font-mono text-gray-900 dark:text-white tracking-tight whitespace-nowrap tabular-nums">
              {formatNumber(item.price as number, item.decimals)}
              {item.suffix && <span className="text-[9px] sm:text-[10px] ml-0.5 opacity-70">{item.suffix}</span>}
            </span>
            {pct !== null && (
              <span className={`text-[10px] sm:text-[11px] font-bold tabular-nums whitespace-nowrap ${color}`}>
                {arrow} {Math.abs(pct).toFixed(2)}%
              </span>
            )}
          </>
        )
      ) : (
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">—</span>
      )}
    </div>
  );
}

/* ─────────────────────────────── 메인 ─────────────────────────────── */

export default async function MarketTickerBar() {
  let data: Awaited<ReturnType<typeof getTickerData>> | null = null;
  try {
    data = await getTickerData();
  } catch (err) {
    console.error('[MarketTickerBar] getTickerData failed:', err);
  }

  // 페칭 실패 시 아무것도 렌더링하지 않음 (사이트는 정상 동작)
  if (!data) return null;

  return (
    <div className="market-ticker-bar w-full bg-[var(--theme-bg-card)] border-b-2 border-[var(--theme-border-muted)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-stretch overflow-x-auto scrollbar-hide snap-x snap-proximity"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {data.items.map((item, idx) => (
            <Cell key={item.id} item={item} isFirst={idx === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
