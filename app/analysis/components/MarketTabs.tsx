'use client';

import Link from 'next/link';

interface Props {
  active: 'kr' | 'us';
  /** 'inline' = 한 줄 가로형 (헤더 영역) / 'block' = 사이드바용 풀폭 세로형 */
  variant?: 'inline' | 'block';
}

/**
 * 마켓 토글 — 미국(SEC) ↔ 국내(DART) 두 페이지 사이 네비게이션
 * 미국이 우선 노출 (좌측/위쪽).
 */
export function MarketTabs({ active, variant = 'inline' }: Props) {
  const sourceLabel =
    active === 'kr' ? 'DART 공식 공시' : 'SEC EDGAR · XBRL';

  if (variant === 'block') {
    return (
      <div>
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-2">
          시장
        </p>
        <div
          role="tablist"
          aria-label="시장 선택"
          className="grid grid-cols-2 border-2 border-[var(--theme-border-muted)] rounded-xl overflow-hidden bg-[var(--theme-bg-card)]"
          style={{ boxShadow: '0 2px 6px rgba(59, 80, 181, 0.10)' }}
        >
          <Link
            href="/analysis/us"
            role="tab"
            aria-selected={active === 'us'}
            prefetch
            className={`flex items-center justify-center gap-1.5 font-heading text-sm py-2.5 font-bold tracking-tight transition-colors ${
              active === 'us'
                ? 'bg-[var(--theme-accent)] text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/8'
            }`}
          >
            <span aria-hidden>🇺🇸</span>
            <span>미국</span>
          </Link>
          <Link
            href="/analysis"
            role="tab"
            aria-selected={active === 'kr'}
            prefetch
            className={`flex items-center justify-center gap-1.5 font-heading text-sm py-2.5 font-bold tracking-tight transition-colors border-l-2 border-[var(--theme-border-muted)] ${
              active === 'kr'
                ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
                : 'text-gray-500 dark:text-gray-400 hover:text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/8'
            }`}
          >
            <span aria-hidden>🇰🇷</span>
            <span>국내</span>
          </Link>
        </div>
        <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 tracking-wide">
          {sourceLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-7 flex-wrap">
      <div
        role="tablist"
        aria-label="시장 선택"
        className="inline-flex border-2 border-[var(--theme-border-muted)] rounded-xl overflow-hidden bg-[var(--theme-bg-card)]"
        style={{ boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)' }}
      >
        <Link
          href="/analysis/us"
          role="tab"
          aria-selected={active === 'us'}
          prefetch
          className={`flex items-center gap-1.5 font-heading text-sm sm:text-[15px] px-4 sm:px-5 py-2.5 font-bold tracking-tight transition-colors ${
            active === 'us'
              ? 'bg-[var(--theme-accent)] text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-[var(--foreground)] hover:bg-[var(--theme-accent)]/8'
          }`}
        >
          <span aria-hidden>🇺🇸</span>
          <span>미국</span>
        </Link>
        <Link
          href="/analysis"
          role="tab"
          aria-selected={active === 'kr'}
          prefetch
          className={`flex items-center gap-1.5 font-heading text-sm sm:text-[15px] px-4 sm:px-5 py-2.5 font-bold tracking-tight transition-colors border-l-2 border-[var(--theme-border-muted)] ${
            active === 'kr'
              ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
              : 'text-gray-500 dark:text-gray-400 hover:text-[var(--foreground)] hover:bg-[var(--theme-accent)]/8'
          }`}
        >
          <span aria-hidden>🇰🇷</span>
          <span>국내</span>
        </Link>
      </div>
      <span className="font-sans text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 tracking-wide">
        {sourceLabel}
      </span>
    </div>
  );
}
