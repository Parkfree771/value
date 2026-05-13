'use client';

import { memo } from 'react';
import BadgeIcon from './BadgeIcon';
import { useUserBadge } from '@/contexts/UserBadgesContext';
import { BADGES_BY_ID } from '@/lib/badges';

interface Props {
  nickname?: string | null;
  size?: number;
  className?: string;
}

// 닉네임 옆 작은 인라인 배지. 장착 배지 없거나 로딩 중이면 아무것도 렌더하지 않음.
const UserBadgeInline = memo(function UserBadgeInline({ nickname, size = 16, className = '' }: Props) {
  const badgeId = useUserBadge(nickname);
  if (!badgeId) return null;
  const def = BADGES_BY_ID[badgeId];
  if (!def) return null;
  return (
    <BadgeIcon
      id={badgeId}
      size={size}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      title={`${def.name} — ${def.description}`}
    />
  );
});

export default UserBadgeInline;
