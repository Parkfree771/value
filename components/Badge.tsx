import React, { memo } from 'react';

interface BadgeProps {
  variant?: 'buy' | 'sell' | 'hold' | 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  // 의견 배지 — 채움 대신 괘선 도장 (에디토리얼 테마)
  buy: 'border border-[var(--color-buy)] text-[var(--color-buy)]',
  sell: 'border border-[var(--color-sell)] text-[var(--color-sell)]',
  hold: 'border border-[var(--color-hold)] text-[var(--color-hold)]',
  default: 'border border-[var(--theme-border-control)] text-[var(--theme-ink-soft)]',
  success: 'border border-[var(--color-success)] text-[var(--color-success)]',
  warning: 'border border-[var(--color-warning)] text-[var(--color-warning)]',
  danger: 'border border-[var(--color-error)] text-[var(--color-error)]',
} as const;

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[11px] rounded-sm',
  md: 'px-1.5 py-0.5 text-xs rounded-sm',
  lg: 'px-2.5 py-1 text-sm rounded-sm',
} as const;

const Badge = memo(function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center font-bold uppercase tracking-wide transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
});

export default Badge;

// 투자 의견 전용 헬퍼 함수
const opinionLabels = { buy: '매수', sell: '매도', hold: '보유' } as const;

export const OpinionBadge = memo(function OpinionBadge({ opinion }: { opinion: 'buy' | 'sell' | 'hold' }) {
  return <Badge variant={opinion}>{opinionLabels[opinion]}</Badge>;
});
