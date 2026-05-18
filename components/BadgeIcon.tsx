'use client';

import { memo, useState } from 'react';
import { BADGES_BY_ID, BADGE_ASSETS_VERSION } from '@/lib/badges';

// 배지 ID → PNG. public/badges/<id>.png.
// special-* 일부는 PNG 미제작 — 이 경우 onError 발생 시 텍스트 placeholder.

interface BadgeIconProps {
  id: string;
  size?: number;
  className?: string;
  title?: string;
}

const BadgeIcon = memo(function BadgeIcon({ id, size = 24, className = '', title }: BadgeIconProps) {
  const def = BADGES_BY_ID[id];
  const [error, setError] = useState(false);

  if (!def) return null;

  const tooltip = title || `${def.name} — ${def.description}`;

  if (error) {
    // PNG 없을 때 (special 미제작 등) placeholder
    const isLarge = size >= 40;
    return (
      <div
        className={`inline-flex items-center justify-center border-2 border-dashed border-slate-400 dark:border-slate-500 rounded-lg bg-[var(--theme-bg-card)] ${className}`}
        style={{ width: size, height: size }}
        title={tooltip}
        aria-label={tooltip}
      >
        <span className="text-[8px] text-gray-400 px-0.5 text-center leading-tight font-bold">
          {isLarge ? def.name : '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`/badges/${id}.png?v=${BADGE_ASSETS_VERSION}`}
      alt={def.name}
      title={tooltip}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={() => setError(true)}
    />
  );
});

export default BadgeIcon;
