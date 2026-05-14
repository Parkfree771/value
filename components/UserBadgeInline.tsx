'use client';

import { memo } from 'react';
import BadgeIcon from './BadgeIcon';
import { useUserBadge } from '@/contexts/UserBadgesContext';
import { BADGES_BY_ID } from '@/lib/badges';

interface Props {
  // badgeId 가 직접 주어지면 그 값으로 렌더 (feed.json post.equippedBadgeId).
  // 없으면 nickname 기반 batch 조회 (fallback — 점진적 마이그레이션용).
  badgeId?: string | null;
  nickname?: string | null;
  size?: number;
  className?: string;
}

// 닉네임 옆 작은 인라인 배지. 장착 배지 없거나 로딩 중이면 아무것도 렌더하지 않음.
const UserBadgeInline = memo(function UserBadgeInline({
  badgeId,
  nickname,
  size = 16,
  className = '',
}: Props) {
  // badgeId 가 명시되면 (undefined 아님) 그걸 우선. null 도 명시적 미장착으로 인정 → 조회 skip.
  const fallbackBadgeId = useUserBadge(badgeId === undefined ? nickname : null);
  const finalId = badgeId !== undefined ? badgeId : fallbackBadgeId;
  if (!finalId) return null;
  const def = BADGES_BY_ID[finalId];
  if (!def) return null;
  return (
    <BadgeIcon
      id={finalId}
      size={size}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      title={`${def.name} — ${def.description}`}
    />
  );
});

export default UserBadgeInline;
