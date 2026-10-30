import { memo } from 'react';
import { getLevelInfo } from '@/lib/levels';

// 닉네임 옆 레벨 — 지금은 "Lv.N" 글자만 (아이콘 디자인은 추후)

interface Props {
  points?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

const UserLevelInline = memo(function UserLevelInline({ points, size = 'sm', className = '' }: Props) {
  if (points === undefined || points === null) return null;
  const info = getLevelInfo(points);

  return (
    <span
      title={`Lv.${info.level} · ${info.points.toLocaleString('ko-KR')}점`}
      className={`inline-flex flex-shrink-0 items-center align-middle leading-none rounded-sm bg-[var(--theme-accent)]/10 font-bold tracking-tight text-[var(--theme-accent)] ${
        size === 'md' ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-[11px]'
      } ${className}`}
    >
      Lv.{info.level}
    </span>
  );
});

export default UserLevelInline;
