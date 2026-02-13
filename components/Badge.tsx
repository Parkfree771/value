import React, { memo } from 'react';

interface BadgeProps {
  variant?: 'buy' | 'sell' | 'hold' | 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  buy: 'bg-red-500/15 text-red-400 border-2 border-red-500',
  sell: 'bg-blue-500/15 text-blue-400 border-2 border-blue-500',
  hold: 'bg-gray-500/15 text-gray-400 border-2 border-gray-500',
  default: 'bg-gray-500/15 text-gray-400 border-2 border-gray-600',
  success: 'bg-green-500/15 text-green-400 border-2 border-green-500',
  warning: 'bg-yellow-500/15 text-yellow-400 border-2 border-yellow-500',
  danger: 'bg-red-500/15 text-red-400 border-2 border-red-500',
} as const;

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
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
